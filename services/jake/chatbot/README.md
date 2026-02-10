# Jake AI Chatbot - Real-Time Conversational Interface

## Overview

The Jake AI Chatbot provides a WebSocket-based real-time conversational interface where users can ask questions about their offers. Jake responds in character with his western personality, explaining pricing decisions, condition assessments, and marketplace research.

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────────┐
│  Frontend       │ ←─────────────────→ │  Jake Service        │
│  (Next.js)      │                     │  (Fastify + WS)      │
└─────────────────┘                     └──────────────────────┘
                                                 │
                                                 ├─→ conversation.ts (Claude API)
                                                 ├─→ context.ts (Offer data)
                                                 └─→ Backend API (Offer details)
```

## Modules

### `conversation.ts` - Conversation Engine

**Purpose**: Manages chat sessions and generates Jake's responses using Claude API.

**Key Features**:
- Maintains conversation history per offer (up to 20 messages)
- Uses Claude 3.5 Sonnet for natural language responses
- Injects Jake's character personality from Agent 3 prompts
- Determines animation states based on message tone
- Context-aware responses reference specific offer details

**Main Class**: `ConversationManager`

```typescript
// Generate initial greeting
const greeting = await conversationManager.generateGreeting(offerId, context);

// Generate response to user question
const response = await conversationManager.generateResponse(offerId, userMessage, context);

// Clear conversation history
conversationManager.clearHistory(offerId);
```

### `context.ts` - Context Provider

**Purpose**: Fetches and structures offer data to provide conversational context.

**Key Features**:
- Retrieves offer details from Backend API
- Transforms database structure into conversation-friendly format
- Validates offer state (must have pricing data)
- Extracts features, damage, and condition notes

**Main Class**: `ContextProvider`

```typescript
// Get offer context for conversation
const context = await contextProvider.getOfferContext(offerId);

// Validate offer is ready for chat
const isValid = await contextProvider.validateOfferForChat(offerId);
```

### `chat-routes.ts` - WebSocket API

**Purpose**: Exposes WebSocket endpoint for real-time chat and REST endpoints for management.

**Endpoints**:

#### WebSocket: `/ws/chat/:offerId`
Real-time bidirectional chat connection.

**Client → Server Messages**:
```json
{
  "type": "message",
  "data": {
    "message": "How did you calculate this price?"
  }
}
```

**Server → Client Messages**:
```json
{
  "type": "greeting|message|error",
  "data": {
    "message": "Howdy! I checked 127 sold listings...",
    "animation_state": "explaining",
    "timestamp": "2026-02-10T12:00:00Z"
  }
}
```

#### REST: `GET /api/v1/chat/:offerId/available`
Check if chat is available for an offer.

**Response**:
```json
{
  "available": true,
  "offerId": "uuid"
}
```

#### REST: `DELETE /api/v1/chat/:offerId/history`
Clear conversation history for an offer.

## Jake's Personality

Based on `agent-prompts/AGENT-3-JAKE-VOICE-CHARACTER.md`:

### Voice Characteristics
- **Drawl**: "gettin'", "ain't", "lemme", "y'all"
- **Contractions**: "gonna", "wanna", "gotta"
- **Signature phrases**:
  - "Take it or leave it, partner"
  - "Now THAT's what I'm talkin' about"
  - "I've seen a lotta these come through here"

### Tone Adaptation
- **High-value items**: Excited, enthusiastic
- **Standard offers**: Confident, friendly
- **Low-value items**: Sympathetic, honest, not condescending
- **Complex explanations**: Patient, informative

### What Jake NEVER Says
- Corporate speak ("We appreciate your business")
- Generic AI responses ("As an AI, I cannot...")
- Technical jargon ("Our algorithm determined")
- Condescending language

## Animation States

Jake's visual state syncs with conversation tone:

| Animation State | When Used | Triggers |
|----------------|-----------|----------|
| `thinking` | Processing question | Default for unknown |
| `explaining` | Breaking down pricing | Keywords: "calculated", "comparables", "checked" |
| `friendly` | Casual conversation | Default friendly responses |
| `excited` | High-value offers | Positive language, high offer ratio |
| `sympathetic` | Low offers | Low offer ratio, apologetic tone |
| `confident` | Standard offers | Keywords: "confident", "good deal", "take it" |

## Context Injection

Every conversation includes:

```typescript
{
  item_name: "Apple AirPods Pro 2nd Gen",
  brand: "Apple",
  category: "Consumer Electronics",
  condition: "Good",
  offer_amount: 72,
  fmv: 118,
  confidence: 87,
  comparables: 312,
  features: ["Noise Cancellation", "Wireless Charging"],
  damage: ["Minor scratches on case"]
}
```

This allows Jake to reference specific details:
- "I checked 312 sold listings"
- "Given those scratches on the case..."
- "Noise cancellation adds value, but..."

## Example Conversations

### Pricing Question
**User**: "How did you calculate this price?"

**Jake**: "Good question, partner! I checked 127 sold listings on eBay for your AirPods Pro. Market value's sittin' at $118, but I gotta factor in those scratches on the case. Knocked about 30% off for condition, which gets us to $72. Fair and square."

**Animation**: `explaining`

### Condition Question
**User**: "Are the scratches really that bad?"

**Jake**: "Lemme be straight with ya - they ain't terrible, just surface wear. But buyers'll see 'em and want a discount. I'm givin' ya a fair price considerin' what I can resell 'em for. That's how this business works."

**Animation**: `sympathetic`

### High-Value Excitement
**User**: "Is this a good deal?"

**Jake**: "Are you kiddin'? For a mint-condition MacBook Pro? I'm givin' ya $850, that's 71% of market value! Most shops'd do 40-50%. Take it before I change my mind, partner!"

**Animation**: `excited`

## Integration with Backend

The chatbot integrates with the Backend API to fetch offer details:

```typescript
// Fetch offer data
GET http://localhost:3001/api/v1/offers/:offerId

// Response includes:
{
  id: "uuid",
  item_brand: "Apple",
  item_model: "AirPods Pro",
  item_condition: "Good",
  offer_amount: 72,
  fmv: 118,
  confidence_score: 87,
  comparables_count: 312,
  item_features: {...},
  item_damage: {...}
}
```

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
AGENT4_URL=http://localhost:3001  # Backend API URL

# Optional
JAKE_PORT=3002
JAKE_HOST=localhost
LOG_LEVEL=info
```

## Testing the Chatbot

### 1. Start Jake Service
```bash
cd services/jake
npm start
```

### 2. Test WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3002/ws/chat/your-offer-id');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Jake:', message);
};

// Send a message
ws.send(JSON.stringify({
  type: 'message',
  data: { message: 'How did you calculate this price?' }
}));
```

### 3. Test REST Endpoints
```bash
# Check availability
curl http://localhost:3002/api/v1/chat/YOUR_OFFER_ID/available

# Clear history
curl -X DELETE http://localhost:3002/api/v1/chat/YOUR_OFFER_ID/history
```

## Common Questions Jake Can Answer

1. **Pricing Explanation**
   - "How did you calculate this price?"
   - "Why is the offer so low?"
   - "Can you explain the pricing?"

2. **Condition Assessment**
   - "What's wrong with the condition?"
   - "Are the scratches really that bad?"
   - "Why does condition matter?"

3. **Market Research**
   - "How many comparables did you check?"
   - "What's the market value?"
   - "Where do you get your pricing data?"

4. **Features & Damage**
   - "Do these features add value?"
   - "How much did you deduct for damage?"
   - "What about the missing accessories?"

5. **General Questions**
   - "Is this a good deal?"
   - "What happens next?"
   - "How long is the offer valid?"

## Error Handling

### Invalid Offer ID
```json
{
  "type": "error",
  "data": {
    "error": "Offer not found or not ready for chat",
    "timestamp": "2026-02-10T12:00:00Z"
  }
}
```

### Processing Error
```json
{
  "type": "error",
  "data": {
    "error": "Failed to process message",
    "timestamp": "2026-02-10T12:00:00Z"
  }
}
```

### Backend Unavailable
The context provider will throw an error if the Backend API is unreachable. The WebSocket connection will send an error message and close.

## Performance Considerations

- **Response Time**: Claude API typically responds in 1-3 seconds
- **History Limit**: 20 messages per conversation (prevents token overflow)
- **Concurrent Connections**: Fastify handles thousands of concurrent WebSocket connections
- **Memory**: Each active conversation consumes ~10KB of memory

## Future Enhancements

- [ ] Streaming responses (word-by-word) for faster perceived latency
- [ ] Voice synthesis integration (speak Jake's responses)
- [ ] Multi-language support
- [ ] Conversation analytics (most asked questions, satisfaction ratings)
- [ ] Suggested questions based on offer type
- [ ] History persistence (database storage)
- [ ] User authentication/authorization
