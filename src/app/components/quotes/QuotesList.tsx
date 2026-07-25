import { useState } from "react";
import { ClipboardList } from "lucide-react";
import type { QuoteRecord } from "../../../lib/types";
import { fmt } from "../../../lib/format";
import { quoteStatusColors, urgencyColors, QUOTE_STATUS_FILTERS, QUOTE_SORT_OPTIONS } from "../../../lib/quote-helpers";
import type { QuoteStatusFilter, QuoteSortOption } from "../../../lib/quote-helpers";

export function QuotesList({ quotes, onOpenQuote }: { quotes: QuoteRecord[]; onOpenQuote: (q: QuoteRecord) => void }) {
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
                  <span className="text-[10px] font-mono text-muted-foreground/70">#{q.id}</span>
                  <span className="text-muted-foreground/40 text-[10px]">·</span>
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
