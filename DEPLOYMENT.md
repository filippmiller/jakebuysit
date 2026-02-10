# JakeBuysIt — VPS Deployment Guide

---

## 🤖 ДЛЯ АГЕНТОВ — ЧИТАЙ СНАЧАЛА ЭТО!

### ГДЕ ЖИВЕТ САЙТ
- **VPS:** Hetzner Cloud
- **Deploy Tool:** Coolify
- **GitHub:** https://github.com/filippmiller/jakebuysit
- **Branch:** `master`

### КАК ЗАДЕПЛОИТЬ
```bash
# 1. Закоммить и запушить
git commit -m "feat: описание изменений"
git push origin master

# 2. Coolify автоматически задеплоит (если auto-deploy включен)
#    ИЛИ нажми "Redeploy" в Coolify dashboard

# 3. Если есть миграции БД:
ssh root@<vps-ip>
cd /opt/jakebuysit
docker-compose exec backend npx tsx src/scripts/apply-all-migrations.ts

# 4. Проверь deployment:
docker-compose ps  # Все сервисы = Up
curl http://localhost:8080/health  # {"status":"ok"}
docker-compose logs --tail=50 backend  # Нет ошибок
```

### ❌ НИКОГДА
- Не называй localhost "production"
- Не запускай .bat скрипты на VPS (только bash/docker-compose)
- Не коммить .env файлы
- Не деплой без миграций, если код их использует

### ✅ ВСЕГДА
- Тест локально: `docker-compose up` перед пушем
- Миграции перед кодом
- Проверяй health endpoints после деплоя
- Читай логи: `docker-compose logs -f`

**Детали ниже ↓**

---

## 🌐 PRODUCTION ENVIRONMENT

**VPS Location:** Hetzner Cloud
**Deployment Tool:** Coolify
**Stack:** 7 Docker containers (Backend, Python AI, Jake Service, Frontend, Admin, PostgreSQL, Redis)
**Domain:** [To be configured in Coolify]

---

## 📦 SERVICES ARCHITECTURE

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **Backend** | 8080 | Fastify/Node.js | API orchestrator, BullMQ jobs |
| **Pricing API** | 8000 | FastAPI/Python | AI Vision, OCR, SEO, marketplace scraping |
| **Jake Service** | 3002 | Node.js | Voice synthesis, character personality |
| **Frontend** | 3000 | Next.js 14 | Customer-facing web app |
| **Admin** | 3001 | Next.js 14 | Admin dashboard |
| **PostgreSQL** | 5432 | Postgres 16 | Main database |
| **Redis** | 6379 | Redis 7 | Cache + BullMQ queue backend |

---

## 🚀 DEPLOYMENT VIA COOLIFY

### Step 1: Configure Project in Coolify

1. **Login to Coolify** on your Hetzner VPS
2. **Create New Project**: Name it `JakeBuysIt`
3. **Connect Git Repository**:
   - Repository: `https://github.com/filippmiller/jakebuysit.git`
   - Branch: `master`
   - Auto-deploy: Enable (optional)

### Step 2: Set Environment Variables

In Coolify → Project → **Environment Variables**, add:

**REQUIRED:**
```env
# Database
POSTGRES_USER=jakebuysit
POSTGRES_PASSWORD=<generate-secure-password>
POSTGRES_DB=jakebuysit

# Auth (generate: openssl rand -base64 32)
JWT_SECRET=<generate-random-secret>
JWT_REFRESH_SECRET=<generate-different-secret>

# AI
ANTHROPIC_API_KEY=sk-ant-<your-key>
```

**OPTIONAL (for full features):**
```env
# Marketplace APIs
EBAY_APP_ID=<ebay-app-id>
EBAY_CERT_ID=<ebay-cert>
EBAY_DEV_ID=<ebay-dev>
SERPAPI_KEY=<serpapi-key>

# Voice
ELEVENLABS_API_KEY=<elevenlabs-key>
JAKE_VOICE_ID=<voice-id>

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
S3_BUCKET=jakebuysit-photos

# Payments
STRIPE_SECRET_KEY=<stripe-secret>
PAYPAL_CLIENT_ID=<paypal-id>

# Monitoring
SENTRY_DSN=<sentry-dsn>
LOG_LEVEL=info
```

### Step 3: Configure Domains (Optional)

In Coolify → Domains:
- Frontend: `jakebuysit.com` → Port 3000
- Admin: `admin.jakebuysit.com` → Port 3001
- Backend API: `api.jakebuysit.com` → Port 8080
- Python AI: `ai.jakebuysit.com` → Port 8000

Coolify auto-configures:
- Nginx reverse proxy
- SSL certificates (Let's Encrypt)
- HTTPS redirects

### Step 4: Deploy

Click **Deploy** in Coolify dashboard.

**Deployment process:**
1. Git clone/pull
2. Build 5 Docker images (backend, pricing-api, jake-service, web, admin)
3. Pull base images (postgres, redis)
4. Run database migrations (auto-applied via schema.sql)
5. Start all 7 containers
6. Configure reverse proxy
7. Issue SSL certificates

**Deployment time:** ~5-10 minutes (first deploy), ~2-3 minutes (updates)

---

## 🔧 MANUAL DEPLOYMENT (SSH)

If Coolify fails or you prefer manual control:

### Step 1: SSH into VPS
```bash
ssh root@<your-vps-ip>
```

### Step 2: Clone Repository
```bash
cd /opt
git clone https://github.com/filippmiller/jakebuysit.git
cd jakebuysit
```

### Step 3: Create .env File
```bash
cp .env.example .env
nano .env  # Fill in REQUIRED variables
```

### Step 4: Apply Database Migrations

**Option A: Via Docker (recommended)**
```bash
docker-compose up -d postgres redis
sleep 10  # Wait for postgres to be ready

# Schema auto-applies on first start (schema.sql in docker-compose.yml)
# For Phase 4 migrations:
docker-compose exec backend npx tsx src/scripts/apply-all-migrations.ts
```

**Option B: Via PostgreSQL client**
```bash
psql -U jakebuysit -d jakebuysit -f backend/src/db/migrations/002_add_seo_and_search.sql
psql -U jakebuysit -d jakebuysit -f backend/src/db/migrations/004_add_price_history.sql
psql -U jakebuysit -d jakebuysit -f backend/src/db/migrations/005_profit_tracking.sql
psql -U jakebuysit -d jakebuysit -f backend/src/db/migrations/007_serial_and_metadata.sql
```

### Step 5: Start All Services
```bash
docker-compose up -d
```

### Step 6: Verify Deployment
```bash
# Check all services running
docker-compose ps

# Health checks
curl http://localhost:8080/health  # Backend
curl http://localhost:8000/health  # Python AI
curl http://localhost:3002/api/v1/health  # Jake Service
curl http://localhost:3000  # Frontend (should return HTML)
curl http://localhost:3001  # Admin (should return HTML)

# Check logs
docker-compose logs -f backend
docker-compose logs -f pricing-api
```

---

## 🔄 UPDATING PRODUCTION

### Via Coolify (Recommended)
1. **Push to GitHub:** `git push origin master`
2. **Auto-deploy:** Coolify detects push and redeploys (if enabled)
3. **Manual deploy:** Click **Redeploy** in Coolify dashboard

### Via SSH
```bash
ssh root@<your-vps-ip>
cd /opt/jakebuysit

# Pull latest code
git pull origin master

# Rebuild and restart containers
docker-compose up -d --build

# Apply new migrations (if any)
docker-compose exec backend npx tsx src/scripts/apply-all-migrations.ts

# Verify
docker-compose ps
curl http://localhost:8080/health
```

---

## 🗄️ DATABASE MIGRATIONS

### Phase 4 Migrations (Already Applied)
1. **002_add_seo_and_search.sql** - SEO optimization (`seo_title` column)
2. **004_add_price_history.sql** - Price history tracking
3. **005_profit_tracking.sql** - Sales and profit analytics
4. **007_serial_and_metadata.sql** - OCR serial numbers

### Applying New Migrations

**Automated (via helper script):**
```bash
docker-compose exec backend npx tsx src/scripts/apply-all-migrations.ts
```

**Manual (via psql):**
```bash
docker-compose exec postgres psql -U jakebuysit -d jakebuysit
jakebuysit=# \i /docker-entrypoint-initdb.d/new_migration.sql
```

**Check applied migrations:**
```bash
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c "\d+ offers"
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c "\d+ price_history"
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c "\d+ sales"
```

---

## 🧪 TESTING PHASE 4 FEATURES

### 1. OCR (Serial Number Extraction)
```bash
# Upload photo with serial number via frontend
# Check database:
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c \
  "SELECT id, serial_number, product_metadata FROM offers WHERE serial_number IS NOT NULL LIMIT 5;"
```

### 2. Dynamic Pricing Optimizer
```bash
# Check BullMQ job scheduled (daily 2 AM UTC)
docker-compose exec backend npx tsx -e "
  const { Queue } = require('bullmq');
  const queue = new Queue('price-optimizer', { connection: { host: 'redis', port: 6379 } });
  queue.getRepeatableJobs().then(jobs => console.log(jobs));
"

# Check price history
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c \
  "SELECT * FROM price_history ORDER BY created_at DESC LIMIT 10;"
```

### 3. Profit Tracking
```bash
# Test profit API endpoint
curl -H "Authorization: Bearer <jwt-token>" \
  http://localhost:8080/api/v1/profits/summary

# Check sales table
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c \
  "SELECT * FROM sales ORDER BY sold_at DESC LIMIT 10;"
```

### 4. SEO Optimization
```bash
# Check sitemap
curl http://localhost:3000/sitemap.xml

# Check search endpoint
curl "http://localhost:8080/api/v1/offers/search?q=iPhone"

# Verify seo_title generation
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c \
  "SELECT id, item_brand, item_model, seo_title FROM offers WHERE seo_title IS NOT NULL LIMIT 5;"
```

---

## 📊 MONITORING & LOGS

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f pricing-api
docker-compose logs -f jake-service

# Last 100 lines
docker-compose logs --tail=100 backend

# Follow errors only
docker-compose logs -f pricing-api 2>&1 | grep ERROR
```

### Container Stats
```bash
docker stats
```

### Health Checks
```bash
# Backend
curl http://localhost:8080/health

# Python AI
curl http://localhost:8000/health

# Jake Service
curl http://localhost:3002/api/v1/health

# PostgreSQL
docker-compose exec postgres pg_isready -U jakebuysit

# Redis
docker-compose exec redis redis-cli ping
```

---

## 🔒 SECURITY CHECKLIST

- [x] `.env` file NOT committed to git
- [x] Strong PostgreSQL password (20+ chars)
- [x] JWT secrets generated with `openssl rand -base64 32`
- [ ] PostgreSQL port 5432 NOT exposed to internet (only internal network)
- [ ] Redis port 6379 NOT exposed to internet (only internal network)
- [ ] Coolify secrets marked as "Secret" (hidden in logs)
- [ ] Cloudflare proxy enabled for additional DDoS protection
- [ ] SSL certificates auto-renewed by Let's Encrypt
- [ ] Rate limiting configured in Backend API
- [ ] Admin endpoints protected with JWT authentication

---

## 💾 BACKUP & RESTORE

### PostgreSQL Backup
```bash
# Backup
docker-compose exec postgres pg_dump -U jakebuysit jakebuysit > backup-$(date +%Y%m%d).sql

# Copy to local machine
scp root@<vps-ip>:/opt/jakebuysit/backup-*.sql ./

# Restore
cat backup-20260210.sql | docker-compose exec -T postgres psql -U jakebuysit jakebuysit
```

### Redis Backup
```bash
# Redis auto-saves with AOF (appendonly.aof)
docker cp jakebuysit-redis:/data/appendonly.aof ./redis-backup-$(date +%Y%m%d).aof

# Restore
docker cp redis-backup-20260210.aof jakebuysit-redis:/data/appendonly.aof
docker-compose restart redis
```

### Full Backup Script
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/jakebuysit"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Database
docker-compose exec postgres pg_dump -U jakebuysit jakebuysit > $BACKUP_DIR/db-$DATE.sql

# Redis
docker cp jakebuysit-redis:/data/appendonly.aof $BACKUP_DIR/redis-$DATE.aof

# .env file
cp .env $BACKUP_DIR/env-$DATE

# Compress
tar -czf $BACKUP_DIR/full-backup-$DATE.tar.gz $BACKUP_DIR/*-$DATE.*

# Cleanup (keep last 7 days)
find $BACKUP_DIR -name "full-backup-*.tar.gz" -mtime +7 -delete
```

---

## 🐛 TROUBLESHOOTING

### Service Won't Start
```bash
# Check logs
docker-compose logs pricing-api

# Check if port is occupied
netstat -tulpn | grep 8000

# Restart service
docker-compose restart pricing-api

# Rebuild service
docker-compose up -d --build pricing-api
```

### Database Connection Errors
```bash
# Check if postgres is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U jakebuysit -d jakebuysit -c "SELECT 1;"

# Check DATABASE_URL format
docker-compose exec backend printenv DATABASE_URL
```

### High Memory Usage
```bash
# Check stats
docker stats

# Restart memory-heavy service
docker-compose restart pricing-api

# Add resource limits (docker-compose.yml)
services:
  pricing-api:
    deploy:
      resources:
        limits:
          memory: 1G
```

### Frontend Not Loading
```bash
# Check NEXT_PUBLIC_API_URL
docker-compose exec web printenv NEXT_PUBLIC_API_URL

# Should be: http://backend:8080 (internal) or https://api.yourdomain.com (external)

# Rebuild frontend
docker-compose up -d --build web
```

---

## 📝 FOR FUTURE AGENTS

**When deploying new features:**

1. **Commit code to GitHub:** `git commit -m "feat: ..."`
2. **Push to master:** `git push origin master`
3. **Coolify auto-deploys** (if enabled) OR click **Redeploy**
4. **Apply migrations if needed:**
   ```bash
   docker-compose exec backend npx tsx src/scripts/apply-all-migrations.ts
   ```
5. **Verify deployment:**
   ```bash
   curl http://localhost:8080/health
   docker-compose ps
   ```

**Never:**
- ❌ Call local dev setup "production"
- ❌ Run Windows .bat scripts on VPS (use bash scripts or docker-compose)
- ❌ Commit .env files
- ❌ Expose PostgreSQL/Redis ports to internet
- ❌ Deploy without testing migrations locally first

**Always:**
- ✅ Test locally with `docker-compose up`
- ✅ Apply migrations before deploying code that uses new DB columns
- ✅ Check health endpoints after deployment
- ✅ Monitor logs for errors: `docker-compose logs -f`
- ✅ Document new environment variables in `.env.example`

---

## 🔗 USEFUL LINKS

- **GitHub Repo:** https://github.com/filippmiller/jakebuysit
- **Coolify Docs:** https://coolify.io/docs
- **Docker Compose Docs:** https://docs.docker.com/compose/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/16/
- **Redis Docs:** https://redis.io/docs/

---

## 📞 SUPPORT

**Deployment issues?**
1. Check logs: `docker-compose logs -f`
2. Check health endpoints: `curl http://localhost:8080/health`
3. Check Coolify dashboard for deployment errors
4. Verify environment variables are set correctly
5. Restart services: `docker-compose restart`

**Still stuck?**
- Check existing issues: https://github.com/filippmiller/jakebuysit/issues
- Review ARCHITECTURE.md for system design
- Review AGENTS.md for service responsibilities
