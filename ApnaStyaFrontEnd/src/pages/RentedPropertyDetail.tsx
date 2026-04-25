import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeProvider, createTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { DEFAULT_PROPERTY_IMAGE } from "@/constants/properties";
import {
  getLeaseById,
  getLeaseDashboard,
  getPropertyById,
  getPublicPropertyById,
  resolvePropertyImageUrl,
  type LeaseDTO,
  type LeaseDashboardDTO,
  type PropertyDTO,
  type RentalApplicationDTO,
  type SavedPropertyDTO,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  IndianRupee,
  CalendarDays,
  User,
  Bookmark,
  MapPin,
  Shield,
  Clock,
  AlertCircle,
} from "lucide-react";

type RentedPageState = {
  lease?: LeaseDTO;
  application?: RentalApplicationDTO;
  saved?: SavedPropertyDTO;
};

const rentedTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0d9488", dark: "#0f766e", light: "#2dd4bf" },
    secondary: { main: "#6366f1" },
    background: { default: "#f8fafc", paper: "#ffffff" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600 },
  },
});

function initialsFromUser(name: string): string {
  const p = name.trim().split(/[\s@._]+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function formatInr(n: number): string {
  return `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
}

function ordinalDay(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** e.g. 27th Feb 2026 */
function formatAgreementDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const mon = MONTH_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${ordinalDay(day)} ${mon} ${year}`;
}

const RentedPropertyDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { leaseId: leaseIdParam } = useParams<{ leaseId: string }>();
  const state = (location.state ?? {}) as RentedPageState;

  const leaseIdNum = useMemo(() => {
    const n = Number(leaseIdParam);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
  }, [leaseIdParam]);

  const [lease, setLease] = useState<LeaseDTO | null>(state.lease ?? null);
  const [dashboard, setDashboard] = useState<LeaseDashboardDTO | null>(null);
  const [propertyMeta, setPropertyMeta] = useState<PropertyDTO | null>(null);
  const [loading, setLoading] = useState(!state.lease);
  const [error, setError] = useState<string | null>(null);

  const application = state.application ?? null;
  const saved = state.saved ?? null;

  const loadData = useCallback(async () => {
    if (leaseIdNum == null) {
      setError("Invalid lease link.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const leaseRes = await getLeaseById(leaseIdNum);
      const nextLease = (leaseRes as { data?: LeaseDTO }).data;
      if (!nextLease) {
        setError("We could not load this lease. It may have been removed or you may not have access.");
        setLease(null);
        return;
      }
      setLease(nextLease);

      const [dashRes, propTry] = await Promise.all([
        getLeaseDashboard(leaseIdNum).catch(() => null),
        getPropertyById(nextLease.propertyId).catch(() => null),
      ]);
      if (dashRes) {
        const d = (dashRes as { data?: LeaseDashboardDTO }).data;
        if (d) setDashboard(d);
      }
      let prop = (propTry as { data?: PropertyDTO } | null)?.data ?? null;
      if (!prop) {
        prop = await getPublicPropertyById(nextLease.propertyId);
      }
      setPropertyMeta(prop);
    } catch (e) {
      setLease(null);
      setError((e as Error)?.message ?? "Failed to load rented property details.");
    } finally {
      setLoading(false);
    }
  }, [leaseIdNum]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const heroImage = useMemo(() => {
    const raw = propertyMeta?.images?.[0];
    if (raw) return resolvePropertyImageUrl(String(raw)) || DEFAULT_PROPERTY_IMAGE;
    return DEFAULT_PROPERTY_IMAGE;
  }, [propertyMeta]);

  const locationLine = useMemo(() => {
    if (!propertyMeta) return null;
    const parts = [propertyMeta.address, propertyMeta.city, propertyMeta.state].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }, [propertyMeta]);

  const paidProgress = useMemo(() => {
    if (!dashboard) return 0;
    const total = dashboard.totalPaid + dashboard.totalDue;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((dashboard.totalPaid / total) * 100));
  }, [dashboard]);

  const statusLabel =
    lease?.status === "ACTIVE" ? "Active lease" : lease?.status === "ENDED" ? "Lease ended" : lease?.status ?? "—";

  return (
    <ThemeProvider theme={rentedTheme}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/90 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 py-6 md:py-10 flex-1">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 backdrop-blur"
              onClick={() => navigate("/dashboard")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </Button>
            {lease?.propertyId ? (
              <Link to={`/property/${lease.propertyId}`}>
                <Button type="button" variant="ghost" className="rounded-full text-teal-700 dark:text-teal-300">
                  View listing
                </Button>
              </Link>
            ) : null}
          </div>

          {loading ? (
            <Stack spacing={3}>
              <Skeleton variant="rounded" height={220} className="rounded-3xl" />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Skeleton variant="rounded" height={100} className="flex-1 rounded-2xl" />
                <Skeleton variant="rounded" height={100} className="flex-1 rounded-2xl" />
                <Skeleton variant="rounded" height={100} className="flex-1 rounded-2xl" />
              </Stack>
              <Skeleton variant="rounded" height={280} className="rounded-2xl" />
            </Stack>
          ) : error || !lease ? (
            <Paper
              elevation={0}
              className="rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-10 text-center shadow-xl shadow-slate-200/40 dark:shadow-black/40"
            >
              <AlertCircle className="h-14 w-14 mx-auto text-amber-500 mb-4" />
              <Typography variant="h5" className="!font-semibold !mb-2 text-slate-900 dark:text-slate-100">
                {error ? "Could not load this rental" : "Rented property details unavailable"}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="!max-w-md !mx-auto !mb-6">
                {error ??
                  "Open My Properties from your dashboard, or sign in as the tenant on this lease. If you refreshed the page, we tried to reload your lease from the server."}
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                <Button type="button" variant="outline" onClick={() => void loadData()}>
                  Try again
                </Button>
                <Link to="/dashboard">
                  <Button type="button">Go to Dashboard</Button>
                </Link>
              </Stack>
            </Paper>
          ) : (
            <Stack spacing={3}>
              {/* Hero */}
              <Paper
                elevation={0}
                className="relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl shadow-teal-900/10 dark:shadow-black/50"
              >
                <Box
                  className="absolute inset-0 bg-cover bg-center scale-105"
                  sx={{
                    backgroundImage: `url(${heroImage})`,
                    filter: "brightness(0.55)",
                  }}
                />
                <Box
                  className="absolute inset-0"
                  sx={{
                    background: (t) =>
                      `linear-gradient(135deg, ${alpha(t.palette.primary.dark, 0.85)} 0%, ${alpha("#0f172a", 0.75)} 55%, ${alpha("#020617", 0.9)} 100%)`,
                  }}
                />
                <div className="relative z-10 p-6 md:p-10 text-white">
                  <Stack direction="row" alignItems="center" spacing={1} className="mb-3">
                    <Chip
                      label={
                        <span className="inline-flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" />
                          {statusLabel}
                        </span>
                      }
                      size="small"
                      className="!bg-white/15 !text-white !border !border-white/25 !backdrop-blur-md"
                      variant="outlined"
                    />
                    <Chip
                      label={`Lease #${lease.id}`}
                      size="small"
                      className="!bg-black/20 !text-white/90 !border-white/20"
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="h4" className="!text-white !mb-2 drop-shadow-md line-clamp-2">
                    {lease.propertyTitle}
                  </Typography>
                  {locationLine ? (
                    <Stack direction="row" alignItems="center" spacing={0.75} className="text-white/85 mb-4">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <Typography variant="body2" className="!text-white/90 line-clamp-2">
                        {locationLine}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" className="!text-white/70 !mb-4">
                      Property #{lease.propertyId}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 min-w-[140px]">
                      <p className="text-[11px] uppercase tracking-wider text-white/70">Monthly rent</p>
                      <p className="text-xl font-bold tabular-nums">{formatInr(Number(lease.monthlyRent ?? 0))}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 min-w-[140px]">
                      <p className="text-[11px] uppercase tracking-wider text-white/70">Agreement term</p>
                      <p className="text-sm font-semibold">
                        {formatAgreementDate(lease.startDate)} – {formatAgreementDate(lease.endDate)}
                      </p>
                    </div>
                  </Stack>
                </div>
              </Paper>

              {/* Financial snapshot */}
              {dashboard ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Next due", value: dashboard.nextDueDate ? new Date(dashboard.nextDueDate).toLocaleDateString() : "—", sub: formatInr(dashboard.nextDueAmount), accent: "from-teal-500/20 to-cyan-500/10" },
                    { label: "Overdue", value: formatInr(dashboard.overdueAmount), sub: dashboard.overdueAmount > 0 ? "Action needed" : "All clear", accent: "from-amber-500/20 to-orange-500/10" },
                    { label: "Total paid", value: formatInr(dashboard.totalPaid), sub: "Recorded on ledger", accent: "from-emerald-500/20 to-teal-500/10" },
                    { label: "Outstanding", value: formatInr(dashboard.totalDue), sub: "Including upcoming", accent: "from-indigo-500/15 to-violet-500/10" },
                  ].map((card) => (
                    <Paper
                      key={card.label}
                      elevation={0}
                      className={`rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 bg-gradient-to-br ${card.accent} dark:from-slate-800/50 dark:to-slate-900/50 backdrop-blur-sm`}
                    >
                      <Typography variant="caption" color="text.secondary" className="!uppercase !tracking-wide !font-semibold">
                        {card.label}
                      </Typography>
                      <Typography variant="h6" className="!mt-1 !font-bold tabular-nums">
                        {card.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" className="!block !mt-0.5">
                        {card.sub}
                      </Typography>
                    </Paper>
                  ))}
                </div>
              ) : null}

              {dashboard && dashboard.totalPaid + dashboard.totalDue > 0 ? (
                <Paper elevation={0} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
                  <Stack direction="row" justifyContent="space-between" alignItems="center" className="mb-2">
                    <Typography variant="subtitle2" className="!font-semibold text-slate-700 dark:text-slate-200">
                      Payment progress
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {paidProgress}% toward cleared balance
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={paidProgress}
                    className="!h-2.5 !rounded-full"
                    sx={{
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                      "& .MuiLinearProgress-bar": { borderRadius: 999, background: "linear-gradient(90deg, #0d9488, #6366f1)" },
                    }}
                  />
                </Paper>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Paper elevation={0} className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 md:p-6 bg-white/90 dark:bg-slate-900/70 backdrop-blur shadow-lg shadow-slate-200/30 dark:shadow-black/30">
                  <Stack direction="row" alignItems="center" spacing={1} className="mb-4">
                    <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                      <IndianRupee className="h-5 w-5 text-teal-700 dark:text-teal-300" />
                    </div>
                    <Typography variant="h6">Lease details</Typography>
                  </Stack>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { k: "Monthly rent", v: formatInr(Number(lease.monthlyRent ?? 0)) },
                      { k: "Security deposit", v: formatInr(Number(lease.securityDeposit ?? 0)) },
                      { k: "Rent due day", v: `${ordinalDay(lease.dueDayOfMonth)} of each month` },
                      { k: "Start date", v: formatAgreementDate(lease.startDate) },
                      { k: "End date", v: formatAgreementDate(lease.endDate) },
                      { k: "Last updated", v: new Date(lease.updatedAt).toLocaleString() },
                    ].map((row) => (
                      <div key={row.k} className="rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/80 p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{row.k}</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{row.v}</p>
                      </div>
                    ))}
                  </div>
                </Paper>

                <Paper elevation={0} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 md:p-6 bg-white/90 dark:bg-slate-900/70 backdrop-blur shadow-lg shadow-slate-200/30 dark:shadow-black/30">
                  <Stack direction="row" alignItems="center" spacing={1} className="mb-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
                    </div>
                    <Typography variant="h6">People</Typography>
                  </Stack>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar className="!bg-teal-600 !text-sm !font-bold">{initialsFromUser(lease.ownerUserName)}</Avatar>
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          Owner
                        </Typography>
                        <Typography variant="body2" className="!font-semibold">
                          {lease.ownerUserName}
                        </Typography>
                      </div>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar className="!bg-indigo-600 !text-sm !font-bold">{initialsFromUser(lease.tenantUserName)}</Avatar>
                      <div>
                        <Typography variant="caption" color="text.secondary">
                          Tenant
                        </Typography>
                        <Typography variant="body2" className="!font-semibold">
                          {lease.tenantUserName}
                        </Typography>
                      </div>
                    </Stack>
                  </Stack>

                  {application ? (
                    <>
                      <Divider className="!my-4" />
                      <Stack direction="row" alignItems="center" spacing={1} className="mb-2">
                        <CalendarDays className="h-4 w-4 text-slate-500" />
                        <Typography variant="subtitle2" className="!font-semibold">
                          Original application
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Move-in {new Date(application.moveInDate).toLocaleDateString()} · {application.leaseMonths} months · proposed{" "}
                        {formatInr(Number(application.proposedRent ?? 0))}
                      </Typography>
                    </>
                  ) : null}

                  {saved ? (
                    <>
                      <Divider className="!my-4" />
                      <Stack direction="row" alignItems="center" spacing={1} className="mb-2">
                        <Bookmark className="h-4 w-4 text-slate-500" />
                        <Typography variant="subtitle2" className="!font-semibold">
                          Saved snapshot
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {saved.city}, {saved.state} · {formatInr(Number(saved.price ?? 0))}/mo
                      </Typography>
                    </>
                  ) : null}
                </Paper>
              </div>

              {dashboard?.recentPayments?.length ? (
                <Paper elevation={0} className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white/90 dark:bg-slate-900/70 backdrop-blur">
                  <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 bg-slate-50/80 dark:bg-slate-800/40">
                    <Clock className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    <Typography variant="subtitle1" className="!font-semibold">
                      Recent payments
                    </Typography>
                  </div>
                  <List disablePadding className="!py-0">
                    {dashboard.recentPayments.slice(0, 8).map((p, i) => (
                      <ListItem
                        key={p.id ?? i}
                        className="!border-b !border-slate-100 dark:!border-slate-800 last:!border-b-0"
                        secondaryAction={
                          <Chip
                            label={p.status}
                            size="small"
                            color={p.status === "PAID" ? "success" : p.status === "OVERDUE" ? "error" : "default"}
                            variant={p.status === "PAID" ? "filled" : "outlined"}
                            className="!mr-2"
                          />
                        }
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" className="!font-medium">
                              {formatInr(Number(p.amountDue ?? 0))} · {p.periodMonth}
                            </Typography>
                          }
                          secondary={
                            p.paidAt
                              ? `Paid ${new Date(p.paidAt).toLocaleDateString()}`
                              : p.dueDate
                                ? `Due ${new Date(p.dueDate).toLocaleDateString()}`
                                : undefined
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              ) : null}

              <Alert severity="info" className="!rounded-2xl !border !border-sky-200/80 dark:!border-sky-800/60 !bg-sky-50/90 dark:!bg-sky-950/30">
                Rent reminders and payment records are managed by your owner or admin. Contact them from the property listing if you need help.
              </Alert>
            </Stack>
          )}
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
};

export default RentedPropertyDetail;
