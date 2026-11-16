import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../../services/api";
import {
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  HelpCircle,
  Bell,
  Check,
  X
} from "lucide-react";

export default function CustomerDashboard() {
  const location = useLocation();
  const path = location.pathname;

  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Dispute modal state
  const [disputeModalTxn, setDisputeModalTxn] = useState(null);
  const [disputeReason, setDisputeReason] = useState("Unrecognized charge");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Form state for simulator
  const [formData, setFormData] = useState({
    amount: "1500",
    merchant_name: "Amazon India",
    merchant_category: "retail",
    payment_method: "card",
    is_new_device: false,
    is_international: false
  });

  const fetchData = async () => {
    try {
      const [profRes, txnRes, dispRes, notifRes] = await Promise.all([
        api.get("/customer/profile"),
        api.get("/customer/transactions?limit=25"),
        api.get("/disputes/my"),
        api.get("/customer/notifications")
      ]);
      setProfile(profRes.data.data);
      setTransactions(txnRes.data.data.transactions);
      setDisputes(dispRes.data.data);
      setNotifications(notifRes.data.data);
    } catch (err) {
      console.error("Failed to load customer data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        amount: parseFloat(formData.amount),
        merchant_name: formData.merchant_name,
        merchant_category: formData.merchant_category,
        payment_method: formData.payment_method,
        is_new_device: formData.is_new_device,
        is_international: formData.is_international
      };

      const res = await api.post("/transactions/simulate", payload);
      setFeedback({
        type: "success",
        title: `Transaction ${res.data.data.transaction.status.toUpperCase()}`,
        message: res.data.message,
        risk: res.data.data.risk_level
      });
      fetchData();
    } catch (err) {
      setFeedback({
        type: "error",
        title: "Simulation Failed",
        message: err.response?.data?.error?.message || "Transaction error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDispute = (txn) => {
    setDisputeModalTxn(txn);
    setDisputeReason("Unrecognized charge");
    setDisputeDescription("");
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    setSubmittingDispute(true);
    try {
      await api.post("/disputes", {
        transaction_id: disputeModalTxn.id,
        reason: disputeReason,
        description: disputeDescription
      });
      setDisputeModalTxn(null);
      await fetchData();
      alert("Dispute submitted successfully! Our fraud team has been notified.");
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to submit dispute");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleMarkNotificationRead = async (notifId) => {
    try {
      await api.patch(`/customer/notifications/${notifId}/read`);
      setNotifications(notifications.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const primaryAccount = profile?.accounts?.[0];
  const balance = primaryAccount ? parseFloat(primaryAccount.balance).toLocaleString("en-IN") : "0";

  // Determine current active subview based on URL path
  const isTransactionsView = path.endsWith("/transactions");
  const isDisputesView = path.endsWith("/disputes");
  const isNotificationsView = path.endsWith("/notifications");
  const isOverview = !isTransactionsView && !isDisputesView && !isNotificationsView;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isTransactionsView
              ? "All Transactions"
              : isDisputesView
              ? "Disputes & Claims Center"
              : isNotificationsView
              ? "Security Notifications"
              : `Welcome back, ${profile?.first_name}`}
          </h1>
          <p className="text-sm text-gray-500">
            Account #{primaryAccount?.account_number || "N/A"} • Savings • Currency INR (₹)
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
            Risk Shield Active
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Available Balance</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{balance}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{transactions.length}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Active Disputes</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {disputes.filter((d) => d.status !== "resolved").length}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Notifications</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {notifications.filter((n) => !n.is_read).length}
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Bell className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* VIEW 1: Overview (Simulator + Preview) */}
      {isOverview && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Transaction Simulator */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Send className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Simulate Transaction</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Test how transactions trigger real-time ML risk scoring and detection rules.
            </p>

            {feedback && (
              <div
                className={`p-4 rounded-xl mb-4 text-sm flex gap-3 ${
                  feedback.type === "success"
                    ? feedback.risk === "CRITICAL"
                      ? "bg-rose-50 text-rose-800 border border-rose-200"
                      : feedback.risk === "HIGH"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {feedback.risk === "CRITICAL" || feedback.type === "error" ? (
                  <XCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                ) : feedback.risk === "HIGH" ? (
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                )}
                <div>
                  <p className="font-semibold">{feedback.title}</p>
                  <p className="text-xs mt-0.5 opacity-90">{feedback.message}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Amount (INR ₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-[11px] text-gray-400">
                  Tip: ₹1,500 (normal) vs ₹105,000 (triggers high amount rule)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Merchant Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.merchant_name}
                  onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.merchant_category}
                    onChange={(e) => setFormData({ ...formData, merchant_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="retail">Retail</option>
                    <option value="electronics">Electronics</option>
                    <option value="travel">Travel</option>
                    <option value="dining">Dining</option>
                    <option value="groceries">Groceries</option>
                    <option value="crypto">Crypto/Gaming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_new_device}
                    onChange={(e) => setFormData({ ...formData, is_new_device: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs text-gray-700 font-medium">
                    Simulate New / Unrecognized Device
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_international}
                    onChange={(e) => setFormData({ ...formData, is_international: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-xs text-gray-700 font-medium">
                    Simulate International Cross-Border
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 text-sm shadow-sm"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Simulation
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right: Quick Transactions Preview */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Recent Transactions
              </h2>
              <button
                onClick={fetchData}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase">
                    <th className="py-2.5 px-3">Merchant</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.slice(0, 6).map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/80">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900">{tx.merchant_name}</p>
                        <p className="text-[11px] text-gray-400 capitalize">{tx.merchant_category}</p>
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-900">
                        ₹{parseFloat(tx.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            tx.status === "completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : tx.status === "flagged"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-gray-400">
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {tx.dispute_id ? (
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                            Disputed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenDispute(tx)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                          >
                            Dispute
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Transactions Page */}
      {isTransactionsView && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Account Transaction Ledger ({transactions.length} entries)
            </h2>
            <button onClick={fetchData} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase bg-gray-50/50">
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Merchant</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3 text-right">Dispute Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-500 truncate max-w-xs">{tx.id}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900">{tx.merchant_name}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{tx.merchant_category}</p>
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-900">₹{parseFloat(tx.amount).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-3 capitalize text-gray-600">{tx.payment_method}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                        tx.status === "completed" ? "bg-emerald-50 text-emerald-700" : tx.status === "flagged" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                      }`}>{tx.status}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-[11px]">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="py-3 px-3 text-right">
                      {tx.dispute_id ? (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">Disputed</span>
                      ) : (
                        <button onClick={() => handleOpenDispute(tx)} className="text-xs text-rose-600 hover:text-rose-800 font-semibold">
                          Raise Dispute
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Disputes Page */}
      {isDisputesView && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Customer Disputes & Refund Claims ({disputes.length})
            </h2>
            <button onClick={fetchData} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Refresh
            </button>
          </div>

          {disputes.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">You have no submitted claims or disputes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase bg-gray-50/50">
                    <th className="py-3 px-3">Dispute ID</th>
                    <th className="py-3 px-3">Merchant / Amount</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Resolution Notes</th>
                    <th className="py-3 px-3">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {disputes.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/80">
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500">{d.id.slice(0, 8)}...</td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900">{d.merchant_name}</p>
                        <p className="text-[11px] text-gray-500">₹{parseFloat(d.amount).toLocaleString("en-IN")}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-700">{d.reason}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          d.status === "resolved" ? "bg-emerald-100 text-emerald-800" : d.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                        }`}>{d.status}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 max-w-xs">{d.resolution || "Under analyst review"}</td>
                      <td className="py-3 px-3 text-gray-400 text-[11px]">{new Date(d.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: Notifications Page */}
      {isNotificationsView && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Security Notices & Account Alerts ({notifications.length})
            </h2>
            <button onClick={fetchData} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              Refresh
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">No security notifications recorded.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition ${
                    n.is_read ? "bg-gray-50/60 border-gray-100" : "bg-blue-50/40 border-blue-200 shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg mt-0.5 ${
                      n.type === "alert" ? "bg-rose-100 text-rose-700" : n.type === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{n.title}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkNotificationRead(n.id)}
                      className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100/50 rounded-md transition flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Mark as Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalTxn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-gray-900">Raise Transaction Dispute</h3>
              </div>
              <button onClick={() => setDisputeModalTxn(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
              <p><span className="text-gray-400">Merchant:</span> <span className="font-semibold">{disputeModalTxn.merchant_name}</span></p>
              <p><span className="text-gray-400">Amount:</span> <span className="font-semibold">₹{parseFloat(disputeModalTxn.amount).toLocaleString("en-IN")}</span></p>
              <p><span className="text-gray-400">Reference:</span> <span className="font-mono">{disputeModalTxn.id}</span></p>
            </div>

            <form onSubmit={handleSubmitDispute} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Dispute</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Unrecognized charge">Unrecognized charge (I did not make this purchase)</option>
                  <option value="Incorrect charge amount">Incorrect charge amount</option>
                  <option value="Duplicate billing">Duplicate billing / charged twice</option>
                  <option value="Goods not received">Goods / Services not received</option>
                  <option value="Suspected card compromise">Suspected card compromise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Additional Details (Optional)</label>
                <textarea
                  rows={3}
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Provide any relevant context for the fraud analyst team..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalTxn(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {submittingDispute ? "Submitting..." : "Confirm & Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
