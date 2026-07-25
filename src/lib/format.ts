// ─── Formatação genérica (moeda, data, timestamp) ──────────────────────────────

export const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (d: string) =>
  d && d.includes("-") ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : d;

export const nowTs = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

export const parseAnyDate = (d: string): Date | null => {
  if (!d) return null;
  if (d.includes("/")) {
    const [dd, mm, yyyy] = d.split("/").map(Number);
    return new Date(yyyy, mm - 1, dd);
  }
  if (d.includes("-")) return new Date(d + "T12:00:00");
  return null;
};
