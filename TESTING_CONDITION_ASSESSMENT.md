# Testing Guide: AI-Powered Condition Assessment

## Overview
This guide helps validate the condition assessment implementation (pawn-yhc).

## Prerequisites

1. **Anthropic API Key**: Ensure `ANTHROPIC_API_KEY` is set in environment
2. **Python Environment**: Navigate to `services/vision/` directory
3. **Dependencies**: Install required packages (anthropic, structlog, pydantic, fastapi)

## Running the Test Suite

### Quick Test
```bash
cd services/vision
python test_condition_assessment.py
```

This runs 3 automated test cases:
1. **Excellent**: New iPhone (expects empty defects array, high confidence)
2. **Good**: Used Apple Watch (expects 1-3 minor defects)
3. **Fair**: Worn headphones (expects multiple defects or moderate severity)

### Expected Output

Each test displays:
- ✓ Identification successful
- Category, Brand, Model
- Legacy Condition field
- Overall Confidence score
- **CONDITION ASSESSMENT**:
  - Grade (Excellent/Good/Fair/Poor)
  - Confidence (0-100)
  - Notes (human-readable reasoning)
  - Defects count
  - Detailed defect list (type, severity, location, description)
- Full JSON response

### Success Criteria

✅ **Pass if**:
- All 3 tests complete without errors
- `condition_assessment` field is populated
- Defects array structure is valid (empty array for Excellent, populated for Good/Fair)
- Severity values are: "minor", "moderate", or "severe"
- Location strings are specific (not just "item")
- Confidence scores >70% for clear photos

❌ **Fail if**:
- `condition_assessment` is None/null
- Defects missing required fields (type, severity, location)
- Severity values invalid (e.g., "high", "low")
- Confidence scores <50% for clear photos
- Empty notes field
- Python errors or JSON parsing failures

## Manual Testing with Custom Images

### Option 1: Public URLs
Edit `test_condition_assessment.py` and replace URLs in test cases:

```python
test_cases = [
    {
        "name": "My Test Item",
        "photos": [
            "https://your-image-url-1.jpg",
            "https://your-image-url-2.jpg"
        ],
        "description": "Optional description"
    }
]
```

### Option 2: API Testing (requires running service)

Start the vision service:
```bash
cd services/vision
uvicorn main:app --reload --port 8002
```

Test with curl:
```bash
curl -X POST http://localhost:8002/api/v1/vision/identify \
  -H "Content-Type: application/json" \
  -d '{
    "photos": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ],
    "user_description": "Used iPhone 12, good condition"
  }'
```

## Validation Checklist

### Data Structure Validation
- [ ] `condition_assessment` object present
- [ ] `grade` is one of: Excellent, Good, Fair, Poor
- [ ] `notes` is non-empty string (1-2 sentences)
- [ ] `defects` is an array (empty or populated)
- [ ] Each defect has: type, severity, location
- [ ] `confidence` is integer 0-100

### Defect Detection Validation
- [ ] **Excellent grade**: Empty defects array
- [ ] **Good grade**: 1-3 minor defects OR no defects with light wear noted
- [ ] **Fair grade**: 4+ defects OR some moderate severity
- [ ] **Poor grade**: Severe defects present (cracks, heavy damage)

### Defect Field Validation
- [ ] **Type** is one of: scratch, dent, wear, crack, discoloration, stain, missing_parts
- [ ] **Severity** is one of: minor, moderate, severe
- [ ] **Location** is specific (e.g., "upper right corner" not "front")
- [ ] **Description** provides context (optional field)

### Confidence Calibration
- [ ] High-quality clear photos → confidence >85%
- [ ] Good photos, some angles missing → confidence 70-85%
- [ ] Limited photos, some blur → confidence 50-70%
- [ ] Poor quality photos → confidence <50%

## Sample Expected Outputs

### Excellent Condition (New iPhone)
```json
{
  "condition_assessment": {
    "grade": "Excellent",
    "notes": "Appears like new with no visible defects. Pristine condition.",
    "defects": [],
    "confidence": 92
  }
}
```

### Good Condition (Used Watch)
```json
{
  "condition_assessment": {
    "grade": "Good",
    "notes": "Light wear consistent with normal use. Minor scratches but fully functional.",
    "defects": [
      {
        "type": "scratch",
        "severity": "minor",
        "location": "case back, near lugs",
        "description": "2-3mm surface scratches from band removal"
      },
      {
        "type": "wear",
        "severity": "minor",
        "location": "band clasp",
        "description": "Light polishing from repeated opening"
      }
    ],
    "confidence": 85
  }
}
```

### Fair Condition (Worn Headphones)
```json
{
  "condition_assessment": {
    "grade": "Fair",
    "notes": "Significant wear from regular use. Multiple cosmetic issues but appears functional.",
    "defects": [
      {
        "type": "wear",
        "severity": "moderate",
        "location": "ear cups padding",
        "description": "Padding compressed and worn, some cracking visible"
      },
      {
        "type": "scratch",
        "severity": "moderate",
        "location": "headband, top center",
        "description": "Multiple scratches, 8-12mm in length"
      },
      {
        "type": "discoloration",
        "severity": "minor",
        "location": "cable near connector",
        "description": "Slight yellowing from age"
      }
    ],
    "confidence": 78
  }
}
```

### Poor Condition (Damaged Laptop)
```json
{
  "condition_assessment": {
    "grade": "Poor",
    "notes": "Heavy damage with questionable functionality. Multiple severe issues.",
    "defects": [
      {
        "type": "crack",
        "severity": "severe",
        "location": "screen, upper right quadrant",
        "description": "Spider web crack pattern across 20% of display area"
      },
      {
        "type": "dent",
        "severity": "severe",
        "location": "bottom panel, left corner",
        "description": "Deep impact dent, approximately 15mm diameter"
      },
      {
        "type": "missing_parts",
        "severity": "moderate",
        "location": "bottom panel",
        "description": "Two rubber feet missing, one screw slot empty"
      }
    ],
    "confidence": 88
  }
}
```

## Common Issues

### Issue: `condition_assessment` is None
**Cause**: LLM didn't return condition assessment in response
**Fix**: Check prompt formatting, verify API response, increase temperature slightly

### Issue: Defects array has invalid severity
**Cause**: LLM used different terminology
**Fix**: Update prompt examples, add stricter validation in parser

### Issue: Low confidence scores (<50%) on clear photos
**Cause**: Photo quality misclassification or conservative scoring
**Fix**: Adjust confidence scoring guidelines in prompt

### Issue: Hallucinated defects
**Cause**: LLM being overly cautious or misinterpreting photos
**Fix**: Strengthen "don't invent defects" warning in prompt, review examples

## Next Steps After Testing

1. ✅ **If tests pass**: Proceed to backend integration (pawn-act)
2. ❌ **If tests fail**: Review session notes, adjust prompt, re-test
3. 📊 **Track accuracy**: Log real vs predicted conditions for calibration
4. 🎨 **Frontend**: Build defect display UI component
5. 💰 **Pricing**: Verify offer calculation uses `condition_assessment.grade`

## Related Documentation

- **Session Notes**: `.claude/sessions/2026-02-10-condition-assessment.md`
- **Agent 2 Prompt**: `agent-prompts/AGENT-2-AI-VISION-PRICING.md` (Stage 3)
- **Models**: `services/vision/models.py` (Defect, ConditionAssessment)
- **Implementation**: `services/vision/identify.py` (enhanced prompt)

## Reporting Issues

If you encounter issues:
1. Capture full test output (including JSON response)
2. Note which test case failed
3. Check logs for API errors
4. Review prompt vs actual LLM response
5. Document in `.claude/sessions/` with findings

---

**Last Updated**: 2026-02-10
**Issue**: pawn-yhc (closed)
**Next Issue**: pawn-act (backend API extensions)
