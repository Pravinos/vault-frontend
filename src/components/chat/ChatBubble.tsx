"use client";

import type { ReactNode } from "react";
import { AlertCircle, Bot } from "lucide-react";
import type { ChatMessage } from "@/types";
import { CURRENCY_OPTIONS } from "@/lib/currency";

interface ChatBubbleProps {
  message: ChatMessage;
}

const CURRENCY_SYMBOLS = [...new Set(CURRENCY_OPTIONS.map((option) => option.symbol))]
  .map((symbol) => symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

function createCurrencyAmountRegex(): RegExp {
  return new RegExp(
    `(?:${CURRENCY_SYMBOLS})\\s*\\d[\\d,]*(?:\\.\\d+)?|\\d[\\d,]*(?:\\.\\d+)?\\s*(?:${CURRENCY_SYMBOLS})`,
    "g",
  );
}

function boldCurrencyAmounts(text: string): ReactNode {
  const regex = createCurrencyAmountRegex();
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <strong key={k++} className="font-semibold text-white">
        {m[0]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 0 ? text : <>{parts}</>;
}

function renderInline(text: string): ReactNode {
  const regex = /\*\*(.*?)\*\*|`([^`]*)`/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<span key={k++}>{boldCurrencyAmounts(text.slice(last, m.index))}</span>);
    }
    if (m[1] !== undefined) {
      parts.push(
        <strong key={k++} className="font-semibold text-white">
          {m[1]}
        </strong>
      );
    } else {
      parts.push(
        <code
          key={k++}
          className="px-0.5 font-mono text-[11px] text-emerald-300"
        >
          {m[2]}
        </code>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(<span key={k++}>{boldCurrencyAmounts(text.slice(last))}</span>);
  }
  return <>{parts}</>;
}

function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const result: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      result.push(
        <ul key={key++} className="my-1 ml-4 list-disc space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    } else if (line.trim() === "") {
      if (result.length > 0) result.push(<div key={key++} className="h-1.5" />);
      i++;
    } else {
      result.push(
        <span key={key++} className="block">
          {renderInline(line)}
        </span>
      );
      i++;
    }
  }
  return <div className="space-y-0.5">{result}</div>;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.isError === true;

  return (
    <div className={`animate-list-item-enter flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}>
      <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {!isUser && (
          <div className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center">
            {isError ? (
              <AlertCircle className="h-4 w-4 text-red-400" />
            ) : (
              <Bot className="h-4 w-4 text-emerald-400" />
            )}
          </div>
        )}
        {isUser ? (
          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600 px-4 py-2.5 text-sm leading-relaxed break-words text-white sm:max-w-[70%]">
            {message.content}
          </div>
        ) : (
          <div
            className={`max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed break-words sm:max-w-[70%] ${
              isError
                ? "border border-red-500/30 bg-red-500/10 text-red-200"
                : "border border-border bg-surface-sunken text-gray-100"
            }`}
          >
            {renderMarkdown(message.content)}
          </div>
        )}
      </div>
      {!isUser && !isError && (message.provider || message.model) && (
        <span className="ml-9 text-xs text-gray-500">
          {[message.provider, message.model].filter(Boolean).join(" · ")}
        </span>
      )}
    </div>
  );
}
