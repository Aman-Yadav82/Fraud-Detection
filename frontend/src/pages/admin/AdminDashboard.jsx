import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Shield,
  Users,
  Settings,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw
} from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("rules");
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, usersRes] = await Promise.all([
        api.get("/admin/rules"),
        api.get("/admin/users?limit=50")
      ]);
      setRules(rulesRes.data.data);
      setUsers(usersRes.data.data.users);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleRule = async (ruleId, currentStatus) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/rules/${ruleId}/toggle`, {
        is_enabled: !currentStatus
      });
      setRules(rules.map((r) => (r.id === ruleId ? res.data.data : r)));
    } catch (err) {
      alert("Failed to update rule status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUser = async (userId, currentActive) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/users/${userId}`, {
        is_active: !currentActive
      });
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: res.data.data.is_active } : u)));
    } catch (err) {
      alert("Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/admin/users/${userId}`, { role: newRole });
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: res.data.data.role } : u)));
    } catch (err) {
      alert("Failed to update user role");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Administration & Policy Engine</h1>
          <p className="text-sm text-gray-500">
            Configure dynamic fraud rules, calibrate detection policies, and manage user roles
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reload Policies
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
            activeTab === "rules"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Shield className="w-4 h-4" />
          Fraud Detection Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
            activeTab === "users"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Users className="w-4 h-4" />
          User Permissions & RBAC ({users.length})
        </button>
      </div>

      {/* Tab Content: Rules */}
      {activeTab === "rules" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Configured Rule Catalog</h2>
              <p className="text-xs text-gray-400">
                Rules are evaluated dynamically during every transaction simulation
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase bg-gray-50/50">
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Severity Weight</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-gray-900">{rule.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 max-w-xs">{rule.description}</td>
                    <td className="py-3.5 px-4 capitalize font-medium text-gray-500">
                      {rule.rule_type}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          rule.severity === "CRITICAL"
                            ? "bg-rose-100 text-rose-800"
                            : rule.severity === "HIGH"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {rule.is_enabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleRule(rule.id, rule.is_enabled)}
                        disabled={actionLoading}
                        className={`text-lg transition disabled:opacity-50 ${
                          rule.is_enabled ? "text-blue-600" : "text-gray-300"
                        }`}
                      >
                        {rule.is_enabled ? (
                          <ToggleRight className="w-7 h-7" />
                        ) : (
                          <ToggleLeft className="w-7 h-7" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Users */}
      {activeTab === "users" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">User Access Control</h2>
            <p className="text-xs text-gray-400">
              Manage user active status and assign 5-role platform authorizations
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase bg-gray-50/50">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role Assignment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        disabled={actionLoading}
                        className="px-2 py-1 border border-gray-200 rounded font-semibold text-xs bg-white text-gray-800 outline-none"
                      >
                        <option value="customer">customer</option>
                        <option value="analyst">analyst</option>
                        <option value="manager">manager</option>
                        <option value="admin">admin</option>
                        <option value="auditor">auditor</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleUser(user.id, user.is_active)}
                        disabled={actionLoading}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
