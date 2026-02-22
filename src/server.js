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
  console.log(`\n🚀 Server running → http://0.0.0.0:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`✅ Health check ready\n`);
});
