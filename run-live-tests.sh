#!/bin/bash
# ============================================================
#  LIVE API TEST SUITE — Source Code Backend
#  URL: https://sourcecode-backend-rxvt.onrender.com
# ============================================================

BASE="https://sourcecode-backend-rxvt.onrender.com"
ADMIN_KEY="sk_admin_pravinkumar_2026_secretkey"
PASS=0
FAIL=0
TOTAL=0
PRODUCT_ID=""
ORDER_ID=""

pass() { PASS=$((PASS+1)); echo "  ✅ PASS"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ FAIL"; }

echo "=============================================="
echo "  LIVE API TESTS"
echo "  URL: $BASE"
echo "  Time: $(date)"
echo "=============================================="
echo ""

# ━━━━━━━━━━━ TEST 1: Health Check ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /health"
R=$(curl -s -m 30 "$BASE/health")
echo "  $R"
echo "$R" | grep -q '"status":"ok"' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 2: 404 Handler ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /nonexistent → 404"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$BASE/xyz-no-exist")
echo "  HTTP $CODE"
[ "$CODE" = "404" ] && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 3: List Products (public) ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/products (public list)"
R=$(curl -s -m 30 "$BASE/api/products")
echo "  $(echo "$R" | head -c 200)"
echo "$R" | grep -q '"success":true' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 4: Create Product WITHOUT auth → 401 ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: POST /api/products WITHOUT auth → 401"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 30 -X POST "$BASE/api/products" -H "Content-Type: application/json" -d '{"title":"hack","price":1}')
echo "  HTTP $CODE"
[ "$CODE" = "401" ] && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 5: Create Product WITH auth, INVALID data ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: POST /api/products (auth + missing fields → 400)"
R=$(curl -s -m 30 -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{"title":""}')
echo "  $R"
echo "$R" | grep -q '"success":false' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 6: Create Product WITH auth, VALID ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: POST /api/products (auth + valid data)"
R=$(curl -s -m 30 -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{
    "title":"Live Test Product",
    "description":"Created during live API testing",
    "price":499,
    "tech_stack":"Node.js, Express, Supabase",
    "preview_url":"https://example.com/preview",
    "source_file_path":"uploads/live-test.zip"
  }')
echo "  $(echo "$R" | head -c 400)"
PRODUCT_ID=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
echo "  → Product ID: $PRODUCT_ID"
echo "$R" | grep -q '"success":true' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 7: Get Product by ID ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/products/$PRODUCT_ID"
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m 30 "$BASE/api/products/$PRODUCT_ID")
  echo "  $(echo "$R" | head -c 300)"
  echo "$R" | grep -q '"success":true' && pass || fail
else
  echo "  Skipped (no product ID)"; fail
fi
echo ""

# ━━━━━━━━━━━ TEST 8: Update Product ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: PUT /api/products/$PRODUCT_ID (update price)"
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m 30 -X PUT "$BASE/api/products/$PRODUCT_ID" \
    -H "Content-Type: application/json" \
    -H "x-admin-api-key: $ADMIN_KEY" \
    -d '{"price":699,"description":"Updated during live testing"}')
  echo "  $(echo "$R" | head -c 300)"
  echo "$R" | grep -q '"success":true' && pass || fail
else
  echo "  Skipped (no product ID)"; fail
fi
echo ""

# ━━━━━━━━━━━ TEST 9: Admin - List All Products ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/products/admin/all (admin list)"
R=$(curl -s -m 30 "$BASE/api/products/admin/all" \
  -H "x-admin-api-key: $ADMIN_KEY")
echo "  $(echo "$R" | head -c 300)"
echo "$R" | grep -q '"success":true' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 10: Get Non-existent Product → 404 ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/products/00000000-0000-0000-0000-000000000000 → 404"
R=$(curl -s -m 30 "$BASE/api/products/00000000-0000-0000-0000-000000000000")
echo "  $R"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$BASE/api/products/00000000-0000-0000-0000-000000000000")
[ "$CODE" = "404" ] && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 11: Create Order ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: POST /api/orders (create order)"
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m 30 -X POST "$BASE/api/orders" \
    -H "Content-Type: application/json" \
    -d "{
      \"product_id\":\"$PRODUCT_ID\",
      \"buyer_email\":\"test@livetest.com\"
    }")
  echo "  $(echo "$R" | head -c 400)"
  ORDER_ID=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)
  echo "  → Order ID: $ORDER_ID"
  echo "$R" | grep -q '"success":true' && pass || fail
else
  echo "  Skipped (no product ID)"; fail
fi
echo ""

# ━━━━━━━━━━━ TEST 12: Get Order by ID ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/orders/$ORDER_ID"
if [ -n "$ORDER_ID" ]; then
  R=$(curl -s -m 30 "$BASE/api/orders/$ORDER_ID")
  echo "  $(echo "$R" | head -c 300)"
  echo "$R" | grep -q '"success":true' && pass || fail
else
  echo "  Skipped (no order ID)"; fail
fi
echo ""

# ━━━━━━━━━━━ TEST 13: Get Orders by Email ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/orders/email/test@livetest.com"
R=$(curl -s -m 30 "$BASE/api/orders/email/test@livetest.com")
echo "  $(echo "$R" | head -c 300)"
echo "$R" | grep -q '"success":true' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 14: Admin - All Orders ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/orders/admin/all"
R=$(curl -s -m 30 "$BASE/api/orders/admin/all" \
  -H "x-admin-api-key: $ADMIN_KEY")
echo "  $(echo "$R" | head -c 300)"
echo "$R" | grep -q '"success":true' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 15: Admin - Order Stats ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/orders/admin/stats"
R=$(curl -s -m 30 "$BASE/api/orders/admin/stats" \
  -H "x-admin-api-key: $ADMIN_KEY")
echo "  $R"
echo "$R" | grep -q '"success":true' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 16: Download without payment → fail ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/download?productId=$PRODUCT_ID (unpaid → fail)"
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m 30 "$BASE/api/download?productId=$PRODUCT_ID")
  echo "  $R"
  echo "$R" | grep -q '"success":false\|Access denied\|Payment' && pass || fail
else
  echo "  Skipped (no product)"; fail
fi
echo ""

# ━━━━━━━━━━━ TEST 17: Create Payment ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: POST /api/payments/create"
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m 30 -X POST "$BASE/api/payments/create" \
    -H "Content-Type: application/json" \
    -d "{
      \"product_id\":\"$PRODUCT_ID\",
      \"buyer_email\":\"paytest@livetest.com\",
      \"buyer_name\":\"Live Tester\",
      \"buyer_phone\":\"9876543210\"
    }")
  echo "  $(echo "$R" | head -c 400)"
  echo "$R" | grep -q '"success":true\|payment_session_id\|cf_order\|order_id' && pass || fail
else
  echo "  Skipped"; fail
fi
echo ""

# ━━━━━━━━━━━ TEST 18: Verify Payment (should say pending/not found) ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/payments/verify/CF_FAKE_ORDER_123"
R=$(curl -s -m 30 "$BASE/api/payments/verify/CF_FAKE_ORDER_123")
echo "  $(echo "$R" | head -c 300)"
# Should return error or pending - either is valid
echo "$R" | grep -q '"success"' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 19: Admin Dashboard ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/admin/dashboard"
R=$(curl -s -m 30 "$BASE/api/admin/dashboard" \
  -H "x-admin-api-key: $ADMIN_KEY")
echo "  $(echo "$R" | head -c 400)"
echo "$R" | grep -q '"success":true' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 20: Admin Dashboard WITHOUT auth → 401 ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/admin/dashboard WITHOUT auth → 401"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$BASE/api/admin/dashboard")
echo "  HTTP $CODE"
[ "$CODE" = "401" ] && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 21: Admin - List Storage Files ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/admin/files"
R=$(curl -s -m 30 "$BASE/api/admin/files" \
  -H "x-admin-api-key: $ADMIN_KEY")
echo "  $(echo "$R" | head -c 300)"
echo "$R" | grep -q '"success":true' && pass || fail
echo ""

# ━━━━━━━━━━━ TEST 22: Soft Delete Product ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: DELETE /api/products/$PRODUCT_ID (soft delete)"
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m 30 -X DELETE "$BASE/api/products/$PRODUCT_ID" \
    -H "x-admin-api-key: $ADMIN_KEY")
  echo "  $R"
  echo "$R" | grep -q '"success":true' && pass || fail
else
  echo "  Skipped"; fail
fi
echo ""

# ━━━━━━━━━━━ TEST 23: Verify soft-deleted product hidden from public ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: GET /api/products/$PRODUCT_ID (soft deleted → 404)"
if [ -n "$PRODUCT_ID" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 30 "$BASE/api/products/$PRODUCT_ID")
  echo "  HTTP $CODE"
  [ "$CODE" = "404" ] && pass || fail
else
  echo "  Skipped"; fail
fi
echo ""

# ━━━━━━━━━━━ TEST 24: Hard Delete Product ━━━━━━━━━━━
TOTAL=$((TOTAL+1))
echo "TEST $TOTAL: DELETE /api/products/$PRODUCT_ID/permanent (hard delete)"
if [ -n "$PRODUCT_ID" ]; then
  R=$(curl -s -m 30 -X DELETE "$BASE/api/products/$PRODUCT_ID/permanent" \
    -H "x-admin-api-key: $ADMIN_KEY")
  echo "  $R"
  echo "$R" | grep -q '"success":true' && pass || fail
else
  echo "  Skipped"; fail
fi
echo ""

# ━━━━━━━━━━━ FINAL RESULTS ━━━━━━━━━━━
echo "=============================================="
echo "  FINAL RESULTS"
echo "=============================================="
echo "  Total:   $TOTAL"
echo "  Passed:  $PASS ✅"
echo "  Failed:  $FAIL ❌"
echo "=============================================="
if [ $FAIL -eq 0 ]; then
  echo "  🎉 ALL TESTS PASSED!"
else
  echo "  ⚠️  $FAIL test(s) failed"
fi
echo "=============================================="
