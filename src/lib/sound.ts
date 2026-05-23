"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LS_MUTED = "wheel:muted";

const SPIN_URL = "/sounds/spin.mp3";
const REVEAL_URL = "/sounds/reveal.mp3";

const SPIN_VOLUME = 0.55;
const REVEAL_VOLUME = 0.75;

export function useSoundManager() {
  const [muted, setMuted] = useState(false);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    try {
      const stored = localStorage.getItem(LS_MUTED);
      if (stored === "1") setMuted(true);
    } catch {}

    if (typeof window !== "undefined") {
      const spin = new Audio(SPIN_URL);
      spin.preload = "auto";
      spin.volume = SPIN_VOLUME;
      spinAudioRef.current = spin;

      const reveal = new Audio(REVEAL_URL);
      reveal.preload = "auto";
      reveal.volume = REVEAL_VOLUME;
      revealAudioRef.current = reveal;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_MUTED, muted ? "1" : "0");
    } catch {}
  }, [muted]);

  const playSpin = useCallback(() => {
    if (muted) return;
    const a = spinAudioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}
  }, [muted]);

  const stopSpin = useCallback(() => {
    const a = spinAudioRef.current;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  }, []);

  const playReveal = useCallback(() => {
    if (muted) return;
    const a = revealAudioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m) {
        try {
          spinAudioRef.current?.pause();
          if (spinAudioRef.current) spinAudioRef.current.currentTime = 0;
          revealAudioRef.current?.pause();
        } catch {}
      }
      return !m;
    });
  }, []);

  return { muted, playSpin, stopSpin, playReveal, toggleMute };
}
