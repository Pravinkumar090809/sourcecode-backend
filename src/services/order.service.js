import supabase from "../config/supabase.js";

// convert status fields to lowercase so front-end comparisons are case-insensitive
// helper to identify schema-related errors
const isColumnError = (msg) =>
  msg.includes("Could not find") ||
  msg.includes("column") ||
  msg.includes("schema cache");

// treat foreign-key violations on user_id as a special case we can recover from
const isUserFKError = (msg) =>
  msg.toLowerCase().includes("violates foreign key") && msg.toLowerCase().includes("user_id");

// convert status fields to lowercase so front-end comparisons are case-insensitive
const normalizeOrder = (o) => {
  if (!o) return o;
  const product = o.products || o.product || null;
  const status = o.payment_status ? String(o.payment_status).toLowerCase() : o.payment_status;
  const verificationStatusRaw = o.verification_status
    ? String(o.verification_status).toLowerCase()
    : null;

  const derivedVerificationStatus =
    verificationStatusRaw ||
    (status === "paid" ? "approved" : status === "failed" ? "rejected" : "pending");

  const price = Number(product?.price || o.price || 0);
  const discount = Number(o.discount_amount || 0);
  const derivedAmount = Math.max(price - discount, 0);

  return {
    ...o,
    payment_status: status,
    verification_status: derivedVerificationStatus,
    email: o.email || o.buyer_email || "",
    customer_name: o.customer_name || o.buyer_name || "Customer",
    product_title: o.product_title || product?.title || "",
    amount: o.amount ?? o.paid_amount ?? derivedAmount,
    transaction_id: o.transaction_id || null,
    utr_number: o.utr_number || null,
  };
};

const updateOrderWithFallback = async (id, updates, select = "*, products(*)") => {
  const payload = { ...updates };
  const maxAttempts = Object.keys(payload).length + 1;

  if (Object.keys(payload).length === 0) {
    return getOrderById(id);
  }

  for (let i = 0; i < maxAttempts; i++) {
    if (Object.keys(payload).length === 0) {
      return getOrderById(id);
    }

    const { data, error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", id)
      .select(select)
      .maybeSingle();

    if (!error) {
      if (data) return normalizeOrder(data);
      return getOrderById(id);
    }

    const msg = String(error.message || "");
    if (!isColumnError(msg)) {
      throw new Error(msg);
    }

    const removableKey = Object.keys(payload).find((key) => msg.includes(key));
    if (!removableKey) {
      throw new Error(msg);
    }

    console.warn(`updateOrderWithFallback: dropping missing column ${removableKey}`);
    delete payload[removableKey];
  }

  return getOrderById(id);
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
    // if the failure was due to a missing/invalid user_id foreign key, drop it and retry
    if (isUserFKError(msg)) {
      console.warn("createOrder attempt-1 failed (user_id foreign key):", msg);
      user_id = null;
      delete fullPayload.user_id;
      try {
        return await doInsert(fullPayload);
      } catch (retryErr) {
        const msg2 = String(retryErr.message);
        if (!isColumnError(msg2)) throw retryErr;
        console.warn("createOrder attempt-1 retry failed (column missing):", msg2);
        if (msg2.includes("coupon_code")) includeCoupon = false;
        if (msg2.includes("discount_amount")) includeDiscount = false;
      }
    }
    if (!isColumnError(msg)) throw err1;
    console.warn("createOrder attempt-1 failed (column missing):", msg);
    // remove missing fields for future attempts
    if (msg.includes("coupon_code")) includeCoupon = false;
    if (msg.includes("discount_amount")) includeDiscount = false;
    if (msg.includes("user_id")) user_id = null; // actually we keep it for now
  }

  // ── attempt 2: without download counters ──
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
    const msg = String(err2.message);
    if (isUserFKError(msg)) {
      console.warn("createOrder attempt-2 failed (user_id foreign key):", msg);
      user_id = null;
      delete midPayload.user_id;
      try {
        return await doInsert(midPayload);
      } catch (retryErr) {
        const msg2 = String(retryErr.message);
        if (!isColumnError(msg2)) throw retryErr;
        console.warn("createOrder attempt-2 retry failed (column missing):", msg2);
        if (msg2.includes("coupon_code")) includeCoupon = false;
        if (msg2.includes("discount_amount")) includeDiscount = false;
      }
    }
    if (!isColumnError(msg)) throw err2;
    console.warn("createOrder attempt-2 failed (column missing):", msg);
    if (msg.includes("coupon_code")) includeCoupon = false;
    if (msg.includes("discount_amount")) includeDiscount = false;
  }

  // ── attempt 3: absolute minimum (no user_id, no extra cols) ──
  const minPayload = {
    product_id,
    buyer_email,
    payment_status: "PENDING",
    cashfree_order_id: cashfree_order_id || null,
  };
  // ONLY include if they haven't failed yet
  if (includeCoupon) minPayload.coupon_code = coupon_code;
  if (includeDiscount) minPayload.discount_amount = discount_amount;

  console.warn("createOrder attempt-3: minimal payload", { includeCoupon, includeDiscount });
  try {
    return await doInsert(minPayload);
  } catch (err3) {
    const msg = String(err3.message);
    if (!isColumnError(msg)) throw err3;
    // final attempt: strip EVERY optional field
    console.warn("createOrder final fallback: stripping all optional fields");
    return await doInsert({
      product_id,
      buyer_email,
      payment_status: "PENDING",
      cashfree_order_id: cashfree_order_id || null,
    });
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
 * Get order by reference (cashfree_order_id OR UUID id)
 */
export const getOrderByRef = async (orderRef) => {
  if (!orderRef) return null;

  try {
    return await getOrderByCashfreeId(orderRef);
  } catch (_) {
    // fallback to UUID id
  }

  try {
    return await getOrderById(orderRef);
  } catch (_) {
    return null;
  }
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
 * Update order payment metadata (handles missing columns safely)
 */
export const updateOrderPaymentMeta = async (id, updates = {}) => {
  return updateOrderWithFallback(id, updates);
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
 * Submit manual payment proof (UTR + amount)
 */
export const submitManualPaymentProof = async (
  orderRef,
  { utr_number, transaction_id, paid_amount, payment_note = null }
) => {
  const order = await getOrderByRef(orderRef);
  if (!order) throw new Error("Order not found");

  const now = new Date().toISOString();
  const updates = {
    utr_number,
    transaction_id,
    paid_amount,
    payment_note,
    payment_method: "QR_MANUAL",
    verification_status: "SUBMITTED",
    verification_submitted_at: now,
    payment_status: "PENDING",
  };

  return updateOrderWithFallback(order.id, updates);
};

/**
 * Admin review for manual payment
 */
export const reviewManualPayment = async (
  id,
  { action, admin_note = null, rejection_reason = null, approved_amount = null }
) => {
  const normalized = String(action || "").toLowerCase();
  if (!["approve", "approved", "reject", "rejected"].includes(normalized)) {
    throw new Error("Invalid action");
  }

  const isApprove = normalized.startsWith("approve");
  const now = new Date().toISOString();

  const updates = {
    payment_status: isApprove ? "PAID" : "FAILED",
    verification_status: isApprove ? "APPROVED" : "REJECTED",
    verification_reviewed_at: now,
    admin_note,
  };

  if (isApprove && approved_amount != null) {
    updates.paid_amount = approved_amount;
  }

  if (!isApprove) {
    updates.rejection_reason = rejection_reason || admin_note || "Payment rejected by admin";
  }

  return updateOrderWithFallback(id, updates);
};

/**
 * Delete order by id (admin)
 */
export const deleteOrderById = async (id) => {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
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
