"use client";

import { useRef } from "react";

function slugifyWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function WordAudioButton({ word }: { word: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const src = `/audio/words/${slugifyWord(word)}.mp3`;

  function play() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.error("Audio Error:", err);
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={play}
        aria-label={`Play pronunciation for ${word}`}
        title={`Play pronunciation for ${word}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:text-accent"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0"
        >
          <path d="M11 5 6 9H2v6h4l5 4z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      </button>

      <audio
        ref={audioRef}
        preload="auto"
        className="hidden"
      >
        <source src={src} type="audio/mpeg" />
      </audio>
    </>
  );
}