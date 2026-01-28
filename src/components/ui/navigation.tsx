"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Navigation container component
 */
const Navigation = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn(
      "relative z-[var(--z-sticky)]",
      "flex items-center justify-between",
      "h-[var(--nav-height)] px-[var(--space-4)] lg:px-[var(--space-6)]",
      "bg-[var(--nav-bg)]",
      "border-b border-[var(--nav-border)]",
      className
    )}
    aria-label="Main navigation"
    {...props}
  />
));
Navigation.displayName = "Navigation";

/**
 * Navigation brand/logo container
 */
const NavigationBrand = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-[var(--space-3)]", className)}
    {...props}
  />
));
NavigationBrand.displayName = "NavigationBrand";

/**
 * Navigation items container
 */
const NavigationItems = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute left-1/2 -translate-x-1/2",
      "flex items-center gap-[var(--space-1)]",
      className
    )}
    role="menubar"
    {...props}
  />
));
NavigationItems.displayName = "NavigationItems";

/**
 * Navigation item variants
 */
const navItemVariants = cva(
  [
    "inline-flex items-center gap-[var(--space-2)]",
    "px-[var(--space-3)] py-[var(--space-2)]",
    "text-sm font-medium",
    "rounded-[var(--radius-lg)]",
    "transition-colors duration-[var(--duration-fast)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]",
  ],
  {
    variants: {
      active: {
        true: [
          "bg-[var(--bg-brand-subtle)]",
          "text-[var(--text-brand)]",
        ],
        false: [
          "text-[var(--text-secondary)]",
          "hover:bg-[var(--bg-tertiary)]",
          "hover:text-[var(--text-primary)]",
        ],
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

export interface NavItemProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof navItemVariants> {
  href: string;
  icon?: React.ReactNode;
}

/**
 * Navigation item component
 */
const NavigationItem = React.forwardRef<HTMLAnchorElement, NavItemProps>(
  ({ className, active, href, icon, children, ...props }, ref) => (
    <Link
      ref={ref}
      href={href}
      className={cn(navItemVariants({ active, className }))}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      {...props}
    >
      {icon && <span className="size-4" aria-hidden="true">{icon}</span>}
      {children}
    </Link>
  )
);
NavigationItem.displayName = "NavigationItem";

/**
 * Navigation actions container (right side)
 */
const NavigationActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-[var(--space-2)]", className)}
    {...props}
  />
));
NavigationActions.displayName = "NavigationActions";

/**
 * Hamburger menu icon
 */
const HamburgerIcon = () => (
  <svg
    className="size-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

/**
 * Close menu icon
 */
const CloseMenuIcon = () => (
  <svg
    className="size-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/**
 * Mobile navigation menu button
 */
const NavigationMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isOpen?: boolean }
>(({ className, isOpen, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex items-center justify-center",
      "size-10",
      "rounded-[var(--radius-lg)]",
      "text-[var(--text-secondary)]",
      "hover:bg-[var(--bg-tertiary)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]",
      "lg:hidden",
      className
    )}
    aria-label={isOpen ? "Close menu" : "Open menu"}
    aria-expanded={isOpen}
    {...props}
  >
    {isOpen ? <CloseMenuIcon /> : <HamburgerIcon />}
  </button>
));
NavigationMenuButton.displayName = "NavigationMenuButton";

/**
 * DAO Selector dropdown props
 */
export interface DaoSelectorProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name: string;
  icon?: React.ReactNode;
}

/**
 * Dropdown chevron icon
 */
const DropdownChevron = () => (
  <svg
    className="size-4 text-[var(--text-tertiary)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

/**
 * DAO selector dropdown component
 */
const DaoSelector = React.forwardRef<HTMLButtonElement, DaoSelectorProps>(
  ({ className, name, icon, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center gap-[var(--space-2)]",
        "px-[var(--space-3)] py-[var(--space-2)]",
        "text-sm font-medium",
        "rounded-[var(--radius-lg)]",
        "border border-[var(--border-primary)]",
        "bg-[var(--surface-primary)]",
        "hover:bg-[var(--bg-tertiary)]",
        "transition-colors duration-[var(--duration-fast)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]",
        className
      )}
      aria-haspopup="listbox"
      {...props}
    >
      {icon && <span className="size-5" aria-hidden="true">{icon}</span>}
      <span className="max-w-[150px] truncate">{name}</span>
      <DropdownChevron />
    </button>
  )
);
DaoSelector.displayName = "DaoSelector";

export {
  Navigation,
  NavigationBrand,
  NavigationItems,
  NavigationItem,
  NavigationActions,
  NavigationMenuButton,
  DaoSelector,
  navItemVariants,
};
