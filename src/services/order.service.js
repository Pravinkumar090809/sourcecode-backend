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
 */
export const createOrder = async ({ product_id, buyer_email, cashfree_order_id, user_id = null }) => {
  // base payload
  const basePayload = {
    product_id,
    buyer_email,
    payment_status: "PENDING",
    cashfree_order_id: cashfree_order_id || null,
  };
  if (user_id) basePayload.user_id = user_id;

  // attempt with downloads columns first (for new schemas)
  let payload = { ...basePayload, downloads_used: 0, max_downloads: 1 };

  const tryInsert = async (p) => {
    const { data, error } = await supabase
      .from("orders")
      .insert([p])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  };

  try {
    return await tryInsert(payload);
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("downloads_used") || msg.includes("max_downloads")) {
      // fall back to payload without those fields
      return await tryInsert(basePayload);
    }
    throw err;
  }
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
 * Returns null if not found. */
export const getPaidOrderForUserProduct = async (user_id, product_id) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, products(*)")
    .eq("user_id", user_id)
    .eq("product_id", product_id)
    .eq("payment_status", "PAID")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return normalizeOrder(data);
};

/**
 * Increment the downloads_used counter for an order
 */
export const incrementDownloads = async (order_id) => {
  try {
    // read current value then update
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
    // if columns are missing, ignore and return without modifying
    const m = String(err.message || "").toLowerCase();
    if (m.includes("downloads_used") || m.includes("column") && m.includes("does not exist")) {
      console.warn("incrementDownloads skipped – column missing", err.message);
      // fetch order without increment
      const { data } = await supabase.from("orders").select("*").eq("id", order_id).single();
      return normalizeOrder(data);
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
