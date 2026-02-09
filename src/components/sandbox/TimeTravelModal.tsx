"use client";

import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useSandbox } from "@/hooks/useSandbox";
import { useQueryClient } from "@tanstack/react-query";

interface TimeTravelModalProps {
  open: boolean;
  onClose: () => void;
}

const PRESETS = [
  { label: "Skip Pending (1h)", seconds: 3600 },
  { label: "Skip Voting (1h)", seconds: 3600 },
  { label: "Skip Timelock (1h)", seconds: 3600 },
  { label: "Skip Grace (14d)", seconds: 1209600 },
];

const UNIT_MULTIPLIERS: Record<string, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
};

export function TimeTravelModal({ open, onClose }: TimeTravelModalProps) {
  const { timeTravel } = useSandbox();
  const queryClient = useQueryClient();
  const [customValue, setCustomValue] = useState("");
  const [unit, setUnit] = useState("hours");
  const [isLoading, setIsLoading] = useState(false);

  const handlePreset = async (seconds: number) => {
    setIsLoading(true);
    try {
      await timeTravel(seconds);
      // Refetch all queries so proposal states, timeline, etc. reflect the new block
      await queryClient.invalidateQueries();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustom = async () => {
    const num = parseFloat(customValue);
    if (isNaN(num) || num <= 0) return;
    const seconds = Math.floor(num * UNIT_MULTIPLIERS[unit]);
    await handlePreset(seconds);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Time Travel"
      description="Skip forward in blockchain time"
      size="sm"
    >
      <ModalBody>
        <div className="space-y-4">
          {/* Presets */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePreset(preset.seconds)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border-secondary)]" />
            <span className="text-xs text-[var(--text-tertiary)]">or</span>
            <div className="flex-1 h-px bg-[var(--border-secondary)]" />
          </div>

          {/* Custom input */}
          <div className="space-y-2">
            <Label>Custom Duration</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter value"
                min="1"
                className="flex-1"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)]"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleCustom}
          disabled={isLoading || !customValue || parseFloat(customValue) <= 0}
          loading={isLoading}
        >
          Travel Forward
        </Button>
      </ModalFooter>
    </Modal>
  );
}
