import prisma from "../lib/prisma.js";

export const getPlans=async (req,res)=>{
    try{
            const plans = await prisma.plan.findMany({
              select: {
                id:true,
                name: true,
                price: true,
               features: true,
              billingInterval: true,
              isPopular:true,
             },
             orderBy: {
              price: "asc", 
             },
        });

        const formattedPlans = plans.map(plan => ({
        id:plan.id,
        name: plan.name,
        features: plan.features,
        price: `$${plan.price}/${plan.billingInterval}`,
        billingInterval:plan.billingInterval,
        isPopular:plan.isPopular
            }));
        
        return res.status(201).json({plans:formattedPlans})
    }
    catch(err){
        console.log(err)
        return res.status(500).json({error:"Error getting plans from db"})
    }



}