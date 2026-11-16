import { FileSearch, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const stats = [
  { label: "Assigned Cases", value: "—", icon: FileSearch, color: "bg-blue-500" },
  { label: "High-Risk Alerts", value: "—", icon: AlertTriangle, color: "bg-red-500" },
  { label: "Resolved Today", value: "—", icon: CheckCircle, color: "bg-green-500" },
  { label: "Pending Review", value: "—", icon: Clock, color: "bg-yellow-500" },
];

export default function AnalystDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fraud Analyst Dashboard</h1>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Case Queue</h2>
        <p className="text-gray-500">Assigned fraud cases will appear here once the backend is connected.</p>
      </div>
    </div>
  );
}
