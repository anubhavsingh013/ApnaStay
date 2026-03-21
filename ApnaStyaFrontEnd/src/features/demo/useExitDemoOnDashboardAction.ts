import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";

/**
 * In demo mode on tenant (/dashboard) or admin (/admin) routes, any click on a primary
 * control (button, link, submit) exits demo and redirects to sign-in — except elements
 * marked with [data-demo-allow] (tabs, nav, demo switcher, etc.).
 */
export function useExitDemoOnDashboardAction(
  demoMode: boolean,
  exitDemoAndSignIn: (navigate: NavigateFunction) => void,
  navigate: NavigateFunction,
) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!demoMode) return;
    const onDashboard =
      pathname.startsWith("/admin") ||
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/");
    if (!onDashboard) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-demo-allow]")) return;

      const actionable = target.closest(
        "button, a[href], input[type='submit'], [role='button']",
      );
      if (!actionable) return;

      e.preventDefault();
      e.stopPropagation();
      exitDemoAndSignIn(navigate);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [demoMode, pathname, navigate, exitDemoAndSignIn]);
}
