import { useState } from "react";
import {
  HardHat, DollarSign, CalendarClock, Building2, PackagePlus,
  CalendarDays, CalendarCheck, AlertTriangle, X,
} from "lucide-react";
import type { Project } from "../../../lib/types";
import { fmt, fmtDate, parseAnyDate } from "../../../lib/format";
import { statusColors, projectCoverGradient } from "../../../lib/project-helpers";
import { ProgressBar } from "../shared/ProgressBar";

type DashFilter = "pagamentos" | "atrasadas" | "ativas" | "entregas" | null;

export function Dashboard({ projects, onOpenProject }: {
  projects: Project[];
  onOpenProject: (p: Project) => void;
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
                  {project.image ? (
                    <img
                      src={project.image}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: projectCoverGradient(project.id) }} />
                  )}
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
