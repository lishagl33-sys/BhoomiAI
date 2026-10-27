import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Search, 
  ArrowRight, 
  ShieldAlert, 
  Check, 
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { getValidationIssues, resolveIssue } from '../api';

export default function ValidationCenter({ onSelectRecord }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, [severityFilter, statusFilter]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await getValidationIssues({
        severity: severityFilter,
        status: statusFilter
      });
      setIssues(res.data);
    } catch (err) {
      console.error("Failed to load validation issues:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveIssue(id);
      setActionMessage(`Issue #${id} resolved & title integrity confirmed.`);
      setTimeout(() => setActionMessage(null), 3000);
      fetchIssues();
    } catch (err) {
      alert("Failed to resolve issue: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Title & Filters */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <span>Validation &amp; Statutory Anomaly Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time enforcement of statutory revenue guidelines, boundary constraints, and mathematical consistency.
          </p>
        </div>

        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "CRITICAL", "WARNING", "INFO"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all duration-200 ${
                severityFilter === sev
                  ? sev === "CRITICAL"
                    ? "bg-rose-600 text-white shadow-glow-sm shadow-rose-500/30"
                    : sev === "WARNING"
                    ? "bg-amber-600 text-white shadow-glow-sm shadow-amber-500/30"
                    : sev === "INFO"
                    ? "bg-blue-600 text-white shadow-glow-sm shadow-blue-500/30"
                    : "bg-slate-700 text-white"
                  : "glass-card text-slate-400 hover:text-white hover:bg-slate-800/80"
              }`}
            >
              {sev}
            </button>
          ))}

          <div className="border-l border-slate-800 pl-2 flex gap-1">
            <button
              onClick={() => setStatusFilter("OPEN")}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition ${
                statusFilter === "OPEN" 
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("RESOLVED")}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition ${
                statusFilter === "RESOLVED" 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Issues List */}
      {loading ? (
        <div className="flex justify-center p-16">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : issues.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl border border-slate-800 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
          <h3 className="font-bold text-white text-base font-outfit">
            No {severityFilter !== "ALL" ? severityFilter : ""} Anomalies Found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All digitized land records within this jurisdiction comply with statutory validation protocols.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map((iss) => {
            const isCrit = iss.severity === "CRITICAL";
            const isWarn = iss.severity === "WARNING";
            const badgeColor = isCrit ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : isWarn ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-blue-500/20 text-blue-300 border-blue-500/40";
            const borderColor = isCrit ? "border-l-4 border-l-rose-500" : isWarn ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-blue-500";

            return (
              <div 
                key={iss.id} 
                className={`glass-card p-5 rounded-2xl border border-slate-800 shadow-lg ${borderColor} flex flex-col justify-between space-y-4 hover:border-slate-700 transition`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                        {iss.severity} &bull; {iss.issue_type}
                      </span>
                      <h4 className="font-bold text-sm text-white font-outfit mt-2.5">
                        Target Field: <span className="font-mono text-cyan-400">{iss.field_name}</span>
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">#{iss.id}</span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    {iss.description}
                  </p>

                  {iss.suggested_fix && (
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-0.5">
                      <span className="font-bold text-slate-200">Recommended Resolution:</span>
                      <p>{iss.suggested_fix}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  {iss.record_id ? (
                    <button
                      onClick={() => onSelectRecord(iss.record_id)}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center transition"
                    >
                      <span>Inspect Record #{iss.record_id}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  ) : <span></span>}

                  {iss.status === "OPEN" ? (
                    <button
                      onClick={() => handleResolve(iss.id)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Endorse / Resolve</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
