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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0d1520] py-10">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-teal-500/8 blur-[140px]" />
      <div className="pointer-events-none absolute right-[20%] top-[40%] h-[300px] w-[300px] rounded-full bg-emerald-400/5 blur-[100px]" />

      <div className={`relative z-10 mx-4 w-full ${widthClass} space-y-4`}>
        {banner}
        {children}
        {footer}
      </div>
    </div>
  );
}
