import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LockKeyhole, KeyRound, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { isValidOwnerPassword, ownerPasswordsMatch } from "@/lib/owner-password";

interface OwnerAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OwnerAuthModal({ open, onOpenChange, onSuccess }: OwnerAuthModalProps) {
  const [ownerIdInput, setOwnerIdInput] = useState("");
  const [confirmIdInput, setConfirmIdInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const utils = trpc.useUtils();

  const statusQuery = trpc.community.resident.ownerIdStatus.useQuery(undefined, {
    enabled: open,
  });

  const hasCustomOwnerId = statusQuery.data?.hasCustomOwnerId ?? false;

  const setupMutation = trpc.community.resident.setupOwnerId.useMutation({
    onSuccess: () => {
      setErrorMsg(null);
      setOwnerIdInput("");
      setConfirmIdInput("");
      utils.community.resident.ownerIdStatus.invalidate();
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: { message?: string }) => {
      setErrorMsg(err.message || "Failed to create custom Owner ID.");
    },
  });

  const verifyMutation = trpc.community.resident.verifyOwnerId.useMutation({
    onSuccess: () => {
      setErrorMsg(null);
      setOwnerIdInput("");
      setConfirmIdInput("");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: { message?: string }) => {
      setErrorMsg(err.message || "Invalid Owner ID. Please enter your correct private Owner ID.");
    },
  });

  const resetMutation = trpc.community.resident.resetOwnerId.useMutation({
    onSuccess: () => {
      setErrorMsg(null);
      setOwnerIdInput("");
      setConfirmIdInput("");
      setIsResetting(false);
      utils.community.resident.ownerIdStatus.invalidate();
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: { message?: string }) => {
      setErrorMsg(err.message || "Failed to reset Owner ID.");
    },
  });

  const isPending = setupMutation.isPending || verifyMutation.isPending || resetMutation.isPending;
  const isCreating = !hasCustomOwnerId || isResetting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-primary">
            {isCreating ? <KeyRound className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-center font-editorial text-2xl font-semibold">
              {isCreating ? (isResetting ? "Reset Owner ID / Password" : "Create Owner ID / Password") : "Owner Security Verification"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
              {isCreating
              ? "Create a private Owner credential, then re-enter it below to confirm. Use this credential for future Owner tools."
              : "Please type your confirmed Owner credential to unlock owner tools and customer directories."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={event => {
            event.preventDefault();
            const trimmed = ownerIdInput.trim();
            const confirmed = confirmIdInput.trim();
            if (!trimmed) {
              setErrorMsg("Please enter your Owner password.");
              return;
            }
            if (isCreating && !isValidOwnerPassword(trimmed)) {
              setErrorMsg("Owner password must be at least 6 characters.");
              return;
            }
            if (isCreating && !ownerPasswordsMatch(trimmed, confirmed)) {
              setErrorMsg("Passwords do not match! Please re-enter the same password in both fields.");
              return;
            }
            setErrorMsg(null);
            if (isCreating) {
              if (isResetting) {
                resetMutation.mutate({ newOwnerId: trimmed });
              } else {
                setupMutation.mutate({ ownerId: trimmed });
              }
            } else {
              verifyMutation.mutate({ ownerId: trimmed });
            }
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="owner-id-input">
              {isCreating ? (isResetting ? "New Private Owner ID / Password" : "Private Owner ID / Password") : "Private Owner ID / Password"}
            </label>
            <div className="relative">
              <Input
                id="owner-id-input"
                type={showPassword ? "text" : "password"}
                placeholder={isCreating ? (isResetting ? "Create a new private credential..." : "Create a private credential...") : "Enter your private Owner credential"}
                value={ownerIdInput}
                onChange={event => {
                  setOwnerIdInput(event.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="h-12 rounded-xl pr-10 text-center text-lg font-mono tracking-widest"
                autoFocus
                disabled={isPending || statusQuery.isLoading}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {isCreating && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="owner-id-confirm-input">
                Confirm Private Owner Password
              </label>
              <Input
                id="owner-id-confirm-input"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter the same password..."
                value={confirmIdInput}
                onChange={event => {
                  setConfirmIdInput(event.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="h-12 rounded-xl text-center text-lg font-mono tracking-widest"
                disabled={isPending || statusQuery.isLoading}
              />
            </div>
          )}

          {errorMsg && <p className="text-center text-xs font-medium text-rose-600">{errorMsg}</p>}

          <div className="space-y-2 pt-2">
            <Button
              type="submit"
              className="h-12 w-full rounded-full text-sm font-bold shadow-lg shadow-primary/20"
              disabled={isPending || statusQuery.isLoading}
            >
              {isPending ? "Checking..." : isCreating ? "Create Password & Unlock" : "Enter Password & Unlock"}
            </Button>
            {!isResetting && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsResetting(true);
                  setOwnerIdInput("");
                  setConfirmIdInput("");
                  setErrorMsg(null);
                }}
              >
                {hasCustomOwnerId ? "Forgot / Reset Owner ID or Password" : "Create / Reset Owner ID or Password"}
              </Button>
            )}
            {isResetting && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsResetting(false);
                  setOwnerIdInput("");
                  setConfirmIdInput("");
                  setErrorMsg(null);
                }}
              >
                Cancel Reset
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
