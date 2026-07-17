import type { Transfer } from '@/types'

export type TransferSummary = {
  count: number
  totalIn: number
  totalOut: number
  net: number
}

export function isRevertTransfer(transfer: Transfer): boolean {
  if (transfer.isRevert === true || transfer.isReversal === true) {
    return true
  }

  if (
    transfer.reversalOfTransferId ||
    transfer.revertedTransferId ||
    transfer.originalTransferId
  ) {
    return true
  }

  const transferType = transfer.transferType?.trim() ?? ''
  return transferType.length > 0 && /revert|reversal/i.test(transferType)
}

/** Sum in/out for an account, excluding reversal rows (original + revert would double-count). */
export function computeTransferSummary(
  transfers: Transfer[],
  accountName: string
): TransferSummary {
  let totalIn = 0
  let totalOut = 0
  let count = 0

  for (const transfer of transfers) {
    if (isRevertTransfer(transfer)) {
      continue
    }

    count += 1

    if (transfer.toAccountName === accountName) {
      totalIn += transfer.amount
    }
    if (transfer.fromAccountName === accountName) {
      totalOut += transfer.amount
    }
  }

  return { count, totalIn, totalOut, net: totalIn - totalOut }
}
