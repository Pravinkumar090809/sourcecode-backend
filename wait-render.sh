#!/bin/bash
# Wait for Render service to come alive
URL="https://sourcecode-backend.onrender.com/health"
echo "⏳ Waiting for Render service..."
for i in $(seq 1 20); do
  CODE=$(curl -s -m 10 -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null)
  echo "  Attempt $i/20 → HTTP $CODE"
  if [ "$CODE" = "200" ]; then
    echo "  ✅ Service is LIVE!"
    curl -s "$URL" | python3 -m json.tool
    exit 0
  fi
  sleep 15
done
echo "  ❌ Service did not come alive in 5 minutes"
echo "  → Go to Render Dashboard and Resume the service"
echo "  → Check Environment Variables are set"
exit 1
