#!/bin/bash
# JakeBuysIt Deployment Test Script
# Tests all services and Phase 4 features

set -e

echo "=========================================="
echo "JakeBuysIt Deployment Test Suite"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

function test_passed() {
    echo -e "${GREEN}✓ PASSED:${NC} $1"
    ((PASSED++))
}

function test_failed() {
    echo -e "${RED}✗ FAILED:${NC} $1"
    ((FAILED++))
}

function test_warning() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
}

echo "=== PHASE 1: Container Status ==="
echo ""

# Test 1: All containers running
echo -n "Checking all containers are running... "
RUNNING=$(docker-compose ps --services --filter "status=running" | wc -l)
if [ "$RUNNING" -eq 7 ]; then
    test_passed "All 7 containers running"
else
    test_failed "Only $RUNNING/7 containers running"
    docker-compose ps
fi

echo ""
echo "=== PHASE 2: Health Checks ==="
echo ""

# Test 2: Backend health
echo -n "Testing Backend API health... "
if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    RESPONSE=$(curl -s http://localhost:8080/health)
    if echo "$RESPONSE" | grep -q "ok"; then
        test_passed "Backend health check OK"
    else
        test_failed "Backend returned unexpected response: $RESPONSE"
    fi
else
    test_failed "Backend not responding on port 8080"
fi

# Test 3: Python AI health
echo -n "Testing Python AI health... "
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    test_passed "Python AI health check OK"
else
    test_failed "Python AI not responding on port 8000"
fi

# Test 4: Jake Service health
echo -n "Testing Jake Service health... "
if curl -sf http://localhost:3002/api/v1/health > /dev/null 2>&1; then
    test_passed "Jake Service health check OK"
else
    test_warning "Jake Service not responding (may not have health endpoint yet)"
fi

# Test 5: Frontend loading
echo -n "Testing Frontend... "
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    test_passed "Frontend responding on port 3000"
else
    test_failed "Frontend not responding on port 3000"
fi

# Test 6: Admin loading
echo -n "Testing Admin panel... "
if curl -sf http://localhost:3001 > /dev/null 2>&1; then
    test_passed "Admin panel responding on port 3001"
else
    test_failed "Admin panel not responding on port 3001"
fi

# Test 7: PostgreSQL
echo -n "Testing PostgreSQL connection... "
if docker-compose exec -T postgres pg_isready -U jakebuysit > /dev/null 2>&1; then
    test_passed "PostgreSQL accepting connections"
else
    test_failed "PostgreSQL not ready"
fi

# Test 8: Redis
echo -n "Testing Redis connection... "
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    test_passed "Redis responding to PING"
else
    test_failed "Redis not responding"
fi

echo ""
echo "=== PHASE 3: Database Schema ==="
echo ""

# Test 9: Check Phase 4 migrations applied
echo -n "Checking seo_title column exists... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='offers' AND column_name='seo_title'" | grep -q "seo_title"; then
    test_passed "SEO migration (002) applied"
else
    test_failed "SEO migration (002) NOT applied"
fi

echo -n "Checking price_history table exists... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc "SELECT to_regclass('public.price_history')" | grep -q "price_history"; then
    test_passed "Price history migration (004) applied"
else
    test_failed "Price history migration (004) NOT applied"
fi

echo -n "Checking sales table exists... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc "SELECT to_regclass('public.sales')" | grep -q "sales"; then
    test_passed "Profit tracking migration (005) applied"
else
    test_failed "Profit tracking migration (005) NOT applied"
fi

echo -n "Checking serial_number column exists... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='offers' AND column_name='serial_number'" | grep -q "serial_number"; then
    test_passed "Serial numbers migration (007) applied"
else
    test_failed "Serial numbers migration (007) NOT applied"
fi

echo ""
echo "=== PHASE 4: API Endpoints ==="
echo ""

# Test 10: Backend API endpoints
echo -n "Testing /api/v1/offers endpoint... "
if curl -sf http://localhost:8080/api/v1/offers > /dev/null 2>&1; then
    test_passed "Offers API responding"
else
    test_warning "Offers API not responding (may require auth)"
fi

echo -n "Testing /api/v1/offers/search endpoint... "
if curl -sf "http://localhost:8080/api/v1/offers/search?q=test" > /dev/null 2>&1; then
    test_passed "Search API responding (Phase 4 SEO)"
else
    test_warning "Search API not responding"
fi

# Test 11: Python AI endpoints
echo -n "Testing Python AI docs... "
if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
    test_passed "Python AI API docs available"
else
    test_warning "Python AI docs not available"
fi

echo ""
echo "=== PHASE 5: Frontend Features ==="
echo ""

# Test 12: Sitemap
echo -n "Testing sitemap.xml... "
if curl -sf http://localhost:3000/sitemap.xml > /dev/null 2>&1; then
    test_passed "Sitemap.xml available (Phase 4 SEO)"
else
    test_warning "Sitemap.xml not available (may need offers in DB)"
fi

echo ""
echo "=== PHASE 6: Container Logs Check ==="
echo ""

# Test 13: No critical errors in logs
echo -n "Checking Backend logs for errors... "
ERROR_COUNT=$(docker-compose logs --tail=50 backend 2>&1 | grep -i "error" | grep -v "errorlevel" | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    test_passed "No errors in Backend logs"
else
    test_warning "Found $ERROR_COUNT error(s) in Backend logs"
fi

echo -n "Checking Python AI logs for errors... "
ERROR_COUNT=$(docker-compose logs --tail=50 pricing-api 2>&1 | grep -i "error" | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    test_passed "No errors in Python AI logs"
else
    test_warning "Found $ERROR_COUNT error(s) in Python AI logs"
fi

echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CRITICAL TESTS PASSED${NC}"
    echo "Deployment is healthy and ready for production!"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo "Check logs: docker-compose logs -f"
    echo "Review failed tests above and fix issues."
    exit 1
fi
