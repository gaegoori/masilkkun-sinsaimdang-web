// src/components/post/CategoryFilter.jsx
import React from "react";
import "./CategoryFilter.css";

/**
 * selectedCategories: [{ label: string, value: string }]
 * onCategoryChange: (next: typeof selectedCategories) => void
 */
const CategoryFilter = ({ selectedCategories = [], onCategoryChange }) => {
  const tagOptions = [
    { label: "여행지", value: "TRAVEL_SPOT" },
    { label: "맛집", value: "RESTAURANT" },
    { label: "카페", value: "CAFE" },
  ];

  const isSelected = (value) =>
    selectedCategories.some((t) => t.value === value);

  const toggleTag = (tag) => {
    if (isSelected(tag.value)) {
      onCategoryChange(selectedCategories.filter((t) => t.value !== tag.value));
    } else {
      onCategoryChange([...selectedCategories, tag]);
    }
  };

  const onKeyDownChip = (e, tag) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTag(tag);
    }
  };

  return (
    <div className="category-select">
      <div className="category-select-container">
        {tagOptions.map((tag) => {
          const selected = isSelected(tag.value);
          return (
            <button
              key={tag.value}
              type="button"
              className={`category-select-chip ${selected ? "selected" : ""}`}
              aria-pressed={selected}
              onClick={() => toggleTag(tag)}
              onKeyDown={(e) => onKeyDownChip(e, tag)}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
