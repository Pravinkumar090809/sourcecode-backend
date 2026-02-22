import supabase from "../config/supabase.js";

// Create ticket on behalf of user
export const createUserTicket = async ({ user_name, user_email, subject, message, priority = "low" }) => {
  const payload = {
    user_name,
    user_email,
    subject,
    message,
    priority,
    status: "open",
  };
  console.log("→ inserting ticket payload:", payload);
  const { data, error } = await supabase
    .from("support_tickets")
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const getUserTickets = async (user_email) => {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_email", user_email)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const getUserTicketById = async (id, user_email) => {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .eq("user_email", user_email)
    .single();
  if (error) throw new Error(error.message);
  return data;
};
