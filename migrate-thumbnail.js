#!/usr/bin/env node
/**
 * Migration script to add thumbnail_url column to products table
 * 
 * Usage:
 *   node migrate-thumbnail.js <YOUR_SUPABASE_DB_PASSWORD>
 * 
 * Example:
 *   node migrate-thumbnail.js mySecretPassword123
 * 
 * You can find your database password in:
 *   Supabase Dashboard → Project Settings → Database → Connection string
 */

import pg from "pg";
const { Client } = pg;

const DB_PASSWORD = process.argv[2];
const PROJECT_REF = "ealemokwafmymsczkncl";

if (!DB_PASSWORD) {
  console.error("❌ Please provide your Supabase database password as argument");
  console.error("   Usage: node migrate-thumbnail.js <DB_PASSWORD>");
  console.error("");
  console.error("   Find it at: https://supabase.com/dashboard/project/" + PROJECT_REF + "/settings/database");
  process.exit(1);
}

const connectionString = `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

async function migrate() {
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
  
  try {
    console.log("🔌 Connecting to Supabase database...");
    await client.connect();
    console.log("✅ Connected!");

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'thumbnail_url' AND table_schema = 'public'
    `);

    if (checkResult.rows.length > 0) {
      console.log("ℹ️  Column 'thumbnail_url' already exists in products table. No migration needed.");
    } else {
      console.log("📦 Adding 'thumbnail_url' column to products table...");
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT ''`);
      console.log("✅ Column 'thumbnail_url' added successfully!");
    }

    // Also ensure tags column exists
    const tagsCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'tags' AND table_schema = 'public'
    `);
    
    if (tagsCheck.rows.length === 0) {
      console.log("📦 Adding 'tags' column to products table...");
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT ''`);
      console.log("✅ Column 'tags' added successfully!");
    }

    // Verify
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log("\n📋 Current products table columns:");
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}) ${row.column_default ? `DEFAULT: ${row.column_default}` : ''}`);
    });

    console.log("\n🎉 Migration complete! Thumbnails will now work.");
    
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    if (err.message.includes("password authentication failed")) {
      console.error("   → Wrong database password. Check Supabase Dashboard → Settings → Database");
    }
  } finally {
    await client.end();
  }
}

migrate();
