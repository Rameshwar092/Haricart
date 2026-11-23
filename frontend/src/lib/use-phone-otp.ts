import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { confirmFirebaseOtp, isFirebaseOtpEnabled, sendFirebaseOtp } from "@/lib/firebase-otp";

type Callbacks = {
  onSent: (simulated: boolean) => void;
  onVerified: () => void;
  /** "delivery" = delivery dashboard login: the server only lets in active delivery boys the owner added. */
  purpose?: "resident" | "delivery";
};

/**
 * One OTP API for the login form. Uses Firebase when VITE_FIREBASE_* is set;
 * otherwise the server's own OTP (Twilio, or the 1234 test code in development).
 */
export function usePhoneOtp({ onSent, onVerified, purpose = "resident" }: Callbacks) {
  const utils = trpc.useUtils();
  const [simulated, setSimulated] = useState(false);
  const firebase = isFirebaseOtpEnabled();

  const serverRequest = trpc.community.resident.requestOtp.useMutation();
  const serverConfirm = trpc.community.resident.confirmOtp.useMutation();

  const request = useMutation({
    mutationFn: async (phone: string) => {
      if (firebase) {
        await sendFirebaseOtp(phone);
        return false;
      }
      const data = await serverRequest.mutateAsync({ phone });
      return Boolean((data as { simulated?: boolean }).simulated);
    },
    onSuccess: isSimulated => {
      setSimulated(isSimulated);
      onSent(isSimulated);
    },
  });

  const confirm = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      if (firebase) {
        const idToken = await confirmFirebaseOtp(code);
        return utils.client.community.resident.firebaseVerify.mutate({ phone, idToken, purpose });
      }
      return serverConfirm.mutateAsync({ phone, code, purpose });
    },
    onSuccess: () => {
      void utils.auth.me.invalidate();
      onVerified();
    },
  });

  return { request, confirm, simulated };
}