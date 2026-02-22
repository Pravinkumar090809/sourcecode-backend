import supabase from "../config/supabase.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "sourcecode_jwt_secret_2026_pravinkumar";
const JWT_EXPIRES_IN = "7d";

/**
 * Register a new user
 */
export const register = async ({ name, email, password }) => {
  // Check if user already exists
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    throw new Error("User already exists with this email");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // Create user
  const { data, error } = await supabase
    .from("users")
    .insert([{ name, email, password_hash, role: "user" }])
    .select("id, name, email, role, created_at")
    .single();

  if (error) throw new Error(error.message);

  // Generate token
  const token = generateToken(data);

  return { user: data, token };
};

/**
 * Login user
 */
export const login = async ({ email, password }) => {
  // Get user with password
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    throw new Error("Invalid email or password");
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  // Generate token
  const token = generateToken(user);

  // Return user without password_hash
  const { password_hash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

/**
 * Get user profile by ID
 */
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, created_at")
    .eq("id", userId)
    .single();

  if (error) throw new Error("User not found");
  return data;
};

/**
 * Update user profile
 */
export const updateProfile = async (userId, updates) => {
  const allowedFields = ["name"];
  const cleanUpdates = {};

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      cleanUpdates[key] = updates[key];
    }
  }

  if (updates.password) {
    const salt = await bcrypt.genSalt(10);
    cleanUpdates.password_hash = await bcrypt.hash(updates.password, salt);
  }

  const { data, error } = await supabase
    .from("users")
    .update(cleanUpdates)
    .eq("id", userId)
    .select("id, name, email, role, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Get all users (admin)
 */
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
