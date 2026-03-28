import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError } from "@/lib/app-toast";
import { mapPropertyDtoToProperty } from "@/constants/properties";
import {
  getPropertyById,
  getPublicPropertyById,
  type LeaseDTO,
  type RentalApplicationDTO,
  type SavedPropertyDTO,
} from "@/lib/api";

type PropertyDetailState = {
  lease?: LeaseDTO;
  application?: RentalApplicationDTO;
  saved?: SavedPropertyDTO;
};

export default function DashboardPropertyDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { propertyId } = useParams();
  const state = (location.state ?? {}) as PropertyDetailState;
  const pid = Number(propertyId);
  const [loading, setLoading] = useState(true);
  const [propertyTitle, setPropertyTitle] = useState("");
  const [propertyLocation, setPropertyLocation] = useState("");
  const [propertyPrice, setPropertyPrice] = useState<number>(0);

  useEffect(() => {
    if (!Number.isFinite(pid) || pid <= 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getPropertyById(pid)
      .then((res) => {
        const data = (res as { data?: unknown }).data;
        if (!data || typeof data !== "object") return;
        const p = mapPropertyDtoToProperty(data as Parameters<typeof mapPropertyDtoToProperty>[0]);
        setPropertyTitle(p.title ?? "");
        setPropertyLocation(p.location ?? "");
        setPropertyPrice(Number(p.price ?? 0));
      })
      .catch(() =>
        getPublicPropertyById(pid)
          .then((data) => {
            if (!data || typeof data !== "object") return;
            const p = mapPropertyDtoToProperty(data as Parameters<typeof mapPropertyDtoToProperty>[0]);
            setPropertyTitle(p.title ?? "");
            setPropertyLocation(p.location ?? "");
            setPropertyPrice(Number(p.price ?? 0));
          })
          .catch((err) => toastError("Could not load property details", (err as Error)?.message)),
      )
      .finally(() => setLoading(false));
  }, [pid]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{loading ? "Loading..." : propertyTitle || "Property Details"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Property ID</p>
                <p className="font-medium">{Number.isFinite(pid) && pid > 0 ? pid : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{propertyLocation || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-medium">₹{Number(propertyPrice ?? 0).toLocaleString()}/month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {state.lease && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Rented Details</span>
                <Badge>{state.lease.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <p className="text-sm">Lease ID: {state.lease.id}</p>
              <p className="text-sm">Due Day: {state.lease.dueDayOfMonth}</p>
              <p className="text-sm">Tenant: {state.lease.tenantUserName}</p>
              <p className="text-sm">Owner: {state.lease.ownerUserName}</p>
              <p className="text-sm">Start: {new Date(state.lease.startDate).toLocaleDateString()}</p>
              <p className="text-sm">End: {new Date(state.lease.endDate).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        )}

        {state.application && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>My Application Details</span>
                <Badge variant="secondary">{state.application.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <p className="text-sm">Application ID: {state.application.id}</p>
              <p className="text-sm">Proposed Rent: ₹{Number(state.application.proposedRent ?? 0).toLocaleString()}</p>
              <p className="text-sm">Lease Months: {state.application.leaseMonths}</p>
              <p className="text-sm">Move-In: {new Date(state.application.moveInDate).toLocaleDateString()}</p>
              <p className="text-sm sm:col-span-2">Owner: {state.application.ownerUserName}</p>
            </CardContent>
          </Card>
        )}

        {state.saved && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Saved Property Details</span>
                <Badge variant="outline">SAVED</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <p className="text-sm">Saved ID: {state.saved.id}</p>
              <p className="text-sm">Saved At: {new Date(state.saved.savedAt).toLocaleString()}</p>
              <p className="text-sm">City: {state.saved.city || "—"}</p>
              <p className="text-sm">State: {state.saved.state || "—"}</p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
