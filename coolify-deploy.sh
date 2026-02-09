#!/bin/bash
# Coolify deployment script
# This script runs on your Hetzner VPS via Coolify

set -e

echo "🚀 Deploying JakeBuysIt Agent 2: Pricing Engine"

# Pull latest code
git pull origin main

# Build and start services
docker-compose down
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
docker-compose ps

echo "✅ Deployment complete!"
echo "📊 API Docs: http://your-vps-ip:8000/docs"
echo "🏥 Health Check: http://your-vps-ip:8000/health"
