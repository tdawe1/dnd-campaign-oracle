# Campaign Oracle API Reference

Complete REST API documentation for Campaign Oracle.

**Base URL**: `http://localhost:3001/api`

## Authentication

All API routes (except `/api/auth/*`) require authentication via Better Auth session cookies.

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sign-in/social` | OAuth sign-in (Google) |
| POST | `/api/auth/sign-out` | Sign out |
| GET | `/api/auth/session` | Get current session |

### Protected Routes

All routes below require a valid session cookie (automatically handled by the frontend).

---

## Campaigns

### GET `/api/campaigns`

List all campaigns for the authenticated user.

**Response**:
```json
[
  {
    "id": "uuid",
    "dmUserId": "string",
    "title": "string",
    "description": "string | null",
    "currentSessionDate": "date | null",
    "isActive": true,
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "characters": [...],
    "sessionLogs": [...]
  }
]
```

### GET `/api/campaigns/:id`

Get a specific campaign with all related data.

**Response**: Campaign object with `characters`, `sessionLogs`, `quests`, `npcs`, `members`, and `items`.

### POST `/api/campaigns`

Create a new campaign.

**Request Body**:
```json
{
  "title": "string (required, 1-100 chars)",
  "description": "string (optional)"
}
```

### PATCH `/api/campaigns/:id`

Update a campaign.

**Request Body**:
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "isActive": "boolean (optional)",
  "currentSessionDate": "string (optional)"
}
```

### DELETE `/api/campaigns/:id`

Delete a campaign (cascades to all related data).

---

## Characters

### GET `/api/characters?campaignId=<uuid>`

List active characters for a campaign.

**Query Parameters**:
- `campaignId` (required): Campaign UUID

### POST `/api/characters`

Create a new character.

**Request Body**:
```json
{
  "campaignId": "uuid (required)",
  "name": "string (required)",
  "playerName": "string (optional)",
  "characterClass": "string (optional)",
  "level": "number (optional, default: 1)",
  "hp": "number (optional)",
  "maxHp": "number (optional)",
  "ac": "number (optional)",
  "notes": "string (optional)"
}
```

### PATCH `/api/characters/:id`

Update a character. Same body as POST, all fields optional.

### DELETE `/api/characters/:id`

Soft-delete a character (sets `isActive: false`).

---

## Quests

### GET `/api/quests?campaignId=<uuid>`

List quests for a campaign.

### GET `/api/quests/:id`

Get a single quest.

### POST `/api/quests`

Create a quest.

**Request Body**:
```json
{
  "campaignId": "uuid (required)",
  "title": "string (required)",
  "questType": "Main | Side | Rumor (default: Side)",
  "description": "string (optional)",
  "source": "string (optional)",
  "status": "active | completed | failed (default: active)"
}
```

### PATCH `/api/quests/:id`

Update a quest.

### DELETE `/api/quests/:id`

Delete a quest.

---

## Sessions

### GET `/api/sessions?campaignId=<uuid>`

List session logs for a campaign (ordered by date, newest first).

**Response** includes `combat` and `loot` arrays for each session.

### GET `/api/sessions/:id`

Get a single session with combat and loot data.

### POST `/api/sessions`

Create a session log with optional combat/loot.

**Request Body**:
```json
{
  "campaignId": "uuid (required)",
  "title": "string (required)",
  "sessionDate": "string (required, YYYY-MM-DD)",
  "sessionNumber": "number (optional)",
  "location": "string (optional)",
  "journalEntry": "string (optional)",
  "transcript": "string (optional)",
  "combat": [
    { "enemyName": "string", "result": "string (optional)" }
  ],
  "loot": [
    { "itemName": "string", "effect": "string (optional)" }
  ]
}
```

---

## NPCs

### GET `/api/npcs?campaignId=<uuid>`

List NPCs for a campaign.

### GET `/api/npcs/:id`

Get a single NPC.

### POST `/api/npcs`

Create an NPC.

**Request Body**:
```json
{
  "campaignId": "uuid (required)",
  "name": "string (required)",
  "location": "string (optional)",
  "notes": "string (optional)",
  "imageUrl": "string (optional)"
}
```

### PATCH `/api/npcs/:id`

Update an NPC.

### DELETE `/api/npcs/:id`

Delete an NPC.

---

## Items

### GET `/api/campaigns/:campaignId/items`

List items for a campaign.

### POST `/api/campaigns/:campaignId/items`

Create an item.

**Request Body**:
```json
{
  "name": "string (required, 1-100 chars)",
  "description": "string (optional)",
  "category": "weapon | armor | consumable | wondrous | treasure | misc (optional)",
  "rarity": "common | uncommon | rare | very_rare | legendary | artifact (optional)",
  "quantity": "number (optional, default: 1)",
  "characterId": "uuid | null (optional)",
  "isEquipped": "boolean (optional)",
  "notes": "string (optional)",
  "imageUrl": "url (optional)"
}
```

### PATCH `/api/items/:id`

Update an item.

### DELETE `/api/items/:id`

Delete an item.

---

## LLM / Chat

### GET `/api/llm/health`

Check LLM backend availability.

**Response**:
```json
{
  "ollama": true,
  "openai": false,
  "anthropic": false,
  "gemini": true,
  "activeBackend": "ollama"
}
```

### POST `/api/llm/chat`

Send a chat message to the AI Oracle.

**Request Body**:
```json
{
  "model": "local/llama3.2 | gemini/gemini-2.0-flash | openai/gpt-4o",
  "messages": [
    { "role": "user | assistant | system", "content": "string" }
  ],
  "stream": true,
  "campaignContext": "string (optional)",
  "enableRAG": false,
  "campaignId": "uuid (optional, required if enableRAG)"
}
```

**Response**: Server-Sent Events (SSE) stream or JSON response.

### POST `/api/llm/analyze`

Analyze session audio/transcript.

**Request Body**:
```json
{
  "type": "audio | transcript",
  "data": "base64 (audio) | text (transcript)",
  "mimeType": "audio/webm (required for audio)",
  "instructions": "string"
}
```

**Response**: Structured session data (title, location, journalEntry, combat, loot).

### POST `/api/llm/analyze-combat`

Extract detailed combat logs from a session transcript.

**Request Body**:
```json
{
  "transcript": "string (required)",
  "sessionId": "uuid (optional)"
}
```

**Response**: Detailed combat data (encounters, initiative, events).

### POST `/api/llm/refine-transcript`

Refine and improve a raw transcript using AI.

**Request Body**:
```json
{
  "transcript": "string (required)",
  "instructions": "string (required)",
  "focusAreas": ["string"]
}
```

**Response**: Server-Sent Events (SSE) stream of the refined transcript.

### POST `/api/llm/transform-transcript`

Apply specific transformations to a transcript (e.g., formatting, speaker identification).

**Request Body**:
```json
{
  "transcript": "string (required)",
  "transformType": "speaker-attribution | timestamp-cleanup | paragraph-format | ...",
  "options": {
    "characterMapping": [{ "player": "string", "character": "string" }],
    "dmName": "string"
  }
}
```

**Response**: Server-Sent Events (SSE) stream of the transformed transcript.

---

## Search

### GET `/api/search/status`

Check if Vertex AI Search is configured.

### GET `/api/search?q=<query>&campaignId=<uuid>`

Search campaign data.

**Query Parameters**:
- `q` (required): Search query
- `campaignId` (required): Campaign UUID
- `types` (optional): Filter by type (quest, npc, session, character)
- `limit` (optional): Max results (1-50)

### POST `/api/search/oracle-context`

Get RAG context for Oracle chat.

**Request Body**:
```json
{
  "query": "string (required)",
  "campaignId": "uuid (required)"
}
```

### POST `/api/search/index`

Index campaign data into Vertex AI Search.

### POST `/api/search/create-datastore`

Create a Vertex AI Search datastore for a campaign.

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message"
}
```

**Common Status Codes**:
- `400` - Bad request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (rate limited or quota exceeded)
- `404` - Not found
- `500` - Internal server error
- `503` - Service unavailable (external service not configured)
