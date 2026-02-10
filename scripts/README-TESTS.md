# Test Scripts — Usage Guide

## 📋 Доступные тесты

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `test-deployment.sh` | Проверяет все 7 сервисов, health checks, БД схему | После каждого deployment |
| `test-phase4.sh` | Проверяет Phase 4 фичи (OCR, Pricing, Profits, SEO) | После миграций или изменений Phase 4 |
| `run-all-tests.sh` | Запускает оба теста выше | Полная проверка перед production |

---

## 🚀 Как запустить

### На VPS (после deployment)

```bash
ssh root@<your-vps-ip>
cd /opt/jakebuysit

# Запуск всех тестов
bash scripts/run-all-tests.sh

# Или по отдельности:
bash scripts/test-deployment.sh
bash scripts/test-phase4.sh
```

### Локально (для разработки)

```bash
# Windows (Git Bash или WSL)
cd C:\dev\pawn
bash scripts/run-all-tests.sh

# Linux/macOS
cd /path/to/jakebuysit
bash scripts/run-all-tests.sh
```

---

## 🧪 Что проверяют тесты

### test-deployment.sh (Deployment Tests)

**Phase 1: Container Status**
- ✓ Все 7 контейнеров запущены

**Phase 2: Health Checks**
- ✓ Backend API (8080)
- ✓ Python AI (8000)
- ✓ Jake Service (3002)
- ✓ Frontend (3000)
- ✓ Admin (3001)
- ✓ PostgreSQL (5432)
- ✓ Redis (6379)

**Phase 3: Database Schema**
- ✓ seo_title column
- ✓ price_history table
- ✓ sales table
- ✓ serial_number column

**Phase 4: API Endpoints**
- ✓ /api/v1/offers
- ✓ /api/v1/offers/search

**Phase 5: Frontend Features**
- ✓ sitemap.xml

**Phase 6: Container Logs**
- ✓ No critical errors

### test-phase4.sh (Phase 4 Features)

**Test 1: OCR (Serial Number Extraction)**
- ✓ serial_number column exists
- ✓ product_metadata JSONB column
- ✓ Serial number index
- ✓ OCR module (ocr.py)

**Test 2: Dynamic Pricing Optimizer**
- ✓ price_history table
- ✓ All required columns
- ✓ Pricing optimizer module
- ✓ BullMQ job handler
- ✓ Scheduled job (if configured)

**Test 3: Profit Tracking**
- ✓ sales table
- ✓ Profit calculation columns
- ✓ Profit calculator service
- ✓ Profits API routes
- ✓ /api/v1/profits/summary endpoint

**Test 4: SEO Optimization**
- ✓ seo_title column
- ✓ SEO module (seo.py)
- ✓ Sitemap generator
- ✓ sitemap.xml accessible
- ✓ SearchBar component
- ✓ Search API endpoint

---

## ✅ Expected Output

### Success (All Green)
```
==========================================
MASTER TEST SUMMARY
==========================================
✓ Deployment Tests: PASSED
✓ Phase 4 Tests: PASSED

==========================================
✓✓✓ ALL TESTS PASSED ✓✓✓
==========================================

System is healthy and ready for:
  • Production deployment via Coolify
  • Phase 4 features (OCR, Pricing, Profits, SEO)
  • Customer traffic
```

### Failure (Some Red)
```
==========================================
MASTER TEST SUMMARY
==========================================
✗ Deployment Tests: FAILED
✓ Phase 4 Tests: PASSED

==========================================
✗✗✗ SOME TESTS FAILED ✗✗✗
==========================================

Review failed tests above and fix issues.
Check logs: docker-compose logs -f
```

---

## 🐛 Troubleshooting

### "Container not running"
```bash
docker-compose ps  # Check status
docker-compose up -d  # Start missing containers
docker-compose logs <service-name>  # Check logs
```

### "Health check failed"
```bash
# Check if service is actually running
curl http://localhost:8080/health

# Check logs for errors
docker-compose logs --tail=50 backend

# Restart service
docker-compose restart backend
```

### "Migration not applied"
```bash
# Apply migrations manually
docker-compose exec backend npx tsx src/scripts/apply-all-migrations.ts

# Verify
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c "\d+ offers"
```

### "BullMQ queue not scheduled"
```bash
# This is normal if you haven't scheduled the job yet
# The optimizer will be scheduled automatically when backend starts with proper config
# Or trigger manually in code
```

---

## 📝 Integration with CI/CD

### GitHub Actions Example

```yaml
name: Test Deployment

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Run tests
        run: bash scripts/run-all-tests.sh

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: docker-logs
          path: |
            docker-compose logs
```

### Coolify Webhook

Add to Coolify after deployment:
```bash
bash /opt/jakebuysit/scripts/run-all-tests.sh
```

---

## 🔄 When to Run Tests

| Scenario | Which Test | Command |
|----------|-----------|---------|
| After git push to VPS | All | `bash scripts/run-all-tests.sh` |
| After manual code change | Deployment only | `bash scripts/test-deployment.sh` |
| After DB migration | Phase 4 only | `bash scripts/test-phase4.sh` |
| Before production deploy | All | `bash scripts/run-all-tests.sh` |
| After Coolify redeploy | All | `bash scripts/run-all-tests.sh` |
| Debugging issue | Deployment | `bash scripts/test-deployment.sh` |

---

## 💡 Tips

- Tests run **non-destructively** (read-only checks)
- Safe to run anytime, won't modify data
- Use `-x` flag for verbose output: `bash -x scripts/test-deployment.sh`
- Tests exit with code 0 (success) or 1 (failure) for CI/CD integration
- Check individual test output for specific failure details

---

## 📞 Need Help?

1. Run tests with verbose output: `bash -x scripts/run-all-tests.sh`
2. Check container logs: `docker-compose logs -f`
3. Verify health manually: `curl http://localhost:8080/health`
4. Review DEPLOYMENT.md for troubleshooting
5. Check ARCHITECTURE.md for system design
