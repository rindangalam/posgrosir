import { useCallback, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export type SoundType = "click" | "input" | "success" | "remove";

export function useClickSound() {
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const lastPlayed = useRef<Record<string, number>>({});

  const play = useCallback((type: SoundType = "click") => {
    if (!soundEnabled) return;
    const now = Date.now();
    const key = type;
    if (now - (lastPlayed.current[key] ?? 0) < 50) return;
    lastPlayed.current[key] = now;

    switch (type) {
      case "click":
        playTone(800, 0.05, "sine", 0.12);
        break;
      case "input":
        playTone(600, 0.03, "sine", 0.08);
        break;
      case "success":
        playTone(523, 0.12, "sine", 0.15);
        setTimeout(() => playTone(659, 0.12, "sine", 0.15), 100);
        setTimeout(() => playTone(784, 0.2, "sine", 0.15), 200);
        break;
      case "remove":
        playTone(400, 0.08, "triangle", 0.15);
        break;
    }
  }, [soundEnabled]);

  return { play };
}
