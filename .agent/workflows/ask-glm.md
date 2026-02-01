---
description: Query Zhipu GLM-4.7 Flash via OpenRouter
---

1. Send request to OpenRouter
   ```bash
   curl -s -X POST "https://openrouter.ai/api/v1/chat/completions" \
     -H "Authorization: Bearer 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" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "z-ai/glm-4.7-flash",
       "messages": [{"role": "user", "content": "Hello! Are you operational?"}]
     }' > .agent/glm_response.json
   ```

2. Read the response
   ```bash
   cat .agent/glm_response.json
   ```
