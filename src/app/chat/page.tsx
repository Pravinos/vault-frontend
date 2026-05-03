"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, MessageSquarePlus } from "lucide-react";
import { sendChatMessage } from "@/lib/api";
import type { ChatMessage } from "@/types";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import TypingIndicator from "@/components/chat/TypingIndicator";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SUGGESTED_PROMPTS = [
  { emoji: "💸", text: "How much did I spend this month?" },
  { emoji: "📊", text: "Show my spending breakdown by category" },
  { emoji: "🎯", text: "How are my goals progressing?" },
  { emoji: "📈", text: "How is my Revolut investment performing?" },
  { emoji: "💰", text: "What's my net cash flow this month?" },
  { emoji: "🔍", text: "What's my top expense category?" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const conversationIdRef = useRef<string>(generateUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  };

  const handleSend = async (content: string) => {
    const userMessage: ChatMessage = {
      id: generateUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await sendChatMessage({
        message: content,
        conversationId: conversationIdRef.current,
      });

      const assistantMessage: ChatMessage = {
        id: generateUUID(),
        role: "assistant",
        content: response.reply,
        provider: response.provider,
        model: response.model,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: generateUUID(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewConversation = () => {
    conversationIdRef.current = generateUUID();
    setMessages([]);
    setInputValue("");
    scrollToBottom("auto");
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
    window.requestAnimationFrame(() => {
      handleSend(prompt);
      setInputValue("");
    });
  };

  return (
    <div className="relative flex flex-col h-[calc(100dvh-4rem)] md:h-screen overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 min-h-0"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-semibold text-white">Vault AI</p>
              <p className="mt-1 text-sm text-gray-400">
                Ask about your finances, spending, goals...
              </p>
            </div>
            <button
              type="button"
              onClick={handleNewConversation}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
              title="New conversation"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New conversation
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="flex flex-col items-center pt-6 pb-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900/40 ring-2 ring-emerald-700/40 mb-4">
                <span className="text-2xl">🏦</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    type="button"
                    onClick={() => handlePromptClick(prompt.text)}
                    className="flex items-start gap-2 rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-3 text-left text-sm text-gray-200 transition-all hover:border-emerald-700/60 hover:bg-gray-800 hover:text-white active:scale-[0.98]"
                  >
                    <span className="mt-0.5 text-base leading-none">{prompt.emoji}</span>
                    <span className="leading-snug">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <div className="pointer-events-none absolute bottom-24 right-6 z-10 md:bottom-20">
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-gray-300 shadow-lg transition-all hover:bg-gray-700 hover:text-white"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="sticky bottom-0 z-10 mx-auto w-full max-w-2xl flex-shrink-0 bg-gray-950">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          disabled={isTyping}
        />
      </div>
    </div>
  );
}
