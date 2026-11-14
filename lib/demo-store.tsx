"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState } from "@/lib/bootstrap";
import type {
  ActivityStatus,
  ActivityType,
  AppSettings,
  AssignmentShare,
  CustomField,
  EmailTemplate,
  FieldType,
  Lead,
  Permissions,
  Quotation,
  QuotationItem,
  Stage,
  User,
} from "@/lib/types";

export type DemoState = AppState & { sessionUserId: string | null };

type Toast = { id: string; message: string; tone?: "ok" | "err" | "info" };

type DemoContextValue = {
  ready: boolean;
  state: DemoState;
  currentUser: User | null;
  isAdmin: boolean;
  can: (key: keyof Permissions) => boolean;
  visibleLeads: Lead[];
  toasts: Toast[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "duplicateOfId">) => Promise<Lead>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  addNote: (leadId: string, body: string) => Promise<void>;
  addActivity: (input: {
    leadId: string;
    type: ActivityType;
    description: string;
    dueAt: string;
    assignedTo: string;
    status?: ActivityStatus;
    silent?: boolean;
  }) => Promise<void>;
  completeActivity: (id: string) => Promise<void>;
  addQuotation: (q: Omit<Quotation, "id" | "createdAt">) => Promise<Quotation & { mailError?: string }>;
  sendQuotation: (id: string) => Promise<{ mailError?: string }>;
  testSmtp: () => Promise<{ to: string }>;
  markNotificationsRead: (ids?: string[]) => Promise<void>;
  upsertCustomField: (field: Partial<CustomField> & { label: string; type: FieldType }) => Promise<void>;
  upsertStage: (stage: Partial<Stage> & { name: string }) => Promise<void>;
  reorderStage: (id: string, dir: -1 | 1) => Promise<void>;
  upsertUser: (user: Partial<User> & { name: string; email: string; password?: string }) => Promise<void>;
  setAssignmentShares: (shares: AssignmentShare[]) => Promise<void>;
  upsertTemplate: (t: EmailTemplate) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  reprocessEvent: (id: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const DemoContext = createContext<DemoContextValue | null>(null);

const emptyState = (): DemoState => ({
  users: [],
  stages: [],
  leads: [],
  notes: [],
  activities: [],
  quotations: [],
  emailJobs: [],
  notifications: [],
  customFields: [],
  emailTemplates: [],
  assignmentShares: [],
  incomingEvents: [],
  settings: {
    companyName: "VS CRM",
    catalogApiUrl: "",
    catalogApiKey: "",
    smtp: { host: "", port: "587", username: "", password: "", fromName: "VOspaces", fromEmail: "" },
    meta: { verifyToken: "", appSecret: "", pageAccessToken: "", pageId: "" },
  },
  sessionUserId: null,
});

function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

async function parseJson(res: Response) {
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    state?: AppState;
    leadId?: string;
    quotationId?: string;
    sent?: boolean;
    mailError?: string;
    to?: string;
  };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(emptyState);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(false);

  const toast = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = nid("toast");
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const applyState = useCallback((next: AppState, user?: User | null) => {
    setState({ ...next, sessionUserId: user?.id ?? currentUser?.id ?? null });
    if (user) setCurrentUser(user);
  }, [currentUser?.id]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/bootstrap", { cache: "no-store" });
    if (res.status === 401) {
      setCurrentUser(null);
      setState(emptyState());
      return;
    }
    const data = await parseJson(res);
    if (data.state) applyState(data.state, (data as { user?: User }).user ?? currentUser);
  }, [applyState, currentUser]);

  useEffect(() => {
    refresh().finally(() => setReady(true));
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = useCallback(
    async (type: string, payload: Record<string, unknown>) => {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });
      const data = await parseJson(res);
      if (data.state) applyState(data.state);
      return data;
    },
    [applyState],
  );

  const isAdmin = currentUser?.role === "admin";

  const can = useCallback(
    (key: keyof Permissions) => {
      if (!currentUser) return false;
      if (currentUser.role === "admin") return true;
      return currentUser.permissions[key];
    },
    [currentUser],
  );

  const visibleLeads = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "admin" || currentUser.permissions.view_all_leads) return state.leads;
    return state.leads.filter((l) => l.assignedTo === currentUser.id);
  }, [currentUser, state.leads]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJson(res);
    if (data.state) {
      applyState(data.state, (data as { user?: User }).user ?? null);
      return;
    }
    const boot = await fetch("/api/bootstrap", { cache: "no-store" });
    const next = await parseJson(boot);
    applyState(next.state!, (next as { user?: User }).user ?? null);
  }, [applyState]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setState(emptyState());
  }, []);

  const addLead: DemoContextValue["addLead"] = useCallback(
    async (lead) => {
      const data = await act("lead.create", lead as unknown as Record<string, unknown>);
      const created = (data.state as AppState | undefined)?.leads.find((l) => l.id === data.leadId);
      if (!created) throw new Error("Lead was created but could not be loaded");
      toast("Lead created");
      return created;
    },
    [act, toast],
  );

  const updateLead = useCallback(
    async (id: string, patch: Partial<Lead>) => {
      await act("lead.update", { id, patch });
    },
    [act],
  );

  const addNote = useCallback(
    async (leadId: string, body: string) => {
      await act("note.create", { leadId, body });
      toast("Note added");
    },
    [act, toast],
  );

  const addActivity: DemoContextValue["addActivity"] = useCallback(
    async (input) => {
      const { silent, ...rest } = input;
      await act("activity.create", rest);
      if (!silent) toast(rest.status === "completed" ? "Activity marked done" : "Activity scheduled");
    },
    [act, toast],
  );

  const completeActivity = useCallback(
    async (id: string) => {
      await act("activity.complete", { id });
      toast("Marked complete");
    },
    [act, toast],
  );

  const addQuotation: DemoContextValue["addQuotation"] = useCallback(
    async (q) => {
      const data = await act("quotation.create", q as unknown as Record<string, unknown>);
      const created = (data.state as AppState | undefined)?.quotations.find((item) => item.id === data.quotationId);
      if (!created) throw new Error("Quotation was saved but could not be loaded");
      return { ...created, mailError: data.mailError };
    },
    [act],
  );

  const sendQuotation: DemoContextValue["sendQuotation"] = useCallback(
    async (id) => {
      const data = await act("quotation.send", { id });
      return { mailError: data.mailError };
    },
    [act],
  );

  const testSmtp: DemoContextValue["testSmtp"] = useCallback(
    async () => {
      const data = await act("smtp.test", {});
      if (!data.to) throw new Error("Test email did not report a recipient");
      return { to: data.to };
    },
    [act],
  );

  const markNotificationsRead = useCallback(
    async (ids?: string[]) => {
      await act("notifications.read", { ids });
    },
    [act],
  );

  const upsertCustomField: DemoContextValue["upsertCustomField"] = useCallback(
    async (field) => {
      await act("field.upsert", field as unknown as Record<string, unknown>);
      toast(field.id ? "Field updated" : "Custom field created");
    },
    [act, toast],
  );

  const upsertStage: DemoContextValue["upsertStage"] = useCallback(
    async (stage) => {
      await act("stage.upsert", stage as unknown as Record<string, unknown>);
      toast(stage.id ? "Stage updated" : "Stage created");
    },
    [act, toast],
  );

  const reorderStage = useCallback(
    async (id: string, dir: -1 | 1) => {
      await act("stage.reorder", { id, dir });
    },
    [act],
  );

  const upsertUser: DemoContextValue["upsertUser"] = useCallback(
    async (user) => {
      await act("user.upsert", user as unknown as Record<string, unknown>);
      toast(user.id ? "User updated" : "User created");
    },
    [act, toast],
  );

  const setAssignmentShares = useCallback(
    async (shares: AssignmentShare[]) => {
      await act("assignment.shares", { shares });
      toast("Assignment saved");
    },
    [act, toast],
  );

  const upsertTemplate = useCallback(
    async (t: EmailTemplate) => {
      await act("template.upsert", t as unknown as Record<string, unknown>);
      toast("Template saved");
    },
    [act, toast],
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      await act("settings.update", patch);
      toast("Settings saved");
    },
    [act, toast],
  );

  const reprocessEvent = useCallback(
    async (id: string) => {
      await act("event.reprocess", { id });
      toast("Event reprocessed");
    },
    [act, toast],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      await act("password.update", { password });
      toast("Password updated");
    },
    [act, toast],
  );

  const value: DemoContextValue = {
    ready,
    state,
    currentUser,
    isAdmin: Boolean(isAdmin),
    can,
    visibleLeads,
    toasts,
    login,
    logout,
    toast,
    dismissToast,
    addLead,
    updateLead,
    addNote,
    addActivity,
    completeActivity,
    addQuotation,
    sendQuotation,
    testSmtp,
    markNotificationsRead,
    upsertCustomField,
    upsertStage,
    reorderStage,
    upsertUser,
    setAssignmentShares,
    upsertTemplate,
    updateSettings,
    reprocessEvent,
    updatePassword,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}

export function useUserMap() {
  const { state } = useDemo();
  return useMemo(() => Object.fromEntries(state.users.map((u) => [u.id, u])), [state.users]);
}

export function useStageMap() {
  const { state } = useDemo();
  return useMemo(() => Object.fromEntries(state.stages.map((s) => [s.id, s])), [state.stages]);
}

export type { QuotationItem };
