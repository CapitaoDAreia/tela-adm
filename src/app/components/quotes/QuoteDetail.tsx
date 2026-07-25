import { useState } from "react";
import {
  ArrowLeft, Printer, ListChecks, CheckCircle, Pencil, DollarSign, CalendarDays,
  CalendarCheck, CalendarClock, FileText, Trash2, PackagePlus, ShieldCheck,
  HardHat, RotateCcw,
} from "lucide-react";
import type { QuoteRecord, QuoteItem } from "../../../lib/types";
import { fmt } from "../../../lib/format";
import { quoteStatusColors } from "../../../lib/quote-helpers";

export function QuoteDetail({
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
  const missingDatesForApproval = !quote.startDate || !quote.endDate;

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
    if (!quote.startDate || !quote.endDate) return;
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
          <p className="text-xs text-primary-foreground/60 font-mono uppercase tracking-wider">Orçamento #{quote.id}</p>
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
              <div className={`rounded-xl border p-4 space-y-3 ${margin >= 0 ? "border-green-300 bg-green-50" : "border-red-800/40 bg-red-900/10"}`}>
                <p className="text-sm font-medium text-foreground">Confirmar aprovação</p>
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${margin >= 0 ? "bg-green-100" : "bg-red-900/20"}`}>
                  <span className={`text-xs font-mono ${margin >= 0 ? "text-green-700" : "text-red-400"}`}>Margem do contrato</span>
                  <span className={`text-sm font-mono font-bold ${margin >= 0 ? "text-green-700" : "text-red-400"}`}>{margin.toFixed(1)}%</span>
                </div>
                {margin < 0 && (
                  <p className="text-xs text-red-600 leading-snug">Atenção: a margem está negativa. Verifique os valores antes de aprovar.</p>
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
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCancellingQuote(true)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-medium hover:bg-secondary transition-colors border border-border">
                    Cancelar orçamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingApproval(true)}
                    disabled={missingDatesForApproval}
                    title={missingDatesForApproval ? "Defina as datas de início e entrega antes de aprovar." : undefined}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-green-600"
                  >
                    <CheckCircle size={15} /> Aprovar
                  </button>
                </div>
                {missingDatesForApproval && (
                  <p className="text-xs text-amber-600 leading-snug">
                    Defina a data de início e a entrega prevista (seção "Ajustar datas" abaixo) antes de aprovar este orçamento.
                  </p>
                )}
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

        {/* Gerar Obra — só aparece quando Aprovado */}
        {quote.status === "Aprovado" && (
          quote.generatedProjectId ? (
            <div className="bg-muted/60 border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide font-medium flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-accent" /> Orçamento travado
              </p>
              <p className="text-sm text-muted-foreground">
                Obra já gerada a partir deste orçamento (obra <span className="font-mono text-foreground">#{quote.generatedProjectId}</span>).
                Este orçamento não pode mais ser editado ou reaberto.
              </p>
            </div>
          ) : (
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
          )
        )}
      </div>
    </div>
  );
}
