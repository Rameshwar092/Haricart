export type OwnerLaunchGateParams = {
  authLoading: boolean;
  isAuthenticated: boolean;
  role?: string | null;
  hasStoredOwnerPassword: boolean;
  isUnlockedInSession: boolean;
};

export function shouldRequireOwnerVerification(role?: string | null): boolean {
  return role === "admin" || role === "shop_owner";
}

export function shouldShowOwnerLaunchGate({
  authLoading,
  isAuthenticated,
  role,
  hasStoredOwnerPassword,
  isUnlockedInSession,
}: OwnerLaunchGateParams): boolean {
  if (authLoading) return false;
  if (!isAuthenticated) return false;
  const isOwnerOrAdmin = shouldRequireOwnerVerification(role);
  if (!isOwnerOrAdmin) return false;
  // If the owner has not created a private password yet, or hasn't unlocked the session yet, block launch
  if (!hasStoredOwnerPassword || !isUnlockedInSession) {
    return true;
  }
  return false;
}
