import supabase from "../config/supabase.js";

/**
 * Get all active products (public)
 */
export const getAllProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Get single product by ID (public)
 */
export const getProductById = async (id) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Get ALL products including inactive (admin)
 */
export const getAllProductsAdmin = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Create a new product (admin)
 */
export const createProduct = async ({ title, description, price, zip_path }) => {
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        title,
        description: description || "",
        price: Number(price),
        zip_path: zip_path || null,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Update a product (admin)
 */
export const updateProduct = async (id, updates) => {
  // Only allow specific fields to be updated
  const allowedFields = ["title", "description", "price", "zip_path", "is_active"];
  const cleanUpdates = {};

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      cleanUpdates[key] = key === "price" ? Number(updates[key]) : updates[key];
    }
  }

  const { data, error } = await supabase
    .from("products")
    .update(cleanUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Delete a product (admin) — soft delete by setting is_active = false
 */
export const deleteProduct = async (id) => {
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Hard delete a product (admin) — permanently remove
 */
export const hardDeleteProduct = async (id) => {
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) throw new Error(error.message);
  return { deleted: true };
};
