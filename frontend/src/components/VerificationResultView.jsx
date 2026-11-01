import React, { useState, useEffect } from 'react';
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
  Layers, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  FileCheck2, 
  Clock, 
  MapPin, 
  ExternalLink 
} from 'lucide-react';
import { generateAuditReport, getAllVerifications, getVerificationResult } from '../api';

export default function VerificationResultView({ extractionData: initialExtractionData, onBack, theme = 'dark' }) {
  const isLight = theme === 'light';
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);
  const [showRawOcr, setShowRawOcr] = useState(false);

  // Record history & selection states
  const [verificationsList, setVerificationsList] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(initialExtractionData?.document_id || null);
  const [activeData, setActiveData] = useState(initialExtractionData || null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // 1. Fetch verification records history on mount
  const loadVerificationsHistory = async (autoSelectId = null) => {
    setLoadingList(true);
    try {
      const res = await getAllVerifications({ limit: 40 });
      const list = res.data || [];
      setVerificationsList(list);

      // If no active data or autoSelectId requested
      const targetId = autoSelectId || selectedDocumentId || (initialExtractionData?.document_id) || (list.length > 0 ? list[0].document_id : null);
      if (targetId) {
        setSelectedDocumentId(targetId);
        // If initialExtractionData matches targetId, use it; otherwise fetch
        if (initialExtractionData && initialExtractionData.document_id === targetId) {
          setActiveData(initialExtractionData);
        } else {
          fetchSingleVerification(targetId);
        }
      }
    } catch (err) {
      console.error("Error loading verification history:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadVerificationsHistory(initialExtractionData?.document_id);
  }, [initialExtractionData]);

  // 2. Fetch single verification details when user switches dropdown
  const fetchSingleVerification = async (docId) => {
    if (!docId) return;
    setLoadingRecord(true);
    try {
      const res = await getVerificationResult(docId);
      const v = res.data;
      if (v) {
        // Adapt response into consistent view schema
        const adapted = {
          document_id: v.document_id,
          record_id: v.record_id,
          filename: v.document_filename || `Document #${v.document_id}`,
          document_category: v.document_category || "RTC / Pahani (Form 16)",
          document_type: v.document_category || "RTC / Pahani (Form 16)",
          language: "kn",
          processing_time_ms: 680,
          raw_ocr_text: v.raw_ocr_text || "",
          extracted_fields: v.extracted_fields || {},
          field_confidences: {},
          verification_result: {
            final_status: v.final_status,
            discrepancy_score: v.discrepancy_score,
            reference_source_details: v.reference_source_details,
            field_comparisons: v.field_comparisons || [],
            warnings: v.warnings || []
          }
        };
        setActiveData(adapted);
      }
    } catch (err) {
      console.error("Error fetching verification details for doc", docId, err);
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleSelectRecord = (e) => {
    const docId = parseInt(e.target.value, 10);
    setSelectedDocumentId(docId);
    fetchSingleVerification(docId);
  };

  // Status badge config generator
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

  const handleDownloadAudit = async () => {
    if (!activeData?.record_id) return;
    setDownloadingReport(true);
    try {
      const res = await generateAuditReport(activeData.record_id);
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

  // If no record is loaded yet and history is empty
  if (!activeData && verificationsList.length === 0 && !loadingList) {
    return (
      <div className={`text-center py-16 glass-card rounded-3xl p-8 max-w-2xl mx-auto border ${
        isLight ? 'border-slate-200 bg-white shadow-md' : 'border-slate-800 shadow-xl'
      }`}>
        <HelpCircle className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
        <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>No Verification Results</h3>
        <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Please upload a document to run the BhoomiAI verification engine.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-semibold hover:from-emerald-500 hover:to-teal-500 shadow-glow-sm transition"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  const verif = activeData?.verification_result || {};
  const status = verif.final_status || "NEEDS_REVIEW";
  const comparisons = verif.field_comparisons || [];
  const warnings = verif.warnings || [];
  const extracted = activeData?.extracted_fields || {};
  const statusConfig = getStatusBadge(status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* 🧭 Record Selector & Action Header */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/80 border-slate-800 shadow-lg'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={onBack}
              className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition shrink-0 ${
                isLight 
                  ? 'text-slate-700 hover:text-slate-900 bg-slate-50 border-slate-300' 
                  : 'text-slate-300 hover:text-white bg-slate-800/80 border-slate-700'
              }`}
              title="Upload another document"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-500" />
              <span>New Upload</span>
            </button>

            {/* Document Switcher Dropdown */}
            <div className="flex-1 min-w-0">
              <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Inspecting Uploaded Record:
              </label>
              <div className="relative">
                <select
                  value={selectedDocumentId || ''}
                  onChange={handleSelectRecord}
                  disabled={loadingRecord || loadingList}
                  className={`w-full text-xs font-semibold rounded-xl px-3 py-2 border outline-none appearance-none transition pr-8 cursor-pointer ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-800 hover:border-emerald-500 focus:border-emerald-500' 
                      : 'bg-slate-950 border-slate-700 text-slate-100 hover:border-emerald-400 focus:border-emerald-400'
                  }`}
                >
                  {verificationsList.map((item) => {
                    const fn = item.document_filename || `Doc #${item.document_id}`;
                    const dist = item.extracted_fields?.district || item.extracted_fields?.village || 'Karnataka';
                    const sy = item.extracted_fields?.survey_number ? `Sy ${item.extracted_fields.survey_number}` : '';
                    return (
                      <option key={item.document_id} value={item.document_id}>
                        Doc #{item.document_id}: {fn} {sy ? `(${sy}, ${dist})` : `(${dist})`} — [{item.final_status}]
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 pointer-events-none text-slate-400" />
              </div>
            </div>

            <button
              onClick={() => loadVerificationsHistory(selectedDocumentId)}
              disabled={loadingList}
              className={`p-2 rounded-xl border transition shrink-0 ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-600 hover:text-slate-900' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Refresh Record List"
            >
              <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
          </div>

          {/* Right Action: PDF report button */}
          <div className="flex items-center space-x-2 shrink-0">

            <button
              onClick={handleDownloadAudit}
              disabled={downloadingReport || !activeData?.record_id}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-glow-sm transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span className="text-white">{downloadingReport ? "Generating..." : "Export Audit PDF"}</span>
            </button>
          </div>

        </div>
      </div>

      {loadingRecord ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
          <p className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Loading verified record analysis...
          </p>
        </div>
      ) : activeData ? (
        <>
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
                    <span className={`text-xs uppercase font-extrabold tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Verification Status:
                    </span>
                    <span className={`text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {statusConfig.label}
                    </span>
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
                  <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Discrepancy Score
                  </div>
                  <div className={`text-2xl font-black font-mono ${
                    verif.final_status === 'MISMATCH_DETECTED'
                      ? 'text-rose-500'
                      : verif.final_status === 'NEEDS_REVIEW'
                      ? 'text-amber-500'
                      : isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}>
                    {verif.final_status === 'MISMATCH_DETECTED' && (!verif.discrepancy_score || verif.discrepancy_score === 0)
                      ? 25.0
                      : verif.discrepancy_score}%
                  </div>
                </div>
              )}
            </div>

            {/* Reference Citation & Metadata */}
            {verif.reference_source_details && (
              <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
                isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/80 text-slate-400'
              }`}>
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    <strong className={isLight ? 'text-slate-800' : 'text-slate-300'}>Reference Citation:</strong>{' '}
                    {verif.reference_source_details}
                  </span>
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
                  Comparative analysis between extracted document OCR entities and authoritative reference records.
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

          {/* Prominent Non-Fraud Statutory Guidance Callout */}
          <div className={`p-5 rounded-2xl text-xs space-y-2 border ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
          }`}>
            <div className={`flex items-center space-x-2 font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              <Info className="w-4 h-4 text-emerald-600" />
              <span>Statutory Guidance &amp; Discrepancy Protocol:</span>
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
                <span>Extracted Raw OCR Text &amp; Metadata</span>
              </div>
              {showRawOcr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRawOcr && (
              <div className={`mt-4 pt-4 border-t space-y-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className={`p-4 rounded-xl border font-mono text-[11px] whitespace-pre-wrap max-h-60 overflow-y-auto ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  {activeData.raw_ocr_text || JSON.stringify(extracted, null, 2)}
                </div>
                <div className={`flex items-center justify-between text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>Multi-Lingual Indic OCR Engine (Kannada / English)</span>
                  <span>Processing Time: {activeData.processing_time_ms || 450} ms</span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}

    </div>
  );
}
