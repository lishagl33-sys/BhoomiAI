import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  Building, 
  Sparkles,
  Layers,
  MapPin,
  Check
} from 'lucide-react';
import { 
  getReferenceParcels, 
  importReferenceParcels, 
  getReferenceTemplateUrl,
  getDistricts,
  getTaluks
} from '../api';

export default function ReferenceDataManager() {
  const [parcels, setParcels] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('ALL');
  const [taluk, setTaluk] = useState('ALL');
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);

  // Import modal & results
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDistricts();
    loadParcels();
  }, []);

  const loadDistricts = async () => {
    try {
      const res = await getDistricts();
      setDistricts(res.data);
    } catch (err) {
      console.error("Error loading districts", err);
    }
  };

  useEffect(() => {
    if (district !== 'ALL') {
      getTaluks(district)
        .then((res) => setTaluks(res.data))
        .catch((err) => console.error("Error loading taluks", err));
    } else {
      setTaluks([]);
      setTaluk('ALL');
    }
    loadParcels();
  }, [district, taluk]);

  const loadParcels = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (district !== 'ALL') params.district = district;
      if (taluk !== 'ALL') params.taluk = taluk;
      
      const res = await getReferenceParcels(params);
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setParcels(data);
      setTotal(Array.isArray(res.data) ? res.data.length : (res.data?.total || data.length));
    } catch (err) {
      console.error("Error fetching reference parcels", err);
      setError("Failed to load reference dataset.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadParcels();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError("Only CSV files are allowed for bulk import.");
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset_source', 'Admin CSV Import');

    try {
      const res = await importReferenceParcels(formData);
      setImportResult(res.data);
      loadParcels();
    } catch (err) {
      console.error("Import error", err);
      setError(err.response?.data?.detail || "CSV Import failed.");
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authoritative Baseline Registry</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white font-outfit tracking-tight">
            Reference <span className="text-gradient-emerald">Dataset Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative baseline parcel registry used by the BhoomiAI verification engine.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Download CSV Template */}
          <a
            href={getReferenceTemplateUrl()}
            download="bhoomi_reference_template.csv"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Template</span>
          </a>

          {/* Admin CSV Bulk Import */}
          <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-glow-sm transition">
            <Upload className="w-4 h-4" />
            <span>{importing ? "Importing..." : "Bulk Import CSV"}</span>
            <input
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CSV Import Report (if just imported) */}
      {importResult && (
        <div className="glass-card p-5 rounded-2xl border border-emerald-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>CSV Bulk Import Validation Summary</span>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Total Rows Processed: {importResult.total_rows}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Valid &amp; Imported</div>
              <div className="text-xl font-bold text-emerald-300 font-mono">{importResult.valid_rows}</div>
            </div>
            <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-500/30 text-center">
              <div className="text-[10px] uppercase font-bold text-rose-400">Invalid &amp; Rejected</div>
              <div className="text-xl font-bold text-rose-300 font-mono">{importResult.invalid_rows}</div>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Rows</div>
              <div className="text-xl font-bold text-slate-200 font-mono">{importResult.total_rows}</div>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-3 p-3 bg-rose-950/40 rounded-xl border border-rose-500/30 max-h-40 overflow-y-auto space-y-1">
              <div className="text-[11px] font-bold text-rose-300">Rejected Row Issues:</div>
              {importResult.errors.map((err, idx) => (
                <div key={idx} className="text-[11px] text-rose-300 font-mono">
                  Row {err.row}: {err.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-2 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by owner name, survey number, or village..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-glow-sm transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center space-x-2">
          {/* District Filter */}
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Districts</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Taluk Filter */}
          {taluks.length > 0 && (
            <select
              value={taluk}
              onChange={(e) => setTaluk(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Taluks</option>
              {taluks.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={loadParcels}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="glass-card rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Reference Parcels ({parcels.length})
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 font-mono">
              Karnataka Ground Truth
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Showing verified baseline parcels
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/60">
                <th className="py-3 px-4">Survey / Hissa</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Titleholder</th>
                <th className="py-3 px-4">Extent (Acres)</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Baseline Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    Loading reference records...
                  </td>
                </tr>
              ) : parcels.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    No reference parcels found matching filter.
                  </td>
                </tr>
              ) : (
                parcels.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {p.survey_number}{p.hissa_number && p.hissa_number !== '*' ? `/${p.hissa_number}` : ''}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{p.village}</div>
                      <div className="text-[10px] text-slate-500">{p.taluk}, {p.district}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{p.owner_name}</div>
                      {p.owner_name_kannada && (
                        <div className="text-[11px] text-emerald-400/90">{p.owner_name_kannada}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {p.extent_acres} Ac
                      {p.extent_guntas > 0 && <span className="text-slate-400 text-[11px] ml-1">({p.extent_guntas} Guntas)</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {p.land_type || "Agricultural"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {p.dataset_source}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
