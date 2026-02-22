import * as supportService from "../services/support.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const createTicket = async (req, res) => {
  try {
const { subject, message, priority } = req.body;
  const { name: user_name, email: user_email } = req.user || {};

  if (!subject || !message) {
    return sendError(res, "Subject and message are required", 400);
  }

  const ticket = await supportService.createUserTicket({
    user_name: user_name || "",
    user_email,
    subject,
    message,
      priority,
    });

    return sendSuccess(res, ticket, "Ticket created", 201);
  } catch (error) {
    console.error("❌ create ticket error:", error.message);
    return sendError(res, "Failed to create ticket", 500, error.message);
  }
};

export const listTickets = async (req, res) => {
  try {
    const { email: user_email } = req.user;
    const tickets = await supportService.getUserTickets(user_email);
    return sendSuccess(res, tickets, "Tickets fetched");
  } catch (error) {
    console.error("❌ fetch tickets error:", error.message);
    return sendError(res, "Failed to fetch tickets", 500, error.message);
  }
};

export const getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { email: user_email } = req.user;
    const ticket = await supportService.getUserTicketById(id, user_email);
    if (!ticket) return sendError(res, "Ticket not found", 404);
    return sendSuccess(res, ticket, "Ticket fetched");
  } catch (error) {
    console.error("❌ get ticket error:", error.message);
    return sendError(res, "Failed to fetch ticket", 500, error.message);
  }
};
