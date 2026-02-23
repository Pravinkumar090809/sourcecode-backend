import express from "express";
import { userAuth } from "../middlewares/auth.middleware.js";
import * as orderController from "../controllers/order.controller.js";

const router = express.Router();

// This endpoint lives at /api/download and uses a query parameter for productId
router.get("/", userAuth, orderController.downloadByProduct);

export default router;
