# AGENT 2: AI Vision & Pricing Engine

## MISSION
Build the core AI engine that identifies items from photos, fetches real-time marketplace data, calculates fair market value, and generates dynamic pricing with configurable margin control.

## CONTEXT
You are building the intelligence layer for JakeBuysIt. When a user submits photos, your system must:
1. **Identify** the item (brand, model, condition, features)
2. **Research** marketplace prices across eBay, Amazon, etc.
3. **Calculate** fair market value with confidence scoring
4. **Price** the offer using margin targets and dynamic adjustments
5. **Return** structured data for frontend + Jake commentary generation

## TECHNOLOGY STACK
- **Language**: Python (FastAPI) or Node.js (Fastify)
- **Vision AI**: Claude 3.5 Sonnet (Vision) / GPT-4o / Gemini Pro Vision
- **Marketplace APIs**: eBay Browse API, Amazon Product Advertising, Google Shopping (SerpAPI)
- **Cache**: Redis for API response caching
- **Database**: PostgreSQL for data warehouse
- **Queue**: BullMQ for async processing
- **ML**: Optional - scikit-learn for future fine-tuning

## DELIVERABLES

### 1. Vision Pipeline (`services/vision/`)

#### Stage 1: Primary Classification
**Input**: Array of photo URLs
**Output**: Structured identification

```python
# POST /api/v1/vision/identify
{
  "photos": ["url1", "url2", ...],
  "user_description": "Optional text hint"
}

# Returns:
{
  "category": "Consumer Electronics",
  "subcategory": "Wireless Earbuds",
  "brand": "Apple",
  "model": "AirPods Pro 2nd Generation",
  "condition": "Good",
  "features": ["Charging case", "Original tips"],
  "damage": ["Minor scratches on case"],
  "confidence": 87,
  "identifiers": {
    "upc": "194253397434",
    "model_number": "MTJV3AM/A"
  }
}
```

**Implementation**:
- Call multimodal LLM (Claude Vision recommended)
- Structured JSON output via function calling
- Extract: category, brand, model, condition, features, damage
- Confidence scoring: 0-100
- Retry with different prompt if confidence <50

#### Stage 2: Product Database Enrichment
Cross-reference with:
- **UPCitemdb**: Verify UPC/EAN/model numbers
- **Google Shopping API**: Confirm product variants
- **Internal database**: Historical identifications

Output: Verified product identifiers, improved confidence

#### Stage 3: Condition Assessment (AI-POWERED DEFECT DETECTION)

**CRITICAL CAPABILITY**: The vision AI MUST perform detailed condition grading with structured defect detection. This is a core differentiator for competitive pricing accuracy.

**Condition Grading Scale**:
- **Excellent** (95-100% multiplier): Like new, no visible defects, appears unused or barely used. Minimal to no cosmetic wear. Equivalent to "New" or "Like New" for resale.
- **Good** (75-85% multiplier): Light wear appropriate for age. Minor cosmetic issues (small scratches, light scuffs) that don't affect function. Normal use signs but well-maintained.
- **Fair** (55-70% multiplier): Noticeable wear and cosmetic damage. Multiple scratches, scuffs, or small dents. Fully functional but shows significant use. May have minor missing accessories.
- **Poor** (30-50% multiplier): Heavy damage, major cosmetic issues, or questionable functionality. Deep scratches, dents, cracks, discoloration. Missing important parts or accessories.

**Defect Detection Categories**:

1. **Scratches**
   - Surface scratches (minor): <5mm, barely visible, surface-level only
   - Noticeable scratches (moderate): 5-15mm, clearly visible, cosmetic
   - Deep scratches/gouges (severe): >15mm, into material, may affect function
   - Location specificity required: "upper right corner of screen", "back panel center", etc.

2. **Dents/Impact Damage**
   - Minor dings: Small impact marks, corners slightly compressed
   - Moderate dents: Visible deformation, bent edges
   - Severe dents: Deep deformation, cracked housing from impact

3. **Wear Patterns**
   - Minor wear: Light rubbing on edges, barely noticeable fading
   - Moderate wear: Visible wear areas, edges smoothed, some finish loss
   - Severe wear: Heavy rubbing, significant finish loss, material degradation

4. **Cracks**
   - Hairline cracks: Barely visible, surface-level
   - Moderate cracks: Clearly visible, through screen/housing
   - Severe cracks: Shattered, spiderweb pattern, structural integrity compromised

5. **Discoloration**
   - Minor: Slight yellowing, minimal staining
   - Moderate: Noticeable discoloration, visible stains
   - Severe: Heavy yellowing, rust, oxidation, permanent staining

6. **Missing Parts/Accessories**
   - Minor: Missing non-essential accessories (stylus, manual)
   - Moderate: Missing functional accessories (charging cable, case)
   - Severe: Missing critical components (battery cover, buttons, ports)

**Structured Output Format**:

```json
{
  "condition_assessment": {
    "grade": "Good",
    "notes": "Item shows light wear consistent with normal use. Minor scratches on back panel but screen is pristine. All functions appear intact.",
    "defects": [
      {
        "type": "scratch",
        "severity": "minor",
        "location": "back panel, upper left corner",
        "description": "2-3mm surface scratch, barely visible under normal lighting"
      },
      {
        "type": "wear",
        "severity": "minor",
        "location": "bottom edge near charging port",
        "description": "Light wear from repeated charging cable insertion"
      }
    ],
    "confidence": 88
  }
}
```

**Assessment Protocol**:

1. **Systematic Photo Review**: Examine each photo for all defect categories
2. **Defect Cataloging**: Record every visible defect with type, severity, location, description
3. **Grade Determination**: Assign overall grade based on worst defects + defect count
4. **Confidence Scoring**: Rate based on photo quality, angles, lighting
5. **Notes Generation**: Explain reasoning in 1-2 sentences

**Grading Decision Tree**:

```
IF no defects found AND pristine appearance
  → GRADE: Excellent

ELSE IF only minor defects (1-3 small scratches/light wear)
  → GRADE: Good

ELSE IF moderate defects OR many minor defects (4+)
  → GRADE: Fair

ELSE IF severe defects (cracks, heavy damage, missing parts)
  → GRADE: Poor
```

**Category-Specific Considerations**:

- **Electronics**: Focus on screen condition, housing integrity, port condition
- **Jewelry**: Look for scratches on stones, band wear, clasp condition, discoloration
- **Watches**: Check crystal clarity, case scratches, band wear, bezel damage
- **Clothing**: Examine for stains, tears, pilling, fading, missing buttons
- **Books**: Spine damage, page condition, cover wear, water damage
- **Tools**: Rust, blade condition, handle integrity, mechanical function indicators

**Confidence Scoring for Condition Assessment**:

- **90-100**: Crystal clear photos from multiple angles, all areas visible, excellent lighting
- **70-89**: Good photos, most areas visible, some angles missing or lighting suboptimal
- **50-69**: Limited photos, some areas obscured, blurry or dark images
- **<50**: Poor photo quality, item mostly obscured, cannot assess condition reliably

**Integration with Pricing**:

The `condition_assessment` object feeds directly into:
1. **FMV Multiplier**: `services/pricing/offer.py` uses `condition_assessment.grade` + `defects.length`
2. **Offer Adjustments**: Additional 5-10% penalty for severe defects
3. **Jake Commentary**: Defect list informs Jake's voice script ("I see some wear on the back...")
4. **User Transparency**: Defects displayed in offer UI for trust-building

**Quality Standards**:

- Defect detection accuracy: >90% (validated against in-person inspection)
- False positive rate: <10% (don't hallucinate defects)
- Grade consistency: ±1 grade level when compared to human appraisers
- Confidence calibration: When confidence >80%, accuracy should be >85%

**Example Assessments**:

**Example 1: Excellent Condition iPhone**
```json
{
  "grade": "Excellent",
  "notes": "Appears like new with no visible defects. Screen is pristine, housing shows no wear. Likely kept in a case.",
  "defects": [],
  "confidence": 95
}
```

**Example 2: Fair Condition Laptop**
```json
{
  "grade": "Fair",
  "notes": "Shows significant wear from regular use. Multiple cosmetic issues but appears functional.",
  "defects": [
    {
      "type": "scratch",
      "severity": "moderate",
      "location": "lid top surface, center area",
      "description": "10-12mm scratches in parallel pattern, likely from stacking"
    },
    {
      "type": "dent",
      "severity": "minor",
      "location": "front right corner",
      "description": "Small impact dent, approximately 3mm diameter"
    },
    {
      "type": "wear",
      "severity": "moderate",
      "location": "palm rest area",
      "description": "Shiny wear pattern from hand oils, finish partially worn away"
    },
    {
      "type": "missing_parts",
      "severity": "minor",
      "location": "bottom panel",
      "description": "One rubber foot missing"
    }
  ],
  "confidence": 82
}
```

**Example 3: Poor Condition Watch**
```json
{
  "grade": "Poor",
  "notes": "Heavy wear and damage throughout. Crystal is cracked, significant scratches on case. Questionable functionality.",
  "defects": [
    {
      "type": "crack",
      "severity": "severe",
      "location": "watch crystal, upper right quadrant",
      "description": "Crack across crystal face, approximately 15mm long"
    },
    {
      "type": "scratch",
      "severity": "severe",
      "location": "case back, all around",
      "description": "Deep scratches covering majority of back surface"
    },
    {
      "type": "wear",
      "severity": "severe",
      "location": "band links",
      "description": "Heavy oxidation and discoloration on metal band"
    }
  ],
  "confidence": 90
}
```

**Failure Modes & Recovery**:

- **Insufficient Photos**: Note in `notes`, reduce `confidence`, request additional photos in response
- **Unclear Defects**: Mark severity as estimate, note uncertainty in `description`
- **Contradictory Signals**: Prioritize visual evidence over user description
- **Photo Quality Issues**: Flag in `notes`, reduce confidence, may need human review

**Combine with**:
- Visual analysis (scratches, dents, dirt)
- User description (as corroboration only)
- Category norms (e.g., books naturally show wear)
- Historical data (if item previously assessed)

### 2. Marketplace Data Integration (`services/marketplace/`)

#### eBay Browse API (Primary)
```python
# GET /api/v1/marketplace/ebay/sold?query={model}&category={cat}
{
  "query": "AirPods Pro 2nd Gen",
  "category": "Consumer Electronics",
  "filters": {
    "condition": "Used - Good",
    "sold_within_days": 90
  }
}

# Returns:
{
  "listings": [
    {
      "title": "Apple AirPods Pro 2nd Gen",
      "price": 118.50,
      "condition": "Pre-Owned",
      "sold_date": "2026-01-15",
      "shipping": 0
    },
    ...
  ],
  "stats": {
    "count": 312,
    "median": 118.00,
    "mean": 121.30,
    "std_dev": 14.20,
    "percentiles": {
      "p25": 105,
      "p50": 118,
      "p75": 132
    }
  }
}
```

**Implementation**:
- Use eBay Browse API `search` endpoint with `sold` filter
- Last 90 days sold items
- Filter by condition match
- Compute statistics (median, mean, percentiles)
- Weight recent sales higher (exponential decay)

#### Amazon Product Advertising API
- Fetch new retail price (ceiling)
- Used/renewed pricing if available
- Prime shipping cost

#### Google Shopping (SerpAPI)
- Aggregate pricing across all retailers
- Used/refurbished marketplaces

#### Other Sources (Phase 2)
- Mercari (web scraping + API if available)
- Etsy (for vintage/handmade)
- PriceCharting (for collectibles/games)
- Swappa (for phones/electronics)

### 3. Fair Market Value Engine (`services/pricing/fmv.py`)

**Weighted Algorithm**:
```python
FMV = (
  eBay_Sold_Median * 0.45 +
  eBay_Sold_Mean * 0.10 +
  Amazon_Used * 0.20 +
  Google_Shopping_Avg * 0.15 +
  Other_Sold_Avg * 0.10
)
```

**Outlier Filtering**:
- IQR method: remove prices outside 1.5x IQR
- Remove listings with abnormal shipping costs
- Flag suspicious patterns (e.g., all $1 sales)

**Recency Weighting**:
- Sales <30 days: weight 1.0
- 30-60 days: weight 0.8
- 60-90 days: weight 0.5

**Output**:
```python
{
  "fmv": 118.00,
  "confidence": 85,
  "data_quality": "High",  # High/Medium/Low
  "sources": {
    "ebay_sold": { "count": 312, "median": 118 },
    "amazon_used": { "avg": 125 },
    "google_shopping": { "avg": 122 }
  },
  "range": { "low": 95, "high": 140 }
}
```

### 4. Pricing Engine (`services/pricing/offer.py`)

**Formula**:
```
Offer = FMV × Condition_Multiplier × Category_Margin × Dynamic_Adjustments
```

**Category Margins** (Admin Configurable):
```python
CATEGORY_MARGINS = {
  "Consumer Electronics": 0.60,     # Buy at 60% of FMV
  "Gaming": 0.60,
  "Phones & Tablets": 0.65,         # Higher velocity
  "Clothing & Fashion": 0.45,       # Higher risk
  "Collectibles & Vintage": 0.50,
  "Books & Media": 0.35,            # Low value
  "Small Appliances": 0.50,
  "Tools & Equipment": 0.55
}
```

**Dynamic Adjustments**:
1. **Inventory Saturation**: If we have >5 of same model, reduce offer 5-15%
2. **Seasonal Demand**: Holiday bump for gift categories (+5-10%)
3. **Market Velocity**: If item sells <7 days on eBay, add premium (+5%)
4. **User Trust Score**: Repeat clean sellers get 3-5% loyalty bonus
5. **Jake Bucks Bonus**: Store credit adds 10-15% to offer

**Example Calculation**:
```python
# AirPods Pro 2nd Gen, Good condition
FMV = $118
Condition = Good = 0.80
Category_Margin = Electronics = 0.60
Velocity_Bonus = Fast-seller = 1.05

Base_Offer = 118 × 0.80 × 0.60 = $56.64
With_Velocity = 56.64 × 1.05 = $59.47
Final_Offer = $59 (rounded)
```

**Safety Checks**:
- Minimum floor: $5 per item
- Maximum cap: Category-specific (e.g., $2000 for electronics)
- Variance check: If offer differs >30% from eBay median, auto-escalate
- Daily spending limit: Pause if exceeds configured budget

### 5. Confidence Scoring (`services/pricing/confidence.py`)

**Composite Score (0-100)**:
- **Vision Certainty** (40%): How confident is AI in identification?
- **Text Corroboration** (15%): Does user description match vision?
- **Database Match** (25%): Found in product databases?
- **Condition Reliability** (20%): Clear photos, consistent condition assessment?

**Action Thresholds**:
- **≥80**: Auto-price, no escalation
- **60-79**: Flag if value >$100, otherwise auto-price
- **<60**: Auto-escalate to human review

### 6. Caching & Data Warehouse (`services/cache/`)

**Redis Caching Strategy**:
- **Popular items** (>10 lookups/day): Refresh every 4-6 hours
- **Mid-frequency** (2-10/day): Cache 24 hours
- **Rare items**: No cache, fresh lookup, store result

**PostgreSQL Data Warehouse**:
Store every marketplace lookup for:
- Trend detection (price movements over time)
- API cost reduction (historical reference)
- Model training data

Schema:
```sql
CREATE TABLE marketplace_lookups (
  id UUID PRIMARY KEY,
  product_identifier TEXT,
  category TEXT,
  source TEXT, -- 'ebay', 'amazon', etc.
  query TEXT,
  results JSONB,
  stats JSONB,
  fetched_at TIMESTAMPTZ,
  INDEX (product_identifier, fetched_at),
  INDEX (category, fetched_at)
);
```

### 7. API Endpoints

```python
# Vision identification
POST /api/v1/vision/identify
Body: { photos: string[], description?: string }

# Marketplace research
POST /api/v1/marketplace/research
Body: { product: {...}, category: string }

# FMV calculation
POST /api/v1/pricing/fmv
Body: { marketplace_data: {...} }

# Generate offer
POST /api/v1/pricing/offer
Body: { fmv: number, condition: string, category: string, user_id?: string }

# Confidence check
GET /api/v1/pricing/confidence/:offer_id
```

### 8. Model Fallback System

**Primary → Secondary Chain**:
1. Try **Claude 3.5 Sonnet** (best vision, highest cost)
2. If fails or low confidence, try **GPT-4o** (good balance)
3. If still fails, try **Gemini Pro Vision** (fast, cheap)

Track per-category performance:
- If Claude fails on jewelry 3x, try GPT-4o first next time
- Auto-adjust routing based on success rates

**Cost Optimization**:
- Second model call costs $0.03-0.10
- Far cheaper than human review ($2-5)
- Eval framework logs accuracy per model per category

### 9. Training Loop (Future)

**Data Collection**:
Every accepted transaction builds proprietary dataset:
- Photos → Correct identification (human verified)
- Condition assessment → Actual item condition at receipt
- Offer → User acceptance (price elasticity data)

**Use Cases**:
- Fine-tune condition models (fewer API calls)
- Train proprietary identification model
- Improve Jake commentary engagement

## INTEGRATION POINTS

**Consumes**:
- User-submitted photos (S3 URLs from Agent 4)
- Admin configuration (margin targets, from Agent 5)

**Provides to**:
- Agent 1 (Frontend): Offer data, confidence, market context
- Agent 3 (Jake Voice): Identification, FMV, offer amount for script generation
- Agent 4 (Backend): Structured offer data to persist
- Agent 5 (Admin): Accuracy metrics, confidence distributions

## CONFIGURATION (Admin-Settable)

Store in `pricing_config` table:
```json
{
  "category_margins": { ... },
  "condition_multipliers": { ... },
  "confidence_thresholds": { ... },
  "min_offer": 5,
  "max_offer_by_category": { ... },
  "daily_spending_limit": 10000,
  "inventory_saturation_limits": { ... },
  "seasonal_adjustments": { ... }
}
```

## QUALITY STANDARDS

1. **Accuracy**: >85% correct identification (validated by receipts)
2. **Latency**: Vision + marketplace + pricing <10s end-to-end
3. **API Costs**: <$0.25 per offer (target $0.15)
4. **Cache Hit Rate**: >50% for popular categories
5. **Confidence**: >80% auto-price rate

## FILE STRUCTURE

```
services/
├── vision/
│   ├── identify.py              # Vision API wrapper
│   ├── condition.py             # Condition assessment
│   └── enrichment.py            # Product database lookup
├── marketplace/
│   ├── ebay.py                  # eBay Browse API
│   ├── amazon.py                # Amazon Product Advertising
│   ├── google_shopping.py      # SerpAPI wrapper
│   └── aggregator.py            # Multi-source synthesis
├── pricing/
│   ├── fmv.py                   # Fair market value engine
│   ├── offer.py                 # Offer calculation
│   ├── confidence.py            # Confidence scoring
│   └── adjustments.py           # Dynamic adjustments
├── cache/
│   ├── redis_client.py          # Redis wrapper
│   └── warehouse.py             # PostgreSQL data warehouse
└── models/
    ├── fallback.py              # Multi-model routing
    └── evaluation.py            # Accuracy tracking
```

## TESTING

1. **Vision Accuracy**: 100-item test set with ground truth
2. **Marketplace**: Verify eBay/Amazon data matches manual checks
3. **FMV**: Compare calculated FMV to actual resale prices
4. **Offer Acceptance**: Track acceptance rate vs. offer level
5. **Latency**: p95 latency <12s for full pipeline

## SUCCESS CRITERIA

- [ ] Vision identifies 85%+ of items correctly
- [ ] Marketplace data fetches from 3+ sources
- [ ] FMV calculation matches manual research within 10%
- [ ] Offer engine applies category margins correctly
- [ ] Confidence scoring triggers escalation appropriately
- [ ] Caching reduces API costs by 40%+
- [ ] All endpoints respond <10s
- [ ] Admin can adjust margins via config API

## NOTES

- **eBay is king**: Sold listings are ground truth, prioritize
- **Confidence is critical**: Better to escalate than give bad price
- **Cache aggressively**: APIs are expensive, data changes slowly
- **Track everything**: Every lookup is training data
- **Fail gracefully**: Always have fallback model + human escalation

---

**PROCEED AUTONOMOUSLY. BUILD THE PRICING BRAIN.**
