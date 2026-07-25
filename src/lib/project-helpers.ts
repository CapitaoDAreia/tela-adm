import type { Milestone, ProjectStatus, StepStatus } from "./types";
import { fmt, fmtDate } from "./format";

// ─── Cor/rótulo por status de obra ─────────────────────────────────────────────

export const statusColors: Record<ProjectStatus, string> = {
  "Em andamento": "bg-blue-100 text-blue-700",
  "Concluído": "bg-green-100 text-green-700",
  "Pausado": "bg-yellow-100 text-yellow-700",
  "Cancelada": "bg-red-100 text-red-700",
  "Orçamento": "bg-purple-100 text-purple-700",
};

// ─── Cor/rótulo por status de etapa ────────────────────────────────────────────

export const STEP_STATUS_CONFIG: Record<StepStatus, { label: string; color: string; dot: string }> = {
  "Concluído":    { label: "Concluído",    color: "bg-green-100 text-green-700 border-green-200",          dot: "bg-green-500" },
  "Em andamento": { label: "Em andamento", color: "bg-primary/20 text-primary border-primary/30",           dot: "bg-primary" },
  "Pendente":     { label: "Pendente",     color: "bg-muted text-muted-foreground border-border",           dot: "bg-muted-foreground" },
  "Cancelado":    { label: "Cancelado",    color: "bg-red-900/30 text-red-400 border-red-900",              dot: "bg-red-400" },
};

// ─── Templates de etapa (usados ao criar nova etapa) ───────────────────────────

export const PHASE_TEMPLATES: { label: string; description: string }[] = [
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

// ─── Capa gradiente (obras sem foto) ────────────────────────────────────────────

const PROJECT_COVER_GRADIENTS = [
  "linear-gradient(135deg, #1C2B3A 0%, #2D4356 100%)",
  "linear-gradient(135deg, #78350F 0%, #B45309 100%)",
  "linear-gradient(135deg, #1A4031 0%, #2D6A4F 100%)",
  "linear-gradient(135deg, #312E81 0%, #4F46E5 100%)",
  "linear-gradient(135deg, #134E4A 0%, #0F766E 100%)",
  "linear-gradient(135deg, #7F1D1D 0%, #B91C1C 100%)",
];
export const projectCoverGradient = (id: number) => PROJECT_COVER_GRADIENTS[id % PROJECT_COVER_GRADIENTS.length];

// ─── Diff legível entre duas versões de uma etapa (para o histórico da obra) ───

export function describeMilestoneChanges(before: Milestone, after: Milestone): string[] {
  const notes: string[] = [];
  if (before.status !== after.status) {
    notes.push(`status alterado de "${before.status}" para "${after.status}"`);
  }
  if (before.startDate !== after.startDate && after.startDate) {
    notes.push(`início previsto alterado para ${fmtDate(after.startDate)}`);
  }
  if (before.deadline !== after.deadline && after.deadline) {
    notes.push(`prazo alterado para ${fmtDate(after.deadline)}`);
  }
  if (before.contractorName !== after.contractorName) {
    if (after.contractorName && !before.contractorName) {
      notes.push(`empreiteiro "${after.contractorName}" atribuído`);
    } else if (!after.contractorName && before.contractorName) {
      notes.push(`empreiteiro "${before.contractorName}" removido`);
    } else if (after.contractorName) {
      notes.push(`empreiteiro alterado para "${after.contractorName}"`);
    }
  }
  if (before.contractorValue !== after.contractorValue) {
    notes.push(after.contractorValue != null
      ? `valor do empreiteiro definido em ${fmt(after.contractorValue)}`
      : `valor do empreiteiro removido`);
  }
  if (before.contractorPaymentDue !== after.contractorPaymentDue && after.contractorPaymentDue) {
    notes.push(`vencimento do pagamento definido para ${fmtDate(after.contractorPaymentDue)}`);
  }
  if (before.description !== after.description) {
    notes.push(`descrição da etapa atualizada`);
  }
  return notes;
}
