import { useState } from "react";
import { Plus, Phone, Trash2, HardHatIcon } from "lucide-react";
import type { Contractor } from "../../../lib/types";

export function ContractorsScreen({ contractors, onAdd, onToggleStatus, onRemove }: {
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
