import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  ShieldCheck, 
  FolderSearch,
  Satellite,
  Link as LinkIcon,
  Smartphone,
  CheckCircle2,
  Database,
  FileCheck2,
  Sparkles,
  Sun,
  Moon,
  Compass,
  Layers,
  MapPin,
  Check
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, stats, theme = 'dark', toggleTheme }) {
  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard 
    },
    { 
      id: 'gis', 
      label: 'Cadastral GIS', 
      icon: Satellite,
      badge: stats?.gis_encroachments_count ? `${stats.gis_encroachments_count} alerts` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
    },
    { 
      id: 'upload', 
      label: 'Upload Record', 
      icon: UploadCloud 
    },
    { 
      id: 'verification', 
      label: 'Verification Engine', 
      icon: FileCheck2,
      badge: stats?.awaiting_review ? `${stats.awaiting_review} pending` : (stats?.possible_mismatches ? `${stats.possible_mismatches} flags` : null),
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    },
    { 
      id: 'reference', 
      label: 'Reference Data', 
      icon: Database,
      badge: stats?.total_reference_parcels ? `${stats.total_reference_parcels}` : null,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
    },
    { 
      id: 'records', 
      label: 'Land Registry', 
      icon: FolderSearch 
    },
    { 
      id: 'blockchain', 
      label: 'Blockchain Ledger', 
      icon: LinkIcon,
      badge: stats?.total_blockchain_blocks ? `${stats.total_blockchain_blocks} blocks` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    },
    { 
      id: 'field-inspector', 
      label: 'Field Inspector Mobile', 
      icon: Smartphone 
    },
  ];

  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-xl transition-colors duration-300 ${
      isDark 
        ? 'bg-slate-950/85 border-b border-emerald-500/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)]' 
        : 'bg-white/90 border-b border-slate-200/90 shadow-sm'
    }`}>
      {/* Top Status & Prototype Disclaimer Banner */}
      <div className={`px-4 py-1.5 text-xs font-medium border-b transition-colors flex items-center justify-between ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800/80 text-slate-300' 
          : 'bg-slate-100 border-slate-200 text-slate-700'
      }`}>
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 truncate">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold text-[11px] border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              PILOT ACTIVE
            </span>
            <span className="truncate text-[11px] text-slate-400">
              Karnataka Cadastral GIS &bull; Davanagere &bull; Tumakuru &bull; Shivamogga &bull; Mysuru &bull; BhoomiAI Autonomous Land Verification
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-[11px] font-mono flex-shrink-0">
            <span className="text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              OCR: Kannada &bull; English &bull; Marathi &bull; Hindi
            </span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-emerald-400 font-medium">Bhuvan / OpenStreetMap Satellite Hybrid</span>
          </div>
        </div>
      </div>

      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand Identity */}
          <div 
            className="flex items-center space-x-3.5 cursor-pointer group select-none"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-[1.5px] shadow-[0_0_20px_rgba(16,185,129,0.35)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition duration-300">
                <div className={`w-full h-full rounded-[10px] flex items-center justify-center transition-colors ${
                  isDark ? 'bg-slate-950' : 'bg-slate-900'
                }`}>
                  <ShieldCheck className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition duration-300" />
                </div>
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className={`font-black text-xl tracking-tight transition-colors ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Bhoomi<span className="text-gradient-emerald">AI</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Cadastral GIS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal tracking-tight hidden sm:block">
                Autonomous Land Record Digitization & Geospatial Validation
              </p>
            </div>
          </div>

          {/* Right Controls: District Coverage & Dual Theme Switcher */}
          <div className="flex items-center space-x-3">
            <div className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs border transition-colors ${
              isDark 
                ? 'bg-slate-900/80 border-slate-800 text-slate-300' 
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium text-slate-400">Districts:</span>
              <span className="font-bold text-emerald-400">Davanagere &bull; Tumakuru &bull; Shivamogga &bull; Mysuru</span>
            </div>

            {/* Theme Toggle Button */}
            {toggleTheme && (
              <button
                onClick={toggleTheme}
                title={isDark ? "Switch to Light Theme" : "Switch to Dark Studio Theme"}
                className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 ${
                  isDark 
                    ? 'bg-slate-900/80 hover:bg-slate-800 text-amber-400 border-slate-700 hover:border-amber-400/50 shadow-inner' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Neo-Emerald Floating Strip) */}
        <nav className={`flex space-x-1.5 overflow-x-auto py-2 -mb-px border-t scrollbar-none transition-colors ${
          isDark ? 'border-slate-800/80' : 'border-slate-200/80'
        }`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap border ${
                  isActive
                    ? isDark
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                      : 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                    : isDark
                      ? 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/80 hover:border-slate-800'
                      : 'text-slate-600 border-transparent hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-colors ${
                  isActive 
                    ? (isDark ? 'text-emerald-400' : 'text-white') 
                    : (isDark ? 'text-slate-400' : 'text-slate-500')
                }`} />
                <span className="tracking-wide font-medium">{tab.label}</span>
                {tab.badge ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shadow-xs ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
