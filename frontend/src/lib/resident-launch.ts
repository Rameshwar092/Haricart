export type ResidentLaunchRole = "admin" | "shop_owner" | "delivery_boy" | "customer" | "user" | null | undefined;

export function shouldShowResidentLaunchGate({
  authLoading,
  isAuthenticated,
  isVerifiedResident,
  isPrivileged,
}: {
  authLoading: boolean;
  isAuthenticated: boolean;
  isVerifiedResident: boolean;
  isPrivileged: boolean;
}) {
  if (authLoading || isPrivileged) return false;
  return !(isAuthenticated && isVerifiedResident);
}

export const RESIDENT_ONBOARDING_STEPS = [
  "Mobile",
  "OTP",
  "Block",
  "Flat",
] as const;

export type ResidentOnboardingStep = (typeof RESIDENT_ONBOARDING_STEPS)[number];

export function getResidentOnboardingStep({
  authenticated,
  otpRequested,
  phoneVerified,
  detailStep,
}: {
  authenticated: boolean;
  otpRequested: boolean;
  phoneVerified: boolean;
  detailStep: "block" | "flat";
}): ResidentOnboardingStep {
  if (!otpRequested) return "Mobile";
  if (!phoneVerified) return "OTP";
  return detailStep === "block" ? "Block" : "Flat";
}
