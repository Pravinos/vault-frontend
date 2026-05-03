import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-900/60 ring-1 ring-emerald-700/50">
        <Bot className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
