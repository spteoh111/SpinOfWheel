"use client";

import { useEffect, useRef, useState } from "react";
import type { Entry } from "@/lib/sheet";
import {
  extractYouTubeId,
  extractYouTubeStartSeconds,
  isYouTubeUrl,
} from "@/lib/youtube";

type Props = {
  entry: Entry | null;
  onClose: () => void;
  onOpen?: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, opts: unknown) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
    __ytApiPromise?: Promise<void>;
  }
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (sec: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
  getVideoData?: () => { title?: string };
};

function readPlayerTitle(player?: YTPlayer): string | null {
  const title = player?.getVideoData?.().title?.trim();
  return title || null;
}

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (window.__ytApiPromise) return window.__ytApiPromise;

  window.__ytApiPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) try { prev(); } catch {}
      resolve();
    };
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return window.__ytApiPromise;
}

export default function ResultModal({
  entry,
  onClose,
  onOpen,
}: Props) {
  const open = entry !== null;
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    if (entry) onOpenRef.current?.();
  }, [entry]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);

  const videoId = entry && isYouTubeUrl(entry.contents)
    ? extractYouTubeId(entry.contents)
    : null;
  const startSeconds = entry && isYouTubeUrl(entry.contents)
    ? extractYouTubeStartSeconds(entry.contents)
    : 0;
  const youtubeUrl = videoId && entry ? entry.contents : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!youtubeUrl) {
      setVideoTitle(null);
      return;
    }

    let cancelled = false;
    setVideoTitle(null);

    fetch(`/api/youtube-title?url=${encodeURIComponent(youtubeUrl)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { title?: string | null } | null) => {
        if (!cancelled && data?.title) {
          setVideoTitle(data.title);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [youtubeUrl]);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let cancelled = false;
    setPlayerReady(false);
    setPlayerError(null);

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: startSeconds,
        },
        events: {
          onReady: (event: { target?: YTPlayer }) => {
            if (cancelled) return;
            setPlayerReady(true);
            const title = readPlayerTitle(event.target);
            if (title) setVideoTitle(title);
            event.target?.playVideo();
          },
          onError: (event: { data?: number; target?: YTPlayer }) => {
            if (cancelled) return;
            const blocked = event.data === 101 || event.data === 150;
            const title =
              readPlayerTitle(event.target) ?? readPlayerTitle(playerRef.current ?? undefined);
            if (title) setVideoTitle(title);
            try {
              playerRef.current?.destroy();
            } catch {}
            playerRef.current = null;
            setPlayerReady(false);
            setPlayerError(
              blocked
                ? "This video cannot be embedded here. Open it on YouTube to watch it."
                : "This video could not be played here. Open it on YouTube to watch it."
            );
          },
        },
      }) as YTPlayer;
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
      setPlayerReady(false);
      setPlayerError(null);
    };
  }, [videoId, startSeconds]);

  if (!open || !entry) return null;

  const handlePlay = () => playerRef.current?.playVideo();
  const handleReplay = () => {
    playerRef.current?.seekTo(startSeconds, true);
    playerRef.current?.playVideo();
  };
  const handleStop = () => playerRef.current?.pauseVideo();
  const fallbackTitle = `${entry.name}: ${videoTitle ?? "YouTube video"}`;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-dvh w-full flex-col overflow-hidden bg-[#070b1d] text-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-8">
          <div>
            <div className="text-sm uppercase tracking-widest text-white/50">Winner</div>
            <h2 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
              {entry.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {videoId ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-8 sm:pb-6">
            {playerError ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-8 text-center">
                <div>
                  <p className="text-2xl font-bold text-amber-100 sm:text-3xl">
                    {fallbackTitle}
                  </p>
                </div>
                {youtubeUrl && (
                  <ControlLink href={youtubeUrl}>
                    Open on YouTube
                  </ControlLink>
                )}
              </div>
            ) : (
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black shadow-2xl [&>iframe]:h-full [&>iframe]:w-full">
                <div ref={containerRef} className="absolute inset-0" />
              </div>
            )}
            <div className="mt-4 flex shrink-0 flex-wrap items-center justify-center gap-3">
              {!playerError && (
                <>
                  <ControlButton onClick={handlePlay} disabled={!playerReady}>
                    ▶ Play
                  </ControlButton>
                  <ControlButton onClick={handleReplay} disabled={!playerReady}>
                    ↺ Replay
                  </ControlButton>
                  <ControlButton onClick={handleStop} disabled={!playerReady}>
                    ■ Stop
                  </ControlButton>
                </>
              )}
              <ControlButton onClick={onClose} variant="primary">
                ✕ Close
              </ControlButton>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-8 sm:pb-6">
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.03))] p-6 text-center shadow-2xl sm:p-12">
              {entry.contents ? (
                <p className="max-w-6xl whitespace-pre-wrap text-4xl font-extrabold leading-tight text-white sm:text-6xl lg:text-7xl">
                  {entry.contents}
                </p>
              ) : (
                <p className="text-6xl font-extrabold uppercase tracking-widest text-white/70 sm:text-8xl">
                  Empty
                </p>
              )}
            </div>
            <div className="mt-4 flex shrink-0 justify-center">
              <ControlButton onClick={onClose} variant="primary">
                ✕ Close
              </ControlButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ControlLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  const base =
    "rounded-lg px-5 py-2.5 text-sm font-semibold transition";
  const styles = "bg-red-500 text-white hover:bg-red-400";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${styles}`}
    >
      {children}
    </a>
  );
}

function ControlButton({
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
  const base =
    "rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-white text-[#0b1020] hover:bg-white/90"
      : "bg-white/10 text-white hover:bg-white/20";
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}
