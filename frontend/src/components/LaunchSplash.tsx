import { BrandMark } from "@/components/BrandMark";
import { getLaunchSplashLabel, launchSplashCopy } from "@/lib/launch-splash";

export function LaunchSplash({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      aria-label={getLaunchSplashLabel()}
      className={`fixed inset-0 z-[100] grid place-items-center bg-[#fbf8ee] transition-opacity duration-300 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      data-testid="launch-splash"
      role="status"
    >
      <div className="relative flex w-full max-w-sm flex-col items-center px-8 text-center">
        <div className="absolute -top-24 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" aria-hidden="true" />
        <div className="relative grid h-28 w-28 place-items-center rounded-[2rem] bg-white p-4 shadow-[0_18px_50px_rgba(31,85,50,0.18)] ring-1 ring-emerald-900/10 splash-pop">
          <BrandMark compact />
        </div>
        <p className="mt-7 font-editorial text-4xl font-semibold tracking-tight text-[#246b14]">{launchSplashCopy.title}</p>
        <p className="mt-2 max-w-xs text-sm font-medium text-emerald-950/60">{launchSplashCopy.subtitle}</p>
        <div className="mt-7 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-900/45">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden="true" />
          <span>GreenGate Residences</span>
        </div>
      </div>
    </div>
  );
}
