import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardOverview from './components/DashboardOverview';
import DocumentUpload from './components/DocumentUpload';
import VerificationResultView from './components/VerificationResultView';
import ReferenceDataManager from './components/ReferenceDataManager';
import ExtractionVisualizer from './components/ExtractionVisualizer';
import ValidationCenter from './components/ValidationCenter';
import DuplicateDetector from './components/DuplicateDetector';
import MismatchAnalysis from './components/MismatchAnalysis';
import RecordManager from './components/RecordManager';
import ReportModal from './components/ReportModal';
import GisMapViewer from './components/GisMapViewer';
import BlockchainLedger from './components/BlockchainLedger';
import FieldInspectorMobile from './components/FieldInspectorMobile';
import { getDashboardStats } from './api';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-8 max-w-xl mx-auto rounded-2xl border border-red-500/30 bg-red-950/20 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-400">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-red-300">View Rendering Notice</h2>
          <p className="text-xs text-red-200/80 font-mono">
            {this.state.error?.message || "An unexpected issue occurred while rendering this module."}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Reload Page
            </button>
            <button
              onClick={() => { this.setState({ hasError: false }); if (this.props.onReset) this.props.onReset(); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Reset to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to Dashboard
  const [stats, setStats] = useState(null);
  const [latestExtraction, setLatestExtraction] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [reportModalRecordId, setReportModalRecordId] = useState(null);
  const [preselectedParcelForInspection, setPreselectedParcelForInspection] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('bhoomi_theme') || 'dark');

  useEffect(() => {
    fetchStats();
  }, [activeTab]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-theme');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('bhoomi_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const fetchStats = async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    }
  };

  const handleExtractionComplete = (result) => {
    setLatestExtraction(result);
    setSelectedRecordId(result.record_id);
    fetchStats();
    setActiveTab('verification');
  };

  const handleSelectRecord = (id) => {
    setSelectedRecordId(id);
    setActiveTab('visualizer');
  };

  const handleOpenReport = (id) => {
    setReportModalRecordId(id);
  };

  const handleSelectParcelForInspection = (parcel) => {
    setPreselectedParcelForInspection(parcel);
    setActiveTab('field-inspector');
  };

  return (
    <div className={`min-h-screen flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white' 
        : 'bg-slate-50 text-slate-900 selection:bg-emerald-200 selection:text-emerald-950'
    }`}>
      {/* Neo-Emerald Studio Navigation Header */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        stats={stats} 
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Workspace */}
      <ErrorBoundary onReset={() => setActiveTab('dashboard')}>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'gis' && (
          <GisMapViewer 
            onSelectParcelForInspection={handleSelectParcelForInspection}
            globalTheme={theme}
            onToggleGlobalTheme={toggleTheme}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardOverview 
            stats={stats} 
            setActiveTab={setActiveTab} 
            setSelectedRecordId={setSelectedRecordId} 
            theme={theme}
          />
        )}

        {activeTab === 'upload' && (
          <DocumentUpload 
            onExtractionComplete={handleExtractionComplete} 
            theme={theme}
          />
        )}

        {activeTab === 'verification' && (
          <VerificationResultView 
            extractionData={latestExtraction}
            onBack={() => setActiveTab('upload')}
            theme={theme}
          />
        )}

        {activeTab === 'reference' && (
          <ReferenceDataManager theme={theme} />
        )}

        {activeTab === 'visualizer' && (
          <ExtractionVisualizer 
            extractionResult={latestExtraction}
            recordId={selectedRecordId}
            onOpenReport={handleOpenReport}
            theme={theme}
          />
        )}

        {activeTab === 'blockchain' && (
          <BlockchainLedger theme={theme} />
        )}

        {activeTab === 'field-inspector' && (
          <FieldInspectorMobile 
            preselectedParcel={preselectedParcelForInspection}
            theme={theme}
          />
        )}

        {activeTab === 'validation' && (
          <ValidationCenter 
            onSelectRecord={handleSelectRecord} 
            theme={theme}
          />
        )}

        {activeTab === 'duplicates' && (
          <DuplicateDetector 
            onSelectRecord={handleSelectRecord} 
            theme={theme}
          />
        )}

        {activeTab === 'mismatches' && (
          <MismatchAnalysis theme={theme} />
        )}

        {activeTab === 'records' && (
          <RecordManager 
            onSelectRecord={handleSelectRecord} 
            onOpenReport={handleOpenReport}
            theme={theme}
          />
        )}
        </main>
      </ErrorBoundary>

      {/* Official PDF Certificate Modal */}
      {reportModalRecordId && (
        <ReportModal 
          recordId={reportModalRecordId} 
          onClose={() => setReportModalRecordId(null)} 
        />
      )}

      {/* Footer */}
      <footer className={`border-t mt-16 py-6 transition-colors duration-300 ${
        theme === 'dark' 
          ? 'bg-slate-950/80 border-slate-800/80 text-slate-400' 
          : 'bg-white border-slate-200 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs gap-4">
          <div className="flex items-center space-x-2.5">
            <span className="font-extrabold text-sm tracking-wide">
              Bhoomi<span className="text-gradient-emerald">AI</span>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="font-medium">
              Autonomous Land Record Digitization, Cadastral GIS &amp; Validation System
            </span>
          </div>
          <div className="flex flex-wrap items-center space-x-3 text-[11px] text-slate-400">
            <span>FastAPI &bull; Indic OCR &bull; Cadastral GIS &bull; Blockchain Ledger &bull; React &bull; Tailwind</span>
            <span className="text-emerald-500">&bull;</span>
            <span className="text-emerald-400 font-semibold">Karnataka Pilot: Davanagere, Tumakuru, Shivamogga &amp; Mysuru</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
