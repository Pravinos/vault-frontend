"use client";

import Modal from "@/components/ui/Modal";

type NewConversationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function NewConversationDialog({
  isOpen,
  onClose,
  onConfirm,
}: NewConversationDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start a new conversation?">
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Your current chat will be deleted and can&apos;t be recovered.
        </p>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-500 sm:w-auto sm:text-sm"
          >
            Start New Conversation
          </button>
        </div>
      </div>
    </Modal>
  );
}
