import { useState } from "react";
import { FileText, Upload, Trash2, X, FilePlus } from "lucide-react";
import type { ProjectDocument } from "../../../lib/types";

export function DocumentosTab({
  documents,
  onAdd,
  onRemove,
  readOnly = false,
}: {
  documents: ProjectDocument[];
  onAdd: (doc: ProjectDocument) => void;
  onRemove: (id: number) => void;
  readOnly?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const nowStr = () => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
  };

  const handleAdd = () => {
    if (!docTitle.trim() || !docFile) return;
    const url = URL.createObjectURL(docFile);
    onAdd({
      id: Date.now(),
      title: docTitle.trim(),
      description: docDescription.trim(),
      url,
      fileName: docFile.name,
      uploadedAt: nowStr(),
    });
    setDocTitle("");
    setDocDescription("");
    setDocFile(null);
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      {documents.length === 0 && !uploading && (
        <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-3 text-center">
          <FileText size={32} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum documento adicionado ainda</p>
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug">{doc.title}</p>
                {doc.description && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{doc.description}</p>}
                <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{doc.fileName} · {doc.uploadedAt}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                  title="Abrir"
                >
                  <Upload size={13} className="rotate-180" />
                </a>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemove(doc.id)}
                    className="p-1.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {readOnly ? null : uploading ? (
        <div className="bg-card border border-accent/30 rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">Novo documento</p>
          <input
            type="text"
            placeholder="Título do documento"
            value={docTitle}
            onChange={e => setDocTitle(e.target.value)}
            className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50"
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={docDescription}
            onChange={e => setDocDescription(e.target.value)}
            className="w-full bg-input-background rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-accent/40 border border-border text-foreground placeholder:text-muted-foreground/50"
          />
          <div>
            <input
              type="file"
              id="doc-upload-input"
              accept=".pdf"
              className="hidden"
              onChange={e => setDocFile(e.target.files?.[0] ?? null)}
            />
            {docFile ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                <FileText size={14} className="text-red-500 shrink-0" />
                <span className="text-foreground flex-1 min-w-0 truncate">{docFile.name}</span>
                <button type="button" onClick={() => setDocFile(null)} className="text-muted-foreground hover:text-red-400 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById("doc-upload-input")?.click()}
                className="w-full py-2.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={13} /> Selecionar arquivo PDF
              </button>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setUploading(false); setDocTitle(""); setDocDescription(""); setDocFile(null); }}
              className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!docTitle.trim() || !docFile}
              className="flex-1 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              Adicionar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setUploading(true)}
          className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
        >
          <FilePlus size={16} /> Adicionar Documento
        </button>
      )}
    </div>
  );
}
