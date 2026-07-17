import { ReactNode } from "react";

type AuthPageShellProps = {
  children: ReactNode;
  banner?: ReactNode;
  footer?: ReactNode;
  maxWidth?: "md" | "lg";
};

export function AuthErrorAlert({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      <span>⚠</span>
      <span>{message}</span>
    </div>
  );
}

export default function AuthPageShell({
  children,
  banner,
  footer,
  maxWidth = "md",
}: AuthPageShellProps) {
  const widthClass = maxWidth === "lg" ? "max-w-lg" : "max-w-md";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-app-bg py-10">
      <div className="pointer-events-none absolute left-1/2 top-[-15%] h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-emerald-500/8 blur-[130px]" />

      <div className={`relative z-10 mx-4 w-full ${widthClass} space-y-4`}>
        {banner}
        {children}
        {footer}
      </div>
    </div>
  );
}
