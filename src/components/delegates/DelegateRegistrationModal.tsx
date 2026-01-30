"use client";

import * as React from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { useRegisterDelegate } from "@/hooks/contracts/useDelegateRegistry";

export interface DelegateRegistrationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal for registering as a delegate
 * Note: Form data is not saved yet - will be implemented later
 */
export function DelegateRegistrationModal({
  open,
  onClose,
  onSuccess,
}: DelegateRegistrationModalProps) {
  const [name, setName] = React.useState("");
  const [aboutMe, setAboutMe] = React.useState("");
  const [whyDelegate, setWhyDelegate] = React.useState("");
  const [addressOrEns, setAddressOrEns] = React.useState("");

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
      setName("");
      setAboutMe("");
      setWhyDelegate("");
      setAddressOrEns("");
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

  const handleSubmit = () => {
    // Note: Form data is stored on-chain. Additional off-chain storage will be implemented later
    registerDelegate(name, aboutMe, [whyDelegate]);
  };

  const getButtonText = () => {
    if (isConfirmed) return "Registration Successful!";
    if (isConfirming) return "Confirming...";
    if (isPending) return "Confirm in Wallet...";
    return "Become a Delegate";
  };

  const isDisabled = isPending || isConfirming || isConfirmed;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Become a Delegate"
      description="Share your profile and voting philosophy to become a delegate"
      size="md"
    >
      <ModalBody className="space-y-4">
        {/* Name Input */}
        <div className="space-y-2">
          <Label htmlFor="name" required>
            Name
          </Label>
          <Input
            id="name"
            placeholder="Your name or pseudonym"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isDisabled}
          />
        </div>

        {/* About Me Input */}
        <div className="space-y-2">
          <Label htmlFor="aboutMe" required>
            About me
          </Label>
          <Textarea
            id="aboutMe"
            placeholder="Tell us about yourself..."
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            disabled={isDisabled}
            rows={3}
          />
        </div>

        {/* Why I want to be a delegate Input */}
        <div className="space-y-2">
          <Label htmlFor="whyDelegate" required>
            Why I want to be a delegate
          </Label>
          <Textarea
            id="whyDelegate"
            placeholder="Describe your motivation and goals..."
            value={whyDelegate}
            onChange={(e) => setWhyDelegate(e.target.value)}
            disabled={isDisabled}
            rows={3}
          />
        </div>

        {/* Address or ENS Input */}
        <div className="space-y-2">
          <Label htmlFor="addressOrEns" required>
            Address or ENS
          </Label>
          <Input
            id="addressOrEns"
            placeholder="0x... or yourname.eth"
            value={addressOrEns}
            onChange={(e) => setAddressOrEns(e.target.value)}
            disabled={isDisabled}
          />
        </div>

        {/* Transaction Error */}
        {txError && (
          <p className="text-sm text-[var(--status-error)]">
            Transaction failed: {txError.message.slice(0, 100)}...
          </p>
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
