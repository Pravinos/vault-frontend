"use client";

import { useCallback, useEffect, useRef, useState, type AnimationEvent } from "react";
import { ChevronDown, MessageSquarePlus } from "lucide-react";
import { sendChatMessage } from "@/lib/api";
import type { ChatMessage } from "@/types";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import SuggestedPrompts from "@/components/chat/SuggestedPrompts";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { useAiSettings } from "@/lib/hooks/useAiSettings";
import NewConversationDialog from "@/components/chat/NewConversationDialog";
import ProviderBadge from "@/components/ui/ProviderBadge";
import InfoBanner from "@/components/ui/InfoBanner";

const SCROLL_THRESHOLD = 120;

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [vaultIconPulse, setVaultIconPulse] = useState(false);
  const [showHistoryNotice, setShowHistoryNotice] = useState(true);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);

  const conversationIdRef = useRef(crypto.randomUUID());
  const sendingRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const mountedRef = useRef(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { data: aiConfig } = useAiSettings();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages, isTyping, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distFromBottom <= SCROLL_THRESHOLD;
    setShowScrollBtn((prev) => {
      const show = distFromBottom > SCROLL_THRESHOLD;
      return prev === show ? prev : show;
    });
  };

  const handleSend = async (content: string) => {
    if (sendingRef.current) return;

    const conversationId = conversationIdRef.current;
    sendingRef.current = true;
    shouldAutoScrollRef.current = true;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await sendChatMessage({
        message: content,
        conversationId,
      });

      if (!mountedRef.current || conversationIdRef.current !== conversationId) return;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.reply,
        provider: response.provider,
        model: response.model,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      if (!mountedRef.current || conversationIdRef.current !== conversationId) return;

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (conversationIdRef.current === conversationId) {
        sendingRef.current = false;
        setIsTyping(false);
      }
    }
  };

  const resetConversation = () => {
    conversationIdRef.current = crypto.randomUUID();
    sendingRef.current = false;
    shouldAutoScrollRef.current = true;
    setMessages([]);
    setInputValue("");
    setIsTyping(false);
    scrollToBottom("auto");
  };

  const handleNewConversation = () => {
    if (messages.length > 0) {
      setShowNewConversationDialog(true);
      return;
    }
    resetConversation();
  };

  const handleConfirmNewConversation = () => {
    setShowNewConversationDialog(false);
    resetConversation();
  };

  const handlePromptClick = (prompt: string) => {
    handleSend(prompt);
  };

  const onVaultEntranceEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.animationName === "vaultIconEntrance") {
      setVaultIconPulse(true);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Chat</h1>
        <button
          type="button"
          onClick={handleNewConversation}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-base text-gray-300 transition-colors hover:border-gray-500 hover:text-white sm:w-auto sm:text-sm"
          title="New conversation"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New conversation
        </button>
      </div>

      {showHistoryNotice ? (
        <InfoBanner
          message="Chat history isn't saved yet — starting a new conversation will clear this one."
          onDismiss={() => setShowHistoryNotice(false)}
        />
      ) : null}

      <div className="relative flex h-[70dvh] min-h-[520px] flex-col overflow-hidden rounded-2xl bg-[#1a2332]">
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <div>
              <p className="text-lg font-semibold text-white">Vault AI</p>
              <p className="mt-1 text-sm text-gray-400">
                What do you want to know about your finances?
              </p>
            </div>

            {messages.length === 0 ? (
              <div className="flex flex-col items-center pb-4 pt-6 text-center">
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900/40 ring-2 ring-emerald-700/40 ${
                    vaultIconPulse ? "vault-icon-pulse" : "vault-icon-entrance"
                  }`}
                  onAnimationEnd={onVaultEntranceEnd}
                >
                  <span className="text-2xl">🤖</span>
                </div>
                <SuggestedPrompts
                  disabled={isTyping}
                  onPromptClick={handlePromptClick}
                />
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

        {showScrollBtn && (
          <div className="pointer-events-none absolute bottom-24 right-6 z-10">
            <button
              type="button"
              onClick={() => {
                shouldAutoScrollRef.current = true;
                scrollToBottom();
              }}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 bg-[#0f1923] text-gray-300 shadow-lg transition-all hover:text-white"
              aria-label="Scroll to bottom"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="sticky bottom-0 z-10 mx-auto w-full max-w-2xl flex-shrink-0">
          <div className="px-4 pb-3">
            <div className="flex items-center justify-end">
              {aiConfig?.chat?.provider && (
                <ProviderBadge
                  provider={aiConfig.chat.provider}
                  model={aiConfig.chat.model}
                  variant="subtle"
                />
              )}
            </div>
          </div>
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            disabled={isTyping}
          />
        </div>
      </div>

      <NewConversationDialog
        isOpen={showNewConversationDialog}
        onClose={() => setShowNewConversationDialog(false)}
        onConfirm={handleConfirmNewConversation}
      />
    </div>
  );
}
