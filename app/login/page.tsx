"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Button, Card, Field, Input } from "@/components/ui";

function LoginForm() {
  const { login } = useDemo();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@vospaces.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.push(params.get("next") || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--canvas)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sidebar)] text-lg font-bold text-white">
            VS
          </div>
          <h1 className="text-2xl font-semibold">VS CRM</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Sign in with your work email</p>
        </div>
        <Card>
          <form onSubmit={submit}>
            <Field label="Email">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <div className="mt-3">
              <Field label="Password">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </Field>
            </div>
            {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
            <Button className="mt-5 w-full" disabled={busy || !email || !password}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
