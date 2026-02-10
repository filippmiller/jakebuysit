# VPS Quick Reference для Агентов

## 🌐 ГДЕ ЖИВЕТ САЙТ

**VPS Provider:** Hetzner Cloud (Helsinki, Finland)
**VPS IP:** 89.167.42.128
**Coolify Panel:** http://89.167.42.128:8000
**Deploy Tool:** Coolify 4.0.0-beta.462
**GitHub Repo:** https://github.com/filippmiller/jakebuysit
**Branch:** master
**Status:** ⚠️ NOT YET DEPLOYED (needs to be added to Coolify)

**VPS Specs:**
- Plan: CPX42 (8 vCPU AMD, 16 GB RAM, 320 GB SSD)
- OS: Ubuntu 24.04 LTS
- Cost: ~$22.59/mo

**Сервисы (when deployed):**
- Frontend (3000) + Admin (3001) + Backend (8080) + Python AI (8000) + Jake (3002) + PostgreSQL (5432) + Redis (6379)

---

## 🗄️ VPS DATABASE CREDENTIALS

**PostgreSQL 16:**
```
Host: host.docker.internal (from Coolify containers)
Port: 5432
User: admin
Password: BQ02BmHGWr3PwWrUWAGCHGBQAcYgYet
Database: jakebuysit (create first: CREATE DATABASE jakebuysit;)
Connection: postgresql://admin:BQ02BmHGWr3PwWrUWAGCHGBQAcYgYet@host.docker.internal:5432/jakebuysit
```

**Redis 7:**
```
Host: host.docker.internal
Port: 6379
Password: iuTxuGPRtSLVRfhQA794w9KaHpPEaO88
Connection: redis://:iuTxuGPRtSLVRfhQA794w9KaHpPEaO88@host.docker.internal:6379
```

**Note:** Use `host.docker.internal` for apps running in Coolify containers to access host-level services.

---

## 🚀 КАК ЗАДЕПЛОИТЬ НА VPS

### FIRST TIME SETUP (Required!)
1. **SSH to VPS:** `ssh root@89.167.42.128`
2. **Create database:**
   ```bash
   docker exec -it postgres psql -U admin -d main
   CREATE DATABASE jakebuysit;
   \q
   ```
3. **Add app to Coolify:**
   - Open http://89.167.42.128:8000
   - Go to "My first project" → production environment
   - Click "New Resource" → "Application"
   - Repository: `https://github.com/filippmiller/jakebuysit.git`
   - Branch: `master`
   - Build Pack: Dockerfile (or Nixpacks)
4. **Set environment variables in Coolify:**
   - Copy all from `.env.example`
   - Use VPS database credentials (see above)
   - Set `NODE_ENV=production`
5. **Deploy:** Click "Deploy" button

### Вариант 1: Автодеплой (After Initial Setup)
```bash
git commit -m "feat: описание изменений"
git push origin master
```
Coolify автоматически подхватит изменения (если включен auto-deploy) или нажми **Redeploy** в дашборде.

### Вариант 2: Вручную через SSH
```bash
ssh root@<vps-ip>
cd /opt/jakebuysit
git pull origin master
docker-compose up -d --build
docker-compose exec backend npx tsx src/scripts/apply-all-migrations.ts
docker-compose ps  # Проверка
curl http://localhost:8080/health  # Проверка Backend
```

---

## ✅ ПОСЛЕ ДЕПЛОЯ — ОБЯЗАТЕЛЬНО ПРОВЕРЬ

**From VPS (SSH):**
```bash
ssh root@89.167.42.128

# 1. Check Coolify containers
docker ps | grep jakebuysit

# 2. Check logs in Coolify dashboard
# OR: docker logs <container-name>

# 3. Health checks (after finding app ports in Coolify)
curl http://localhost:<backend-port>/health   # Backend → {"status":"ok"}
curl http://localhost:<python-port>/health    # Python AI
curl http://localhost:<jake-port>/api/v1/health  # Jake Service
```

**From Local Machine (Remote Testing):**
```bash
# Use Coolify-assigned URLs or direct IP:port
curl http://89.167.42.128:<assigned-port>/health

# Or use automated E2E tests (once app is live):
# See .claude/testing/test-plan.md for full test suite
```

---

## 🗄️ МИГРАЦИИ БД

**Если добавил новые колонки/таблицы:**
```bash
# На VPS после деплоя кода:
docker-compose exec backend npx tsx src/scripts/apply-all-migrations.ts

# Проверь, что миграция применилась:
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c "\d+ offers"
```

**Phase 4 миграции (уже применены):**
- 002: seo_title
- 004: price_history
- 005: sales (profit tracking)
- 007: serial_number, product_metadata

---

## ❌ НИКОГДА НЕ ДЕЛАЙ

- ❌ Не называй localhost "production"
- ❌ Не запускай .bat скрипты на VPS (только bash/docker-compose)
- ❌ Не коммить .env файлы
- ❌ Не открывай порты 5432 и 6379 наружу
- ❌ Не деплой без проверки миграций локально

---

## ✅ ВСЕГДА ДЕЛАЙ

- ✅ Тест локально: `docker-compose up` перед пушем
- ✅ Миграции перед кодом, который их использует
- ✅ Проверяй health endpoints после деплоя
- ✅ Мониторь логи: `docker-compose logs -f`
- ✅ Документируй новые env variables в `.env.example`

---

## 📖 ПОЛНАЯ ДОКУМЕНТАЦИЯ

Читай **DEPLOYMENT.md** для:
- Настройки Coolify
- Бэкапов и восстановления
- Troubleshooting
- Мониторинга
- Security checklist

---

## 🆘 ЕСЛИ ЧТО-ТО СЛОМАЛОСЬ

```bash
# Логи
docker-compose logs -f backend

# Рестарт сервиса
docker-compose restart backend

# Полный перезапуск
docker-compose down && docker-compose up -d

# Проверка статуса всех контейнеров
docker-compose ps
docker stats
```

---

**Вопросы?** Читай DEPLOYMENT.md, ARCHITECTURE.md, AGENTS.md
