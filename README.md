# Source Code Selling Platform — Backend API

> Node.js + Express + Supabase + Cashfree

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy env file and fill in your keys
cp .env.example .env

# Run in dev mode
npm run dev

# Run in production
npm start
```

## 📡 API Endpoints

### Public APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/products` | List active products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/:id` | Get order by ID |
| GET | `/api/orders/email/:email` | Get orders by email |
| GET | `/api/orders/:id/download?email=` | Download ZIP (paid only) |
| POST | `/api/payments/create` | Initiate payment |
| GET | `/api/payments/verify/:cashfreeOrderId` | Verify payment |
| POST | `/api/payments/webhook` | Cashfree webhook |

### Admin APIs (require `x-admin-api-key` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/admin/all` | All products (inc. inactive) |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Soft delete |
| DELETE | `/api/products/:id/permanent` | Hard delete |
| GET | `/api/orders/admin/all` | All orders |
| GET | `/api/orders/admin/stats` | Order stats |
| POST | `/api/admin/upload` | Upload ZIP file |
| GET | `/api/admin/files` | List uploaded files |
| DELETE | `/api/admin/files/:path` | Delete file |
| GET | `/api/admin/dashboard` | Dashboard stats |

## 🔐 Authentication

Admin endpoints require the `x-admin-api-key` header:
```
x-admin-api-key: your-secret-key
```

## 🗄 Database

Run the SQL in `database/setup.sql` in your Supabase SQL Editor.

## 🌐 Deploy (Render)

1. Push to GitHub
2. Connect repo to Render
3. Set environment variables
4. Build command: `npm install`
5. Start command: `npm start`
