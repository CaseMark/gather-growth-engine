"use client";

import { useState, useRef, useEffect } from "react";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Step = { stepNumber: number; subject: string; body: string; delayDays: number };

type ChatPanelProps = {
  context: { productSummary?: string; icp?: string; steps?: Step[] };
  onEdits?: (edits: { icp?: string | null; steps?: Step[] | null }) => void;
  className?: string;
};

export function ChatPanel({ context, onEdits, className = "" }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages,
          context,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error || "Something went wrong."}` }]);
        setLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Done." }]);

      if (data.edits && onEdits) onEdits(data.edits);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }

    setLoading(false);
  };

  return (
    <div className={`flex flex-col h-full border-l border-zinc-800 bg-zinc-950 ${className}`}>
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h3 className="text-sm font-medium text-zinc-200">Assistant</h3>
        <span className="text-xs text-zinc-500">Ask to tweak copy, ICP, or steps</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-sm text-zinc-500 space-y-2">
            <p>Chat with the agent to refine your playbook.</p>
            <p className="text-xs">Try: &quot;Make step 2 shorter&quot;, &quot;Add more urgency to the first email&quot;, &quot;Focus the ICP on SMB&quot;</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-emerald-900/30 text-zinc-100"
                  : "bg-zinc-800/80 text-zinc-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-sm bg-zinc-800/80 text-zinc-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-800 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for changes..."
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
