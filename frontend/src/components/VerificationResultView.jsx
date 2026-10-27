import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  FileText, 
  Database, 
  ShieldCheck, 
  Download, 
  ArrowLeft,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { generateAuditReport } from '../api';

export default function VerificationResultView({ extractionData, onBack, theme = 'dark' }) {
  const isLight = theme === 'light';
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);
  const [showRawOcr, setShowRawOcr] = useState(false);

  if (!extractionData) {
    return (
      <div className={`text-center py-16 glass-card rounded-3xl p-8 max-w-2xl mx-auto border ${
        isLight ? 'border-slate-200 bg-white shadow-md' : 'border-slate-800 shadow-xl'
      }`}>
        <HelpCircle className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
        <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>No Verification Results</h3>
        <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Please upload a document to run the BhoomiAI verification engine.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-semibold hover:from-emerald-500 hover:to-teal-500 shadow-glow-sm transition"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  const verif = extractionData.verification_result || {};
  const status = verif.final_status || "REFERENCE_UNAVAILABLE";
  const comparisons = verif.field_comparisons || [];
  const warnings = verif.warnings || [];
  const extracted = extractionData.extracted_fields || {};
  const confidences = extractionData.field_confidences || {};

  const getStatusBadge = (st) => {
    switch (st) {
      case "MATCH":
        return {
          label: "Match",
          color: isLight 
            ? "bg-emerald-50/90 text-emerald-950 border-emerald-300" 
            : "bg-emerald-950/40 text-emerald-200 border-emerald-500/40",
          iconColor: isLight ? "text-emerald-600" : "text-emerald-400",
          icon: CheckCircle2,
          desc: "Extracted document fields conform with the reference record within statutory tolerance."
        };
      case "NEEDS_REVIEW":
        return {
          label: "Needs Review",
          color: isLight 
            ? "bg-amber-50/90 text-amber-950 border-amber-300" 
            : "bg-amber-950/40 text-amber-200 border-amber-500/40",
          iconColor: isLight ? "text-amber-600" : "text-amber-400",
          icon: AlertTriangle,
          desc: "Minor discrepancy in land extent (0.5% - 2.5%) or partial titleholder phonetic match. Manual review recommended."
        };
      case "MISMATCH_DETECTED":
        return {
          label: "Mismatch Detected",
          color: isLight 
            ? "bg-rose-50/90 text-rose-950 border-rose-300" 
            : "bg-rose-950/40 text-rose-200 border-rose-500/40",
          iconColor: isLight ? "text-rose-600" : "text-rose-400",
          icon: XCircle,
          desc: "Significant variance detected in parcel extent (> 2.5%), survey number, or titleholder identity."
        };
      case "REFERENCE_UNAVAILABLE":
      default:
        return {
          label: "Reference Data Unavailable",
          color: isLight 
            ? "bg-slate-100 text-slate-800 border-slate-300" 
            : "bg-slate-900/60 text-slate-300 border-slate-700/60",
          iconColor: isLight ? "text-slate-600" : "text-slate-400",
          icon: HelpCircle,
          desc: "No corresponding authoritative reference baseline parcel found for this survey and location."
        };
    }
  };

  const statusConfig = getStatusBadge(status);
  const StatusIcon = statusConfig.icon;

  const handleDownloadAudit = async () => {
    if (!extractionData.record_id) return;
    setDownloadingReport(true);
    try {
      const res = await generateAuditReport(extractionData.record_id);
      if (res.data?.download_url) {
        setReportUrl(res.data.download_url);
        window.open(res.data.download_url, '_blank');
      }
    } catch (err) {
      console.error("Error generating report", err);
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Top Bar with Back Button & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className={`inline-flex items-center space-x-2 text-xs font-semibold glass-card px-3.5 py-2 rounded-xl border transition ${
            isLight 
              ? 'text-slate-700 hover:text-slate-900 bg-white border-slate-300 shadow-xs' 
              : 'text-slate-300 hover:text-white border-slate-800'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-emerald-500" />
          <span>Upload Another Record</span>
        </button>

        <div className="flex items-center space-x-3">
          {extractionData.blockchain_block && (
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold ${
              isLight 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Anchored in Blockchain (Block #{extractionData.blockchain_block.index})</span>
            </div>
          )}

          <button
            onClick={handleDownloadAudit}
            disabled={downloadingReport}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-glow-sm transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-white" />
            <span className="text-white">{downloadingReport ? "Generating Audit..." : "Export Audit PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Status Hero Card */}
      <div className={`glass-card p-6 sm:p-8 rounded-3xl border ${statusConfig.color} shadow-xl space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-2xl border shadow-inner ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-700/60'
            }`}>
              <StatusIcon className={`w-8 h-8 ${statusConfig.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs uppercase font-extrabold tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Verification Status:</span>
                <span className={`text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{statusConfig.label}</span>
              </div>
              <p className={`text-xs mt-1.5 max-w-2xl leading-relaxed font-normal ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {statusConfig.desc}
              </p>
            </div>
          </div>

          {verif.discrepancy_score !== undefined && (
            <div className={`text-right px-4 py-2.5 rounded-2xl border shadow-inner ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/80 border-slate-700'
            }`}>
              <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Discrepancy Score</div>
              <div className={`text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{verif.discrepancy_score}%</div>
            </div>
          )}
        </div>

        {/* Reference Citation & Metadata */}
        {verif.reference_source_details && (
          <div className={`pt-3 border-t flex items-center justify-between text-xs ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/80 text-slate-400'
          }`}>
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-500" />
              <span><strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>Reference Citation:</strong> {verif.reference_source_details}</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border font-mono ${
              isLight 
                ? 'bg-white border-slate-300 text-emerald-700' 
                : 'bg-slate-900 border-slate-700 text-emerald-400'
            }`}>
              Verified Against Karnataka Bhoomi Registry
            </span>
          </div>
        )}
      </div>

      {/* Warnings & Notes (if any) */}
      {warnings.length > 0 && (
        <div className={`p-5 rounded-2xl space-y-2 shadow-lg border ${
          isLight 
            ? 'bg-amber-50 border-amber-300 text-amber-950' 
            : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
        }`}>
          <div className={`flex items-center space-x-2 font-bold text-xs ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Notices &amp; Discrepancy Warnings ({warnings.length}):</span>
          </div>
          <ul className={`text-xs space-y-1 list-disc list-inside pl-1 font-normal ${isLight ? 'text-amber-900' : 'text-amber-200/90'}`}>
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Side-by-Side Field Comparison Table */}
      <div className={`glass-card rounded-3xl border shadow-xl p-6 sm:p-8 space-y-5 ${
        isLight ? 'border-slate-200 bg-white' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-base font-bold font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Side-by-Side Field Verification Analysis
            </h3>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Exact comparative analysis between extracted document OCR entities and authoritative reference records.
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl border font-mono ${
            isLight 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {comparisons.length} Verified Attributes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isLight ? 'border-slate-200 text-slate-700 bg-slate-100' : 'border-slate-800 text-slate-400 bg-slate-900/60'
              }`}>
                <th className="py-3 px-3">Field / Attribute</th>
                <th className="py-3 px-3">Extracted from Document</th>
                <th className="py-3 px-3">Authoritative Reference</th>
                <th className="py-3 px-3">Match Status</th>
                <th className="py-3 px-3">Variance Analysis</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
              {comparisons.map((c, idx) => {
                const isMatch = c.status === "EXACT_MATCH";
                const isPossible = c.status === "POSSIBLE_MATCH";
                return (
                  <tr key={idx} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}`}>
                    <td className={`py-3.5 px-3 font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {c.label}
                    </td>
                    <td className={`py-3.5 px-3 font-mono font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {c.extracted_value}
                    </td>
                    <td className={`py-3.5 px-3 font-mono font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {c.reference_value}
                    </td>
                    <td className="py-3.5 px-3">
                      {isMatch ? (
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Exact Match</span>
                        </span>
                      ) : isPossible ? (
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Possible Match</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}>
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Mismatch</span>
                        </span>
                      )}
                    </td>
                    <td className={`py-3.5 px-3 text-[11px] font-normal leading-relaxed max-w-xs ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {c.difference}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prominent Non-Fraud Disclaimer Callout */}
      <div className={`p-5 rounded-2xl text-xs space-y-2 border ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
      }`}>
        <div className={`flex items-center space-x-2 font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
          <Info className="w-4 h-4 text-emerald-600" />
          <span>Statutory Prototype Guidance &amp; Discrepancy Protocol:</span>
        </div>
        <p className={`leading-relaxed font-normal ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Owner name or parcel extent differences are categorized strictly as <strong>discrepancies</strong> requiring administrative review. They never constitute evidence of fraud or title illegitimacy. In Karnataka revenue administration, differences frequently arise due to pending mutation registers, unrecorded family partitions, standard resurvey recalculations, or dialectal spelling transliterations.
        </p>
      </div>

      {/* Raw OCR Text Dropdown */}
      <div className={`glass-card rounded-2xl border shadow-xl p-5 ${
        isLight ? 'border-slate-200 bg-white' : 'border-slate-800'
      }`}>
        <button
          onClick={() => setShowRawOcr(!showRawOcr)}
          className={`w-full flex items-center justify-between text-xs font-bold transition ${
            isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Extracted Raw OCR Text &amp; Spatial Parsing</span>
          </div>
          {showRawOcr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRawOcr && (
          <div className={`mt-4 pt-4 border-t space-y-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className={`p-4 rounded-xl border font-mono text-[11px] whitespace-pre-wrap max-h-60 overflow-y-auto ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              {extractionData.raw_ocr_text || JSON.stringify(extracted, null, 2)}
            </div>
            <div className={`flex items-center justify-between text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <span>OCR Engine: Tesseract 5 + Multi-Lingual Indic Parsing</span>
              <span>Processing Time: {extractionData.processing_time_ms} ms</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
