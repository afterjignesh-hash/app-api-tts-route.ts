"use client";
import { useRef, useState } from "react";

type Voice = "jarvis" | "megatron";

export default function VoicePanel() {
  const [voice, setVoice] = useState<Voice>("jarvis");
  const [text, setText] = useState("Systems online. Awaiting your command.");
  const [status, setStatus] = useState<"idle" | "loading" | "speaking" | "error">("idle");
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  async function speak() {
    if (!text.trim() || status === "loading" || status === "speaking") return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) throw new Error((await res.text()) || `Request failed (${res.status})`);
      const audio = new Audio(URL.createObjectURL(await res.blob()));

      const ctx = (ctxRef.current ??= new AudioContext());
      await ctx.resume();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        setLevel(avg);
        window.dispatchEvent(new CustomEvent("ultron:level", { detail: avg }));
        rafRef.current = requestAnimationFrame(tick);
      };
      audio.onended = () => {
        cancelAnimationFrame(rafRef.current);
        setLevel(0);
        window.dispatchEvent(new CustomEvent("ultron:level", { detail: 0 }));
        setStatus("idle");
      };
      setStatus("speaking");
      tick();
      await audio.play();
    } catch (e) {
      cancelAnimationFrame(rafRef.current);
      setLevel(0);
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  }

  const accent = "#38e8ff";
  const busy = status === "loading" || status === "speaking";

  return (
    <div
      style={{
        position: "fixed", left: 16, bottom: 16, zIndex: 50, width: "min(340px, calc(100vw - 32px))",
        padding: 14, borderRadius: 10, background: "rgba(4,14,22,0.78)", backdropFilter: "blur(10px)",
        border: `1px solid ${accent}55`, color: "#cfefff", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13,
        boxShadow: `0 0 ${12 + level * 40}px ${accent}${Math.round(30 + level * 120).toString(16).padStart(2, "0")}`,
      }}
    >
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["jarvis", "megatron"] as Voice[]).map((v) => (
          <button
            key={v}
            onClick={() => setVoice(v)}
            aria-pressed={voice === v}
            style={{
              flex: 1, padding: "6px 0", borderRadius: 6, cursor: "pointer", color: voice === v ? "#031018" : accent,
              background: voice === v ? accent : "transparent", border: `1px solid ${accent}88`, textTransform: "capitalize",
            }}
          >
            {v}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        aria-label="Text to speak"
        style={{
          width: "100%", resize: "none", boxSizing: "border-box", padding: 8, borderRadius: 6,
          background: "rgba(0,0,0,0.35)", color: "inherit", border: `1px solid ${accent}33`, font: "inherit",
        }}
      />
      <button
        onClick={speak}
        disabled={busy}
        style={{
          marginTop: 8, width: "100%", padding: "8px 0", borderRadius: 6, cursor: busy ? "default" : "pointer",
          background: busy ? `${accent}33` : accent, color: busy ? accent : "#031018", border: "none", font: "inherit", fontWeight: 700,
        }}
      >
        {status === "loading" ? "Generating voice…" : status === "speaking" ? "Speaking…" : "Speak"}
      </button>
      {status === "error" && (
        <p role="alert" style={{ margin: "8px 0 0", color: "#ff8a8a", wordBreak: "break-word" }}>{error}</p>
      )}
    </div>
  );
                                   }
