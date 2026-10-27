import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Building2, 
  FileDiff, 
  Check,
  Scale,
  Sparkles
} from 'lucide-react';
import { getMismatches, resolveMismatch } from '../api';

export default function MismatchAnalysis() {
  const [mismatches, setMismatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchMismatches();
  }, []);

  const fetchMismatches = async () => {
    setLoading(true);
    try {
      const res = await getMismatches();
      setMismatches(res.data);
    } catch (err) {
      console.error("Failed to load mismatches:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveMismatch(id);
      setMsg(`Mismatch log #${id} marked as resolved / mutation endorsed.`);
      setTimeout(() => setMsg(null), 3000);
      fetchMismatches();
    } catch (err) {
      alert("Failed to resolve mismatch: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Title */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-purple-400" />
            <span>Cross-Department Mismatch &amp; Discrepancy Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reconciles divergences between Revenue Department (RTC / 7-12) titles and Sub-Registrar registered conveyance deeds.
          </p>
        </div>
        <button
          onClick={fetchMismatches}
          className="text-xs px-4 py-2 glass-card hover:bg-slate-800 text-slate-200 font-semibold rounded-xl flex items-center space-x-2 transition self-start border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh Inter-Dept Scan</span>
        </button>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2.5">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-16">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : mismatches.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl border border-slate-800 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
          <h3 className="font-bold text-white text-base font-outfit">Perfect Departmental Synchronization</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Zero discrepancies detected between Revenue RTC profiles and Registered Sale Deeds.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mismatches.map((m) => {
            const isResolved = m.status === "RESOLVED";
            const isHigh = m.severity === "HIGH";

            return (
              <div 
                key={m.id}
                className={`glass-panel rounded-2xl border ${
                  isResolved ? 'border-slate-800/80 opacity-60' : isHigh ? 'border-purple-500/40 shadow-xl' : 'border-slate-800'
                } p-6 space-y-4`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-sm font-bold text-white font-outfit">
                      Survey <span className="font-mono text-cyan-400">{m.survey_number}</span> ({m.village})
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase border ${
                      isHigh ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {m.severity} RISK &bull; {m.discrepancy_percentage}% VARIANCE
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase border ${
                      isResolved 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">Discrepancy ID: #{m.id}</span>
                </div>

                {/* Conflict Comparison Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dept 1 */}
                  <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2">
                    <span className="text-[11px] font-extrabold text-blue-300 uppercase tracking-wider block">
                      {m.dept_source_1}
                    </span>
                    <div>
                      <span className="text-xs text-slate-400">Recorded {m.field_name}:</span>
                      <p className="text-base font-bold text-white font-mono mt-0.5">{m.value_1}</p>
                    </div>
                  </div>

                  {/* Dept 2 */}
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                    <span className="text-[11px] font-extrabold text-purple-300 uppercase tracking-wider block">
                      {m.dept_source_2}
                    </span>
                    <div>
                      <span className="text-xs text-slate-400">Recorded {m.field_name}:</span>
                      <p className="text-base font-bold text-white font-mono mt-0.5">{m.value_2}</p>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-cyan-300">Revenue Impact Analysis: </span>
                  {m.discrepancy_description}
                </div>

                {!isResolved && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleResolve(m.id)}
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-glow-sm transition flex items-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Endorse Mutation / Reconcile Discrepancy</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
