import type { QuoteStatus } from "./types";

export const quoteStatusColors: Record<QuoteStatus, string> = {
  "Solicitado": "bg-purple-100 text-purple-700",
  "Em análise": "bg-blue-100 text-blue-700",
  "Aprovado":   "bg-green-100 text-green-700",
  "Cancelado":  "bg-red-100 text-red-700",
};

export const urgencyColors: Record<string, string> = {
  "Urgente": "bg-red-50 text-red-600",
  "Padrão":  "bg-gray-100 text-gray-600",
  "Normal":  "bg-gray-100 text-gray-600",
};

export const QUOTE_STATUS_FILTERS = ["Todos", "Solicitado", "Em análise", "Aprovado", "Cancelado"] as const;
export type QuoteStatusFilter = (typeof QUOTE_STATUS_FILTERS)[number];

export const QUOTE_SORT_OPTIONS = [
  { value: "recent", label: "Mais recente" },
  { value: "value", label: "Maior valor" },
] as const;
export type QuoteSortOption = (typeof QUOTE_SORT_OPTIONS)[number]["value"];
