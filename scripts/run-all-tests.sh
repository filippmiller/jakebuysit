#!/bin/bash
# Master Test Runner - Runs all test suites

set -e

echo "=========================================="
echo "JakeBuysIt Master Test Runner"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}[1/2] Running Deployment Tests...${NC}"
echo ""
bash "$SCRIPT_DIR/test-deployment.sh"
DEPLOYMENT_STATUS=$?

echo ""
echo ""

echo -e "${BLUE}[2/2] Running Phase 4 Features Tests...${NC}"
echo ""
bash "$SCRIPT_DIR/test-phase4.sh"
PHASE4_STATUS=$?

echo ""
echo "=========================================="
echo "MASTER TEST SUMMARY"
echo "=========================================="

if [ $DEPLOYMENT_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Deployment Tests: FAILED${NC}"
fi

if [ $PHASE4_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Phase 4 Tests: PASSED${NC}"
else
    echo -e "${RED}✗ Phase 4 Tests: FAILED${NC}"
fi

echo ""

if [ $DEPLOYMENT_STATUS -eq 0 ] && [ $PHASE4_STATUS -eq 0 ]; then
    echo -e "${GREEN}=========================================="
    echo "✓✓✓ ALL TESTS PASSED ✓✓✓"
    echo "==========================================${NC}"
    echo ""
    echo "System is healthy and ready for:"
    echo "  • Production deployment via Coolify"
    echo "  • Phase 4 features (OCR, Pricing, Profits, SEO)"
    echo "  • Customer traffic"
    echo ""
    exit 0
else
    echo -e "${RED}=========================================="
    echo "✗✗✗ SOME TESTS FAILED ✗✗✗"
    echo "==========================================${NC}"
    echo ""
    echo "Review failed tests above and fix issues."
    echo "Check logs: docker-compose logs -f"
    echo ""
    exit 1
fi
