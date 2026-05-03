interface ModelDropdownProps {
  models: string[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export default function ModelDropdown({ models, value, onChange, disabled }: ModelDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || models.length === 0}
      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50"
    >
      {models.length === 0 && (
        <option value="">No models available</option>
      )}
      {models.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
