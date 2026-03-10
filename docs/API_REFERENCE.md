# 📚 API Reference - Social Mimic

> Documentación completa de la API REST del backend

## 🌐 Base URLs

| Entorno | URL |
|---------|-----|
| Local | `http://localhost:3000` |
| Staging | `https://social-mimic-stg-xxxxx.run.app` |
| Production | `https://social-mimic-xxxxx.run.app` |

## 🔐 Autenticación

Actualmente la API está en desarrollo y no requiere autenticación.  
En producción se implementará JWT Bearer tokens.

```http
Authorization: Bearer <token>
```

---

## 📋 Endpoints

### Health Check

#### `GET /health`

Verifica el estado del servicio.

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-25T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

#### `GET /health/detailed`

Estado detallado incluyendo dependencias.

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-25T10:30:00Z",
  "services": {
    "database": "healthy",
    "brain": "healthy",
    "cache": "healthy"
  }
}
```

---

### 🧠 Brain API

#### `POST /api/v1/brain/process`

Procesa un mensaje a través del cerebro IA.

**Request Body:**
```json
{
  "message": {
    "id": "msg-123",
    "author": "usuario_twitter",
    "content": "¿Qué opinas sobre TypeScript?",
    "platform": "twitter",
    "type": "mention",
    "metadata": {
      "replyTo": null,
      "conversationId": "conv-456"
    }
  },
  "context": {
    "profileId": "profile-789",
    "recentInteractions": [],
    "platform": "twitter"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "action": "respond",
    "response": "TypeScript es genial, añade tipado...",
    "plan": {
      "strategy": "opinion",
      "tone": "casual",
      "length": "medium"
    },
    "timing": {
      "delay": 5000,
      "canRespond": true,
      "reason": "within_rate_limits"
    },
    "evaluation": {
      "shouldRespond": true,
      "confidence": 0.92,
      "reasoning": "Direct question about technology topic"
    }
  }
}
```

**Response 400 - Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "message.content",
        "message": "Content is required"
      }
    ]
  }
}
```

**Response 503 - Brain Unavailable (Circuit Breaker Open):**
```json
{
  "success": false,
  "error": {
    "code": "BRAIN_UNAVAILABLE",
    "message": "Brain service is temporarily unavailable",
    "circuitBreaker": {
      "state": "OPEN",
      "failureCount": 5,
      "lastFailure": "2026-01-25T10:28:00Z"
    }
  }
}
```

---

#### `POST /api/v1/brain/evaluate`

Solo evalúa si se debe responder (sin generar contenido).

**Request Body:**
```json
{
  "message": {
    "id": "msg-123",
    "author": "usuario",
    "content": "Contenido a evaluar",
    "platform": "twitter"
  },
  "context": {
    "profileId": "profile-789"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "shouldRespond": true,
    "confidence": 0.85,
    "reasoning": "Relevant topic with direct question",
    "suggestedAction": "respond"
  }
}
```

---

#### `POST /api/v1/brain/generate`

Solo genera contenido (asume que ya se decidió responder).

**Request Body:**
```json
{
  "plan": {
    "strategy": "informative",
    "tone": "professional",
    "length": "long",
    "includeEmoji": true
  },
  "context": {
    "profileId": "profile-789",
    "originalMessage": "¿Cómo funciona serverless?",
    "relevantMemories": []
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "content": "Serverless es un modelo de computación...",
    "authenticity": 0.91,
    "metadata": {
      "tokensUsed": 150,
      "model": "llama-3.1-70b-versatile",
      "generationTime": 1200
    }
  }
}
```

---

### 👤 Profiles API

#### `GET /api/v1/profiles`

Lista todos los perfiles configurados.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Máximo de resultados (default: 20) |
| `offset` | number | Offset para paginación |
| `platform` | string | Filtrar por plataforma |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "profile-123",
        "name": "Mi Cuenta Twitter",
        "platform": "twitter",
        "username": "@mi_cuenta",
        "status": "active",
        "createdAt": "2026-01-20T08:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

#### `GET /api/v1/profiles/:id`

Obtiene un perfil específico.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "profile-123",
    "name": "Mi Cuenta Twitter",
    "platform": "twitter",
    "username": "@mi_cuenta",
    "status": "active",
    "personality": {
      "traits": {
        "tone": {
          "formality": 0.4,
          "humor": 0.6,
          "sarcasm": 0.3
        },
        "topics": ["tecnología", "startups", "ai"]
      },
      "lastUpdated": "2026-01-24T12:00:00Z"
    },
    "stats": {
      "totalInteractions": 150,
      "responsesGenerated": 89,
      "averageAuthenticityScore": 0.87
    }
  }
}
```

---

#### `POST /api/v1/profiles`

Crea un nuevo perfil.

**Request Body:**
```json
{
  "name": "Nuevo Perfil",
  "platform": "twitter",
  "credentials": {
    "apiKey": "encrypted_key",
    "apiSecret": "encrypted_secret"
  },
  "personality": {
    "basePrompt": "Eres un experto en tecnología...",
    "traits": {
      "tone": { "formality": 0.5, "humor": 0.4 },
      "topics": ["tech", "ai"]
    }
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "profile-456",
    "name": "Nuevo Perfil",
    "status": "pending_verification"
  }
}
```

---

#### `PUT /api/v1/profiles/:id/personality`

Actualiza la personalidad de un perfil.

**Request Body:**
```json
{
  "traits": {
    "tone": {
      "formality": 0.3,
      "humor": 0.7,
      "sarcasm": 0.2
    },
    "topics": ["gaming", "anime", "tech"],
    "vocabulary": {
      "preferredWords": ["genial", "épico"],
      "avoidWords": ["básico"]
    }
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "profileId": "profile-123",
    "personalityUpdated": true,
    "newTraits": { ... }
  }
}
```

---

### 📊 Analytics API

#### `GET /api/v1/analytics/interactions`

Obtiene métricas de interacciones.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `profileId` | string | ID del perfil (requerido) |
| `startDate` | ISO date | Fecha inicio |
| `endDate` | ISO date | Fecha fin |
| `granularity` | string | `hour`, `day`, `week` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalInteractions": 250,
      "responsesGenerated": 180,
      "averageResponseTime": 4500,
      "averageAuthenticityScore": 0.89
    },
    "timeline": [
      {
        "date": "2026-01-24",
        "interactions": 45,
        "responses": 32,
        "avgAuthenticityScore": 0.91
      }
    ]
  }
}
```

---

### 🔧 System API

#### `GET /api/v1/system/circuit-breaker`

Estado del Circuit Breaker.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "state": "CLOSED",
    "failureCount": 0,
    "successCount": 150,
    "lastStateChange": "2026-01-25T08:00:00Z",
    "config": {
      "failureThreshold": 5,
      "successThreshold": 3,
      "timeout": 30000
    }
  }
}
```

#### `POST /api/v1/system/circuit-breaker/reset`

Reset manual del Circuit Breaker.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "previousState": "OPEN",
    "newState": "HALF_OPEN",
    "message": "Circuit breaker reset to HALF_OPEN state"
  }
}
```

---

## 🔴 Códigos de Error

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body inválido |
| `UNAUTHORIZED` | 401 | Token ausente o inválido |
| `FORBIDDEN` | 403 | Sin permisos para el recurso |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `RATE_LIMITED` | 429 | Demasiadas requests |
| `BRAIN_UNAVAILABLE` | 503 | Cerebro no disponible |
| `INTERNAL_ERROR` | 500 | Error interno del servidor |

## 📝 Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/v1/brain/*` | 60 req/min |
| `/api/v1/profiles/*` | 100 req/min |
| `/api/v1/analytics/*` | 30 req/min |

---

## 🧪 Ejemplos con cURL

### Procesar mensaje

```bash
curl -X POST http://localhost:3000/api/v1/brain/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "id": "test-1",
      "author": "usuario",
      "content": "¿Qué opinas de TypeScript?",
      "platform": "twitter"
    },
    "context": {
      "profileId": "profile-123"
    }
  }'
```

### Health check

```bash
curl http://localhost:3000/health
```

### Obtener perfil

```bash
curl http://localhost:3000/api/v1/profiles/profile-123
```

---

## 📦 SDKs (Futuro)

- **JavaScript/TypeScript:** `npm install @social-mimic/sdk`
- **Python:** `pip install social-mimic`

---

*Última actualización: 25 de enero de 2026*
