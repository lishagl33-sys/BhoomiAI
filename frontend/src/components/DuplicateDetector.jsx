import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  GitMerge, 
  AlertCircle,
  Building2,
  Layers,
  Cpu,
  Radar
} from 'lucide-react';
import { getDuplicates, resolveDuplicate } from '../api';

export default function DuplicateDetector({ onSelectRecord }) {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const res = await getDuplicates();
      setDuplicates(res.data);
    } catch (err) {
      console.error("Failed to load duplicates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await resolveDuplicate(id, action);
      setMsg(`Duplicate candidate #${id} marked as ${action === 'MERGE' ? 'Merged' : 'Dismissed'}.`);
      setTimeout(() => setMsg(null), 3000);
      fetchDuplicates();
    } catch (err) {
      alert("Failed to process duplicate: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Title */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2.5">
            <Copy className="w-6 h-6 text-amber-400" />
            <span>Intelligent Duplicate &amp; Collision Radar</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detects overlapping parcel claims, duplicate submissions, and phonetic name variations across revenue boundaries.
          </p>
        </div>
        <button
          onClick={fetchDuplicates}
          className="text-xs px-4 py-2 glass-card hover:bg-slate-800 text-slate-200 font-semibold rounded-xl flex items-center space-x-2 transition self-start border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh Collision Scan</span>
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
      ) : duplicates.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl border border-slate-800 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
          <h3 className="font-bold text-white text-base font-outfit">Zero Duplicate Collisions Detected</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            The spatial keys and phonetic titleholder algorithms found zero conflicting entries in the master registry.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {duplicates.map((dup) => {
            const isResolved = dup.status !== "UNRESOLVED";
            const score = Math.round(dup.similarity_score);
            const scoreColor = score >= 90 ? "from-rose-500 to-red-600" : score >= 80 ? "from-amber-500 to-yellow-600" : "from-blue-500 to-cyan-600";

            return (
              <div 
                key={dup.id} 
                className={`glass-panel rounded-2xl border ${
                  isResolved ? 'border-slate-800/80 opacity-60' : 'border-amber-500/40 shadow-xl'
                } overflow-hidden`}
              >
                {/* Header Strip with Match Score */}
                <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-white font-outfit">
                      Collision Pair #{dup.id} &bull; <span className="font-mono text-cyan-400">{dup.match_type}</span>
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase border ${
                      dup.status === 'UNRESOLVED' 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {dup.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-400 font-medium">Similarity Metric:</span>
                    <div className="w-28 bg-slate-800 rounded-full h-2.5 overflow-hidden p-[1px]">
                      <div className={`h-full rounded-full bg-gradient-to-r ${scoreColor}`} style={{ width: `${score}%` }}></div>
                    </div>
                    <span className="text-xs font-mono font-extrabold text-cyan-300">{score}%</span>
                  </div>
                </div>

                {/* Details Callout */}
                {dup.details && (
                  <div className="px-6 py-3 bg-amber-950/20 border-b border-amber-900/30 text-xs text-amber-200/90 font-medium">
                    &bull; {dup.details}
                  </div>
                )}

                {/* Side-by-Side Comparison Table */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Source Record */}
                  <div className="border border-slate-800/80 rounded-xl p-4 bg-slate-900/40 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-200">Incoming Document</span>
                      <span className="text-[11px] font-mono text-cyan-400">Record #{dup.source_record?.id || dup.source_record_id}</span>
                    </div>
                    {dup.source_record ? (
                      <div className="text-xs space-y-2 text-slate-300">
                        <p><b>Titleholder:</b> <span className="font-bold text-white">{dup.source_record.owner_name}</span></p>
                        <p><b>Relative:</b> {dup.source_record.relative_name || 'N/A'}</p>
                        <p><b>Survey / Hissa:</b> <span className="font-mono text-cyan-300">{dup.source_record.survey_number}/{dup.source_record.sub_division}</span></p>
                        <p><b>Village:</b> {dup.source_record.village}, {dup.source_record.district}</p>
                        <p><b>Extent:</b> {dup.source_record.area_value} {dup.source_record.area_unit} ({dup.source_record.area_in_acres} Acres)</p>
                        <p><b>Jurisdiction:</b> {dup.source_record.source_department}</p>
                        <button
                          onClick={() => onSelectRecord(dup.source_record.id)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-bold pt-1 inline-flex items-center transition"
                        >
                          Inspect Document Scan <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Record loaded from registry.</p>
                    )}
                  </div>

                  {/* Target Record */}
                  <div className="border border-slate-800/80 rounded-xl p-4 bg-slate-900/40 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-200">Existing Master Title</span>
                      <span className="text-[11px] font-mono text-cyan-400">Record #{dup.target_record?.id || dup.target_record_id}</span>
                    </div>
                    {dup.target_record ? (
                      <div className="text-xs space-y-2 text-slate-300">
                        <p><b>Titleholder:</b> <span className="font-bold text-white">{dup.target_record.owner_name}</span></p>
                        <p><b>Relative:</b> {dup.target_record.relative_name || 'N/A'}</p>
                        <p><b>Survey / Hissa:</b> <span className="font-mono text-cyan-300">{dup.target_record.survey_number}/{dup.target_record.sub_division}</span></p>
                        <p><b>Village:</b> {dup.target_record.village}, {dup.target_record.district}</p>
                        <p><b>Extent:</b> {dup.target_record.area_value} {dup.target_record.area_unit} ({dup.target_record.area_in_acres} Acres)</p>
                        <p><b>Jurisdiction:</b> {dup.target_record.source_department}</p>
                        <button
                          onClick={() => onSelectRecord(dup.target_record.id)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-bold pt-1 inline-flex items-center transition"
                        >
                          Inspect Master Record <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Record loaded from registry.</p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                {!isResolved && (
                  <div className="bg-slate-900/60 px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
                    <button
                      onClick={() => handleAction(dup.id, "DISMISS")}
                      className="px-4 py-2 glass-card hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                    >
                      Dismiss (Distinct Titleholder)
                    </button>
                    <button
                      onClick={() => handleAction(dup.id, "MERGE")}
                      className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-glow-sm transition flex items-center space-x-1.5"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>Merge Into Master Title</span>
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
