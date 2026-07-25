import { useState } from "react";
import {
  CheckCircle, ArrowLeft, User, Phone, Mail, Trash2, PackagePlus,
  DollarSign, CalendarDays, CalendarCheck, FileText, Printer,
} from "lucide-react";
import type { QuoteItem, QuoteRecord } from "../../../lib/types";
import { fmt } from "../../../lib/format";

let nextItemId = 1;

export function NewQuote({ onBack, onQuoteCreated }: { onBack: () => void; onQuoteCreated: (q: QuoteRecord) => void }) {
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
