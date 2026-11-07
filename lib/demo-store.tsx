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
import { nowIso, slugify } from "@/lib/format";
import * as seed from "@/lib/mock/seed";
import type {
  Activity,
  ActivityStatus,
  ActivityType,
  AppNotification,
  AppSettings,
  AssignmentRule,
  CustomField,
  EmailJob,
  EmailTemplate,
  FieldType,
  IncomingEvent,
  Lead,
  Note,
  Permissions,
  Quotation,
  QuotationItem,
  Role,
  Stage,
  User,
} from "@/lib/types";

export type DemoState = {
  users: User[];
  stages: Stage[];
  leads: Lead[];
  notes: Note[];
  activities: Activity[];
  quotations: Quotation[];
  emailJobs: EmailJob[];
  notifications: AppNotification[];
  customFields: CustomField[];
  emailTemplates: EmailTemplate[];
  assignmentRules: AssignmentRule[];
  incomingEvents: IncomingEvent[];
  settings: AppSettings;
  sessionUserId: string | null;
};

type Toast = { id: string; message: string; tone?: "ok" | "err" | "info" };

type DemoContextValue = {
  ready: boolean;
  state: DemoState;
  currentUser: User | null;
  isAdmin: boolean;
  can: (key: keyof Permissions) => boolean;
  visibleLeads: Lead[];
  toasts: Toast[];
  loginAs: (userId: string) => void;
  logout: () => void;
  switchPreview: (role: Role) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "duplicateOfId">) => Lead;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  addNote: (leadId: string, body: string) => void;
  addActivity: (input: {
    leadId: string;
    type: ActivityType;
    description: string;
    dueAt: string;
    assignedTo: string;
    status?: ActivityStatus;
    silent?: boolean;
  }) => void;
  completeActivity: (id: string) => void;
  addQuotation: (q: Omit<Quotation, "id" | "createdAt">) => Quotation;
  updateQuotation: (id: string, patch: Partial<Quotation>) => void;
  markNotificationsRead: (ids?: string[]) => void;
  upsertCustomField: (field: Partial<CustomField> & { label: string; type: FieldType }) => void;
  upsertStage: (stage: Partial<Stage> & { name: string }) => void;
  reorderStage: (id: string, dir: -1 | 1) => void;
  upsertUser: (user: Partial<User> & { name: string; email: string }) => void;
  setAssignmentRules: (rules: AssignmentRule[]) => void;
  setAllocations: (percents: Record<string, number>) => void;
  upsertTemplate: (t: EmailTemplate) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  reprocessEvent: (id: string) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

const SESSION_KEY = "vs-crm-session-user";

function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function initialState(): DemoState {
  return {
    users: seed.users,
    stages: seed.stages,
    leads: seed.leads,
    notes: seed.notes,
    activities: seed.activities,
    quotations: seed.quotations,
    emailJobs: seed.emailJobs,
    notifications: seed.notifications,
    customFields: seed.customFields,
    emailTemplates: seed.emailTemplates,
    assignmentRules: seed.assignmentRules,
    incomingEvents: seed.incomingEvents,
    settings: seed.settings,
    sessionUserId: null,
  };
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.localStorage.getItem(SESSION_KEY);
    if (id) setState((s) => ({ ...s, sessionUserId: id }));
    setReady(true);
  }, []);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.sessionUserId) ?? null,
    [state.users, state.sessionUserId],
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

  const toast = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = nid("toast");
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const loginAs = useCallback((userId: string) => {
    window.localStorage.setItem(SESSION_KEY, userId);
    setState((s) => ({ ...s, sessionUserId: userId }));
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setState((s) => ({ ...s, sessionUserId: null }));
  }, []);

  const switchPreview = useCallback(
    (role: Role) => {
      const next =
        role === "admin"
          ? state.users.find((u) => u.role === "admin")
          : state.users.find((u) => u.role === "salesperson" && u.isActive);
      if (next) {
        window.localStorage.setItem(SESSION_KEY, next.id);
        setState((s) => ({ ...s, sessionUserId: next.id }));
        toast(`Previewing as ${next.name}`, "info");
      }
    },
    [state.users, toast],
  );

  const addLead: DemoContextValue["addLead"] = useCallback((lead) => {
    const created: Lead = {
      ...lead,
      id: nid("ld"),
      createdAt: nowIso(),
      duplicateOfId: null,
    };
    setState((s) => ({ ...s, leads: [created, ...s.leads] }));
    toast("Lead created");
    return created;
  }, [toast]);

  const updateLead = useCallback(
    (id: string, patch: Partial<Lead>) => {
      setState((s) => ({
        ...s,
        leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
    },
    [],
  );

  const addNote = useCallback(
    (leadId: string, body: string) => {
      if (!state.sessionUserId) return;
      const note: Note = {
        id: nid("nt"),
        leadId,
        body,
        authorId: state.sessionUserId,
        createdAt: nowIso(),
      };
      setState((s) => ({ ...s, notes: [note, ...s.notes] }));
      toast("Note added");
    },
    [state.sessionUserId, toast],
  );

  const addActivity: DemoContextValue["addActivity"] = useCallback(
    (input) => {
      const { silent, status, ...rest } = input;
      const activity: Activity = {
        id: nid("ac"),
        ...rest,
        status: status ?? "pending",
        completedAt: status === "completed" ? nowIso() : null,
      };
      setState((s) => ({ ...s, activities: [activity, ...s.activities] }));
      if (!silent) toast(status === "completed" ? "Activity marked done" : "Activity scheduled");
    },
    [toast],
  );

  const completeActivity = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        activities: s.activities.map((a) =>
          a.id === id ? { ...a, status: "completed", completedAt: nowIso() } : a,
        ),
      }));
      toast("Marked complete");
    },
    [toast],
  );

  const addQuotation: DemoContextValue["addQuotation"] = useCallback(
    (q) => {
      const created: Quotation = { ...q, id: nid("qt"), createdAt: nowIso() };
      setState((s) => ({ ...s, quotations: [created, ...s.quotations] }));
      return created;
    },
    [],
  );

  const updateQuotation = useCallback((id: string, patch: Partial<Quotation>) => {
    setState((s) => ({
      ...s,
      quotations: s.quotations.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));
  }, []);

  const markNotificationsRead = useCallback((ids?: string[]) => {
    const at = nowIso();
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => {
        if (n.userId !== s.sessionUserId) return n;
        if (ids && !ids.includes(n.id)) return n;
        return { ...n, readAt: n.readAt ?? at };
      }),
    }));
  }, []);

  const upsertCustomField: DemoContextValue["upsertCustomField"] = useCallback(
    (field) => {
      setState((s) => {
        if (field.id) {
          return {
            ...s,
            customFields: s.customFields.map((f) => (f.id === field.id ? { ...f, ...field } : f)),
          };
        }
        const key = slugify(field.label);
        if (s.customFields.some((f) => f.key === key)) {
          return s;
        }
        const created: CustomField = {
          id: nid("cf"),
          key,
          label: field.label,
          type: field.type,
          options: field.options ?? [],
          required: field.required ?? false,
          isActive: true,
          createdBy: s.sessionUserId ?? seed.ADMIN_ID,
          group: field.group ?? "Enquiry details",
          defaultValue: field.defaultValue ?? "",
        };
        return { ...s, customFields: [...s.customFields, created] };
      });
      toast(field.id ? "Field updated" : "Custom field created");
    },
    [toast],
  );

  const upsertStage: DemoContextValue["upsertStage"] = useCallback(
    (stage) => {
      setState((s) => {
        if (stage.id) {
          return { ...s, stages: s.stages.map((st) => (st.id === stage.id ? { ...st, ...stage } : st)) };
        }
        const created: Stage = {
          id: nid("st"),
          name: stage.name,
          position: s.stages.length + 1,
          isActive: true,
          kind: stage.kind ?? "open",
          color: stage.color ?? "#64748B",
        };
        return { ...s, stages: [...s.stages, created] };
      });
      toast(stage.id ? "Stage updated" : "Stage created");
    },
    [toast],
  );

  const reorderStage = useCallback((id: string, dir: -1 | 1) => {
    setState((s) => {
      const ordered = [...s.stages].sort((a, b) => a.position - b.position);
      const idx = ordered.findIndex((st) => st.id === id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= ordered.length) return s;
      const tmp = ordered[idx];
      ordered[idx] = ordered[swap];
      ordered[swap] = tmp;
      return {
        ...s,
        stages: ordered.map((st, i) => ({ ...st, position: i + 1 })),
      };
    });
  }, []);

  const upsertUser: DemoContextValue["upsertUser"] = useCallback(
    (user) => {
      setState((s) => {
        if (user.id) {
          return { ...s, users: s.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)) };
        }
        const created: User = {
          id: nid("u"),
          name: user.name,
          email: user.email,
          role: "salesperson",
          isActive: true,
          allocationPercent: 0,
          inRotation: false,
          permissions: {
            view_all_leads: false,
            reassign_leads: false,
            export: false,
            create_fields: false,
            send_quotations: false,
          },
          phone: user.phone ?? "",
          initials: user.name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        };
        return { ...s, users: [...s.users, created] };
      });
      toast(user.id ? "User updated" : "User created");
    },
    [toast],
  );

  const setAssignmentRules = useCallback((rules: AssignmentRule[]) => {
    setState((s) => ({ ...s, assignmentRules: rules }));
    toast("Assignment rules saved");
  }, [toast]);

  const setAllocations = useCallback(
    (percents: Record<string, number>) => {
      const total = Object.values(percents).reduce((a, b) => a + b, 0);
      if (total !== 100) {
        toast("Percentages must total 100", "err");
        return;
      }
      setState((s) => ({
        ...s,
        users: s.users.map((u) =>
          percents[u.id] === undefined ? u : { ...u, allocationPercent: percents[u.id], inRotation: percents[u.id] > 0 },
        ),
      }));
      toast("Allocation saved");
    },
    [toast],
  );

  const upsertTemplate = useCallback(
    (t: EmailTemplate) => {
      setState((s) => ({
        ...s,
        emailTemplates: s.emailTemplates.some((x) => x.id === t.id)
          ? s.emailTemplates.map((x) => (x.id === t.id ? t : x))
          : [...s.emailTemplates, t],
      }));
      toast("Template saved");
    },
    [toast],
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    toast("Settings saved");
  }, [toast]);

  const reprocessEvent = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        incomingEvents: s.incomingEvents.map((e) =>
          e.id === id ? { ...e, status: "processed", lastError: null } : e,
        ),
      }));
      toast("Event reprocessed");
    },
    [toast],
  );

  const value: DemoContextValue = {
    ready,
    state,
    currentUser,
    isAdmin,
    can,
    visibleLeads,
    toasts,
    loginAs,
    logout,
    switchPreview,
    toast,
    dismissToast,
    addLead,
    updateLead,
    addNote,
    addActivity,
    completeActivity,
    addQuotation,
    updateQuotation,
    markNotificationsRead,
    upsertCustomField,
    upsertStage,
    reorderStage,
    upsertUser,
    setAssignmentRules,
    setAllocations,
    upsertTemplate,
    updateSettings,
    reprocessEvent,
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
