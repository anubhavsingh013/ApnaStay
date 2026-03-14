import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, User, Briefcase, ShieldCheck, ChevronUp, ChevronDown } from "lucide-react";

export const demoRoles = [
  { label: "Tenant", icon: Users, path: "/dashboard", color: "bg-primary", users: [{ name: "sneha_tenant", label: "Sneha (Tenant)" }] },
  { label: "Owner", icon: User, path: "/owner/dashboard", color: "bg-emerald-600", users: [{ name: "rajesh_owner", label: "Rajesh (Owner)" }] },
  { label: "Broker", icon: Briefcase, path: "/broker/dashboard", color: "bg-amber-600", users: [{ name: "amit_broker", label: "Amit (Broker)" }] },
  { label: "Admin", icon: ShieldCheck, path: "/admin", color: "bg-destructive", users: [{ name: "admin_user", label: "Admin" }] },
];
const roles = demoRoles;

let _demoUser = "sneha_tenant";
let _listeners: Array<() => void> = [];
export const getDemoUser = () => _demoUser;
export const setDemoUser = (u: string) => { _demoUser = u; _listeners.forEach(fn => fn()); };
export const subscribeDemoUser = (fn: () => void) => { _listeners.push(fn); return () => { _listeners = _listeners.filter(l => l !== fn); }; };

const DemoRoleSwitcher = () => {
  const [open, setOpen] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useState(() => {
    const unsub = subscribeDemoUser(() => forceUpdate(x => x + 1));
    return unsub;
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedRole(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = roles.find(r => location.pathname.startsWith(r.path)) || roles[0];

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-2 bg-card border border-border rounded-2xl shadow-2xl p-3 space-y-1 animate-fade-in min-w-[220px] max-h-[70vh] overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground px-2 pb-1">Switch Dashboard & User</p>
          <div className="text-[10px] text-muted-foreground px-2 pb-2">
            Active: <span className="font-semibold text-primary">{_demoUser}</span>
          </div>
          {roles.map((r) => (
            <div key={r.label}>
              <button
                onClick={() => {
                  if (r.users.length === 1) {
                    setDemoUser(r.users[0].name);
                    navigate(r.path);
                    setOpen(false);
                  } else {
                    setExpandedRole(expandedRole === r.label ? null : r.label);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  current.path === r.path ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <r.icon className="h-4 w-4" />
                {r.label}
                {r.users.length > 1 && (
                  <span className="ml-auto">
                    {expandedRole === r.label ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </span>
                )}
              </button>
              {expandedRole === r.label && r.users.length > 1 && (
                <div className="ml-6 space-y-0.5 mt-0.5">
                  {r.users.map(u => (
                    <button
                      key={u.name}
                      onClick={() => {
                        setDemoUser(u.name);
                        navigate(r.path);
                        setOpen(false);
                        setExpandedRole(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        _demoUser === u.name ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`${current.color} text-primary-foreground h-14 w-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform`}
      >
        {open ? <ChevronUp className="h-5 w-5" /> : <current.icon className="h-5 w-5" />}
      </button>
    </div>
  );
};

export default DemoRoleSwitcher;
