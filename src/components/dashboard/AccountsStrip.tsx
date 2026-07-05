"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AccountCard from "@/components/accounts/AccountCard";
import {
  readDashboardAccountOrder,
  sortAccountsByDashboardOrder,
  writeDashboardAccountOrder,
} from "@/lib/dashboardAccountOrder";
import { DURATION_BASE, EASE_STANDARD_CSS, prefersReducedMotion } from "@/lib/motion";
import type { AccountDashboardData } from "@/types/dashboard";

const VISIBLE_ACCOUNT_LIMIT = 8;

interface AccountsStripProps {
  accounts: AccountDashboardData[];
}

interface SortableAccountItemProps {
  account: AccountDashboardData;
  index: number;
}

function SortableAccountItem({ account, index }: SortableAccountItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
  });

  const reducedMotion = prefersReducedMotion();
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition
      ? `${transition}, box-shadow ${DURATION_BASE}ms ${EASE_STANDARD_CSS}, transform ${DURATION_BASE}ms ${EASE_STANDARD_CSS}`
      : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative w-[220px] shrink-0 snap-start sm:w-64 ${
        isDragging
          ? reducedMotion
            ? "z-20 shadow-lg shadow-black/30"
            : "z-20 scale-[1.02] shadow-lg shadow-black/30"
          : "z-0"
      }`}
    >
      <button
        type="button"
        className={`absolute bottom-1.5 right-1.5 z-10 flex h-7 w-7 touch-manipulation items-center justify-center rounded-md text-gray-500 transition-opacity duration-150 hover:bg-white/5 hover:text-gray-300 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 active:cursor-grabbing ${
          isDragging
            ? "cursor-grabbing opacity-100"
            : "cursor-grab opacity-50 sm:opacity-0 sm:group-hover:opacity-70"
        }`}
        aria-label={`Reorder ${account.name}`}
        {...attributes}
        {...listeners}
        onClick={(event) => event.preventDefault()}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </button>

      <Link
        href={`/accounts/${account.id}`}
        className={`block h-full ${isDragging ? "pointer-events-none" : ""}`}
        tabIndex={isDragging ? -1 : undefined}
        aria-hidden={isDragging}
      >
        <AccountCard
          account={account}
          compact
          staggerIndex={index}
          className={`h-full transition-colors hover:border-gray-700 ${
            isDragging ? "border-gray-600" : ""
          }`}
        />
      </Link>
    </div>
  );
}

export default function AccountsStrip({ accounts }: AccountsStripProps) {
  const [orderedAccounts, setOrderedAccounts] = useState<AccountDashboardData[]>(() =>
    sortAccountsByDashboardOrder(accounts, readDashboardAccountOrder()),
  );

  useEffect(() => {
    setOrderedAccounts((current) => {
      const order =
        current.length > 0 ? current.map((account) => account.id) : readDashboardAccountOrder();
      return sortAccountsByDashboardOrder(accounts, order);
    });
  }, [accounts]);

  const visibleAccounts = useMemo(
    () => orderedAccounts.slice(0, VISIBLE_ACCOUNT_LIMIT),
    [orderedAccounts],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedAccounts((current) => {
      const visible = current.slice(0, VISIBLE_ACCOUNT_LIMIT);
      const oldIndex = visible.findIndex((account) => account.id === active.id);
      const newIndex = visible.findIndex((account) => account.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return current;

      const reorderedVisible = arrayMove(visible, oldIndex, newIndex);
      const next = [...reorderedVisible, ...current.slice(VISIBLE_ACCOUNT_LIMIT)];
      writeDashboardAccountOrder(next.map((account) => account.id));
      return next;
    });
  }

  if (visibleAccounts.length === 0) return null;

  return (
    <div className="relative">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleAccounts.map((account) => account.id)} strategy={horizontalListSortingStrategy}>
          <div className="hide-scrollbar flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-0">
            {visibleAccounts.map((account, index) => (
              <SortableAccountItem key={account.id} account={account} index={index} />
            ))}
            <div className="w-1 shrink-0 sm:hidden" />
          </div>
        </SortableContext>
      </DndContext>
      <div className="pointer-events-none absolute bottom-2 right-0 top-0 w-8 bg-gradient-to-l from-[#0d1520] to-transparent sm:hidden" />
    </div>
  );
}
