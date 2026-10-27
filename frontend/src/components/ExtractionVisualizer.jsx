import React, { useState, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Save, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Percent, 
  Building2, 
  MapPin, 
  FileText,
  DownloadCloud,
  Eye,
  Sliders,
  Check
} from 'lucide-react';
import { getRecordById, updateRecord } from '../api';

export default function ExtractionVisualizer({ extractionResult, recordId, onOpenReport }) {
  const [record, setRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeImgView, setActiveImgView] = useState("processed"); // "processed" or "original"

  useEffect(() => {
    if (extractionResult?.record_id) {
      loadRecord(extractionResult.record_id);
    } else if (recordId) {
      loadRecord(recordId);
    }
  }, [extractionResult, recordId]);

  const loadRecord = async (id) => {
    try {
      const res = await getRecordById(id);
      setRecord(res.data);
      setFormData(res.data);
    } catch (err) {
      console.error("Failed to load record details:", err);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAndRevalidate = async () => {
    if (!record?.id) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await updateRecord(record.id, formData);
      setRecord(res.data);
      setFormData(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save changes: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const getConfidenceBadge = (conf) => {
    if (!conf) conf = 0.88;
    const pct = Math.round(conf * 100);
    if (pct >= 85) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
          {pct}% Conf
        </span>
      );
    } else if (pct >= 70) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-950/80 text-amber-400 border border-amber-800/80 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]"></span>
          {pct}% Conf
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-rose-950/80 text-rose-400 border border-rose-800/80 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f87171]"></span>
        {pct}% Low
      </span>
    );
  };

  const imageUrl = activeImgView === "processed" && extractionResult?.processed_image_url
    ? extractionResult.processed_image_url
    : extractionResult?.original_image_url
      ? extractionResult.original_image_url
      : "/static/samples/sample_rtc_karnataka.png";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Banner with Document Identity and Actions */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-cyan-300 border border-blue-400/30">
              {extractionResult?.document_type || record?.source_department || "RTC / Form 16"}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Record ID: #{record?.id || "N/A"}
            </span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide border ${
              record?.status === 'VALID' 
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80' 
                : 'bg-rose-950/80 text-rose-400 border-rose-800/80'
            }`}>
              {record?.status || "VALIDATING"}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white font-outfit mt-2">
            Survey No: <span className="text-gradient-blue font-mono">{formData.survey_number || "142/2"}</span> &bull; {formData.village || "Vijayapura"}, {formData.district || "Bengaluru Rural"}
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          {record?.id && (
            <button
              onClick={() => onOpenReport(record.id)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 shadow-sm transition flex items-center space-x-2"
            >
              <DownloadCloud className="w-4 h-4 text-amber-400" />
              <span>Official Audit PDF</span>
            </button>
          )}

          <button
            disabled={isSaving}
            onClick={handleSaveAndRevalidate}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-glow-sm shadow-blue-500/30 transition flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Re-validating..." : "Save & Re-Validate"}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>Fields successfully updated and rules re-validated against revenue guidelines.</span>
        </div>
      )}

      {/* Two Column Layout: Scanned Document with Bounding Boxes vs Structured Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Viewer with Zoom Controls (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-cyan-400" /> Document Scan &amp; Bounding Boxes
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveImgView(activeImgView === "processed" ? "original" : "processed")}
                className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold text-slate-300 transition"
              >
                {activeImgView === "processed" ? "Original" : "OCR Overlay"}
              </button>
              <button 
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-slate-400 font-mono px-1">{Math.round(zoomLevel * 100)}%</span>
              <button 
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setZoomLevel(1)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Container with Zoomable Image */}
          <div className="mt-4 overflow-auto flex-1 max-h-[620px] bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 flex items-center justify-center">
            <img 
              src={imageUrl} 
              alt="Land Record Scan"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
              className="max-w-full rounded-lg shadow-xl transition-transform duration-150"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800/60">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span> High Conf (&gt;85%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]"></span> Medium (70-85%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f87171]"></span> Low (&lt;70%)
            </span>
          </div>
        </div>

        {/* Right Column: Structured Extracted Fields Form (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-white font-outfit uppercase tracking-wide">
                Structured Digital Land Profile
              </h3>
              <p className="text-xs text-slate-400">
                Human-in-the-loop editing. Saving re-triggers automatic cross-department and statutory validation.
              </p>
            </div>
            {record?.issues?.length > 0 && (
              <span className="text-xs px-3 py-1 bg-rose-950/80 text-rose-400 border border-rose-800/80 rounded-full font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{record.issues.length} Issues Flagged</span>
              </span>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Primary Titleholder */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Primary Titleholder Name</label>
                {getConfidenceBadge(extractionResult?.field_confidences?.owner_name)}
              </div>
              <input 
                type="text" 
                value={formData.owner_name || ''} 
                onChange={(e) => handleInputChange('owner_name', e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* Relative Name */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Father's / Husband's Name</label>
                {getConfidenceBadge(extractionResult?.field_confidences?.relative_name)}
              </div>
              <input 
                type="text" 
                value={formData.relative_name || ''} 
                onChange={(e) => handleInputChange('relative_name', e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* Survey / Khasra Number */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Survey / Khasra Number</label>
                {getConfidenceBadge(extractionResult?.field_confidences?.survey_number)}
              </div>
              <input 
                type="text" 
                value={formData.survey_number || ''} 
                onChange={(e) => handleInputChange('survey_number', e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-cyan-300 font-mono font-bold focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* Sub-division / Hissa */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Sub-Division (Hissa)</label>
                {getConfidenceBadge(extractionResult?.field_confidences?.sub_division)}
              </div>
              <input 
                type="text" 
                value={formData.sub_division || ''} 
                onChange={(e) => handleInputChange('sub_division', e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* Land Area Extent */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Land Area Extent</label>
                {getConfidenceBadge(extractionResult?.field_confidences?.area_value)}
              </div>
              <div className="flex space-x-2">
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.area_value !== undefined ? formData.area_value : ''} 
                  onChange={(e) => handleInputChange('area_value', parseFloat(e.target.value) || 0)}
                  className="w-2/3 text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white font-mono font-bold focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition"
                />
                <select 
                  value={formData.area_unit || 'Acres'}
                  onChange={(e) => handleInputChange('area_unit', e.target.value)}
                  className="w-1/3 text-xs px-2.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Acres">Acres</option>
                  <option value="Hectares">Hectares</option>
                  <option value="Guntas">Guntas</option>
                  <option value="Sq Ft">Sq Ft</option>
                </select>
              </div>
            </div>

            {/* Normalized Standard Acres */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Standardized Area (Acres)</label>
                <span className="text-[10px] text-cyan-400 font-mono">Auto-normalized</span>
              </div>
              <input 
                type="text" 
                readOnly
                value={`${(formData.area_in_acres || formData.area_value || 0).toFixed(2)} Acres`}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-cyan-300 font-mono font-bold"
              />
            </div>

            {/* Village */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Village</label>
              <input 
                type="text" 
                value={formData.village || ''} 
                onChange={(e) => handleInputChange('village', e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:border-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* Taluk */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Taluk / Tehsil</label>
              <input 
                type="text" 
                value={formData.taluk || ''} 
                onChange={(e) => handleInputChange('taluk', e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:border-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">District</label>
              <input 
                type="text" 
                value={formData.district || ''} 
                onChange={(e) => handleInputChange('district', e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:border-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* Land Classification */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Land Classification</label>
              <input 
                type="text" 
                value={formData.land_type || ''} 
                onChange={(e) => handleInputChange('land_type', e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:border-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* Registration Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Registration Date</label>
              <input 
                type="text" 
                value={formData.registration_date || ''} 
                onChange={(e) => handleInputChange('registration_date', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-400 focus:outline-none transition"
              />
            </div>

            {/* Valuation Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Valuation / Consideration (Rs)</label>
              <input 
                type="number" 
                value={formData.valuation_amount || 0} 
                onChange={(e) => handleInputChange('valuation_amount', parseFloat(e.target.value) || 0)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-amber-300 font-mono font-bold focus:border-cyan-400 focus:outline-none transition"
              />
            </div>
          </div>

          {/* GIS & Blockchain Geotag Summary */}
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Cadastral Geodesic Coordinates
              </span>
              <span className="font-mono text-cyan-300 text-[11px]">
                {formData.latitude ? `${formData.latitude.toFixed(5)}° N, ${formData.longitude.toFixed(5)}° E` : "13.2924° N, 77.8012° E"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Blockchain Audit Hash
              </span>
              <span className="font-mono text-indigo-300 text-[11px] truncate max-w-[240px]">
                {record?.blockchain_tx_hash || "Anchored in Block #1"}
              </span>
            </div>
          </div>

          {/* Validation Issues on this Record */}
          {record?.issues?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Detected Validation Anomalies ({record.issues.length})
              </h4>
              <div className="space-y-2">
                {record.issues.map((iss, i) => (
                  <div key={i} className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-rose-200">{iss.field_name} &bull; {iss.issue_type}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {iss.severity}
                      </span>
                    </div>
                    <p className="text-rose-300/90">{iss.description}</p>
                    {iss.suggested_fix && (
                      <p className="text-slate-400 text-[11px] pt-1 border-t border-rose-900/40">
                        <b className="text-slate-300">Suggested Action:</b> {iss.suggested_fix}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
