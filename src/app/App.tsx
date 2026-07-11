import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Plus, Building2, TrendingUp, Clock, ArrowLeft, X,
  Camera, FileText, LayoutDashboard, Receipt, Image,
  CheckCircle, Circle, Upload, Phone, User, DollarSign,
  HardHat, Wrench, Home, CalendarDays, CalendarCheck, CalendarClock,
  ListChecks, ChevronRight, Trash2, PackagePlus, ClipboardList, FilePlus,
  Printer, ShieldCheck, HardHatIcon, FileBarChart2
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Screen = "dashboard" | "detail" | "newQuote" | "quotes" | "quoteDetail";

interface QuoteItem {
  id: number;
  title: string;
  description: string;
  amount: string;
}

type QuoteStatus = "Solicitado" | "Em análise" | "Aprovado" | "Cancelado";

interface QuoteHistoryEntry {
  datetime: string;
  description: string;
}

interface QuoteRecord {
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

type ProjectStatus = "Em andamento" | "Concluído" | "Pausado" | "Orçamento";

interface Expense {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
}

type StepStatus = "Concluído" | "Em andamento" | "Pendente" | "Cancelado";

interface Milestone {
  label: string;
  done: boolean;
  date: string;
  status: StepStatus;
  description: string;
  deadline: string;
  completedAt: string;
  photos: string[];
}

interface Project {
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
  photos: { url: string; caption: string; date: string }[];
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const PROJECTS: Project[] = [
  {
    id: 1,
    name: "Studio Monteiro",
    client: "Rafael Monteiro",
    status: "Em andamento",
    progress: 62,
    contractValue: 104400,
    budgeted: 87000,
    spent: 53940,
    phase: "Acabamento – piso e pintura",
    location: "Ap. 74 · Ed. Araucária, Pinheiros – SP",
    startDate: "10/03/2025",
    endDate: "29/08/2025",
    quoteDeadline: "28/02/2025",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=500&fit=crop&auto=format",
    expenses: [
      { id: 1, date: "02 Jul 2025", description: "Porcelanato 60×60 – área social", category: "Material", amount: 4800 },
      { id: 2, date: "28 Jun 2025", description: "Mão de obra – pintura interna", category: "Serviço", amount: 2900 },
      { id: 3, date: "21 Jun 2025", description: "Instalação elétrica – pontos extras", category: "Serviço", amount: 1950 },
      { id: 4, date: "15 Jun 2025", description: "Bancada de quartzo – cozinha compacta", category: "Material", amount: 3400 },
      { id: 5, date: "07 Jun 2025", description: "Louças e metais – banheiro", category: "Material", amount: 2750 },
    ],
    milestones: [
      { label: "Demolição e limpeza", done: true, date: "Mar 2025", status: "Concluído", description: "Remoção do revestimento existente, demolição de paredes não estruturais e limpeza completa do apartamento.", deadline: "20/03/2025", completedAt: "18/03/2025", photos: ["https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=400&h=300&fit=crop"] },
      { label: "Instalações hidráulicas", done: true, date: "Abr 2025", status: "Concluído", description: "Substituição de toda a tubulação de água fria, quente e esgoto do banheiro e cozinha compacta.", deadline: "30/04/2025", completedAt: "28/04/2025", photos: [] },
      { label: "Instalações elétricas", done: true, date: "Mai 2025", status: "Concluído", description: "Passagem de fiação nova, instalação de quadro de distribuição e pontos de tomada conforme projeto.", deadline: "30/05/2025", completedAt: "27/05/2025", photos: [] },
      { label: "Revestimentos e piso", done: false, date: "Jul 2025", status: "Em andamento", description: "Assentamento de porcelanato 60×60 na área social e banheiro, incluindo rejunte e rodapés.", deadline: "25/07/2025", completedAt: "", photos: [] },
      { label: "Pintura e acabamentos", done: false, date: "Ago 2025", status: "Pendente", description: "Aplicação de massa corrida, tinta látex premium em todas as paredes e teto, instalação de luminárias.", deadline: "29/08/2025", completedAt: "", photos: [] },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop&auto=format", caption: "Cozinha compacta – pré-acabamento", date: "30 Jun 2025" },
      { url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&h=400&fit=crop&auto=format", caption: "Área integrada – reboco pronto", date: "22 Jun 2025" },
      { url: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=600&h=400&fit=crop&auto=format", caption: "Banheiro – azulejo assentado", date: "14 Jun 2025" },
    ],
  },
  {
    id: 2,
    name: "Studio Ferreira",
    client: "Camila Ferreira",
    status: "Em andamento",
    progress: 38,
    contractValue: 88800,
    budgeted: 74000,
    spent: 28120,
    phase: "Alvenaria e instalações",
    location: "Ap. 32 · Ed. Vila Nova, Vila Madalena – SP",
    startDate: "05/05/2025",
    endDate: "31/10/2025",
    quoteDeadline: "25/04/2025",
    image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=500&fit=crop&auto=format",
    expenses: [
      { id: 1, date: "03 Jul 2025", description: "Tijolo de vedação – paredes divisórias", category: "Material", amount: 1800 },
      { id: 2, date: "01 Jul 2025", description: "Mão de obra – alvenaria", category: "Serviço", amount: 3200 },
      { id: 3, date: "25 Jun 2025", description: "Tubulação hidráulica – banheiro e cozinha", category: "Material", amount: 1450 },
    ],
    milestones: [
      { label: "Demolição e adequação", done: true, date: "Mai 2025", status: "Concluído", description: "Demolição de revestimentos e adaptação do layout conforme projeto aprovado.", deadline: "10/05/2025", completedAt: "09/05/2025", photos: ["https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=400&h=300&fit=crop"] },
      { label: "Alvenaria e divisórias", done: false, date: "Jul 2025", status: "Em andamento", description: "Construção das novas divisórias em alvenaria para separação de ambientes conforme planta.", deadline: "20/07/2025", completedAt: "", photos: [] },
      { label: "Instalações elétricas e hidráulicas", done: false, date: "Ago 2025", status: "Pendente", description: "Passagem de tubulações e fiação elétrica completa.", deadline: "31/08/2025", completedAt: "", photos: [] },
      { label: "Revestimentos e piso", done: false, date: "Set 2025", status: "Pendente", description: "", deadline: "30/09/2025", completedAt: "", photos: [] },
      { label: "Pintura e entrega", done: false, date: "Out 2025", status: "Pendente", description: "", deadline: "31/10/2025", completedAt: "", photos: [] },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=600&h=400&fit=crop&auto=format", caption: "Demolição concluída", date: "28 Jun 2025" },
    ],
  },
  {
    id: 3,
    name: "Studio Nakamura",
    client: "Yuki Nakamura",
    status: "Concluído",
    progress: 100,
    contractValue: 81600,
    budgeted: 68000,
    spent: 65500,
    phase: "Entregue",
    location: "Ap. 112 · Ed. Ouro Preto, Consolação – SP",
    startDate: "04/11/2024",
    endDate: "18/03/2025",
    quoteDeadline: "22/10/2024",
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=500&fit=crop&auto=format",
    expenses: [
      { id: 1, date: "18 Mar 2025", description: "Móvel planejado – parede multifuncional", category: "Material", amount: 9800 },
      { id: 2, date: "10 Mar 2025", description: "Mão de obra final e limpeza", category: "Serviço", amount: 1400 },
    ],
    milestones: [
      { label: "Demolição e limpeza", done: true, date: "Nov 2024", status: "Concluído", description: "Demolição completa do revestimento original.", deadline: "15/11/2024", completedAt: "14/11/2024", photos: [] },
      { label: "Instalações elétricas e hidráulicas", done: true, date: "Dez 2024", status: "Concluído", description: "Toda a infraestrutura de instalações substituída.", deadline: "20/12/2024", completedAt: "19/12/2024", photos: [] },
      { label: "Revestimentos e piso", done: true, date: "Jan 2025", status: "Concluído", description: "Porcelanato assentado em todo o apartamento.", deadline: "31/01/2025", completedAt: "28/01/2025", photos: [] },
      { label: "Pintura e acabamentos", done: true, date: "Fev 2025", status: "Concluído", description: "Pintura e instalações finais concluídas.", deadline: "28/02/2025", completedAt: "25/02/2025", photos: [] },
      { label: "Móveis e entrega", done: true, date: "Mar 2025", status: "Concluído", description: "Instalação de móveis planejados e entrega ao cliente.", deadline: "20/03/2025", completedAt: "18/03/2025", photos: ["https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&h=300&fit=crop"] },
    ],
    photos: [
      { url: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&h=400&fit=crop&auto=format", caption: "Área integrada – entregue", date: "18 Mar 2025" },
      { url: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&h=400&fit=crop&auto=format", caption: "Banheiro finalizado", date: "18 Mar 2025" },
    ],
  },
  {
    id: 4,
    name: "Studio Carvalho",
    client: "Bruno Carvalho",
    status: "Orçamento",
    progress: 0,
    contractValue: 109200,
    budgeted: 91000,
    spent: 0,
    phase: "Aguardando aprovação",
    location: "Ap. 205 · Ed. Parque Sul, Moema – SP",
    startDate: "–",
    endDate: "–",
    quoteDeadline: "18/07/2025",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=500&fit=crop&auto=format",
    expenses: [],
    milestones: [
      { label: "Visita técnica", done: true, date: "Jun 2025", status: "Concluído", description: "Visita ao apartamento para levantamento e medições.", deadline: "20/06/2025", completedAt: "18/06/2025", photos: [] },
      { label: "Aprovação do orçamento", done: false, date: "Jul 2025", status: "Pendente", description: "Aguardando assinatura do contrato e aprovação formal.", deadline: "18/07/2025", completedAt: "", photos: [] },
      { label: "Início da obra", done: false, date: "Ago 2025", status: "Pendente", description: "", deadline: "04/08/2025", completedAt: "", photos: [] },
    ],
    photos: [],
  },
];

const MOCK_QUOTES: QuoteRecord[] = [
  {
    id: 101,
    clientName: "Isabela Ramos",
    phone: "",
    description: "Studio 48m², Consolação",
    items: [
      { id: 1, title: "Demolição e limpeza", description: "", amount: "8000" },
      { id: 2, title: "Instalações hidráulicas", description: "", amount: "12000" },
      { id: 3, title: "Revestimentos e piso", description: "", amount: "22000" },
      { id: 4, title: "Pintura e acabamentos", description: "", amount: "14000" },
      { id: 5, title: "Móveis planejados", description: "", amount: "6000" },
    ],
    budgeted: 62000,
    contractValue: 74400,
    urgency: "Normal",
    quoteDeadline: "25/07/2025",
    startDate: "",
    endDate: "",
    status: "Em análise",
    analysisStartedAt: "08/07/2025 10:15",
    history: [
      { datetime: "08/07/2025 09:30", description: "Orçamento criado." },
      { datetime: "08/07/2025 10:15", description: "Análise iniciada." },
    ],
    createdAt: "08/07/2025 09:30",
  },
  {
    id: 102,
    clientName: "Fernando Costa",
    phone: "",
    description: "Studio 35m², Moema",
    items: [
      { id: 1, title: "Demolição", description: "", amount: "5000" },
      { id: 2, title: "Hidráulica e elétrica", description: "", amount: "18000" },
      { id: 3, title: "Piso e revestimentos", description: "", amount: "16000" },
      { id: 4, title: "Pintura", description: "", amount: "9000" },
    ],
    budgeted: 48000,
    contractValue: 57600,
    urgency: "Urgente",
    quoteDeadline: "15/07/2025",
    startDate: "",
    endDate: "",
    status: "Solicitado",
    history: [
      { datetime: "07/07/2025 14:15", description: "Orçamento criado." },
    ],
    createdAt: "07/07/2025 14:15",
  },
  {
    id: 103,
    clientName: "Mariana Luz",
    phone: "",
    description: "Studio 52m², Pinheiros",
    items: [
      { id: 1, title: "Demolição completa", description: "", amount: "9000" },
      { id: 2, title: "Hidráulica", description: "", amount: "14000" },
      { id: 3, title: "Elétrica", description: "", amount: "11000" },
      { id: 4, title: "Porcelanato e piso aquecido", description: "", amount: "28000" },
      { id: 5, title: "Pintura e gesso", description: "", amount: "17000" },
    ],
    budgeted: 79000,
    contractValue: 94800,
    urgency: "Planejado",
    quoteDeadline: "30/06/2025",
    startDate: "",
    endDate: "",
    status: "Aprovado",
    history: [
      { datetime: "20/06/2025 11:00", description: "Orçamento criado." },
      { datetime: "22/06/2025 09:00", description: "Análise iniciada." },
      { datetime: "28/06/2025 15:30", description: "Orçamento aprovado." },
    ],
    createdAt: "20/06/2025 11:00",
  },
  {
    id: 104,
    clientName: "Paulo Andrade",
    phone: "",
    description: "Studio 40m², Jardins",
    items: [
      { id: 1, title: "Demolição", description: "", amount: "6000" },
      { id: 2, title: "Revestimentos", description: "", amount: "19000" },
    ],
    budgeted: 25000,
    contractValue: 30000,
    urgency: "Normal",
    startDate: "",
    endDate: "",
    status: "Cancelado",
    cancellationReason: "Cliente desistiu do projeto após análise do escopo.",
    history: [
      { datetime: "01/06/2025 10:00", description: "Orçamento criado." },
      { datetime: "03/06/2025 11:00", description: "Análise iniciada." },
      { datetime: "10/06/2025 16:00", description: "Orçamento cancelado — Motivo: Cliente desistiu do projeto após análise do escopo." },
    ],
    createdAt: "01/06/2025 10:00",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const statusColors: Record<ProjectStatus, string> = {
  "Em andamento": "bg-blue-100 text-blue-700",
  "Concluído": "bg-green-100 text-green-700",
  "Pausado": "bg-yellow-100 text-yellow-700",
  "Orçamento": "bg-purple-100 text-purple-700",
};

const statusDot: Record<ProjectStatus, string> = {
  "Em andamento": "bg-blue-500",
  "Concluído": "bg-green-500",
  "Pausado": "bg-yellow-500",
  "Orçamento": "bg-purple-500",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex gap-4 items-start">
      <div className={`rounded-lg p-2.5 ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-semibold text-foreground mt-0.5" style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ value, color = "bg-accent" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
    </div>
  );
}

// ─── Screen A: Dashboard ──────────────────────────────────────────────────────

function Dashboard({ projects, onOpenProject, onNewProject }: {
  projects: Project[];
  onOpenProject: (p: Project) => void;
  onNewProject: () => void;
}) {
  const active = projects.filter(p => p.status === "Em andamento");
  const pending = projects.filter(p => p.status === "Orçamento");
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="bg-primary text-primary-foreground px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardHat size={22} />
          <div>
            <p className="text-xs text-primary-foreground/60 font-mono uppercase tracking-widest">Construtora</p>
            <h1 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>Exemplo Nome</h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-primary-foreground/60">Julho 2025</p>
          <p className="text-sm font-medium">Dashboard</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon={<Building2 size={18} className="text-blue-600" />}
            label="Em execução"
            value={String(active.length)}
            sub={`${projects.length} obras total`}
            color="bg-blue-50"
          />
          <StatCard
            icon={<Clock size={18} className="text-yellow-600" />}
            label="Orçamentos"
            value={String(pending.length)}
            sub="Aguardando aprovação"
            color="bg-yellow-50"
          />
          <StatCard
            icon={<TrendingUp size={18} className="text-accent" />}
            label="Gasto no mês"
            value="R$ 127k"
            sub="Jun–Jul 2025"
            color="bg-orange-50"
          />
          <StatCard
            icon={<DollarSign size={18} className="text-green-600" />}
            label="Total executado"
            value={`R$ ${(totalSpent / 1e6).toFixed(1)}M`}
            sub="Acumulado 2025"
            color="bg-green-50"
          />
        </div>

        {/* Section title */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Obras</h2>
          <span className="text-xs text-muted-foreground font-mono">{projects.length} projetos</span>
        </div>

        {/* Project cards */}
        <div className="space-y-3">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => onOpenProject(project)}
              className="w-full bg-card border border-border rounded-xl overflow-hidden text-left hover:shadow-md hover:border-accent/30 transition-all group"
            >
              <div className="relative h-28 overflow-hidden bg-muted">
                <img
                  src={project.image}
                  alt={project.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                  <span className="text-white text-sm font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {project.name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status]}`}>
                    {project.status}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{project.phase}</span>
                  <span className="text-xs font-mono font-medium text-foreground">{project.progress}%</span>
                </div>
                <ProgressBar
                  value={project.progress}
                  color={project.status === "Concluído" ? "bg-green-500" : project.status === "Pausado" ? "bg-yellow-400" : "bg-accent"}
                />
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-xs text-muted-foreground">{project.client}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {fmt(project.spent)} / {fmt(project.budgeted)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
                  {project.startDate !== "–" ? (
                    <>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <CalendarDays size={10} /> {project.startDate}
                      </span>
                      <span className="text-muted-foreground/40 text-[10px]">→</span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <CalendarCheck size={10} /> {project.endDate}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                      <CalendarClock size={10} /> Orçamento válido até {project.quoteDeadline}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

    </div>
  );
}

// ─── Screen B: Project Detail ─────────────────────────────────────────────────

type DetailTab = "visao" | "etapas" | "despesas" | "galeria";

const STEP_STATUS_CONFIG: Record<StepStatus, { label: string; color: string; dot: string }> = {
  "Concluído":    { label: "Concluído",    color: "bg-emerald-900/40 text-emerald-400 border-emerald-800", dot: "bg-emerald-400" },
  "Em andamento": { label: "Em andamento", color: "bg-primary/20 text-primary border-primary/30",           dot: "bg-primary" },
  "Pendente":     { label: "Pendente",     color: "bg-muted text-muted-foreground border-border",           dot: "bg-muted-foreground" },
  "Cancelado":    { label: "Cancelado",    color: "bg-red-900/30 text-red-400 border-red-900",              dot: "bg-red-400" },
};

function StepModal({ step, onClose, onSave, isNew = false }: {
  step: Milestone;
  onClose: () => void;
  onSave: (updated: Milestone) => void;
  isNew?: boolean;
}) {
  const [draft, setDraft] = useState<Milestone>({ ...step });
  const [workerNote, setWorkerNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState<StepStatus | null>(null);
  const [extendingDeadline, setExtendingDeadline] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");
  const [extensionReason, setExtensionReason] = useState("");

  const formatDeadline = (d: string) => {
    if (!d) return "Não definido";
    return d.includes("-") ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : d;
  };

  const confirmExtension = () => {
    if (!newDeadline) return;
    setDraft(prev => ({ ...prev, deadline: newDeadline }));
    setExtendingDeadline(false);
    setNewDeadline("");
    setExtensionReason("");
  };

  const handleStatusRequest = (s: StepStatus) => {
    if (s === draft.status) return;
    setPendingStatus(s);
  };

  const confirmStatus = () => {
    if (!pendingStatus) return;
    const today = new Date().toISOString().split("T")[0];
    setDraft(prev => ({
      ...prev,
      status: pendingStatus,
      done: pendingStatus === "Concluído",
      completedAt: pendingStatus === "Concluído" ? today : "",
    }));
    setPendingStatus(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto z-10">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
            {isNew ? "Nova Etapa" : draft.label || "Editar Etapa"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Nome (apenas se novo) */}
          {isNew && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nome da etapa</label>
              <input
                type="text"
                value={draft.label}
                onChange={e => setDraft({ ...draft, label: e.target.value })}
                placeholder="Ex: Instalações hidráulicas"
                className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          )}

          {/* Prazo — definido no planejamento, fora das seções */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground block flex items-center gap-1.5">
              <CalendarClock size={11} className="text-accent" /> Prazo previsto
            </label>
            {isNew ? (
              <input
                type="date"
                value={draft.deadline}
                onChange={e => setDraft({ ...draft, deadline: e.target.value })}
                className="w-full bg-input-background rounded-lg px-3 py-2.5 text-xs outline-none focus:ring-2 ring-accent/40 border border-border text-foreground font-mono"
              />
            ) : extendingDeadline ? (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Prazo atual:</span>
                  <span className="font-mono text-foreground">{formatDeadline(draft.deadline)}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Novo prazo</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={e => setNewDeadline(e.target.value)}
                    className="w-full bg-input-background rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-accent/40 border border-border text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Motivo da extensão <span className="text-muted-foreground/50">(opcional)</span></label>
                  <textarea
                    value={extensionReason}
                    onChange={e => setExtensionReason(e.target.value)}
                    rows={2}
                    placeholder="Ex: atraso na entrega de materiais..."
                    className="w-full bg-input-background rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-accent/40 border border-border text-foreground resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setExtendingDeadline(false); setNewDeadline(""); setExtensionReason(""); }} className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors">Cancelar</button>
                  <button type="button" onClick={confirmExtension} disabled={!newDeadline} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Confirmar extensão</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5 bg-input-background rounded-lg border border-border">
                <span className="text-xs font-mono text-foreground">{formatDeadline(draft.deadline)}</span>
                <button type="button" onClick={() => setExtendingDeadline(true)} className="text-xs text-accent hover:text-accent/80 font-medium transition-colors flex items-center gap-1">
                  <CalendarClock size={11} /> Estender prazo
                </button>
              </div>
            )}
          </div>

          {/* Conclusão real — chip read-only, preenchido automaticamente ao marcar Concluído */}
          {draft.status === "Concluído" && draft.completedAt && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-900/20 border border-emerald-800/40 rounded-lg">
              <CalendarCheck size={13} className="text-emerald-400 shrink-0" />
              <span className="text-xs text-emerald-400 font-mono">
                Concluído em: {
                  draft.completedAt.includes("-")
                    ? new Date(draft.completedAt + "T12:00:00").toLocaleDateString("pt-BR")
                    : draft.completedAt
                }
              </span>
            </div>
          )}

          {/* Descrição do escopo */}
          {(isNew || draft.description) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Descrição do escopo</label>
              <textarea
                rows={2}
                value={draft.description}
                onChange={e => setDraft({ ...draft, description: e.target.value })}
                placeholder="Descreva o escopo desta etapa..."
                className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50 resize-none"
              />
            </div>
          )}

          {/* ── Seção: Execução (trabalhador) ── */}
          <div className="rounded-xl border border-border bg-muted/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/60">
              <HardHat size={13} className="text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Registro da execução</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Nota de progresso</label>
                <textarea
                  rows={2}
                  value={workerNote}
                  onChange={e => setWorkerNote(e.target.value)}
                  placeholder="Descreva o que foi feito, materiais usados, observações..."
                  className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                  <Camera size={11} className="text-accent" />
                  Evidências fotográficas
                  {draft.photos.length === 0 && draft.status === "Concluído" && (
                    <span className="text-[10px] text-amber-500 font-normal">(recomendado para concluir)</span>
                  )}
                </label>
                {draft.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {draft.photos.map((url, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden aspect-square bg-muted">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setDraft({ ...draft, photos: draft.photos.filter((_, j) => j !== i) })}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="w-full py-2.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
                >
                  <Upload size={13} /> Anexar fotos / vídeos
                </button>
              </div>
            </div>
          </div>

          {/* ── Seção: Aprovação (supervisor) ── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-primary/5">
              <ShieldCheck size={13} className="text-primary" />
              <span className="text-[11px] font-semibold text-primary/70 uppercase tracking-wider">Aprovação do supervisor</span>
            </div>
            <div className="px-4 py-3">
              {pendingStatus ? (
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                  <p className="text-sm text-center text-foreground">
                    Deseja alterar o status para:
                  </p>
                  <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border text-sm font-medium ${STEP_STATUS_CONFIG[pendingStatus].color}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${STEP_STATUS_CONFIG[pendingStatus].dot}`} />
                    {pendingStatus}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingStatus(null)}
                      className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmStatus}
                      className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/80 transition-colors"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Concluído", "Em andamento", "Pendente", "Cancelado"] as StepStatus[]).map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => handleStatusRequest(s)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                          draft.status === s
                            ? STEP_STATUS_CONFIG[s].color
                            : "bg-muted text-muted-foreground border-border hover:border-accent/50"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${draft.status === s ? STEP_STATUS_CONFIG[s].dot : "bg-muted-foreground/40"}`} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!draft.label.trim()}
            onClick={() => { onSave(draft); onClose(); }}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {isNew ? "Criar etapa" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectDetail({ project, onBack }: { project: Project; onBack: () => void }) {
  const [tab, setTab] = useState<DetailTab>("visao");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [milestones, setMilestones] = useState<Milestone[]>(project.milestones);
  const [expenses, setExpenses] = useState<Expense[]>(project.expenses);
  const [editingStep, setEditingStep] = useState<Milestone | null>(null);
  const [creatingStep, setCreatingStep] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState({ description: "", category: "Material", amount: "" });
  const [showReport, setShowReport] = useState(false);

  const emptyStep: Milestone = {
    label: "", done: false, date: "", status: "Pendente",
    description: "", deadline: "", completedAt: "", photos: [],
  };

  const remaining = project.budgeted - project.spent;
  const pieData = [
    { name: "Executado", value: project.spent },
    { name: "Restante", value: Math.max(0, remaining) },
  ];
  const PIE_COLORS = ["#D97706", "#EDF0F4"];

  const monthlyData = [
    { mes: "Fev", valor: 58000 },
    { mes: "Mar", valor: 74000 },
    { mes: "Abr", valor: 91000 },
    { mes: "Mai", valor: 67000 },
    { mes: "Jun", valor: 83000 },
    { mes: "Jul", valor: 44000 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header image */}
      <div className="relative h-52 bg-muted overflow-hidden">
        <img src={project.image} alt={project.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        <button
          onClick={onBack}
          className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={() => setShowReport(true)}
          className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
          title="Gerar relatório"
        >
          <FileBarChart2 size={18} />
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white/70 text-xs mb-0.5">{project.location}</p>
              <h2 className="text-white text-xl font-semibold leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {project.name}
              </h2>
            </div>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ProjectStatus)}
              className="text-xs px-2 py-1.5 rounded-lg border-0 font-medium bg-white/90 text-foreground cursor-pointer"
            >
              {(["Em andamento", "Concluído", "Pausado", "Orçamento"] as ProjectStatus[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Budget strip */}
      <div className="bg-primary text-primary-foreground px-5 py-3 grid grid-cols-4 gap-1 text-sm">
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Orçado</p>
          <p className="font-semibold font-mono text-sm">{fmt(project.budgeted)}</p>
        </div>
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Executado</p>
          <p className="font-semibold font-mono text-sm text-amber-400">{fmt(project.spent)}</p>
        </div>
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Despesas</p>
          <p className="font-semibold font-mono text-sm text-orange-300">
            {fmt(expenses.reduce((s, e) => s + e.amount, 0))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-primary-foreground/60 font-mono">Saldo</p>
          <p className={`font-semibold font-mono text-sm ${remaining >= 0 ? "text-green-400" : "text-red-400"}`}>
            {fmt(remaining)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card overflow-x-auto scrollbar-hide">
        {([
          { id: "visao",    label: "Visão Geral", icon: <LayoutDashboard size={14} /> },
          { id: "etapas",   label: "Etapas",      icon: <ListChecks size={14} /> },
          { id: "despesas", label: "Despesas",     icon: <Receipt size={14} /> },
          { id: "galeria",  label: "Galeria",      icon: <Image size={14} /> },
        ] as { id: DetailTab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto pb-24">
        {/* TAB: Visão Geral */}
        {tab === "visao" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Donut chart – CSS conic-gradient */}
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-mono mb-3">Orçamento</p>
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(${PIE_COLORS[0]} 0% ${pieData[0].value / project.budgeted * 100}%, ${PIE_COLORS[1]} ${pieData[0].value / project.budgeted * 100}% 100%)`,
                    }}
                  >
                    <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
                      <span className="text-xs font-mono font-semibold text-foreground">
                        {Math.round(pieData[0].value / project.budgeted * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-3">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                        <span className="text-[10px] text-muted-foreground">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress + milestones summary */}
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-1">Progresso</p>
                  <p className="text-3xl font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>{project.progress}%</p>
                  <ProgressBar
                    value={project.progress}
                    color={project.status === "Concluído" ? "bg-green-500" : "bg-accent"}
                  />
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground font-mono mb-1">Fase atual</p>
                  <p className="text-xs font-medium text-foreground leading-snug">{project.phase}</p>
                </div>
              </div>
            </div>

            {/* Monthly bar chart */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-mono mb-3">Gastos mensais (R$)</p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={monthlyData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEECEA" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#7A7870" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#7A7870" }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => [fmt(v), "Gasto"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="valor" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Dates */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-mono mb-3">Datas</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock size={14} className="text-accent" />
                    <span>Fechamento do orçamento</span>
                  </div>
                  <span className="text-sm font-mono font-medium text-foreground">{project.quoteDeadline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays size={14} className="text-accent" />
                    <span>Início da obra</span>
                  </div>
                  <span className="text-sm font-mono font-medium text-foreground">{project.startDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarCheck size={14} className="text-accent" />
                    <span>Entrega prevista</span>
                  </div>
                  <span className="text-sm font-mono font-medium text-foreground">{project.endDate}</span>
                </div>
              </div>
            </div>

            {/* Financeiro */}
            {(() => {
              const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
              const marginPlanned = project.contractValue - project.budgeted;
              const marginReal = project.contractValue - totalExpenses;
              const marginRealPct = totalExpenses > 0
                ? (marginReal / project.contractValue) * 100
                : (marginPlanned / project.contractValue) * 100;
              const isHealthy = marginReal >= marginPlanned * 0.8;

              const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" | "yellow" }) => (
                <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-sm font-mono font-semibold ${
                    highlight === "green" ? "text-green-500" :
                    highlight === "red"   ? "text-red-500" :
                    highlight === "yellow"? "text-amber-400" :
                    "text-foreground"
                  }`}>{value}</span>
                </div>
              );

              return (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground font-mono">Financeiro</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      isHealthy
                        ? "bg-emerald-900/40 text-emerald-400 border-emerald-800"
                        : "bg-red-900/30 text-red-400 border-red-900"
                    }`}>
                      {isHealthy ? "Margem saudável" : "Margem comprimida"}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Row label="Valor do contrato" value={fmt(project.contractValue)} />
                    <Row label="Custo orçado" value={fmt(project.budgeted)} />
                    <Row label="Custo executado" value={fmt(totalExpenses > 0 ? totalExpenses : project.spent)} />
                    <Row
                      label="Margem prevista"
                      value={`${fmt(marginPlanned)} · ${((marginPlanned / project.contractValue) * 100).toFixed(1)}%`}
                      highlight="yellow"
                    />
                    <Row
                      label="Margem real"
                      value={`${fmt(marginReal)} · ${marginRealPct.toFixed(1)}%`}
                      highlight={marginReal >= 0 ? "green" : "red"}
                    />
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* TAB: Etapas */}
        {tab === "etapas" && (
          <div className="space-y-2">
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2 flex-wrap">
                {(["Concluído", "Em andamento", "Pendente", "Cancelado"] as StepStatus[]).map(s => {
                  const count = milestones.filter(m => m.status === s).length;
                  if (count === 0) return null;
                  return (
                    <span key={s} className={`text-[10px] px-2 py-1 rounded-full border font-medium ${STEP_STATUS_CONFIG[s].color}`}>
                      {count} {s}
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setCreatingStep(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-amber-600 transition-colors shrink-0"
              >
                <Plus size={14} /> Nova etapa
              </button>
            </div>

            {milestones.map((m, i) => {
              const cfg = STEP_STATUS_CONFIG[m.status];
              return (
                <button
                  key={i}
                  onClick={() => setEditingStep(m)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 text-left hover:border-accent/40 transition-colors group"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${m.status === "Cancelado" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {m.label}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
                      {m.deadline && (
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                          <CalendarClock size={9} /> {m.deadline}
                        </span>
                      )}
                      {m.completedAt && (
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                          <CalendarCheck size={9} /> {m.completedAt}
                        </span>
                      )}
                    </div>
                  </div>
                  {m.photos.length > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                      <Camera size={12} />
                      <span className="text-[10px]">{m.photos.length}</span>
                    </div>
                  )}
                  <ChevronRight size={14} className="text-muted-foreground shrink-0 group-hover:text-accent transition-colors" />
                </button>
              );
            })}
          </div>
        )}

        {/* TAB: Despesas */}
        {tab === "despesas" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-mono">{expenses.length} lançamentos</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-semibold text-foreground">
                  {fmt(expenses.reduce((s, e) => s + e.amount, 0))}
                </span>
                <button
                  onClick={() => setAddingExpense(true)}
                  className="flex items-center gap-1 text-xs font-medium text-accent hover:text-amber-600 transition-colors"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            </div>
            {expenses.map(exp => (
              <div key={exp.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {exp.category === "Material" ? <Wrench size={14} className="text-muted-foreground" /> :
                   exp.category === "Serviço" ? <HardHat size={14} className="text-muted-foreground" /> :
                   <Receipt size={14} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                  <p className="text-xs text-muted-foreground">{exp.date} · {exp.category}</p>
                </div>
                <p className="text-sm font-mono font-semibold text-foreground shrink-0">{fmt(exp.amount)}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB: Galeria */}
        {tab === "galeria" && (
          <div className="space-y-4">
            {project.photos.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-3 text-center">
                <Camera size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma foto adicionada ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {project.photos.map((ph, i) => (
                  <div key={i} className="bg-muted rounded-xl overflow-hidden border border-border">
                    <img src={ph.url} alt={ph.caption} className="w-full h-32 object-cover" />
                    <div className="p-2">
                      <p className="text-xs font-medium text-foreground leading-snug">{ph.caption}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{ph.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2">
              <Upload size={16} /> Adicionar Fotos
            </button>
          </div>
        )}
      </div>


      {/* Report modal */}
      {showReport && (
        <ReportModal
          project={{ ...project, milestones, expenses }}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Step edit modal */}
      {editingStep && (
        <StepModal
          step={editingStep}
          onClose={() => setEditingStep(null)}
          onSave={updated => {
            setMilestones(prev => prev.map(m => m.label === editingStep.label ? updated : m));
          }}
        />
      )}

      {/* Step create modal */}
      {creatingStep && (
        <StepModal
          step={emptyStep}
          isNew
          onClose={() => setCreatingStep(false)}
          onSave={newStep => {
            setMilestones(prev => [...prev, newStep]);
          }}
        />
      )}

      {/* Add expense modal */}
      {addingExpense && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAddingExpense(false)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl z-10">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Nova Despesa
              </h3>
              <button onClick={() => setAddingExpense(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Porcelanato 60×60 – área social"
                  value={expenseDraft.description}
                  onChange={e => setExpenseDraft({ ...expenseDraft, description: e.target.value })}
                  className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Categoria</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Material", "Serviço", "Outro"].map(cat => (
                    <button
                      key={cat} type="button"
                      onClick={() => setExpenseDraft({ ...expenseDraft, category: cat })}
                      className={`py-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                        expenseDraft.category === cat
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-muted text-muted-foreground border-border hover:border-accent/50"
                      }`}
                    >
                      {cat === "Material" && <Wrench size={12} />}
                      {cat === "Serviço" && <HardHat size={12} />}
                      {cat === "Outro" && <Receipt size={12} />}
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Valor (R$)</label>
                <div className="relative">
                  <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Ex: 4.800"
                    value={expenseDraft.amount}
                    onChange={e => setExpenseDraft({ ...expenseDraft, amount: e.target.value })}
                    className="w-full bg-input-background rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50 font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button
                type="button"
                onClick={() => setAddingExpense(false)}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!expenseDraft.description.trim() || !expenseDraft.amount.trim()}
                onClick={() => {
                  const parsed = parseFloat(expenseDraft.amount.replace(/\./g, "").replace(",", "."));
                  if (!expenseDraft.description.trim() || isNaN(parsed)) return;
                  const now = new Date();
                  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
                  setExpenses(prev => [...prev, {
                    id: Date.now(),
                    date: dateStr,
                    description: expenseDraft.description,
                    category: expenseDraft.category,
                    amount: parsed,
                  }]);
                  setExpenseDraft({ description: "", category: "Material", amount: "" });
                  setAddingExpense(false);
                }}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Registrar despesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Screen C: New Quote ──────────────────────────────────────────────────────

let nextItemId = 1;

function NewQuote({ onBack, onQuoteCreated }: { onBack: () => void; onQuoteCreated: (q: QuoteRecord) => void }) {
  const [form, setForm] = useState({
    clientName: "",
    phone: "",
    description: "",
    contractValue: "",
    urgency: "Normal",
    startDate: "",
    endDate: "",
  });
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [newItem, setNewItem] = useState<Omit<QuoteItem, "id">>({ title: "", description: "", amount: "" });
  const [addingItem, setAddingItem] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState("");
  const [dateError, setDateError] = useState("");

  const totalValue = items.reduce((sum, it) => sum + (parseFloat(it.amount.replace(/\./g, "").replace(",", ".")) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.startDate && form.endDate && form.startDate >= form.endDate) {
      setDateError("A data de início deve ser anterior à entrega prevista.");
      return;
    }
    setDateError("");

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const createdAtStr = `${dd}/${mm}/${yyyy} ${hh}:${min}`;

    const contractVal = parseFloat(form.contractValue.replace(/\./g, "").replace(",", ".")) || 0;

    const newQuote: QuoteRecord = {
      id: Date.now(),
      clientName: form.clientName,
      phone: form.phone,
      description: form.description,
      items,
      budgeted: totalValue,
      contractValue: contractVal,
      urgency: form.urgency,
      startDate: form.startDate,
      endDate: form.endDate,
      status: "Solicitado",
      history: [{ datetime: createdAtStr, description: "Orçamento criado." }],
      createdAt: createdAtStr,
    };

    onQuoteCreated(newQuote);
    setSubmittedAt(createdAtStr);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>Orçamento gerado!</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerado em {submittedAt}</p>
        </div>
        <div className="w-full max-w-sm bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Resumo</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cliente</span>
            <span className="font-medium">{form.clientName || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Itens</span>
            <span className="font-medium">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor do contrato</span>
            <span className="font-medium font-mono text-accent">
              {form.contractValue ? fmt(parseFloat(form.contractValue.replace(/\./g, "").replace(",", ".")) || 0) : "—"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Início / Entrega</span>
            <span className="font-medium font-mono">
              {form.startDate ? new Date(form.startDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
              {" → "}
              {form.endDate ? new Date(form.endDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
            </span>
          </div>
        </div>
        <div className="flex gap-3 w-full max-w-sm">
          <button
            type="button"
            onClick={() => {
              const contractVal = parseFloat(form.contractValue.replace(/\./g, "").replace(",", ".")) || 0;
              const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
              const itemsHtml = items.map(it => {
                const amt = parseFloat(String(it.amount).replace(/\./g, "").replace(",", ".")) || 0;
                return `<tr>
                  <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">
                    <div style="font-size:13px;font-weight:600;color:#1a1a1a">${it.title}</div>
                    ${it.description ? `<div style="font-size:11px;color:#888;margin-top:2px">${it.description}</div>` : ""}
                  </td>
                  <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;font-size:13px;font-weight:600;color:#1a1a1a">${amt > 0 ? fmtBRL(amt) : "—"}</td>
                </tr>`;
              }).join("");
              const startStr = form.startDate ? new Date(form.startDate + "T12:00:00").toLocaleDateString("pt-BR") : "—";
              const endStr = form.endDate ? new Date(form.endDate + "T12:00:00").toLocaleDateString("pt-BR") : "—";
              const win = window.open("", "_blank");
              if (!win) return;
              win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
              <title>Orçamento – ${form.clientName}</title>
              <style>
                body{font-family:system-ui,sans-serif;color:#1a1a1a;padding:40px;max-width:680px;margin:0 auto}
                h1{font-size:26px;margin:0 0 4px;font-weight:700}
                h2{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#999;margin:28px 0 10px;padding-bottom:6px;border-bottom:1px solid #eee}
                table{width:100%;border-collapse:collapse}
                .total{display:flex;justify-content:space-between;align-items:center;padding:12px;background:#fafafa;border-radius:8px;margin-top:8px}
                .total-label{font-size:13px;color:#555}
                .total-value{font-size:20px;font-weight:700;color:#D97706}
                .date-row{display:flex;gap:32px;margin-top:4px}
                .date-item{font-size:12px;color:#555}
                .date-item span{display:block;font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
                @media print{body{padding:24px}}
              </style></head><body>
              <p style="font-size:10px;color:#aaa;margin:0 0 16px;letter-spacing:.08em;text-transform:uppercase">Orçamento · Gerado em ${submittedAt}</p>
              <h1>${form.clientName || "Cliente"}</h1>
              ${form.description ? `<p style="font-size:13px;color:#666;margin:6px 0 0">${form.description}</p>` : ""}
              <h2>Escopo do serviço</h2>
              <table><tbody>${itemsHtml}</tbody></table>
              <div class="total">
                <span class="total-label">Valor total do contrato</span>
                <span class="total-value">${contractVal > 0 ? contractVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}</span>
              </div>
              <h2>Datas previstas</h2>
              <div class="date-row">
                <div class="date-item"><span>Início da obra</span>${startStr}</div>
                <div class="date-item"><span>Entrega prevista</span>${endStr}</div>
              </div>
              <script>window.onload=()=>{window.print()}<\/script>
              </body></html>`);
              win.document.close();
            }}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={15} /> Gerar PDF
          </button>
          <button onClick={onBack} className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            Ver Orçamentos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-5 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-1 hover:bg-primary-foreground/10 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs text-primary-foreground/60 font-mono uppercase tracking-wider">Captação</p>
          <h1 className="text-base font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>Novo Orçamento</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">
        {/* Client info */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Dados do cliente</p>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Nome completo</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ex: Carlos Pereira"
                value={form.clientName}
                onChange={e => setForm({ ...form, clientName: e.target.value })}
                className="w-full bg-input-background rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Telefone / WhatsApp</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                placeholder="(11) 99999-0000"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-input-background rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        </div>

        {/* Quote items */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Itens</p>
            {items.length > 0 && (
              <span className="text-xs font-mono font-semibold text-accent">{fmt(totalValue)}</span>
            )}
          </div>

          {/* List of added items */}
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-start gap-3 bg-muted rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-mono font-semibold text-foreground">
                      {fmt(parseFloat(item.amount.replace(/\./g, "").replace(",", ".")) || 0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                      className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add item form */}
          {addingItem ? (
            <div className="border border-accent/30 rounded-xl p-3 space-y-3 bg-accent/5">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Título do item</label>
                <input
                  type="text"
                  placeholder="Ex: Retirada de piso"
                  value={newItem.title}
                  onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Descrição (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Demolição e remoção completa do revestimento existente"
                  value={newItem.description}
                  onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Valor (R$)</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Ex: 4.500"
                    value={newItem.amount}
                    onChange={e => setNewItem({ ...newItem, amount: e.target.value })}
                    className="w-full bg-input-background rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border placeholder:text-muted-foreground/50 font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setAddingItem(false); setNewItem({ title: "", description: "", amount: "" }); }}
                  className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!newItem.title.trim() || !newItem.amount.trim()}
                  onClick={() => {
                    if (!newItem.title.trim() || !newItem.amount.trim()) return;
                    setItems(prev => [...prev, { ...newItem, id: nextItemId++ }]);
                    setNewItem({ title: "", description: "", amount: "" });
                    setAddingItem(false);
                  }}
                  className="flex-1 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Adicionar item
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="w-full py-2.5 border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
            >
              <PackagePlus size={14} /> Adicionar item
            </button>
          )}
        </div>

        {/* Project info */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Projeto</p>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Descrição do projeto</label>
            <textarea
              rows={3}
              placeholder="Descreva o escopo da obra, metragem aproximada, localização..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border placeholder:text-muted-foreground/50 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center justify-between">
              <span>Custo orçado (R$)</span>
              <span className="text-[10px] text-muted-foreground normal-case font-normal">Soma dos itens</span>
            </label>
            <div className="relative">
              <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <div className="w-full bg-muted rounded-lg pl-9 pr-4 py-2.5 text-sm border border-border font-mono text-foreground select-none cursor-default">
                {totalValue > 0 ? fmt(totalValue) : <span className="text-muted-foreground/60">Nenhum item cadastrado</span>}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center justify-between">
              <span>Valor do contrato (R$)</span>
              <span className="text-[10px] text-muted-foreground normal-case font-normal">O que será cobrado do cliente</span>
            </label>
            <div className="relative">
              <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ex: 104.000"
                value={form.contractValue}
                onChange={e => setForm({ ...form, contractValue: e.target.value })}
                className="w-full bg-input-background rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border placeholder:text-muted-foreground/50 font-mono"
              />
            </div>
            {form.contractValue && totalValue > 0 && (() => {
              const contract = parseFloat(form.contractValue.replace(/\./g, "").replace(",", ".")) || 0;
              const margin = contract - totalValue;
              const pct = contract > 0 ? (margin / contract) * 100 : 0;
              return (
                <p className={`text-xs mt-1.5 font-mono ${margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                  Margem prevista: {fmt(margin)} ({pct.toFixed(1)}%)
                </p>
              );
            })()}
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Urgência</label>
            <div className="grid grid-cols-3 gap-2">
              {["Urgente", "Normal", "Planejado"].map(u => (
                <button
                  key={u} type="button"
                  onClick={() => setForm({ ...form, urgency: u })}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    form.urgency === u
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-input-background text-muted-foreground border-border hover:border-accent"
                  }`}
                >{u}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Datas</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1.5">
                <CalendarDays size={12} className="text-accent" /> Início da obra
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => { setForm({ ...form, startDate: e.target.value }); setDateError(""); }}
                className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1.5">
                <CalendarCheck size={12} className="text-accent" /> Entrega prevista
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => { setForm({ ...form, endDate: e.target.value }); setDateError(""); }}
                className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground font-mono"
              />
            </div>
          </div>
          {dateError && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
              {dateError}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <FileText size={16} /> Gerar Pré-Orçamento
        </button>
      </form>
    </div>
  );
}

// ─── Screen D: Quotes List ────────────────────────────────────────────────────

const quoteStatusColors: Record<QuoteStatus, string> = {
  "Solicitado": "bg-purple-100 text-purple-700",
  "Em análise": "bg-blue-100 text-blue-700",
  "Aprovado":   "bg-green-100 text-green-700",
  "Cancelado":  "bg-red-100 text-red-700",
};

const urgencyColors: Record<string, string> = {
  "Urgente":   "bg-red-50 text-red-600",
  "Normal":    "bg-gray-100 text-gray-600",
  "Planejado": "bg-sky-50 text-sky-600",
};

const QUOTE_STATUS_FILTERS = ["Todos", "Solicitado", "Em análise", "Aprovado", "Cancelado"] as const;
type QuoteStatusFilter = (typeof QUOTE_STATUS_FILTERS)[number];
const QUOTE_SORT_OPTIONS = [
  { value: "recent", label: "Mais recente" },
  { value: "value", label: "Maior valor" },
] as const;
type QuoteSortOption = (typeof QUOTE_SORT_OPTIONS)[number]["value"];

function QuotesList({ quotes, onOpenQuote }: { quotes: QuoteRecord[]; onOpenQuote: (q: QuoteRecord) => void }) {
  const [filterStatus, setFilterStatus] = useState<QuoteStatusFilter>("Todos");
  const [sortBy, setSortBy] = useState<QuoteSortOption>("recent");

  const filtered = quotes
    .filter(q => filterStatus === "Todos" || q.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "value") return b.contractValue - a.contractValue;
      // "recent" — sort by createdAt (dd/mm/yyyy HH:MM)
      const parse = (s: string) => {
        const [datePart, timePart] = s.split(" ");
        const [d, m, y] = datePart.split("/");
        return new Date(`${y}-${m}-${d}T${timePart ?? "00:00"}`).getTime();
      };
      return parse(b.createdAt) - parse(a.createdAt);
    });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={22} />
          <div>
            <p className="text-xs text-primary-foreground/60 font-mono uppercase tracking-widest">Captação</p>
            <h1 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>Orçamentos</h1>
          </div>
        </div>
        <span className="text-sm font-mono text-primary-foreground/70">{filtered.length} de {quotes.length}</span>
      </header>

      {/* Filter bar */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5 flex-1 overflow-x-auto no-scrollbar">
          {QUOTE_STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                filterStatus === s
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as QuoteSortOption)}
          className="shrink-0 text-xs bg-muted text-muted-foreground border-none rounded-lg px-2 py-1 font-medium cursor-pointer focus:outline-none"
        >
          {QUOTE_SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center">
            <ClipboardList size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {quotes.length === 0 ? "Nenhum orçamento cadastrado ainda." : "Nenhum orçamento com esse filtro."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(q => (
              <button
                key={q.id}
                onClick={() => onOpenQuote(q)}
                className="w-full bg-card border border-border rounded-xl px-4 py-4 text-left hover:shadow-md hover:border-accent/30 transition-all"
              >
                {/* Row 1: name + status */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-base font-semibold text-foreground leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {q.clientName}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${quoteStatusColors[q.status]}`}>
                    {q.status}
                  </span>
                </div>
                {/* Row 2: description */}
                {q.description && (
                  <p className="text-xs text-muted-foreground mb-2 leading-snug line-clamp-1">{q.description}</p>
                )}
                {/* Row 3: urgency + items + created */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${urgencyColors[q.urgency] ?? "bg-gray-100 text-gray-600"}`}>
                    {q.urgency}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{q.items.length} {q.items.length === 1 ? "item" : "itens"}</span>
                  <span className="text-muted-foreground/40 text-[10px]">·</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{q.createdAt}</span>
                </div>
                {/* Row 4: financial — contrato em destaque, custo orçado secundário */}
                <div className="flex items-baseline gap-3">
                  <span className="text-base font-mono font-bold text-accent">{fmt(q.contractValue)}</span>
                  <span className="text-xs font-mono text-muted-foreground">orçado {fmt(q.budgeted)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Screen E: Quote Detail ───────────────────────────────────────────────────

function QuoteDetail({
  quote,
  onBack,
  onUpdateQuote,
  onGenerateProject,
}: {
  quote: QuoteRecord;
  onBack: () => void;
  onUpdateQuote: (q: QuoteRecord) => void;
  onGenerateProject: (q: QuoteRecord) => void;
}) {
  const margin = quote.contractValue > 0
    ? ((quote.contractValue - quote.budgeted) / quote.contractValue) * 100
    : 0;

  const [cancellingQuote, setCancellingQuote] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItemDraft, setEditItemDraft] = useState<QuoteItem | null>(null);
  const [addingQuoteItem, setAddingQuoteItem] = useState(false);
  const [newQuoteItem, setNewQuoteItem] = useState<Omit<QuoteItem, "id">>({ title: "", description: "", amount: "" });

  const isReadOnly = quote.status === "Aprovado" || quote.status === "Cancelado";

  const saveItemEdit = () => {
    if (!editItemDraft) return;
    const updated = addHistory(
      { ...quote, items: quote.items.map(i => i.id === editItemDraft.id ? editItemDraft : i) },
      `Item "${editItemDraft.title}" editado.`
    );
    onUpdateQuote(updated);
    setEditingItemId(null);
    setEditItemDraft(null);
  };

  const removeItem = (id: number) => {
    const item = quote.items.find(i => i.id === id);
    const updated = addHistory(
      { ...quote, items: quote.items.filter(i => i.id !== id) },
      `Item "${item?.title ?? id}" removido.`
    );
    onUpdateQuote(updated);
  };

  const addQuoteItem = () => {
    if (!newQuoteItem.title.trim() || !newQuoteItem.amount.trim()) return;
    const newId = Math.max(0, ...quote.items.map(i => i.id)) + 1;
    const updated = addHistory(
      { ...quote, items: [...quote.items, { ...newQuoteItem, id: newId }] },
      `Item "${newQuoteItem.title}" adicionado.`
    );
    onUpdateQuote(updated);
    setNewQuoteItem({ title: "", description: "", amount: "" });
    setAddingQuoteItem(false);
  };

  const nowTs = () => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  };

  const addHistory = (q: QuoteRecord, description: string): QuoteRecord => ({
    ...q,
    history: [...(q.history ?? []), { datetime: nowTs(), description }],
  });

  const handleStartAnalysis = () => {
    const ts = nowTs();
    const updated = addHistory({ ...quote, status: "Em análise", analysisStartedAt: ts }, "Análise iniciada.");
    onUpdateQuote(updated);
  };

  const handleApprove = () => {
    const updated = addHistory({ ...quote, status: "Aprovado" }, "Orçamento aprovado.");
    onUpdateQuote(updated);
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) return;
    const reason = cancelReason.trim();
    const updated = addHistory(
      { ...quote, status: "Cancelado", cancellationReason: reason },
      `Orçamento cancelado — Motivo: ${reason}`
    );
    onUpdateQuote(updated);
    setCancellingQuote(false);
    setCancelReason("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-5 py-4 flex items-center gap-3">
        <button onClick={onBack} className="p-1 hover:bg-primary-foreground/10 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs text-primary-foreground/60 font-mono uppercase tracking-wider">Orçamento</p>
          <h1 className="text-base font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>{quote.clientName}</h1>
        </div>
        <div className="ml-auto">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${quoteStatusColors[quote.status]}`}>
            {quote.status}
          </span>
        </div>
      </div>

      {/* Financial strip */}
      <div className="bg-primary/90 text-primary-foreground px-5 py-3 grid grid-cols-4 gap-1 text-sm border-t border-primary-foreground/10">
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Custo orçado</p>
          <p className="font-semibold font-mono text-sm">{fmt(quote.budgeted)}</p>
        </div>
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Contrato</p>
          <p className="font-semibold font-mono text-sm text-amber-400">{fmt(quote.contractValue)}</p>
        </div>
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Margem</p>
          <p className="font-semibold font-mono text-sm text-green-400">{margin.toFixed(1)}%</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-primary-foreground/60 font-mono">Urgência</p>
          <p className="font-semibold text-sm">{quote.urgency}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-24 space-y-5">
        {/* Status actions — contextual by status */}
        {quote.status === "Solicitado" && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Próximo passo</p>
            <p className="text-sm text-muted-foreground">Este orçamento ainda não foi analisado.</p>
            <button
              type="button"
              onClick={handleStartAnalysis}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <ListChecks size={15} /> Iniciar análise
            </button>
          </div>
        )}

        {quote.status === "Em análise" && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Ações</p>
            {quote.analysisStartedAt && (
              <p className="text-xs text-muted-foreground font-mono">Análise iniciada em {quote.analysisStartedAt}</p>
            )}
            {cancellingQuote ? (
              <div className="rounded-xl border border-red-900/40 bg-red-900/10 p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Motivo do cancelamento</p>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Descreva o motivo do cancelamento..."
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-red-400/30 border border-border text-foreground resize-none"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setCancellingQuote(false); setCancelReason(""); }} className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors">Voltar</button>
                  <button type="button" onClick={handleConfirmCancel} disabled={!cancelReason.trim()} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Confirmar cancelamento</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => setCancellingQuote(true)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors border border-border">
                  Cancelar orçamento
                </button>
                <button type="button" onClick={handleApprove} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                  <CheckCircle size={15} /> Aprovar
                </button>
              </div>
            )}
          </div>
        )}

        {quote.status === "Cancelado" && quote.cancellationReason && (
          <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4 space-y-1.5">
            <p className="text-xs text-red-400 font-mono uppercase tracking-wide font-medium">Motivo do cancelamento</p>
            <p className="text-sm text-foreground">{quote.cancellationReason}</p>
          </div>
        )}

        {/* Items section */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Itens do orçamento</p>
          {quote.items.length === 0 && !addingQuoteItem && (
            <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
          )}
          <div className="space-y-2">
            {quote.items.map(item => (
              editingItemId === item.id && editItemDraft ? (
                <div key={item.id} className="border border-accent/30 rounded-xl p-3 space-y-2.5 bg-accent/5">
                  <input
                    type="text"
                    value={editItemDraft.title}
                    onChange={e => setEditItemDraft({ ...editItemDraft, title: e.target.value })}
                    placeholder="Título do item"
                    className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border"
                  />
                  <input
                    type="text"
                    value={editItemDraft.description}
                    onChange={e => setEditItemDraft({ ...editItemDraft, description: e.target.value })}
                    placeholder="Descrição (opcional)"
                    className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border"
                  />
                  <div className="relative">
                    <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={editItemDraft.amount}
                      onChange={e => setEditItemDraft({ ...editItemDraft, amount: e.target.value })}
                      placeholder="Valor (R$)"
                      className="w-full bg-input-background rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingItemId(null); setEditItemDraft(null); }} className="flex-1 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors">Cancelar</button>
                    <button type="button" onClick={saveItemEdit} disabled={!editItemDraft.title.trim()} className="flex-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/80 transition-colors disabled:opacity-40">Salvar</button>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2.5 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                  </div>
                  <span className="text-sm font-mono font-semibold text-foreground shrink-0">
                    {fmt(parseFloat(item.amount.replace(/\./g, "").replace(",", ".")) || 0)}
                  </span>
                  {!isReadOnly && (
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => { setEditingItemId(item.id); setEditItemDraft({ ...item }); }} className="p-1.5 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors">
                        <FileText size={13} />
                      </button>
                      <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )
            ))}

            {/* Adicionar item inline */}
            {!isReadOnly && (
              addingQuoteItem ? (
                <div className="border border-accent/30 rounded-xl p-3 space-y-2.5 bg-accent/5">
                  <input type="text" value={newQuoteItem.title} onChange={e => setNewQuoteItem({ ...newQuoteItem, title: e.target.value })} placeholder="Título do item" className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border" />
                  <input type="text" value={newQuoteItem.description} onChange={e => setNewQuoteItem({ ...newQuoteItem, description: e.target.value })} placeholder="Descrição (opcional)" className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border" />
                  <div className="relative">
                    <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" value={newQuoteItem.amount} onChange={e => setNewQuoteItem({ ...newQuoteItem, amount: e.target.value })} placeholder="Valor (R$)" className="w-full bg-input-background rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border font-mono" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setAddingQuoteItem(false); setNewQuoteItem({ title: "", description: "", amount: "" }); }} className="flex-1 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors">Cancelar</button>
                    <button type="button" onClick={addQuoteItem} disabled={!newQuoteItem.title.trim() || !newQuoteItem.amount.trim()} className="flex-1 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-40">Adicionar</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingQuoteItem(true)} className="w-full py-2 border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2">
                  <PackagePlus size={13} /> Adicionar item
                </button>
              )
            )}

            {quote.items.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-medium text-muted-foreground">Total orçado</span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {fmt(quote.items.reduce((s, i) => s + (parseFloat(i.amount.replace(/\./g, "").replace(",", ".")) || 0), 0))}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Histórico */}
        {quote.history && quote.history.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Histórico</p>
            <div className="space-y-0">
              {[...quote.history].reverse().map((entry, i) => (
                <div key={i} className={`flex gap-3 py-2.5 ${i < quote.history.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    {i < quote.history.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm text-foreground leading-snug">{entry.description}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{entry.datetime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dates section */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Datas</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock size={14} className="text-accent" />
              <span>Gerado em</span>
            </div>
            <span className="text-sm font-mono font-medium text-foreground">{quote.createdAt || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays size={14} className="text-accent" />
              <span>Início da obra</span>
            </div>
            <span className="text-sm font-mono font-medium text-foreground">{quote.startDate || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarCheck size={14} className="text-accent" />
              <span>Entrega prevista</span>
            </div>
            <span className="text-sm font-mono font-medium text-foreground">{quote.endDate || "—"}</span>
          </div>
        </div>

        {/* Gerar Obra — só aparece quando Aprovado e ainda não gerou obra */}
        {quote.status === "Aprovado" && (
          <div className="bg-green-900/10 border border-green-800/30 rounded-xl p-4 space-y-3">
            <p className="text-xs text-green-400 font-mono uppercase tracking-wide font-medium">Orçamento aprovado</p>
            <p className="text-sm text-muted-foreground">Pronto para iniciar. Clique abaixo para criar a obra no sistema.</p>
            <button
              onClick={() => onGenerateProject(quote)}
              className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <HardHat size={16} /> Gerar Obra
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Report Modal ────────────────────────────────────────────────────────────

function ReportModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const totalExpensesFromProps = project.expenses.reduce((s, e) => s + e.amount, 0);
  const spent = totalExpensesFromProps > 0 ? totalExpensesFromProps : project.spent;
  const remaining = project.budgeted - spent;
  const spentPct = Math.min(100, Math.round((spent / project.budgeted) * 100));

  const now = new Date();
  const [d1, m1, y1] = project.startDate !== "–" ? project.startDate.split("/").map(Number) : [null, null, null];
  const [d2, m2, y2] = project.endDate !== "–" ? project.endDate.split("/").map(Number) : [null, null, null];
  const start = d1 ? new Date(y1!, m1! - 1, d1) : null;
  const end = d2 ? new Date(y2!, m2! - 1, d2) : null;
  const totalDays = start && end ? Math.max(1, (end.getTime() - start.getTime()) / 86400000) : null;
  const elapsedDays = start ? Math.max(0, Math.min(totalDays ?? 0, (now.getTime() - start.getTime()) / 86400000)) : null;
  const timePct = totalDays && elapsedDays != null ? Math.round((elapsedDays / totalDays) * 100) : null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const milestoneRows = project.milestones.map(m => {
      const cfg = { "Concluído": "✅", "Em andamento": "🔄", "Pendente": "⏳", "Cancelado": "❌" };
      const icon = cfg[m.status] ?? "○";
      const photosHtml = m.photos.length > 0
        ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${m.photos.map(url => `<img src="${url}" style="width:120px;height:80px;object-fit:cover;border-radius:6px" />`).join("")}</div>`
        : "";
      return `
        <div style="margin-bottom:12px;padding:12px;border:1px solid #e5e5e5;border-radius:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <span>${icon}</span>
            <strong>${m.label}</strong>
            <span style="font-size:11px;color:#888;margin-left:auto">${m.deadline ? "Prazo: " + m.deadline : ""} ${m.completedAt ? "| Concluído: " + m.completedAt : ""}</span>
          </div>
          ${m.description ? `<p style="font-size:12px;color:#666;margin:4px 0 0 22px">${m.description}</p>` : ""}
          ${photosHtml}
        </div>`;
    }).join("");

    const galleryHtml = project.photos.length > 0
      ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">${project.photos.map(ph => `<div><img src="${ph.url}" style="width:180px;height:120px;object-fit:cover;border-radius:8px"/><p style="font-size:10px;color:#888;margin:3px 0 0">${ph.caption}</p></div>`).join("")}</div>`
      : "<p style='color:#aaa;font-size:12px'>Nenhuma foto na galeria.</p>";

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório – ${project.name}</title>
    <style>
      body{font-family:system-ui,sans-serif;color:#1a1a1a;padding:32px;max-width:800px;margin:0 auto}
      h1{font-size:24px;margin:0 0 4px}h2{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#888;margin:24px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}
      .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
      .stat{display:inline-block;margin-right:24px}.stat-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.06em}.stat-value{font-size:20px;font-weight:700}
      .bar-bg{background:#eee;border-radius:4px;height:8px;margin-top:4px}.bar-fill{height:8px;border-radius:4px;background:#D97706}
      @media print{body{padding:16px}}
    </style></head><body>
    <div style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <p style="font-size:11px;color:#888;margin:0">RELATÓRIO DA OBRA · ${new Date().toLocaleDateString("pt-BR")}</p>
        <h1>${project.name}</h1>
        <p style="color:#666;margin:2px 0">${project.client} · ${project.location}</p>
        <p style="font-size:12px;color:#888;margin:4px 0">${project.startDate} → ${project.endDate}</p>
      </div>
      <span class="badge" style="background:#fef3c7;color:#92400e">${project.status}</span>
    </div>

    <h2>Financeiro</h2>
    <div>
      <div class="stat"><div class="stat-label">Orçado</div><div class="stat-value">R$ ${(project.budgeted/1000).toFixed(0)}k</div></div>
      <div class="stat"><div class="stat-label">Executado</div><div class="stat-value" style="color:#D97706">R$ ${(spent/1000).toFixed(0)}k</div></div>
      <div class="stat"><div class="stat-label">Saldo</div><div class="stat-value" style="color:${remaining>=0?"#16a34a":"#dc2626"}">R$ ${(Math.abs(remaining)/1000).toFixed(0)}k</div></div>
    </div>
    <div style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-bottom:3px"><span>Progresso do orçamento</span><span>${spentPct}%</span></div>
      <div class="bar-bg"><div class="bar-fill" style="width:${spentPct}%"></div></div>
    </div>
    ${timePct != null ? `<div style="margin-top:8px"><div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-bottom:3px"><span>Tempo decorrido</span><span>${timePct}%</span></div><div class="bar-bg"><div class="bar-fill" style="width:${timePct}%;background:#6366f1"></div></div></div>` : ""}

    <h2>Progresso da Obra — ${project.progress}%</h2>
    <p style="font-size:13px;color:#555">Fase atual: <strong>${project.phase}</strong></p>

    <h2>Etapas</h2>
    ${milestoneRows}

    <h2>Galeria</h2>
    ${galleryHtml}

    <script>window.onload=()=>{window.print()}<\/script>
    </body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Relatório</p>
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {project.name}
            </h2>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Printer size={15} /> Gerar PDF
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl w-full mx-auto pb-10">
        {/* Capa */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <div className="relative h-36 bg-muted">
            <img src={project.image} alt={project.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-white/70 text-xs">{project.location}</p>
              <h3 className="text-white text-lg font-semibold leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {project.name}
              </h3>
            </div>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-y-1 text-sm">
            <div><span className="text-muted-foreground text-xs">Cliente</span><p className="font-medium">{project.client}</p></div>
            <div><span className="text-muted-foreground text-xs">Status</span><p className="font-medium">{project.status}</p></div>
            <div><span className="text-muted-foreground text-xs">Início</span><p className="font-mono text-xs">{project.startDate}</p></div>
            <div><span className="text-muted-foreground text-xs">Entrega</span><p className="font-mono text-xs">{project.endDate}</p></div>
          </div>
        </div>

        {/* Financeiro */}
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">Financeiro</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Orçado", value: fmt(project.budgeted), color: "text-foreground" },
              { label: "Executado", value: fmt(spent), color: "text-amber-500" },
              { label: "Saldo", value: fmt(remaining), color: remaining >= 0 ? "text-green-600" : "text-red-500" },
            ].map(s => (
              <div key={s.label} className="bg-muted rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-mono uppercase">{s.label}</p>
                <p className={`text-sm font-semibold font-mono mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Orçamento utilizado</span><span>{spentPct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${spentPct}%` }} />
              </div>
            </div>
            {timePct != null && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Tempo decorrido</span><span>{timePct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${timePct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Etapas */}
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">
            Etapas · {project.milestones.filter(m => m.done).length}/{project.milestones.length} concluídas
          </p>
          <div className="space-y-2">
            {project.milestones.map((m, i) => {
              const cfg = STEP_STATUS_CONFIG[m.status];
              return (
                <div key={i} className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <p className="text-sm font-medium text-foreground flex-1">{m.label}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  {m.photos.length > 0 && (
                    <div className="flex gap-2 px-3 pb-3 overflow-x-auto">
                      {m.photos.map((url, j) => (
                        <img key={j} src={url} alt="" className="w-24 h-16 object-cover rounded-lg shrink-0 border border-border" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Galeria */}
        {project.photos.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">Galeria</p>
            <div className="grid grid-cols-2 gap-2">
              {project.photos.map((ph, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-border">
                  <img src={ph.url} alt={ph.caption} className="w-full h-28 object-cover" />
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-foreground leading-snug">{ph.caption}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{ph.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  const items: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Obras", icon: <Home size={20} /> },
    { id: "quotes", label: "Orçamentos", icon: <ClipboardList size={20} /> },
    { id: "newQuote", label: "Novo Orçamento", icon: <FilePlus size={20} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-40">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
            active === item.id ? "text-accent" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project>(PROJECTS[0]);
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [quotes, setQuotes] = useState<QuoteRecord[]>(MOCK_QUOTES);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRecord | null>(null);

  const handleOpenProject = (p: Project) => {
    setSelectedProject(p);
    setScreen("detail");
  };

  const handleOpenQuote = (q: QuoteRecord) => {
    setSelectedQuote(q);
    setScreen("quoteDetail");
  };

  const handleUpdateQuote = (updated: QuoteRecord) => {
    setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
    setSelectedQuote(updated);
  };

  const handleGenerateProject = (q: QuoteRecord) => {
    const lastName = q.clientName.split(" ").pop() ?? q.clientName;
    const newProject: Project = {
      id: Date.now(),
      name: `Studio ${lastName}`,
      client: q.clientName,
      status: "Em andamento",
      progress: 0,
      budgeted: q.budgeted,
      contractValue: q.contractValue,
      spent: 0,
      expenses: [],
      milestones: [],
      photos: [],
      phase: "Iniciando",
      location: "–",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=500&fit=crop&auto=format",
      startDate: q.startDate || "–",
      endDate: q.endDate || "–",
      quoteDeadline: q.quoteDeadline,
    };
    setProjects(prev => [...prev, newProject]);
    setScreen("dashboard");
  };

  const handleQuoteCreated = (q: QuoteRecord) => {
    setQuotes(prev => [q, ...prev]);
  };

  const showNav = screen === "dashboard" || screen === "quotes" || screen === "newQuote";

  return (
    <div className="w-full min-h-screen bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      {screen === "dashboard" && (
        <Dashboard
          projects={projects}
          onOpenProject={handleOpenProject}
          onNewProject={() => setScreen("newQuote")}
        />
      )}
      {screen === "detail" && (
        <ProjectDetail project={selectedProject} onBack={() => setScreen("dashboard")} />
      )}
      {screen === "newQuote" && (
        <NewQuote
          onBack={() => setScreen("quotes")}
          onQuoteCreated={handleQuoteCreated}
        />
      )}
      {screen === "quotes" && (
        <QuotesList quotes={quotes} onOpenQuote={handleOpenQuote} />
      )}
      {screen === "quoteDetail" && selectedQuote && (
        <QuoteDetail
          quote={selectedQuote}
          onBack={() => setScreen("quotes")}
          onUpdateQuote={handleUpdateQuote}
          onGenerateProject={handleGenerateProject}
        />
      )}
      {showNav && (
        <BottomNav active={screen} onChange={setScreen} />
      )}
    </div>
  );
}
