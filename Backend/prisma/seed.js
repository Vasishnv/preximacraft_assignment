import prisma from "../src/lib/prisma.js";

async function main() {


  // Insert plans
  await prisma.plan.createMany({
    data: [
      {
        name: "Basic",
        price: 9,
        billingInterval: "MONTHLY",
        features: ["1 project", "Email support"],
        isPopular: false,
        isActive: true,
      },
      {
        name: "Pro",
        price: 29,
        billingInterval: "MONTHLY",
        features: ["10 projects", "Priority support"],
        isPopular: true, // mark as most popular
        isActive: true,
      },
      {
        name: "Enterprise",
        price: 99,
        billingInterval: "MONTHLY",
        features: ["Unlimited projects", "Dedicated manager", "SLA"],
        isPopular: false,
        isActive: true,
      },
    ],
  });

  console.log("✅ Plans seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
