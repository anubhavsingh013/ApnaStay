import { createContext, useContext, useState, type ReactNode } from "react";
import type { PropertyDTO } from "@/lib/api";
import { mockProperties, mockUsers, mockRoles } from "@/constants/mockData";

// ── Types ──
export interface Complaint {
  id: number;
  title: string;
  description: string;
  raisedBy: string;
  raisedByRole: string;
  againstUser: string;
  againstRole: string;
  propertyId: number;
  propertyTitle: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  resolvedAt?: string;
  adminNote?: string;
}

export interface Booking {
  id: number;
  propertyId: number;
  propertyTitle: string;
  tenantName: string;
  ownerName: string;
  brokerName?: string;
  visitDate: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  type: "VISIT" | "RENTAL";
  createdAt: string;
  note?: string;
}

export interface Payment {
  id: number;
  propertyId: number;
  propertyTitle: string;
  tenantName: string;
  ownerName: string;
  amount: number;
  month: string;
  status: "PAID" | "PENDING" | "OVERDUE";
  paidAt?: string;
}

export interface Notification {
  id: number;
  targetUser: string;
  targetRole: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ACTION";
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface OwnerProfile {
  id: number;
  ownerUser: string;
  name: string;
  gender: string;
  dob: string;
  aadhar: string;
  mobile: string;
  email: string;
  village: string;
  postOffice: string;
  policeStation: string;
  state: string;
  district: string;
  pincode: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface BrokerProfile {
  id: number;
  brokerUser: string;
  name: string;
  email: string;
  mobile: string;
  firmName: string;
  licenseNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

export interface TenantProfile {
  id: number;
  tenantUser: string;
  name: string;
  gender: string;
  dob: string;
  email: string;
  mobile: string;
  idType: string;
  idNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

/** Unified profile for admin list: Owner | Broker | Tenant */
export type AdminProfileItem =
  | (OwnerProfile & { profileType: "OWNER" })
  | (BrokerProfile & { profileType: "BROKER" })
  | (TenantProfile & { profileType: "USER" });

export interface DemoUser {
  userId: number;
  userName: string;
  email: string;
  role: { roleId: number; roleName: string };
  enabled: boolean;
  accountNonLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  isTwoFactorEnabled: boolean;
  credentialsExpiryDate: string;
  accountExpiryDate: string;
}

interface DemoDataContextType {
  demoMode: boolean;
  /** Toggle demo mode. When turning OFF, optionally run onTurnOff (e.g. logout + redirect). */
  toggleDemoMode: (onTurnOff?: () => void) => void;

  properties: PropertyDTO[];
  addProperty: (p: Omit<PropertyDTO, "id" | "createdAt" | "updatedAt">) => PropertyDTO;
  updateProperty: (id: number, data: Partial<PropertyDTO>) => void;
  deleteProperty: (id: number) => void;
  approveProperty: (id: number) => void;
  rejectProperty: (id: number) => void;

  users: DemoUser[];
  updateUserRole: (userId: number, roleName: string) => void;
  toggleUserLock: (userId: number) => void;
  toggleUserEnabled: (userId: number) => void;
  roles: { roleId: number; roleName: string }[];

  complaints: Complaint[];
  raiseComplaint: (c: Omit<Complaint, "id" | "createdAt" | "status">) => void;
  updateComplaintStatus: (id: number, status: Complaint["status"], adminNote?: string) => void;

  bookings: Booking[];
  requestBooking: (b: Omit<Booking, "id" | "createdAt" | "status">) => void;
  updateBookingStatus: (id: number, status: Booking["status"], note?: string) => void;

  payments: Payment[];
  makePayment: (id: number) => void;

  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: number) => void;
  getNotificationsFor: (user: string, role: string) => Notification[];

  ownerProfiles: OwnerProfile[];
  submitOwnerProfile: (p: Omit<OwnerProfile, "id" | "status" | "submittedAt">) => void;
  approveOwnerProfile: (id: number, adminNote?: string) => void;
  rejectOwnerProfile: (id: number, adminNote?: string) => void;

  brokerProfiles: BrokerProfile[];
  submitBrokerProfile: (p: Omit<BrokerProfile, "id" | "status" | "submittedAt">) => void;
  approveBrokerProfile: (id: number, adminNote?: string) => void;
  rejectBrokerProfile: (id: number, adminNote?: string) => void;

  tenantProfiles: TenantProfile[];
  updateTenantProfile: (p: Omit<TenantProfile, "id" | "status" | "submittedAt">) => void;
  submitTenantProfile: (p: Omit<TenantProfile, "id" | "status" | "submittedAt">) => void;
  approveTenantProfile: (id: number, adminNote?: string) => void;
  rejectTenantProfile: (id: number, adminNote?: string) => void;

  /** All profiles combined for admin list (with profileType) */
  getAllProfiles: () => AdminProfileItem[];
  isOwnerProfileApproved: (username: string) => boolean;
  isBrokerProfileApproved: (username: string) => boolean;
  isTenantProfileApproved: (username: string) => boolean;
}

const DemoDataContext = createContext<DemoDataContextType | null>(null);

// ── Initial seed data ──
const seedComplaints: Complaint[] = [
  { id: 1, title: "Water leakage in bathroom", description: "Persistent water leakage from ceiling in master bathroom.", raisedBy: "sneha_tenant", raisedByRole: "TENANT", againstUser: "rajesh_owner", againstRole: "OWNER", propertyId: 1001, propertyTitle: "Skyline Residency 2BHK", status: "OPEN", priority: "HIGH", createdAt: "2026-03-05T10:00:00Z" },
  { id: 2, title: "Noise disturbance from neighbors", description: "Loud music playing late at night, affecting sleep.", raisedBy: "sneha_tenant", raisedByRole: "TENANT", againstUser: "rajesh_owner", againstRole: "OWNER", propertyId: 1001, propertyTitle: "Skyline Residency 2BHK", status: "IN_PROGRESS", priority: "MEDIUM", createdAt: "2026-03-02T14:00:00Z", adminNote: "Owner has been notified. Investigating." },
];

const seedBookings: Booking[] = [
  { id: 1, propertyId: 1001, propertyTitle: "Skyline Residency 2BHK", tenantName: "sneha_tenant", ownerName: "rajesh_owner", visitDate: "2026-03-10T11:00:00Z", status: "APPROVED", type: "RENTAL", createdAt: "2026-02-20T09:00:00Z", note: "Monthly rental agreement" },
  { id: 2, propertyId: 1003, propertyTitle: "Budget PG for Students", tenantName: "sneha_tenant", ownerName: "rajesh_owner", visitDate: "2026-03-12T15:00:00Z", status: "REQUESTED", type: "VISIT", createdAt: "2026-03-07T10:00:00Z" },
  { id: 3, propertyId: 1002, propertyTitle: "Green Valley Villa", tenantName: "sneha_tenant", ownerName: "rajesh_owner", brokerName: "amit_broker", visitDate: "2026-03-15T14:00:00Z", status: "REQUESTED", type: "VISIT", createdAt: "2026-03-07T12:00:00Z" },
];

const seedPayments: Payment[] = [
  { id: 1, propertyId: 1001, propertyTitle: "Skyline Residency 2BHK", tenantName: "sneha_tenant", ownerName: "rajesh_owner", amount: 25000, month: "March 2026", status: "PAID", paidAt: "2026-03-01T10:00:00Z" },
  { id: 2, propertyId: 1001, propertyTitle: "Skyline Residency 2BHK", tenantName: "sneha_tenant", ownerName: "rajesh_owner", amount: 25000, month: "April 2026", status: "PENDING" },
];

const seedNotifications: Notification[] = [
  { id: 1, targetUser: "rajesh_owner", targetRole: "OWNER", title: "New complaint raised", message: "Tenant sneha_tenant raised a complaint about water leakage.", type: "WARNING", read: false, createdAt: "2026-03-05T10:00:00Z" },
  { id: 2, targetUser: "sneha_tenant", targetRole: "TENANT", title: "Visit approved", message: "Your visit to Skyline Residency 2BHK has been approved.", type: "SUCCESS", read: true, createdAt: "2026-02-21T09:00:00Z" },
  { id: 3, targetUser: "admin_user", targetRole: "ADMIN", title: "New property pending", message: "Riverside Plot by rajesh_owner needs approval.", type: "ACTION", read: false, createdAt: "2026-03-06T07:00:00Z" },
  { id: 4, targetUser: "amit_broker", targetRole: "BROKER", title: "Visit scheduled", message: "Client sneha_tenant wants to visit Green Valley Villa.", type: "INFO", read: false, createdAt: "2026-03-07T12:00:00Z" },
  { id: 5, targetUser: "rajesh_owner", targetRole: "OWNER", title: "Visit request", message: "sneha_tenant wants to visit Budget PG for Students.", type: "ACTION", read: false, createdAt: "2026-03-07T10:00:00Z" },
];

const seedBrokerProfiles: BrokerProfile[] = [
  { id: 101, brokerUser: "amit_broker", name: "Amit Kumar", email: "amit.broker@gmail.com", mobile: "+91 98765 11111", firmName: "Prime Realty", licenseNumber: "RERA-KA-2024-001", address: "45, MG Road", city: "Bangalore", state: "Karnataka", pincode: "560001", status: "APPROVED", submittedAt: "2026-02-01T10:00:00Z", reviewedAt: "2026-02-02T12:00:00Z" },
];

const seedTenantProfiles: TenantProfile[] = [
  { id: 201, tenantUser: "sneha_tenant", name: "Sneha Sharma", gender: "Female", dob: "1995-05-15", email: "sneha@gmail.com", mobile: "+91 98765 43210", idType: "Aadhar", idNumber: "123456789123", address: "12, Indiranagar", city: "Bangalore", state: "Karnataka", pincode: "560038", status: "APPROVED", submittedAt: "2026-02-10T09:00:00Z", reviewedAt: "2026-02-11T10:00:00Z" },
];

const seedOwnerProfiles: OwnerProfile[] = [
  { id: 1, ownerUser: "rajesh_owner", name: "Rajesh Kumar", gender: "Male", dob: "1988-03-10", aadhar: "123456789012", mobile: "+91 98765 00001", email: "rajesh@gmail.com", village: "Koramangala", postOffice: "Koramangala HO", policeStation: "Koramangala", state: "KA", district: "Bengaluru Urban", pincode: "560034", status: "APPROVED", submittedAt: "2026-02-05T10:00:00Z", reviewedAt: "2026-02-06T12:00:00Z" },
];

export const DemoDataProvider = ({ children }: { children: ReactNode }) => {
  const [demoMode, setDemoMode] = useState(() => {
    const stored = localStorage.getItem("apnastay_demo_mode");
    return stored === null ? false : stored === "true";
  });
  const [properties, setProperties] = useState<PropertyDTO[]>([...mockProperties]);
  const [users, setUsers] = useState<DemoUser[]>([...mockUsers]);
  const [complaints, setComplaints] = useState<Complaint[]>([...seedComplaints]);
  const [bookings, setBookings] = useState<Booking[]>([...seedBookings]);
  const [payments, setPayments] = useState<Payment[]>([...seedPayments]);
  const [notifications, setNotifications] = useState<Notification[]>([...seedNotifications]);
  const [ownerProfiles, setOwnerProfiles] = useState<OwnerProfile[]>([...seedOwnerProfiles]);
  const [brokerProfiles, setBrokerProfiles] = useState<BrokerProfile[]>([...seedBrokerProfiles]);
  const [tenantProfiles, setTenantProfiles] = useState<TenantProfile[]>([...seedTenantProfiles]);

  const toggleDemoMode = (onTurnOff?: () => void) => {
    setDemoMode(prev => {
      const next = !prev;
      localStorage.setItem("apnastay_demo_mode", String(next));
      if (!next) onTurnOff?.();
      return next;
    });
  };

  const addNotification = (n: Omit<Notification, "id" | "createdAt" | "read">) => {
    const newN: Notification = { ...n, id: Date.now(), createdAt: new Date().toISOString(), read: false };
    setNotifications(prev => [newN, ...prev]);
  };

  const addProperty = (p: Omit<PropertyDTO, "id" | "createdAt" | "updatedAt">) => {
    const newP: PropertyDTO = { ...p, id: Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setProperties(prev => [...prev, newP]);
    addNotification({ targetUser: "admin_user", targetRole: "ADMIN", title: "New property listed", message: `${p.ownerUserName} listed "${p.title}" — pending approval.`, type: "ACTION" });
    return newP;
  };

  const updateProperty = (id: number, data: Partial<PropertyDTO>) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
  };

  const deleteProperty = (id: number) => { setProperties(prev => prev.filter(p => p.id !== id)); };

  const approveProperty = (id: number) => {
    const prop = properties.find(p => p.id === id);
    updateProperty(id, { status: "AVAILABLE" });
    if (prop) addNotification({ targetUser: prop.ownerUserName, targetRole: "OWNER", title: "Property approved", message: `"${prop.title}" is now live and visible to tenants.`, type: "SUCCESS" });
  };

  const rejectProperty = (id: number) => {
    const prop = properties.find(p => p.id === id);
    updateProperty(id, { status: "REJECTED" });
    if (prop) addNotification({ targetUser: prop.ownerUserName, targetRole: "OWNER", title: "Property rejected", message: `"${prop.title}" was rejected. Please review and resubmit.`, type: "WARNING" });
  };

  const updateUserRole = (userId: number, roleName: string) => {
    const role = mockRoles.find(r => r.roleName === roleName);
    if (role) setUsers(prev => prev.map(u => u.userId === userId ? { ...u, role } : u));
  };

  const toggleUserLock = (userId: number) => { setUsers(prev => prev.map(u => u.userId === userId ? { ...u, accountNonLocked: !u.accountNonLocked } : u)); };
  const toggleUserEnabled = (userId: number) => { setUsers(prev => prev.map(u => u.userId === userId ? { ...u, enabled: !u.enabled } : u)); };

  const raiseComplaint = (c: Omit<Complaint, "id" | "createdAt" | "status">) => {
    const newC: Complaint = { ...c, id: Date.now(), createdAt: new Date().toISOString(), status: "OPEN" };
    setComplaints(prev => [...prev, newC]);
    addNotification({ targetUser: "admin_user", targetRole: "ADMIN", title: "New complaint", message: `${c.raisedBy} raised: "${c.title}"`, type: "WARNING" });
    addNotification({ targetUser: c.againstUser, targetRole: c.againstRole, title: "Complaint against you", message: `${c.raisedBy} raised: "${c.title}"`, type: "WARNING" });
  };

  const updateComplaintStatus = (id: number, status: Complaint["status"], adminNote?: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, adminNote: adminNote || c.adminNote, resolvedAt: status === "RESOLVED" ? new Date().toISOString() : c.resolvedAt } : c));
    const comp = complaints.find(c => c.id === id);
    if (comp) addNotification({ targetUser: comp.raisedBy, targetRole: comp.raisedByRole, title: `Complaint ${status.toLowerCase()}`, message: `Your complaint "${comp.title}" is now ${status}.`, type: "INFO" });
  };

  const requestBooking = (b: Omit<Booking, "id" | "createdAt" | "status">) => {
    const newB: Booking = { ...b, id: Date.now(), createdAt: new Date().toISOString(), status: "REQUESTED" };
    setBookings(prev => [...prev, newB]);
    addNotification({ targetUser: b.ownerName, targetRole: "OWNER", title: `${b.type === "VISIT" ? "Visit" : "Rental"} request`, message: `${b.tenantName} wants to ${b.type === "VISIT" ? "visit" : "rent"} "${b.propertyTitle}".`, type: "ACTION" });
    if (b.brokerName) addNotification({ targetUser: b.brokerName, targetRole: "BROKER", title: "Client booking", message: `${b.tenantName} requested ${b.type.toLowerCase()} for "${b.propertyTitle}".`, type: "INFO" });
  };

  const updateBookingStatus = (id: number, status: Booking["status"], note?: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status, note: note || b.note } : b));
    const booking = bookings.find(b => b.id === id);
    if (booking) addNotification({ targetUser: booking.tenantName, targetRole: "TENANT", title: `Booking ${status.toLowerCase()}`, message: `Your ${booking.type.toLowerCase()} for "${booking.propertyTitle}" has been ${status.toLowerCase()}.`, type: status === "APPROVED" ? "SUCCESS" : "WARNING" });
  };

  const makePayment = (id: number) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "PAID" as const, paidAt: new Date().toISOString() } : p));
    const payment = payments.find(p => p.id === id);
    if (payment) addNotification({ targetUser: payment.ownerName, targetRole: "OWNER", title: "Payment received", message: `₹${payment.amount.toLocaleString()} for "${payment.propertyTitle}" (${payment.month}) received from ${payment.tenantName}.`, type: "SUCCESS" });
  };

  const markNotificationRead = (id: number) => { setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); };

  const getNotificationsFor = (user: string, role: string) =>
    notifications.filter(n => n.targetUser === user || n.targetRole === role.toUpperCase());

  const submitOwnerProfile = (p: Omit<OwnerProfile, "id" | "status" | "submittedAt">) => {
    setOwnerProfiles(prev => {
      const existing = prev.findIndex(op => op.ownerUser === p.ownerUser);
      const profile: OwnerProfile = { ...p, id: Date.now(), status: "PENDING", submittedAt: new Date().toISOString() };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = profile;
        return updated;
      }
      return [...prev, profile];
    });
    addNotification({ targetUser: "admin_user", targetRole: "ADMIN", title: "Profile review needed", message: `${p.ownerUser} submitted their profile for verification.`, type: "ACTION" });
  };

  const approveOwnerProfile = (id: number, adminNote?: string) => {
    setOwnerProfiles(prev => prev.map(p => p.id === id ? { ...p, status: "APPROVED" as const, reviewedAt: new Date().toISOString(), adminNote } : p));
    const profile = ownerProfiles.find(p => p.id === id);
    if (profile) addNotification({ targetUser: profile.ownerUser, targetRole: "OWNER", title: "Profile approved", message: "Your profile has been verified and approved by admin.", type: "SUCCESS" });
  };

  const rejectOwnerProfile = (id: number, adminNote?: string) => {
    setOwnerProfiles(prev => prev.map(p => p.id === id ? { ...p, status: "REJECTED" as const, reviewedAt: new Date().toISOString(), adminNote } : p));
    const profile = ownerProfiles.find(p => p.id === id);
    if (profile) addNotification({ targetUser: profile.ownerUser, targetRole: "OWNER", title: "Profile rejected", message: `Your profile was rejected. ${adminNote || "Please update and resubmit."}`, type: "WARNING" });
  };

  const submitBrokerProfile = (p: Omit<BrokerProfile, "id" | "status" | "submittedAt">) => {
    setBrokerProfiles(prev => {
      const existing = prev.findIndex(bp => bp.brokerUser === p.brokerUser);
      const profile: BrokerProfile = { ...p, id: Date.now(), status: "PENDING", submittedAt: new Date().toISOString() };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = profile;
        return updated;
      }
      return [...prev, profile];
    });
    addNotification({ targetUser: "admin_user", targetRole: "ADMIN", title: "Broker profile review needed", message: `${p.brokerUser} submitted their broker profile for verification.`, type: "ACTION" });
  };

  const approveBrokerProfile = (id: number, adminNote?: string) => {
    setBrokerProfiles(prev => prev.map(p => p.id === id ? { ...p, status: "APPROVED" as const, reviewedAt: new Date().toISOString(), adminNote } : p));
    const profile = brokerProfiles.find(p => p.id === id);
    if (profile) addNotification({ targetUser: profile.brokerUser, targetRole: "BROKER", title: "Profile approved", message: "Your broker profile has been verified and approved by admin.", type: "SUCCESS" });
  };

  const rejectBrokerProfile = (id: number, adminNote?: string) => {
    setBrokerProfiles(prev => prev.map(p => p.id === id ? { ...p, status: "REJECTED" as const, reviewedAt: new Date().toISOString(), adminNote } : p));
    const profile = brokerProfiles.find(p => p.id === id);
    if (profile) addNotification({ targetUser: profile.brokerUser, targetRole: "BROKER", title: "Profile rejected", message: `Your broker profile was rejected. ${adminNote || "Please update and resubmit."}`, type: "WARNING" });
  };

  const updateTenantProfile = (p: Omit<TenantProfile, "id" | "status" | "submittedAt">) => {
    setTenantProfiles(prev => {
      const existing = prev.findIndex(tp => tp.tenantUser === p.tenantUser);
      const base = { ...p, status: "PENDING" as const, submittedAt: new Date().toISOString() };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...prev[existing], ...base, id: prev[existing].id };
        return updated;
      }
      return [...prev, { ...base, id: Date.now() }];
    });
  };

  const submitTenantProfile = (p: Omit<TenantProfile, "id" | "status" | "submittedAt">) => {
    setTenantProfiles(prev => {
      const existing = prev.findIndex(tp => tp.tenantUser === p.tenantUser);
      const profile: TenantProfile = { ...p, id: Date.now(), status: "PENDING", submittedAt: new Date().toISOString() };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = profile;
        return updated;
      }
      return [...prev, profile];
    });
    addNotification({ targetUser: "admin_user", targetRole: "ADMIN", title: "Tenant profile review needed", message: `${p.tenantUser} submitted their profile for verification.`, type: "ACTION" });
  };

  const approveTenantProfile = (id: number, adminNote?: string) => {
    setTenantProfiles(prev => prev.map(p => p.id === id ? { ...p, status: "APPROVED" as const, reviewedAt: new Date().toISOString(), adminNote } : p));
    const profile = tenantProfiles.find(p => p.id === id);
    if (profile) addNotification({ targetUser: profile.tenantUser, targetRole: "TENANT", title: "Profile approved", message: "Your profile has been verified. You can now request visits and rentals.", type: "SUCCESS" });
  };

  const rejectTenantProfile = (id: number, adminNote?: string) => {
    setTenantProfiles(prev => prev.map(p => p.id === id ? { ...p, status: "REJECTED" as const, reviewedAt: new Date().toISOString(), adminNote } : p));
    const profile = tenantProfiles.find(p => p.id === id);
    if (profile) addNotification({ targetUser: profile.tenantUser, targetRole: "TENANT", title: "Profile rejected", message: `Your profile was rejected. ${adminNote || "Please update and resubmit."}`, type: "WARNING" });
  };

  const getAllProfiles = (): AdminProfileItem[] => {
    const owners: AdminProfileItem[] = ownerProfiles.map(p => ({ ...p, profileType: "OWNER" as const }));
    const brokers: AdminProfileItem[] = brokerProfiles.map(p => ({ ...p, profileType: "BROKER" as const }));
    const tenants: AdminProfileItem[] = tenantProfiles.map(p => ({ ...p, profileType: "USER" as const }));
    return [...owners, ...brokers, ...tenants];
  };

  const isOwnerProfileApproved = (username: string) => {
    const p = ownerProfiles.find(op => op.ownerUser === username);
    return p ? p.status === "APPROVED" : false;
  };

  const isBrokerProfileApproved = (username: string) => {
    const p = brokerProfiles.find(bp => bp.brokerUser === username);
    return p ? p.status === "APPROVED" : false;
  };

  const isTenantProfileApproved = (username: string) => {
    const p = tenantProfiles.find(tp => tp.tenantUser === username);
    return p ? p.status === "APPROVED" : false;
  };

  return (
    <DemoDataContext.Provider value={{
      demoMode, toggleDemoMode,
      properties, addProperty, updateProperty, deleteProperty, approveProperty, rejectProperty,
      users, updateUserRole, toggleUserLock, toggleUserEnabled, roles: mockRoles,
      complaints, raiseComplaint, updateComplaintStatus,
      bookings, requestBooking, updateBookingStatus,
      payments, makePayment,
      notifications, addNotification, markNotificationRead, getNotificationsFor,
      ownerProfiles, submitOwnerProfile, approveOwnerProfile, rejectOwnerProfile,
      brokerProfiles, submitBrokerProfile, approveBrokerProfile, rejectBrokerProfile,
      tenantProfiles, updateTenantProfile, submitTenantProfile, approveTenantProfile, rejectTenantProfile,
      getAllProfiles, isOwnerProfileApproved, isBrokerProfileApproved, isTenantProfileApproved,
    }}>
      {children}
    </DemoDataContext.Provider>
  );
};

export const useDemoData = () => {
  const ctx = useContext(DemoDataContext);
  if (!ctx) throw new Error("useDemoData must be used within DemoDataProvider");
  return ctx;
};
