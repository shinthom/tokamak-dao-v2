"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Select component variants using same base styles as Input
 */
const selectVariants = cva(
  [
    "flex w-full",
    "appearance-none",
    "bg-[var(--input-bg)]",
    "text-[var(--input-text)]",
    "border border-[var(--input-border)]",
    "rounded-[var(--input-radius)]",
    "px-[var(--input-padding-x)] py-[var(--input-padding-y)]",
    "transition-colors duration-[var(--duration-fast)]",
    "hover:border-[var(--input-border-hover)]",
    "focus:outline-none focus:border-2 focus:border-[var(--input-border-focus)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "cursor-pointer",
    "pr-10",
  ],
  {
    variants: {
      size: {
        sm: "h-8 text-sm",
        md: "h-10 text-sm",
        lg: "h-12 text-base",
      },
      error: {
        true: [
          "border-[var(--status-error-fg)]",
          "focus:border-2 focus:border-[var(--status-error-fg)]",
        ],
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {
  placeholder?: string;
}

/**
 * Native select component styled to match the design system
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, size, error, placeholder, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            selectVariants({ size, error }),
            !props.value && "text-[var(--input-placeholder)]",
            className
          )}
          ref={ref}
          aria-invalid={error || undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="size-4 text-[var(--text-tertiary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select, selectVariants };
