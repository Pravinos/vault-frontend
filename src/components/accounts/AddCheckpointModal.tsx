"use client";

import { useState } from "react";

import Modal from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { useCurrency } from "@/lib/currencyContext";
import { useAddCheckpoint } from "@/lib/hooks/useCheckpointMutations";
import { useModalDismiss } from "@/lib/hooks/useModalDismiss";

type AddCheckpointModalProps = {
  accountId: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function AddCheckpointModal({
  accountId,
  onSuccess,
  onClose,
}: AddCheckpointModalProps) {
  const { currency } = useCurrency();
  const { isOpen, requestClose } = useModalDismiss();
  const addCheckpointMutation = useAddCheckpoint(accountId);

  const [valueInput, setValueInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedValue = Number(valueInput);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setFormError("Checkpoint value must be greater than 0.");
      return;
    }

    setFormError(null);

    try {
      await addCheckpointMutation.mutateAsync({
        value: parsedValue,
        note: noteInput.trim() ? noteInput.trim() : undefined,
      });
      onSuccess();
      requestClose();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to add checkpoint."));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={requestClose} onClosed={onClose} title="Add Checkpoint">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {formError}
          </p>
        ) : null}

        <div>
          <label htmlFor="checkpoint-value" className="text-sm text-gray-200">
            Value ({currency})
          </label>
          <input
            id="checkpoint-value"
            type="number"
            min="0.01"
            step="0.01"
            value={valueInput}
            onChange={(event) => setValueInput(event.target.value)}
            className="input-interactive mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="checkpoint-note" className="text-sm text-gray-200">
            Note (optional)
          </label>
          <input
            id="checkpoint-note"
            type="text"
            value={noteInput}
            onChange={(event) => setNoteInput(event.target.value)}
            maxLength={255}
            className="input-interactive mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            placeholder="e.g. Monthly statement"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={requestClose}
            className="btn-interactive w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
            disabled={addCheckpointMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-interactive w-full rounded-lg bg-emerald-500 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
            disabled={addCheckpointMutation.isPending}
          >
            {addCheckpointMutation.isPending ? "Saving..." : "Add Checkpoint"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
