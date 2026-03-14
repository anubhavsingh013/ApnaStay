import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Menu, X, LogOut, FlaskConical, User, ChevronDown } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import ApnaStayLogo from "@/components/common/ApnaStayLogo";
import { getDemoUser, setDemoUser, subscribeDemoUser, demoRoles } from "@/features/demo/DemoRoleSwitcher";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  const { user, logout, dashboardPath, isAdmin, isOwner, isBroker } = useAuth();
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

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Properties", path: "/properties" },
    ...(user ? [{ label: "Dashboard", path: dashboardPath }] : demoMode && demoDashboardPath ? [{ label: "Dashboard", path: demoDashboardPath }] : []),
  ];

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    // Replace history so back button doesn't return to dashboard
    navigate("/", { replace: true });
  };

  const handleGoToProfile = () => {
    setMobileOpen(false);
    navigate(dashboardPath, { state: { openProfile: true } });
  };

  const protectedPaths = ["/dashboard", "/owner/dashboard", "/admin", "/broker/dashboard", "/owner/profile"];
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
    <header ref={headerRef} className="sticky top-0 z-50 shadow-md bg-foreground">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <ApnaStayLogo />

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => { if (location.pathname === link.path) window.scrollTo(0, 0); }}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.path ? "text-primary" : "text-primary-foreground/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
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
              <DropdownMenuContent align="end" className="min-w-[10rem] w-52 p-2 shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl">
                <div className="px-2.5 py-2 mb-1 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-semibold text-foreground truncate mt-0.5">{displayName}</p>
                </div>
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
              <DropdownMenuContent align="end" className="min-w-[12rem] w-56 p-2 shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl max-h-[70vh] overflow-y-auto">
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

        <button className="md:hidden p-2 text-primary-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-primary-foreground/20 bg-foreground animate-fade-in">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => { setMobileOpen(false); if (location.pathname === link.path) window.scrollTo(0, 0); }}
                className={`text-sm font-medium py-2 ${
                  location.pathname === link.path ? "text-primary" : "text-primary-foreground/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleToggleDemo}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggleDemo(); } }}
                className={`flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${demoMode ? "text-primary bg-primary/10" : "text-primary-foreground/60 hover:bg-primary-foreground/5"}`}
              >
                <span className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" /> Demo Mode
                </span>
                <Switch checked={demoMode} onCheckedChange={handleToggleDemo} className="scale-75 shrink-0" onClick={(e) => e.stopPropagation()} />
              </div>
            )}
            {user && (
              <div className="pt-2 border-t border-primary-foreground/20 space-y-1">
                <Link
                  to={dashboardPath}
                  state={{ openProfile: true }}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 py-2.5 px-2 text-sm font-medium text-primary-foreground/90 rounded-lg hover:bg-primary-foreground/10"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 py-2.5 px-2 text-sm font-medium text-primary-foreground/90 rounded-lg hover:bg-primary-foreground/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
            {!user && demoMode && (
              <div className="pt-2 border-t border-primary-foreground/20">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="w-full inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-2 min-w-0 border-2 border-emerald-400 text-primary-foreground bg-foreground/80"
                    >
                      <span className="h-8 w-8 rounded-full bg-emerald-600/80 flex items-center justify-center shrink-0 border-2 border-emerald-400">
                        <User className="h-4 w-4 text-white" />
                      </span>
                      <span className="text-sm font-semibold truncate flex-1 text-left">{demoUserName}</span>
                      <ChevronDown className="h-4 w-4 text-emerald-400 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[12rem] w-56 p-2 shadow-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl max-h-[70vh] overflow-y-auto ml-4">
                    <p className="text-xs font-semibold text-muted-foreground px-2 pb-2">Switch profile</p>
                    {demoRoles.map((r) => (
                      <div key={r.label}>
                        {r.users.length === 1 ? (
                          <DropdownMenuItem
                            onClick={() => { setDemoUser(r.users[0].name); navigate(r.path); setMobileOpen(false); }}
                            className="cursor-pointer py-2.5 px-2.5 rounded-lg"
                          >
                            <r.icon className="h-4 w-4 mr-2.5 shrink-0" />
                            {r.users[0].label}
                          </DropdownMenuItem>
                        ) : (
                          r.users.map((u) => (
                            <DropdownMenuItem
                              key={u.name}
                              onClick={() => { setDemoUser(u.name); navigate(r.path); setMobileOpen(false); }}
                              className="cursor-pointer py-2 px-2.5 pl-8 rounded-lg text-sm"
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
            )}
            {!user && !demoMode && (
              <div className="flex gap-3 pt-2">
                <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full border-0" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button size="sm" className="flex-1 bg-primary text-primary-foreground rounded-full border-0" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
