"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox } from "@/hooks/useSandbox";
import { TimeTravelModal } from "./TimeTravelModal";
import { useBlock } from "wagmi";

function formatTimestamp(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

export function SandboxBanner() {
  const { isActive } = useSandbox();
  const [timeTravelOpen, setTimeTravelOpen] = useState(false);

  const { data: block } = useBlock({
    watch: true,
    query: { enabled: isActive, refetchInterval: 4000 },
  });

  if (!isActive) return null;

  return (
    <>
      <div className="bg-[var(--bg-brand-subtle)] border-b border-[var(--border-primary)]">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between py-2 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Badge variant="success" size="sm">
                Sandbox
              </Badge>
              {block ? (
                <span className="text-xs text-[var(--text-tertiary)] font-mono truncate">
                  Block #{block.number?.toString()} &middot; {formatTimestamp(block.timestamp)}
                </span>
              ) : (
                <span className="text-sm text-[var(--text-secondary)] truncate">
                  Temporary cloud environment
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setTimeTravelOpen(true)}
              >
                Time Travel
              </Button>
            </div>
          </div>
        </div>
      </div>
      <TimeTravelModal
        open={timeTravelOpen}
        onClose={() => setTimeTravelOpen(false)}
      />
    </>
  );
}
