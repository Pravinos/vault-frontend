"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { getAccountAccent, getAccountBadgeClasses } from "@/lib/accountColors";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useModalDismiss } from "@/lib/hooks/useModalDismiss";
import { linkAccountToGoal, unlinkAccountFromGoal } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { Goal } from "@/types";

type Props = {
  goal: Goal;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function ManageAccountsModal({ goal, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const { isOpen, requestClose } = useModalDismiss();
  const { data: accounts = [], isLoading } = useAccounts();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const linkedIds = new Set(goal.linkedAccounts.map((a) => a.id));

  const handleLink = async (accountId: string) => {
    setLoadingId(accountId);
    try {
      await linkAccountToGoal(goal.id, accountId);
      await qc.invalidateQueries({ queryKey: queryKeys.goals });
      onSuccess?.();
    } catch (err) {
      // swallow — caller shows toast
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleUnlink = async (accountId: string) => {
    setLoadingId(accountId);
    try {
      await unlinkAccountFromGoal(goal.id, accountId);
      await qc.invalidateQueries({ queryKey: queryKeys.goals });
      onSuccess?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      onClosed={onClose}
      title={`Manage accounts for ${goal.name}`}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-300">Linked accounts</p>
          {goal.linkedAccounts.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">No accounts linked</p>
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
                    <div className="text-sm text-gray-300">{a.calculatedBalance.toFixed(2)}</div>
                    <button
                      type="button"
                      disabled={loadingId === a.id}
                      onClick={() => handleUnlink(a.id)}
                      className="rounded-md px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      {loadingId === a.id ? "..." : "Unlink"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-300">Other accounts</p>
          <div className="mt-2 space-y-2">
            {isLoading
              ? <p className="text-sm text-gray-400">Loading accounts...</p>
              : accounts.filter(a => !linkedIds.has(a.id)).map((a) => (
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
                    <div className="text-sm text-gray-300">{a.calculatedBalance?.toFixed?.(2) ?? "0.00"}</div>
                    <button
                      type="button"
                      disabled={loadingId === a.id}
                      onClick={() => handleLink(a.id)}
                      className="rounded-md px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10"
                    >
                      {loadingId === a.id ? "..." : "Link"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={requestClose}
            className="btn-interactive rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
