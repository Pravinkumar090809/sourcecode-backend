import supabase from "../config/supabase.js";

// ═══════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════

export const getReviews = async () => {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const deleteReview = async (id) => {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const createReview = async (review) => {
  const { data, error } = await supabase
    .from("reviews")
    .insert([review])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

// ═══════════════════════════════════════════
// COUPONS
// ═══════════════════════════════════════════

export const getCoupons = async () => {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const createCoupon = async (coupon) => {
  const { data, error } = await supabase
    .from("coupons")
    .insert([coupon])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteCoupon = async (id) => {
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const toggleCoupon = async (id, active) => {
  const { data, error } = await supabase
    .from("coupons")
    .update({ active })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

// lookup a coupon by code (case insensitive)
export const getCouponByCode = async (code) => {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", code)
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
};

// increment usage counter, returns updated coupon
export const incrementCouponUse = async (id) => {
  const { data, error } = await supabase
    .from("coupons")
    .update({ uses: supabase.raw("uses + 1") })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

// ═══════════════════════════════════════════
// REFUNDS
// ═══════════════════════════════════════════

export const getRefunds = async () => {
  const { data, error } = await supabase
    .from("refunds")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const createRefund = async (refund) => {
  const { data, error } = await supabase
    .from("refunds")
    .insert([refund])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateRefundStatus = async (id, status) => {
  const { data, error } = await supabase
    .from("refunds")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

// ═══════════════════════════════════════════
// SUPPORT TICKETS
// ═══════════════════════════════════════════

export const getTickets = async () => {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const createTicket = async (ticket) => {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert([ticket])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateTicketStatus = async (id, status) => {
  const { data, error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const replyToTicket = async (id, admin_reply) => {
  const { data, error } = await supabase
    .from("support_tickets")
    .update({ admin_reply, status: "in-progress" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

// ═══════════════════════════════════════════
// ACTIVITY LOGS
// ═══════════════════════════════════════════

export const getActivityLogs = async (limit = 50) => {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
};

export const logActivity = async (action, actor = "System", details = "", type = "general") => {
  const { error } = await supabase
    .from("activity_logs")
    .insert([{ action, actor, details, type }]);
  if (error) console.error("Failed to log activity:", error.message);
};

// ═══════════════════════════════════════════
// DOWNLOAD LOGS
// ═══════════════════════════════════════════

export const getDownloadLogs = async (limit = 100) => {
  const { data, error } = await supabase
    .from("download_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
};

export const logDownload = async (log) => {
  const { error } = await supabase
    .from("download_logs")
    .insert([log]);
  if (error) console.error("Failed to log download:", error.message);
};

// ═══════════════════════════════════════════
// SETTINGS (key-value store)
// ═══════════════════════════════════════════

export const getSettings = async (prefix = null) => {
  let query = supabase.from("settings").select("*");
  if (prefix) {
    query = query.like("key", `${prefix}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Convert to object
  const obj = {};
  (data || []).forEach((s) => {
    obj[s.key] = s.value;
  });
  return obj;
};

export const updateSettings = async (settingsObj) => {
  const promises = Object.entries(settingsObj).map(([key, value]) =>
    supabase
      .from("settings")
      .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: "key" })
  );
  const results = await Promise.all(promises);
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) throw new Error(errors[0].error.message);
};

// ═══════════════════════════════════════════
// ADMIN PROFILE (from users table, role=admin)
// ═══════════════════════════════════════════

export const getAdminProfile = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, created_at")
    .eq("role", "admin")
    .limit(1)
    .single();
  if (error) {
    // If no admin user, return default
    return { name: "Admin", email: "admin@sourcecode.com", role: "admin" };
  }
  return data;
};

export const updateAdminProfile = async (updates) => {
  const { data: admin } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .single();

  if (!admin) throw new Error("Admin user not found");

  const allowed = {};
  if (updates.name) allowed.name = updates.name;
  if (updates.email) allowed.email = updates.email;

  const { data, error } = await supabase
    .from("users")
    .update(allowed)
    .eq("id", admin.id)
    .select("id, name, email, role, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const changeAdminPassword = async (currentPassword, newPassword) => {
  const bcrypt = await import("bcryptjs");

  const { data: admin, error: fetchErr } = await supabase
    .from("users")
    .select("*")
    .eq("role", "admin")
    .limit(1)
    .single();

  if (fetchErr || !admin) throw new Error("Admin user not found");

  const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!isMatch) throw new Error("Current password is incorrect");

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(newPassword, salt);

  const { error } = await supabase
    .from("users")
    .update({ password_hash })
    .eq("id", admin.id);

  if (error) throw new Error(error.message);
  return true;
};
