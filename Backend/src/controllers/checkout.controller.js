import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import razorpay from "../lib/razorpay.js";

export const createOrder = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "invalid user" });
    }

    const planId = Number(req.body.planId);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(401).json({ error: "invalid plan" });
    }

    const options = {
      amount: Number(plan.price) * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { userId, planId },
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(500).json({ error: "error creating order" });
    }

    await prisma.payment.create({
      data: {
        userId,
        razorpayOrderId: order.id,
        amount: order.amount / 100,
      },
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "something went wrong" });
  }
};