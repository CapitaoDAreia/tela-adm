import { Home, ClipboardList, HardHatIcon, FilePlus } from "lucide-react";
import type { Screen } from "../../../lib/types";

export function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  const items: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard",    label: "Obras",         icon: <Home size={20} /> },
    { id: "quotes",       label: "Orçamentos",    icon: <ClipboardList size={20} /> },
    { id: "empreiteiros", label: "Empreiteiros",  icon: <HardHatIcon size={20} /> },
    { id: "newQuote",     label: "Novo Orçamento", icon: <FilePlus size={20} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-40">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
            active === item.id ? "text-accent" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
