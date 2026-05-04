import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center">
        <Bot className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="flex items-center gap-1 px-1 py-1">
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
