import React from "react";

const DEFAULT_OPTIONS = [
  { value: "기본순", label: "기본순" },
  { value: "좋아요순", label: "좋아요순" },
];

export default function SortSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  className = "",
}) {
  return (
    <select
      className={`sort-select ${className}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label="정렬 방식 선택"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
