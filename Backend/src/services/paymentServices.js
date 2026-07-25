import prisma from "../lib/prisma.js";
import { sendEmail } from "./emailService.js";

export const handlePaymentSuccess = async (paymentId, razorpayPaymentId) => {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new Error("Payment not found");
  }

  // Idempotency guard — if already processed, do nothing further
  if (payment.status === "SUCCESS") {
    return payment;
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "SUCCESS",
      razorpayPaymentId,
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId: payment.userId,
      planId: payment.planId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
    },
  });

  await prisma.payment.update({
    where: { id: paymentId },
    data: { subscriptionId: subscription.id },
  });

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(paymentId).padStart(4, "0")}`;
  await prisma.invoice.create({
    data: {
      userId: payment.userId,
      paymentId: payment.id,
      invoiceNumber,
      amount: payment.amount,
      status: "ISSUED",
    },
  });
  const user = await prisma.user.findUnique({ where: { id: payment.userId } });
  await sendEmail(
    user.email,
    "Subscription Confirmed",
    `Your subscription is now active. Invoice: ${invoiceNumber}, Amount: ₹${payment.amount}`
  );
  return updatedPayment;
};