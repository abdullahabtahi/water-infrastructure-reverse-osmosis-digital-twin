'use client';

import { useState, useRef, useEffect } from "react";
import { Activity, BotMessageSquare, Send } from "lucide-react";
import { askAssistant, type AssistantReply } from "@/lib/api";

type Msg = { role: "user" | "assistant"; text: string; mode?: AssistantReply["mode"] };

const SUGGESTIONS = [
  "Clean now or wait?",
  "Why is this unit fouling?",
  "What's driving the energy cost?",
];

export function AIAssistantPanel({ unitId, date }: { unitId?: string | null; date?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    const reply = await askAssistant(q, { date, unit: unitId ?? undefined });
    setMessages((m) => [...m, { role: "assistant", text: reply.answer, mode: reply.mode }]);
    setLoading(false);
  }

  return (
    <section className="flex flex-col gap-4 mt-auto pt-8">
      <div className="rounded-[20px] border border-border/20 bg-white p-6 flex flex-col gap-5 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-full bg-primary text-white text-[9px] uppercase font-bold tracking-widest text-center py-1 flex items-center justify-center gap-1">
          <Activity className="size-3" /> Advise-only diagnostics
        </div>
        <div className="flex items-center gap-2 text-foreground font-extrabold text-sm uppercase tracking-widest mt-4">
          <BotMessageSquare className="size-4" />
          AI Assistant
        </div>

        {messages.length === 0 ? (
          <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
            Every answer cites the reading or model behind it. Ask me to explain the fouling
            mechanism, weigh clean-now vs wait, or break down the energy cost.
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[92%]"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "rounded-[12px] bg-primary text-white text-[12px] font-semibold px-3.5 py-2.5"
                      : "rounded-[12px] bg-[#F9F9F8] border border-border/40 text-[12px] text-foreground font-medium px-3.5 py-2.5 whitespace-pre-wrap leading-relaxed"
                  }
                >
                  {m.text}
                </div>
                {m.role === "assistant" && m.mode && (
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-bold mt-1 pl-1">
                    {m.mode === "gemini" ? "Gemini" : "Deterministic"} · advise-only
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="self-start text-[11px] text-muted-foreground font-semibold pl-1 animate-pulse">
                Analyzing the evidence…
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="text-left text-[12px] font-semibold text-foreground bg-[#F9F9F8] border border-border/40 rounded-[12px] px-4 py-2.5 hover:border-primary/40 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="relative w-full"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={unitId ? `Ask about ${unitId}…` : "Ask a question…"}
            disabled={loading}
            className="w-full h-12 rounded-[12px] bg-[#F9F9F8] border border-border/40 text-[12px] text-foreground font-bold px-5 pr-12 outline-none focus:border-primary/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
