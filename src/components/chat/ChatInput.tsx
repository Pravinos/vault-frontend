"use client";

import { useEffect, useRef } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeToFit = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  };

  useEffect(() => {
    resizeToFit();
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    onChange("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Message Vault AI..."
          rows={1}
          className="input-interactive flex-1 resize-none rounded-xl border border-border bg-surface-sunken px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none disabled:opacity-50 overflow-y-auto"
          style={{ maxHeight: "6rem" }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="btn-interactive flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-gray-600">
        Enter to send · Shift + Enter for new line
      </p>
    </div>
  );
}
