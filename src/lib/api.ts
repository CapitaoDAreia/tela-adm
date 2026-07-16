import type {
  Project,
  Milestone,
  Expense,
  ProjectPhoto,
  QuoteRecord,
  Contractor,
} from "./types";
import db from "../../db.json";

// ─── In-memory store (inicializado a partir de db.json) ───────────────────────
//
// Todas as operações operam sobre este store em memória.
// Alterações persistem durante a sessão mas não sobrevivem ao reload — ok para protótipo.
// Para conectar ao backend real: substituir cada função por um fetch() equivalente.

const store = {
  projects:    structuredClone(db.projects)    as Project[],
  quotes:      structuredClone(db.quotes)      as QuoteRecord[],
  contractors: structuredClone(db.contractors) as Contractor[],
};

const ok  = <T>(data: T) => Promise.resolve(data);
const noop = ()           => Promise.resolve();

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () =>
    ok([...store.projects]),

  get: (id: number) =>
    ok(store.projects.find(p => p.id === id)!),

  create: (data: Omit<Project, "id">) => {
    const created = { ...data, id: Date.now() } as Project;
    store.projects.push(created);
    return ok(created);
  },

  update: (id: number, data: Partial<Project>) => {
    const idx = store.projects.findIndex(p => p.id === id);
    if (idx !== -1) store.projects[idx] = { ...store.projects[idx], ...data };
    return ok(store.projects[idx]);
  },
};

// ─── Milestones ───────────────────────────────────────────────────────────────

export const milestonesApi = {
  list: (projectId: number) => {
    const p = store.projects.find(p => p.id === projectId);
    return ok([...(p?.milestones ?? [])]);
  },

  create: (projectId: number, data: Omit<Milestone, "id">) => {
    const created = { ...data, id: Date.now() } as Milestone;
    const p = store.projects.find(p => p.id === projectId);
    p?.milestones.push(created);
    return ok(created);
  },

  update: (projectId: number, milestoneId: number, data: Partial<Milestone>) => {
    const p = store.projects.find(p => p.id === projectId);
    const idx = p?.milestones.findIndex(m => m.id === milestoneId) ?? -1;
    if (p && idx !== -1) p.milestones[idx] = { ...p.milestones[idx], ...data };
    return ok(p!.milestones[idx]);
  },

  remove: (projectId: number, milestoneId: number) => {
    const p = store.projects.find(p => p.id === projectId);
    if (p) p.milestones = p.milestones.filter(m => m.id !== milestoneId);
    return noop();
  },
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expensesApi = {
  list: (projectId: number) => {
    const p = store.projects.find(p => p.id === projectId);
    return ok([...(p?.expenses ?? [])]);
  },

  create: (projectId: number, data: Omit<Expense, "id">) => {
    const created = { ...data, id: Date.now() } as Expense;
    const p = store.projects.find(p => p.id === projectId);
    p?.expenses.push(created);
    return ok(created);
  },

  update: (projectId: number, expenseId: number, data: Partial<Expense>) => {
    const p = store.projects.find(p => p.id === projectId);
    const idx = p?.expenses.findIndex(e => e.id === expenseId) ?? -1;
    if (p && idx !== -1) p.expenses[idx] = { ...p.expenses[idx], ...data };
    return ok(p!.expenses[idx]);
  },

  remove: (projectId: number, expenseId: number) => {
    const p = store.projects.find(p => p.id === projectId);
    if (p) p.expenses = p.expenses.filter(e => e.id !== expenseId);
    return noop();
  },
};

// ─── Photos ───────────────────────────────────────────────────────────────────

export const photosApi = {
  list: (projectId: number) => {
    const p = store.projects.find(p => p.id === projectId);
    return ok([...(p?.photos ?? [])]);
  },

  upload: (_projectId: number, _formData: FormData) =>
    ok({ id: Date.now(), url: "", caption: "", date: "" } as ProjectPhoto),

  remove: (projectId: number, photoId: number) => {
    const p = store.projects.find(p => p.id === projectId);
    if (p) p.photos = p.photos.filter(ph => ph.id !== photoId);
    return noop();
  },
};

// ─── Quotes ───────────────────────────────────────────────────────────────────

export const quotesApi = {
  list: () =>
    ok([...store.quotes]),

  get: (id: number) =>
    ok(store.quotes.find(q => q.id === id)!),

  create: (data: Omit<QuoteRecord, "id">) => {
    const created = { ...data, id: Date.now() } as QuoteRecord;
    store.quotes.unshift(created);
    return ok(created);
  },

  update: (id: number, data: Partial<QuoteRecord>) => {
    const idx = store.quotes.findIndex(q => q.id === id);
    if (idx !== -1) store.quotes[idx] = { ...store.quotes[idx], ...data };
    return ok(store.quotes[idx]);
  },

  generateProject: (quoteId: number) => {
    const q = store.quotes.find(q => q.id === quoteId)!;
    const lastName = q.clientName.split(" ").pop() ?? q.clientName;
    const created: Project = {
      id: Date.now(),
      name: `Studio ${lastName}`,
      client: q.clientName,
      status: "Em andamento",
      progress: 0,
      budgeted: q.budgeted,
      contractValue: q.contractValue,
      spent: 0,
      expenses: [],
      milestones: q.items.map((item, i) => ({
        id: i + 1,
        label: item.title,
        done: false,
        date: "",
        status: "Pendente",
        description: item.description,
        startDate: "",
        deadline: "",
        completedAt: "",
        photos: [],
      })),
      photos: [],
      phase: "Iniciando",
      location: "–",
      image: "",
      startDate: q.startDate || "–",
      endDate: q.endDate || "–",
      quoteDeadline: q.quoteDeadline ?? "",
    };
    store.projects.push(created);
    return ok(created);
  },
};

// ─── Contractors ──────────────────────────────────────────────────────────────

export const contractorsApi = {
  list: () =>
    ok([...store.contractors]),

  create: (data: Omit<Contractor, "id">) => {
    const created = { ...data, id: Date.now() } as Contractor;
    store.contractors.push(created);
    return ok(created);
  },

  update: (id: number, data: Partial<Contractor>) => {
    const idx = store.contractors.findIndex(c => c.id === id);
    if (idx !== -1) store.contractors[idx] = { ...store.contractors[idx], ...data };
    return ok(store.contractors[idx]);
  },

  remove: (id: number) => {
    store.contractors = store.contractors.filter(c => c.id !== id);
    return noop();
  },
};
