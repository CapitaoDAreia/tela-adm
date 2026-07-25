import { ArrowLeft, Printer } from "lucide-react";
import type { Project } from "../../../lib/types";
import { fmt } from "../../../lib/format";
import { projectCoverGradient, STEP_STATUS_CONFIG } from "../../../lib/project-helpers";

export function ReportModal({ project, onClose }: { project: Project; onClose: () => void }) {
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
            {project.image ? (
              <img src={project.image} alt={project.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: projectCoverGradient(project.id) }} />
            )}
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
