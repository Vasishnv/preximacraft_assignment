import prisma from "../lib/prisma.js";

export const getMySubscription = async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return res.status(200).json({ subscription: null });
    }

    return res.status(200).json({ subscription });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
};

export const getMyPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.userId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ payments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
};

export const getMyInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.userId },
      orderBy: { issuedAt: "desc" },
    });
    return res.status(200).json({ invoices });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
};

export const cancelsub = async(req,res)=>{
    try{
        const subscription = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: "ACTIVE" },
    });
    if (!subscription) return res.status(404).json({ error: "No active subscription" });

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    return res.status(200).json({ subscription: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
};
 export const changePlan= async(req,res) =>{
  try {
    console.log("got change plan request");
    const { newPlanId } = req.body;
    const planId = Number(newPlanId);

    const newPlan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!newPlan) return res.status(404).json({ error: "Plan not found" });

    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: "ACTIVE" },
    });
    if (!subscription) return res.status(404).json({ error: "No active subscription" });

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { planId },
      include: { plan: true },
    });

    return res.status(200).json({ subscription: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "something went wrong" });
  }
};
