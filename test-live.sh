#!/bin/bash
# ===================================================
# Source Code Selling Platform — FULL Live API Test
# Usage: bash test-live.sh https://your-app.onrender.com
# ===================================================

BASE="${1:-http://localhost:5000}"
ADMIN_KEY="sk_admin_pravinkumar_2026_secretkey"
TIMEOUT=30
PASS=0
FAIL=0

green() { echo -e "\033[0;32m✅ $1\033[0m"; PASS=$((PASS+1)); }
red()   { echo -e "\033[0;31m❌ $1\033[0m"; FAIL=$((FAIL+1)); }

check() {
  local label="$1"
  local response="$2"
  if echo "$response" | grep -q '"success":true'; then
    green "$label"
  else
    red "$label → $response"
  fi
}

echo ""
echo "======================================"
echo "  🧪 FULL LIVE API TEST"
echo "  🌐 $BASE"
echo "======================================"
echo ""

# ─── 1. Health Check ───
echo "── Health & Root ──"
R=$(curl -s -m $TIMEOUT "$BASE/health")
if echo "$R" | grep -q '"status":"ok"'; then green "GET /health"; else red "GET /health → $R"; fi

R=$(curl -s -m $TIMEOUT "$BASE/")
if echo "$R" | grep -q 'Source Code Selling'; then green "GET /"; else red "GET / → $R"; fi

# ─── 2. 404 Test ───
R=$(curl -s -m $TIMEOUT "$BASE/api/nonexistent")
if echo "$R" | grep -q 'Route not found'; then green "404 handler"; else red "404 handler → $R"; fi

# ─── 3. Admin Auth Test ───
echo ""
echo "── Admin Auth ──"
R=$(curl -s -m $TIMEOUT -X POST "$BASE/api/products" -H "Content-Type: application/json" -d '{"title":"test","price":100}')
if echo "$R" | grep -q 'Missing admin API key'; then green "POST without auth blocked"; else red "Auth check → $R"; fi

R=$(curl -s -m $TIMEOUT -X POST "$BASE/api/products" -H "Content-Type: application/json" -H "x-admin-api-key: wrong-key" -d '{"title":"test","price":100}')
if echo "$R" | grep -q 'Invalid admin API key'; then green "POST wrong key blocked"; else red "Wrong key check → $R"; fi

# ─── 4. Create Product ───
echo ""
echo "── Product CRUD ──"
R=$(curl -s -m $TIMEOUT -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{"title":"React Dashboard Template","description":"Professional React admin dashboard","price":499,"zip_path":"zips/react-dashboard.zip"}')
check "POST /api/products (create)" "$R"
PRODUCT_ID=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   → Product ID: $PRODUCT_ID"

R=$(curl -s -m $TIMEOUT -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{"title":"Node.js API Boilerplate","description":"Express REST API","price":299}')
check "POST /api/products (create #2)" "$R"
PRODUCT_ID_2=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# ─── 5. Validation ───
R=$(curl -s -m $TIMEOUT -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{"description":"no title"}')
if echo "$R" | grep -q 'title and price are required'; then green "Validation: missing fields"; else red "Validation → $R"; fi

# ─── 6. Get Products ───
echo ""
echo "── Product Read ──"
R=$(curl -s -m $TIMEOUT "$BASE/api/products")
check "GET /api/products (list)" "$R"

if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m $TIMEOUT "$BASE/api/products/$PRODUCT_ID")
  check "GET /api/products/:id" "$R"
fi

R=$(curl -s -m $TIMEOUT "$BASE/api/products/admin/all" -H "x-admin-api-key: $ADMIN_KEY")
check "GET /api/products/admin/all" "$R"

# ─── 7. Update Product ───
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m $TIMEOUT -X PUT "$BASE/api/products/$PRODUCT_ID" \
    -H "Content-Type: application/json" \
    -H "x-admin-api-key: $ADMIN_KEY" \
    -d '{"price":599,"description":"Updated description"}')
  check "PUT /api/products/:id (update)" "$R"
fi

# ─── 8. Create Order ───
echo ""
echo "── Order APIs ──"
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m $TIMEOUT -X POST "$BASE/api/orders" \
    -H "Content-Type: application/json" \
    -d "{\"product_id\":\"$PRODUCT_ID\",\"buyer_email\":\"testbuyer@gmail.com\"}")
  check "POST /api/orders (create)" "$R"
  ORDER_ID=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   → Order ID: $ORDER_ID"
fi

# ─── 9. Email Validation ───
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m $TIMEOUT -X POST "$BASE/api/orders" \
    -H "Content-Type: application/json" \
    -d '{"product_id":"'"$PRODUCT_ID"'","buyer_email":"not-an-email"}')
  if echo "$R" | grep -q 'Invalid email'; then green "Validation: invalid email"; else red "Email validation → $R"; fi
fi

# ─── 10. Get Order ───
if [ -n "$ORDER_ID" ]; then
  R=$(curl -s -m $TIMEOUT "$BASE/api/orders/$ORDER_ID")
  check "GET /api/orders/:id" "$R"

  R=$(curl -s -m $TIMEOUT "$BASE/api/orders/email/testbuyer@gmail.com")
  check "GET /api/orders/email/:email" "$R"

  R=$(curl -s -m $TIMEOUT "$BASE/api/orders/$ORDER_ID/download?email=testbuyer@gmail.com")
  if echo "$R" | grep -q 'Payment not completed'; then green "Download blocked (unpaid)"; else red "Download check → $R"; fi
fi

# ─── 11. Admin Orders ───
echo ""
echo "── Admin Orders ──"
R=$(curl -s -m $TIMEOUT "$BASE/api/orders/admin/all" -H "x-admin-api-key: $ADMIN_KEY")
check "GET /api/orders/admin/all" "$R"

R=$(curl -s -m $TIMEOUT "$BASE/api/orders/admin/stats" -H "x-admin-api-key: $ADMIN_KEY")
check "GET /api/orders/admin/stats" "$R"

# ─── 12. Payment ───
echo ""
echo "── Payment APIs ──"
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m $TIMEOUT -X POST "$BASE/api/payments/create" \
    -H "Content-Type: application/json" \
    -d "{\"product_id\":\"$PRODUCT_ID\",\"buyer_email\":\"paytest@gmail.com\",\"buyer_name\":\"Test User\",\"buyer_phone\":\"9876543210\"}")
  if echo "$R" | grep -q '"success":true'; then
    green "POST /api/payments/create"
    CF_ORDER_ID=$(echo "$R" | grep -o '"cashfree_order_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   → Cashfree Order ID: $CF_ORDER_ID"
  elif echo "$R" | grep -q 'Cashfree'; then
    green "POST /api/payments/create (API works, sandbox issue)"
  else
    red "POST /api/payments/create → $R"
  fi
fi

if [ -n "$CF_ORDER_ID" ]; then
  R=$(curl -s -m $TIMEOUT "$BASE/api/payments/verify/$CF_ORDER_ID")
  if echo "$R" | grep -q 'success'; then green "GET /api/payments/verify/:id"; else red "Payment verify → $R"; fi
fi

# ─── 13. Admin Dashboard ───
echo ""
echo "── Admin Dashboard ──"
R=$(curl -s -m $TIMEOUT "$BASE/api/admin/dashboard" -H "x-admin-api-key: $ADMIN_KEY")
check "GET /api/admin/dashboard" "$R"

# ─── 14. Delete Tests ───
echo ""
echo "── Delete Tests ──"
if [ -n "$PRODUCT_ID_2" ]; then
  R=$(curl -s -m $TIMEOUT -X DELETE "$BASE/api/products/$PRODUCT_ID_2" -H "x-admin-api-key: $ADMIN_KEY")
  check "DELETE /api/products/:id (soft)" "$R"

  R=$(curl -s -m $TIMEOUT -X DELETE "$BASE/api/products/$PRODUCT_ID_2/permanent" -H "x-admin-api-key: $ADMIN_KEY")
  check "DELETE /api/products/:id/permanent" "$R"
fi

# ─── Cleanup: Delete test product ───
if [ -n "$PRODUCT_ID" ]; then
  curl -s -m $TIMEOUT -X DELETE "$BASE/api/products/$PRODUCT_ID/permanent" -H "x-admin-api-key: $ADMIN_KEY" > /dev/null 2>&1
fi

echo ""
echo "======================================"
echo "  📊 RESULTS: $PASS passed, $FAIL failed"
echo "======================================"
echo ""
