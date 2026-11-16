import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  User,
  ArrowRight,
  MessageSquare,
  Send,
  Check
} from "lucide-react";

export default function AnalystDashboard() {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchCases = async () => {
    try {
      const res = await api.get("/cases?limit=25");
      setCases(res.data.data.cases);
      if (res.data.data.cases.length > 0 && !selectedCaseId) {
        loadCaseDetails(res.data.data.cases[0].id);
      }
    } catch (err) {
      console.error("Failed to load cases", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCaseDetails = async (id) => {
    setSelectedCaseId(id);
    setDetailsLoading(true);
    try {
      const res = await api.get(`/cases/${id}`);
      setCaseDetails(res.data.data);
    } catch (err) {
      console.error("Failed to load case details", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSubmittingAction(true);
    try {
      await api.post(`/cases/${selectedCaseId}/notes`, { content: noteText });
      setNoteText("");
      loadCaseDetails(selectedCaseId);
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to add note");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDecision = async (decision) => {
    if (!confirm(`Are you sure you want to mark this case as ${decision.toUpperCase()}?`)) return;
    setSubmittingAction(true);
    try {
      await api.post(`/cases/${selectedCaseId}/decision`, {
        decision,
        notes: `Analyst recorded decision as ${decision}`
      });
      await fetchCases();
      loadCaseDetails(selectedCaseId);
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to record decision");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const openCasesCount = cases.filter((c) => c.status === "open" || c.status === "investigating").length;
  const resolvedCasesCount = cases.filter((c) => c.status === "resolved").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fraud Investigation Workspace</h1>
          <p className="text-sm text-gray-500">
            Real-time fraud cases triage, hybrid risk explanations, and decision recording
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {openCasesCount} Active Investigations
          </div>
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {resolvedCasesCount} Resolved
          </div>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Case Queue (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[760px]">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Priority Case Queue ({cases.length})
            </h2>
            <button
              onClick={fetchCases}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {cases.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">No cases found in queue.</p>
            ) : (
              cases.map((c) => {
                const isSelected = c.id === selectedCaseId;
                return (
                  <div
                    key={c.id}
                    onClick={() => loadCaseDetails(c.id)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/70 border-l-4 border-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-gray-800">{c.case_number}</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          c.priority === "CRITICAL"
                            ? "bg-rose-100 text-rose-800"
                            : c.priority === "HIGH"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {c.priority}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-gray-900 truncate">{c.title}</p>

                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span className="font-semibold text-gray-900">
                        ₹{parseFloat(c.amount).toLocaleString("en-IN")}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-red-600">
                        Risk Score: {c.risk_score || "N/A"}/100
                      </span>
                      <span className="capitalize text-gray-400 text-[11px]">{c.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Deep Investigation Workspace (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-[760px] overflow-y-auto">
          {detailsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : !caseDetails ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a case from the queue to investigate.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {caseDetails.case.case_number}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                      caseDetails.case.status === "resolved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    Status: {caseDetails.case.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-1">
                  {caseDetails.case.title}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Customer: {caseDetails.case.customer_first} {caseDetails.case.customer_last} ({caseDetails.case.customer_email})
                </p>
              </div>

              {/* Risk Assessment Score Card */}
              <div className="p-4 bg-slate-900 text-white rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Hybrid Risk Assessment
                    </p>
                    <p className="text-3xl font-extrabold mt-1 text-white">
                      {caseDetails.case.risk_score}
                      <span className="text-sm font-normal text-slate-400"> / 100</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        caseDetails.case.risk_level === "CRITICAL"
                          ? "bg-rose-500 text-white"
                          : caseDetails.case.risk_level === "HIGH"
                          ? "bg-amber-500 text-slate-900"
                          : "bg-emerald-500 text-slate-900"
                      }`}
                    >
                      {caseDetails.case.risk_level} RISK
                    </span>
                    <p className="text-xs text-slate-400 mt-1.5">
                      ML Prob: {((caseDetails.case.model_probability || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Triggered Rules & Anomaly Signals */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Detection Signals & Triggered Rules
                </h3>
                {caseDetails.case.triggered_rules && caseDetails.case.triggered_rules.length > 0 ? (
                  <div className="space-y-2">
                    {caseDetails.case.triggered_rules.map((r, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-rose-50/80 border border-rose-200/80 flex items-start gap-2.5"
                      >
                        <Shield className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-rose-900">{r.rule_name}</p>
                          <p className="text-xs text-rose-700 mt-0.5">{r.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No static rules triggered.</p>
                )}
              </div>

              {/* Transaction Context */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Transaction Metadata
                </h3>
                <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                  <div>
                    <span className="text-gray-400">Amount:</span>{" "}
                    <span className="font-semibold text-gray-900">
                      ₹{parseFloat(caseDetails.case.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Payment:</span>{" "}
                    <span className="font-semibold capitalize text-gray-900">
                      {caseDetails.case.payment_method}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Velocity (1h):</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {caseDetails.case.velocity_last_hour} txns
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">New Device:</span>{" "}
                    <span className="font-semibold text-gray-900">
                      {caseDetails.case.is_new_device ? "Yes (Unrecognized)" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Case Decision Actions (If not resolved) */}
              {caseDetails.case.status !== "resolved" ? (
                <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Record Investigation Decision
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleDecision("legitimate")}
                      disabled={submittingAction}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition disabled:opacity-50"
                    >
                      Legitimate
                    </button>
                    <button
                      onClick={() => handleDecision("suspected_fraud")}
                      disabled={submittingAction}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs transition disabled:opacity-50"
                    >
                      Suspected Fraud
                    </button>
                    <button
                      onClick={() => handleDecision("confirmed_fraud")}
                      disabled={submittingAction}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs transition disabled:opacity-50"
                    >
                      Confirmed Fraud
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                  <span className="font-bold">Case Decision:</span>{" "}
                  <span className="uppercase font-semibold tracking-wide">
                    {caseDetails.case.decision}
                  </span>
                </div>
              )}

              {/* Timeline / Notes */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Investigation Timeline & Notes ({caseDetails.notes.length})
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {caseDetails.notes.map((n) => (
                    <div key={n.id} className="p-2.5 bg-gray-50 rounded-lg text-xs border border-gray-100">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                        <span className="font-semibold text-gray-700">
                          {n.first_name} {n.last_name} ({n.role})
                        </span>
                        <span>{new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-gray-800">{n.content}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add an investigation note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingAction || !noteText.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Note
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
