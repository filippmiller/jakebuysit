# JakeBuysIt - Agent 2: AI Vision & Pricing Engine

AI-powered pricing engine that identifies items from photos, researches marketplace data, and generates fair offers.

## Features

- **Vision Pipeline**: Claude 3.5 Sonnet Vision API for item identification
- **Marketplace Integration**: Real-time data from eBay, Amazon, Google Shopping
- **Fair Market Value Calculation**: Weighted algorithm with outlier filtering
- **Dynamic Pricing**: Category-based margins with smart adjustments
- **Confidence Scoring**: Multi-factor confidence assessment
- **Caching Layer**: Redis + PostgreSQL for performance and cost optimization

## Architecture

```
services/
├── vision/          # Item identification & condition assessment
├── marketplace/     # API integrations (eBay, Amazon, Google)
├── pricing/         # FMV calculation & offer generation
├── cache/           # Redis caching & PostgreSQL warehouse
└── models/          # Multi-model routing & fallback
```

## Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your API keys
# Required: ANTHROPIC_API_KEY, DATABASE_URL, REDIS_URL
```

### 3. Run Development Server

```bash
# Start FastAPI server
python main.py

# Or use uvicorn directly
uvicorn main:app --reload
```

API will be available at:
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Vision Identification
```http
POST /api/v1/vision/identify
Content-Type: application/json

{
  "photos": ["https://example.com/photo1.jpg", "..."],
  "user_description": "Optional text hint"
}
```

### Marketplace Research
```http
POST /api/v1/marketplace/research
Content-Type: application/json

{
  "product": {
    "brand": "Apple",
    "model": "AirPods Pro 2nd Gen",
    "category": "Consumer Electronics"
  }
}
```

### FMV Calculation
```http
POST /api/v1/pricing/fmv
Content-Type: application/json

{
  "marketplace_data": { ... }
}
```

### Generate Offer
```http
POST /api/v1/pricing/offer
Content-Type: application/json

{
  "fmv": 118.00,
  "condition": "Good",
  "category": "Consumer Electronics",
  "user_id": "optional-uuid"
}
```

## Configuration

Key environment variables:

- `ANTHROPIC_API_KEY`: Claude API key (required)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `EBAY_APP_ID`, `EBAY_CERT_ID`: eBay API credentials
- `SERPAPI_KEY`: Google Shopping API key

See `.env.example` for full configuration options.

## Development

### Project Structure

- `main.py`: FastAPI application entry point
- `config/settings.py`: Environment configuration
- `services/`: Core business logic modules
- `tests/`: Test suite
- `requirements.txt`: Python dependencies

### Running Tests

```bash
pytest tests/ -v --cov=services
```

## Quality Standards

- **Accuracy**: >85% correct item identification
- **Latency**: <10s end-to-end processing
- **API Costs**: <$0.25 per offer (target $0.15)
- **Cache Hit Rate**: >50% for popular categories
- **Confidence**: >80% auto-price rate

## Integration Points

**Consumes:**
- User-submitted photo URLs (from Agent 1 frontend)
- Admin configuration (from Agent 5 admin panel)

**Provides to:**
- Agent 1: Offer data, confidence scores, market context
- Agent 3: Identification + pricing data for Jake script generation
- Agent 4: Structured offer data for persistence

## License

Proprietary - JakeBuysIt Platform
