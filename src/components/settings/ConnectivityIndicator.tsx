interface ConnectivityIndicatorProps {
  status: "loading" | "connected" | "disconnected";
}

export default function ConnectivityIndicator({ status }: ConnectivityIndicatorProps) {
  if (status === "loading") {
    return (
      <span className="flex items-center gap-1.5 text-gray-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-gray-500" />
        <span className="text-xs">Checking...</span>
      </span>
    );
  }

  const dotClass = status === "connected" ? "bg-emerald-400" : "bg-[#e05c5c]";
  const textClass = status === "connected" ? "text-emerald-400" : "text-[#e05c5c]";
  const title = status === "connected" ? "API key is valid and responding" : "Cannot reach provider; check backend config";

  return (
    <span className="flex flex-col items-end gap-1">
      <span title={title} className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <span className={`text-xs ${textClass}`}>
          {status === "connected" ? "Connected" : "Disconnected"}
        </span>
      </span>
    </span>
  );
}
