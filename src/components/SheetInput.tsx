"use client";

import { useState } from "react";

export type SavedSheet = { id: string; label: string; url: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onLoad: () => void;
  onReload: () => void;
  onSave: (label: string) => void;
  onPickSaved: (url: string) => void;
  onDeleteSaved: (id: string) => void;
  savedSheets: SavedSheet[];
  loading: boolean;
  error: string | null;
  canReload: boolean;
};

export default function SheetInput({
  value,
  onChange,
  onLoad,
  onReload,
  onSave,
  onPickSaved,
  onDeleteSaved,
  savedSheets,
  loading,
  error,
  canReload,
}: Props) {
  const [savingLabel, setSavingLabel] = useState<string | null>(null);

  function handleSaveSubmit() {
    const label = (savingLabel ?? "").trim();
    if (!label) return;
    onSave(label);
    setSavingLabel(null);
  }

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/50">
        Google Sheet URL
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          className="flex-1 rounded-lg border border-white/15 bg-[#0b1020]/70 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") onLoad();
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Btn onClick={onLoad} disabled={loading} variant="primary">
            {loading ? "Loading…" : "Load"}
          </Btn>
          <Btn onClick={onReload} disabled={loading || !canReload}>
            Reload
          </Btn>
          <Btn
            onClick={() => setSavingLabel("")}
            disabled={!canReload || savingLabel !== null}
          >
            Save
          </Btn>
        </div>
      </div>

      {savingLabel !== null && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-white/10 bg-[#0b1020]/60 p-3 sm:flex-row sm:items-center">
          <input
            autoFocus
            value={savingLabel}
            onChange={(e) => setSavingLabel(e.target.value)}
            placeholder="Label (e.g. Round 1)"
            className="flex-1 rounded-md border border-white/15 bg-transparent px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveSubmit();
              if (e.key === "Escape") setSavingLabel(null);
            }}
          />
          <div className="flex gap-2">
            <Btn onClick={handleSaveSubmit} variant="primary">Save</Btn>
            <Btn onClick={() => setSavingLabel(null)}>Cancel</Btn>
          </div>
        </div>
      )}

      {savedSheets.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/40">
            Saved sheets
          </div>
          <div className="flex flex-wrap gap-2">
            {savedSheets.map((s) => (
              <div
                key={s.id}
                className="group flex items-center gap-1 rounded-full border border-white/10 bg-white/5 pl-3 pr-1 text-xs text-white/80 transition hover:bg-white/10"
              >
                <button
                  onClick={() => onPickSaved(s.url)}
                  className="py-1.5"
                  title={s.url}
                >
                  {s.label}
                </button>
                <button
                  onClick={() => onDeleteSaved(s.id)}
                  className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                  aria-label={`Delete ${s.label}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <p className="mt-3 text-xs text-white/40">
        Sheet must be shared as <strong>Anyone with the link → Viewer</strong>. Columns: <code>A=Name</code>, <code>B=Contents</code> (YouTube URL or text).{" "}
        <a
          href="https://docs.google.com/spreadsheets/d/1HgCocBNjJ7b6MLXOJ-8K0ATktnicFiN3gYJdn_MtHJo/edit?gid=1706095543#gid=1706095543"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/30 underline-offset-2 hover:text-white/70 hover:decoration-white/60"
        >
          View sample sheet ↗
        </a>
      </p>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary";
}) {
  const base = "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-indigo-500 text-white hover:bg-indigo-400"
      : "bg-white/10 text-white hover:bg-white/20";
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}
