import * as supportService from "../services/support.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

// Public contact form (no auth required)
export const publicContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return sendError(res, "Name, email, and message are required", 400);
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, "Please provide a valid email address", 400);
    }

    const ticket = await supportService.createUserTicket({
      user_name: name,
      user_email: email,
      subject: subject || "Contact Form Message",
      message,
      priority: "low",
    });

    return sendSuccess(res, { id: ticket.id }, "Message sent successfully! We'll get back to you within 24 hours.", 201);
  } catch (error) {
    console.error("❌ public contact error:", error.message);
    return sendError(res, "Failed to send message. Please try again.", 500, error.message);
  }
};

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
