"use client";

import { useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";

export default function SettingsPage() {
  const { state, updateSettings, toast } = useDemo();
  const [companyName, setCompanyName] = useState(state.settings.companyName);
  const [catalogApiKey, setCatalogApiKey] = useState(state.settings.catalogApiKey);
  const [smtp, setSmtp] = useState(state.settings.smtp);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  return (
    <AdminGate>
      <PageHeader title="Settings" subtitle="Company mailbox, catalog key and account. Values stay in this browser session only." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Company</h2>
          <Field label="Company name">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </Field>
          <div className="mt-3">
            <Field label="Website catalog API key">
              <Input value={catalogApiKey} onChange={(e) => setCatalogApiKey(e.target.value)} />
            </Field>
          </div>
          <Button className="mt-4" onClick={() => updateSettings({ companyName, catalogApiKey })}>
            Save company
          </Button>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">SMTP</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Host"><Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} /></Field>
            <Field label="Port"><Input value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} /></Field>
            <Field label="Username"><Input value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} /></Field>
            <Field label="Password"><Input type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} /></Field>
            <Field label="From name"><Input value={smtp.fromName} onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })} /></Field>
            <Field label="From email"><Input value={smtp.fromEmail} onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => updateSettings({ smtp })}>Save SMTP</Button>
            <Button variant="outline" onClick={() => toast("Test email accepted by SMTP (preview)")}>
              Send test email
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Change password</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">Cosmetic in this UI preview.</p>
          <Field label="New password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <div className="mt-3">
            <Field label="Confirm"><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
          </div>
          <Button
            className="mt-4"
            onClick={() => toast(pw && pw === pw2 ? "Password updated (preview)" : "Passwords must match", pw && pw === pw2 ? "ok" : "err")}
          >
            Update password
          </Button>
        </Card>
      </div>
    </AdminGate>
  );
}
