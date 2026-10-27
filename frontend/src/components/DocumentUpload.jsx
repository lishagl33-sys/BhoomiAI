import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileCheck2,
  RefreshCw,
  FolderOpen,
  MapPin,
  CheckCircle,
  Globe2,
  Lock,
  Layers,
  Check
} from 'lucide-react';
import { uploadDocument, runSampleExtraction, getDistricts, getTaluks, getHoblis, getVillages } from '../api';

export default function DocumentUpload({ onExtractionComplete, theme = 'dark' }) {
  const isLight = theme === 'light';
  const [selectedFile, setSelectedFile] = useState(null);
  const [supportingFiles, setSupportingFiles] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('kn');
  const [documentCategory, setDocumentCategory] = useState('RTC');
  
  // Karnataka administrative hierarchy
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [hoblis, setHoblis] = useState([]);
  const [villages, setVillages] = useState([]);

  const [selectedDistrict, setSelectedDistrict] = useState('Tumakuru');
  const [selectedTaluk, setSelectedTaluk] = useState('Tumakuru');
  const [selectedHobli, setSelectedHobli] = useState('Kasaba');
  const [selectedVillage, setSelectedVillage] = useState('Melekote');

  // Parcel Identifiers
  const [surveyNumber, setSurveyNumber] = useState('75');
  const [surnoc, setSurnoc] = useState('1');
  const [hissaNumber, setHissaNumber] = useState('2A');
  const [recordYear, setRecordYear] = useState('2024-2025');
  const [recordType, setRecordType] = useState('CURRENT_RTC');

  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [error, setError] = useState(null);

  // Load initial districts
  useEffect(() => {
    getDistricts()
      .then((res) => {
        setDistricts(res.data);
        const tumakuru = res.data.find(d => d.name.toLowerCase() === 'tumakuru');
        if (tumakuru) {
          setSelectedDistrict(tumakuru.name);
        } else if (res.data.length > 0) {
          setSelectedDistrict(res.data[0].name);
        }
      })
      .catch((err) => console.error("Error loading districts", err));
  }, []);

  // When district changes, load taluks
  useEffect(() => {
    if (!selectedDistrict) return;
    getTaluks(selectedDistrict)
      .then((res) => {
        setTaluks(res.data);
        if (res.data.length > 0) {
          setSelectedTaluk(res.data[0].name);
        } else {
          setSelectedTaluk('');
        }
      })
      .catch((err) => console.error("Error loading taluks", err));
  }, [selectedDistrict]);

  // When taluk changes, load hoblis
  useEffect(() => {
    if (!selectedTaluk) return;
    getHoblis(selectedTaluk)
      .then((res) => {
        setHoblis(res.data);
        if (res.data.length > 0) {
          setSelectedHobli(res.data[0].name);
        } else {
          setSelectedHobli('');
        }
      })
      .catch((err) => console.error("Error loading hoblis", err));
  }, [selectedTaluk]);

  // When hobli changes, load villages
  useEffect(() => {
    if (!selectedHobli) return;
    getVillages(selectedHobli)
      .then((res) => {
        setVillages(res.data);
        if (res.data.length > 0) {
          setSelectedVillage(res.data[0].name);
        } else {
          setSelectedVillage('');
        }
      })
      .catch((err) => console.error("Error loading villages", err));
  }, [selectedHobli]);

  const languages = [
    { code: 'kn', name: 'Kannada', script: 'ಕನ್ನಡ' },
    { code: 'en', name: 'English', script: 'Latin' },
    { code: 'mr', name: 'Marathi', script: 'मराठी' },
    { code: 'hi', name: 'Hindi', script: 'हिन्दी' },
    { code: 'te', name: 'Telugu', script: 'తెలుగు' },
    { code: 'ta', name: 'Tamil', script: 'தமிழ்' }
  ];

  const categories = [
    { id: 'RTC', label: 'RTC / Pahani (Form 16)', desc: 'Official record of rights, crop verification & tenancy' },
    { id: 'MUTATION', label: 'Mutation Extract (Form 21 / MR)', desc: 'Title transfer, inheritance & mutation registration' },
    { id: 'DEED', label: 'Conveyance Deed / Sale Deed', desc: 'Registered property sale, deed & partition records' },
    { id: 'SKETCH', label: 'Tippan / Cadastral Map (FMB)', desc: 'Field measurement book & boundary stone coordinate map' }
  ];

  const steps = [
    { title: "Uploading Document Scan", detail: "Transferring high-resolution record to secure BhoomiAI ingestion staging..." },
    { title: "Optical Character Recognition (OCR)", detail: `Executing Indic-OCR for ${selectedLanguage.toUpperCase()} with coordinate boundary mapping...` },
    { title: "Entity Extraction & Parsing", detail: "Extracting Survey/Hissa, Titleholder, Area (Acres/Guntas), Mutation Number & East/West/North/South boundaries..." },
    { title: "Authoritative Reference Comparison", detail: "Running side-by-side matching against official Karnataka ReferenceParcel dataset..." },
    { title: "Cadastral GIS Geofencing & Blockchain Anchoring", detail: "Generating cryptographic SHA-256 mutation block and verifying GIS boundary stones..." }
  ];

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF or an Image file (JPG/PNG).");
      return false;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("File exceeds 25 MB limit. Please upload a smaller file.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const executePipeline = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setPipelineStep(0);

    const interval = setInterval(() => {
      setPipelineStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 900);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('language', selectedLanguage);
    formData.append('document_category', documentCategory);
    formData.append('district', selectedDistrict);
    formData.append('taluk', selectedTaluk);
    formData.append('hobli', selectedHobli);
    formData.append('village', selectedVillage);
    formData.append('survey_number', surveyNumber);
    formData.append('surnoc', surnoc);
    formData.append('hissa_number', hissaNumber);
    formData.append('record_year', recordYear);
    formData.append('record_type', recordType);

    supportingFiles.forEach((f) => {
      formData.append('supporting_documents', f);
    });

    try {
      const response = await uploadDocument(formData);
      clearInterval(interval);
      setPipelineStep(steps.length - 1);
      setTimeout(() => {
        setLoading(false);
        if (onExtractionComplete) {
          onExtractionComplete(response.data);
        }
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      setError(err.response?.data?.detail || "Verification pipeline failed. Please check document clarity.");
    }
  };

  const runSample = async (sampleType, lang) => {
    setLoading(true);
    setError(null);
    setPipelineStep(0);

    const interval = setInterval(() => {
      setPipelineStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 700);

    try {
      const response = await runSampleExtraction(sampleType, lang);
      clearInterval(interval);
      setPipelineStep(steps.length - 1);
      setTimeout(() => {
        setLoading(false);
        if (onExtractionComplete) {
          onExtractionComplete(response.data);
        }
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      setError(err.response?.data?.detail || "Error loading sample document.");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold ${
          isLight 
            ? 'bg-emerald-100 border border-emerald-200 text-emerald-800' 
            : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
        }`}>
          <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
          <span>Intelligent Land Record Extraction &amp; Verification</span>
        </div>
        <h2 className={`text-3xl font-extrabold tracking-tight font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Upload Land Record <span className="text-gradient-emerald">Document</span>
        </h2>
        <p className={`text-sm max-w-2xl mx-auto font-medium ${isLight ? 'text-slate-600' : 'text-slate-200'}`}>
          Upload official RTC / Pahani scans, cadastral maps, or conveyance deeds. BhoomiAI automatically extracts titleholder entities and compares them with authoritative reference datasets.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border-2 border-rose-500/60 rounded-2xl text-rose-200 text-sm flex items-center space-x-3 shadow-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* Main Upload Form Container */}
      <div className={`glass-card rounded-3xl border-2 p-6 sm:p-8 shadow-2xl space-y-7 ${
        isLight ? 'bg-white border-slate-200 shadow-xl' : 'border-slate-700/80'
      }`}>
        
        {/* Section 1: Document Category & Script */}
        <div className="space-y-3">
          <label className={`text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
            isLight ? 'text-emerald-800' : 'text-emerald-300'
          }`}>
            <FileText className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            1. Document Category &amp; Nature:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setDocumentCategory(cat.id)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  documentCategory === cat.id
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-950 ring-2 ring-emerald-400/40 shadow-glow-sm'
                    : isLight
                    ? 'border-slate-200 bg-slate-50/80 hover:border-slate-300 text-slate-800'
                    : 'border-slate-700 bg-slate-900/90 hover:border-slate-500 text-slate-200'
                }`}
              >
                <div className={`font-extrabold text-xs ${
                  isLight ? (documentCategory === cat.id ? 'text-emerald-900' : 'text-slate-900') : 'text-white'
                }`}>{cat.label}</div>
                <div className={`text-[11px] mt-1.5 leading-snug font-medium ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}>{cat.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Karnataka Location Hierarchy Selection */}
        <div className={`p-5 rounded-2xl border-2 space-y-4 ${
          isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/90 border-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <label className={`text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? 'text-emerald-800' : 'text-emerald-300'
            }`}>
              <MapPin className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              2. Karnataka Administrative Jurisdiction (Davanagere, Tumakuru, Shivamogga, Mysuru):
            </label>
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
              isLight 
                ? 'text-emerald-800 bg-emerald-100 border-emerald-300' 
                : 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40'
            }`}>
              Authoritative Village Data
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* District */}
            <div>
              <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 shadow-xs' 
                    : 'border-slate-600 bg-slate-900 text-white shadow-inner'
                }`}
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.name} className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Taluk */}
            <div>
              <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>Taluk</label>
              <select
                value={selectedTaluk}
                onChange={(e) => setSelectedTaluk(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 shadow-xs' 
                    : 'border-slate-600 bg-slate-900 text-white shadow-inner'
                }`}
              >
                {taluks.map((t) => (
                  <option key={t.id} value={t.name} className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Hobli */}
            <div>
              <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>Hobli</label>
              <select
                value={selectedHobli}
                onChange={(e) => setSelectedHobli(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 shadow-xs' 
                    : 'border-slate-600 bg-slate-900 text-white shadow-inner'
                }`}
              >
                {hoblis.map((h) => (
                  <option key={h.id} value={h.name} className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Village */}
            <div>
              <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>Village</label>
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 shadow-xs' 
                    : 'border-slate-600 bg-slate-900 text-white shadow-inner'
                }`}
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.name} className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Parcel Identifiers Row */}
          <div className={`grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t-2 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <div>
              <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>Survey No.</label>
              <input
                type="text"
                value={surveyNumber}
                onChange={(e) => setSurveyNumber(e.target.value)}
                placeholder="e.g. 75"
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs' 
                    : 'border-slate-600 bg-slate-950 text-white placeholder-slate-400 shadow-inner'
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>Surnoc</label>
              <input
                type="text"
                value={surnoc}
                onChange={(e) => setSurnoc(e.target.value)}
                placeholder="*"
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs' 
                    : 'border-slate-600 bg-slate-950 text-white placeholder-slate-400 shadow-inner'
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>Hissa No.</label>
              <input
                type="text"
                value={hissaNumber}
                onChange={(e) => setHissaNumber(e.target.value)}
                placeholder="1"
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs' 
                    : 'border-slate-600 bg-slate-950 text-white placeholder-slate-400 shadow-inner'
                }`}
              />
            </div>

            <div>
              <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>Record Year</label>
              <select
                value={recordYear}
                onChange={(e) => setRecordYear(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 shadow-xs' 
                    : 'border-slate-600 bg-slate-900 text-white shadow-inner'
                }`}
              >
                <option value="2024-2025" className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>2024-2025</option>
                <option value="2023-2024" className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>2023-2024</option>
                <option value="2022-2023" className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>2022-2023</option>
                <option value="2021-2022" className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>2021-2022</option>
                <option value="2020-2021" className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>2020-2021</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>Record Type</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ${
                  isLight 
                    ? 'bg-white border-slate-300 text-slate-900 shadow-xs' 
                    : 'border-slate-600 bg-slate-900 text-white shadow-inner'
                }`}
              >
                <option value="CURRENT_RTC" className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>Current Year RTC</option>
                <option value="HISTORICAL_RTC" className={isLight ? 'bg-white text-slate-900 font-medium' : 'bg-slate-900 text-white font-medium'}>Historical RTC</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: OCR Language Selection */}
        <div className="space-y-3">
          <label className={`text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
            isLight ? 'text-emerald-800' : 'text-emerald-300'
          }`}>
            <Globe2 className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            3. OCR Language &amp; Native Script:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedLanguage(lang.code)}
                className={`p-3 rounded-2xl border-2 text-center transition-all ${
                  selectedLanguage === lang.code
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-950 font-extrabold ring-2 ring-emerald-400/40 shadow-glow-sm'
                    : isLight
                    ? 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:text-slate-900'
                    : 'border-slate-700 bg-slate-900/90 text-slate-200 hover:border-slate-500 hover:text-white'
                }`}
              >
                <div className={`text-xs truncate font-bold ${
                  isLight ? (selectedLanguage === lang.code ? 'text-emerald-900' : 'text-slate-900') : 'text-white'
                }`}>{lang.name}</div>
                <div className={`text-xs truncate font-semibold mt-0.5 ${
                  isLight ? 'text-emerald-700' : 'text-emerald-300'
                }`}>{lang.script}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Drag and Drop Upload Box */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all duration-300 relative ${
            dragOver 
              ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.3)]' 
              : isLight
              ? 'border-slate-300 hover:border-emerald-500 bg-slate-50/60'
              : 'border-slate-600 hover:border-emerald-400/80 bg-slate-950/80'
          }`}
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center mx-auto shadow-glow-sm ${
              isLight 
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
            }`}>
              <UploadCloud className="w-7 h-7 animate-bounce" />
            </div>

            <div>
              <p className={`text-base sm:text-lg font-extrabold font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {selectedFile ? selectedFile.name : "Drag and drop land record document here"}
              </p>
              <p className={`text-xs mt-1.5 font-semibold ${isLight ? 'text-slate-600' : 'text-slate-200'}`}>
                Accepts PDF, JPG, PNG files (Configurable limit: <strong className={`font-extrabold ${isLight ? 'text-emerald-700' : 'text-white'}`}>up to 25MB</strong>)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5">
                Browse System Files
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  onChange={handleFileChange}
                />
              </label>

              {selectedFile && (
                <button
                  disabled={loading}
                  onClick={executePipeline}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center space-x-2"
                >
                  <span>Verify Land Record</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Supporting Documents Section */}
            <div className={`pt-3 border-t-2 text-left ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-slate-700' : 'text-slate-200'
                }`}>
                  <FileText className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  Attach Supporting Documents (Mutation, Tippan Sketch, Sale Deed):
                </span>
                <label className={`cursor-pointer text-xs font-extrabold underline ${
                  isLight ? 'text-emerald-700 hover:text-emerald-800' : 'text-emerald-400 hover:text-emerald-300'
                }`}>
                  + Add File
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files).filter(validateFile);
                        setSupportingFiles((prev) => [...prev, ...newFiles]);
                      }
                    }}
                  />
                </label>
              </div>

              {supportingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {supportingFiles.map((sf, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${
                        isLight 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                      }`}
                    >
                      <FileCheck2 className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span className="truncate max-w-[150px]">{sf.name}</span>
                      <button
                        type="button"
                        onClick={() => setSupportingFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className={`font-bold ml-1 ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-300 hover:text-white'}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Processing Pipeline Animation */}
        {loading && (
          <div className={`glass-card p-6 rounded-2xl border-2 shadow-2xl space-y-4 animate-in fade-in duration-300 ${
            isLight ? 'bg-white border-emerald-200' : 'border-emerald-500/50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
                <span className={`text-sm font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  BhoomiAI Processing &amp; Verification Pipeline
                </span>
              </div>
              <span className={`text-xs font-extrabold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                Step {pipelineStep + 1} of {steps.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {steps.map((st, idx) => {
                const isCurrent = idx === pipelineStep;
                const isPast = idx < pipelineStep;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border-2 text-xs transition-all ${
                      isCurrent
                        ? isLight ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-sm' : 'border-emerald-400 bg-emerald-500/25 text-white shadow-glow-sm'
                        : isPast
                        ? isLight ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800' : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                        : isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-700 bg-slate-900/70 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center space-x-2">
                        {isPast ? (
                          <CheckCircle className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        ) : isCurrent ? (
                          <RefreshCw className={`w-4 h-4 animate-spin ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        ) : (
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                            isLight ? 'border-slate-400 text-slate-600' : 'border-slate-600 text-slate-300'
                          }`}>
                            {idx + 1}
                          </div>
                        )}
                        <span className={`font-bold ${isLight ? (isCurrent ? 'text-emerald-900' : 'text-slate-900') : 'text-white'}`}>{st.title}</span>
                      </div>
                      {isCurrent && <span className={`text-[10px] uppercase tracking-wider font-extrabold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>Active</span>}
                    </div>
                    <div className={`text-xs mt-1 pl-6 font-medium ${isLight ? 'text-slate-600' : 'text-slate-200'}`}>
                      {st.detail}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 6: Instant Demo Synthetic Documents */}
        <div className={`pt-3 border-t-2 space-y-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? 'text-emerald-800' : 'text-emerald-300'
            }`}>
              <FileCheck2 className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              Quick Pilot Test Documents (Tumakuru Baseline):
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
              isLight ? 'text-slate-700 bg-slate-100 border-slate-200' : 'text-slate-200 bg-slate-900 border-slate-700'
            }`}>
              Tagged [SYNTHETIC / DEMO DATA]
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <button
              type="button"
              onClick={() => runSample("tumakuru_rtc", "kn")}
              className={`p-4 rounded-2xl border-2 text-left transition group shadow-xs hover:shadow-md ${
                isLight 
                  ? 'border-slate-200 bg-white hover:border-emerald-500' 
                  : 'border-slate-700 bg-slate-900/90 hover:bg-slate-900 hover:border-emerald-400'
              }`}
            >
              <div className={`font-extrabold text-xs flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>Tumakuru RTC (Kannada)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                  isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40'
                }`}>Match</span>
              </div>
              <p className={`text-xs mt-1.5 font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-200'}`}>
                Survey 75/2A, Melekote (Kasaba). Gangaraju K M (ಗಂಗರಾಜು). Exact match with reference.
              </p>
            </button>

            <button
              type="button"
              onClick={() => runSample("tumakuru_english_rtc", "en")}
              className={`p-4 rounded-2xl border-2 text-left transition group shadow-xs hover:shadow-md ${
                isLight 
                  ? 'border-slate-200 bg-white hover:border-emerald-500' 
                  : 'border-slate-700 bg-slate-900/90 hover:bg-slate-900 hover:border-emerald-400'
              }`}
            >
              <div className={`font-extrabold text-xs flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>Tumakuru RTC (English)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                  isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40'
                }`}>Match</span>
              </div>
              <p className={`text-xs mt-1.5 font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-200'}`}>
                Survey 75, Melekote. Clear Title verified against Tumakuru Land Records.
              </p>
            </button>

            <button
              type="button"
              onClick={() => runSample("tumakuru_mismatch", "en")}
              className={`p-4 rounded-2xl border-2 text-left transition group shadow-xs hover:shadow-md ${
                isLight 
                  ? 'border-slate-200 bg-white hover:border-amber-500' 
                  : 'border-slate-700 bg-slate-900/90 hover:bg-slate-900 hover:border-amber-400'
              }`}
            >
              <div className={`font-extrabold text-xs flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>Tumakuru Deed (Mismatch)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                  isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/25 text-amber-200 border-amber-500/40'
                }`}>Mismatch</span>
              </div>
              <p className={`text-xs mt-1.5 font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-200'}`}>
                Survey 75/2A, Melekote. Extent 3.80 vs 2.75 Acres. Area discrepancy detected.
              </p>
            </button>

            <button
              type="button"
              onClick={() => runSample("kannada_rtc", "kn")}
              className={`p-4 rounded-2xl border-2 text-left transition group shadow-xs hover:shadow-md ${
                isLight 
                  ? 'border-slate-200 bg-white hover:border-emerald-500' 
                  : 'border-slate-700 bg-slate-900/90 hover:bg-slate-900 hover:border-emerald-400'
              }`}
            >
              <div className={`font-extrabold text-xs flex items-center justify-between ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>Tumakuru Title (Kannada)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                  isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40'
                }`}>Verified</span>
              </div>
              <p className={`text-xs mt-1.5 font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-200'}`}>
                Survey 75, Melekote. Native Kannada script OCR and titleholder verification.
              </p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
