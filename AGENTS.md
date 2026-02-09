# Agent Development Guide

## Issue Tracking

This project uses **bd (beads)** for issue tracking.
Run `bd prime` for workflow context, or install hooks (`bd hooks install`) for auto-injection.

**Quick reference:**
- `bd ready` - Find unblocked work
- `bd create "Title" --type task --priority 2` - Create issue
- `bd close <id>` - Complete work
- `bd sync` - Sync with git (run at session end)

For full workflow details: `bd prime`

## Project Structure

This is **Agent 2: AI Vision & Pricing Engine** for the JakeBuysIt platform.

### Services

- **vision/** - AI-powered item identification using Claude Vision
- **marketplace/** - API integrations (eBay, Amazon, Google Shopping)
- **pricing/** - FMV calculation and offer generation
- **cache/** - Redis caching and PostgreSQL data warehouse

### Development Workflow

1. **Setup**: Create virtual environment, install requirements
2. **Configure**: Copy `.env.example` to `.env`, add API keys
3. **Develop**: Implement features, write tests
4. **Test**: Run `pytest` before committing
5. **Commit**: Use conventional commits with Beads task tracking

## Integration Points

Agent 2 provides pricing intelligence to:
- **Agent 1** (Frontend): Offer data, confidence scores
- **Agent 3** (Jake Voice): Item identification for script generation
- **Agent 4** (Backend): Structured data for persistence

Agent 2 consumes from:
- **Agent 1** (Frontend): Photo URLs, user descriptions
- **Agent 5** (Admin): Configuration (margins, thresholds)

## Quality Standards

- **Accuracy**: >85% correct item identification
- **Latency**: <10s end-to-end processing
- **API Costs**: <$0.25 per offer (target $0.15)
- **Test Coverage**: >80% for core services
- **Confidence**: >80% auto-price rate

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=services --cov-report=html

# Run specific test file
pytest tests/test_pricing.py -v
```

## API Documentation

When the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
