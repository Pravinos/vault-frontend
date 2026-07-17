import { RefreshCw } from "lucide-react";

interface ConnectivityIndicatorProps {
  status: "loading" | "connected" | "disconnected";
  onRetry?: () => void;
}

export default function ConnectivityIndicator({ status, onRetry }: ConnectivityIndicatorProps) {
  if (status === "loading") {
    return (
      <span className="flex items-center gap-1.5 text-gray-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-gray-500" />
        <span className="text-xs">Checking…</span>
      </span>
    );
  }

  const dotClass = status === "connected" ? "bg-emerald-400" : "bg-negative";
  const textClass = status === "connected" ? "text-emerald-400" : "text-negative";
  const title =
    status === "connected"
      ? "API key is valid and responding"
      : "Cannot reach provider; check backend config";

  return (
    <span className="flex items-center gap-2">
      <span title={title} className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <span className={`text-xs ${textClass}`}>
          {status === "connected" ? "Connected" : "Disconnected"}
        </span>
      </span>
      {status === "disconnected" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-interactive flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-200"
          aria-label="Retry provider connection"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </span>
  );
}
