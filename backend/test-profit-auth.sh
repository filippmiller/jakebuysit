#!/bin/bash
# Test script to verify profit API authentication

API_URL="http://localhost:8080"

echo "=== Testing Profit API Security ==="
echo ""

# Test 1: Try to access without auth (should fail with 401)
echo "Test 1: GET /api/v1/profits/summary without auth"
response=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/profits/summary")
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" == "401" ]; then
  echo "✓ PASS: Returns 401 Unauthorized"
else
  echo "✗ FAIL: Expected 401, got $status_code"
fi
echo ""

# Test 2: Try to access with query string (should still fail with 401)
echo "Test 2: GET /api/v1/profits/summary?userId=test without auth"
response=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/profits/summary?userId=00000000-0000-0000-0000-000000000001")
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" == "401" ]; then
  echo "✓ PASS: Returns 401 Unauthorized (query string ignored)"
else
  echo "✗ FAIL: Expected 401, got $status_code"
fi
echo ""

# Test 3: Get a valid token
echo "Test 3: Login to get valid token"
login_response=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@jakebuysit.com","password":"testpass123"}')

if echo "$login_response" | grep -q "accessToken"; then
  token=$(echo "$login_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
  echo "✓ Got valid token: ${token:0:20}..."
  echo ""

  # Test 4: Try with valid token (should succeed)
  echo "Test 4: GET /api/v1/profits/summary with valid token"
  response=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/profits/summary" \
    -H "Authorization: Bearer $token")
  status_code=$(echo "$response" | tail -n1)

  if [ "$status_code" == "200" ]; then
    echo "✓ PASS: Returns 200 OK with valid token"
  else
    echo "✗ FAIL: Expected 200, got $status_code"
  fi
  echo ""

  # Test 5: Test all profit endpoints
  echo "Test 5: Testing all profit endpoints with auth"

  endpoints=(
    "/api/v1/profits/summary"
    "/api/v1/profits/trends"
    "/api/v1/profits/by-category"
    "/api/v1/profits/projections"
  )

  for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint" \
      -H "Authorization: Bearer $token")
    status_code=$(echo "$response" | tail -n1)

    if [ "$status_code" == "200" ]; then
      echo "  ✓ $endpoint: 200 OK"
    else
      echo "  ✗ $endpoint: Expected 200, got $status_code"
    fi
  done

else
  echo "✗ FAIL: Could not login (user may not exist, run seed script first)"
fi

echo ""
echo "=== Test Complete ==="
