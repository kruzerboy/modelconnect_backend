# BookShoot Admin Dashboard — Google AI Studio Prototyping Kit

This document provides the exact **System Instructions**, **Structured JSON Schemas**, **Function Calling (Tools)**, and **Production REST API Contracts** to build and prototype the **BookShoot Admin Dashboard** directly inside [Google AI Studio](https://aistudio.google.com).

---

## 1. Google AI Studio Workspace Setup

| Parameter | Recommended Value | Why |
| :--- | :--- | :--- |
| **Model** | `gemini-1.5-flash` | Ultra-fast multimodal latency (< 1s) for comp card inspection and query processing |
| **Temperature** | `0.1` – `0.2` | Low temperature ensures deterministic, production-valid JSON output |
| **Top-P** | `0.95` | Maintains precision |
| **Response Format** | `application/json` (Structured Outputs) | Guaranteed schema conformance without hallucinated markdown fences |

---

## 2. Prototype A: Multimodal Comp Card & Portfolio Inspector

In Google AI Studio, create a new **Chat Prompt** or **Freeform Prompt**.

### System Instructions
```text
You are the BookShoot Chief Casting Director & Portfolio Verification AI.
BookShoot is a professional marketplace for:
1. Models (High fashion, commercial, runway, e-commerce)
2. Cinematographers (4K cinema gear, RED/Sony FX rigs, gaffers)
3. Drone Pilots (DGCA licensed, FPV, aerial cinema)
4. Production Studios & Brand Owners

Your job is to inspect creative portfolio images, headshots, and composite cards (comp cards) uploaded by talent.
Evaluate:
- Studio key/rim lighting quality
- Focus sharpness and resolution
- Face visibility & commercial agency standard
- Verification verdict: "APPROVED", "FLAGGED", or "REQUIRES_MANUAL_REVIEW"
- Confidence score (0.0 to 1.0) and Quality score (1 to 100)

Always return strictly valid JSON according to the configured JSON schema.
```

### Structured Output Schema (Paste into AI Studio "JSON Schema" editor)
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["APPROVED", "FLAGGED", "REQUIRES_MANUAL_REVIEW"]
    },
    "confidence": {
      "type": "number",
      "description": "Confidence score between 0.0 and 1.0"
    },
    "qualityScore": {
      "type": "integer",
      "description": "Score from 1 to 100 assessing lighting, resolution, and presentation"
    },
    "insights": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Key observations on lighting, framing, and commercial readiness"
    },
    "detectedAttributes": {
      "type": "object",
      "properties": {
        "lightingQuality": { "type": "string" },
        "isProfessionalHeadshot": { "type": "boolean" },
        "faceDetected": { "type": "boolean" },
        "estimatedAgeRange": { "type": "string" }
      },
      "required": ["lightingQuality", "isProfessionalHeadshot", "faceDetected"]
    }
  },
  "required": ["status", "confidence", "qualityScore", "insights", "detectedAttributes"]
}
```

---

## 3. Prototype B: Admin Operations Copilot (Function Calling / Tool Use)

In Google AI Studio, enable **Function Calling** and paste the following tool declarations so Gemini can query and manage your live database.

### System Instructions
```text
You are BookShoot Operations Copilot. You assist the platform administrator in managing:
- App Hero Banners synced to the Flutter mobile app
- Featured talent curation across Models, Camera Crews, Drone Pilots, and Studio Brands
- Daily casting opportunities and community telemetry

Use the provided tools whenever the user asks to inspect stats, create banners, or feature talent.
```

### Tool Declarations (Function Calling JSON)
```json
[
  {
    "name": "getMarketplaceStats",
    "description": "Fetches current marketplace telemetry including user counts by role, active casting calls, and live banners.",
    "parameters": {
      "type": "object",
      "properties": {}
    }
  },
  {
    "name": "listBanners",
    "description": "Lists all mobile home carousel banners currently configured on the platform.",
    "parameters": {
      "type": "object",
      "properties": {
        "onlyActive": {
          "type": "boolean",
          "description": "Whether to return only active banners"
        }
      }
    }
  },
  {
    "name": "createAppBanner",
    "description": "Creates a new hero carousel banner visible on the Flutter mobile app.",
    "parameters": {
      "type": "object",
      "properties": {
        "title": { "type": "string", "description": "Banner headline" },
        "subtitle": { "type": "string", "description": "Banner hook or subtitle" },
        "imageUrl": { "type": "string", "description": "High resolution hero image URL" },
        "ctaText": { "type": "string", "description": "Button label e.g. 'View Castings'" },
        "targetType": { "type": "string", "enum": ["category", "creator", "casting", "external"] },
        "targetPayload": { "type": "string", "description": "Target ID or category key e.g. 'model', 'camera', 'drone'" },
        "badge": { "type": "string", "description": "Pill tag e.g. 'Trending Now'" }
      },
      "required": ["title", "imageUrl", "targetType", "targetPayload"]
    }
  },
  {
    "name": "featureTalentSlot",
    "description": "Pins a creative professional into a featured slot on the mobile home screen.",
    "parameters": {
      "type": "object",
      "properties": {
        "userId": { "type": "string", "description": "MongoDB User ID" },
        "slotOrder": { "type": "integer", "description": "Slot position 1 to 12" },
        "featuredRole": { "type": "string", "enum": ["model", "camera", "drone", "business", "all"] },
        "badge": { "type": "string", "description": "Curator badge e.g. 'Top Rated'" }
      },
      "required": ["userId", "slotOrder"]
    }
  }
]
```

---

## 4. Production REST API Endpoints (Ready in `modelconnect_backend`)

Your backend hosts these production endpoints ready to connect to your Google AI Studio prototype or external dashboard:

### 1. Public Mobile Banners (Cached & Synced with Flutter)
* **Endpoint:** `GET /api/v1/banners`
* **Access:** Public / Guest / Mobile App
* **Headers:** `Cache-Control: public, s-maxage=60`
* **Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "67b9...",
      "title": "Summer High Fashion Campaign 2025",
      "subtitle": "Now casting runway models for Mumbai & Delhi shoots",
      "imageUrl": "https://images.unsplash.com/...",
      "ctaText": "View Castings",
      "targetType": "casting",
      "targetPayload": "model",
      "gradientColors": ["#00204B", "#0877E8"],
      "badge": "Trending Now",
      "displayOrder": 1,
      "active": true
    }
  ]
}
```

### 2. Admin Banners CRUD
* **List All Banners:** `GET /api/v1/admin/banners`
* **Create Banner:** `POST /api/v1/admin/banners`
* **Update Banner:** `PUT /api/v1/admin/banners/:id`
* **Delete Banner:** `DELETE /api/v1/admin/banners/:id`

### 3. Featured Talent Slots
* **List Slots:** `GET /api/v1/admin/featured` (Enriched with User & ModelProfile data)
* **Set Slot:** `POST /api/v1/admin/featured`
* **Remove Slot:** `DELETE /api/v1/admin/featured?userId=:id`

### 4. Live Marketplace Telemetry
* **Endpoint:** `GET /api/v1/admin/stats`
* **Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 28,
      "activeCastings": 6,
      "liveBanners": 3,
      "featuredTalentCount": 4
    },
    "roleBreakdown": {
      "models": 14,
      "cinematographers": 6,
      "dronePilots": 3,
      "productionHouses": 5
    },
    "systemHealth": {
      "dbConnected": true,
      "aiStudioConnected": true
    }
  }
}
```

### 5. Backend Google AI Studio Proxy Routes
* **Multimodal Verification:** `POST /api/v1/admin/ai/verify`
  * Body: `{ "photoUrl": "https://...", "role": "model", "experience": "professional" }`
* **Copilot Query:** `POST /api/v1/admin/ai/copilot`
  * Body: `{ "question": "Are there any licensed drone pilots in Delhi NCR?" }`

---

## 5. Quick Testing with cURL

```bash
# 1. Test live banners (used by Flutter app)
curl -X GET http://localhost:3000/api/v1/banners

# 2. Test platform telemetry
curl -X GET http://localhost:3000/api/v1/admin/stats

# 3. Test AI comp card verification via backend proxy
curl -X POST http://localhost:3000/api/v1/admin/ai/verify \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    "role": "model",
    "experience": "professional"
  }'

# 4. Test AI Copilot query
curl -X POST http://localhost:3000/api/v1/admin/ai/copilot \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How many active commercial shoots do we have right now?"
  }'
```
