type FilterPill = {
  key: string;
  label: string;
  onRemove: () => void;
};

type ActiveFilterPillsProps = {
  pills: FilterPill[];
  onClearAll?: () => void;
};

export default function ActiveFilterPills({ pills, onClearAll }: ActiveFilterPillsProps) {
  if (pills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs text-teal-200"
        >
          {pill.label}
          <button
            type="button"
            onClick={pill.onRemove}
            className="text-teal-300 transition-colors hover:text-white"
            aria-label={`Remove ${pill.label} filter`}
          >
            ✕
          </button>
        </span>
      ))}
      {onClearAll && pills.length > 1 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-gray-400 transition-colors hover:text-gray-300"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
