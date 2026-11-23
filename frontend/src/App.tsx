import { Toaster } from "@/components/ui/sonner";
import { LaunchSplash } from "@/components/LaunchSplash";
import { getLaunchSplashDuration, LAUNCH_SPLASH_DURATION_MS } from "@/lib/launch-splash";
import { trpc } from "@/lib/trpc";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { OrderAlarm } from "./components/OrderAlarm";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import OperationsPortal from "./pages/OperationsPortal";
import Orders from "./pages/Orders";
import CustomerDirectory from "./pages/CustomerDirectory";
import ProductDetail from "./pages/ProductDetail";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/product/:handle"} component={ProductDetail} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/customers"} component={CustomerDirectory} />
      <Route path={"/shop"} component={OperationsPortal} />
      <Route path={"/delivery"} component={DeliveryDashboard} />
      <Route path={"/admin"} component={OperationsPortal} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const [launchComplete, setLaunchComplete] = useState(false);
  const splashSettings = trpc.commerce.splashSettings.useQuery(undefined, { retry: false, staleTime: Infinity });
  const configuredSplashDuration = splashSettings.isLoading ? null : splashSettings.data?.durationMs ?? LAUNCH_SPLASH_DURATION_MS;

  useEffect(() => {
    if (configuredSplashDuration === null) return;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setLaunchComplete(true), getLaunchSplashDuration(Boolean(reducedMotion), configuredSplashDuration));
    return () => window.clearTimeout(timeout);
  }, [configuredSplashDuration]);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <OrderAlarm />
          <LaunchSplash visible={!launchComplete} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;