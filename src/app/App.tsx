import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Plus, Building2, TrendingUp, Clock, ArrowLeft, X,
  Camera, FileText, LayoutDashboard, Receipt, Image,
  CheckCircle, Circle, Upload, Phone, User, DollarSign, Mail,
  HardHat, Wrench, Home, CalendarDays, CalendarCheck, CalendarClock,
  ListChecks, ChevronRight, Trash2, PackagePlus, ClipboardList, FilePlus,
  Printer, ShieldCheck, HardHatIcon, FileBarChart2, Pencil, RotateCcw, CheckCheck, Ban, AlertTriangle
} from "lucide-react";
import type {
  Screen, Project, ProjectStatus, Milestone, StepStatus, Expense, ProjectPhoto, ProjectDocument,
  QuoteRecord, QuoteItem, QuoteStatus, Contractor, DetailTab,
} from "../lib/types";
import { projectsApi, quotesApi, contractorsApi } from "../lib/api";


// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  d && d.includes("-") ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : d;

const parseAnyDate = (d: string): Date | null => {
  if (!d) return null;
  if (d.includes("/")) {
    const [dd, mm, yyyy] = d.split("/").map(Number);
    return new Date(yyyy, mm - 1, dd);
  }
  if (d.includes("-")) return new Date(d + "T12:00:00");
  return null;
};

const statusColors: Record<ProjectStatus, string> = {
  "Em andamento": "bg-blue-100 text-blue-700",
  "Concluído": "bg-green-100 text-green-700",
  "Pausado": "bg-yellow-100 text-yellow-700",
  "Cancelada": "bg-red-100 text-red-700",
  "Orçamento": "bg-purple-100 text-purple-700",
};

const statusDot: Record<ProjectStatus, string> = {
  "Em andamento": "bg-blue-500",
  "Concluído": "bg-green-500",
  "Pausado": "bg-yellow-500",
  "Cancelada": "bg-red-500",
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

type DashFilter = "pagamentos" | "atrasadas" | "ativas" | "entregas" | null;

function Dashboard({ projects, onOpenProject, onNewProject }: {
  projects: Project[];
  onOpenProject: (p: Project) => void;
  onNewProject: () => void;
}) {
  const [activeFilter, setActiveFilter] = useState<DashFilter>(null);
  const [showAllPayments, setShowAllPayments] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDeadline = (d: string) => {
    const [dd, mm, yyyy] = d.split("/").map(Number);
    return new Date(yyyy, mm - 1, dd);
  };

  const activeProjects = projects.filter(p => p.status === "Em andamento" || p.status === "Pausado");

  const pendingPayments = activeProjects.flatMap(p =>
    p.expenses
      .filter(e => e.isPayment && e.paymentStatus === "A fazer")
      .map(e => ({ ...e, projectName: p.name, projectId: p.id, project: p }))
  ).sort((a, b) => {
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    return 1;
  });
  const pendingPaymentsTotal = pendingPayments.reduce((s, e) => s + e.amount, 0);

  const overdueProjectIds = new Set(
    activeProjects
      .filter(p => p.milestones.some(m => m.deadline && m.status !== "Concluído" && m.status !== "Cancelado" && parseDeadline(m.deadline) < today))
      .map(p => p.id)
  );
  const overdueMilestoneCount = activeProjects.reduce((acc, p) =>
    acc + p.milestones.filter(m => m.deadline && m.status !== "Concluído" && m.status !== "Cancelado" && parseDeadline(m.deadline) < today).length, 0
  );

  const in30Days = new Date(today); in30Days.setDate(today.getDate() + 30);
  const nearDeadlineProjects = activeProjects.filter(p => {
    if (!p.endDate || p.endDate === "–") return false;
    const [dd, mm, yyyy] = p.endDate.split("/").map(Number);
    const end = new Date(yyyy, mm - 1, dd);
    return end >= today && end <= in30Days;
  });

  const in2Days = new Date(today); in2Days.setDate(today.getDate() + 2);

  type MatAlerta = {
    projectName: string; projectId: number;
    milestoneName: string; startDate: string; orderByDate: Date;
    pendingItems: string[];
  };
  const materiaisUrgentes: MatAlerta[] = activeProjects.flatMap(p =>
    p.milestones
      .filter(m => m.startDate && (m.materials ?? []).some(mat => mat.status === "Pendente"))
      .flatMap(m => {
        const startD = parseAnyDate(m.startDate!);
        if (!startD) return [];
        const orderBy = new Date(startD);
        orderBy.setDate(orderBy.getDate() - 2);
        if (orderBy > in2Days || startD < today) return [];
        return [{
          projectName: p.name, projectId: p.id,
          milestoneName: m.label, startDate: m.startDate!,
          orderByDate: orderBy,
          pendingItems: (m.materials ?? []).filter(mat => mat.status === "Pendente").map(mat => mat.description),
        }];
      })
  );

  const filteredProjects = (() => {
    switch (activeFilter) {
      case "pagamentos": return projects.filter(p => p.expenses.some(e => e.isPayment && e.paymentStatus === "A fazer"));
      case "atrasadas":  return projects.filter(p => overdueProjectIds.has(p.id));
      case "ativas":     return activeProjects;
      case "entregas":   return nearDeadlineProjects;
      default:           return projects;
    }
  })();

  const toggleFilter = (f: DashFilter) => setActiveFilter(prev => prev === f ? null : f);

  const visiblePayments = showAllPayments ? pendingPayments : pendingPayments.slice(0, 2);

  const now = new Date();
  const monthLabel = (() => {
    const raw = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase().replace(/(\d)/, m => m);
  })();

  const indCard = (
    id: DashFilter,
    icon: React.ReactNode,
    value: string,
    label: string,
    sub: string,
    alertColors: { card: string; ring: string; val: string; lbl: string; sub: string } | null
  ) => {
    const isActive = activeFilter === id;
    const hasAlert = alertColors !== null;
    const neutral = {
      card: "bg-green-50 border-green-200 hover:border-green-300",
      ring: "ring-green-300",
      val: "text-green-900",
      lbl: "text-green-800",
      sub: "text-green-700",
    };
    const c = hasAlert ? alertColors : neutral;
    return (
      <button
        onClick={() => toggleFilter(id)}
        className={`flex-shrink-0 w-32 rounded-xl p-3 text-left border transition-all ${c.card} ${isActive ? `ring-2 ${c.ring}` : ""}`}
      >
        <div className="mb-1.5">{icon}</div>
        <p className={`text-xl font-semibold leading-none mb-1 ${c.val}`}>{value}</p>
        <p className={`text-[10px] font-medium leading-tight ${c.lbl}`}>{label}</p>
        <p className={`text-[9px] mt-0.5 ${c.sub}`}>{sub}</p>
      </button>
    );
  };

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
          <p className="text-xs text-primary-foreground/60">{monthLabel}</p>
          <p className="text-sm font-medium">Painel</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto pb-24">
        {/* Indicator strip */}
        <div
          className="flex gap-3 overflow-x-auto py-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          {indCard(
            "pagamentos",
            <DollarSign size={15} className={pendingPayments.length > 0 ? "text-amber-600" : "text-green-600"} />,
            pendingPayments.length > 0 ? fmt(pendingPaymentsTotal) : "—",
            "Pagamentos",
            pendingPayments.length > 0 ? `${pendingPayments.length} pendente${pendingPayments.length > 1 ? "s" : ""}` : "Nenhum pendente",
            pendingPayments.length > 0 ? { card: "bg-amber-50 border-amber-200 hover:border-amber-300", ring: "ring-amber-300", val: "text-amber-900", lbl: "text-amber-800", sub: "text-amber-700" } : null
          )}
          {indCard(
            "atrasadas",
            <CalendarClock size={15} className={overdueMilestoneCount > 0 ? "text-red-500" : "text-green-600"} />,
            overdueMilestoneCount > 0 ? String(overdueMilestoneCount) : "—",
            "Etapas atrasadas",
            overdueMilestoneCount > 0 ? `em ${overdueProjectIds.size} obra${overdueProjectIds.size > 1 ? "s" : ""}` : "Tudo em dia",
            overdueMilestoneCount > 0 ? { card: "bg-red-50 border-red-200 hover:border-red-300", ring: "ring-red-300", val: "text-red-900", lbl: "text-red-800", sub: "text-red-700" } : null
          )}
          {indCard(
            "ativas",
            <Building2 size={15} className="text-blue-600" />,
            String(activeProjects.length),
            "Obras ativas",
            `${projects.length} total`,
            { card: "bg-blue-50 border-blue-200 hover:border-blue-300", ring: "ring-blue-300", val: "text-blue-900", lbl: "text-blue-800", sub: "text-blue-700" }
          )}
          {indCard(
            "entregas",
            <PackagePlus size={15} className={materiaisUrgentes.length > 0 ? "text-amber-600" : "text-green-600"} />,
            materiaisUrgentes.length > 0 ? String(materiaisUrgentes.length) : "—",
            "Mat. a pedir",
            materiaisUrgentes.length > 0 ? `${materiaisUrgentes.length} etapa${materiaisUrgentes.length > 1 ? "s" : ""} urgente${materiaisUrgentes.length > 1 ? "s" : ""}` : "Nenhum urgente",
            materiaisUrgentes.length > 0 ? { card: "bg-amber-50 border-amber-200 hover:border-amber-300", ring: "ring-amber-300", val: "text-amber-900", lbl: "text-amber-800", sub: "text-amber-700" } : null
          )}
        </div>

        <div className="px-4 space-y-5">
          {/* Alerta D-2: Materiais a pedir */}
          {materiaisUrgentes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2.5 flex items-center gap-2">
                <PackagePlus size={14} className="text-amber-500" />
                Materiais a pedir
              </h2>
              <div className="space-y-2">
                {materiaisUrgentes.map((alerta, i) => {
                  const isOverdue = alerta.orderByDate < today;
                  return (
                    <div key={i} className={`rounded-xl border p-3.5 ${isOverdue ? "border-red-800/40 bg-red-900/10" : "border-amber-800/40 bg-amber-900/10"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{alerta.milestoneName}</p>
                          <p className="text-[11px] text-muted-foreground">{alerta.projectName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-[10px] font-semibold ${isOverdue ? "text-red-400" : "text-amber-400"}`}>
                            {isOverdue ? "Prazo esgotado" : `Pedir até ${alerta.orderByDate.toLocaleDateString("pt-BR")}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Início: {fmtDate(alerta.startDate)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {alerta.pendingItems.map((item, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">{item}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment feed */}
          {pendingPayments.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2.5 flex items-center gap-2">
                <DollarSign size={13} className="text-amber-600" />
                Pagamentos a fazer
              </h2>
              <div className="space-y-2">
                {visiblePayments.map((pay, i) => {
                  const due = pay.dueDate ? new Date(pay.dueDate + "T12:00:00") : null;
                  const isOverdue = due && due < today;
                  const isDueToday = due && due.toDateString() === today.toDateString();
                  return (
                    <button
                      key={i}
                      onClick={() => onOpenProject(pay.project)}
                      className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-left hover:border-accent/40 hover:shadow-sm transition-all"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-100" : isDueToday ? "bg-amber-100" : "bg-muted"}`}>
                        <DollarSign size={13} className={isOverdue ? "text-red-600" : isDueToday ? "text-amber-600" : "text-muted-foreground"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{pay.description}</p>
                        <p className="text-xs text-muted-foreground truncate">{pay.projectName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono font-semibold text-foreground">{fmt(pay.amount)}</p>
                        {due && (
                          <p className={`text-[10px] font-mono ${isOverdue ? "text-red-500 font-semibold" : isDueToday ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                            {isOverdue ? "Atrasado" : isDueToday ? "Hoje" : due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
                {pendingPayments.length > 2 && !showAllPayments && (
                  <button
                    onClick={() => setShowAllPayments(true)}
                    className="w-full text-xs text-accent font-medium py-1 hover:underline"
                  >
                    + {pendingPayments.length - 2} pagamento{pendingPayments.length - 2 > 1 ? "s" : ""} restante{pendingPayments.length - 2 > 1 ? "s" : ""}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Obras
              {activeFilter && <span className="text-xs font-normal text-muted-foreground">· filtrado</span>}
            </h2>
            <div className="flex items-center gap-2">
              {activeFilter && (
                <button
                  onClick={() => setActiveFilter(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                >
                  <X size={10} /> limpar
                </button>
              )}
              <span className="text-xs text-muted-foreground font-mono">
                {filteredProjects.length} projeto{filteredProjects.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Project cards */}
          <div className="-mt-2 space-y-3 pb-2">
            {filteredProjects.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">Nenhuma obra neste filtro</p>
            ) : filteredProjects.map(project => {
              const isActiveProject = project.status === "Em andamento" || project.status === "Pausado";
              const hasOverdue = isActiveProject && project.milestones.some(m =>
                m.deadline && m.status !== "Concluído" && m.status !== "Cancelado" && parseDeadline(m.deadline) < today
              );
              const hasPendingPayment = project.expenses.some(e => e.isPayment && e.paymentStatus === "A fazer");
              const alertLevel = hasOverdue ? "grave" : hasPendingPayment ? "medio" : null;
              return (
              <button
                key={project.id}
                onClick={() => onOpenProject(project)}
                className={`w-full bg-card rounded-xl overflow-hidden text-left hover:shadow-md transition-all group border ${
                  alertLevel === "grave" ? "border-red-200 hover:border-red-300" :
                  alertLevel === "medio" ? "border-amber-200 hover:border-amber-300" :
                  "border-border hover:border-accent/30"
                }`}
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
                  {(() => {
                    const prog = project.milestones.length > 0
                      ? Math.round(project.milestones.filter(m => m.status === "Concluído").length / project.milestones.length * 100)
                      : project.progress;
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">{project.phase}</span>
                          <span className="text-xs font-mono font-medium text-foreground">{prog}%</span>
                        </div>
                        <ProgressBar
                          value={prog}
                          color={project.status === "Concluído" ? "bg-green-500" : project.status === "Pausado" ? "bg-yellow-400" : "bg-accent"}
                        />
                      </>
                    );
                  })()}
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-xs text-muted-foreground">{project.client}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {fmt(project.expenses.reduce((s, e) => s + e.amount, 0))} / {fmt(project.budgeted)}
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
                  {alertLevel && (
                    <div className={`-mx-4 -mb-3 mt-3 px-4 py-1.5 flex items-center gap-1.5 ${
                      alertLevel === "grave"
                        ? "bg-red-50 border-t border-red-100"
                        : "bg-amber-50 border-t border-amber-100"
                    }`}>
                      <AlertTriangle size={10} className={alertLevel === "grave" ? "text-red-500" : "text-amber-500"} />
                      <span className={`text-[10px] font-medium ${alertLevel === "grave" ? "text-red-600" : "text-amber-600"}`}>
                        {alertLevel === "grave" ? "Etapa atrasada" : "Pagamento pendente"}
                      </span>
                    </div>
                  )}
                </div>
              </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Screen B: Project Detail ─────────────────────────────────────────────────

const STEP_STATUS_CONFIG: Record<StepStatus, { label: string; color: string; dot: string }> = {
  "Concluído":    { label: "Concluído",    color: "bg-green-100 text-green-700 border-green-200",          dot: "bg-green-500" },
  "Em andamento": { label: "Em andamento", color: "bg-primary/20 text-primary border-primary/30",           dot: "bg-primary" },
  "Pendente":     { label: "Pendente",     color: "bg-muted text-muted-foreground border-border",           dot: "bg-muted-foreground" },
  "Cancelado":    { label: "Cancelado",    color: "bg-red-900/30 text-red-400 border-red-900",              dot: "bg-red-400" },
};

const PHASE_TEMPLATES: { label: string; description: string }[] = [
  { label: "Demolição e limpeza",          description: "Remoção de revestimentos existentes, demolição de paredes não estruturais e limpeza geral do ambiente." },
  { label: "Instalações hidráulicas",      description: "Substituição ou instalação de tubulação de água fria, quente e esgoto." },
  { label: "Instalações elétricas",        description: "Passagem de fiação, instalação de quadro de distribuição e pontos de tomada/iluminação." },
  { label: "Alvenaria e divisórias",       description: "Construção de novas divisórias em alvenaria ou drywall conforme projeto." },
  { label: "Revestimentos e piso",         description: "Assentamento de porcelanato, cerâmica, pedras ou piso laminado, incluindo rodapés." },
  { label: "Forro e gesso",               description: "Instalação de forro de gesso, sancas, molduras e reboco fino nas paredes." },
  { label: "Pintura",                      description: "Aplicação de massa corrida, selador e tinta látex premium em paredes e teto." },
  { label: "Marcenaria e esquadrias",      description: "Instalação de móveis planejados, portas, janelas e demais esquadrias." },
  { label: "Acabamentos e entrega",        description: "Instalação de louças, metais, luminárias, rodapés e limpeza fina para entrega." },
];

function StepModal({ step, onClose, onSave, isNew = false, projectStartDate }: {
  step: Milestone;
  onClose: () => void;
  onSave: (updated: Milestone) => void;
  isNew?: boolean;
  projectStartDate?: string;
}) {
  const [draft, setDraft] = useState<Milestone>({ ...step });
  const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<StepStatus | null>(null);
  const [availableContractors, setAvailableContractors] = useState<Contractor[]>([]);
  const [contractorSearch, setContractorSearch] = useState("");
  const [showContractorDropdown, setShowContractorDropdown] = useState(false);

  useEffect(() => {
    contractorsApi.list().then(setAvailableContractors).catch(() => {});
  }, []);
  const [extendingDeadline, setExtendingDeadline] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const [dateError, setDateError] = useState("");
  const [statusError, setStatusError] = useState("");

  const projectStartIso = projectStartDate && projectStartDate !== "–"
    ? projectStartDate.split("/").reverse().join("-")
    : null;

  const toIso = (d: string) => {
    if (!d) return "";
    if (d.includes("/")) return d.split("/").reverse().join("-");
    return d;
  };

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

    if (pendingStatus === "Em andamento") {
      const startIso = toIso(draft.startDate ?? "");
      if (startIso && today < startIso) {
        setStatusError(`Início previsto é ${fmtDate(startIso)} — ainda não chegou essa data.`);
        return;
      }
      if (projectStartIso && today < projectStartIso) {
        setStatusError(`A obra ainda não foi iniciada (início: ${projectStartDate}).`);
        return;
      }
    }

    setStatusError("");
    setDraft(prev => ({
      ...prev,
      status: pendingStatus,
      done: pendingStatus === "Concluído",
      completedAt: pendingStatus === "Concluído" ? today : "",
      startedAt: pendingStatus === "Em andamento" ? (prev.startedAt || today) : prev.startedAt,
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
          {/* Templates de etapa (apenas se novo) */}
          {isNew && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground block">Usar modelo padrão</label>
              <div className="flex flex-wrap gap-2">
                {PHASE_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => {
                      if (pickedTemplate === t.label) {
                        setPickedTemplate(null);
                        setDraft(d => ({ ...d, label: "", description: "" }));
                      } else {
                        setPickedTemplate(t.label);
                        setDraft(d => ({ ...d, label: t.label, description: t.description }));
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      pickedTemplate === t.label
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-muted/60 text-muted-foreground border-border hover:border-accent/50 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nome (apenas se novo) */}
          {isNew && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {pickedTemplate ? "Nome da etapa" : "Ou nomeie uma etapa personalizada"}
              </label>
              <input
                type="text"
                value={draft.label}
                onChange={e => { setPickedTemplate(null); setDraft({ ...draft, label: e.target.value }); }}
                placeholder="Ex: Instalações hidráulicas"
                className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          )}

          {/* Datas — início e prazo, lado a lado */}
          <div className={isNew ? "grid grid-cols-2 gap-3" : "space-y-2"}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block flex items-center gap-1.5">
                <CalendarDays size={11} className="text-accent" /> Início previsto <span className="text-accent">*</span>
              </label>
              <input
                type="date"
                value={draft.startDate ? (draft.startDate.includes("/") ? draft.startDate.split("/").reverse().join("-") : draft.startDate) : ""}
                onChange={e => {
                  setDraft({ ...draft, startDate: e.target.value });
                  if (projectStartIso && e.target.value && e.target.value < projectStartIso) {
                    setDateError(`A data de início não pode ser anterior ao início da obra (${projectStartDate}).`);
                  } else {
                    setDateError("");
                  }
                }}
                className={`w-full bg-input-background rounded-lg px-3 py-2.5 text-xs outline-none focus:ring-2 ring-accent/40 border text-foreground font-mono ${dateError ? "border-red-400" : "border-border"}`}
              />
              {dateError && <p className="text-[10px] text-red-400 leading-tight">{dateError}</p>}
              {!dateError && <p className="text-[10px] text-muted-foreground/70 leading-tight">
                Previsão — usada no cronograma e pode ser ajustada depois.
              </p>}
            </div>

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
          </div>{/* fim grid datas */}

          {/* Início real — chip read-only, preenchido ao virar "Em andamento" */}
          {draft.startedAt && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-900/20 border border-blue-800/40 rounded-lg">
              <CalendarDays size={13} className="text-blue-400 shrink-0" />
              <span className="text-xs text-blue-400 font-mono">
                Início real: {fmtDate(draft.startedAt)}
              </span>
            </div>
          )}

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

          {/* ── Seção: Empreiteiro ── */}
          <div className="rounded-xl border border-border bg-muted/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/60">
              <HardHatIcon size={13} className="text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Empreiteiro</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Selecionar da base</label>
                <div className="relative">
                  <input
                    type="text"
                    value={draft.contractorName
                      ? (contractorSearch || draft.contractorName)
                      : contractorSearch}
                    onChange={e => {
                      setContractorSearch(e.target.value);
                      setShowContractorDropdown(true);
                      if (!e.target.value) {
                        setDraft({ ...draft, contractorName: undefined, contractorPhone: undefined });
                      }
                    }}
                    onFocus={() => setShowContractorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowContractorDropdown(false), 150)}
                    placeholder={availableContractors.length === 0 ? "Nenhum empreiteiro cadastrado" : "Buscar empreiteiro..."}
                    className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50"
                  />
                  {showContractorDropdown && availableContractors.length > 0 && (() => {
                    const term = contractorSearch.toLowerCase();
                    const filtered = availableContractors.filter(c =>
                      c.status === "Ativo" && (!term || c.name.toLowerCase().includes(term) || c.specialty.toLowerCase().includes(term))
                    );
                    if (filtered.length === 0) return null;
                    return (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                        {filtered.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => {
                              setDraft({ ...draft, contractorName: c.name, contractorPhone: c.phone });
                              setContractorSearch("");
                              setShowContractorDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-accent/10 transition-colors border-b border-border/50 last:border-0"
                          >
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">{c.specialty} · {c.phone}</p>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                {draft.contractorName && draft.contractorPhone && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{draft.contractorName}</span>
                    <span>·</span>
                    <span>{draft.contractorPhone}</span>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, contractorName: undefined, contractorPhone: undefined })}
                      className="ml-auto text-muted-foreground/60 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Valor combinado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={draft.contractorValue != null ? new Intl.NumberFormat("pt-BR").format(draft.contractorValue) : ""}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setDraft({ ...draft, contractorValue: raw ? parseInt(raw, 10) : undefined });
                    }}
                    placeholder="0"
                    className="w-full bg-input-background rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
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
                  {statusError && (
                    <p className="text-xs text-red-400 text-center leading-snug">{statusError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setPendingStatus(null); setStatusError(""); }}
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
            disabled={!draft.label.trim() || !draft.startDate || !!dateError}
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

// ─── Documentos Tab ──────────────────────────────────────────────────────────

function DocumentosTab({
  documents,
  onAdd,
  onRemove,
}: {
  documents: ProjectDocument[];
  onAdd: (doc: ProjectDocument) => void;
  onRemove: (id: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const nowStr = () => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
  };

  const handleAdd = () => {
    if (!docTitle.trim() || !docFile) return;
    const url = URL.createObjectURL(docFile);
    onAdd({
      id: Date.now(),
      title: docTitle.trim(),
      description: docDescription.trim(),
      url,
      fileName: docFile.name,
      uploadedAt: nowStr(),
    });
    setDocTitle("");
    setDocDescription("");
    setDocFile(null);
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      {documents.length === 0 && !uploading && (
        <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-3 text-center">
          <FileText size={32} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum documento adicionado ainda</p>
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug">{doc.title}</p>
                {doc.description && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{doc.description}</p>}
                <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{doc.fileName} · {doc.uploadedAt}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                  title="Abrir"
                >
                  <Upload size={13} className="rotate-180" />
                </a>
                <button
                  type="button"
                  onClick={() => onRemove(doc.id)}
                  className="p-1.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Remover"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading ? (
        <div className="bg-card border border-accent/30 rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Novo documento</p>
          <input
            type="text"
            placeholder="Título do documento"
            value={docTitle}
            onChange={e => setDocTitle(e.target.value)}
            className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50"
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={docDescription}
            onChange={e => setDocDescription(e.target.value)}
            className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50"
          />
          <div>
            <input
              type="file"
              id="doc-upload-input"
              accept=".pdf"
              className="hidden"
              onChange={e => setDocFile(e.target.files?.[0] ?? null)}
            />
            {docFile ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                <FileText size={14} className="text-red-500 shrink-0" />
                <span className="text-foreground flex-1 min-w-0 truncate">{docFile.name}</span>
                <button type="button" onClick={() => setDocFile(null)} className="text-muted-foreground hover:text-red-400 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("doc-upload-input")?.click()}
                className="w-full py-2.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={13} /> Selecionar arquivo PDF
              </button>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setUploading(false); setDocTitle(""); setDocDescription(""); setDocFile(null); }}
              className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!docTitle.trim() || !docFile}
              className="flex-1 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Adicionar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setUploading(true)}
          className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
        >
          <FilePlus size={16} /> Adicionar Documento
        </button>
      )}
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────────────────

function ProjectDetail({ project, onBack, onUpdateProject }: {
  project: Project;
  onBack: () => void;
  onUpdateProject?: (p: Project) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("visao");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [milestones, setMilestones] = useState<Milestone[]>(project.milestones);
  const [expenses, setExpenses] = useState<Expense[]>(project.expenses);
  const [photos, setPhotos] = useState(project.photos);
  const [documents, setDocuments] = useState<ProjectDocument[]>(project.documents ?? []);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption: string; date: string } | null>(null);

  const computedProgress = milestones.length > 0
    ? Math.round(milestones.filter(m => m.status === "Concluído").length / milestones.length * 100)
    : project.progress;

  const computedPhase = (() => {
    if (milestones.length === 0) return project.phase;
    const inProgress = milestones.find(m => m.status === "Em andamento");
    if (inProgress) return inProgress.label;
    const next = milestones.find(m => m.status === "Pendente");
    if (next) return next.label;
    return "Concluída";
  })();

  const propagate = (newMilestones: Milestone[]) => {
    const progress = newMilestones.length > 0
      ? Math.round(newMilestones.filter(m => m.status === "Concluído").length / newMilestones.length * 100)
      : project.progress;
    const inProg = newMilestones.find(m => m.status === "Em andamento");
    const next = newMilestones.find(m => m.status === "Pendente");
    const phase = newMilestones.length === 0 ? project.phase
      : inProg ? inProg.label
      : next ? next.label
      : "Concluída";
    onUpdateProject?.({ ...project, milestones: newMilestones, expenses, status, progress, phase });
  };
  const [editingStep, setEditingStep] = useState<Milestone | null>(null);
  const [creatingStep, setCreatingStep] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expenseDraft, setExpenseDraft] = useState({ description: "", category: "Material", amount: "", notes: "", isPayment: false, paymentStatus: "A fazer" as "Realizado" | "A fazer", dueDate: "" });
  const [projectAction, setProjectAction] = useState<"concluir" | "cancelar" | "pausar" | "retomar" | null>(null);
  const [projectActionReason, setProjectActionReason] = useState("");

  const nowTs = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const addProjectHistory = (p: Project, description: string): Project => ({
    ...p,
    history: [...(p.history ?? []), { datetime: nowTs(), description }],
  });

  const allConcluded = milestones.length > 0 && milestones.every(m => m.status === "Concluído" || m.status === "Cancelado");
  const hasPendingPayments = expenses.some(e => e.isPayment && e.paymentStatus === "A fazer");
  const canConclude = allConcluded && !hasPendingPayments;

  const handleProjectAction = () => {
    if (!projectAction) return;
    let newStatus: ProjectStatus;
    let historyMsg: string;
    if (projectAction === "concluir") {
      newStatus = "Concluído";
      historyMsg = "Obra concluída.";
    } else if (projectAction === "pausar") {
      newStatus = "Pausado";
      historyMsg = projectActionReason.trim() ? `Obra pausada — ${projectActionReason.trim()}` : "Obra pausada.";
    } else if (projectAction === "retomar") {
      newStatus = "Em andamento";
      historyMsg = "Obra retomada.";
    } else {
      newStatus = "Cancelada";
      historyMsg = projectActionReason.trim() ? `Obra cancelada — ${projectActionReason.trim()}` : "Obra cancelada.";
    }
    const updated = addProjectHistory(
      { ...project, milestones, expenses, status: newStatus, progress: computedProgress, phase: computedPhase, cancelReason: projectActionReason.trim() || undefined },
      historyMsg
    );
    onUpdateProject?.(updated);
    setStatus(newStatus);
    setProjectAction(null);
    setProjectActionReason("");
  };
  const [showReport, setShowReport] = useState(false);

  const emptyStep: Milestone = {
    label: "", done: false, date: "", status: "Pendente",
    description: "", startDate: "", deadline: "", completedAt: "", photos: [],
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = project.budgeted - totalExpenses;
  const pieData = [
    { name: "Gasto", value: totalExpenses },
    { name: "Restante", value: Math.max(0, remaining) },
  ];
  const PIE_COLORS = ["#D97706", "#EDF0F4"];

  const PT_MONTH_ORDER: Record<string, number> = {
    Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5,
    Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11,
  };
  const monthlyData = (() => {
    const grouped: Record<string, { mes: string; valor: number; sort: number }> = {};
    expenses.forEach(exp => {
      // date format: "DD Mon YYYY" e.g. "02 Jul 2025"
      const parts = exp.date.split(" ");
      if (parts.length < 3) return;
      const [, mon, year] = parts;
      const key = `${year}-${PT_MONTH_ORDER[mon] ?? 0}`;
      if (!grouped[key]) grouped[key] = { mes: mon, valor: 0, sort: parseInt(year) * 100 + (PT_MONTH_ORDER[mon] ?? 0) };
      grouped[key].valor += exp.amount;
    });
    return Object.values(grouped).sort((a, b) => a.sort - b.sort).map(({ mes, valor }) => ({ mes, valor }));
  })();

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
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-white/70 text-xs mb-0.5">{project.location}</p>
              <h2 className="text-white text-xl font-semibold leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {project.name}
              </h2>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColors[status]}`}>
              {status}
            </span>
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
          <p className="text-[10px] text-primary-foreground/60 font-mono">Gasto</p>
          <p className="font-semibold font-mono text-sm text-amber-400">{fmt(totalExpenses)}</p>
        </div>
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Contrato</p>
          <p className="font-semibold font-mono text-sm text-green-400">{fmt(project.contractValue)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-primary-foreground/60 font-mono">Saldo</p>
          <p className={`font-semibold font-mono text-sm ${remaining >= 0 ? "text-green-400" : "text-red-400"}`}>
            {fmt(remaining)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card overflow-x-auto" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
        {([
          { id: "visao",       label: "Visão Geral",  icon: <LayoutDashboard size={14} /> },
          { id: "etapas",      label: "Etapas",       icon: <ListChecks size={14} /> },
          { id: "cronograma",  label: "Cronograma",   icon: <CalendarDays size={14} /> },
          { id: "despesas",    label: "Despesas",      icon: <Receipt size={14} /> },
          { id: "galeria",     label: "Galeria",       icon: <Image size={14} /> },
          { id: "documentos",  label: "Documentos",   icon: <FileText size={14} /> },
        ] as { id: DetailTab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-none flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto pb-40">
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
                  <p className="text-3xl font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>{computedProgress}%</p>
                  <ProgressBar
                    value={computedProgress}
                    color={project.status === "Concluído" ? "bg-green-500" : "bg-accent"}
                  />
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground font-mono mb-1">Fase atual</p>
                  <p className="text-xs font-medium text-foreground leading-snug">{computedPhase}</p>
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
              const effectiveSpent = totalExpenses > 0 ? totalExpenses : project.spent;
              const marginPlanned = project.contractValue - project.budgeted;
              const marginReal = project.contractValue - effectiveSpent;
              const marginPlannedPct = project.contractValue > 0 ? (marginPlanned / project.contractValue) * 100 : 0;
              const marginRealPct = project.contractValue > 0 ? (marginReal / project.contractValue) * 100 : 0;

              const marginStatus = marginRealPct >= 15 ? "healthy" : marginRealPct >= 0 ? "warning" : "critical";
              const badgeConfig = {
                healthy: { cls: "bg-green-100 text-green-700 border-green-200", label: "Margem saudável" },
                warning: { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Margem em atenção" },
                critical: { cls: "bg-red-100 text-red-600 border-red-200", label: "Margem negativa" },
              }[marginStatus];

              const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" | "yellow" | "neutral" }) => (
                <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-sm font-mono font-semibold ${
                    highlight === "green"  ? "text-green-500" :
                    highlight === "red"    ? "text-red-500" :
                    highlight === "yellow" ? "text-amber-400" :
                    "text-foreground"
                  }`}>{value}</span>
                </div>
              );

              return (
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground font-mono">Financeiro</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${badgeConfig.cls}`}>
                      {badgeConfig.label}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Row label="Valor do contrato" value={fmt(project.contractValue)} />
                    <Row label="Custo orçado" value={fmt(project.budgeted)} />
                    <Row label="Custo executado" value={fmt(effectiveSpent)} />
                    <Row
                      label="Margem prevista"
                      value={`${fmt(marginPlanned)} · ${marginPlannedPct.toFixed(1)}%`}
                      highlight={marginPlanned >= 0 ? "neutral" : "red"}
                    />
                    <Row
                      label="Margem real"
                      value={`${fmt(marginReal)} · ${marginRealPct.toFixed(1)}%`}
                      highlight={marginRealPct >= 15 ? "green" : marginRealPct >= 0 ? "yellow" : "red"}
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
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${cfg.color}`}>{cfg.label}</span>
                      {m.startDate && (
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                          <CalendarDays size={9} /> {fmtDate(m.startDate)}
                        </span>
                      )}
                      {m.deadline && (
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                          <CalendarClock size={9} /> {fmtDate(m.deadline)}
                        </span>
                      )}
                      {m.completedAt && (
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                          <CalendarCheck size={9} /> {fmtDate(m.completedAt)}
                        </span>
                      )}
                      {m.contractorName && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <HardHatIcon size={9} /> {m.contractorName}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Materiais pendentes */}
                  {(m.materials ?? []).length > 0 && (
                    <div className={`flex items-center gap-1 shrink-0 ${
                      (m.materials ?? []).some(mat => mat.status === "Pendente") ? "text-amber-500" : "text-muted-foreground"
                    }`}>
                      <PackagePlus size={12} />
                      <span className="text-[10px]">
                        {(m.materials ?? []).filter(mat => mat.status === "Pendente").length}/
                        {(m.materials ?? []).length}
                      </span>
                    </div>
                  )}
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

        {/* TAB: Cronograma */}
        {tab === "cronograma" && (() => {
          const parseD = (d: string): Date | null => {
            if (!d) return null;
            if (d.includes("/")) {
              const [dd, mm, yyyy] = d.split("/").map(Number);
              return new Date(yyyy, mm - 1, dd);
            }
            if (d.includes("-")) return new Date(d + "T12:00:00");
            return null;
          };
          const allDates = milestones.flatMap(m => [
            parseD(m.startDate ?? ""), parseD(m.deadline), parseD(m.completedAt)
          ]).filter(Boolean) as Date[];
          const projStart = parseD(project.startDate) ?? (allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date());
          const projEnd   = parseD(project.endDate)   ?? (allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date());
          const span = projEnd.getTime() - projStart.getTime() || 1;
          const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - projStart.getTime()) / span) * 100));
          const today = new Date();
          const todayPct = pct(today);
          const STATUS_COLORS: Record<StepStatus, string> = {
            "Concluído":   "bg-emerald-500",
            "Em andamento": "bg-accent",
            "Pendente":    "bg-muted-foreground/40",
            "Cancelado":   "bg-red-500/50",
          };
          const monthNames = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
          const monthMarkers: { label: string; pos: number }[] = [];
          const cur = new Date(projStart.getFullYear(), projStart.getMonth(), 1);
          while (cur <= projEnd) {
            monthMarkers.push({
              label: `${monthNames[cur.getMonth()]}/${String(cur.getFullYear()).slice(-2)}`,
              pos: pct(new Date(cur)),
            });
            cur.setMonth(cur.getMonth() + 1);
          }
          const semData = milestones.filter(m => !parseD(m.startDate ?? "")).length;
          const comData = milestones.length - semData;
          if (comData === 0) {
            return (
              <div className="p-8 text-center">
                <CalendarDays size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma etapa com data de início definida.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Defina a data de início das etapas para visualizar o cronograma.
                </p>
              </div>
            );
          }
          return (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Cronograma de etapas</h3>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {project.startDate} → {project.endDate}
                </span>
              </div>

              {/* Gantt: scrollável horizontalmente em telas pequenas */}
              <div className="overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: "thin" } as React.CSSProperties}>
                <div style={{ minWidth: 520 }}>
                  {/* Régua de meses — alinhada à coluna das barras */}
                  <div className="flex items-end gap-3">
                    <div className="w-36 shrink-0" />
                    <div className="relative flex-1 h-4">
                      {monthMarkers.map((mk, i) => (
                        <span
                          key={i}
                          className="absolute text-[9px] text-muted-foreground font-mono whitespace-nowrap"
                          style={{ left: `${mk.pos}%`, bottom: 0 }}
                        >{mk.label}</span>
                      ))}
                    </div>
                    <div className="w-24 shrink-0" />
                  </div>

                  {/* Barras das etapas */}
                  <div className="relative mt-2 pt-4">
                    {/* Linha "Hoje" spanning todas as linhas — left = 9.75rem + todayPct% of bars area (100% - 16.5rem) */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div
                        className="absolute top-0 bottom-0 z-20 pointer-events-none"
                        style={{ left: `calc(${(9.75 - todayPct * 16.5 / 100).toFixed(4)}rem + ${todayPct}%)` }}
                      >
                        <div className="w-0.5 h-full bg-red-500 opacity-80" />
                        <span className="absolute top-0 -translate-x-1/2 text-[9px] font-semibold text-red-500 bg-background/90 px-1 rounded whitespace-nowrap leading-none py-0.5">Hoje</span>
                      </div>
                    )}
                    <div className="space-y-2.5">
                    {milestones.map((m, i) => {
                      const start = parseD(m.startDate ?? "");
                      const end   = parseD(m.deadline) ?? start;
                      if (!start || !end) return null;
                      const left  = pct(start);
                      const width = Math.max(1.5, pct(end) - left);
                      const realStart = parseD(m.startedAt ?? "");
                      const cfg = STEP_STATUS_CONFIG[m.status];
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-36 shrink-0 text-right">
                            <span className="text-[11px] text-foreground leading-tight line-clamp-2">{m.label}</span>
                          </div>
                          <div className="relative flex-1 h-6">
                            {monthMarkers.map((mk, j) => (
                              <div key={j} className="absolute inset-y-0 w-px bg-border/60" style={{ left: `${mk.pos}%` }} />
                            ))}
                            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-muted/40" />
                            <div
                              className={`absolute inset-y-1 rounded-full ${STATUS_COLORS[m.status]} transition-all`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                              title={`Previsto: ${fmtDate(m.startDate ?? "")} → ${fmtDate(m.deadline)}`}
                            />
                            {realStart && (
                              <div
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-blue-500 border border-white/70 z-20"
                                style={{ left: `${pct(realStart)}%` }}
                                title={`Início real: ${fmtDate(m.startedAt ?? "")}`}
                              />
                            )}
                          </div>
                          <div className="w-24 shrink-0">
                            <span className={`inline-block whitespace-nowrap text-[9px] px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Aviso de etapas sem data de início */}
              {semData > 0 && (
                <p className="text-[10px] text-amber-500/90 flex items-center gap-1.5">
                  <AlertTriangle size={11} />
                  {semData} etapa{semData > 1 ? "s" : ""} sem data de início não aparece{semData > 1 ? "m" : ""} no cronograma.
                </p>
              )}

              {/* Legenda */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                {(["Concluído","Em andamento","Pendente","Cancelado"] as StepStatus[]).map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-3 h-2 rounded-full ${STATUS_COLORS[s]}`} />
                    <span className="text-[10px] text-muted-foreground">{s}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rotate-45 bg-blue-500 border border-white/70" />
                  <span className="text-[10px] text-muted-foreground">Início real</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-px h-3 bg-red-500/70" />
                  <span className="text-[10px] text-muted-foreground">Hoje</span>
                </div>
              </div>
            </div>
          );
        })()}

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
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-medium text-foreground truncate">{exp.description}</p>
                    {exp.isPayment && (
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${exp.paymentStatus === "A fazer" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {exp.paymentStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {exp.date} · {exp.isPayment ? "Pagamento" : exp.category}
                    {exp.isPayment && exp.paymentStatus === "A fazer" && exp.dueDate && (
                      <span className="text-amber-600 font-medium"> · venc. {new Date(exp.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                    )}
                  </p>
                  {exp.notes && <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{exp.notes}</p>}
                </div>
                <p className="text-sm font-mono font-semibold text-foreground shrink-0">{fmt(exp.amount)}</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingExpenseId(exp.id);
                    setExpenseDraft({ description: exp.description, category: exp.category, amount: String(exp.amount), notes: exp.notes ?? "", isPayment: exp.isPayment ?? false, paymentStatus: exp.paymentStatus ?? "A fazer", dueDate: exp.dueDate ?? "" });
                    setAddingExpense(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0"
                >
                  <Pencil size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB: Galeria */}
        {tab === "galeria" && (
          <div className="space-y-4">
            {photos.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-3 text-center">
                <Camera size={32} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma foto adicionada ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((ph, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxPhoto(ph)}
                    className="bg-muted rounded-xl overflow-hidden border border-border text-left hover:border-accent/50 transition-colors"
                  >
                    <img src={ph.url} alt={ph.caption} className="w-full h-32 object-cover" />
                    <div className="p-2">
                      <p className="text-xs font-medium text-foreground leading-snug">{ph.caption}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{ph.date}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <input
              type="file"
              id="gallery-upload-input"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || []);
                const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
                files.forEach(file => {
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const url = ev.target?.result as string;
                    const now = new Date();
                    const dateStr = `${String(now.getDate()).padStart(2,"0")} ${months[now.getMonth()]} ${now.getFullYear()}`;
                    const newPhoto = { url, caption: file.name.replace(/\.[^.]+$/, ""), date: dateStr };
                    setPhotos(prev => {
                      const next = [...prev, newPhoto];
                      onUpdateProject?.({ ...project, milestones, expenses, photos: next, status, progress: computedProgress, phase: computedPhase });
                      return next;
                    });
                  };
                  reader.readAsDataURL(file);
                });
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => document.getElementById("gallery-upload-input")?.click()}
              className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={16} /> Adicionar Fotos
            </button>
          </div>
        )}

        {/* TAB: Documentos */}
        {tab === "documentos" && (
          <DocumentosTab
            documents={documents}
            onAdd={doc => {
              const next = [...documents, doc];
              setDocuments(next);
              onUpdateProject?.({ ...project, milestones, expenses, photos, status, progress: computedProgress, phase: computedPhase, documents: next });
            }}
            onRemove={id => {
              const next = documents.filter(d => d.id !== id);
              setDocuments(next);
              onUpdateProject?.({ ...project, milestones, expenses, photos, status, progress: computedProgress, phase: computedPhase, documents: next });
            }}
          />
        )}
      </div>


      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={lightboxPhoto.url} alt={lightboxPhoto.caption} className="w-full rounded-xl object-contain max-h-[70vh]" />
            <div className="mt-2 text-center">
              <p className="text-white text-sm font-medium">{lightboxPhoto.caption}</p>
              <p className="text-white/60 text-xs font-mono mt-0.5">{lightboxPhoto.date}</p>
            </div>
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white hover:bg-black/80 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Ações da obra (Concluir / Pausar / Cancelar) */}
      {status !== "Concluído" && status !== "Cancelada" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          {projectAction ? (
            <div className="max-w-2xl mx-auto space-y-3">
              <p className="text-sm font-medium text-foreground">
                {projectAction === "concluir" && "Confirmar conclusão da obra?"}
                {projectAction === "pausar" && "Confirmar pausa da obra?"}
                {projectAction === "cancelar" && "Confirmar cancelamento da obra?"}
                {projectAction === "retomar" && "Confirmar retomada da obra?"}
              </p>
              {(projectAction === "pausar" || projectAction === "cancelar") && (
                <input
                  type="text"
                  placeholder={projectAction === "cancelar" ? "Motivo do cancelamento (opcional)" : "Motivo da pausa (opcional)"}
                  value={projectActionReason}
                  onChange={e => setProjectActionReason(e.target.value)}
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm border border-border text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 ring-accent/40"
                />
              )}
              {projectAction === "concluir" && !allConcluded && (
                <p className="text-xs text-amber-500">Ainda há etapas não concluídas. Conclua todas as etapas antes de finalizar a obra.</p>
              )}
              {projectAction === "concluir" && allConcluded && hasPendingPayments && (
                <p className="text-xs text-amber-500">Ainda há pagamentos pendentes. Quite todos os pagamentos antes de finalizar a obra.</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setProjectAction(null); setProjectActionReason(""); }}
                  className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleProjectAction}
                  disabled={projectAction === "concluir" && !canConclude}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 ${
                    projectAction === "concluir" ? "bg-green-600 text-white hover:bg-green-700"
                    : projectAction === "pausar" ? "bg-yellow-500 text-white hover:bg-yellow-600"
                    : projectAction === "retomar" ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {projectAction === "concluir" && <><CheckCheck size={15} /> Confirmar conclusão</>}
                  {projectAction === "pausar" && "Confirmar pausa"}
                  {projectAction === "retomar" && <><RotateCcw size={15} /> Retomar obra</>}
                  {projectAction === "cancelar" && <><Ban size={15} /> Confirmar cancelamento</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex gap-2">
              {status !== "Concluído" && status !== "Pausado" && (
                <button
                  type="button"
                  onClick={() => setProjectAction("pausar")}
                  className="flex-1 py-2.5 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-xl text-xs font-medium hover:bg-yellow-200 transition-colors"
                >
                  Pausar obra
                </button>
              )}
              {status === "Pausado" && (
                <button
                  type="button"
                  onClick={() => setProjectAction("retomar")}
                  className="flex-1 py-2.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-medium hover:bg-blue-200 transition-colors"
                >
                  Retomar obra
                </button>
              )}
              <button
                type="button"
                onClick={() => setProjectAction("cancelar")}
                className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <Ban size={13} /> Cancelar obra
              </button>
              <button
                type="button"
                onClick={() => setProjectAction("concluir")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border ${
                  canConclude
                    ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                    : "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
                }`}
                title={!allConcluded ? "Conclua todas as etapas para liberar" : hasPendingPayments ? "Quite os pagamentos pendentes para liberar" : ""}
              >
                <CheckCheck size={13} /> Concluir obra
              </button>
            </div>
          )}
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <ReportModal
          project={{ ...project, milestones, expenses, progress: computedProgress }}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Step edit modal */}
      {editingStep && (
        <StepModal
          step={editingStep}
          onClose={() => setEditingStep(null)}
          projectStartDate={project.startDate}
          onSave={updated => {
            const next = milestones.map(m => m.label === editingStep.label ? updated : m);
            setMilestones(next);
            propagate(next);
          }}
        />
      )}

      {/* Step create modal */}
      {creatingStep && (
        <StepModal
          step={emptyStep}
          isNew
          onClose={() => setCreatingStep(false)}
          projectStartDate={project.startDate}
          onSave={newStep => {
            const next = [...milestones, newStep];
            setMilestones(next);
            propagate(next);
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
                {editingExpenseId !== null ? "Editar Despesa" : "Nova Despesa"}
              </h3>
              <button onClick={() => { setAddingExpense(false); setEditingExpenseId(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
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
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Observação <span className="text-muted-foreground/50">(opcional)</span></label>
                <textarea
                  rows={2}
                  placeholder="Ex: Nota fiscal nº 1234, fornecedor Roca..."
                  value={expenseDraft.notes}
                  onChange={e => setExpenseDraft({ ...expenseDraft, notes: e.target.value })}
                  className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50 resize-none"
                />
              </div>
              {/* Payment toggle */}
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Registrar como pagamento</p>
                  <p className="text-[10px] text-muted-foreground">Pagamentos geram indicadores no painel</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpenseDraft(d => ({ ...d, isPayment: !d.isPayment }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${expenseDraft.isPayment ? "bg-accent" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${expenseDraft.isPayment ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              {expenseDraft.isPayment && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Status do pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["A fazer", "Realizado"] as const).map(s => (
                        <button
                          key={s} type="button"
                          onClick={() => setExpenseDraft(d => ({ ...d, paymentStatus: s }))}
                          className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                            expenseDraft.paymentStatus === s
                              ? s === "A fazer" ? "bg-amber-500 text-white border-amber-500" : "bg-green-600 text-white border-green-600"
                              : "bg-muted text-muted-foreground border-border hover:border-accent/50"
                          }`}
                        >
                          {s === "A fazer" ? "⏳ A fazer" : "✅ Realizado"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {expenseDraft.paymentStatus === "A fazer" && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Vencimento</label>
                      <input
                        type="date"
                        value={expenseDraft.dueDate}
                        onChange={e => setExpenseDraft(d => ({ ...d, dueDate: e.target.value }))}
                        className="w-full bg-input-background rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <button
                type="button"
                onClick={() => { setAddingExpense(false); setEditingExpenseId(null); setExpenseDraft({ description: "", category: "Material", amount: "", notes: "", isPayment: false, paymentStatus: "A fazer", dueDate: "" }); }}
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
                  const paymentFields = expenseDraft.isPayment ? {
                    isPayment: true,
                    paymentStatus: expenseDraft.paymentStatus,
                    dueDate: expenseDraft.paymentStatus === "A fazer" ? expenseDraft.dueDate : undefined,
                  } : { isPayment: false, paymentStatus: undefined, dueDate: undefined };
                  let nextExpenses: Expense[];
                  if (editingExpenseId !== null) {
                    nextExpenses = expenses.map(e => e.id === editingExpenseId
                      ? { ...e, description: expenseDraft.description, category: expenseDraft.category, amount: parsed, notes: expenseDraft.notes || undefined, ...paymentFields }
                      : e
                    );
                  } else {
                    const now = new Date();
                    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
                    const dateStr = `${String(now.getDate()).padStart(2,"0")} ${months[now.getMonth()]} ${now.getFullYear()}`;
                    nextExpenses = [...expenses, {
                      id: Date.now(),
                      date: dateStr,
                      description: expenseDraft.description,
                      category: expenseDraft.category,
                      amount: parsed,
                      notes: expenseDraft.notes || undefined,
                      ...paymentFields,
                    }];
                  }
                  setExpenses(nextExpenses);
                  onUpdateProject?.({ ...project, milestones, expenses: nextExpenses, status, progress: computedProgress, phase: computedPhase });
                  setExpenseDraft({ description: "", category: "Material", amount: "", notes: "", isPayment: false, paymentStatus: "A fazer", dueDate: "" });
                  setEditingExpenseId(null);
                  setAddingExpense(false);
                }}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {editingExpenseId !== null ? "Salvar alterações" : "Registrar despesa"}
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
    email: "",
    urgency: "Padrão",
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
    if (!form.clientName.trim()) {
      setDateError("O nome do cliente é obrigatório.");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setDateError("Informe pelo menos um contato: e-mail ou telefone.");
      return;
    }
    if (!form.contractValue.trim()) {
      setDateError("O valor do contrato é obrigatório.");
      return;
    }
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
      email: form.email || undefined,
      description: form.description,
      items,
      budgeted: totalValue,
      contractValue: contractVal,
      urgency: form.urgency,
      startDate: form.startDate ? new Date(form.startDate + "T12:00:00").toLocaleDateString("pt-BR") : "",
      endDate: form.endDate ? new Date(form.endDate + "T12:00:00").toLocaleDateString("pt-BR") : "",
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
                <div>
                  <span class="total-label">Valor total do projeto</span>
                  <div style="font-size:10px;color:#aaa;margin-top:3px">Inclui taxas administrativas, BDI e margem operacional</div>
                </div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Telefone / WhatsApp <span className="text-muted-foreground font-normal">(ou e-mail)</span></label>
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
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">E-mail <span className="text-muted-foreground font-normal">(ou telefone)</span></label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-input-background rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border placeholder:text-muted-foreground/50"
                />
              </div>
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
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, "");
                  if (!raw) { setForm({ ...form, contractValue: "" }); return; }
                  setForm({ ...form, contractValue: new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(parseInt(raw, 10)) });
                }}
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
            <div className="grid grid-cols-2 gap-2">
              {["Urgente", "Padrão"].map(u => (
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
  "Urgente": "bg-red-50 text-red-600",
  "Padrão":  "bg-gray-100 text-gray-600",
  "Normal":  "bg-gray-100 text-gray-600",
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
        <div className="relative flex-1 min-w-0">
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
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
          {/* fade direito — indica que há mais filtros */}
          <div className="pointer-events-none absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-card to-transparent" />
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
  const [cancellingQuote, setCancellingQuote] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItemDraft, setEditItemDraft] = useState<QuoteItem | null>(null);
  const [addingQuoteItem, setAddingQuoteItem] = useState(false);
  const [newQuoteItem, setNewQuoteItem] = useState<Omit<QuoteItem, "id">>({ title: "", description: "", amount: "" });

  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const [adjustingValue, setAdjustingValue] = useState(false);
  const [newContractValue, setNewContractValue] = useState("");
  const [contractAdjustReason, setContractAdjustReason] = useState("");

  const [adjustingDates, setAdjustingDates] = useState(false);
  const [newStartDate, setNewStartDate] = useState(
    quote.startDate && quote.startDate.includes("/")
      ? quote.startDate.split("/").reverse().join("-")
      : quote.startDate || ""
  );
  const [newEndDate, setNewEndDate] = useState(
    quote.endDate && quote.endDate.includes("/")
      ? quote.endDate.split("/").reverse().join("-")
      : quote.endDate || ""
  );
  const [datesAdjustReason, setDatesAdjustReason] = useState("");

  const isReadOnly = quote.status !== "Em análise";

  const currentBudgeted = quote.items.reduce((s, i) => s + (parseFloat(i.amount.replace(/\./g, "").replace(",", ".")) || 0), 0);
  const margin = quote.contractValue > 0
    ? ((quote.contractValue - currentBudgeted) / quote.contractValue) * 100
    : 0;

  const recalcBudgeted = (items: QuoteItem[]) =>
    items.reduce((s, i) => s + (parseFloat(i.amount.replace(/\./g, "").replace(",", ".")) || 0), 0);

  const saveItemEdit = () => {
    if (!editItemDraft) return;
    const newItems = quote.items.map(i => i.id === editItemDraft.id ? editItemDraft : i);
    const updated = addHistory(
      { ...quote, items: newItems, budgeted: recalcBudgeted(newItems) },
      `Item "${editItemDraft.title}" editado.`
    );
    onUpdateQuote(updated);
    setEditingItemId(null);
    setEditItemDraft(null);
  };

  const removeItem = (id: number) => {
    const item = quote.items.find(i => i.id === id);
    const newItems = quote.items.filter(i => i.id !== id);
    const updated = addHistory(
      { ...quote, items: newItems, budgeted: recalcBudgeted(newItems) },
      `Item "${item?.title ?? id}" removido.`
    );
    onUpdateQuote(updated);
  };

  const addQuoteItem = () => {
    if (!newQuoteItem.title.trim() || !newQuoteItem.amount.trim()) return;
    const newId = Math.max(0, ...quote.items.map(i => i.id)) + 1;
    const newItems = [...quote.items, { ...newQuoteItem, id: newId }];
    const updated = addHistory(
      { ...quote, items: newItems, budgeted: recalcBudgeted(newItems) },
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
    const ts = nowTs();
    const updated = addHistory({ ...quote, status: "Aprovado", quoteDeadline: ts }, "Orçamento aprovado.");
    onUpdateQuote(updated);
  };

  const handleReopenAnalysis = () => {
    const updated = addHistory({ ...quote, status: "Em análise" }, "Orçamento reaberto para análise.");
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
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            title="Gerar PDF"
            onClick={() => {
              const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
              const itemsHtml = quote.items.map(it => {
                const amt = parseFloat(String(it.amount).replace(/\./g, "").replace(",", ".")) || 0;
                return `<tr>
                  <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0">
                    <div style="font-size:13px;font-weight:600;color:#1a1a1a">${it.title}</div>
                    ${it.description ? `<div style="font-size:11px;color:#888;margin-top:2px">${it.description}</div>` : ""}
                  </td>
                  <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;font-size:13px;font-weight:600;color:#1a1a1a">${amt > 0 ? fmtBRL(amt) : "—"}</td>
                </tr>`;
              }).join("");
              const now = new Date();
              const generatedAt = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
              const win = window.open("", "_blank");
              if (!win) return;
              win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
              <title>Orçamento – ${quote.clientName}</title>
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
                .status-badge{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:999px;background:#fef3c7;color:#92400e;margin-bottom:16px}
                @media print{body{padding:24px}}
              </style></head><body>
              <p style="font-size:10px;color:#aaa;margin:0 0 8px;letter-spacing:.08em;text-transform:uppercase">Orçamento · Gerado em ${generatedAt}</p>
              <h1>${quote.clientName}</h1>
              <div class="status-badge">${quote.status}</div>
              ${quote.description ? `<p style="font-size:13px;color:#666;margin:6px 0 0">${quote.description}</p>` : ""}
              <h2>Escopo do serviço</h2>
              <table><tbody>${itemsHtml}</tbody></table>
              <div class="total">
                <div>
                  <span class="total-label">Valor total do projeto</span>
                  <div style="font-size:10px;color:#aaa;margin-top:3px">Inclui taxas administrativas, BDI e margem operacional</div>
                </div>
                <span class="total-value">${quote.contractValue > 0 ? fmtBRL(quote.contractValue) : "—"}</span>
              </div>
              <h2>Datas previstas</h2>
              <div class="date-row">
                <div class="date-item"><span>Início da obra</span>${quote.startDate || "—"}</div>
                <div class="date-item"><span>Entrega prevista</span>${quote.endDate || "—"}</div>
              </div>
              <script>window.onload=()=>{window.print()}<\/script>
              </body></html>`);
              win.document.close();
            }}
            className="p-1.5 rounded-lg hover:bg-primary-foreground/10 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <Printer size={16} />
          </button>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${quoteStatusColors[quote.status]}`}>
            {quote.status}
          </span>
        </div>
      </div>

      {/* Financial strip */}
      <div className="bg-primary/90 text-primary-foreground px-5 py-3 grid grid-cols-4 gap-1 text-sm border-t border-primary-foreground/10">
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Custo orçado</p>
          <p className="font-semibold font-mono text-sm">{fmt(currentBudgeted)}</p>
        </div>
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Contrato</p>
          <p className="font-semibold font-mono text-sm text-amber-400">{fmt(quote.contractValue)}</p>
        </div>
        <div>
          <p className="text-[10px] text-primary-foreground/60 font-mono">Margem</p>
          <p className={`font-semibold font-mono text-sm ${margin >= 0 ? "text-green-400" : "text-red-400"}`}>{margin.toFixed(1)}%</p>
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
            {confirmingApproval ? (
              <div className={`rounded-xl border p-4 space-y-3 ${margin >= 0 ? "border-green-800/40 bg-green-900/10" : "border-red-800/40 bg-red-900/10"}`}>
                <p className="text-sm font-medium text-foreground">Confirmar aprovação</p>
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${margin >= 0 ? "bg-green-900/20" : "bg-red-900/20"}`}>
                  <span className={`text-xs font-mono ${margin >= 0 ? "text-green-400" : "text-red-400"}`}>Margem do contrato</span>
                  <span className={`text-sm font-mono font-bold ${margin >= 0 ? "text-green-400" : "text-red-400"}`}>{margin.toFixed(1)}%</span>
                </div>
                {margin < 0 && (
                  <p className="text-xs text-red-400 leading-snug">Atenção: a margem está negativa. Verifique os valores antes de aprovar.</p>
                )}
                <p className="text-sm text-muted-foreground">Deseja aprovar este orçamento?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmingApproval(false)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors border border-border">
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleApprove(); setConfirmingApproval(false); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${margin >= 0 ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"}`}
                  >
                    <CheckCircle size={15} /> Confirmar aprovação
                  </button>
                </div>
              </div>
            ) : cancellingQuote ? (
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
                <button type="button" onClick={() => setConfirmingApproval(true)} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
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

        {/* Ajustar valor do contrato — só em análise */}
        {quote.status === "Em análise" && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Ajustar valor do contrato</p>
              {!adjustingValue && (
                <button
                  type="button"
                  onClick={() => {
                    setNewContractValue(
                      quote.contractValue > 0
                        ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(quote.contractValue)
                        : ""
                    );
                    setContractAdjustReason("");
                    setAdjustingValue(true);
                  }}
                  className="text-xs text-accent hover:text-amber-600 font-medium transition-colors flex items-center gap-1"
                >
                  <Pencil size={12} /> Ajustar
                </button>
              )}
            </div>
            {!adjustingValue ? (
              <p className="text-sm font-mono font-semibold text-foreground">{fmt(quote.contractValue)}</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Novo valor do contrato <span className="text-accent">*</span></label>
                  <div className="relative">
                    <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newContractValue}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setNewContractValue(raw ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(parseInt(raw, 10)) : "");
                      }}
                      placeholder="R$ 0"
                      className="w-full bg-input-background rounded-lg pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 ring-accent/40 border border-border font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Motivo do ajuste <span className="text-accent">*</span></label>
                  <textarea
                    value={contractAdjustReason}
                    onChange={e => setContractAdjustReason(e.target.value)}
                    rows={2}
                    placeholder="Ex: adição de novo escopo de trabalho..."
                    className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAdjustingValue(false); setNewContractValue(""); setContractAdjustReason(""); }}
                    className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!newContractValue.trim() || !contractAdjustReason.trim()}
                    onClick={() => {
                      const val = parseFloat(newContractValue.replace(/\./g, "").replace(",", ".")) || 0;
                      const reason = contractAdjustReason.trim();
                      const updated = addHistory(
                        { ...quote, contractValue: val },
                        `Valor do contrato ajustado de ${fmt(quote.contractValue)} para ${fmt(val)}. Motivo: ${reason}`
                      );
                      onUpdateQuote(updated);
                      setAdjustingValue(false);
                      setNewContractValue("");
                      setContractAdjustReason("");
                    }}
                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirmar ajuste
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ajustar datas — só em análise */}
        {quote.status === "Em análise" && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Ajustar datas</p>
              {!adjustingDates && (
                <button
                  type="button"
                  onClick={() => {
                    setNewStartDate(
                      quote.startDate && quote.startDate.includes("/")
                        ? quote.startDate.split("/").reverse().join("-")
                        : quote.startDate || ""
                    );
                    setNewEndDate(
                      quote.endDate && quote.endDate.includes("/")
                        ? quote.endDate.split("/").reverse().join("-")
                        : quote.endDate || ""
                    );
                    setDatesAdjustReason("");
                    setAdjustingDates(true);
                  }}
                  className="text-xs text-accent hover:text-amber-600 font-medium transition-colors flex items-center gap-1"
                >
                  <Pencil size={12} /> Ajustar
                </button>
              )}
            </div>
            {!adjustingDates ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><CalendarDays size={12} className="text-accent" /> Início da obra</span>
                  <span className="font-mono font-medium">{quote.startDate || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><CalendarCheck size={12} className="text-accent" /> Entrega prevista</span>
                  <span className="font-mono font-medium">{quote.endDate || "—"}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1"><CalendarDays size={11} className="text-accent" /> Início da obra</label>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={e => setNewStartDate(e.target.value)}
                      className="w-full bg-input-background rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-accent/40 border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1"><CalendarCheck size={11} className="text-accent" /> Entrega prevista</label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={e => setNewEndDate(e.target.value)}
                      className="w-full bg-input-background rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-accent/40 border border-border font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Motivo do ajuste <span className="text-accent">*</span></label>
                  <textarea
                    value={datesAdjustReason}
                    onChange={e => setDatesAdjustReason(e.target.value)}
                    rows={2}
                    placeholder="Ex: renegociação do prazo com o cliente..."
                    className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAdjustingDates(false); setDatesAdjustReason(""); }}
                    className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!datesAdjustReason.trim()}
                    onClick={() => {
                      const startFmt = newStartDate ? new Date(newStartDate + "T12:00:00").toLocaleDateString("pt-BR") : quote.startDate;
                      const endFmt = newEndDate ? new Date(newEndDate + "T12:00:00").toLocaleDateString("pt-BR") : quote.endDate;
                      const reason = datesAdjustReason.trim();
                      const updated = addHistory(
                        { ...quote, startDate: startFmt || "", endDate: endFmt || "" },
                        `Datas ajustadas — Início: ${startFmt || "—"}, Entrega: ${endFmt || "—"}. Motivo: ${reason}`
                      );
                      onUpdateQuote(updated);
                      setAdjustingDates(false);
                      setDatesAdjustReason("");
                    }}
                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirmar ajuste
                  </button>
                </div>
              </div>
            )}
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
              editingItemId === item.id && editItemDraft && !isReadOnly ? (
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
            <button
              onClick={handleReopenAnalysis}
              className="w-full py-2.5 bg-transparent border border-border text-muted-foreground rounded-xl text-sm font-medium hover:border-accent/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Reabrir para análise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Report Modal ────────────────────────────────────────────────────────────

function ReportModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const spent = project.expenses.reduce((s, e) => s + e.amount, 0);
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

function ContractorsScreen({ contractors, onAdd, onToggleStatus, onRemove }: {
  contractors: Contractor[];
  onAdd: (form: Omit<Contractor, "id">) => void;
  onToggleStatus: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Contractor, "id">>({ name: "", phone: "", specialty: "", status: "Ativo", notes: "" });

  const specialties = ["Demolição e alvenaria", "Hidráulica", "Elétrica", "Revestimentos e piso", "Forro e gesso", "Pintura", "Marcenaria", "Acabamentos", "Outra"];

  const handleAdd = () => {
    if (!form.name.trim() || !form.specialty) return;
    onAdd(form);
    setForm({ name: "", phone: "", specialty: "", status: "Ativo", notes: "" });
    setShowForm(false);
  };

  const active = contractors.filter(c => c.status === "Ativo");
  const inactive = contractors.filter(c => c.status === "Inativo");

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-10 pb-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Cadastro</p>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>Empreiteiros</h1>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium hover:bg-accent/80 transition-colors"
          >
            <Plus size={13} /> {showForm ? "Cancelar" : "Novo"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{active.length} ativos · {inactive.length} inativos</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Formulário de novo empreiteiro */}
        {showForm && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">Novo empreiteiro</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Nome *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Nome completo"
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm border border-border outline-none focus:ring-2 ring-accent/40 text-foreground placeholder:text-muted-foreground/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Telefone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm border border-border outline-none focus:ring-2 ring-accent/40 text-foreground placeholder:text-muted-foreground/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Especialidade *</label>
                <select value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})}
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm border border-border outline-none focus:ring-2 ring-accent/40 text-foreground">
                  <option value="">Selecione</option>
                  {specialties.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Observações</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Informações relevantes..."
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm border border-border outline-none focus:ring-2 ring-accent/40 text-foreground resize-none placeholder:text-muted-foreground/50" />
              </div>
            </div>
            <button onClick={handleAdd} disabled={!form.name.trim() || !form.specialty}
              className="w-full py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Cadastrar empreiteiro
            </button>
          </div>
        )}

        {/* Lista ativa */}
        {active.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ativos</p>
            {active.map(c => (
              <div key={c.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-accent mt-0.5">{c.specialty}</p>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground mt-1 hover:text-foreground transition-colors">
                        <Phone size={10} /> {c.phone}
                      </a>
                    )}
                    {c.notes && <p className="text-xs text-muted-foreground mt-1 italic">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onToggleStatus(c.id)}
                      className="text-[10px] px-2 py-1 rounded border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                      Ativo
                    </button>
                    <button onClick={() => onRemove(c.id)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista inativa */}
        {inactive.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inativos</p>
            {inactive.map(c => (
              <div key={c.id} className="bg-card rounded-xl border border-border p-4 opacity-60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.specialty}</p>
                    {c.phone && <p className="text-xs text-muted-foreground mt-1"><Phone size={10} className="inline mr-1" />{c.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onToggleStatus(c.id)}
                      className="text-[10px] px-2 py-1 rounded border border-border bg-muted text-muted-foreground hover:border-emerald-800/40 hover:bg-emerald-900/20 hover:text-emerald-400 transition-colors">
                      Inativo
                    </button>
                    <button onClick={() => onRemove(c.id)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {contractors.length === 0 && (
          <div className="text-center py-16">
            <HardHatIcon size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum empreiteiro cadastrado</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Novo" para adicionar</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  const items: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard",    label: "Obras",         icon: <Home size={20} /> },
    { id: "quotes",       label: "Orçamentos",    icon: <ClipboardList size={20} /> },
    { id: "empreiteiros", label: "Empreiteiros",  icon: <HardHatIcon size={20} /> },
    { id: "newQuote",     label: "Novo Orçamento", icon: <FilePlus size={20} /> },
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      projectsApi.list(),
      quotesApi.list(),
      contractorsApi.list(),
    ])
      .then(([p, q, c]) => {
        setProjects(p);
        setQuotes(q);
        setContractors(c);
      })
      .catch(e => setLoadError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // ─── Project handlers ──────────────────────────────────────────────────────

  const handleOpenProject = (p: Project) => {
    setSelectedProject(p);
    setScreen("detail");
  };

  const handleUpdateProject = (updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProject(updated);
    projectsApi.update(updated.id, updated).catch(e =>
      console.error("Failed to update project:", e)
    );
  };

  // ─── Quote handlers ────────────────────────────────────────────────────────

  const handleOpenQuote = (q: QuoteRecord) => {
    setSelectedQuote(q);
    setScreen("quoteDetail");
  };

  const handleUpdateQuote = (updated: QuoteRecord) => {
    setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
    setSelectedQuote(updated);
    quotesApi.update(updated.id, updated).catch(e =>
      console.error("Failed to update quote:", e)
    );
  };

  const handleGenerateProject = (q: QuoteRecord) => {
    const lastName = q.clientName.split(" ").pop() ?? q.clientName;
    const payload: Omit<Project, "id"> = {
      name: `Studio ${lastName}`,
      client: q.clientName,
      status: "Em andamento",
      progress: 0,
      budgeted: q.budgeted,
      contractValue: q.contractValue,
      spent: 0,
      expenses: [],
      milestones: q.items.map(item => ({
        label: item.title,
        done: false,
        date: "",
        status: "Pendente" as StepStatus,
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
    projectsApi.create(payload)
      .then(created => {
        setProjects(prev => [...prev, created]);
        setScreen("dashboard");
      })
      .catch(e => console.error("Failed to generate project:", e));
  };

  const handleQuoteCreated = (q: QuoteRecord) => {
    setQuotes(prev => [q, ...prev]);
  };

  // ─── Contractor handlers ───────────────────────────────────────────────────

  const handleAddContractor = (form: Omit<Contractor, "id">) => {
    const tempId = Date.now();
    const optimistic: Contractor = { ...form, id: tempId };
    setContractors(prev => [...prev, optimistic]);
    contractorsApi.create(form)
      .then(created => setContractors(prev => prev.map(c => c.id === tempId ? created : c)))
      .catch(e => {
        console.error("Failed to add contractor:", e);
        setContractors(prev => prev.filter(c => c.id !== tempId));
      });
  };

  const handleToggleContractorStatus = (id: number) => {
    setContractors(prev => prev.map(c =>
      c.id === id ? { ...c, status: c.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : c
    ));
    const c = contractors.find(x => x.id === id);
    if (!c) return;
    const newStatus = c.status === "Ativo" ? "Inativo" as const : "Ativo" as const;
    contractorsApi.update(id, { status: newStatus }).catch(e => {
      console.error("Failed to update contractor:", e);
      setContractors(prev => prev.map(x => x.id === id ? c : x));
    });
  };

  const handleRemoveContractor = (id: number) => {
    const snapshot = contractors.find(c => c.id === id);
    setContractors(prev => prev.filter(c => c.id !== id));
    contractorsApi.remove(id).catch(e => {
      console.error("Failed to remove contractor:", e);
      if (snapshot) setContractors(prev => [...prev, snapshot]);
    });
  };

  // ─── Loading / error states ────────────────────────────────────────────────

  const showNav = screen === "dashboard" || screen === "quotes" || screen === "newQuote" || screen === "empreiteiros";

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <HardHat size={32} className="mx-auto text-muted-foreground/40 animate-pulse" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <AlertTriangle size={32} className="mx-auto text-red-400" />
          <p className="text-sm font-medium text-foreground">Erro ao carregar dados</p>
          <p className="text-xs text-muted-foreground">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs px-4 py-2 bg-accent text-accent-foreground rounded-lg"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      {screen === "dashboard" && (
        <Dashboard
          projects={projects}
          onOpenProject={handleOpenProject}
          onNewProject={() => setScreen("newQuote")}
        />
      )}
      {screen === "detail" && selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onBack={() => setScreen("dashboard")}
          onUpdateProject={handleUpdateProject}
        />
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
      {screen === "empreiteiros" && (
        <ContractorsScreen
          contractors={contractors}
          onAdd={handleAddContractor}
          onToggleStatus={handleToggleContractorStatus}
          onRemove={handleRemoveContractor}
        />
      )}
      {showNav && (
        <BottomNav active={screen} onChange={setScreen} />
      )}
    </div>
  );
}
