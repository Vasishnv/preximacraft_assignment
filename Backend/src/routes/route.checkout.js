import { Router } from "express";
import { createOrder } from "../controllers/checkout.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";


const router = Router();
router.post("/create-order",authenticate,createOrder);
export default router;