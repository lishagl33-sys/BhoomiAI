import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Database, 
  Sparkles, 
  ArrowUpRight, 
  TrendingUp, 
  Activity, 
  ShieldCheck, 
  Satellite, 
  Smartphone, 
  Filter, 
  RefreshCw, 
  MapPin, 
  UploadCloud,
  Check,
  FileCheck2
} from 'lucide-react';
import { getDashboardStats, getDistricts, getTaluks } from '../api';

export default function DashboardOverview({ stats: initialStats, setActiveTab, setSelectedRecordId, theme = 'dark' }) {
  const isLight = theme === 'light';
  const [stats, setStats] = useState(initialStats);
  const [district, setDistrict] = useState("ALL");
  const [taluk, setTaluk] = useState("ALL");
  const [recordYear, setRecordYear] = useState("ALL");
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load districts
  useEffect(() => {
    getDistricts()
      .then((res) => setDistricts(res.data))
      .catch((err) => console.error("Error loading districts", err));
  }, []);

  // When district changes, load taluks
  useEffect(() => {
    if (district !== "ALL") {
      getTaluks(district)
        .then((res) => setTaluks(res.data))
        .catch((err) => console.error("Error loading taluks", err));
    } else {
      setTaluks([]);
      setTaluk("ALL");
    }
  }, [district]);

  // Fetch updated stats when filters change
  const refreshStats = async () => {
    setLoading(true);
    try {
      const params = {};
      if (district !== "ALL") params.district = district;
      if (taluk !== "ALL") params.taluk = taluk;
      if (recordYear !== "ALL") params.record_year = recordYear;
      const res = await getDashboardStats(params);
      setStats(res.data);
    } catch (err) {
      console.error("Error refreshing stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
  }, [district, taluk, recordYear]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin mx-auto"></div>
          <div className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Loading BhoomiAI metrics...</div>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Uploaded Records',
      value: stats.total_documents,
      subtext: 'Scans & PDFs ingested',
      icon: FileText,
      color: isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      actionTab: 'upload'
    },
    {
      label: 'Successfully Processed (Match)',
      value: stats.successfully_processed ?? 1,
      subtext: 'Exact baseline alignment',
      icon: CheckCircle2,
      color: isLight ? 'bg-teal-50 text-teal-700 border-teal-300' : 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      actionTab: 'verification'
    },
    {
      label: 'Awaiting Review (Needs Review)',
      value: stats.awaiting_review ?? 0,
      subtext: 'Minor area or name variance',
      icon: AlertTriangle,
      color: isLight ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      actionTab: 'verification'
    },
    {
      label: 'Possible Mismatches',
      value: stats.possible_mismatches ?? 1,
      subtext: 'Discrepancy detected (>2.5%)',
      icon: XCircle,
      color: isLight ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      actionTab: 'verification'
    },
    {
      label: 'Reference Unavailable',
      value: stats.insufficient_reference_data ?? 0,
      subtext: 'No baseline record found',
      icon: HelpCircle,
      color: isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-500/10 text-slate-300 border-slate-500/30',
      actionTab: 'verification'
    },
    {
      label: 'Reference Baseline Parcels',
      value: stats.total_reference_parcels ?? 12,
      subtext: 'Authoritative ground truth',
      icon: Database,
      color: isLight ? 'bg-cyan-50 text-cyan-700 border-cyan-300' : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      actionTab: 'reference'
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Hero Banner with Neo-Emerald Studio Styling */}
      <div className={`glass-card p-6 sm:p-8 rounded-3xl border relative overflow-hidden flex flex-wrap items-center justify-between gap-6 ${
        isLight ? 'border-emerald-200 shadow-md bg-white' : 'border-emerald-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
      }`}>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2.5 max-w-2xl relative z-10">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold ${
            isLight ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Pilot Active &bull; Davanagere, Tumakuru, Shivamogga &amp; Mysuru Districts</span>
          </div>
          <h2 className={`text-3xl font-black font-outfit tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Bhoomi<span className="text-gradient-emerald">AI</span> Verification Dashboard
          </h2>
          <p className={`text-xs leading-relaxed font-normal ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            AI-powered side-by-side verification comparing land document scans (RTCs, Mutation Extracts, Deeds) against authoritative Karnataka reference datasets with instant cryptographic anchoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => setActiveTab('gis')}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-glow-sm transition flex items-center space-x-2"
          >
            <Satellite className="w-4 h-4 text-white" />
            <span className="text-white">Cadastral GIS Map</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 font-bold text-xs rounded-xl border shadow-xs transition flex items-center space-x-2 ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                : 'bg-slate-900/80 hover:bg-slate-800 text-white border-slate-700'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-500" />
            <span>Upload Record</span>
          </button>

          <button
            onClick={() => setActiveTab('reference')}
            className={`px-4 py-2.5 font-bold text-xs rounded-xl border shadow-xs transition flex items-center space-x-2 ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-emerald-800 border-slate-300' 
                : 'bg-slate-900/80 hover:bg-slate-800 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Reference Dataset</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`glass-card rounded-2xl border p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'border-slate-200 bg-white' : 'border-slate-800'
      }`}>
        <div className={`flex items-center space-x-2 text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          <Filter className="w-4 h-4 text-emerald-500" />
          <span>Dashboard Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* District Filter */}
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:border-emerald-500 ${
              isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-900 text-slate-200'
            }`}
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
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:border-emerald-500 ${
                isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-900 text-slate-200'
              }`}
            >
              <option value="ALL">All Taluks</option>
              {taluks.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Record Year Filter */}
          <select
            value={recordYear}
            onChange={(e) => setRecordYear(e.target.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:border-emerald-500 ${
              isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-900 text-slate-200'
            }`}
          >
            <option value="ALL">All Record Years</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
            <option value="2022-2023">2022-2023</option>
            <option value="2021-2022">2021-2022</option>
          </select>

          <button
            onClick={refreshStats}
            className={`p-1.5 rounded-xl transition border ${
              isLight 
                ? 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100 border-slate-200' 
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 border-transparent hover:border-slate-700'
            }`}
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (6 metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => setActiveTab(kpi.actionTab)}
              className={`glass-card p-5 rounded-2xl cursor-pointer shadow-lg transition-all duration-300 flex flex-col justify-between space-y-3 group ${
                isLight 
                  ? 'border-slate-200 bg-white hover:border-emerald-500 hover:shadow-md' 
                  : 'border-slate-800/80 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl border ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className={`w-4 h-4 transition ${
                  isLight ? 'text-slate-400 group-hover:text-emerald-600' : 'text-slate-500 group-hover:text-emerald-400'
                }`} />
              </div>

              <div>
                <div className={`text-2xl font-black font-mono tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {kpi.value}
                </div>
                <div className={`text-xs font-bold mt-0.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{kpi.label}</div>
                <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{kpi.subtext}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verification Categories Breakdown Banner */}
      <div className={`glass-card p-6 rounded-3xl border shadow-xl space-y-4 ${
        isLight ? 'border-slate-200 bg-white' : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-base font-bold font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Verification Engine Categorization Breakdown
            </h3>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Live status classification based on side-by-side comparison with ReferenceParcel ground truth
            </p>
          </div>
          <button
            onClick={() => setActiveTab('reference')}
            className={`text-xs font-bold hover:underline ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
          >
            Manage Reference Dataset &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className={`p-4 rounded-2xl space-y-1 ${
            isLight 
              ? 'bg-emerald-50/90 border border-emerald-300' 
              : 'bg-emerald-950/40 border border-emerald-500/30'
          }`}>
            <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>1. Match</span>
            <div className={`text-2xl font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
              {stats.successfully_processed ?? 1}
            </div>
            <p className={`text-[11px] leading-snug ${isLight ? 'text-emerald-800' : 'text-emerald-200/80'}`}>
              Conforms with reference data within 0.5% tolerance and matching titleholder.
            </p>
          </div>

          <div className={`p-4 rounded-2xl space-y-1 ${
            isLight 
              ? 'bg-amber-50/90 border border-amber-300' 
              : 'bg-amber-950/40 border border-amber-500/30'
          }`}>
            <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>2. Needs Review</span>
            <div className={`text-2xl font-black font-mono ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
              {stats.awaiting_review ?? 0}
            </div>
            <p className={`text-[11px] leading-snug ${isLight ? 'text-amber-800' : 'text-amber-200/80'}`}>
              Minor extent variance (0.5% - 2.5%) or partial titleholder phonetic match.
            </p>
          </div>

          <div className={`p-4 rounded-2xl space-y-1 ${
            isLight 
              ? 'bg-rose-50/90 border border-rose-300' 
              : 'bg-rose-950/40 border border-rose-500/30'
          }`}>
            <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-rose-800' : 'text-rose-400'}`}>3. Mismatch Detected</span>
            <div className={`text-2xl font-black font-mono ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>
              {stats.possible_mismatches ?? 1}
            </div>
            <p className={`text-[11px] leading-snug ${isLight ? 'text-rose-800' : 'text-rose-200/80'}`}>
              Variance &gt; 2.5%, survey discrepancy, or titleholder divergence.
            </p>
          </div>

          <div className={`p-4 rounded-2xl space-y-1 ${
            isLight 
              ? 'bg-slate-100 border border-slate-300' 
              : 'bg-slate-900/60 border border-slate-700/60'
          }`}>
            <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>4. Reference Unavailable</span>
            <div className={`text-2xl font-black font-mono ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              {stats.insufficient_reference_data ?? 0}
            </div>
            <p className={`text-[11px] leading-snug ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              No matching reference parcel in Davanagere, Tumakuru, Shivamogga, or Mysuru catalog.
            </p>
          </div>
        </div>
      </div>

      {/* Analytics & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Platform Core Capabilities Modules */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
            <div 
              onClick={() => setActiveTab('verification')}
              className={`glass-card p-5 rounded-2xl border cursor-pointer shadow-lg transition space-y-3 group flex flex-col justify-between ${
                isLight ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-500' : 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <FileCheck2 className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition" />
                  <ArrowUpRight className={`w-4 h-4 transition ${isLight ? 'text-slate-400 group-hover:text-emerald-600' : 'text-slate-500 group-hover:text-emerald-400'}`} />
                </div>
                <div className={`font-bold text-sm mt-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>Verification Engine</div>
                <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Automated RTC and survey document verification against authoritative reference cadastre with discrepancy scoring.
                </p>
              </div>
              <span className={`text-xs font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Launch Engine &rarr;</span>
            </div>

            <div 
              onClick={() => setActiveTab('gis')}
              className={`glass-card p-5 rounded-2xl border cursor-pointer shadow-lg transition space-y-3 group flex flex-col justify-between ${
                isLight ? 'border-slate-200 bg-white hover:border-emerald-500' : 'border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Satellite className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition" />
                  <ArrowUpRight className={`w-4 h-4 transition ${isLight ? 'text-slate-400 group-hover:text-emerald-600' : 'text-slate-500 group-hover:text-emerald-400'}`} />
                </div>
                <div className={`font-bold text-sm mt-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>Cadastral GIS Map</div>
                <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Boundary overlays, satellite and normal map viewing, village navigation, and interactive land parcel selection.
                </p>
              </div>
              <span className={`text-xs font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Open Map &rarr;</span>
            </div>



            <div 
              onClick={() => setActiveTab('field-inspector')}
              className={`glass-card p-5 rounded-2xl border cursor-pointer shadow-lg transition space-y-3 group flex flex-col justify-between ${
                isLight ? 'border-slate-200 bg-white hover:border-emerald-500' : 'border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Smartphone className="w-6 h-6 text-cyan-500 group-hover:scale-110 transition" />
                  <ArrowUpRight className={`w-4 h-4 transition ${isLight ? 'text-slate-400 group-hover:text-emerald-600' : 'text-slate-500 group-hover:text-cyan-400'}`} />
                </div>
                <div className={`font-bold text-sm mt-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>Field Inspector Mobile</div>
                <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  On-site GPS geofencing, physical boundary stone inspection, and geo-tagged photo audits.
                </p>
              </div>
              <span className={`text-xs font-semibold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>Open Inspector &rarr;</span>
            </div>
          </div>
        </div>

        {/* Right Col: Live Activity Stream */}
        <div className={`glass-card p-6 rounded-2xl border shadow-xl flex flex-col justify-between space-y-5 ${
          isLight ? 'border-slate-200 bg-white' : 'border-slate-800'
        }`}>
          <div className="space-y-3">
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`text-sm font-bold font-outfit flex items-center space-x-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Recent Land Records</span>
              </h3>
              <button 
                onClick={() => setActiveTab('records')}
                className={`text-xs font-bold hover:underline ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {stats.recent_activity?.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-xl cursor-pointer transition space-y-1 border ${
                    isLight 
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-emerald-500/40' 
                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-emerald-500/40'
                  }`}
                  onClick={() => {
                    setSelectedRecordId(item.id);
                    setActiveTab('records');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      item.status === 'VALID' 
                        ? (isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30') 
                        : (isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/20 text-rose-300 border-rose-500/30')
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Owner: <span className={`font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.owner}</span>
                  </p>
                  <div className={`flex items-center justify-between text-[11px] pt-1 border-t ${
                    isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-800/60'
                  }`}>
                    <span>Extent: {item.area}</span>
                    <span className={`font-mono text-[10px] ${isLight ? 'text-emerald-700 font-semibold' : 'text-emerald-400'}`}>Sy No: {item.survey_number || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prototype Guidance Callout */}
          <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
            isLight 
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' 
              : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>BhoomiAI Pilot Verification Ready</span>
            </div>
            <p className={`text-[11px] leading-snug ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Upload any Karnataka RTC scan to automatically cross-verify with Davanagere, Tumakuru, Shivamogga, and Mysuru cadastral registers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
