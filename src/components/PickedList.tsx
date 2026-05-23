"use client";

import type { Entry } from "@/lib/sheet";

type Props = { picked: Entry[] };

export default function PickedList({ picked }: Props) {
  if (picked.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/40">
        Nobody picked yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/60">
          Already picked
        </h3>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
          {picked.length}
        </span>
      </div>
      <ul className="max-h-72 space-y-1 overflow-auto pr-1">
        {picked.map((e, i) => (
          <li
            key={`${e.name}-${i}`}
            className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 text-sm text-white"
          >
            <span className="w-5 text-right text-white/40">{picked.length - i}.</span>
            <span className="flex-1 truncate">{e.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
