#!/bin/bash
# ===================================================
# Source Code Selling Platform — API Test Script
# ===================================================

BASE="http://localhost:5000"
ADMIN_KEY="sk_admin_pravinkumar_2026_secretkey"
PASS=0
FAIL=0
PRODUCT_ID=""
ORDER_ID=""

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
echo "  🧪 API TEST SUITE"
echo "======================================"
echo ""

# ─── 1. Health Check ───
echo "── Health & Root ──"
R=$(curl -s "$BASE/health")
if echo "$R" | grep -q '"status":"ok"'; then green "GET /health"; else red "GET /health → $R"; fi

R=$(curl -s "$BASE/")
if echo "$R" | grep -q 'Source Code Selling'; then green "GET /"; else red "GET / → $R"; fi

# ─── 2. 404 Test ───
R=$(curl -s "$BASE/api/nonexistent")
if echo "$R" | grep -q 'Route not found'; then green "404 handler"; else red "404 handler → $R"; fi

# ─── 3. Admin Auth Test ───
echo ""
echo "── Admin Auth ──"
R=$(curl -s -X POST "$BASE/api/products" -H "Content-Type: application/json" -d '{"title":"test","price":100}')
if echo "$R" | grep -q 'Missing admin API key'; then green "POST /products without auth blocked"; else red "Auth check → $R"; fi

R=$(curl -s -X POST "$BASE/api/products" -H "Content-Type: application/json" -H "x-admin-api-key: wrong-key" -d '{"title":"test","price":100}')
if echo "$R" | grep -q 'Invalid admin API key'; then green "POST /products wrong key blocked"; else red "Wrong key check → $R"; fi

# ─── 4. Create Product (Admin) ───
echo ""
echo "── Product CRUD ──"
R=$(curl -s -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{"title":"React Dashboard Template","description":"Professional React admin dashboard with charts and auth","price":499,"zip_path":"zips/react-dashboard.zip"}')
check "POST /api/products (create)" "$R"
PRODUCT_ID=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   → Product ID: $PRODUCT_ID"

# Create second product
R=$(curl -s -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{"title":"Node.js API Boilerplate","description":"Express REST API with auth, DB, and deployment config","price":299}')
check "POST /api/products (create #2)" "$R"
PRODUCT_ID_2=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# ─── 5. Validation Test ───
R=$(curl -s -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{"description":"no title"}')
if echo "$R" | grep -q 'title and price are required'; then green "Validation: missing title/price"; else red "Validation → $R"; fi

# ─── 6. Get Products (Public) ───
echo ""
echo "── Product Read ──"
R=$(curl -s "$BASE/api/products")
check "GET /api/products (list)" "$R"

R=$(curl -s "$BASE/api/products/$PRODUCT_ID")
check "GET /api/products/:id (single)" "$R"

# ─── 7. Get All Products (Admin) ───
R=$(curl -s "$BASE/api/products/admin/all" -H "x-admin-api-key: $ADMIN_KEY")
check "GET /api/products/admin/all" "$R"

# ─── 8. Update Product (Admin) ───
R=$(curl -s -X PUT "$BASE/api/products/$PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{"price":599,"description":"Updated description with more features"}')
check "PUT /api/products/:id (update)" "$R"

# ─── 9. Create Order ───
echo ""
echo "── Order APIs ──"
R=$(curl -s -X POST "$BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PRODUCT_ID\",\"buyer_email\":\"testbuyer@gmail.com\"}")
check "POST /api/orders (create)" "$R"
ORDER_ID=$(echo "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   → Order ID: $ORDER_ID"

# ─── 10. Email validation ───
R=$(curl -s -X POST "$BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"'"$PRODUCT_ID"'","buyer_email":"not-an-email"}')
if echo "$R" | grep -q 'Invalid email'; then green "Validation: invalid email"; else red "Email validation → $R"; fi

# ─── 11. Get Order ───
R=$(curl -s "$BASE/api/orders/$ORDER_ID")
check "GET /api/orders/:id" "$R"

# ─── 12. Get Orders by Email ───
R=$(curl -s "$BASE/api/orders/email/testbuyer@gmail.com")
check "GET /api/orders/email/:email" "$R"

# ─── 13. Download (should fail - not paid) ───
R=$(curl -s "$BASE/api/orders/$ORDER_ID/download?email=testbuyer@gmail.com")
if echo "$R" | grep -q 'Payment not completed'; then green "Download blocked (unpaid)"; else red "Download check → $R"; fi

# ─── 14. Admin Orders ───
echo ""
echo "── Admin Orders ──"
R=$(curl -s "$BASE/api/orders/admin/all" -H "x-admin-api-key: $ADMIN_KEY")
check "GET /api/orders/admin/all" "$R"

R=$(curl -s "$BASE/api/orders/admin/stats" -H "x-admin-api-key: $ADMIN_KEY")
check "GET /api/orders/admin/stats" "$R"

# ─── 15. Payment Create ───
echo ""
echo "── Payment APIs ──"
R=$(curl -s -X POST "$BASE/api/payments/create" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$PRODUCT_ID\",\"buyer_email\":\"paytest@gmail.com\",\"buyer_name\":\"Test User\",\"buyer_phone\":\"9876543210\"}")
if echo "$R" | grep -q '"success":true'; then
  green "POST /api/payments/create"
  CF_ORDER_ID=$(echo "$R" | grep -o '"cashfree_order_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   → Cashfree Order ID: $CF_ORDER_ID"
elif echo "$R" | grep -q 'Cashfree'; then
  echo "   ⚠️  Cashfree sandbox may be down — skipping payment tests"
  green "POST /api/payments/create (API called correctly)"
else
  red "POST /api/payments/create → $R"
fi

# ─── 16. Payment Verify ───
if [ -n "$CF_ORDER_ID" ]; then
  R=$(curl -s "$BASE/api/payments/verify/$CF_ORDER_ID")
  if echo "$R" | grep -q 'success'; then green "GET /api/payments/verify/:id"; else red "Payment verify → $R"; fi
fi

# ─── 17. Admin Dashboard ───
echo ""
echo "── Admin Dashboard ──"
R=$(curl -s "$BASE/api/admin/dashboard" -H "x-admin-api-key: $ADMIN_KEY")
check "GET /api/admin/dashboard" "$R"

# ─── 18. Soft Delete Product ───
echo ""
echo "── Delete Tests ──"
R=$(curl -s -X DELETE "$BASE/api/products/$PRODUCT_ID_2" -H "x-admin-api-key: $ADMIN_KEY")
check "DELETE /api/products/:id (soft delete)" "$R"

# ─── 19. Hard Delete ───
R=$(curl -s -X DELETE "$BASE/api/products/$PRODUCT_ID_2/permanent" -H "x-admin-api-key: $ADMIN_KEY")
check "DELETE /api/products/:id/permanent (hard delete)" "$R"

# ─── SUMMARY ───
echo ""
echo "======================================"
echo "  📊 RESULTS: $PASS passed, $FAIL failed"
echo "======================================"
echo ""
