// ─── Domain types ─────────────────────────────────────────────────────────────

export type Screen =
  | "dashboard"
  | "detail"
  | "newQuote"
  | "quotes"
  | "quoteDetail"
  | "empreiteiros";

export type DetailTab = "visao" | "etapas" | "despesas" | "galeria" | "cronograma";

// ─── Contractors ──────────────────────────────────────────────────────────────

export interface Contractor {
  id: number;
  name: string;
  phone: string;
  specialty: string;
  status: "Ativo" | "Inativo";
  notes?: string;
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export interface QuoteItem {
  id: number;
  title: string;
  description: string;
  amount: string;
}

export type QuoteStatus = "Solicitado" | "Em análise" | "Aprovado" | "Cancelado";

export interface QuoteHistoryEntry {
  datetime: string;
  description: string;
}

export interface QuoteRecord {
  id: number;
  clientName: string;
  phone: string;
  description: string;
  items: QuoteItem[];
  budgeted: number;
  contractValue: number;
  urgency: string;
  quoteDeadline?: string;
  startDate: string;
  endDate: string;
  status: QuoteStatus;
  cancellationReason?: string;
  analysisStartedAt?: string;
  history: QuoteHistoryEntry[];
  createdAt: string;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | "Em andamento"
  | "Concluído"
  | "Pausado"
  | "Cancelada"
  | "Orçamento";

export interface Expense {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  notes?: string;
  isPayment?: boolean;
  paymentStatus?: "Realizado" | "A fazer";
  dueDate?: string;
}

export type StepStatus = "Concluído" | "Em andamento" | "Pendente" | "Cancelado";

export interface MilestoneMaterial {
  id: number;
  description: string;
  status: "Pendente" | "Pedido" | "Recebido";
}

export interface Milestone {
  id?: number;
  label: string;
  done: boolean;
  date: string;
  status: StepStatus;
  description: string;
  startDate?: string;
  startedAt?: string;
  deadline: string;
  completedAt: string;
  photos: string[];
  contractorName?: string;
  contractorPhone?: string;
  contractorValue?: number;
  contractorStatus?: "Não contratado" | "Contratado" | "Em execução" | "Concluído";
  materials?: MilestoneMaterial[];
}

export interface ProjectHistoryEntry {
  datetime: string;
  description: string;
}

export interface ProjectPhoto {
  id?: number;
  url: string;
  caption: string;
  date: string;
}

export interface Project {
  id: number;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  contractValue: number;
  budgeted: number;
  spent: number;
  phase: string;
  location: string;
  startDate: string;
  endDate: string;
  quoteDeadline: string;
  image: string;
  expenses: Expense[];
  milestones: Milestone[];
  photos: ProjectPhoto[];
  history?: ProjectHistoryEntry[];
  cancelReason?: string;
}
