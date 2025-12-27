import React from 'react';
import type { Vendor, VendorCategory } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

interface VendorBadgeProps {
  vendor?: Vendor;
  size?: 'sm' | 'md';
}

export default function VendorBadge({ vendor, size = 'sm' }: VendorBadgeProps) {
  if (!vendor) {
    return (
      <span
        className={`inline-flex items-center rounded px-1.5 ${
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        } bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400`}
      >
        Unknown
      </span>
    );
  }

  const color = CATEGORY_COLORS[vendor.category] || CATEGORY_COLORS.Other;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 ${
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      } font-medium`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {vendor.name}
    </span>
  );
}

interface CategoryBadgeProps {
  category: VendorCategory;
  size?: 'sm' | 'md';
  selected?: boolean;
  onClick?: () => void;
}

export function CategoryBadge({ category, size = 'sm', selected, onClick }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded px-1.5 ${
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      } font-medium transition-opacity ${
        selected ? 'opacity-100' : 'opacity-60 hover:opacity-80'
      }`}
      style={{
        backgroundColor: `${color}${selected ? '30' : '15'}`,
        color: color,
        border: selected ? `1px solid ${color}` : '1px solid transparent',
      }}
    >
      {category}
    </button>
  );
}
