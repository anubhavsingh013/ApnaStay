import type { ComponentType } from "react";
import {
  Heart,
  CalendarDays,
  User,
  LayoutDashboard,
  Bell,
  FileText,
  CreditCard,
} from "lucide-react";

export type TenantDashboardTabDef = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

/** Single source of truth for tenant `/dashboard` section ids and labels (Navbar + Dashboard shell). */
export const TENANT_DASHBOARD_TABS: TenantDashboardTabDef[] = [
  { label: "Overview", icon: LayoutDashboard, id: "overview" },
  { label: "Account", icon: User, id: "profile" },
  { label: "My properties", icon: Heart, id: "my-properties" },
  { label: "Complaints", icon: FileText, id: "complaints" },
  { label: "Bookings", icon: CalendarDays, id: "bookings" },
  { label: "Payments", icon: CreditCard, id: "payments" },
  { label: "Alerts", icon: Bell, id: "notifications" },
];

export const TENANT_DASHBOARD_TAB_IDS = new Set(TENANT_DASHBOARD_TABS.map((t) => t.id));
