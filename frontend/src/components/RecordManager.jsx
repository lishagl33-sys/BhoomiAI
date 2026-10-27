import React, { useState, useEffect } from 'react';
import { 
  FolderSearch, 
  Search, 
  Filter, 
  Download, 
  ArrowRight, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Building,
  Layers,
  Sparkles
} from 'lucide-react';
import { getRecords } from '../api';

export default function RecordManager({ onSelectRecord, onOpenReport }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, districtFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await getRecords({
        search: searchTerm,
        district: districtFilter,
        status: statusFilter
      });
      setRecords(res.data);
    } catch (err) {
      console.error("Failed to load records:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecords();
  };

  const exportCSV = () => {
    if (!records.length) return;
    const headers = ["ID", "Survey Number", "Sub Division", "Owner Name", "Village", "Taluk", "District", "Area (Acres)", "Land Type", "Department", "Status"];
    const rows = records.map(r => [
      r.id,
      `"${r.survey_number}"`,
      `"${r.sub_division}"`,
      `"${r.owner_name}"`,
      `"${r.village}"`,
      `"${r.taluk || ''}"`,
      `"${r.district}"`,
      r.area_in_acres,
      `"${r.land_type}"`,
      `"${r.source_department}"`,
      `"${r.status}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bhoomi_records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    if (!records.length) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bhoomi_records_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Title & Toolbar */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2.5">
            <FolderSearch className="w-6 h-6 text-emerald-400" />
            <span>Digital Land Record Registry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, and audit digitized title deeds, RTCs, and 7/12 extracts across state jurisdictions.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={exportCSV}
            className="px-4 py-2 glass-card hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportJSON}
            className="px-4 py-2 glass-card hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by survey number, owner name, village, or mutation no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-glow-sm transition"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:border-emerald-400 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="VALID">Valid Clean Records</option>
            <option value="FLAGGED">Flagged with Issues</option>
            <option value="PENDING_REVIEW">Pending Review</option>
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:border-emerald-400 focus:outline-none"
          >
            <option value="ALL">All Districts</option>
            <option value="Davanagere">Davanagere</option>
            <option value="Tumakuru">Tumakuru</option>
            <option value="Shivamogga">Shivamogga</option>
            <option value="Mysuru">Mysuru</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-16">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            No matching digitized land records found in the registry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-5">Record ID</th>
                  <th className="py-3.5 px-5">Survey / Hissa</th>
                  <th className="py-3.5 px-5">Titleholder Name</th>
                  <th className="py-3.5 px-5">Location (Village / Dist)</th>
                  <th className="py-3.5 px-5">Land Extent</th>
                  <th className="py-3.5 px-5">Classification</th>
                  <th className="py-3.5 px-5">Department</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {records.map((r) => {
                  const isValid = r.status === "VALID";
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition duration-150">
                      <td className="py-4 px-5 font-mono font-bold text-slate-400">#{r.id}</td>
                      <td className="py-4 px-5 font-mono font-bold text-cyan-300">
                        {r.survey_number}/{r.sub_division}
                      </td>
                      <td className="py-4 px-5 font-semibold text-white">
                        <div>{r.owner_name}</div>
                        {r.relative_name && <div className="text-[10px] text-slate-500 font-normal">s/o {r.relative_name}</div>}
                      </td>
                      <td className="py-4 px-5 text-slate-300">
                        <div>{r.village}</div>
                        <div className="text-[10px] text-slate-500">{r.district}, {r.state}</div>
                      </td>
                      <td className="py-4 px-5 font-mono font-semibold text-cyan-300">
                        {r.area_value} {r.area_unit}
                        <div className="text-[10px] text-slate-500 font-normal">({r.area_in_acres.toFixed(2)} Acres)</div>
                      </td>
                      <td className="py-4 px-5 text-slate-400">{r.land_type}</td>
                      <td className="py-4 px-5 text-slate-400 text-[11px]">{r.source_department}</td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase border ${
                          isValid 
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80' 
                            : 'bg-rose-950/80 text-rose-400 border-rose-800/80'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          onClick={() => onSelectRecord(r.id)}
                          className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-blue-500/30 font-semibold rounded-lg transition"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => onOpenReport(r.id)}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold rounded-lg transition"
                          title="Generate Official Audit Certificate"
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
