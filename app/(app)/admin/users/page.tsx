"use client";

import { useState } from "react";
import { AdminGate } from "@/components/admin-gate";
import { Avatar, Badge, Button, Card, Field, Input, Modal, PageHeader } from "@/components/ui";
import { useDemo } from "@/lib/demo-store";
import type { Permissions, User } from "@/lib/types";

const TOGGLES: { key: keyof Permissions; label: string }[] = [
  { key: "view_all_leads", label: "View all leads" },
  { key: "reassign_leads", label: "Reassign leads" },
  { key: "export", label: "Export" },
  { key: "create_fields", label: "Create custom fields" },
  { key: "send_quotations", label: "Send quotations" },
];

export default function UsersPage() {
  const { state, upsertUser, toast } = useDemo();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const deactivate = (u: User) => {
    upsertUser({ ...u, isActive: !u.isActive, inRotation: u.isActive ? false : u.inRotation });
    if (u.isActive) toast("Open leads return to Admin for reassignment");
  };

  return (
    <AdminGate>
      <PageHeader
        title="Users"
        subtitle="Two roles: Admin and Salesperson. New salespeople start with all five toggles off. Deactivating a user returns open leads to Admin."
        actions={<Button onClick={() => setOpen(true)}>Add salesperson</Button>}
      />
      <div className="space-y-3">
        {state.users.map((u) => (
          <Card key={u.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar initials={u.initials} />
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-[var(--muted)]">{u.email} · {u.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{u.role}</Badge>
                <Badge color={u.isActive ? "#16A34A" : "#c45c5c"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                {u.role !== "admin" ? (
                  <Button size="sm" variant="outline" onClick={() => deactivate(u)}>
                    {u.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                ) : null}
              </div>
            </div>
            {u.role === "salesperson" ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {TOGGLES.map((t) => (
                  <label key={t.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={u.permissions[t.key]}
                      onChange={(e) =>
                        upsertUser({
                          ...u,
                          permissions: { ...u.permissions, [t.key]: e.target.checked },
                        })
                      }
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">Admin always has every permission.</p>
            )}
          </Card>
        ))}
      </div>
      <Modal open={open} title="Add salesperson" onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Button
            onClick={() => {
              upsertUser({ name, email, phone });
              setOpen(false);
              setName("");
              setEmail("");
              setPhone("");
            }}
            disabled={!name || !email}
          >
            Create
          </Button>
        </div>
      </Modal>
    </AdminGate>
  );
}
