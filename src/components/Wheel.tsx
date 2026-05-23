"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  names: string[];
  spinSeq: number;
  targetIndex?: number | null;
  onResult: (index: number) => void;
  onSpinStart?: () => void;
  onSpinEnd?: () => void;
};

const PALETTE = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#06b6d4", "#8b5cf6", "#ef4444", "#84cc16",
  "#3b82f6", "#f97316", "#14b8a6", "#a855f7",
];

const SIZE = 520;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 8;

function polarToCartesian(angleDeg: number, r: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) };
}

function sliceArcPath(startDeg: number, endDeg: number): string {
  const start = polarToCartesian(endDeg, RADIUS);
  const end = polarToCartesian(startDeg, RADIUS);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return [
    `M ${CENTER} ${CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

const SPIN_DURATION_MS = 5200;
const SAFETY_BUFFER_MS = 500;

export default function Wheel({ names, spinSeq, targetIndex, onResult, onSpinStart, onSpinEnd }: Props) {
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const pendingResultIndex = useRef<number | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animatingRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onSpinStartRef = useRef(onSpinStart);
  const onSpinEndRef = useRef(onSpinEnd);
  const namesRef = useRef(names);
  const targetIndexRef = useRef(targetIndex);
  const rotationRef = useRef(rotation);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onSpinStartRef.current = onSpinStart;
  }, [onSpinStart]);

  useEffect(() => {
    onSpinEndRef.current = onSpinEnd;
  }, [onSpinEnd]);

  useEffect(() => {
    namesRef.current = names;
  }, [names]);

  useEffect(() => {
    targetIndexRef.current = targetIndex;
  }, [targetIndex]);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const slices = useMemo(() => {
    const n = Math.max(names.length, 1);
    const sliceDeg = 360 / n;
    return names.map((name, i) => ({
      name,
      startDeg: i * sliceDeg,
      endDeg: (i + 1) * sliceDeg,
      color: PALETTE[i % PALETTE.length],
      centerDeg: i * sliceDeg + sliceDeg / 2,
    }));
  }, [names]);

  const finishSpin = useCallback(() => {
    if (!animatingRef.current) return;
    animatingRef.current = false;
    setAnimating(false);
    setRotation((r) => ((r % 360) + 360) % 360);
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    onSpinEndRef.current?.();
    const idx = pendingResultIndex.current;
    pendingResultIndex.current = null;
    if (idx !== null) onResultRef.current(idx);
  }, []);

  useEffect(() => {
    if (spinSeq === 0) return;

    // Force-reset any stuck animation state from previous spin
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    animatingRef.current = false;

    const currentNames = namesRef.current;
    const currentTarget = targetIndexRef.current;
    const currentRotation = rotationRef.current;

    if (currentNames.length === 0) return;

    const chosenIndex =
      currentTarget !== null &&
      currentTarget !== undefined &&
      currentTarget >= 0 &&
      currentTarget < currentNames.length
        ? currentTarget
        : Math.floor(Math.random() * currentNames.length);
    const sliceDeg = 360 / currentNames.length;
    const jitter = (Math.random() - 0.5) * sliceDeg * 0.7;
    const targetCenter = chosenIndex * sliceDeg + sliceDeg / 2 + jitter;

    const currentMod = ((currentRotation % 360) + 360) % 360;
    const desiredMod = (360 - targetCenter + 360) % 360;
    let delta = desiredMod - currentMod;
    if (delta < 0) delta += 360;
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const nextRotation = currentRotation + extraTurns * 360 + delta;

    pendingResultIndex.current = chosenIndex;
    animatingRef.current = true;
    setAnimating(true);
    onSpinStartRef.current?.();
    requestAnimationFrame(() => setRotation(nextRotation));

    safetyTimerRef.current = setTimeout(finishSpin, SPIN_DURATION_MS + SAFETY_BUFFER_MS);
  }, [spinSeq, finishSpin]);

  useEffect(() => {
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  function onTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== "transform") return;
    finishSpin();
  }

  if (names.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full border border-white/10 text-white/50"
        style={{ width: SIZE, height: SIZE }}
      >
        No eligible names
      </div>
    );
  }

  const labelRadius = RADIUS * 0.62;

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <div
        className="absolute left-1/2 z-10 -translate-x-1/2"
        style={{ top: -6 }}
        aria-hidden
      >
        <svg width="40" height="44" viewBox="0 0 40 44">
          <polygon points="20,44 4,4 36,4" fill="#fff" stroke="#0b1020" strokeWidth="2" />
        </svg>
      </div>

      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animating ? "transform 5.2s cubic-bezier(0.12, 0.0, 0.08, 1)" : "none",
          pointerEvents: "none",
        }}
        onTransitionEnd={onTransitionEnd}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 4} fill="#0b1020" />
        {slices.map((s, i) => (
          <g key={i}>
            <path d={sliceArcPath(s.startDeg, s.endDeg)} fill={s.color} stroke="#0b1020" strokeWidth="2" />
            <g
              transform={`rotate(${s.centerDeg} ${CENTER} ${CENTER}) translate(${CENTER} ${CENTER - labelRadius})`}
            >
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={Math.max(11, Math.min(22, 320 / Math.max(names.length, 4)))}
                fontWeight="700"
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 2 }}
              >
                {truncate(s.name, names.length)}
              </text>
            </g>
          </g>
        ))}
        <circle cx={CENTER} cy={CENTER} r={28} fill="#fff" />
        <circle cx={CENTER} cy={CENTER} r={10} fill="#0b1020" />
      </svg>
    </div>
  );
}

function truncate(s: string, n: number): string {
  const max = n <= 6 ? 22 : n <= 10 ? 16 : n <= 16 ? 12 : 9;
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
