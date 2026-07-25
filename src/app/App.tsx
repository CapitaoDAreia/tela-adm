import { useState, useEffect } from "react";
import { HardHat, AlertTriangle } from "lucide-react";
import type { Screen, Project, QuoteRecord, Contractor, StepStatus } from "../lib/types";
import { projectsApi, quotesApi, contractorsApi } from "../lib/api";
import { nowTs } from "../lib/format";
import { Dashboard } from "./components/dashboard/Dashboard";
import { ProjectDetail } from "./components/projects/ProjectDetail";
import { NewQuote } from "./components/quotes/NewQuote";
import { QuotesList } from "./components/quotes/QuotesList";
import { QuoteDetail } from "./components/quotes/QuoteDetail";
import { ContractorsScreen } from "./components/contractors/ContractorsScreen";
import { BottomNav } from "./components/shared/BottomNav";

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
    if (q.generatedProjectId) return; // orçamento já gerou obra — travado
    const lastName = q.clientName.split(" ").pop() ?? q.clientName;
    const payload: Omit<Project, "id"> = {
      quoteId: q.id,
      name: `Studio ${lastName}`,
      client: q.clientName,
      status: "Em andamento",
      progress: 0,
      budgeted: q.budgeted,
      contractValue: q.contractValue,
      spent: 0,
      expenses: [],
      milestones: q.items.map((item, i) => ({
        id: Date.now() + i,
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
      history: [{ datetime: nowTs(), description: `Obra criada a partir do orçamento aprovado de ${q.clientName} (orçamento #${q.id}).` }],
    };
    projectsApi.create(payload)
      .then(created => {
        setProjects(prev => [...prev, created]);
        const updatedQuote: QuoteRecord = {
          ...q,
          generatedProjectId: created.id,
          history: [...(q.history ?? []), { datetime: nowTs(), description: `Obra gerada a partir deste orçamento (obra #${created.id}). Orçamento travado para edição.` }],
        };
        setQuotes(prev => prev.map(qq => qq.id === q.id ? updatedQuote : qq));
        quotesApi.update(q.id, updatedQuote).catch(e => console.error("Failed to lock quote after project generation:", e));
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
