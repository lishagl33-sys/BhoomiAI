import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  ShieldCheck, 
  Crosshair, 
  Clock, 
  UserCheck, 
  Send, 
  RotateCcw, 
  Compass, 
  Wifi, 
  Battery, 
  Signal, 
  FileCheck,
  Sparkles,
  Info
} from 'lucide-react';
import { getRecords, submitFieldInspection, getInspectionLogs } from '../api';

export default function FieldInspectorMobile({ preselectedParcel }) {
  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inspectionSuccess, setInspectionSuccess] = useState(null);
  const [pastInspections, setPastInspections] = useState([]);

  // Field Officer simulated profile
  const [inspectorName, setInspectorName] = useState('K. S. Narayana Rao');
  const [inspectorId, setInspectorId] = useState('REV-OFFICER-704');

  // Simulated GPS position
  // Near Devanahalli parcel (13.2924, 77.8012)
  const [isInsideGeofence, setIsInsideGeofence] = useState(true);
  const [currentLat, setCurrentLat] = useState(13.2925);
  const [currentLng, setCurrentLng] = useState(77.8013);

  // Inspection Checklist Form State
  const [boundaryStonesVerified, setBoundaryStonesVerified] = useState(true);
  const [cropStatus, setCropStatus] = useState('Standing Maize Crop (Active Cultivation)');
  const [occupantMatch, setOccupantMatch] = useState(true);
  const [officerNotes, setOfficerNotes] = useState('All 4 boundary stones physically verified and georeferenced on site. No unauthorized encroachment observed.');
  const [hasPhoto, setHasPhoto] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await getRecords();
      setRecords(res.data);
      if (res.data.length > 0) {
        const initial = preselectedParcel 
          ? res.data.find(r => r.id === preselectedParcel.record_id) || res.data[0]
          : res.data[0];
        setSelectedRecordId(initial.id);
        setSelectedRecord(initial);
        fetchPastInspections(initial.id);
      }
    } catch (err) {
      console.error('Failed to load records for mobile app:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordChange = (recId) => {
    setSelectedRecordId(recId);
    const rec = records.find(r => r.id === parseInt(recId));
    setSelectedRecord(rec);
    if (rec) {
      fetchPastInspections(rec.id);
    }
  };

  const fetchPastInspections = async (recId) => {
    try {
      const res = await getInspectionLogs(recId);
      setPastInspections(res.data);
    } catch (err) {
      console.error('Failed to load inspection logs:', err);
    }
  };

  // Toggle GPS simulation between inside geofence (12m) and outside geofence (180m)
  const toggleLocationSimulation = () => {
    if (isInsideGeofence) {
      // Move 180 meters away
      setCurrentLat(13.2945);
      setCurrentLng(77.8035);
      setIsInsideGeofence(false);
    } else {
      // Move within 12 meters
      setCurrentLat(13.2925);
      setCurrentLng(77.8013);
      setIsInsideGeofence(true);
    }
  };

  // Calculate approximate distance
  const targetLat = selectedRecord?.latitude || 13.2924;
  const targetLng = selectedRecord?.longitude || 77.8012;
  const dLat = (currentLat - targetLat) * 111000;
  const dLng = (currentLng - targetLng) * 111000 * Math.cos(targetLat * Math.PI / 180);
  const distanceMeters = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;
  const isWithin50m = distanceMeters <= 50;

  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setSubmitting(true);
    setInspectionSuccess(null);

    const payload = {
      record_id: selectedRecord.id,
      inspector_id: inspectorId,
      inspector_name: inspectorName,
      inspection_lat: currentLat,
      inspection_lng: currentLng,
      boundary_stones_verified: boundaryStonesVerified,
      crop_status: cropStatus,
      occupant_match: occupantMatch,
      photo_url: "/static/samples/sample_rtc_karnataka.png",
      notes: officerNotes
    };

    try {
      const res = await submitFieldInspection(payload);
      setInspectionSuccess(res.data);
      fetchPastInspections(selectedRecord.id);
    } catch (err) {
      console.error('Failed to submit field inspection:', err);
      alert('Failed to submit inspection audit. Please check server logs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Smartphone className="w-6 h-6 animate-bounce" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-white font-outfit tracking-tight flex items-center gap-2">
                  Mobile App for Field Revenue Inspectors
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    GPS Geofencing &bull; On-Site Attestation
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Enables Village Revenue Officers (VROs) and Revenue Inspectors to conduct on-site physical parcel boundary verifications with real-time GPS perimeter validation.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Simulation Controller */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleLocationSimulation}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 border transition ${
                isInsideGeofence
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Simulate GPS: {isInsideGeofence ? 'Inside Geofence (12m)' : 'Outside Geofence (180m)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Mobile Frame Simulator + Inspector Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left 5 Cols: High-Fidelity Smartphone Device Mockup */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[360px] h-[720px] rounded-[48px] bg-slate-950 p-3.5 border-4 border-slate-700 shadow-2xl relative shadow-cyan-950/40 flex flex-col overflow-hidden">
            
            {/* Phone Speaker & Camera Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center space-x-3">
              <span className="w-10 h-1 rounded-full bg-slate-700"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></span>
            </div>

            {/* Phone Screen Internal */}
            <div className="w-full h-full rounded-[38px] bg-slate-900/95 border border-slate-800/80 overflow-y-auto scrollbar-none flex flex-col text-slate-200 text-xs">
              
              {/* Phone Status Bar */}
              <div className="px-6 pt-3 pb-2 flex justify-between items-center text-[10px] text-slate-400 font-semibold z-20">
                <span>09:41 AM</span>
                <div className="flex items-center space-x-1.5">
                  <Signal className="w-3 h-3 text-slate-300" />
                  <span className="font-mono text-[9px] text-emerald-400">5G</span>
                  <Wifi className="w-3 h-3 text-slate-300" />
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>

              {/* Mobile App Header */}
              <div className="px-5 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl mx-3 shadow-md mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-cyan-200 font-bold">Revenue Inspector Mobile</span>
                    <h3 className="text-sm font-black font-outfit">BhoomiSetu Field Attest</h3>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-cyan-100 flex items-center space-x-1">
                  <UserCheck className="w-3 h-3" />
                  <span>{inspectorName} ({inspectorId})</span>
                </div>
              </div>

              {/* Screen Body Content */}
              <div className="px-3.5 space-y-3 pb-6 flex-1">
                
                {/* Live GPS Geofence Radar Card */}
                <div className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                  isWithin50m
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      Live GPS Geofence
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isWithin50m ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white animate-pulse'
                    }`}>
                      {isWithin50m ? 'Within Boundary' : 'Out of Geofence'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-xl font-black font-mono">
                        {distanceMeters} <span className="text-xs font-normal">meters</span>
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Distance to Survey Centroid
                      </div>
                    </div>
                    <div className="text-right font-mono text-[9px] text-slate-400">
                      <div>Lat: {currentLat.toFixed(4)}° N</div>
                      <div>Lng: {currentLng.toFixed(4)}° E</div>
                    </div>
                  </div>

                  {!isWithin50m && (
                    <div className="mt-2 text-[10px] text-rose-300 bg-rose-900/40 p-2 rounded-lg border border-rose-500/30">
                      ⚠️ Officer is &gt;50m away. Move closer to the parcel to complete digital attestation.
                    </div>
                  )}
                </div>

                {/* Target Survey Parcel Selector */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Cadastral Parcel
                  </label>
                  <select
                    value={selectedRecordId}
                    onChange={(e) => handleRecordChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    {records.map(r => (
                      <option key={r.id} value={r.id}>
                        Sy {r.survey_number} - {r.village} ({r.owner_name})
                      </option>
                    ))}
                  </select>

                  {selectedRecord && (
                    <div className="pt-1.5 text-[10px] text-slate-400 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Owner:</span>
                        <span className="text-slate-200 font-semibold">{selectedRecord.owner_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Extent:</span>
                        <span className="text-slate-200 font-semibold">{selectedRecord.area_value} {selectedRecord.area_unit}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Checklist inside Phone */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Physical Field Verifications
                  </span>

                  <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={boundaryStonesVerified}
                      onChange={(e) => setBoundaryStonesVerified(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300">4 Boundary Stones Verified</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={occupantMatch}
                      onChange={(e) => setOccupantMatch(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300">Physical Occupant Matches RTC</span>
                  </label>

                  {/* Crop Status */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Crop / Land Use:</span>
                    <input
                      type="text"
                      value={cropStatus}
                      onChange={(e) => setCropStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>

                  {/* Photo Simulation */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] text-slate-300">Geo-Tagged Field Photo</span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Attached
                    </span>
                  </div>
                </div>

                {/* Submit Attestation inside Mobile Frame */}
                <button
                  onClick={handleSubmitInspection}
                  disabled={submitting || !isWithin50m}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg transition ${
                    isWithin50m
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting Attestation...' : 'Submit Digital Attestation'}</span>
                </button>

              </div>

              {/* Phone Bottom Home Bar */}
              <div className="py-2 flex justify-center z-20">
                <span className="w-24 h-1 rounded-full bg-slate-600"></span>
              </div>
            </div>

          </div>
        </div>

        {/* Right 7 Cols: Detailed Field Officer Audit Panel */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Recent Inspection Attestation Alert */}
          {inspectionSuccess && (
            <div className="p-5 rounded-2xl glass-card border border-emerald-500/40 bg-emerald-950/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="font-bold text-sm">On-Site Inspection Successfully Attested!</h3>
                </div>
                <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                  Log #{inspectionSuccess.id}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Field Officer <b className="text-white">{inspectionSuccess.inspector_name}</b> verified parcel within{' '}
                <b className="text-emerald-400">{inspectionSuccess.distance_to_boundary_m.toFixed(1)}m</b> geofence. 
                Inspection audit was verified and officially logged into the Land Registry.
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-[11px] text-cyan-300 border border-slate-800 flex items-center justify-between">
                <span>Verified at: {new Date(inspectionSuccess.created_at).toLocaleString('en-IN')}</span>
                <span className="text-emerald-400">✓ Immutable Record</span>
              </div>
            </div>
          )}

          {/* Officer Dashboard Info Card */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white font-outfit flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              Village Revenue Officer Geofence Protocol
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Under DILRMP digitized revenue guidelines, physical inspections require high-precision GNSS geofencing. 
              The BhoomiSetu mobile engine enforces a <b>50-meter statutory radius</b> to prevent remote falsification of field survey reports.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Allowed Geofence</span>
                <div className="text-base font-bold text-white font-mono">50.0 Meters</div>
                <div className="text-[10px] text-slate-500">Haversine GPS threshold</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Current Offset</span>
                <div className={`text-base font-bold font-mono ${isWithin50m ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {distanceMeters} Meters
                </div>
                <div className="text-[10px] text-slate-500">{isWithin50m ? 'Geofence satisfied' : 'Officer out of range'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Audit Ledger Sync</span>
                <div className="text-base font-bold text-cyan-300 font-mono">Auto-Mined</div>
                <div className="text-[10px] text-slate-500">SHA-256 Block per audit</div>
              </div>
            </div>
          </div>

          {/* Past Inspection History for Current Parcel */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-outfit flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Physical Inspection Audit Logs ({pastInspections.length})
              </h3>
              <span className="text-[10px] text-slate-400">
                Survey {selectedRecord?.survey_number || ''}
              </span>
            </div>

            {pastInspections.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No physical inspection logs recorded yet for this parcel. Use the mobile frame to conduct one.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {pastInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{insp.inspector_name}</span>
                        <span className="text-[10px] text-slate-400">({insp.inspector_id})</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(insp.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      {insp.notes}
                    </div>

                    <div className="pt-1 flex items-center space-x-3 text-[10px] text-slate-400">
                      <span className="text-emerald-400">✓ Boundary Stones Verified</span>
                      <span>&bull;</span>
                      <span className="font-mono text-cyan-300">GPS Offset: {insp.distance_to_boundary_m.toFixed(1)}m</span>
                      <span>&bull;</span>
                      <span className="text-indigo-300">{insp.crop_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
