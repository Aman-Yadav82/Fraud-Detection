import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  ShieldAlert,
  TrendingUp,
  FileCheck,
  Users,
  AlertTriangle,
  RefreshCw,
  CheckCircle2
} from "lucide-react";

const RISK_COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f59e0b",
  MEDIUM: "#3b82f6",
  LOW: "#10b981"
};

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await api.get("/analytics/metrics");
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to load metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const { overview, risk_distribution, analyst_workload, trends } = data || {};

  const pieData = (risk_distribution || []).map((r) => ({
    name: r.risk_level,
    value: parseInt(r.count, 10),
    color: RISK_COLORS[r.risk_level] || "#6b7280"
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fraud Operations Command Center</h1>
          <p className="text-sm text-gray-500">
            Real-time fraud surveillance, risk distribution, and analyst team workload
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Operations
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Processed</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            ₹{parseFloat(overview?.total_volume || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-gray-400 mt-1">{overview?.total_transactions} transactions</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Fraud Rate</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{overview?.fraud_rate_pct}%</p>
          <p className="text-xs text-gray-400 mt-1">
            {overview?.flagged_count} flagged / blocked
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Active Cases</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{overview?.open_cases}</p>
          <p className="text-xs text-gray-400 mt-1">
            {overview?.critical_cases} critical priority
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Resolved Cases</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{overview?.resolved_cases}</p>
          <p className="text-xs text-gray-400 mt-1">
            {overview?.confirmed_fraud_cases} confirmed fraud
          </p>
        </div>
      </div>

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Distribution (Pie) */}
        <div className="lg:col-span-4 bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">
            Risk Score Distribution
          </h2>
          <p className="text-xs text-gray-400 mb-4">Assessed transactions by severity band</p>

          <div className="h-56 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400">No risk evaluations yet</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-gray-600 font-medium">{p.name}:</span>
                <span className="font-bold text-gray-900">{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Analyst Workload Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Analyst Team Workload & Performance
              </h2>
              <p className="text-xs text-gray-400">Active queue allocation and closed cases</p>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {analyst_workload?.length || 0} Analysts
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase">
                  <th className="py-2.5 px-3">Analyst Name</th>
                  <th className="py-2.5 px-3">Active Queue</th>
                  <th className="py-2.5 px-3">Resolved</th>
                  <th className="py-2.5 px-3">Total Assigned</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(analyst_workload || []).map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900">
                        {a.first_name} {a.last_name}
                      </p>
                      <p className="text-[11px] text-gray-400">{a.email}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-amber-600">{a.active_cases}</span> cases
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-emerald-600">{a.resolved_cases}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-700">{a.total_assigned}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
