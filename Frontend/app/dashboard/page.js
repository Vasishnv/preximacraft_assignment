"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/Components/ui/card";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";

export default function Dashboard() {
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${token}` };

      const [subRes, payRes] = await Promise.all([
        fetch("http://localhost:3001/api/subscriptions/me", { headers }),
        fetch("http://localhost:3001/api/subscriptions/payments", { headers }),
      ]);

      const subData = await subRes.json();
      const payData = await payRes.json();

      setSubscription(subData.subscription);
      setPayments(payData.payments);
      setLoading(false);
    };

    fetchData();
  }, []);
  const handleCancel = async () => {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch("http://localhost:3001/api/subscriptions/cancel", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    window.location.reload();
  } catch (err) {
    console.error("Cancel error:", err);
  }
};

const handleChangePlan = async (newPlanId) => {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch("http://localhost:3001/api/subscriptions/change-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPlanId }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    window.location.reload();
  } catch (err) {
    console.error("Change plan error:", err);
  }
};
  if (loading) return <div className="p-8">Loading...</div>;

   return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-10">
  <h1 className="text-4xl font-bold tracking-tight mb-8">Dashboard</h1>

  {subscription ? (
    <Card className="mb-10 shadow-sm rounded-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {subscription.plan.name}
        </CardTitle>
        <CardDescription className="flex items-center gap-2 mt-2">
          <Badge
            variant={subscription.status === "active" ? "default" : "destructive"}
            className="px-2 py-1 text-xs font-medium"
          >
            {subscription.status}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Renews on: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-md border bg-background hover:bg-muted transition-colors text-sm font-medium"
          >
            Cancel Subscription
          </button>
          <a
            href="/pricing"
            className="px-4 py-2 rounded-md border bg-background hover:bg-muted transition-colors text-sm font-medium"
          >
            Upgrade / Downgrade
          </a>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card className="mb-10 text-center shadow-sm rounded-lg">
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">No active subscription.</p>
        <Button asChild>
          <a href="/pricing">Choose a Plan</a>
        </Button>
      </CardContent>
    </Card>
  )}

  <h2 className="text-2xl font-semibold tracking-tight mb-6">Payment History</h2>
  {payments.length > 0 ? (
    <Card className="shadow-sm rounded-lg">
      <CardContent>
        <div className="grid grid-cols-4 gap-4 font-medium border-b pb-3 mb-3 text-sm text-muted-foreground">
          <span>Plan</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {payments.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-4 gap-4 border-b py-3 text-sm hover:bg-muted/30 transition-colors"
          >
            <span>{p.plan.name}</span>
            <span>₹{p.amount}</span>
            <span>
              <Badge
                variant={p.status === "SUCCESS" ? "default" : "destructive"}
                className="px-2 py-1 text-xs font-medium"
              >
                {p.status}
              </Badge>
            </span>
            <span>{new Date(p.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  ) : (
    <p className="text-muted-foreground">No payments yet.</p>
  )}
</div>

  );
}
