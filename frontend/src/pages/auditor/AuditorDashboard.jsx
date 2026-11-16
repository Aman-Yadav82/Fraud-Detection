import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../../services/api";
import {
  ClipboardList,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  CreditCard,
  FileSearch,
  CheckCircle2
} from "lucide-react";

export default function AuditorDashboard() {
  const location = useLocation();
  const path = location.pathname;

  const [logs, setLogs] = useState([]);
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "/admin/audit-logs?limit=100";
      if (selectedAction) url += `&action=${selectedAction}`;
      const [auditRes, casesRes] = await Promise.all([
        api.get(url),
        api.get("/cases?limit=50")
      ]);
      setLogs(auditRes.data.data.logs);
      setTotal(auditRes.data.data.total);
      setCases(casesRes.data.data.cases);
    } catch (err) {
      console.error("Failed to load auditor data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAction]);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.user_email?.toLowerCase().includes(term) ||
      log.entity_type?.toLowerCase().includes(term)
    );
  });

  const isCasesView = path.endsWith("/cases");
  const isAuditView = path.endsWith("/audit-trail") || (!isCasesView);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCasesView ? "Auditor Investigation Records" : "Auditor Compliance Ledger"}
          </h1>
          <p className="text-sm text-gray-500">
            Read-only immutable verification tracking security events, analyst decisions, and policy revisions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Append-Only Audit Log
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* VIEW: CASE RECORDS */}
      {isCasesView ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Investigation Decisions History ({cases.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase bg-gray-50/50">
                  <th className="py-3 px-4">Case #</th>
                  <th className="py-3 px-4">Title / Amount</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Decision Outcome</th>
                  <th className="py-3 px-4">Assigned Analyst</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{c.case_number}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900">{c.title}</p>
                      <p className="text-[11px] text-gray-400 font-medium">
                        ₹{parseFloat(c.amount).toLocaleString("en-IN")} • Risk: {c.risk_score || "N/A"}/100
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        c.priority === "CRITICAL" ? "bg-rose-100 text-rose-800" : c.priority === "HIGH" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>{c.priority}</span>
                    </td>
                    <td className="py-3.5 px-4 capitalize font-semibold text-gray-700">{c.status}</td>
                    <td className="py-3.5 px-4">
                      {c.decision ? (
                        <span className="font-bold uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                          {c.decision}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700">
                      {c.analyst_first ? `${c.analyst_first} ${c.analyst_last}` : "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW: AUDIT TRAIL */
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by action, email, or entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 outline-none"
              >
                <option value="">All Audit Actions</option>
                <option value="RECORD_CASE_DECISION">RECORD_CASE_DECISION</option>
                <option value="TOGGLE_FRAUD_RULE">TOGGLE_FRAUD_RULE</option>
                <option value="SUBMIT_DISPUTE">SUBMIT_DISPUTE</option>
                <option value="RESOLVE_DISPUTE">RESOLVE_DISPUTE</option>
                <option value="UPDATE_USER_PERMISSIONS">UPDATE_USER_PERMISSIONS</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Audit Ledger ({filteredLogs.length} events)
              </h2>
              <span className="text-xs text-gray-400">Total entries: {total}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">No matching audit events found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase bg-gray-50/50">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Details / Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                          {log.action}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-900">
                            {log.first_name ? `${log.first_name} ${log.last_name}` : "System"}
                          </p>
                          <p className="text-[11px] text-gray-400">{log.user_email || "N/A"}</p>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">
                          <span className="font-semibold capitalize">{log.entity_type}</span>
                          <span className="text-gray-400 font-mono text-[11px] block truncate max-w-xs">
                            {log.entity_id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600 max-w-xs truncate">
                          {typeof log.details === "object"
                            ? JSON.stringify(log.details)
                            : log.details || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
