import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Shield, LayoutDashboard, LogOut, User, Bell,
  CreditCard, FileSearch, BarChart3, Settings, ClipboardList,
} from "lucide-react";

const NAV_ITEMS = {
  customer: [
    { to: "/dashboard/customer", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/dashboard/customer/transactions", icon: CreditCard, label: "Transactions" },
    { to: "/dashboard/customer/disputes", icon: ClipboardList, label: "Disputes" },
    { to: "/dashboard/customer/notifications", icon: Bell, label: "Notifications" },
  ],
  analyst: [
    { to: "/dashboard/analyst", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/dashboard/analyst/cases", icon: FileSearch, label: "Cases" },
    { to: "/dashboard/analyst/alerts", icon: Bell, label: "Alerts" },
  ],
  manager: [
    { to: "/dashboard/manager", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/dashboard/manager/cases", icon: FileSearch, label: "All Cases" },
    { to: "/dashboard/manager/analytics", icon: BarChart3, label: "Analytics" },
  ],
  admin: [
    { to: "/dashboard/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/dashboard/admin/users", icon: User, label: "Users" },
    { to: "/dashboard/admin/rules", icon: Settings, label: "Fraud Rules" },
    { to: "/dashboard/admin/audit", icon: ClipboardList, label: "Audit Log" },
  ],
  auditor: [
    { to: "/dashboard/auditor", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/dashboard/auditor/transactions", icon: CreditCard, label: "Transactions" },
    { to: "/dashboard/auditor/cases", icon: FileSearch, label: "Cases" },
    { to: "/dashboard/auditor/audit-trail", icon: ClipboardList, label: "Audit Trail" },
  ],
};

const ROLE_LABELS = {
  customer: "Customer",
  analyst: "Fraud Analyst",
  manager: "Fraud Manager",
  admin: "Administrator",
  auditor: "Auditor",
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_ITEMS[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-lg font-bold">FraudGuard</h1>
              <p className="text-xs text-slate-400">{ROLE_LABELS[user?.role]}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === `/dashboard/${user?.role}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
