"use client";

import * as React from "react";
import { cn, formatDate } from "@/lib/utils";
import type { ProposalStatus } from "@/types/governance";

interface TimelineEvent {
  label: string;
  date: Date | null;
  status: "completed" | "current" | "upcoming" | "failed";
}

export interface ProposalTimelineProps {
  className?: string;
  proposalStatus: ProposalStatus;
  createdAt: Date;
  votingStartsAt: Date;
  votingEndsAt: Date;
  executedAt?: Date;
  queuedAt?: Date;
}

/** Check icon for completed steps */
const CheckIcon = () => (
  <svg
    className="size-2.5 text-white"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

/** Pulsing dot for current step */
const PulsingDot = () => (
  <span className="relative flex size-1.5">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-primary-400)] opacity-75" />
    <span className="relative inline-flex size-1.5 rounded-full bg-[var(--color-primary-500)]" />
  </span>
);

export function ProposalTimeline({
  className,
  proposalStatus,
  createdAt,
  votingStartsAt,
  votingEndsAt,
  executedAt,
  queuedAt,
}: ProposalTimelineProps) {
  const events: TimelineEvent[] = React.useMemo(() => {
    const statusOrder: ProposalStatus[] = [
      "pending",
      "active",
      "succeeded",
      "queued",
      "executed",
    ];
    const currentStatusIndex = statusOrder.indexOf(proposalStatus);
    const isPastStatus = (status: ProposalStatus) =>
      statusOrder.indexOf(status) < currentStatusIndex;
    const isCurrentStatus = (status: ProposalStatus) => proposalStatus === status;
    const isFailed = ["defeated", "canceled", "expired"].includes(proposalStatus);

    const baseEvents: TimelineEvent[] = [
      {
        label: "Created",
        date: createdAt,
        status: "completed",
      },
      {
        label: "Pending",
        date: votingStartsAt,
        status: isFailed
          ? isPastStatus("pending")
            ? "completed"
            : "failed"
          : isPastStatus("pending")
            ? "completed"
            : isCurrentStatus("pending")
              ? "current"
              : "upcoming",
      },
      {
        label: "Voting Starts",
        date: votingStartsAt,
        status: isFailed
          ? isPastStatus("active")
            ? "completed"
            : "failed"
          : isPastStatus("active") || isCurrentStatus("active")
            ? "completed"
            : "upcoming",
      },
      {
        label: "Voting Ends",
        date: votingEndsAt,
        status: isFailed
          ? "failed"
          : isPastStatus("active")
            ? "completed"
            : isCurrentStatus("active")
              ? "current"
              : "upcoming",
      },
    ];

    if (
      queuedAt ||
      proposalStatus === "queued" ||
      proposalStatus === "executed" ||
      proposalStatus === "succeeded"
    ) {
      baseEvents.push({
        label: "Queued",
        date: queuedAt || null,
        status: isFailed
          ? "failed"
          : proposalStatus === "executed" || queuedAt
            ? "completed"
            : proposalStatus === "queued"
              ? "current"
              : "upcoming",
      });
    }

    if (executedAt || proposalStatus === "executed" || proposalStatus === "queued") {
      baseEvents.push({
        label: "Executed",
        date: executedAt || null,
        status: isFailed
          ? "failed"
          : executedAt || proposalStatus === "executed"
            ? "completed"
            : "upcoming",
      });
    }

    return baseEvents;
  }, [proposalStatus, createdAt, votingStartsAt, votingEndsAt, executedAt, queuedAt]);

  return (
    <div className={cn("space-y-3.5", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
          Timeline
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border-secondary)] to-transparent" />
      </div>

      {/* Timeline */}
      <div className="relative pl-1">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          const nextEvent = events[index + 1];
          const lineCompleted =
            event.status === "completed" &&
            (nextEvent?.status === "completed" || nextEvent?.status === "current");

          return (
            <div
              key={`${event.label}-${index}`}
              className={cn(
                "relative flex gap-3 transition-opacity duration-300",
                event.status === "upcoming" && "opacity-50",
                event.status === "failed" && "opacity-40"
              )}
            >
              {/* Timeline track */}
              <div className="relative flex flex-col items-center">
                {/* Connector line (behind the dot) */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-1/2 top-5 h-[calc(100%-2px)] w-0.5 -translate-x-1/2",
                      "transition-colors duration-500",
                      lineCompleted
                        ? "bg-[var(--color-success-500)]"
                        : "bg-[var(--border-secondary)]"
                    )}
                  />
                )}

                {/* Status indicator */}
                <div
                  className={cn(
                    "relative z-10 mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full",
                    "transition-all duration-300",
                    event.status === "completed" &&
                      "bg-[var(--color-success-500)]",
                    event.status === "current" &&
                      "bg-[var(--bg-primary)] border-2 border-[var(--color-primary-500)]",
                    event.status === "upcoming" &&
                      "bg-[var(--bg-tertiary)] border-2 border-[var(--border-secondary)]",
                    event.status === "failed" &&
                      "bg-[var(--bg-tertiary)] border-2 border-[var(--color-error-300)]"
                  )}
                >
                  {event.status === "completed" && <CheckIcon />}
                  {event.status === "current" && <PulsingDot />}
                </div>
              </div>

              {/* Content */}
              <div className={cn("flex-1 pb-5", isLast && "pb-0")}>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-sm font-medium leading-5",
                      "transition-colors duration-300",
                      event.status === "completed" && "text-[var(--text-primary)]",
                      event.status === "current" && "text-[var(--color-primary-600)]",
                      event.status === "upcoming" && "text-[var(--text-tertiary)]",
                      event.status === "failed" && "text-[var(--color-error-500)]"
                    )}
                  >
                    {event.label}
                  </span>
                  {event.date && (
                    <time
                      dateTime={event.date.toISOString()}
                      className={cn(
                        "text-xs tabular-nums",
                        event.status === "current"
                          ? "text-[var(--color-primary-500)]"
                          : "text-[var(--text-tertiary)]"
                      )}
                    >
                      {formatDate(event.date, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
