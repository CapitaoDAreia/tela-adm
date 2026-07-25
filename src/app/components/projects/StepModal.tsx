import { useState, useEffect } from "react";
import { X, CalendarDays, CalendarCheck, CalendarClock, HardHatIcon, ShieldCheck } from "lucide-react";
import type { Milestone, StepStatus, Contractor } from "../../../lib/types";
import { contractorsApi } from "../../../lib/api";
import { fmt, fmtDate } from "../../../lib/format";
import { STEP_STATUS_CONFIG, PHASE_TEMPLATES } from "../../../lib/project-helpers";

export function StepModal({ step, onClose, onSave, isNew = false, projectStartDate, projectEndDate, projectBudgeted, projectSpent }: {
  step: Milestone;
  onClose: () => void;
  onSave: (updated: Milestone) => void;
  isNew?: boolean;
  projectStartDate?: string;
  projectEndDate?: string;
  projectBudgeted?: number;
  projectSpent?: number;
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

        {/* Contexto da obra — visível ao definir custo/datas da etapa */}
        {(projectBudgeted != null || projectStartDate) && (
          <div className="mx-5 mt-4 rounded-xl border border-border bg-muted/40 overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/60">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contexto da obra</span>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {projectBudgeted != null && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Orçado</p>
                    <p className="text-xs font-mono font-semibold text-foreground">{fmt(projectBudgeted)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Gasto</p>
                    <p className="text-xs font-mono font-semibold text-amber-600">{fmt(projectSpent ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Saldo</p>
                    <p className={`text-xs font-mono font-semibold ${projectBudgeted - (projectSpent ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {fmt(projectBudgeted - (projectSpent ?? 0))}
                    </p>
                  </div>
                </div>
              )}
              {projectStartDate && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-mono pt-1 border-t border-border/60">
                  <CalendarDays size={11} className="text-accent shrink-0" />
                  {projectStartDate}
                  <span className="text-muted-foreground/50">→</span>
                  <CalendarCheck size={11} className="text-accent shrink-0" />
                  {projectEndDate || "–"}
                </div>
              )}
            </div>
          </div>
        )}

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
            {isNew || !draft.deadline ? (
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
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Custo da etapa (valor combinado)</label>
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
              {draft.contractorValue != null && draft.contractorValue > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Vencimento do pagamento</label>
                  <input
                    type="date"
                    value={draft.contractorPaymentDue ?? ""}
                    onChange={e => setDraft({ ...draft, contractorPaymentDue: e.target.value || undefined })}
                    className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground font-mono"
                  />
                </div>
              )}
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
