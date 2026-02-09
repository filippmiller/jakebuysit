# Deployment Guide - Coolify on Hetzner VPS

## Prerequisites

- Hetzner VPS with Docker and Docker Compose installed
- Coolify installed on your VPS
- Git repository set up (GitHub/GitLab/Gitea)

## Environment Variables (Set in Coolify)

**Required:**
```
ANTHROPIC_API_KEY=sk-ant-your-key
DATABASE_URL=postgresql://jakebuysit:password@postgres:5432/jakebuysit
REDIS_URL=redis://redis:6379/0
POSTGRES_PASSWORD=your-secure-password
```

**Optional:**
```
EBAY_APP_ID=your-ebay-app-id
EBAY_CERT_ID=your-ebay-cert
EBAY_DEV_ID=your-ebay-dev
SERPAPI_KEY=your-serpapi-key
OPENAI_API_KEY=sk-your-openai-key
```

## Coolify Setup

### 1. Add Git Repository

In Coolify dashboard:
1. Go to **Projects** → **New Project**
2. Name: `JakeBuysIt`
3. Connect your Git repository (GitHub/GitLab)
4. Branch: `main` or `master`

### 2. Configure Application

1. **Application Type**: Docker Compose
2. **Docker Compose File**: `docker-compose.yml`
3. **Build Pack**: Docker
4. **Port**: 8000

### 3. Set Environment Variables

In Coolify → Your App → **Environment Variables**:
- Add all variables from above
- Mark sensitive ones as "Secret"

### 4. Configure Domains (Optional)

If you want a domain instead of IP:
- Add domain: `pricing.yourdomain.com`
- Coolify will auto-configure Nginx proxy
- SSL certificate via Let's Encrypt (automatic)

### 5. Deploy

Click **Deploy** button in Coolify

Coolify will:
1. Clone your repository
2. Build Docker images
3. Start containers
4. Configure reverse proxy
5. Set up SSL (if domain configured)

## Manual Deployment (Without Coolify)

If you prefer manual deployment:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Clone repository
git clone https://github.com/yourusername/jakebuysit.git
cd jakebuysit

# Create .env file
cp .env.example .env
nano .env  # Add your API keys

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f pricing-api
```

## Verification

After deployment, verify:

```bash
# Health check
curl http://your-vps-ip:8000/health

# API docs
open http://your-vps-ip:8000/docs
```

## Monitoring

View logs in Coolify dashboard or via CLI:

```bash
# All services
docker-compose logs -f

# Pricing API only
docker-compose logs -f pricing-api

# Postgres
docker-compose logs -f postgres

# Redis
docker-compose logs -f redis
```

## Updating

### Via Coolify (Automatic)
- Push to git → Coolify auto-deploys (if enabled)
- Or click **Redeploy** in Coolify dashboard

### Via CLI (Manual)
```bash
cd /path/to/jakebuysit
git pull origin main
docker-compose up -d --build
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs pricing-api

# Check if port is available
netstat -tulpn | grep 8000

# Restart services
docker-compose restart
```

### Database connection issues
```bash
# Check if postgres is running
docker-compose ps postgres

# Connect to postgres
docker-compose exec postgres psql -U jakebuysit -d jakebuysit

# Check DATABASE_URL format
echo $DATABASE_URL
```

### High memory usage
```bash
# Check container stats
docker stats

# Restart specific service
docker-compose restart pricing-api
```

## Scaling

To run multiple instances:

```yaml
# docker-compose.yml
services:
  pricing-api:
    # ... existing config ...
    deploy:
      replicas: 3
```

Then use Nginx load balancer (Coolify handles this automatically).

## Backup

### Database Backup
```bash
# Backup
docker-compose exec postgres pg_dump -U jakebuysit jakebuysit > backup.sql

# Restore
docker-compose exec -T postgres psql -U jakebuysit jakebuysit < backup.sql
```

### Redis Backup
```bash
# Redis saves automatically (AOF enabled)
# Copy backup file
docker cp jakebuysit-redis:/data/appendonly.aof ./redis-backup.aof
```

## Security Notes

- Never commit `.env` file
- Use strong passwords for POSTGRES_PASSWORD
- Restrict port 5432 and 6379 (only internal network)
- Keep API keys in Coolify secrets
- Enable Cloudflare proxy for additional protection

## Performance Tuning

### For Hetzner CPX11 (2 vCPU, 2GB RAM):
```yaml
# docker-compose.yml
services:
  pricing-api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

### For Hetzner CPX21 (3 vCPU, 4GB RAM):
```yaml
services:
  pricing-api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
      replicas: 2
```
