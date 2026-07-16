import type {
  Project,
  Milestone,
  Expense,
  ProjectPhoto,
  QuoteRecord,
  Contractor,
} from "./types";

// ─── Base ─────────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () =>
    request<Project[]>("/projects"),

  get: (id: number) =>
    request<Project>(`/projects/${id}`),

  create: (data: Omit<Project, "id">) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ─── Milestones ───────────────────────────────────────────────────────────────

export const milestonesApi = {
  list: (projectId: number) =>
    request<Milestone[]>(`/projects/${projectId}/milestones`),

  create: (projectId: number, data: Omit<Milestone, "id">) =>
    request<Milestone>(`/projects/${projectId}/milestones`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (projectId: number, milestoneId: number, data: Partial<Milestone>) =>
    request<Milestone>(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  remove: (projectId: number, milestoneId: number) =>
    request<void>(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: "DELETE",
    }),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expensesApi = {
  list: (projectId: number) =>
    request<Expense[]>(`/projects/${projectId}/expenses`),

  create: (projectId: number, data: Omit<Expense, "id">) =>
    request<Expense>(`/projects/${projectId}/expenses`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (projectId: number, expenseId: number, data: Partial<Expense>) =>
    request<Expense>(`/projects/${projectId}/expenses/${expenseId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  remove: (projectId: number, expenseId: number) =>
    request<void>(`/projects/${projectId}/expenses/${expenseId}`, {
      method: "DELETE",
    }),
};

// ─── Photos ───────────────────────────────────────────────────────────────────

export const photosApi = {
  list: (projectId: number) =>
    request<ProjectPhoto[]>(`/projects/${projectId}/photos`),

  // Multipart upload — caller builds the FormData
  upload: (projectId: number, formData: FormData) =>
    fetch(`${BASE_URL}/projects/${projectId}/photos`, {
      method: "POST",
      body: formData,
    }).then(async res => {
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json() as Promise<ProjectPhoto>;
    }),

  remove: (projectId: number, photoId: number) =>
    request<void>(`/projects/${projectId}/photos/${photoId}`, {
      method: "DELETE",
    }),
};

// ─── Quotes ───────────────────────────────────────────────────────────────────

export const quotesApi = {
  list: () =>
    request<QuoteRecord[]>("/quotes"),

  get: (id: number) =>
    request<QuoteRecord>(`/quotes/${id}`),

  create: (data: Omit<QuoteRecord, "id">) =>
    request<QuoteRecord>("/quotes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<QuoteRecord>) =>
    request<QuoteRecord>(`/quotes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  generateProject: (quoteId: number) =>
    request<Project>(`/quotes/${quoteId}/generate-project`, {
      method: "POST",
    }),
};

// ─── Contractors ──────────────────────────────────────────────────────────────

export const contractorsApi = {
  list: () =>
    request<Contractor[]>("/contractors"),

  create: (data: Omit<Contractor, "id">) =>
    request<Contractor>("/contractors", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Contractor>) =>
    request<Contractor>(`/contractors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  remove: (id: number) =>
    request<void>(`/contractors/${id}`, { method: "DELETE" }),
};
