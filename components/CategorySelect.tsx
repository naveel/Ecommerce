"use client";

import { Category } from "@/lib/types";

interface CategorySelectProps {
  value: Category | "";
  onChange: (value: Category | "") => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor="category" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
        Category
      </label>
      <select
        id="category"
        name="category"
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value as Category | "")}
      >
        <option value="" disabled>
          Select category
        </option>
        <option value="Jewelry">Jewelry</option>
        <option value="Clothing">Clothing</option>
      </select>
    </div>
  );
}
