import { Users, Settings, ClipboardList, Shield } from "lucide-react";

const stats = [
  { label: "Total Users", value: "—", icon: Users, color: "bg-blue-500" },
  { label: "Active Rules", value: "—", icon: Shield, color: "bg-green-500" },
  { label: "System Config", value: "—", icon: Settings, color: "bg-purple-500" },
  { label: "Audit Events", value: "—", icon: ClipboardList, color: "bg-yellow-500" },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Administrator Dashboard</h1>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Management</h2>
        <p className="text-gray-500">User management and system configuration will appear here.</p>
      </div>
    </div>
  );
}
