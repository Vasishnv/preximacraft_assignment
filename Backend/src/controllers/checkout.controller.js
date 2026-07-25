import crypto from "crypto";
import prisma from "../lib/prisma.js";
import razorpay from "../lib/razorpay.js";
import { handlePaymentSuccess } from "../services/paymentServices.js";

export const createOrder = async (req, res) => {
    console.log("req.body:", req.body);
    console.log("planId:", req.body.planId);
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "invalid user" });
    }

    const planId =await Number(req.body.planId);
    console.log(planId);
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
        planId,
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


export const verifyPayment =async (req,res)=>{
    try{
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    await handlePaymentSuccess(payment.id, razorpay_payment_id);

    return res.status(200).json({ status: "success" });
    }
    catch(err){
        console.log(err);
        return res.status(500).json({error:"Something went wrong in verification"})
    }


}