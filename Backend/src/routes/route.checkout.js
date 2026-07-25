import { Router } from "express";
import { createOrder,verifyPayment } from "../controllers/checkout.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";


const router = Router();
router.post("/create-order",authenticate,createOrder);
router.post("/verify",authenticate,verifyPayment);
export default router;