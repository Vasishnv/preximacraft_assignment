"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/plans");
        const data = await res.json();
        setPlans(data.plans);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };

    const fetchSubscription = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("http://localhost:3001/api/subscriptions/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.subscription) {
          setCurrentPlanId(data.subscription.plan.id);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      }
    };

    fetchPlans();
    fetchSubscription();
  }, []);

  const createOrder = async (planId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const res = await fetch("http://localhost:3001/api/checkout/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "Your App Name",
        handler: async (response) => {
          const verifyRes = await fetch("http://localhost:3001/api/checkout/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(response),
          });

          if (verifyRes.ok) {
            window.location.href = "/dashboard";
          } else {
            console.error("Verification failed");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  const changePlan = async (newPlanId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const res = await fetch("http://localhost:3001/api/subscriptions/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPlanId }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Plan change error:", err);
    }
  };

  const handlePlanAction = (plan) => {
    if (currentPlanId === plan.id) return; // already on this plan, button disabled anyway
    if (currentPlanId) {
      changePlan(plan.id); // subscribed to a different plan → switch
    } else {
      createOrder(plan.id); // not subscribed → checkout
    }
  };

  const getButtonLabel = (plan) => {
    if (currentPlanId === plan.id) return "Current Plan";
    if (currentPlanId) return "Switch to this Plan";
    return plan.isPopular ? "Get Started" : "Select Plan";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-16 px-6">
      <h1 className="text-4xl font-bold mb-4 text-primary">Subscription Plans</h1>
      <p className="text-muted-foreground mb-12 text-center max-w-2xl">
        Choose the plan that fits your needs. Upgrade, downgrade, or cancel anytime.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col justify-between border rounded-lg shadow-sm transition-transform hover:scale-[1.02] overflow-visible ${
              plan.isPopular ? "border-primary" : "border-border"
            }`}
          >
            {plan.isPopular && (
              <Badge className="absolute -top-3 right-4 z-10 bg-red-600 text-white px-3 py-1 rounded-md shadow-md">
                Most Popular
              </Badge>
            )}

            <CardHeader>
              <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
              <CardDescription className="mt-2 text-muted-foreground">
                {plan.billingInterval}
              </CardDescription>
              <p className="text-3xl font-bold text-primary mt-4">{plan.price}</p>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-primary">✔</span>
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant="default"
                disabled={currentPlanId === plan.id}
                onClick={() => handlePlanAction(plan)}
              >
                {getButtonLabel(plan)}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
