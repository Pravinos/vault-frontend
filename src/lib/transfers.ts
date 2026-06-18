import type { Transfer } from '@/types'

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
