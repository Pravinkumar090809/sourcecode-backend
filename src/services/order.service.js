import supabase from "../config/supabase.js";

// convert status fields to lowercase so front-end comparisons are case-insensitive
const normalizeOrder = (o) => {
  if (!o) return o;
  return {
    ...o,
    payment_status: o.payment_status ? String(o.payment_status).toLowerCase() : o.payment_status,
  };
};


/**
 * Create a new order
 *
 * Uses a cascading fallback strategy so the insert succeeds even when
 * optional columns (user_id, downloads_used, max_downloads) are missing
 * from the live database.
 */
export const createOrder = async ({ product_id, buyer_email, cashfree_order_id, user_id = null, coupon_code = null, discount_amount = 0 }) => {
  const doInsert = async (p) => {
    const { data, error } = await supabase
      .from("orders")
      .insert([p])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  };
  // controls for optional columns
  let includeCoupon = coupon_code != null;
  let includeDiscount = discount_amount !== 0;

  const isColumnError = (msg) =>
    msg.includes("Could not find") ||
    msg.includes("column") ||
    msg.includes("schema cache");

  // ── attempt 1: full payload (all optional columns) ──
  const fullPayload = {
    product_id,
    buyer_email,
    payment_status: "PENDING",
    cashfree_order_id: cashfree_order_id || null,
  };
  if (user_id) fullPayload.user_id = user_id;
  fullPayload.downloads_used = 0;
  fullPayload.max_downloads = 1;
  // include optional coupon info if available
  if (includeCoupon) fullPayload.coupon_code = coupon_code;
  if (includeDiscount) fullPayload.discount_amount = discount_amount;

  try {
    return await doInsert(fullPayload);
  } catch (err1) {
    const msg = String(err1.message);
    if (!isColumnError(msg)) throw err1;
    console.warn("createOrder attempt-1 failed (column missing):", msg);
    // remove missing coupon/discount fields if referenced
    if (msg.includes("coupon_code")) includeCoupon = false;
    if (msg.includes("discount_amount")) includeDiscount = false;
  }

  // ── attempt 2: without download counters but keep user_id ──
  const midPayload = {
    product_id,
    buyer_email,
    payment_status: "PENDING",
    cashfree_order_id: cashfree_order_id || null,
  };
  if (user_id) midPayload.user_id = user_id;
  if (includeCoupon) midPayload.coupon_code = coupon_code;
  if (includeDiscount) midPayload.discount_amount = discount_amount;

  try {
    return await doInsert(midPayload);
  } catch (err2) {
    if (!isColumnError(String(err2.message))) throw err2;
    console.warn("createOrder attempt-2 failed (column missing):", err2.message);
  }

  // ── attempt 3: absolute minimum (no user_id, no download cols) ──
  const minPayload = {
    product_id,
    buyer_email,
    payment_status: "PENDING",
    cashfree_order_id: cashfree_order_id || null,
  };
  if (includeCoupon) minPayload.coupon_code = coupon_code;
  if (includeDiscount) minPayload.discount_amount = discount_amount;

  console.warn("createOrder attempt-3: minimal payload");
  return await doInsert(minPayload);
};

/**
 * Get order by ID
 */
export const getOrderById = async (id) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, products(*)")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return normalizeOrder(data);
};

/**
 * Get order by Cashfree order ID
 */
export const getOrderByCashfreeId = async (cashfree_order_id) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, products(*)")
    .eq("cashfree_order_id", cashfree_order_id)
    .single();

  if (error) throw new Error(error.message);
  return normalizeOrder(data);
};

/**
 * Fetch a paid order belonging to a user for a specific product.
 * Falls back to buyer_email lookup when user_id column is missing.
 * Returns null if not found.
 */
export const getPaidOrderForUserProduct = async (user_id, product_id, buyer_email = null) => {
  // attempt 1: filter by user_id
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*, products(*)")
      .eq("user_id", user_id)
      .eq("product_id", product_id)
      .eq("payment_status", "PAID")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return normalizeOrder(data);
  } catch (err) {
    const msg = String(err.message || "");
    if (!msg.includes("user_id") && !msg.includes("Could not find")) throw err;
    console.warn("getPaidOrderForUserProduct: user_id column missing, falling back to buyer_email");
  }

  // attempt 2: filter by buyer_email instead
  if (!buyer_email) return null;
  const { data, error } = await supabase
    .from("orders")
    .select("*, products(*)")
    .eq("buyer_email", buyer_email)
    .eq("product_id", product_id)
    .eq("payment_status", "PAID")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return normalizeOrder(data);
};

/**
 * Increment the downloads_used counter for an order.
 * Silently skips if the column doesn't exist in the live DB.
 */
export const incrementDownloads = async (order_id) => {
  try {
    const { data: order, error: e1 } = await supabase
      .from("orders")
      .select("downloads_used")
      .eq("id", order_id)
      .single();
    if (e1) throw new Error(e1.message);
    const newCount = (order.downloads_used || 0) + 1;
    const { data, error } = await supabase
      .from("orders")
      .update({ downloads_used: newCount })
      .eq("id", order_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return normalizeOrder(data);
  } catch (err) {
    const m = String(err.message || "");
    if (m.includes("Could not find") || m.includes("column") || m.includes("schema cache") || m.includes("downloads_used")) {
      console.warn("incrementDownloads skipped – column missing:", err.message);
      try {
        const { data } = await supabase.from("orders").select("*").eq("id", order_id).single();
        return normalizeOrder(data);
      } catch (_) {
        return null;
      }
    }
    throw err;
  }
};

/**
 * Get orders by buyer email
 */
export const getOrdersByEmail = async (email) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, products(*)")
    .eq("buyer_email", email)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeOrder);
};

/**
 * Get ALL orders (admin)
 */
export const getAllOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, products(title, price)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(normalizeOrder);
};

/**
 * Update order payment status
 */
export const updateOrderStatus = async (id, payment_status) => {
  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return normalizeOrder(data);
};

/**
 * Update order status by Cashfree order ID
 */
export const updateOrderStatusByCashfreeId = async (cashfree_order_id, payment_status) => {
  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status })
    .eq("cashfree_order_id", cashfree_order_id)
    .select("*, products(*)")
    .single();

  if (error) throw new Error(error.message);
  return normalizeOrder(data);
};

/**
 * Get order stats (admin dashboard)
 */
export const getOrderStats = async () => {
  const { data: allOrders, error: e1 } = await supabase
    .from("orders")
    .select("payment_status, products(price)");

  if (e1) throw new Error(e1.message);

  const total = allOrders.length;
  const paid = allOrders.filter((o) => (o.payment_status || "").toLowerCase() === "paid");
  const pending = allOrders.filter((o) => (o.payment_status || "").toLowerCase() === "pending");
  const failed = allOrders.filter((o) => (o.payment_status || "").toLowerCase() === "failed");
  const totalRevenue = paid.reduce((sum, o) => sum + (o.products?.price || 0), 0);

  return {
    total_orders: total,
    paid_orders: paid.length,
    pending_orders: pending.length,
    failed_orders: failed.length,
    total_revenue: totalRevenue,
  };
};
