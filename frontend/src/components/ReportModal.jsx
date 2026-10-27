import React, { useState, useEffect } from 'react';
import { 
  X, 
  DownloadCloud, 
  ShieldCheck, 
  Printer, 
  FileCheck, 
  CheckCircle, 
  AlertTriangle,
  QrCode,
  Award
} from 'lucide-react';
import { generateAuditReport, getRecordById } from '../api';

export default function ReportModal({ recordId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [record, setRecord] = useState(null);

  useEffect(() => {
    if (recordId) {
      initReport();
    }
  }, [recordId]);

  const initReport = async () => {
    setLoading(true);
    try {
      const [repRes, recRes] = await Promise.all([
        generateAuditReport(recordId),
        getRecordById(recordId)
      ]);
      setReportData(repRes.data);
      setRecord(recRes.data);
    } catch (err) {
      alert("Failed to generate audit certificate: " + (err.response?.data?.detail || err.message));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!recordId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel bg-slate-950/90 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-700/80 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-[1px] shadow-glow-sm">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center text-amber-400">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="font-extrabold text-base font-outfit text-white">
                Land Record Digitization &amp; Validation Certificate
              </h3>
              <p className="text-[11px] text-cyan-300">
                Government of India &bull; Digital Land Records Modernization Programme (DILRMP)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 font-mono">
                Generating cryptographically signed audit certificate &amp; SHA-256 seal...
              </p>
            </div>
          ) : (
            <>
              {/* Certificate Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-cyan-300">
                    Certificate No: {reportData?.report_id}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-extrabold rounded-full text-[10px] border border-emerald-500/30">
                    VERIFIED &amp; CRYPTOGRAPHICALLY STAMPED
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Certified digital revenue extract extracted from physical deeds by BhoomiAI pipeline.
                </div>
              </div>

              {/* Record Summary Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden text-xs">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-800">
                    <tr className="bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-400 w-1/3">Survey / Khasra No</td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300">{record?.survey_number}/{record?.sub_division}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-400">Primary Titleholder</td>
                      <td className="py-3 px-4 font-semibold text-white">{record?.owner_name}</td>
                    </tr>
                    <tr className="bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-400">Father's / Spouse Name</td>
                      <td className="py-3 px-4 text-slate-300">{record?.relative_name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-400">Jurisdiction (Village, District)</td>
                      <td className="py-3 px-4 text-slate-300">{record?.village}, {record?.district}, {record?.state}</td>
                    </tr>
                    <tr className="bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-400">Land Area Extent</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">{record?.area_value} {record?.area_unit} ({record?.area_in_acres.toFixed(2)} Std Acres)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-400">Land Classification</td>
                      <td className="py-3 px-4 text-slate-300">{record?.land_type}</td>
                    </tr>
                    <tr className="bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-400">Department Source</td>
                      <td className="py-3 px-4 text-slate-300">{record?.source_department}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Integrity Status */}
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" /> Statutory Compliance Verification
                </span>
                <p className="text-[11px] text-slate-400">
                  This certificate carries an official SHA-256 digital stamp and has been logged to the central revenue audit ledger.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900/90 px-6 py-4 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 glass-card hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            Close
          </button>

          {reportData?.download_url && (
            <a
              href={reportData.download_url}
              download={reportData.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-glow-sm transition flex items-center space-x-2"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Download Official PDF Certificate</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
