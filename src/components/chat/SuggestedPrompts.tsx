"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  GitCompare,
  Lightbulb,
  TrendingUp,
  Wallet,
} from "lucide-react";

type SuggestedPrompt = {
  icon: LucideIcon;
  text: string;
  featured?: boolean;
};

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    icon: TrendingUp,
    text: "What spending jumped the most vs last month, and which transactions caused it?",
    featured: true,
  },
  {
    icon: GitCompare,
    text: "Which budget categories am I over on, and how does this month compare to last?",
  },
  {
    icon: Wallet,
    text: "Am I net positive or negative on cash flow this month—and what's driving the gap?",
  },
  {
    icon: BarChart3,
    text: "Which expense categories are trending up and quietly eating my budget?",
  },
  {
    icon: Lightbulb,
    text: "Based on my real spending, what 3 cuts would save ~15% without touching essentials?",
  },
];

const PROMPT_BUTTON_CLASS =
  "flex items-start gap-2 rounded-xl px-4 py-3 text-left text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const ICON_CLASS = "mt-0.5 h-4 w-4 flex-shrink-0 stroke-[1.5]";

type SuggestedPromptsProps = {
  disabled?: boolean;
  onPromptClick: (prompt: string) => void;
};

export default function SuggestedPrompts({
  disabled = false,
  onPromptClick,
}: SuggestedPromptsProps) {
  return (
    <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
      {SUGGESTED_PROMPTS.map((prompt) => {
        const Icon = prompt.icon;
        const isFeatured = prompt.featured;

        return (
          <button
            key={prompt.text}
            type="button"
            disabled={disabled}
            onClick={() => onPromptClick(prompt.text)}
            className={
              isFeatured
                ? `col-span-full border-[1px] border-[rgba(29,158,117,0.6)] bg-[rgba(29,158,117,0.08)] text-white ${PROMPT_BUTTON_CLASS}`
                : `border border-border bg-surface-sunken text-gray-200 hover:border-emerald-700/60 hover:bg-[#0f2430] hover:text-white ${PROMPT_BUTTON_CLASS}`
            }
          >
            <Icon
              className={`${ICON_CLASS} ${isFeatured ? "text-emerald-400" : "text-gray-400"}`}
            />
            <span className="leading-snug">{prompt.text}</span>
          </button>
        );
      })}
    </div>
  );
}
