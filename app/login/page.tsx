"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AMIT_ID, PRIYA_ID, ADMIN_ID } from "@/lib/mock/seed";
import { useDemo } from "@/lib/demo-store";
import { Button, Card, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const { loginAs } = useDemo();
  const router = useRouter();
  const [email, setEmail] = useState("admin@vscrm.local");

  const go = (id: string) => {
    loginAs(id);
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--canvas)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sidebar)] text-lg font-bold text-white">
            VS
          </div>
          <h1 className="text-2xl font-semibold">VS CRM</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">UI preview — data is not saved</p>
        </div>
        <Card>
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="mt-3">
            <Field label="Password">
              <Input type="password" defaultValue="••••••••" />
            </Field>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">Password is cosmetic in this preview.</p>
          <div className="mt-5 grid gap-2">
            <Button onClick={() => go(ADMIN_ID)}>Continue as Admin</Button>
            <Button variant="outline" onClick={() => go(PRIYA_ID)}>
              Continue as Salesperson (Priya Sharma)
            </Button>
            <Button variant="ghost" onClick={() => go(AMIT_ID)}>
              Continue as Salesperson (Amit Verma)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
