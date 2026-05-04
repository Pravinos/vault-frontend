"use client";

import { useMemo, useState } from "react";

import Modal from "@/components/ui/Modal";
import { createAccount, updateAccount } from "@/lib/api";
import type { Account, AccountType, CreateAccountPayload } from "@/types";

type AccountFormProps = {
  account?: Account;
  onSuccess: (message: string) => void;
  onClose: () => void;
};

type FormErrors = {
  name?: string;
  openingBalance?: string;
};

export default function AccountForm({ account, onSuccess, onClose }: AccountFormProps) {
  const isEditMode = useMemo(() => Boolean(account), [account]);

  const [name, setName] = useState<string>(account?.name ?? "");
  const [accountType, setAccountType] = useState<AccountType>(
    account?.accountType ?? "CHECKING"
  );
  const [openingBalance, setOpeningBalance] = useState<string>(
    account?.openingBalance.toString() ?? "0"
  );
  const [platform, setPlatform] = useState<string>(account?.platform ?? "");
  const [instrument, setInstrument] = useState<string>(account?.instrument ?? "");
  const [assetType, setAssetType] = useState<string>(account?.assetType ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Name is required";
    }

    if (!isEditMode) {
      const parsedOpeningBalance = Number(openingBalance);
      if (!Number.isFinite(parsedOpeningBalance) || parsedOpeningBalance < 0) {
        nextErrors.openingBalance = "Opening balance must be 0 or greater";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const payload: CreateAccountPayload = {
      name: name.trim(),
      accountType,
      openingBalance: isEditMode ? (account?.openingBalance ?? 0) : Number(openingBalance),
      platform: accountType === "INVESTMENT" && platform.trim() ? platform.trim() : undefined,
      instrument: accountType === "INVESTMENT" && instrument.trim() ? instrument.trim() : undefined,
      assetType: accountType === "INVESTMENT" && assetType.trim() ? assetType.trim() : undefined,
    };

    try {
      if (account) {
        await updateAccount(account.id, payload);
        onSuccess("Account updated");
      } else {
        await createAccount(payload);
        onSuccess("Account created");
      }

      onClose();
    } catch (error) {
      setFormError("Unable to save account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={isEditMode ? "Edit Account" : "Add Account"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {formError}
          </p>
        ) : null}

        <div>
          <label className="text-sm text-gray-200">Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
          {errors.name ? <p className="mt-1 text-xs text-red-400">{errors.name}</p> : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Account Type</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {(["CHECKING", "SAVINGS", "INVESTMENT"] as AccountType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccountType(type)}
                className={
                  accountType === type
                    ? "rounded-lg border border-emerald-500 bg-emerald-500/15 px-3 py-2 text-base font-semibold text-emerald-300 sm:text-xs"
                    : "rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-300 hover:border-gray-500 sm:text-xs"
                }
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {!isEditMode ? (
          <div>
            <label className="text-sm text-gray-200">Opening Balance</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
              required
            />
            {errors.openingBalance ? (
              <p className="mt-1 text-xs text-red-400">{errors.openingBalance}</p>
            ) : null}
          </div>
        ) : null}

        {accountType === "INVESTMENT" ? (
          <>
            <div>
              <label className="text-sm text-gray-200">Platform</label>
              <input
                type="text"
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm text-gray-200">Instrument</label>
              <input
                type="text"
                value={instrument}
                onChange={(event) => setInstrument(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-sm text-gray-200">Asset Type</label>
              <input
                type="text"
                value={assetType}
                onChange={(event) => setAssetType(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
                placeholder="Optional"
              />
            </div>
          </>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
