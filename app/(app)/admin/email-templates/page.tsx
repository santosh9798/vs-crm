"use client";

import { useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";

const SAMPLE = {
  lead_name: "Asha Verma",
  company_name: "VS Virtual Office",
  stage: "New",
  salesperson_name: "Priya Sharma",
  salesperson_phone: "+91 98100 11001",
};

function fill(body: string) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE[k as keyof typeof SAMPLE] ?? `{{${k}}}`);
}

export default function EmailTemplatesPage() {
  const { state, upsertTemplate } = useDemo();
  const [id, setId] = useState(state.emailTemplates[0]?.id ?? "");
  const tpl = state.emailTemplates.find((t) => t.id === id) ?? state.emailTemplates[0];
  const [subject, setSubject] = useState(tpl?.subject ?? "");
  const [body, setBody] = useState(tpl?.body ?? "");
  const [delay, setDelay] = useState(tpl?.delayDays ?? 2);
  const [active, setActive] = useState(tpl?.isActive ?? true);

  const pick = (nextId: string) => {
    const next = state.emailTemplates.find((t) => t.id === nextId);
    setId(nextId);
    setSubject(next?.subject ?? "");
    setBody(next?.body ?? "");
    setDelay(next?.delayDays ?? 0);
    setActive(next?.isActive ?? true);
  };

  return (
    <AdminGate>
      <PageHeader
        title="Email templates"
        subtitle="One template per stage. Delay 0 sends immediately. Variables: {{lead_name}}, {{company_name}}, {{stage}}, {{salesperson_name}}, {{salesperson_phone}}."
      />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr_1fr]">
        <Card className="space-y-1 p-3">
          {state.emailTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${t.id === id ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--canvas)]"}`}
            >
              <span>{t.kind === "quotation" ? "Quotation" : state.stages.find((s) => s.id === t.stageId)?.name}</span>
              <Badge color={t.isActive ? "#16A34A" : "#6B7280"}>{t.isActive ? "On" : "Off"}</Badge>
            </button>
          ))}
        </Card>
        {tpl ? (
          <Card>
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <div className="mt-3">
              <Field label="Body">
                <Textarea className="min-h-[200px]" value={body} onChange={(e) => setBody(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <Field label="Delay (days)">
                <Input type="number" min={0} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="w-28" />
              </Field>
              <label className="mt-5 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Active
              </label>
            </div>
            <Button
              className="mt-4"
              onClick={() => upsertTemplate({ ...tpl, subject, body, delayDays: delay, isActive: active })}
            >
              Save template
            </Button>
          </Card>
        ) : null}
        <Card>
          <h2 className="mb-2 font-semibold">Preview</h2>
          <p className="text-sm font-medium">{fill(subject)}</p>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted)]">{fill(body)}</pre>
        </Card>
      </div>
    </AdminGate>
  );
}
