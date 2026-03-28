import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { type LeaseDTO, type RentalApplicationDTO, type SavedPropertyDTO } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronLeft, Home, IndianRupee, CalendarDays, User, Bookmark } from "lucide-react";

type RentedPageState = {
  lease?: LeaseDTO;
  application?: RentalApplicationDTO;
  saved?: SavedPropertyDTO;
};

const RentedPropertyDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as RentedPageState;
  const lease = state.lease ?? null;
  const application = state.application ?? null;
  const saved = state.saved ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8 flex-1">
        <div className="mb-5">
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </div>
        {!lease ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center bg-card">
            <p className="text-lg font-semibold text-foreground">Rented property details unavailable</p>
            <p className="text-sm text-muted-foreground mt-1">
              Open this page from My Properties to view complete details without extra API calls.
            </p>
            <div className="mt-4">
              <Link to="/dashboard">
                <Button type="button" variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-card p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Rented Property</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground truncate mt-0.5">{lease.propertyTitle}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Lease #{lease.id} • Property #{lease.propertyId}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md border-2 border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle className="h-3.5 w-3.5" /> {lease.status === "ACTIVE" ? "RENTED" : lease.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Lease Summary</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Monthly Rent</p><p className="font-medium text-foreground">₹{Number(lease.monthlyRent ?? 0).toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Security Deposit</p><p className="font-medium text-foreground">₹{Number(lease.securityDeposit ?? 0).toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Start Date</p><p className="font-medium text-foreground">{new Date(lease.startDate).toLocaleDateString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">End Date</p><p className="font-medium text-foreground">{new Date(lease.endDate).toLocaleDateString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Due Day</p><p className="font-medium text-foreground">{lease.dueDayOfMonth}</p></div>
                  <div><p className="text-xs text-muted-foreground">Updated</p><p className="font-medium text-foreground">{new Date(lease.updatedAt).toLocaleDateString()}</p></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="h-4 w-4" /> People</p>
                <div className="space-y-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">Owner</p><p className="font-medium text-foreground">{lease.ownerUserName}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tenant</p><p className="font-medium text-foreground">{lease.tenantUserName}</p></div>
                </div>
                {application ? (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Application</p>
                    <p className="text-xs text-muted-foreground mt-1">Move-in {new Date(application.moveInDate).toLocaleDateString()} • {application.leaseMonths} months</p>
                    <p className="text-xs text-muted-foreground">Proposed rent ₹{Number(application.proposedRent ?? 0).toLocaleString()}</p>
                  </div>
                ) : null}
                {saved ? (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Bookmark className="h-4 w-4" /> Saved Snapshot</p>
                    <p className="text-xs text-muted-foreground mt-1">{saved.city}, {saved.state} • ₹{Number(saved.price ?? 0).toLocaleString()}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-4 flex flex-wrap gap-2">
              <Link to="/properties">
                <Button type="button" variant="outline"><Home className="h-4 w-4 mr-1" /> Visit Properties</Button>
              </Link>
              <Button type="button" onClick={() => navigate("/dashboard")}>Back to My Properties</Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default RentedPropertyDetail;
