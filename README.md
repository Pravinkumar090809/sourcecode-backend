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
| GET | `/api/orders/:id/download` | Download ZIP (paid only, authenticated)
| GET | `/api/download?productId=<id>` | Download ZIP via product ID (authenticated, preferred) |
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
| POST | `/api/admin/upload` | Upload ZIP file (standalone) |
| POST | `/api/admin/products/create-with-upload` | Create product + upload ZIP (multipart) |
| PUT | `/api/admin/products/:id/update-with-upload` | Update product + replace ZIP (multipart) |
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

> **Important:** the orders table now includes
> `user_id UUID REFERENCES users(id)` (linked to the
> authenticated buyer) as well as
> `downloads_used INTEGER DEFAULT 0 NOT NULL` and
> `max_downloads INTEGER DEFAULT 1 NOT NULL` to enforce
> per-order download limits. If you already have an
> existing database, run the following SQL:
> ```sql
> ALTER TABLE orders
>   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
>   ADD COLUMN IF NOT EXISTS downloads_used INTEGER DEFAULT 0 NOT NULL,
>   ADD COLUMN IF NOT EXISTS max_downloads INTEGER DEFAULT 1 NOT NULL;
> ```
> These fields are automatically populated when new
> orders are created from an authenticated session.
>
> **Tag column**: products now support an optional `tags`
> field. If your database predates this change you can run:
>
> ```sql
> ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
> ```
> 
> The backend will only include the `tags` property in
> inserts when a value is provided, so the migration is
> optional but will enable tag filtering in future UI
> updates.
>
> **Orders columns**: the system keeps track of `downloads_used`
> and `max_downloads`. if these columns are missing you may
> see errors like
> `Could not find the 'downloads_used' column of 'orders'
> in the schema cache` when creating a payment. the code now
> gracefully falls back to inserting without those fields,
> but you should still add the columns to enable download
> limits:
>
> ```sql
> ALTER TABLE orders
>   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
>   ADD COLUMN IF NOT EXISTS downloads_used INTEGER DEFAULT 0 NOT NULL,
>   ADD COLUMN IF NOT EXISTS max_downloads INTEGER DEFAULT 1 NOT NULL;
> ```
>
> Running the above will restore full functionality; once
> added the application will automatically populate and
> increment the counts.
