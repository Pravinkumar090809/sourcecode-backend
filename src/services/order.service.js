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
export const createOrder = async ({ product_id, buyer_email, cashfree_order_id }) => {
  const { data, error } = await supabase
    .from("orders")
    .insert([
      {
        product_id,
        buyer_email,
        payment_status: "PENDING",
        cashfree_order_id: cashfree_order_id || null,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
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
