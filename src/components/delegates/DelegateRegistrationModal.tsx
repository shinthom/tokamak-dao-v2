"use client";

import * as React from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, HelperText } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRegisterDelegate } from "@/hooks/contracts/useDelegateRegistry";

export interface DelegateRegistrationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PROFILE_MIN = 3;
const PROFILE_MAX = 100;
const PHILOSOPHY_MIN = 50;
const PHILOSOPHY_MAX = 1000;
const INTEREST_MAX_LENGTH = 50;
const INTERESTS_MIN = 1;
const INTERESTS_MAX = 10;

/**
 * Modal for registering as a delegate
 */
export function DelegateRegistrationModal({
  open,
  onClose,
  onSuccess,
}: DelegateRegistrationModalProps) {
  const [profile, setProfile] = React.useState("");
  const [philosophy, setPhilosophy] = React.useState("");
  const [interests, setInterests] = React.useState<string[]>([]);
  const [interestInput, setInterestInput] = React.useState("");
  const [errors, setErrors] = React.useState<{
    profile?: string;
    philosophy?: string;
    interests?: string;
  }>({});

  const {
    registerDelegate,
    isPending,
    isConfirming,
    isConfirmed,
    error: txError,
    reset,
  } = useRegisterDelegate();

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setProfile("");
      setPhilosophy("");
      setInterests([]);
      setInterestInput("");
      setErrors({});
      reset();
    }
  }, [open, reset]);

  // Close modal on successful transaction
  React.useEffect(() => {
    if (isConfirmed) {
      onSuccess?.();
      const timeout = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isConfirmed, onClose, onSuccess]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (profile.length < PROFILE_MIN || profile.length > PROFILE_MAX) {
      newErrors.profile = `Profile must be ${PROFILE_MIN}-${PROFILE_MAX} characters`;
    }

    if (philosophy.length < PHILOSOPHY_MIN || philosophy.length > PHILOSOPHY_MAX) {
      newErrors.philosophy = `Philosophy must be ${PHILOSOPHY_MIN}-${PHILOSOPHY_MAX} characters`;
    }

    if (interests.length < INTERESTS_MIN || interests.length > INTERESTS_MAX) {
      newErrors.interests = `Add ${INTERESTS_MIN}-${INTERESTS_MAX} interests`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed) return;

    if (trimmed.length > INTEREST_MAX_LENGTH) {
      setErrors((prev) => ({
        ...prev,
        interests: `Interest must be ${INTEREST_MAX_LENGTH} characters or less`,
      }));
      return;
    }

    if (interests.length >= INTERESTS_MAX) {
      setErrors((prev) => ({
        ...prev,
        interests: `Maximum ${INTERESTS_MAX} interests allowed`,
      }));
      return;
    }

    if (interests.includes(trimmed)) {
      setErrors((prev) => ({
        ...prev,
        interests: "Interest already added",
      }));
      return;
    }

    setInterests([...interests, trimmed]);
    setInterestInput("");
    setErrors((prev) => ({ ...prev, interests: undefined }));
  };

  const handleRemoveInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddInterest();
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    registerDelegate(profile, philosophy, interests);
  };

  const getButtonText = () => {
    if (isConfirmed) return "Registration Successful!";
    if (isConfirming) return "Confirming...";
    if (isPending) return "Confirm in Wallet...";
    return "Register as Delegate";
  };

  const isDisabled = isPending || isConfirming || isConfirmed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Register as Delegate"
      description="Share your profile and voting philosophy to become a delegate"
      size="md"
    >
      <ModalBody className="space-y-4">
        {/* Profile Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="profile" required>
              Profile
            </Label>
            <span className="text-xs text-[var(--text-tertiary)]">
              {profile.length}/{PROFILE_MAX}
            </span>
          </div>
          <Input
            id="profile"
            placeholder="Your identity or pseudonym"
            value={profile}
            onChange={(e) => {
              setProfile(e.target.value);
              setErrors((prev) => ({ ...prev, profile: undefined }));
            }}
            error={!!errors.profile}
            disabled={isDisabled}
          />
          {errors.profile && <HelperText error>{errors.profile}</HelperText>}
        </div>

        {/* Philosophy Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="philosophy" required>
              Voting Philosophy
            </Label>
            <span className="text-xs text-[var(--text-tertiary)]">
              {philosophy.length}/{PHILOSOPHY_MAX}
            </span>
          </div>
          <Textarea
            id="philosophy"
            placeholder="Describe your decision-making criteria and values..."
            value={philosophy}
            onChange={(e) => {
              setPhilosophy(e.target.value);
              setErrors((prev) => ({ ...prev, philosophy: undefined }));
            }}
            error={!!errors.philosophy}
            disabled={isDisabled}
            rows={4}
          />
          {errors.philosophy && <HelperText error>{errors.philosophy}</HelperText>}
        </div>

        {/* Interests Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="interests" required>
              Interests
            </Label>
            <span className="text-xs text-[var(--text-tertiary)]">
              {interests.length}/{INTERESTS_MAX}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              id="interests"
              placeholder="Add interest (press Enter)"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={handleInterestKeyDown}
              error={!!errors.interests}
              disabled={isDisabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddInterest}
              disabled={isDisabled || !interestInput.trim()}
            >
              Add
            </Button>
          </div>
          {errors.interests && <HelperText error>{errors.interests}</HelperText>}

          {/* Interest Tags */}
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {interests.map((interest, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="pr-1 flex items-center gap-1"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(index)}
                    disabled={isDisabled}
                    className="ml-1 hover:text-[var(--status-error)] transition-colors"
                    aria-label={`Remove ${interest}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Transaction Error */}
        {txError && (
          <HelperText error>
            Transaction failed: {txError.message.slice(0, 100)}...
          </HelperText>
        )}

        {/* Success Message */}
        {isConfirmed && (
          <div className="p-3 bg-[var(--status-success)]/10 border border-[var(--status-success)]/30 rounded-lg text-center">
            <p className="text-sm text-[var(--status-success)] font-medium">
              You are now registered as a delegate!
            </p>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isPending || isConfirming}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isDisabled}
          loading={isPending || isConfirming}
        >
          {getButtonText()}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
