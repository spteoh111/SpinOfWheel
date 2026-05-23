"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Wheel from "@/components/Wheel";
import SheetInput, { type SavedSheet } from "@/components/SheetInput";
import PickedList from "@/components/PickedList";
import ResultModal from "@/components/ResultModal";
import { fetchEntries, parseSheetUrl, type Entry } from "@/lib/sheet";
import { useSoundManager } from "@/lib/sound";
import { isYouTubeUrl } from "@/lib/youtube";
import { appConfig } from "@/lib/appConfig";

const LS_URL = "wheel:sheetUrl";
const LS_SAVED = "wheel:savedSheets";
const MAX_VISIBLE_SLICES = 24;

const normalize = (s: string) => s.trim().toLowerCase();

type IndexedEntry = { entry: Entry; rowIndex: number };
type YouTubeAutoOpenState = "opened" | "blocked";
type SpinResult = IndexedEntry & {
  youtubeAutoOpenState?: YouTubeAutoOpenState;
};

function openYouTubeDirectly(url: string): YouTubeAutoOpenState {
  try {
    const opened = window.open(url, "_blank");
    if (!opened) return "blocked";
    try {
      opened.opener = null;
    } catch {}
    return "opened";
  } catch {
    return "blocked";
  }
}

function sampleVisible(eligible: IndexedEntry[], mustInclude?: IndexedEntry): IndexedEntry[] {
  if (eligible.length <= MAX_VISIBLE_SLICES) {
    return eligible;
  }
  const pool = mustInclude ? eligible.filter((e) => e.rowIndex !== mustInclude.rowIndex) : eligible.slice();
  const need = mustInclude ? MAX_VISIBLE_SLICES - 1 : MAX_VISIBLE_SLICES;
  const sample: IndexedEntry[] = [];
  for (let i = 0; i < need && pool.length > 0; i++) {
    const j = Math.floor(Math.random() * pool.length);
    sample.push(pool[j]);
    pool.splice(j, 1);
  }
  if (mustInclude) {
    const insertAt = Math.floor(Math.random() * (sample.length + 1));
    sample.splice(insertAt, 0, mustInclude);
  }
  return sample;
}

export default function Page() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [loadedSheetId, setLoadedSheetId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pickedIndices, setPickedIndices] = useState<Set<number>>(new Set());
  const [savedSheets, setSavedSheets] = useState<SavedSheet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleEntries, setVisibleEntries] = useState<IndexedEntry[]>([]);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [spinSeq, setSpinSeq] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const initRef = useRef(false);
  const pendingResultRef = useRef<SpinResult | null>(null);
  const { muted, playSpin, stopSpin, playReveal, toggleMute } = useSoundManager();

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    try {
      const u = localStorage.getItem(LS_URL);
      if (u) setSheetUrl(u);
      const s = localStorage.getItem(LS_SAVED);
      if (s) setSavedSheets(JSON.parse(s));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_URL, sheetUrl);
    } catch {}
  }, [sheetUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SAVED, JSON.stringify(savedSheets));
    } catch {}
  }, [savedSheets]);

  const handleLoad = useCallback(
    async (urlOverride?: string) => {
      const url = (urlOverride ?? sheetUrl).trim();
      if (!url) {
        setError("Please enter a Google Sheet URL.");
        return;
      }
      const parsed = parseSheetUrl(url);
      if (!parsed) {
        setError("That doesn't look like a Google Sheet URL.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEntries(url);
        if (data.length === 0) {
          setError("Sheet loaded but no rows found.");
        }
        const isSwitch = loadedSheetId !== parsed.sheetId;
        if (isSwitch) {
          setPickedIndices(new Set());
        } else {
          const nameCount = new Map<string, number>();
          for (const i of pickedIndices) {
            const e = entries[i];
            if (!e) continue;
            const k = normalize(e.name);
            nameCount.set(k, (nameCount.get(k) ?? 0) + 1);
          }
          const newPicked = new Set<number>();
          data.forEach((e, i) => {
            const k = normalize(e.name);
            const remaining = nameCount.get(k) ?? 0;
            if (remaining > 0) {
              newPicked.add(i);
              nameCount.set(k, remaining - 1);
            }
          });
          setPickedIndices(newPicked);
        }
        setEntries(data);
        setLoadedSheetId(parsed.sheetId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sheet.");
      } finally {
        setLoading(false);
      }
    },
    [sheetUrl, loadedSheetId, pickedIndices, entries]
  );

  const handleReload = useCallback(() => {
    handleLoad(sheetUrl);
  }, [handleLoad, sheetUrl]);

  const handleSave = useCallback(
    (label: string) => {
      if (!loadedSheetId) return;
      setSavedSheets((prev) => {
        const existingIdx = prev.findIndex((s) => s.id === loadedSheetId);
        const next = [...prev];
        const item: SavedSheet = { id: loadedSheetId, label, url: sheetUrl };
        if (existingIdx >= 0) next[existingIdx] = item;
        else next.push(item);
        return next;
      });
    },
    [loadedSheetId, sheetUrl]
  );

  const handlePickSaved = useCallback(
    (url: string) => {
      setSheetUrl(url);
      handleLoad(url);
    },
    [handleLoad]
  );

  const handleDeleteSaved = useCallback((id: string) => {
    setSavedSheets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const eligible = useMemo<IndexedEntry[]>(
    () =>
      entries
        .map((entry, rowIndex) => ({ entry, rowIndex }))
        .filter(({ rowIndex }) => !pickedIndices.has(rowIndex)),
    [entries, pickedIndices]
  );

  const pickedEntries = useMemo(() => {
    return Array.from(pickedIndices)
      .reverse()
      .map((i) => entries[i])
      .filter((e): e is Entry => Boolean(e));
  }, [pickedIndices, entries]);

  useEffect(() => {
    if (!spinning) return;
    const t = setTimeout(() => {
      console.warn("[wheel] watchdog fired: spinning > 10s, force-resetting");
      setSpinning(false);
      setTargetIndex(null);
    }, 10000);
    return () => clearTimeout(t);
  }, [spinning]);

  useEffect(() => {
    if (spinning) return;
    const eligibleIndexSet = new Set(eligible.map((e) => e.rowIndex));
    const stillValid = visibleEntries.every((e) => eligibleIndexSet.has(e.rowIndex));
    const enoughSlots =
      eligible.length <= MAX_VISIBLE_SLICES
        ? visibleEntries.length === eligible.length
        : visibleEntries.length === MAX_VISIBLE_SLICES;
    if (!stillValid || !enoughSlots) {
      setVisibleEntries(sampleVisible(eligible));
    }
  }, [eligible, spinning, visibleEntries]);

  const handleSpin = () => {
    if (spinning || eligible.length === 0 || result) return;

    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    let display: IndexedEntry[];
    if (eligible.length <= MAX_VISIBLE_SLICES) {
      display = visibleEntries.length === eligible.length ? visibleEntries : eligible;
    } else {
      display = sampleVisible(eligible, winner);
    }
    const idx = display.findIndex((e) => e.rowIndex === winner.rowIndex);
    const youtubeAutoOpenState = isYouTubeUrl(winner.entry.contents)
      ? openYouTubeDirectly(winner.entry.contents)
      : undefined;

    pendingResultRef.current = { ...winner, youtubeAutoOpenState };
    setVisibleEntries(display);
    setTargetIndex(idx >= 0 ? idx : null);
    setSpinning(true);
    setSpinSeq((s) => s + 1);
  };

  const handleResult = (idx: number) => {
    setSpinning(false);
    setTargetIndex(null);
    const item = visibleEntries[idx];
    const pendingResult = pendingResultRef.current;
    pendingResultRef.current = null;
    if (item) {
      setResult({
        ...item,
        youtubeAutoOpenState:
          pendingResult?.rowIndex === item.rowIndex
            ? pendingResult.youtubeAutoOpenState
            : undefined,
      });
    }
  };

  const handleCloseModal = () => {
    if (result) {
      setPickedIndices((prev) => {
        const next = new Set(prev);
        next.add(result.rowIndex);
        return next;
      });
    }
    setResult(null);
  };

  const handleReset = () => {
    if (pickedIndices.size === 0) return;
    if (pickedIndices.size > 3) {
      if (!confirm(`Clear ${pickedIndices.size} picked names and make everyone eligible again?`)) return;
    }
    setPickedIndices(new Set());
  };

  const handleForceUnstick = () => {
    setSpinning(false);
    setTargetIndex(null);
    setResult(null);
    pendingResultRef.current = null;
    setSpinSeq((s) => s + 1000);
  };

  const allPicked = entries.length > 0 && eligible.length === 0;
  const buildLabel = process.env.NEXT_PUBLIC_BUILD_ID?.slice(-6) ?? "dev";
  const metaParts = [
    appConfig.siteLabel,
    `build ${buildLabel}`,
    appConfig.credit,
  ].filter(Boolean);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <img
            src={appConfig.logoSrc}
            alt={appConfig.name}
            className="h-10 w-10 rounded-md object-cover sm:h-12 sm:w-12"
          />
          <span>{appConfig.name}</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            title={muted ? "Sounds off (click to enable)" : "Sounds on (click to mute)"}
            className="rounded p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowDebug((v) => !v)}
            className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/40 hover:bg-white/10"
            title="Toggle debug info"
          >
            {showDebug ? "Hide debug" : "Debug"}
          </button>
          {metaParts.length > 0 && (
            <span className="text-xs text-white/40">
              {metaParts.join(" · ")}
            </span>
          )}
        </div>
      </header>

      {showDebug && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
          <div className="mb-2 flex items-center justify-between">
            <strong>Debug</strong>
            <button
              onClick={handleForceUnstick}
              className="rounded-md bg-amber-400 px-3 py-1 text-xs font-semibold text-black hover:bg-amber-300"
            >
              Force unstick wheel
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            <div>spinning: <span className="font-mono">{String(spinning)}</span></div>
            <div>result: <span className="font-mono">{result ? "set" : "null"}</span></div>
            <div>spinSeq: <span className="font-mono">{spinSeq}</span></div>
            <div>targetIndex: <span className="font-mono">{String(targetIndex)}</span></div>
            <div>entries: <span className="font-mono">{entries.length}</span></div>
            <div>eligible: <span className="font-mono">{eligible.length}</span></div>
            <div>picked: <span className="font-mono">{pickedIndices.size}</span></div>
            <div>visible: <span className="font-mono">{visibleEntries.length}</span></div>
          </div>
        </div>
      )}

      <SheetInput
        value={sheetUrl}
        onChange={setSheetUrl}
        onLoad={() => handleLoad()}
        onReload={handleReload}
        onSave={handleSave}
        onPickSaved={handlePickSaved}
        onDeleteSaved={handleDeleteSaved}
        savedSheets={savedSheets}
        loading={loading}
        error={error}
        canReload={loadedSheetId !== null}
      />

      {entries.length > 0 && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <section className="flex flex-1 flex-col items-center gap-5">
            <Wheel
              names={visibleEntries.map((e) => e.entry.name)}
              spinSeq={spinSeq}
              targetIndex={targetIndex}
              onResult={handleResult}
              onSpinStart={playSpin}
              onSpinEnd={stopSpin}
            />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleSpin}
                disabled={spinning || eligible.length === 0 || result !== null}
                className="rounded-xl bg-indigo-500 px-8 py-3 text-base font-bold text-white shadow-lg transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {spinning ? "Spinning…" : allPicked ? "All picked" : "SPIN"}
              </button>
              <button
                onClick={handleReset}
                disabled={pickedIndices.size === 0}
                className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset
              </button>
            </div>

            {allPicked && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
                All names picked — click Reset to start a new round.
              </div>
            )}
          </section>

          <aside className="w-full lg:w-80">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Eligible</span>
                  <span className="font-bold text-white">{eligible.length}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-white/60">Total</span>
                  <span className="font-bold text-white">{entries.length}</span>
                </div>
                {eligible.length > MAX_VISIBLE_SLICES && (
                  <div className="mt-2 border-t border-white/10 pt-2 text-xs text-white/50">
                    Wheel shows {MAX_VISIBLE_SLICES} random slices per spin. Draw is fair across all {eligible.length} eligible.
                  </div>
                )}
              </div>
              <PickedList picked={pickedEntries} />
            </div>
          </aside>
        </div>
      )}

      <ResultModal
        entry={result?.entry ?? null}
        youtubeAutoOpenState={result?.youtubeAutoOpenState}
        onClose={handleCloseModal}
        onOpen={playReveal}
      />
    </main>
  );
}
