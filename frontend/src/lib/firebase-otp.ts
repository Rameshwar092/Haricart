import { normalizePhone } from "@shared/phone";
/**
 * Customer phone OTP through Firebase Authentication.
 *
 * Flow: sendFirebaseOtp(phone) → Firebase texts a 6-digit code →
 * confirmFirebaseOtp(code) returns a Firebase ID token → the backend checks
 * that token (community.resident.firebaseVerify) and logs the customer in.
 *
 * Firebase is loaded only when a customer actually asks for an OTP, so it does
 * not slow down the first page load.
 */
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseOtpEnabled = () => Boolean(config.apiKey && config.authDomain && config.projectId);

/** Firebase needs +91XXXXXXXXXX. A bare 10-digit Indian number gets +91. */
/** Same rule as the server: "98765 43210", "09876543210", "+91…" all become +919876543210. */
export const toE164 = normalizePhone;

let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

async function loadAuth() {
  const [{ initializeApp, getApps }, authModule] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app = getApps()[0] ?? initializeApp(config);
  const auth = authModule.getAuth(app);
  auth.useDeviceLanguage();
  return { auth, authModule };
}

function recaptchaContainer() {
  let el = document.getElementById("firebase-recaptcha");
  if (!el) {
    el = document.createElement("div");
    el.id = "firebase-recaptcha";
    document.body.appendChild(el);
  }
  return el;
}

function resetVerifier() {
  try {
    verifier?.clear();
  } catch {
    /* already cleared */
  }
  verifier = null;
  document.getElementById("firebase-recaptcha")?.remove();
}

export async function sendFirebaseOtp(phone: string) {
  const e164 = toE164(phone);
  if (!/^\+[1-9][0-9]{7,14}$/.test(e164)) throw new Error("Enter a valid 10-digit mobile number.");
  const { auth, authModule } = await loadAuth();
  try {
    verifier ??= new authModule.RecaptchaVerifier(auth, recaptchaContainer(), { size: "invisible" });
    confirmation = await authModule.signInWithPhoneNumber(auth, e164, verifier);
  } catch (error) {
    resetVerifier(); // a used/failed reCAPTCHA cannot be reused
    throw new Error(friendlyFirebaseError(error));
  }
}

export async function confirmFirebaseOtp(code: string) {
  if (!confirmation) throw new Error("Your OTP session expired. Please tap Send OTP again.");
  if (!/^[0-9]{6}$/.test(code.trim())) throw new Error("Enter the 6-digit OTP.");
  try {
    const result = await confirmation.confirm(code.trim());
    const idToken = await result.user.getIdToken();
    confirmation = null;
    resetVerifier();
    // Firebase was only used to prove the phone number; HariCart keeps its own session.
    const { auth, authModule } = await loadAuth();
    void authModule.signOut(auth).catch(() => {});
    return idToken;
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}

export function friendlyFirebaseError(error: unknown) {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Please enter a valid Indian mobile number.";
    case "auth/invalid-verification-code":
      return "Incorrect OTP. Please check the code and try again.";
    case "auth/code-expired":
      return "This OTP has expired. Please request a new one.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a while and try again.";
    case "auth/quota-exceeded":
      return "SMS limit reached for today. Please try again later.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
      return "Security check failed. Please refresh the page and try again.";
    case "auth/unauthorized-domain":
    case "auth/app-not-authorized":
      return "This website is not yet allowed to send OTPs. Please contact HariCart.";
    case "auth/operation-not-allowed":
      return "Phone login is not enabled yet. Please contact HariCart.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    default:
      return error instanceof Error && error.message && !code ? error.message : "Could not complete OTP verification. Please try again.";
  }
}
