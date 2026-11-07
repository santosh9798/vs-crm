"use client";

import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo-store";
import { Button, Card } from "@/components/ui";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useDemo();
  const router = useRouter();
  if (!isAdmin) {
    return (
      <Card className="max-w-md">
        <p className="font-medium">Admin only</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Switch to Admin in the preview bar to open this screen.</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
      </Card>
    );
  }
  return <>{children}</>;
}
