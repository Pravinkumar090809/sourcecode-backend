import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file if it exists (local dev). On Render, env vars come from dashboard.
const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("📄 Loaded .env file");
} else {
  console.log("☁️  No .env file — using system environment variables (Render/production)");
}

// Import app AFTER env is configured
const { default: app } = await import("./app.js");

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`🚀 Server running → http://0.0.0.0:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "not set"}`);
  console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL ? "✅ connected" : "❌ missing"}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? "✅ set" : "⚠️  using default"}`);
  console.log(`💰 Cashfree: ${process.env.CASHFREE_APP_ID ? "✅ configured" : "❌ missing"}`);
  console.log(`${"═".repeat(50)}\n`);
});
