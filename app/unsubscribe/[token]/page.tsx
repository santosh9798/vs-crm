"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

export default function UnsubscribePage() {
  const [done, setDone] = useState(false);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--canvas)] p-4">
      <Card className="max-w-md text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sidebar)] text-sm font-bold text-white">
          VS
        </div>
        {done ? (
          <>
            <h1 className="text-xl font-semibold">You have been unsubscribed</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Automated follow-up emails for this address are cancelled. A salesperson can still send a quotation if you ask.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Unsubscribe from follow-ups</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Stop automated CRM emails for this address. This page does not require a login.
            </p>
            <Button className="mt-5 w-full" onClick={() => setDone(true)}>
              Confirm unsubscribe
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
