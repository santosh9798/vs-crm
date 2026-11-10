"use client";

import { useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { loadCatalog } from "@/lib/catalog";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";

export default function SettingsPage() {
  const { state, updateSettings, updatePassword, toast } = useDemo();
  const [companyName, setCompanyName] = useState(state.settings.companyName);
  const [catalogApiUrl, setCatalogApiUrl] = useState(state.settings.catalogApiUrl);
  const [catalogApiKey, setCatalogApiKey] = useState(state.settings.catalogApiKey);
  const [smtp, setSmtp] = useState(state.settings.smtp);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [testing, setTesting] = useState(false);

  return (
    <AdminGate>
      <PageHeader title="Settings" subtitle="Company mailbox, catalog API and your password. SMTP password is stored encrypted." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Company</h2>
          <Field label="Company name">
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </Field>
          <div className="mt-3">
            <Field label="Catalog API URL">
              <Input
                value={catalogApiUrl}
                onChange={(e) => setCatalogApiUrl(e.target.value)}
                placeholder="https://vospaces.com/adminPannel/catalog-api/crm-listings-api.php"
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Catalog API key">
              <Input value={catalogApiKey} onChange={(e) => setCatalogApiKey(e.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Upload <code>catalog-api/crm-listings-api.php</code> next to <code>db.php</code> on VOspaces, then paste the live URL here.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => updateSettings({ companyName, catalogApiUrl, catalogApiKey })}>
              Save company
            </Button>
            <Button
              variant="outline"
              disabled={testing || !catalogApiUrl.trim()}
              onClick={async () => {
                setTesting(true);
                try {
                  const catalog = await loadCatalog(catalogApiUrl, catalogApiKey);
                  toast(`Connected · ${catalog.spaces.length} listings, ${catalog.states.length} states`);
                } catch (err) {
                  toast(err instanceof Error ? err.message : "Catalog API failed", "err");
                } finally {
                  setTesting(false);
                }
              }}
            >
              {testing ? "Testing…" : "Test catalog"}
            </Button>
          </div>
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
            <Button variant="outline" onClick={() => toast("SMTP sending is not wired yet — save the mailbox first", "info")}>
              Send test email
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Change password</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">Updates the password for the signed-in account.</p>
          <Field label="New password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <div className="mt-3">
            <Field label="Confirm"><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
          </div>
          <Button
            className="mt-4"
            onClick={() => {
              if (!pw || pw !== pw2) {
                toast("Passwords must match", "err");
                return;
              }
              if (pw.length < 8) {
                toast("Password must be at least 8 characters", "err");
                return;
              }
              updatePassword(pw);
            }}
          >
            Update password
          </Button>
        </Card>
      </div>
    </AdminGate>
  );
}
