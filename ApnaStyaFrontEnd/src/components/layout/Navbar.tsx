import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { Menu, X, LogOut, FlaskConical, User, ChevronDown, Home, Building2, LayoutDashboard, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/features/demo/DemoDataContext";
import { getStoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ApnaStayLogo from "@/components/common/ApnaStayLogo";
import { getDemoUser, setDemoUser, subscribeDemoUser, demoRoles } from "@/features/demo/DemoRoleSwitcher";

const DASHBOARD_ROUTE_PATHS = new Set(["/dashboard", "/owner/dashboard", "/broker/dashboard", "/admin"]);

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  /** Radix Sheet (modal) locks scroll; keep body fixed as extra guard on mobile Safari. */
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const { user, logout, dashboardPath, isAdmin, isOwner, isBroker, isTenant } = useAuth();
  const { demoMode, toggleDemoMode } = useDemoData();
  const storedUser = getStoredUser();
  const nameFromAuth = user?.username?.trim() || storedUser?.username?.trim();
  const displayName = nameFromAuth || (isOwner ? "Owner" : isBroker ? "Broker" : isAdmin ? "Admin" : "User");

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const unsub = subscribeDemoUser(() => forceUpdate(n => n + 1));
    return unsub;
  }, []);
  const demoUserName = getDemoUser();
  const demoDashboardPath = demoMode ? (demoRoles.find(r => r.users.some(u => u.name === demoUserName))?.path ?? "/dashboard") : null;
  const onTenantDashboard = location.pathname === "/dashboard";

  /** In-page tabs show the active dashboard section; do not duplicate that on the top "Dashboard" link. */
  const isTopNavLinkActive = (path: string) => {
    if (location.pathname === path && DASHBOARD_ROUTE_PATHS.has(path)) return false;
    return location.pathname === path;
  };

  const navLinks = useMemo(
    () => [
      { label: "Home", path: "/", icon: Home },
      { label: onTenantDashboard ? "Browse listings" : "Properties", path: "/properties", icon: Building2 },
      ...(user
        ? [{ label: "Dashboard", path: dashboardPath, icon: LayoutDashboard }]
        : demoMode && demoDashboardPath
          ? [{ label: "Dashboard", path: demoDashboardPath, icon: LayoutDashboard }]
          : []),
    ],
    [user, demoMode, demoDashboardPath, dashboardPath, onTenantDashboard],
  );

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    // Replace history so back button doesn't return to dashboard
    navigate("/", { replace: true });
  };

  const handleGoToProfile = () => {
    setMobileOpen(false);
    if (dashboardPath === "/dashboard") {
      navigate("/dashboard?tab=profile");
    } else {
      navigate(dashboardPath, { state: { openProfile: true } });
    }
  };

  const handleRaiseComplaint = () => {
    setMobileOpen(false);
    navigate("/dashboard", { state: { openComplaint: true } });
  };

  const protectedPaths = ["/dashboard", "/owner/dashboard", "/admin", "/broker/dashboard"];
  const isOnProtectedRoute = protectedPaths.some((p) => location.pathname.startsWith(p));

  const handleToggleDemo = () => {
    setMobileOpen(false);
    if (demoMode && isOnProtectedRoute && !user) {
      toggleDemoMode(() => navigate("/", { replace: true }));
    } else {
      toggleDemoMode();
    }
  };

  return (
    <header ref={headerRef} data-demo-allow className="sticky top-0 z-50 shadow-md bg-foreground">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <ApnaStayLogo />

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const NavIcon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => { if (location.pathname === link.path) window.scrollTo(0, 0); }}
                className={`inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                  isTopNavLinkActive(link.path) ? "text-primary" : "text-primary-foreground/70"
                }`}
              >
                <NavIcon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {link.label}
              </Link>
            );
          })}
          {!user && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleToggleDemo}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggleDemo(); } }}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                demoMode ? "text-primary bg-primary/10" : "text-primary-foreground/70 hover:text-primary-foreground/90 hover:bg-primary-foreground/5"
              }`}
            >
              <FlaskConical className="h-4 w-4 shrink-0" />
              Demo
              <Switch checked={demoMode} onCheckedChange={handleToggleDemo} className="scale-75 shrink-0" onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 min-w-0 border border-emerald-400/50 dark:border-emerald-500/50 bg-emerald-950/20 dark:bg-emerald-900/20 hover:bg-emerald-900/30 dark:hover:bg-emerald-800/30 text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 transition-colors shrink-0"
                >
                  <span className="h-8 w-8 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0 ring-2 ring-emerald-400/40">
                    <User className="h-4 w-4 text-emerald-300" />
                  </span>
                  <span className="text-sm font-semibold max-w-[120px] truncate" title={displayName}>
                    {displayName.includes("@") ? displayName.split("@")[0] : displayName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-emerald-300/90 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-demo-allow align="end" className="min-w-[10rem] w-52 p-2 shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl">
                <DropdownMenuItem onClick={handleGoToProfile} className="cursor-pointer py-2.5 px-2.5 rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-foreground">
                  <User className="h-4 w-4 mr-2.5 shrink-0 text-slate-500" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30 py-2.5 px-2.5 rounded-lg">
                  <LogOut className="h-4 w-4 mr-2.5 shrink-0" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : demoMode ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1.5 min-w-0 border-2 border-emerald-400 text-primary-foreground bg-foreground/80 hover:bg-foreground/90 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 transition-colors shrink-0"
                >
                  <span className="h-8 w-8 rounded-full bg-emerald-600/80 flex items-center justify-center shrink-0 border-2 border-emerald-400">
                    <User className="h-4 w-4 text-white" />
                  </span>
                  <span className="text-sm font-semibold max-w-[140px] truncate" title={demoUserName}>
                    {demoUserName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-emerald-400 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-demo-allow align="end" className="min-w-[12rem] w-56 p-2 shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl max-h-[70vh] overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground px-2 pb-2">Switch profile</p>
                {demoRoles.map((r) => (
                  <div key={r.label}>
                    {r.users.length === 1 ? (
                      <DropdownMenuItem
                        onClick={() => { setDemoUser(r.users[0].name); navigate(r.path); }}
                        className="cursor-pointer py-2.5 px-2.5 rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-foreground"
                      >
                        <r.icon className="h-4 w-4 mr-2.5 shrink-0 text-slate-500" />
                        {r.users[0].label}
                      </DropdownMenuItem>
                    ) : (
                      r.users.map((u) => (
                        <DropdownMenuItem
                          key={u.name}
                          onClick={() => { setDemoUser(u.name); navigate(r.path); }}
                          className="cursor-pointer py-2 px-2.5 pl-8 rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-foreground text-sm"
                        >
                          {u.label}
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="font-medium text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 border-0" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <button
            type="button"
            className="md:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-primary-foreground hover:bg-primary-foreground/10 active:scale-[0.98]"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-6 w-6" strokeWidth={2.25} /> : <Menu className="h-6 w-6" strokeWidth={2.25} />}
          </button>
          <SheetContent
            side="right"
            belowNavbar
            showCloseButton={false}
            className="md:hidden flex flex-col border-0 p-0 data-[state=open]:duration-300"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Main menu</SheetTitle>
              <SheetDescription>Site navigation and account</SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col overflow-hidden pt-3">
              <nav
                className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-1"
                aria-label="Main navigation"
              >
                <div className="flex flex-col gap-1.5">
                  {navLinks.map((link) => {
                    const NavIcon = link.icon;
                    const active = isTopNavLinkActive(link.path);
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => {
                          setMobileOpen(false);
                          if (location.pathname === link.path) window.scrollTo(0, 0);
                        }}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold tracking-tight transition-colors",
                          active
                            ? "border-sky-300/80 bg-sky-50 text-sky-950 shadow-sm dark:border-sky-600/50 dark:bg-sky-950/40 dark:text-sky-100"
                            : "border-transparent text-slate-800 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/80",
                        )}
                      >
                        <NavIcon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active ? "text-sky-700 dark:text-sky-300" : "text-sky-600/80 dark:text-sky-400/90",
                          )}
                          aria-hidden
                        />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>

                {!user && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleToggleDemo}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggleDemo();
                      }
                    }}
                    className={cn(
                      "mt-5 flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 px-4 py-3 text-sm font-semibold transition-colors dark:border-slate-600/60",
                      demoMode
                        ? "border-teal-300/60 bg-teal-50 text-teal-900 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-100"
                        : "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/80",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 shrink-0" /> Demo
                    </span>
                    <Switch
                      checked={demoMode}
                      onCheckedChange={handleToggleDemo}
                      className="scale-75 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {user && !onTenantDashboard ? (
                  <div className="mt-5 border-t border-slate-200/90 pt-5 dark:border-slate-600/80 flex flex-col gap-1.5">
                    {isTenant ? (
                      <button
                        type="button"
                        onClick={handleRaiseComplaint}
                        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/80"
                      >
                        <MessageSquarePlus className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                        Raise a complaint
                      </button>
                    ) : null}
                    <Link
                      to={dashboardPath}
                      state={{ openProfile: true }}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/80"
                    >
                      <User className="h-4 w-4 shrink-0" />
                      Profile
                    </Link>
                  </div>
                ) : null}

                {user ? (
                  <div className="mt-5 border-t border-slate-200/90 pt-5 dark:border-slate-600/80">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Logout
                    </button>
                  </div>
                ) : null}

                {!user && demoMode ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3 text-left text-sm font-semibold text-foreground"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <User className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{demoUserName}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        data-demo-allow
                        align="start"
                        className="min-w-[12rem] w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(18rem,calc(100vw-2rem))] p-2"
                      >
                        <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground">Switch profile</p>
                        {demoRoles.map((r) => (
                          <div key={r.label}>
                            {r.users.length === 1 ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setDemoUser(r.users[0].name);
                                  navigate(r.path);
                                  setMobileOpen(false);
                                }}
                                className="cursor-pointer rounded-lg py-2.5"
                              >
                                <r.icon className="mr-2 h-4 w-4 shrink-0" />
                                {r.users[0].label}
                              </DropdownMenuItem>
                            ) : (
                              r.users.map((u) => (
                                <DropdownMenuItem
                                  key={u.name}
                                  onClick={() => {
                                    setDemoUser(u.name);
                                    navigate(r.path);
                                    setMobileOpen(false);
                                  }}
                                  className="cursor-pointer rounded-lg py-2 pl-8 text-sm"
                                >
                                  {u.label}
                                </DropdownMenuItem>
                              ))
                            )}
                          </div>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}

                {!user && !demoMode ? (
                  <div className="mt-6 flex flex-col gap-2">
                    <Button size="sm" className="h-11 w-full rounded-xl" asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/login">Sign In</Link>
                    </Button>
                    <Button size="sm" variant="secondary" className="h-11 w-full rounded-xl" asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/signup">Get Started</Link>
                    </Button>
                  </div>
                ) : null}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Navbar;
