"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

/**
 * Stat card variants
 */
const statCardVariants = cva(["flex flex-col gap-[var(--space-1)]"], {
  variants: {
    size: {
      sm: "p-[var(--space-4)]",
      md: "p-[var(--space-6)]",
      lg: "p-[var(--space-8)]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  label: string;
  value: string | number;
  description?: string;
  tooltip?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  interactive?: boolean;
}

/**
 * Chevron icon for interactive state
 */
const ChevronIcon = () => (
  <svg
    className="size-4 text-[var(--text-tertiary)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

/**
 * Question mark icon for tooltip trigger
 */
const QuestionIcon = () => (
  <span
    className="inline-flex items-center justify-center size-[14px] rounded-full border-[1.5px] border-[var(--text-tertiary)] text-[var(--text-tertiary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors cursor-help text-[10px] font-semibold leading-none -translate-y-0.5"
    aria-hidden="true"
  >
    ?
  </span>
);

/**
 * Trend indicator component
 */
const TrendIndicator = ({
  value,
  isPositive,
}: {
  value: number;
  isPositive: boolean;
}) => (
  <span
    className={cn(
      "text-sm font-medium",
      isPositive
        ? "text-[var(--fg-success-primary)]"
        : "text-[var(--fg-error-primary)]"
    )}
    aria-label={`${isPositive ? "Increased" : "Decreased"} by ${Math.abs(value)}%`}
  >
    {isPositive ? "+" : "-"}
    {Math.abs(value)}%
  </span>
);

/**
 * Statistics display card component
 */
const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      size,
      label,
      value,
      description,
      tooltip,
      icon,
      trend,
      interactive = false,
      ...props
    },
    ref
  ) => (
    <Card
      ref={ref}
      padding="none"
      interactive={interactive}
      className={cn(statCardVariants({ size, className }))}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-[var(--space-1)]">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </span>
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={`${label} info`}>
                    <QuestionIcon />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {icon && (
          <span className="text-[var(--text-tertiary)]" aria-hidden="true">
            {icon}
          </span>
        )}
        {interactive && !icon && <ChevronIcon />}
      </div>
      <div className="flex items-baseline gap-[var(--space-2)]">
        <span className="text-3xl font-bold text-[var(--text-primary)]">
          {value}
        </span>
        {trend && (
          <TrendIndicator value={trend.value} isPositive={trend.isPositive} />
        )}
      </div>
      {description && (
        <span className="text-sm text-[var(--text-tertiary)]">
          {description}
        </span>
      )}
    </Card>
  )
);
StatCard.displayName = "StatCard";

export { StatCard, statCardVariants };
