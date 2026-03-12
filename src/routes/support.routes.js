import express from "express";
import * as supportController from "../controllers/support.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";

console.log("🔧 support.routes loaded");

const router = express.Router();

// public contact form (no auth required)
router.post("/contact", supportController.publicContact);

// user endpoints for support tickets
router.post("/", userAuth, supportController.createTicket);
router.get("/", userAuth, supportController.listTickets);
router.get("/:id", userAuth, supportController.getTicket);

console.log("🔧 support.routes endpoints configured");

export default router;
