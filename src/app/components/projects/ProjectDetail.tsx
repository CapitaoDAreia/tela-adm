import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import multiMonthPlugin from "@fullcalendar/react/multimonth";
import listPlugin from "@fullcalendar/react/list";
import monarchThemePlugin from "@fullcalendar/react/themes/monarch";
import ptBrLocale from "@fullcalendar/react/locales/pt-br";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, Ban, CalendarCheck, CalendarClock, CalendarDays, Camera, CheckCheck,
  ChevronRight, ClipboardList, Clock, DollarSign, FileBarChart2, FileText, HardHat,
  HardHatIcon, Image, LayoutDashboard, ListChecks, PackagePlus, Pencil, Plus,
  Receipt, RotateCcw, Upload, Wrench, X,
} from "lucide-react";
import type {
  Project, ProjectStatus, Milestone, StepStatus, Expense, ProjectDocument, DetailTab,
} from "../../../lib/types";
import { fmt, fmtDate } from "../../../lib/format";
import { statusColors, STEP_STATUS_CONFIG, projectCoverGradient, describeMilestoneChanges } from "../../../lib/project-helpers";
import { ProgressBar } from "../shared/ProgressBar";
import { StepModal } from "./StepModal";
import { DocumentosTab } from "./DocumentosTab";
import { ReportModal } from "./ReportModal";

function ProjectDetail({ project, onBack, onUpdateProject }: {
  project: Project;
  onBack: () => void;
  onUpdateProject?: (p: Project) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("visao");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const isLocked = status === "Cancelada";
  const [milestones, setMilestones] = useState<Milestone[]>(project.milestones);
  const [expenses, setExpenses] = useState<Expense[]>(project.expenses);
  const [photos, setPhotos] = useState(project.photos);
  const [documents, setDocuments] = useState<ProjectDocument[]>(project.documents ?? []);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption: string; date: string } | null>(null);
  const [showProjectHistory, setShowProjectHistory] = useState(false);
  const [history, setHistory] = useState(project.history ?? []);
  const [adjustingDates, setAdjustingDates] = useState(false);
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [datesReason, setDatesReason] = useState("");
  const [localStartDate, setLocalStartDate] = useState(project.startDate);
  const [localEndDate, setLocalEndDate] = useState(project.endDate);

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

  const computeDerived = (newMilestones: Milestone[]) => {
    const progress = newMilestones.length > 0
      ? Math.round(newMilestones.filter(m => m.status === "Concluído").length / newMilestones.length * 100)
      : project.progress;
    const inProg = newMilestones.find(m => m.status === "Em andamento");
    const next = newMilestones.find(m => m.status === "Pendente");
    const phase = newMilestones.length === 0 ? project.phase
      : inProg ? inProg.label
      : next ? next.label
      : "Concluída";
    return { progress, phase };
  };

  const contractorExpenseForMilestone = (m: Milestone, currentExpenses: Expense[]): Expense[] => {
    const expDesc = `Pagamento empreiteiro — ${m.label}`;
    const filtered = currentExpenses.filter(e => e.description !== expDesc);
    if (!m.contractorValue || m.contractorValue <= 0) return filtered;
    const mths = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const dateStr = m.contractorPaymentDue
      ? (() => { const d = new Date(m.contractorPaymentDue + "T12:00:00"); return `${String(d.getDate()).padStart(2,"0")} ${mths[d.getMonth()]} ${d.getFullYear()}`; })()
      : (() => { const d = new Date(); return `${String(d.getDate()).padStart(2,"0")} ${mths[d.getMonth()]} ${d.getFullYear()}`; })();
    return [...filtered, {
      id: Date.now(),
      date: dateStr,
      description: expDesc,
      category: "Serviço",
      amount: m.contractorValue,
      isPayment: true,
      paymentStatus: "A fazer" as const,
      dueDate: m.contractorPaymentDue || undefined,
    }];
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

  const addProjectHistory = (p: Project, description: string): Project => {
    const entry = { datetime: nowTs(), description };
    setHistory(prev => [...prev, entry]);
    return { ...p, history: [...(p.history ?? []), entry] };
  };

  const allConcluded = milestones.length > 0 && milestones.every(m => m.status === "Concluído" || m.status === "Cancelado");
  const hasPendingPayments = expenses.some(e => e.isPayment && e.paymentStatus === "A fazer");
  const canConclude = allConcluded && !hasPendingPayments;

  const wasCancelled = status === "Cancelada";

  const handleProjectAction = () => {
    if (!projectAction) return;
    let newStatus: ProjectStatus;
    let historyMsg: string;
    let nextCancelReason: string | undefined = project.cancelReason;
    if (projectAction === "concluir") {
      newStatus = "Concluído";
      historyMsg = "Obra concluída.";
    } else if (projectAction === "pausar") {
      newStatus = "Pausado";
      historyMsg = projectActionReason.trim() ? `Obra pausada — ${projectActionReason.trim()}` : "Obra pausada.";
    } else if (projectAction === "retomar") {
      newStatus = "Em andamento";
      historyMsg = wasCancelled
        ? `Obra retomada após cancelamento — Motivo: ${projectActionReason.trim()}`
        : "Obra retomada.";
      nextCancelReason = undefined;
    } else {
      newStatus = "Cancelada";
      historyMsg = `Obra cancelada — Motivo: ${projectActionReason.trim()}`;
      nextCancelReason = projectActionReason.trim();
    }
    const updated = addProjectHistory(
      { ...project, milestones, expenses, status: newStatus, progress: computedProgress, phase: computedPhase, cancelReason: nextCancelReason },
      historyMsg
    );
    onUpdateProject?.(updated);
    setStatus(newStatus);
    setProjectAction(null);
    setProjectActionReason("");
  };
  const [showReport, setShowReport] = useState(false);

  const emptyStep: Milestone = {
    id: 0, label: "", done: false, date: "", status: "Pendente",
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
        {project.image ? (
          <img src={project.image} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: projectCoverGradient(project.id) }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        <button
          onClick={onBack}
          className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={() => setShowProjectHistory(true)}
          className="absolute top-4 right-14 bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
          title="Histórico da obra"
        >
          <Clock size={18} />
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
        {isLocked && (
          <div className="mb-4 bg-red-900/10 border border-red-900/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <Ban size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-500">Obra cancelada</p>
              {project.cancelReason && (
                <p className="text-xs text-muted-foreground mt-0.5">Motivo: {project.cancelReason}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                Esta obra está bloqueada para edições — apenas consulta. Use "Retomar obra" abaixo para reativá-la.
              </p>
            </div>
          </div>
        )}
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
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-mono">Datas</p>
                {!adjustingDates && !isLocked && (
                  <button
                    type="button"
                    onClick={() => setAdjustingDates(true)}
                    className="text-xs text-accent hover:text-amber-600 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Pencil size={11} /> Ajustar datas
                  </button>
                )}
              </div>
              {adjustingDates ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Novo início</label>
                      <input
                        type="date"
                        value={newStartDate}
                        onChange={e => setNewStartDate(e.target.value)}
                        className="w-full bg-input-background rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-accent/40 border border-border text-foreground font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Nova entrega</label>
                      <input
                        type="date"
                        value={newEndDate}
                        onChange={e => setNewEndDate(e.target.value)}
                        className="w-full bg-input-background rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-accent/40 border border-border text-foreground font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Motivo <span className="text-muted-foreground/50">(opcional)</span></label>
                    <textarea
                      value={datesReason}
                      onChange={e => setDatesReason(e.target.value)}
                      rows={2}
                      placeholder="Ex: prazo estendido por chuvas..."
                      className="w-full bg-input-background rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-accent/40 border border-border text-foreground resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setAdjustingDates(false); setNewStartDate(""); setNewEndDate(""); setDatesReason(""); }}
                      className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!newStartDate && !newEndDate}
                      onClick={() => {
                        const fmt2 = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
                        const parts: string[] = [];
                        if (newStartDate) parts.push(`Início alterado para ${fmt2(newStartDate)}`);
                        if (newEndDate) parts.push(`Entrega alterada para ${fmt2(newEndDate)}`);
                        if (datesReason.trim()) parts.push(`Motivo: ${datesReason.trim()}`);
                        const newStart = newStartDate ? fmt2(newStartDate) : localStartDate;
                        const newEnd = newEndDate ? fmt2(newEndDate) : localEndDate;
                        if (newStartDate) setLocalStartDate(newStart);
                        if (newEndDate) setLocalEndDate(newEnd);
                        const updated = addProjectHistory(
                          { ...project, milestones, expenses, status, progress: computedProgress, phase: computedPhase, startDate: newStart, endDate: newEnd },
                          parts.join(" · ") || "Datas da obra ajustadas."
                        );
                        onUpdateProject?.(updated);
                        setAdjustingDates(false);
                        setNewStartDate("");
                        setNewEndDate("");
                        setDatesReason("");
                      }}
                      className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Salvar datas
                    </button>
                  </div>
                </div>
              ) : (
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
                    <span className="text-sm font-mono font-medium text-foreground">{localStartDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarCheck size={14} className="text-accent" />
                      <span>Entrega prevista</span>
                    </div>
                    <span className="text-sm font-mono font-medium text-foreground">{localEndDate}</span>
                  </div>
                  {project.quoteId && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ClipboardList size={14} className="text-accent" />
                        <span>Orçamento de origem</span>
                      </div>
                      <span className="text-sm font-mono font-medium text-foreground">#{project.quoteId}</span>
                    </div>
                  )}
                </div>
              )}
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
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => setCreatingStep(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-amber-600 transition-colors shrink-0"
                >
                  <Plus size={14} /> Nova etapa
                </button>
              )}
            </div>

            {milestones.map((m, i) => {
              const cfg = STEP_STATUS_CONFIG[m.status];
              const todayRef = new Date(); todayRef.setHours(0,0,0,0);
              const isOverdue = !!(m.deadline && m.status !== "Concluído" && m.status !== "Cancelado" && (() => {
                const d = m.deadline.includes("/")
                  ? (() => { const [dd, mm, yyyy] = m.deadline.split("/").map(Number); return new Date(yyyy, mm-1, dd); })()
                  : new Date(m.deadline + "T12:00:00");
                return d < todayRef;
              })());
              return (
                <button
                  key={i}
                  onClick={() => !isLocked && setEditingStep(m)}
                  disabled={isLocked}
                  className={`w-full bg-card border rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-colors group ${isOverdue ? "border-red-200" : "border-border"} ${isLocked ? "cursor-default" : "hover:border-accent/40"}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${m.status === "Cancelado" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {m.label}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${cfg.color}`}>{cfg.label}</span>
                      {isOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-red-100 text-red-700 border-red-200 font-medium whitespace-nowrap">Em atraso</span>
                      )}
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
                      {m.contractorValue != null && m.contractorValue > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-foreground font-mono font-medium whitespace-nowrap">
                          {fmt(m.contractorValue)}
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
          const toISO = (d: string): string | null => {
            if (!d || d === "–") return null;
            if (d.includes("/")) {
              const parts = d.split("/").map(Number);
              if (parts.length < 3 || parts.some(isNaN)) return null;
              const [dd, mm, yyyy] = parts;
              return `${yyyy}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
            }
            if (d.includes("-")) return d.split("T")[0];
            return null;
          };

          const STATUS_HEX: Record<StepStatus, string> = {
            "Concluído":    "#22c55e",
            "Em andamento": "#D97706",
            "Pendente":     "#94A3B8",
            "Cancelado":    "#EF4444",
          };

          type CalEvent = {
            title: string;
            start: string;
            end?: string;
            color?: string;
            extendedProps?: { typeLabel: string };
          };

          const calEvents: CalEvent[] = [
            // Project start/end markers
            ...(toISO(localStartDate) ? [{ title: "Início da obra", start: toISO(localStartDate)!, color: "#1C2B3A", extendedProps: { typeLabel: "Obra" } }] : []),
            ...(toISO(localEndDate) ? [{ title: "Entrega prevista", start: toISO(localEndDate)!, color: "#64748B", extendedProps: { typeLabel: "Obra" } }] : []),
            // Milestones
            ...milestones.flatMap(m => {
              const start = toISO(m.startDate ?? "");
              if (!start) return [];
              const end = toISO(m.deadline);
              return [{ title: m.label, start, end: end ?? undefined, color: STATUS_HEX[m.status], extendedProps: { typeLabel: "Etapa" } }];
            }),
            // Pending payments
            ...expenses
              .filter(e => e.isPayment && e.paymentStatus === "A fazer" && e.dueDate)
              .map(e => ({ title: e.description, start: e.dueDate!, color: "#F59E0B", extendedProps: { typeLabel: "Pagamento" } })),
          ];

          return (
            <div className="p-4">
              <div className="fc-cronograma overflow-hidden rounded-xl border border-border bg-card p-2 sm:p-3">
                <style>{`
                  /* Paleta Monarch mapeada para as cores do projeto (formas 100% do tema) */
                  .fc-cronograma {
                    /* primary — botões/eventos principais (navy do projeto) */
                    --fc-monarch-primary: #1C2B3A;
                    --fc-monarch-primary-foreground: #ffffff;
                    --fc-monarch-primary-over: #2A3D50;
                    --fc-monarch-primary-down: #385064;

                    /* secondary — botão "Hoje" (stone claro) */
                    --fc-monarch-secondary: #f5f4f1;
                    --fc-monarch-secondary-foreground: #44403c;
                    --fc-monarch-secondary-over: #edeae4;
                    --fc-monarch-secondary-down: #e4e1da;

                    /* tertiary — âmbar do projeto */
                    --fc-monarch-tertiary: #D97706;
                    --fc-monarch-tertiary-foreground: #ffffff;
                    --fc-monarch-tertiary-over: #c26a05;
                    --fc-monarch-tertiary-down: #ad5f05;

                    /* conteúdo do calendário */
                    --fc-monarch-event: var(--fc-monarch-primary);
                    --fc-monarch-event-contrast: var(--fc-monarch-primary-foreground);
                    --fc-monarch-highlight: rgba(217,119,6,0.08);
                    --fc-monarch-now: #D97706;

                    /* controles (aba de view selecionada) */
                    --fc-monarch-selected: #1C2B3A;
                    --fc-monarch-selected-foreground: #ffffff;
                    --fc-monarch-selected-over: #2A3D50;
                    --fc-monarch-selected-down: #385064;
                    --fc-monarch-outline: #D97706;

                    /* popover */
                    --fc-monarch-popover: #ffffff;

                    /* neutros (base stone do projeto) */
                    --fc-monarch-background: #ffffff;
                    --fc-monarch-faint: rgba(120,113,108,0.10);
                    --fc-monarch-muted: rgba(120,113,108,0.15);
                    --fc-monarch-strong: rgba(120,113,108,0.30);
                    --fc-monarch-stronger: rgba(120,113,108,0.35);
                    --fc-monarch-strongest: rgba(120,113,108,0.40);
                    --fc-monarch-foreground: #1C1917;
                    --fc-monarch-faint-foreground: #a8a29e;
                    --fc-monarch-muted-foreground: #78716C;
                    --fc-monarch-border: #e8e5df;
                    --fc-monarch-strong-border: #d6d3cd;
                  }
                  /* Mobile: compacta toolbar do tema para caber em 375px (mesmas formas, tamanhos menores) */
                  @media (max-width: 640px) {
                    .fc-cronograma div:has(> [role="heading"]) {
                      min-width: 0 !important;
                      flex-shrink: 1 !important;
                      overflow: hidden !important;
                    }
                    .fc-cronograma [role="heading"] {
                      font-size: 15px !important;
                      white-space: nowrap !important;
                      overflow: hidden !important;
                      text-overflow: ellipsis !important;
                      min-width: 0 !important;
                      max-width: 100% !important;
                    }
                    .fc-cronograma button[type="button"] {
                      font-size: 12px !important;
                      padding-left: 10px !important;
                      padding-right: 10px !important;
                      min-height: 32px !important;
                    }
                    .fc-cronograma [role="tab"] {
                      font-size: 12px !important;
                      padding-left: 9px !important;
                      padding-right: 9px !important;
                      min-height: 30px !important;
                    }
                    .fc-cronograma button[type="button"] svg {
                      width: 16px !important;
                      height: 16px !important;
                    }
                    /* Lista: fonte menor e quebra de linha só no título do evento */
                    .fc-cronograma [role="listitem"] {
                      font-size: 13px !important;
                    }
                    .fc-cronograma [role="listitem"] > div:last-child > div > div:last-child > div:last-child {
                      white-space: normal !important;
                      overflow-wrap: break-word;
                      font-size: 13px !important;
                    }
                    /* célula "Dia inteiro": menor e sem largura fixa, para liberar espaço ao título */
                    .fc-cronograma [role="listitem"] > div:last-child > div > div:last-child > div:first-child {
                      font-size: 11px !important;
                      width: auto !important;
                    }
                  }
                `}</style>
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, listPlugin, monarchThemePlugin]}
                  locale={ptBrLocale}
                  initialView="dayGridMonth"
                  initialDate={toISO(localStartDate) ?? undefined}
                  headerToolbar={{
                    left: "today prev,next title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth,multiMonthYear",
                  }}
                  height="auto"
                  events={calEvents}
                />
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
                {!isLocked && (
                  <button
                    onClick={() => setAddingExpense(true)}
                    className="flex items-center gap-1 text-xs font-medium text-accent hover:text-amber-600 transition-colors"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                )}
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
                {!isLocked && (
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
                )}
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
                files.forEach((file, i) => {
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const url = ev.target?.result as string;
                    const now = new Date();
                    const dateStr = `${String(now.getDate()).padStart(2,"0")} ${months[now.getMonth()]} ${now.getFullYear()}`;
                    const newPhoto = { id: Date.now() + i, url, caption: file.name.replace(/\.[^.]+$/, ""), date: dateStr };
                    setPhotos(prev => {
                      const next = [...prev, newPhoto];
                      const updatedProject = addProjectHistory(
                        { ...project, milestones, expenses, photos: next, status, progress: computedProgress, phase: computedPhase },
                        `Foto adicionada à galeria: "${newPhoto.caption}".`
                      );
                      onUpdateProject?.(updatedProject);
                      return next;
                    });
                  };
                  reader.readAsDataURL(file);
                });
                e.target.value = "";
              }}
            />
            {!isLocked && (
              <button
                type="button"
                onClick={() => document.getElementById("gallery-upload-input")?.click()}
                className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={16} /> Adicionar Fotos
              </button>
            )}
          </div>
        )}

        {/* TAB: Documentos */}
        {tab === "documentos" && (
          <DocumentosTab
            documents={documents}
            readOnly={isLocked}
            onAdd={doc => {
              const next = [...documents, doc];
              setDocuments(next);
              const updatedProject = addProjectHistory(
                { ...project, milestones, expenses, photos, status, progress: computedProgress, phase: computedPhase, documents: next },
                `Documento "${doc.title}" adicionado.`
              );
              onUpdateProject?.(updatedProject);
            }}
            onRemove={id => {
              const removed = documents.find(d => d.id === id);
              const next = documents.filter(d => d.id !== id);
              setDocuments(next);
              const updatedProject = addProjectHistory(
                { ...project, milestones, expenses, photos, status, progress: computedProgress, phase: computedPhase, documents: next },
                removed ? `Documento "${removed.title}" removido.` : "Documento removido."
              );
              onUpdateProject?.(updatedProject);
            }}
          />
        )}
      </div>


      {/* Project history modal */}
      {showProjectHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowProjectHistory(false)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl z-10 max-h-[80vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-accent" />
                <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Histórico da obra
                </h3>
              </div>
              <button onClick={() => setShowProjectHistory(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <Clock size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {[...history].reverse().map((entry, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-2.5 h-2.5 rounded-full bg-accent border-2 border-background shrink-0 mt-1 relative z-10" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground font-mono">{entry.datetime}</p>
                          <p className="text-sm text-foreground leading-snug mt-0.5">{entry.description}</p>
                          {entry.changedBy && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">por {entry.changedBy}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Ações da obra — obra cancelada só tem "Retomar" (com motivo obrigatório) */}
      {status === "Cancelada" ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          {projectAction === "retomar" ? (
            <div className="max-w-2xl mx-auto space-y-3">
              <p className="text-sm font-medium text-foreground">Confirmar retomada da obra?</p>
              <textarea
                rows={2}
                placeholder="Motivo da retomada (obrigatório)"
                value={projectActionReason}
                onChange={e => setProjectActionReason(e.target.value)}
                className="w-full bg-input-background rounded-lg px-3 py-2 text-sm border border-border text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 ring-accent/40 resize-none"
              />
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
                  disabled={!projectActionReason.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <RotateCcw size={15} /> Retomar obra
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => setProjectAction("retomar")}
                className="w-full py-2.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} /> Retomar obra
              </button>
            </div>
          )}
        </div>
      ) : status !== "Concluído" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          {projectAction ? (
            <div className="max-w-2xl mx-auto space-y-3">
              <p className="text-sm font-medium text-foreground">
                {projectAction === "concluir" && "Confirmar conclusão da obra?"}
                {projectAction === "pausar" && "Confirmar pausa da obra?"}
                {projectAction === "cancelar" && "Confirmar cancelamento da obra?"}
                {projectAction === "retomar" && "Confirmar retomada da obra?"}
              </p>
              {projectAction === "pausar" && (
                <input
                  type="text"
                  placeholder="Motivo da pausa (opcional)"
                  value={projectActionReason}
                  onChange={e => setProjectActionReason(e.target.value)}
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm border border-border text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 ring-accent/40"
                />
              )}
              {projectAction === "cancelar" && (
                <textarea
                  rows={2}
                  placeholder="Motivo do cancelamento (obrigatório)"
                  value={projectActionReason}
                  onChange={e => setProjectActionReason(e.target.value)}
                  className="w-full bg-input-background rounded-lg px-3 py-2 text-sm border border-border text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 ring-accent/40 resize-none"
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
                  disabled={(projectAction === "concluir" && !canConclude) || (projectAction === "cancelar" && !projectActionReason.trim())}
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
          projectStartDate={localStartDate}
          projectEndDate={localEndDate}
          projectBudgeted={project.budgeted}
          projectSpent={totalExpenses}
          onSave={updated => {
            const next = milestones.map(m => m.label === editingStep.label ? updated : m);
            setMilestones(next);
            const newExpenses = contractorExpenseForMilestone(updated, expenses);
            if (newExpenses !== expenses) setExpenses(newExpenses);
            const changes = describeMilestoneChanges(editingStep, updated);
            const desc = changes.length > 0
              ? `Etapa "${updated.label}": ${changes.join("; ")}.`
              : `Etapa "${updated.label}" atualizada.`;
            const { progress, phase } = computeDerived(next);
            const updatedProject = addProjectHistory(
              { ...project, milestones: next, expenses: newExpenses, status, progress, phase },
              desc
            );
            onUpdateProject?.(updatedProject);
          }}
        />
      )}

      {/* Step create modal */}
      {creatingStep && (
        <StepModal
          step={emptyStep}
          isNew
          onClose={() => setCreatingStep(false)}
          projectStartDate={localStartDate}
          projectEndDate={localEndDate}
          projectBudgeted={project.budgeted}
          projectSpent={totalExpenses}
          onSave={draftStep => {
            const newStep: Milestone = { ...draftStep, id: Date.now() };
            const next = [...milestones, newStep];
            setMilestones(next);
            const newExpenses = contractorExpenseForMilestone(newStep, expenses);
            if (newExpenses !== expenses) setExpenses(newExpenses);
            const details: string[] = [];
            if (newStep.startDate) details.push(`início previsto ${fmtDate(newStep.startDate)}`);
            if (newStep.deadline) details.push(`prazo ${fmtDate(newStep.deadline)}`);
            if (newStep.contractorName) details.push(`empreiteiro ${newStep.contractorName}`);
            if (newStep.contractorValue) details.push(`valor ${fmt(newStep.contractorValue)}`);
            const desc = `Etapa "${newStep.label}" criada${details.length > 0 ? ` — ${details.join(", ")}` : ""}.`;
            const { progress, phase } = computeDerived(next);
            const updatedProject = addProjectHistory(
              { ...project, milestones: next, expenses: newExpenses, status, progress, phase },
              desc
            );
            onUpdateProject?.(updatedProject);
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
                  let historyDesc: string;
                  if (editingExpenseId !== null) {
                    const oldExpense = expenses.find(e => e.id === editingExpenseId);
                    nextExpenses = expenses.map(e => e.id === editingExpenseId
                      ? { ...e, description: expenseDraft.description, category: expenseDraft.category, amount: parsed, notes: expenseDraft.notes || undefined, ...paymentFields }
                      : e
                    );
                    const justPaid = oldExpense?.isPayment && oldExpense.paymentStatus === "A fazer" && paymentFields.isPayment && paymentFields.paymentStatus === "Realizado";
                    historyDesc = justPaid
                      ? `Pagamento "${expenseDraft.description}" marcado como realizado — ${fmt(parsed)}.`
                      : `Despesa "${expenseDraft.description}" atualizada — ${fmt(parsed)}.`;
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
                    historyDesc = paymentFields.isPayment
                      ? `Pagamento "${expenseDraft.description}" registrado — ${fmt(parsed)}.`
                      : `Despesa "${expenseDraft.description}" registrada — ${fmt(parsed)}.`;
                  }
                  setExpenses(nextExpenses);
                  const updatedProject = addProjectHistory(
                    { ...project, milestones, expenses: nextExpenses, status, progress: computedProgress, phase: computedPhase },
                    historyDesc
                  );
                  onUpdateProject?.(updatedProject);
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

export { ProjectDetail };
