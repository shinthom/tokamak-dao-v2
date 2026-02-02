"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Card component variants using design tokens
 * @see design-tokens.css for token definitions
 */
const cardVariants = cva(
  [
    "bg-[var(--card-bg)]",
    "border border-[var(--card-border)]",
    "rounded-[var(--card-radius)]",
    "overflow-visible",
    "transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)]",
  ],
  {
    variants: {
      variant: {
        default: "shadow-[var(--card-shadow)]",
        elevated: "shadow-[var(--shadow-md)]",
        outlined: "shadow-none",
        ghost: "border-transparent bg-transparent shadow-none",
      },
      padding: {
        none: "",
        sm: "p-[var(--space-4)]",
        md: "p-[var(--space-6)]",
        lg: "p-[var(--space-8)]",
      },
      interactive: {
        true: [
          "cursor-pointer",
          "hover:shadow-[var(--shadow-md)]",
          "hover:border-[var(--border-primary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

/**
 * Card container component
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, interactive, className }))}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      {...props}
    />
  )
);
Card.displayName = "Card";

/**
 * Card header section
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col gap-[var(--space-1-5)]",
      "mb-[var(--space-4)]",
      className
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold text-[var(--text-primary)] leading-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--text-secondary)]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

/**
 * Card footer section
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-[var(--space-4)]", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
