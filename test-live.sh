#!/bin/bash
# ===================================================
# Live API Test — Run after Render deployment
# Usage: bash test-live.sh https://your-render-url.onrender.com
# ===================================================

BASE="${1:-http://localhost:5000}"
ADMIN_KEY="sk_admin_pravinkumar_2026_secretkey"

echo ""
echo "🌐 Testing: $BASE"
echo "======================================"

# Health
echo "── Health ──"
R=$(curl -s -m 10 "$BASE/health")
echo "$R" | grep -q '"status":"ok"' && echo "✅ Health OK" || echo "❌ Health FAILED: $R"

# Root
R=$(curl -s -m 10 "$BASE/")
echo "$R" | grep -q 'Source Code' && echo "✅ Root OK" || echo "❌ Root FAILED: $R"

# Products
echo "── Products ──"
R=$(curl -s -m 10 "$BASE/api/products")
echo "$R" | grep -q '"success":true' && echo "✅ GET /api/products" || echo "❌ GET /api/products: $R"

# Create product
R=$(curl -s -m 10 -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_KEY" \
  -d '{"title":"Live Test Product","description":"Testing live deployment","price":199}')
echo "$R" | grep -q '"success":true' && echo "✅ POST /api/products (admin)" || echo "❌ POST /api/products: $R"

# Orders
echo "── Orders ──"
R=$(curl -s -m 10 "$BASE/api/orders/admin/all" -H "x-admin-api-key: $ADMIN_KEY")
echo "$R" | grep -q '"success":true' && echo "✅ GET /api/orders/admin/all" || echo "❌ Orders: $R"

# Dashboard
echo "── Dashboard ──"
R=$(curl -s -m 10 "$BASE/api/admin/dashboard" -H "x-admin-api-key: $ADMIN_KEY")
echo "$R" | grep -q '"success":true' && echo "✅ GET /api/admin/dashboard" || echo "❌ Dashboard: $R"

echo ""
echo "======================================"
echo "  Done! 🎉"
echo "======================================"
