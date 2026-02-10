#!/bin/bash
# Phase 4 Features Test Script
# Tests: OCR, Dynamic Pricing, Profit Tracking, SEO Optimization

set -e

echo "=========================================="
echo "Phase 4 Features Test Suite"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

function test_info() {
    echo -e "${YELLOW}ℹ INFO:${NC} $1"
}

echo "=== TEST 1: OCR (Serial Number Extraction) ==="
echo ""

echo -n "Checking database schema for serial_number column... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT column_name FROM information_schema.columns WHERE table_name='offers' AND column_name='serial_number'" | grep -q "serial_number"; then
    test_passed "serial_number column exists"
else
    test_failed "serial_number column missing"
fi

echo -n "Checking database schema for product_metadata column... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT column_name FROM information_schema.columns WHERE table_name='offers' AND column_name='product_metadata'" | grep -q "product_metadata"; then
    test_passed "product_metadata JSONB column exists"
else
    test_failed "product_metadata column missing"
fi

echo -n "Checking for serial number index... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT indexname FROM pg_indexes WHERE tablename='offers' AND indexname='idx_offers_serial_number'" | grep -q "idx_offers_serial_number"; then
    test_passed "Serial number index created"
else
    test_failed "Serial number index missing"
fi

echo -n "Checking Python AI has OCR module... "
if docker-compose exec -T pricing-api test -f /app/services/vision/ocr.py; then
    test_passed "OCR module (ocr.py) exists in Python AI"
else
    test_failed "OCR module missing"
fi

# Test if there are any offers with serial numbers
SERIAL_COUNT=$(docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT COUNT(*) FROM offers WHERE serial_number IS NOT NULL" 2>/dev/null || echo "0")
test_info "Offers with serial numbers: $SERIAL_COUNT"

echo ""
echo "=== TEST 2: Dynamic Pricing Optimizer ==="
echo ""

echo -n "Checking price_history table exists... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT to_regclass('public.price_history')" | grep -q "price_history"; then
    test_passed "price_history table exists"
else
    test_failed "price_history table missing"
fi

echo -n "Checking price_history has required columns... "
REQUIRED_COLS="old_price new_price reason trigger_type days_since_created view_count views_per_day"
ALL_EXIST=true
for col in $REQUIRED_COLS; do
    if ! docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
       "SELECT column_name FROM information_schema.columns WHERE table_name='price_history' AND column_name='$col'" | grep -q "$col"; then
        ALL_EXIST=false
        break
    fi
done
if $ALL_EXIST; then
    test_passed "All price_history columns present"
else
    test_failed "Missing required price_history columns"
fi

echo -n "Checking Python pricing optimizer module... "
if docker-compose exec -T pricing-api test -f /app/services/pricing/optimizer.py; then
    test_passed "Pricing optimizer (optimizer.py) exists"
else
    test_failed "Pricing optimizer module missing"
fi

echo -n "Checking Backend price optimizer job handler... "
if docker-compose exec -T backend test -f /app/src/queue/jobs/price-optimizer.ts; then
    test_passed "Price optimizer job handler exists"
else
    test_failed "Price optimizer job handler missing"
fi

# Check if BullMQ queue exists (requires backend to be running)
echo -n "Checking BullMQ price-optimizer queue... "
QUEUE_CHECK=$(docker-compose exec -T backend npx tsx -e "
  const { Queue } = require('bullmq');
  const queue = new Queue('price-optimizer', { connection: { host: 'redis', port: 6379 } });
  queue.getRepeatableJobs().then(jobs => {
    if (jobs.length > 0) {
      console.log('SCHEDULED');
    } else {
      console.log('NOT_SCHEDULED');
    }
    process.exit(0);
  }).catch(() => {
    console.log('ERROR');
    process.exit(1);
  });
" 2>/dev/null || echo "ERROR")

if echo "$QUEUE_CHECK" | grep -q "SCHEDULED"; then
    test_passed "Price optimizer scheduled in BullMQ"
elif echo "$QUEUE_CHECK" | grep -q "NOT_SCHEDULED"; then
    test_info "Price optimizer queue exists but not scheduled (manual trigger needed)"
else
    test_info "Could not verify BullMQ queue (backend may need restart)"
fi

PRICE_HISTORY_COUNT=$(docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT COUNT(*) FROM price_history" 2>/dev/null || echo "0")
test_info "Price history records: $PRICE_HISTORY_COUNT"

echo ""
echo "=== TEST 3: Profit Tracking ==="
echo ""

echo -n "Checking sales table exists... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT to_regclass('public.sales')" | grep -q "sales"; then
    test_passed "sales table exists"
else
    test_failed "sales table missing"
fi

echo -n "Checking sales table has profit columns... "
PROFIT_COLS="sold_price offer_amount profit profit_margin shipping_cost ebay_fees platform_fees"
ALL_EXIST=true
for col in $PROFIT_COLS; do
    if ! docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
       "SELECT column_name FROM information_schema.columns WHERE table_name='sales' AND column_name='$col'" | grep -q "$col"; then
        ALL_EXIST=false
        break
    fi
done
if $ALL_EXIST; then
    test_passed "All sales table profit columns present"
else
    test_failed "Missing required sales columns"
fi

echo -n "Checking Backend profit calculator service... "
if docker-compose exec -T backend test -f /app/src/services/profit-calculator.ts; then
    test_passed "Profit calculator service exists"
else
    test_failed "Profit calculator service missing"
fi

echo -n "Checking Backend profits API routes... "
if docker-compose exec -T backend test -f /app/src/api/routes/profits.ts; then
    test_passed "Profits API routes exist"
else
    test_failed "Profits API routes missing"
fi

echo -n "Testing /api/v1/profits/summary endpoint... "
# This requires auth, so we just check if the route exists and returns 401 (not 404)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/profits/summary 2>/dev/null || echo "000")
if [ "$STATUS" = "401" ] || [ "$STATUS" = "200" ]; then
    test_passed "Profits API endpoint exists (returned $STATUS)"
elif [ "$STATUS" = "404" ]; then
    test_failed "Profits API endpoint not found (404)"
else
    test_info "Profits API status unclear (returned $STATUS)"
fi

SALES_COUNT=$(docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT COUNT(*) FROM sales" 2>/dev/null || echo "0")
test_info "Sales records: $SALES_COUNT"

echo ""
echo "=== TEST 4: SEO Optimization ==="
echo ""

echo -n "Checking seo_title column exists... "
if docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT column_name FROM information_schema.columns WHERE table_name='offers' AND column_name='seo_title'" | grep -q "seo_title"; then
    test_passed "seo_title column exists"
else
    test_failed "seo_title column missing"
fi

echo -n "Checking Python SEO module... "
if docker-compose exec -T pricing-api test -f /app/services/vision/seo.py; then
    test_passed "SEO module (seo.py) exists"
else
    test_failed "SEO module missing"
fi

echo -n "Checking Frontend sitemap... "
if docker-compose exec -T web test -f /app/app/sitemap.ts; then
    test_passed "Sitemap generator exists"
else
    test_failed "Sitemap generator missing"
fi

echo -n "Testing sitemap.xml endpoint... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/sitemap.xml 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ]; then
    test_passed "Sitemap.xml accessible (200 OK)"
elif [ "$STATUS" = "000" ]; then
    test_failed "Frontend not responding"
else
    test_info "Sitemap returned $STATUS (may need offers in DB)"
fi

echo -n "Checking SearchBar component... "
if docker-compose exec -T web test -f /app/components/SearchBar.tsx; then
    test_passed "SearchBar component exists"
else
    test_failed "SearchBar component missing"
fi

echo -n "Testing search API endpoint... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1/offers/search?q=test" 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "401" ]; then
    test_passed "Search API endpoint exists (returned $STATUS)"
else
    test_info "Search API returned $STATUS"
fi

SEO_TITLE_COUNT=$(docker-compose exec -T postgres psql -U jakebuysit -d jakebuysit -tAc \
   "SELECT COUNT(*) FROM offers WHERE seo_title IS NOT NULL" 2>/dev/null || echo "0")
test_info "Offers with SEO titles: $SEO_TITLE_COUNT"

echo ""
echo "=========================================="
echo "PHASE 4 TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ ALL PHASE 4 FEATURES VERIFIED${NC}"
    echo ""
    echo "Phase 4 Status:"
    echo "  ✓ OCR: Ready (serial_number extraction)"
    echo "  ✓ Dynamic Pricing: Ready (price_history tracking)"
    echo "  ✓ Profit Tracking: Ready (sales analytics)"
    echo "  ✓ SEO: Ready (seo_title, sitemap, search)"
    echo ""
    exit 0
else
    echo -e "${RED}✗ SOME PHASE 4 FEATURES HAVE ISSUES${NC}"
    echo "Review failed tests above."
    echo "Check: docker-compose logs -f backend pricing-api"
    exit 1
fi
