interface ConnectivityIndicatorProps {
  status: "idle" | "ok" | "error";
}

export default function ConnectivityIndicator({ status }: ConnectivityIndicatorProps) {
  if (status === "idle") return null;

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${
          status === "ok" ? "bg-emerald-400" : "bg-red-500"
        }`}
      />
      <span className={`text-xs ${status === "ok" ? "text-emerald-400" : "text-red-400"}`}>
        {status === "ok" ? "Connected" : "Not reachable"}
      </span>
    </span>
  );
}
