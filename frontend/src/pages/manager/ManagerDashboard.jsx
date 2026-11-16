import { BarChart3, Users, AlertTriangle, TrendingUp } from "lucide-react";

const stats = [
  { label: "Total Cases", value: "—", icon: BarChart3, color: "bg-blue-500" },
  { label: "Active Analysts", value: "—", icon: Users, color: "bg-purple-500" },
  { label: "Critical Alerts", value: "—", icon: AlertTriangle, color: "bg-red-500" },
  { label: "Fraud Rate", value: "—", icon: TrendingUp, color: "bg-green-500" },
];

export default function ManagerDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fraud Manager Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${color} p-3 rounded-lg`}><Icon className="w-6 h-6 text-white" /></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Operations Overview</h2>
        <p className="text-gray-500">Fraud analytics and case management data will appear here.</p>
      </div>
    </div>
  );
}
