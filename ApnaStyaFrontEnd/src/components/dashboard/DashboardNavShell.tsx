import { useState, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DashboardNavAccent = "sky" | "violet";

export type DashboardNavTab = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export type DashboardNavUser = {
  displayName: string;
  subtitle?: string;
  roleLabel: string;
  avatarUrl?: string | null;
  initials?: string;
  fallbackIcon?: ComponentType<{ className?: string }>;
  headerExtra?: ReactNode;
};

const ACCENT: Record<
  DashboardNavAccent,
  {
    bar: string;
    sidebarBorder: string;
    rolePill: string;
    active: string;
    inactive: string;
    mobilePillActive: string;
    mobilePillInactive: string;
    avatarRing: string;
    headerTint: string;
  }
> = {
  sky: {
    bar: "border-sky-500/30 bg-sky-50/90 dark:bg-slate-900/90 dark:border-sky-500/20",
    sidebarBorder: "border-l-sky-500/80 dark:border-l-sky-400/60",
    rolePill: "bg-sky-500/15 dark:bg-sky-400/20 text-sky-800 dark:text-sky-200",
    active: "border-sky-300 dark:border-sky-600/60 bg-sky-50/90 dark:bg-sky-900/35 text-sky-900 dark:text-sky-100 shadow-sm",
    inactive:
      "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100",
    mobilePillActive: "border-sky-500/45 bg-sky-50 dark:bg-sky-900/25 text-sky-800 dark:text-sky-200 shadow-sm",
    mobilePillInactive: "border-slate-200 dark:border-slate-700 bg-muted/50 text-muted-foreground hover:bg-muted",
    avatarRing: "ring-2 ring-sky-400/35 dark:ring-sky-500/40",
    headerTint: "from-sky-500/12 via-sky-500/5 to-transparent dark:from-sky-400/15",
  },
  violet: {
    bar: "border-violet-500/30 bg-violet-50/90 dark:bg-slate-900/90 dark:border-violet-500/20",
    sidebarBorder: "border-l-violet-500/80 dark:border-l-violet-400/60",
    rolePill: "bg-violet-500/15 dark:bg-violet-400/20 text-violet-800 dark:text-violet-200",
    active: "border-violet-300 dark:border-violet-600/60 bg-violet-50/90 dark:bg-violet-900/35 text-violet-900 dark:text-violet-100 shadow-sm",
    inactive:
      "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100",
    mobilePillActive: "border-violet-500/45 bg-violet-50 dark:bg-violet-900/25 text-violet-800 dark:text-violet-200 shadow-sm",
    mobilePillInactive: "border-slate-200 dark:border-slate-700 bg-muted/50 text-muted-foreground hover:bg-muted",
    avatarRing: "ring-2 ring-violet-400/35 dark:ring-violet-500/40",
    headerTint: "from-violet-500/12 via-violet-500/5 to-transparent dark:from-violet-400/15",
  },
};

function makeInitials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.length >= 2 ? t.slice(0, 2).toUpperCase() : t.slice(0, 1).toUpperCase();
}

function SidebarAvatar({
  url,
  initials,
  FallbackIcon,
  ringClass,
  sizeClass,
}: {
  url?: string | null;
  initials: string;
  FallbackIcon?: ComponentType<{ className?: string }>;
  ringClass: string;
  sizeClass: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(url) && !broken;
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-slate-700 dark:text-slate-200 font-semibold tracking-tight",
        ringClass,
        sizeClass,
      )}
    >
      {showImg ? (
        <img
          src={url!}
          alt=""
          className="h-full w-full object-cover object-center scale-[1.02]"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : FallbackIcon ? (
        <FallbackIcon className="h-[45%] w-[45%] opacity-90" />
      ) : (
        <span className="text-[0.65em] leading-none">{initials}</span>
      )}
    </div>
  );
}

function UserCard({
  user,
  accent,
  compact,
}: {
  user: DashboardNavUser;
  accent: DashboardNavAccent;
  compact?: boolean;
}) {
  const a = ACCENT[accent];
  const initials = user.initials ?? makeInitials(user.displayName);
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-br p-3",
        a.headerTint,
        compact ? "to-background/80" : "to-white/80 dark:to-slate-900/40",
      )}
    >
      {/* Narrow sidebar: avatar + text in one row reads cleanly and aligns with nav below */}
      <div className="flex items-start gap-3 text-left">
        <SidebarAvatar
          url={user.avatarUrl}
          initials={initials}
          FallbackIcon={user.fallbackIcon}
          ringClass={a.avatarRing}
          sizeClass={compact ? "h-12 w-12 text-xs" : "h-14 w-14 text-sm"}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <p
              className={cn("min-w-0 max-w-full truncate font-semibold text-foreground leading-snug", compact ? "text-sm" : "text-[15px] leading-tight")}
              title={user.displayName}
            >
              {user.displayName}
            </p>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                a.rolePill,
              )}
            >
              {user.roleLabel}
            </span>
          </div>
          {user.subtitle ? (
            <p
              className="line-clamp-2 break-words text-[11px] leading-snug text-muted-foreground"
              title={user.subtitle}
            >
              {user.subtitle}
            </p>
          ) : null}
          {user.headerExtra ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1 pt-0.5 [&>*]:max-w-full">{user.headerExtra}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type DashboardNavShellProps = {
  accent: DashboardNavAccent;
  tabs: DashboardNavTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  user: DashboardNavUser;
  renderTabBadge?: (tabId: string) => ReactNode;
  /** Sets `data-demo-allow` on interactive nav regions for demo tooling */
  dataDemoAllow?: boolean;
  children: ReactNode;
};

export function DashboardNavShell({
  accent,
  tabs,
  activeTab,
  onTabChange,
  user,
  renderTabBadge,
  dataDemoAllow,
  children,
}: DashboardNavShellProps) {
  const a = ACCENT[accent];
  const demoProp = dataDemoAllow ? { "data-demo-allow": true as const } : {};

  const renderNavButton = (t: DashboardNavTab, opts: { dense?: boolean; onPick?: () => void }) => {
    const isActive = activeTab === t.id;
    const badge = renderTabBadge?.(t.id);
    const Icon = t.icon;
    return (
      <button
        type="button"
        key={t.id}
        onClick={() => {
          onTabChange(t.id);
          opts.onPick?.();
        }}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-xl text-left font-medium transition-all duration-200 border",
          opts.dense ? "px-2.5 py-2 text-sm" : "px-3 py-2.5 text-sm",
          isActive ? a.active : a.inactive,
        )}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-90" />
        <span className="truncate flex-1 min-w-0">{t.label}</span>
        {badge ? <span className="shrink-0 flex items-center">{badge}</span> : null}
      </button>
    );
  };

  const sidebarCard = (opts: { sticky?: boolean; compactUser?: boolean }) => (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/85 p-4 shadow-lg shadow-slate-200/40 dark:shadow-slate-950/50 ring-1 ring-slate-100/90 dark:ring-slate-800/80 border-l-4",
        a.sidebarBorder,
        opts.sticky && "md:sticky md:top-20",
      )}
    >
      <UserCard user={user} accent={accent} compact={opts.compactUser} />
      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-2">Navigation</p>
        <nav className="space-y-1 max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain pr-0.5 -mr-0.5" aria-label="Dashboard sections">
          {tabs.map((t) => renderNavButton(t, {}))}
        </nav>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8">
      {/* Mobile: same nav treatment as desktop (below header), so tabs are not duplicated in the hamburger menu. */}
      <aside className="md:hidden w-full shrink-0" {...demoProp}>
        {sidebarCard({ compactUser: true })}
      </aside>

      <aside className="hidden md:block w-60 lg:w-64 shrink-0" {...demoProp}>
        {sidebarCard({ sticky: true })}
      </aside>

      <div className="flex-1 min-w-0 space-y-4">{children}</div>
    </div>
  );
}
