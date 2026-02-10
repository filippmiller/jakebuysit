# TODO for Next Agent — Pipeline Completion

**Last Updated:** 2026-02-10 15:45 UTC
**Current Status:** 95% Complete - ONE blocker remaining

---

## 🚨 CRITICAL BLOCKER (Must Fix First)

### Image URL Network Issue

**Problem:**
Claude API cannot download images from external URLs when called from VPS.

**Error:**
```
Error code: 400 - Unable to download the file. Please verify the URL and try again.
```

**Impact:**
- Vision identification fails
- All offers escalate with `pipeline_error`
- Complete AI pipeline blocked

**Root Cause:**
VPS network configuration prevents Claude API from accessing external image hosts (Unsplash, Wikipedia, placeholder.com all tested and failed).

---

## ✅ SOLUTION: Implement Base64 Images (1-2 hours)

### Step 1: Update Frontend to Convert Photos to Base64

**File:** `web/components/CameraCapture.tsx`

Add helper function:
```typescript
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

Update upload handler:
```typescript
// Find the handleSubmit or similar function
async function handleSubmit() {
  // Convert all photos to base64
  const base64Photos = await Promise.all(
    photos.map(photo => fileToBase64(photo))
  );

  // Send to backend
  const response = await fetch('/api/v1/offers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      photos: base64Photos.map(data => ({
        data,
        type: 'base64',
        mimeType: 'image/jpeg'
      })),
      userDescription: description
    })
  });
}
```

---

### Step 2: Update Backend to Accept Base64

**File:** `backend/src/api/routes/offers.ts`

Update schema (if using Zod):
```typescript
const createOfferSchema = z.object({
  photos: z.array(z.object({
    data: z.string(), // base64 string OR url
    type: z.enum(['base64', 'url']),
    mimeType: z.string().optional()
  })),
  userDescription: z.string().optional()
});
```

Update offer creation to handle both types:
```typescript
const { photos, userDescription } = validateBody(createOfferSchema, request.body);

// Pass to orchestrator (will handle base64)
const { offerId } = await offerOrchestrator.createOffer(
  userId,
  photos, // now contains {data, type, mimeType} objects
  userDescription
);
```

---

### Step 3: Update Vision Service to Handle Base64

**File:** `/opt/jakebuysit/services/vision/identify.py` (on VPS via SSH)

Update method signature and logic:
```python
async def identify_item(
    self,
    photos: List[Dict[str, str]],  # Changed from List[str]
    user_description: Optional[str] = None
) -> VisionResult:
    """
    Identify item from photos.

    Args:
        photos: List of photo objects with format:
            [{"data": "base64string", "type": "base64", "mimeType": "image/jpeg"}]
            OR
            [{"data": "https://...", "type": "url"}]
    """

    # Build image content for Claude API
    image_content = []
    for photo in photos:
        if photo["type"] == "base64":
            image_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": photo.get("mimeType", "image/jpeg"),
                    "data": photo["data"]
                }
            })
        else:  # url type (keep for backward compatibility)
            image_content.append({
                "type": "image",
                "source": {
                    "type": "url",
                    "url": photo["data"]
                }
            })

    # Rest of the method stays the same
    response = await self.client.messages.create(
        model=self.model,
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": image_content + [{"type": "text", "text": prompt}]
        }]
    )
```

**File:** `/opt/jakebuysit/services/integration/router.py` (on VPS)

Update request model:
```python
class PhotoData(BaseModel):
    data: str  # base64 string or URL
    type: str  # "base64" or "url"
    mimeType: Optional[str] = "image/jpeg"

class IdentifyRequest(BaseModel):
    photos: List[PhotoData]
    user_description: Optional[str] = None
```

---

### Step 4: Rebuild and Test

```bash
# SSH to VPS
ssh root@89.167.42.128

# Rebuild pricing-api with code changes
cd /opt/jakebuysit
docker compose -f docker-compose.host.yml up -d --build pricing-api

# Test the pipeline
# (Upload a photo via frontend or use curl with base64)
```

---

## 🧪 TESTING CHECKLIST

After implementing base64 images:

- [ ] Frontend: Take photo → converts to base64 → sends to backend
- [ ] Backend: Receives base64 → passes to Vision API
- [ ] Vision API: Processes base64 → returns identification
- [ ] Marketplace: Researches product → returns prices
- [ ] Pricing: Calculates offer → returns amount
- [ ] Jake Voice: Generates script (if ELEVENLABS_API_KEY set)
- [ ] Offer Status: Changes from `processing` → `ready` (NOT `escalated`)

**Test command:**
```bash
# After frontend changes, submit real offer via UI
# Then check offer status:
curl http://89.167.42.128:8082/api/v1/offers/{OFFER_ID} | jq '{status, processingStage, escalated, item}'

# Should show:
# status: "ready"
# processingStage: "ready"
# escalated: false
# item: {...actual product data...}
```

---

## 📋 ALTERNATIVE SOLUTIONS (If Base64 Fails)

### Plan B: AWS S3 Storage (4-6 hours)

1. Create S3 bucket: `jakebuysit-photos-prod`
2. Configure CORS and public read access
3. Add AWS SDK to backend
4. Upload photos to S3 on offer creation
5. Pass S3 URLs to Vision API

**Environment variables needed:**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=jakebuysit-photos-prod
```

### Plan C: VPS Network Debugging (2-4 hours)

```bash
ssh root@89.167.42.128

# Test outbound HTTPS
curl -I https://images.unsplash.com/photo-1611791483735-4ead0ee4e06c

# Check DNS
nslookup images.unsplash.com

# Check firewall
ufw status verbose
iptables -L -n

# Check proxy settings
env | grep -i proxy
```

---

## 📚 REFERENCE DOCUMENTATION

**Read these first:**
- `.claude/sessions/2026-02-10-api-key-configuration.md` — Full context on what was tried and why
- `.claude/agent-log.md` — Last entry (2026-02-10 15:30) — Summary and next steps
- `DEPLOYMENT.md` — Section "✅ ACTUAL DEPLOYMENT COMPLETED" — VPS setup details

**API Key is configured:**
- Location: `/opt/jakebuysit/docker-compose.host.yml` on VPS
- Value: `sk-ant-api03-REDACTED`

**Model is configured:**
- Name: `claude-sonnet-4-20250514`
- Location: `services/vision/identify.py` line 15

**Services running:**
- Frontend: http://89.167.42.128:3013/
- Backend: http://89.167.42.128:8082/health
- Python AI: http://89.167.42.128:8001/health

---

## 🎯 SUCCESS CRITERIA

Pipeline is complete when:

1. ✅ User can submit offer with photos via frontend
2. ✅ Photos are converted to base64 automatically
3. ✅ Vision API successfully identifies product
4. ✅ Marketplace research returns prices
5. ✅ Pricing calculation completes
6. ✅ Offer reaches `ready` status (not `escalated`)
7. ✅ User can view offer with pricing and product details

**Expected completion time:** 1-2 hours for base64 implementation + testing

---

## 💡 TIPS FOR NEXT AGENT

1. **Start with base64** - it's the fastest path to working pipeline
2. **Test incrementally** - verify each step (frontend → backend → Vision → complete)
3. **Use existing test user** - `testprod2@test.com` / `TestPass123!`
4. **Check logs if issues** - `docker logs jakebuysit-pricing-api --tail 50`
5. **Don't rebuild everything** - only pricing-api needs rebuild for Vision changes

**You got this! The hard part is done (API key, model, deployment). Just need to fix image delivery.** 🚀

---
