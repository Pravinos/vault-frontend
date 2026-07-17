"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { getAccountAccent, getAccountBadgeClasses } from "@/lib/accountColors";
import { useFormatCurrency } from "@/lib/currencyContext";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useModalDismiss } from "@/lib/hooks/useModalDismiss";
import { linkAccountToGoal, unlinkAccountFromGoal } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { Goal } from "@/types";

type Props = {
  goal: Goal;
  onClose: () => void;
  onUpdated?: () => void;
};

export default function ManageAccountsModal({ goal, onClose, onUpdated }: Props) {
  const formatCurrency = useFormatCurrency();
  const qc = useQueryClient();
  const { isOpen, requestClose } = useModalDismiss();
  const { data: accounts = [], isLoading } = useAccounts();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );

  const linkedIds = new Set(goal.linkedAccounts.map((a) => a.id));
  const unlinkedAccounts = accounts.filter((a) => !linkedIds.has(a.id));

  const handleLink = async (accountId: string) => {
    setLoadingId(accountId);
    try {
      await linkAccountToGoal(goal.id, accountId);
      await qc.invalidateQueries({ queryKey: queryKeys.goals });
      onUpdated?.();
      setToast({ message: "Account linked", type: "success" });
    } catch {
      setToast({ message: "Unable to link account.", type: "error" });
    } finally {
      setLoadingId(null);
    }
  };

  const handleUnlink = async (accountId: string) => {
    setLoadingId(accountId);
    try {
      await unlinkAccountFromGoal(goal.id, accountId);
      await qc.invalidateQueries({ queryKey: queryKeys.goals });
      onUpdated?.();
      setToast({ message: "Account unlinked", type: "success" });
    } catch {
      setToast({ message: "Unable to unlink account.", type: "error" });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={requestClose}
        onClosed={onClose}
        title={`Manage accounts — ${goal.name}`}
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Linked accounts
            </p>
            {goal.linkedAccounts.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-sm text-gray-500">
                No accounts linked yet
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {goal.linkedAccounts.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between rounded-lg border border-border border-l-4 ${getAccountAccent(a.accountType)} bg-surface-raised/60 px-3 py-2`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm text-gray-200">{a.name}</span>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAccountBadgeClasses(a.accountType)}`}
                      >
                        {a.accountType}
                      </span>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-sm text-gray-300">
                        {formatCurrency(a.calculatedBalance)}
                      </span>
                      <button
                        type="button"
                        disabled={loadingId === a.id}
                        onClick={() => void handleUnlink(a.id)}
                        className="btn-interactive rounded-md px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        {loadingId === a.id ? "…" : "Unlink"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Available accounts
            </p>
            <div className="mt-2 space-y-2">
              {isLoading ? (
                <p className="text-sm text-gray-500">Loading accounts…</p>
              ) : unlinkedAccounts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-sm text-gray-500">
                  All accounts are already linked
                </p>
              ) : (
                unlinkedAccounts.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between rounded-lg border border-border border-l-4 ${getAccountAccent(a.accountType)} bg-surface-raised/60 px-3 py-2`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm text-gray-200">{a.name}</span>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAccountBadgeClasses(a.accountType)}`}
                      >
                        {a.accountType}
                      </span>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-sm text-gray-300">
                        {formatCurrency(a.calculatedBalance ?? 0)}
                      </span>
                      <button
                        type="button"
                        disabled={loadingId === a.id}
                        onClick={() => void handleLink(a.id)}
                        className="btn-interactive rounded-md px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                      >
                        {loadingId === a.id ? "…" : "Link"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={requestClose}
              className="btn-interactive rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
