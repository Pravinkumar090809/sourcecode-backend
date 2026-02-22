import express from "express";
import { supabase } from "../lib/supabase.js";
import adminAuth from "../middlewares/adminAuth.js";

const router = express.Router();

/* =====================================================
   COUPONS
===================================================== */

// GET all coupons
router.get("/coupons", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// CREATE coupon
router.post("/coupons", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("coupons")
    .insert(req.body)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// DELETE coupon
router.delete("/coupons/:id", adminAuth, async (req, res) => {
  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true });
});



/* =====================================================
   REVIEWS
===================================================== */

router.get("/reviews", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

router.patch("/reviews/:id/approve", adminAuth, async (req, res) => {
  const { error } = await supabase
    .from("reviews")
    .update({ is_approved: true })
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true });
});



/* =====================================================
   REFUNDS
===================================================== */

router.get("/refunds", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("refunds")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

router.patch("/refunds/:id", adminAuth, async (req, res) => {
  const { status } = req.body;

  const { error } = await supabase
    .from("refunds")
    .update({ status })
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true });
});



/* =====================================================
   SUPPORT TICKETS
===================================================== */

router.get("/support-tickets", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

router.patch("/support-tickets/:id/reply", adminAuth, async (req, res) => {
  const { admin_reply, status } = req.body;

  const { error } = await supabase
    .from("support_tickets")
    .update({ admin_reply, status })
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true });
});



/* =====================================================
   SETTINGS
===================================================== */

router.get("/settings", adminAuth, async (req, res) => {
  const { data, error } = await supabase.from("settings").select("*");

  if (error) return res.status(500).json({ success: false });
  res.json({ success: true, data });
});

router.patch("/settings", adminAuth, async (req, res) => {
  const updates = Object.entries(req.body).map(([key, value]) => ({
    key,
    value,
  }));

  const { error } = await supabase
    .from("settings")
    .upsert(updates, { onConflict: "key" });

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true });
});

export default router;