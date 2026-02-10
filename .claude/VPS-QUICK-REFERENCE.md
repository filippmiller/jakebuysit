# VPS Quick Reference для Агентов

## 🌐 ГДЕ ЖИВЕТ САЙТ

**VPS:** Hetzner Cloud
**Deploy Tool:** Coolify
**GitHub:** https://github.com/filippmiller/jakebuysit
**Branch:** master

**Сервисы:**
- Frontend (3000) + Admin (3001) + Backend (8080) + Python AI (8000) + Jake (3002) + PostgreSQL (5432) + Redis (6379)

---

## 🚀 КАК ЗАДЕПЛОИТЬ НА VPS

### Вариант 1: Автодеплой (Рекомендуется)
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

```bash
# 1. Все контейнеры работают
docker-compose ps

# 2. Health checks
curl http://localhost:8080/health   # Backend → должен вернуть {"status":"ok"}
curl http://localhost:8000/health   # Python AI
curl http://localhost:3002/api/v1/health  # Jake Service

# 3. Логи без ошибок
docker-compose logs --tail=50 backend
docker-compose logs --tail=50 pricing-api
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
