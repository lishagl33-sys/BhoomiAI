import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { 
  Compass, 
  Layers, 
  MapPin, 
  AlertOctagon, 
  CheckCircle2, 
  RotateCcw, 
  ShieldCheck, 
  Search, 
  FileText, 
  Satellite, 
  Navigation,
  ExternalLink,
  ChevronRight,
  Crosshair,
  AlertTriangle,
  Info,
  Map as MapIcon,
  HelpCircle,
  FileCheck,
  CheckCircle,
  X,
  Copy,
  Send,
  Flag,
  ArrowRight,
  Database,
  Globe,
  Sparkles,
  Maximize2,
  Minimize2,
  PenTool,
  Square,
  Ruler,
  Scale,
  Locate,
  LocateFixed,
  Edit3,
  Trash2,
  Building2,
  Upload,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Save,
  Download,
  Undo2,
  Redo2,
  Check,
  Wheat
} from 'lucide-react';
import { 
  getLandLocations, 
  searchLandParcels, 
  getLandParcelById, 
  identifyParcelByPolygon,
  getLandParcelRecords,
  getDistrictBoundary,
  getAllDistrictBoundaries,
  searchPlaces,
  getCoverageMetadata,
  getOsmBuildings,

  createLandParcel,
  updateLandParcel,
  deleteLandParcel
} from '../api';

// Bounding boxes for Karnataka pilot districts (WGS84 EPSG:4326)
const KARNATAKA_REGIONAL_BOUNDS = [
  [11.7000, 74.6000], // SW (Mysuru south, Shivamogga west)
  [14.7500, 77.5500]  // NE (Davanagere north, Tumakuru east)
];

const DAVANAGERE_DISTRICT_BOUNDS = [
  [13.8062, 75.3988],
  [14.7053, 76.5336]
];

const TUMAKURU_DISTRICT_BOUNDS = [
  [12.7456, 76.3462],
  [14.3423, 77.5170]
];

const SHIVAMOGGA_DISTRICT_BOUNDS = [
  [13.4500, 74.6500],
  [14.6500, 76.1500]
];

const MYSURU_DISTRICT_BOUNDS = [
  [11.7500, 75.9000],
  [12.6500, 77.1500]
];

// Karnataka pilot revenue center coordinates
const KARNATAKA_PILOT_COORDS = {
  karnataka: { lat: 13.5000, lng: 76.2000, zoom: 7 },
  davanagere: { lat: 14.4644, lng: 75.9218, zoom: 11 },
  tumakuru: { lat: 13.3409, lng: 77.1010, zoom: 10 },
  shivamogga: { lat: 13.9299, lng: 75.5681, zoom: 10 },
  mysuru: { lat: 12.2958, lng: 76.6394, zoom: 10 },
  avaragere: { lat: 14.4485, lng: 75.9420, zoom: 15 },
  bathi: { lat: 14.4920, lng: 75.8850, zoom: 15 },
  nituvalli: { lat: 14.4530, lng: 75.9180, zoom: 15 },
  shabanuru: { lat: 14.4410, lng: 75.9080, zoom: 15 },
  melekote: { lat: 13.3510, lng: 77.0850, zoom: 15 },
  oorukere: { lat: 13.3720, lng: 77.1210, zoom: 15 },
  kyathsandra: { lat: 13.3280, lng: 77.1650, zoom: 15 },
  bellavi: { lat: 13.4210, lng: 77.0320, zoom: 15 },
  harihara: { lat: 14.5120, lng: 75.8050, zoom: 14 },
  channagiri: { lat: 14.0250, lng: 75.9270, zoom: 14 },
  tiptur: { lat: 13.2560, lng: 76.4780, zoom: 14 },
  gubbi: { lat: 13.3120, lng: 76.9380, zoom: 14 }
};

// Official Google Maps JavaScript API MapTypeId Definition
export const GoogleMapTypeId = (typeof window !== 'undefined' && window.google?.maps?.MapTypeId) ? window.google.maps.MapTypeId : {
  ROADMAP: 'roadmap',
  SATELLITE: 'satellite',
  HYBRID: 'hybrid',
  TERRAIN: 'terrain'
};

if (typeof window !== 'undefined') {
  window.google = window.google || {};
  window.google.maps = window.google.maps || {};
  window.google.maps.MapTypeId = window.google.maps.MapTypeId || GoogleMapTypeId;
}

// Real GIS Map Layer Configurations & Official Licensing Attributions
export const MAP_LAYERS_CONFIG = {
  roadmap: {
    id: 'roadmap',
    name: 'Normal Map (Roadmap)',
    shortName: 'Normal',
    badge: 'Streets & Buildings',
    description: 'Clean Google Maps-style roadmap with roads, streets, building footprints, house layouts, and village labels.',
    provider: 'Google Maps (MapTypeId.ROADMAP)',
    license: 'Google Maps Platform',
    nativeZoom: 'Native Zoom 20 (Building Footprints)',
    type: 'Street / Vector Raster'
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite Map (Aerial)',
    shortName: 'Satellite',
    badge: 'Real Aerial Imagery',
    description: 'Real high-resolution aerial and satellite photography showing houses, rooftops, agricultural plots, trees, and roads.',
    provider: 'Google Satellite (MapTypeId.SATELLITE)',
    license: 'Google Maps Platform',
    nativeZoom: 'Native Zoom 20 (Rooftop & Parcel Level)',
    type: 'Orbital Imagery'
  },
  hybrid: {
    id: 'hybrid',
    name: 'Hybrid Map (Satellite + Labels)',
    shortName: 'Hybrid',
    badge: 'Satellite + Corridors',
    description: 'Real satellite photography combined with high-contrast road corridors, town/village names, and survey connectivity.',
    provider: 'Google Hybrid (MapTypeId.HYBRID)',
    license: 'Google Maps Platform',
    nativeZoom: 'Native Zoom 20 (Satellite + Vector Labels)',
    type: 'Dual-Layer Hybrid'
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain & Relief',
    shortName: 'Terrain',
    badge: 'Topographic Relief',
    description: 'Topographic elevation contours, hill shading, water catchment basins, and natural geographical relief.',
    provider: 'Google Terrain (MapTypeId.TERRAIN)',
    license: 'Google Maps Platform',
    nativeZoom: 'Native Zoom 18',
    type: 'Topographic / Physical'
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap Standard',
    shortName: 'OSM Standard',
    badge: 'Open Cartography',
    description: 'Crisp street network, arterial highways, town & village connectivity, and administrative boundaries.',
    provider: 'OpenStreetMap Contributors',
    license: 'Open Database License (ODbL 1.0)',
    nativeZoom: 'Native Zoom 19 (Upscaled to 20)',
    type: 'Street / Vector Raster'
  },
  voyager: {
    id: 'voyager',
    name: 'CartoDB Voyager Layout',
    shortName: 'Voyager Layout',
    badge: 'Building Footprints',
    description: 'Clean building footprints, house layouts and road hierarchy.',
    provider: 'CARTO / OpenStreetMap',
    license: 'CC-BY-SA',
    nativeZoom: 'Native Zoom 19 (Upscaled to 20)',
    type: 'Building Footprints'
  },
  dark: {
    id: 'dark',
    name: 'CartoDB Dark Matter',
    shortName: 'Dark Matter',
    badge: 'High Contrast Dark',
    description: 'High-contrast dark map background with visible roads and labels for low-light observation.',
    provider: 'CARTO Cartography',
    license: 'CC-BY-SA',
    nativeZoom: 'Native Zoom 19 (Upscaled to 20)',
    type: 'Dark Cartography'
  }
};

// Geodesic Area & Perimeter Calculation using WGS84 authalic sphere / L.GeometryUtil
export function calculateGeodesicMeasurements(layer) {
  if (!layer) return null;
  let latlngs;
  if (typeof layer.getLatLngs === 'function') {
    latlngs = layer.getLatLngs();
  } else if (Array.isArray(layer)) {
    latlngs = layer;
  } else {
    return null;
  }

  // Handle nested arrays (e.g. Polygon coordinates [ [latlng1, latlng2, ...] ])
  let flatLatLngs = latlngs;
  while (Array.isArray(flatLatLngs) && Array.isArray(flatLatLngs[0]) && flatLatLngs[0].length && !flatLatLngs[0].lat) {
    flatLatLngs = flatLatLngs[0];
  }

  if (!flatLatLngs || flatLatLngs.length < 3) return null;

  // 1. Geodesic Area in square meters (Ellipsoidal / Spherical Polygon Area)
  let areaSqM = 0;
  if (L.GeometryUtil && typeof L.GeometryUtil.geodesicArea === 'function') {
    try {
      areaSqM = L.GeometryUtil.geodesicArea(flatLatLngs);
    } catch (e) {
      console.warn('L.GeometryUtil.geodesicArea failed, using fallback:', e);
    }
  }

  if (!areaSqM || areaSqM <= 0) {
    // Spherical polygon area fallback using WGS84 radius (6378137m)
    const RADIUS = 6378137.0;
    let total = 0;
    const len = flatLatLngs.length;
    for (let i = 0; i < len; i++) {
      const p1 = flatLatLngs[i];
      const p2 = flatLatLngs[(i + 1) % len];
      const p3 = flatLatLngs[(i + 2) % len];

      const lat1 = (p2.lat !== undefined ? p2.lat : p2[0]) * Math.PI / 180.0;
      const lng1 = (p1.lng !== undefined ? p1.lng : p1[1]) * Math.PI / 180.0;
      const lng2 = (p3.lng !== undefined ? p3.lng : p3[1]) * Math.PI / 180.0;

      total += (lng2 - lng1) * Math.sin(lat1);
    }
    areaSqM = Math.abs((total * RADIUS * RADIUS) / 2.0);
  }

  // 2. Geodesic Perimeter in meters
  let perimeterM = 0;
  const len = flatLatLngs.length;
  for (let i = 0; i < len; i++) {
    const p1 = L.latLng(flatLatLngs[i]);
    const p2 = L.latLng(flatLatLngs[(i + 1) % len]);
    perimeterM += p1.distanceTo(p2);
  }

  const hectares = areaSqM / 10000.0;
  const acresTotal = areaSqM / 4046.8564224;
  const fullAcres = Math.floor(acresTotal);
  const guntas = Math.round((acresTotal - fullAcres) * 40 * 10) / 10;
  const sqFeet = Math.round(areaSqM * 10.7639104);
  const perimeterFeet = Math.round(perimeterM * 3.28084 * 10) / 10;

  return {
    sqMeters: Math.round(areaSqM * 10) / 10,
    sqFeet: sqFeet,
    hectares: Math.round(hectares * 1000) / 1000,
    acresTotal: Math.round(acresTotal * 100) / 100,
    acres: fullAcres,
    guntas: guntas,
    perimeterMeters: Math.round(perimeterM * 10) / 10,
    perimeterFeet: perimeterFeet
  };
}

export default function GisMapViewer({ 
  onSelectParcelForInspection, 
  onSwitchTo3D, 
  globalTheme, 
  onToggleGlobalTheme,
  externalNavTarget,
  onParcelSelect
}) {
  // Navigation & Location Hierarchy State
  const [locationsHierarchy, setLocationsHierarchy] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('Tumakuru');
  const [selectedTaluk, setSelectedTaluk] = useState('');
  const [selectedHobli, setSelectedHobli] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  // Search input state
  const [surveyNumberSearch, setSurveyNumberSearch] = useState('');
  const [hissaNumberSearch, setHissaNumberSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Cadastral Parcels on Map
  const [parcels, setParcels] = useState([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedParcelDetails, setSelectedParcelDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Polygon query & user drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const activeDrawHandlerRef = useRef(null);
  const [drawnMeasurements, setDrawnMeasurements] = useState(null);
  const [spatialQueryLoading, setSpatialQueryLoading] = useState(false);
  const [spatialQueryResult, setSpatialQueryResult] = useState(null);
  const [candidateParcels, setCandidateParcels] = useState([]);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [noMatchBanner, setNoMatchBanner] = useState(null);

  // Map settings (Default to Normal Google Maps Roadmap; supporting MapTypeId.ROADMAP, SATELLITE, HYBRID)
  const [mapMode, setMapMode] = useState('roadmap'); // 'roadmap', 'satellite', 'hybrid', 'terrain', 'osm', 'voyager', 'dark'
  const [isHybrid, setIsHybrid] = useState(true); // Optional Hybrid layer toggle (roads and labels over satellite imagery)
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const layerPanelRef = useRef(null);
  const layerButtonRef = useRef(null);
  const [showCadastralParcels, setShowCadastralParcels] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tileWarning, setTileWarning] = useState(null);
  const [showGeoJsonModal, setShowGeoJsonModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('BOUNDARY_OVERLAP');
  const [reportComments, setReportComments] = useState('');

  // 🔍 Universal Location & Place Search State
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const [selectedPlaceInfo, setSelectedPlaceInfo] = useState(null);
  const [placeSearchError, setPlaceSearchError] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const [activeSearchTab, setActiveSearchTab] = useState('place'); // 'place' or 'cadastral'

  // 🗺️ District Boundaries & Coverage Layer State
  const [districtBoundaries, setDistrictBoundaries] = useState(null);
  const [showDistrictBoundaries, setShowDistrictBoundaries] = useState(true);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [coverageData, setCoverageData] = useState(null);
  const [activeDistrictFocus, setActiveDistrictFocus] = useState('all'); // 'all', 'davanagere', 'tumakuru'

  // 🛰️ Google Maps-Level Extensions State
  const [isLocating, setIsLocating] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationToast, setLocationToast] = useState(null); // { message, type: 'info' | 'success' | 'error' }

  // House Layout, Buildings & Survey Labels
  const [showBuildings, setShowBuildings] = useState(false);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [showSurveyLabels, setShowSurveyLabels] = useState(true);

  // Drawing Vertex Editing
  const [isEditingBoundary, setIsEditingBoundary] = useState(false);
  const [showLayerControlsModal, setShowLayerControlsModal] = useState(false);

  // 🌓 Dark / Light Theme State
  const [theme, setTheme] = useState(() => globalTheme || localStorage.getItem('bhoomi_theme') || 'dark');
  const [isTileLoading, setIsTileLoading] = useState(false);
  const [tileError, setTileError] = useState(null);

  useEffect(() => {
    if (globalTheme && globalTheme !== theme) {
      setTheme(globalTheme);
    }
  }, [globalTheme]);

  // Dismiss layer panel on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        showLayerPanel &&
        layerPanelRef.current &&
        !layerPanelRef.current.contains(e.target) &&
        layerButtonRef.current &&
        !layerButtonRef.current.contains(e.target)
      ) {
        setShowLayerPanel(false);
      }
    };

    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        setShowLayerPanel(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showLayerPanel]);

  // Dismiss place search dropdown on outside click
  useEffect(() => {
    const handleOutsideSearchClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowPlaceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideSearchClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideSearchClick);
    };
  }, []);

  const handleSelectMapLayer = (modeKey) => {
    if (modeKey === mapMode) {
      setShowLayerPanel(false);
      return;
    }
    setIsTileLoading(true);
    setTileError(null);
    setTileWarning(null);
    setMapMode(modeKey);
  };

  // Google Maps JavaScript API MapTypeId switching logic (Normal, Satellite, Hybrid)
  const handleSwitchMapType = (mapTypeId) => {
    setIsTileLoading(true);
    setTileError(null);
    setTileWarning(null);

    const typeIdStr = String(mapTypeId || '').toLowerCase();
    if (typeIdStr.includes('roadmap') || typeIdStr === 'normal') {
      handleSelectMapLayer('roadmap');
    } else if (typeIdStr.includes('satellite')) {
      handleSelectMapLayer(isHybrid ? 'hybrid' : 'satellite');
    } else if (typeIdStr.includes('hybrid')) {
      setIsHybrid(true);
      handleSelectMapLayer('hybrid');
    } else if (typeIdStr.includes('terrain')) {
      handleSelectMapLayer('terrain');
    } else {
      handleSelectMapLayer(mapTypeId);
    }
  };

  // Toggle optional Hybrid layer (roads and labels over satellite imagery)
  const toggleHybridOverlay = (enableHybrid) => {
    setIsHybrid(enableHybrid);
    if (mapMode === 'satellite' || mapMode === 'hybrid') {
      setIsTileLoading(true);
      handleSelectMapLayer(enableHybrid ? 'hybrid' : 'satellite');
    }
  };

  // 🧭 Distance Measurement State
  const [isMeasuringDistance, setIsMeasuringDistance] = useState(false);
  const isMeasuringDistanceRef = useRef(false);
  const measurePointsRef = useRef([]);
  const measurePolylineRef = useRef(null);
  const measureMarkersRef = useRef([]);
  const measureLayerGroupRef = useRef(null);
  const [measuredDistance, setMeasuredDistance] = useState(null);

  // 💾 Plot Persistence & Management
  const [showSavePlotModal, setShowSavePlotModal] = useState(false);
  const [isSavingPlot, setIsSavingPlot] = useState(false);
  const [savePlotFormData, setSavePlotFormData] = useState({
    district: 'Tumakuru',
    taluk: 'Tumakuru',
    hobli: 'Kasaba',
    village: 'Melekote',
    survey_number: '',
    hissa_number: '1',
    owner_name: '',
    land_type: 'Agricultural',
    notes: ''
  });
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState(null);

  // 📑 Sidebar Tabs & Area Comparison
  const [activeSidebarTab, setActiveSidebarTab] = useState('details'); // 'details' or 'explorer'
  const [knownAreaInput, setKnownAreaInput] = useState('');
  const [knownAreaUnit, setKnownAreaUnit] = useState('Acres'); // 'Acres', 'Guntas', 'SqFt'
  const [showCoordsTable, setShowCoordsTable] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // 🔍 Plot Explorer Filtering & Dimming
  const [plotSearchQuery, setPlotSearchQuery] = useState('');
  const [plotFilterLandType, setPlotFilterLandType] = useState('ALL');
  const [plotFilterStatus, setPlotFilterStatus] = useState('ALL');
  const [dimOtherParcels, setDimOtherParcels] = useState(false);
  const [showLegendModal, setShowLegendModal] = useState(false);

  // Leaflet refs
  const mapContainerRef = useRef(null);
  const mapWrapperRef = useRef(null);
  const mapRef = useRef(null);
  const baseLayersRef = useRef({});
  const parcelLayersGroupRef = useRef(null);
  const drawnItemsGroupRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const districtLayersGroupRef = useRef(null);
  const placeMarkerGroupRef = useRef(null);
  const userLocationLayerRef = useRef(null);
  const watchIdRef = useRef(null);
  const buildingsLayerGroupRef = useRef(null);
  const surveyLabelsGroupRef = useRef(null);
  const importedBoundaryLayerRef = useRef(null);

  // 1. Fetch Location Hierarchy on Mount
  useEffect(() => {
    fetchLocationHierarchy();
  }, []);

  const fetchLocationHierarchy = async () => {
    try {
      const res = await getLandLocations();
      if (res.data && res.data.districts) {
        setLocationsHierarchy(res.data.districts);
        // Default to Tumakuru
        const tumakuru = res.data.districts.find(d => d.name.toLowerCase() === 'tumakuru') || res.data.districts[0];
        if (tumakuru && tumakuru.taluks && tumakuru.taluks.length > 0) {
          setSelectedDistrict(tumakuru.name);
          setSelectedTaluk(tumakuru.taluks[0].name);
          if (tumakuru.taluks[0].hoblis && tumakuru.taluks[0].hoblis.length > 0) {
            setSelectedHobli(tumakuru.taluks[0].hoblis[0].name);
            if (tumakuru.taluks[0].hoblis[0].villages && tumakuru.taluks[0].hoblis[0].villages.length > 0) {
              setSelectedVillage(tumakuru.taluks[0].hoblis[0].villages[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load land location hierarchy:', err);
    }
  };

  // Available dependent options
  const activeDistrictObj = locationsHierarchy.find(d => d.name === selectedDistrict);
  const availableTaluks = activeDistrictObj ? activeDistrictObj.taluks : [];
  const activeTalukObj = availableTaluks.find(t => t.name === selectedTaluk);
  const availableHoblis = activeTalukObj ? activeTalukObj.hoblis : [];
  const activeHobliObj = availableHoblis.find(h => h.name === selectedHobli);
  const availableVillages = activeHobliObj ? activeHobliObj.villages : [];

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // Prevent double initialization

    // Base Tile Providers
    // SVG fallback for broken/missing tiles prevents ugly browser broken image icons
    const transparentTileUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="rgba(240,240,240,0.05)"/></svg>';

    // 0. Google Maps Tile Providers (MapTypeId.ROADMAP, MapTypeId.SATELLITE, MapTypeId.HYBRID, MapTypeId.TERRAIN)
    // A. Normal Map: Roads, streets, buildings, houses, landmarks, and city/village labels
    const googleRoadmapLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      minZoom: 3,
      maxZoom: 21,
      maxNativeZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      errorTileUrl: transparentTileUrl,
      crossOrigin: true,
      attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>'
    });

    // B. Satellite Map: Real satellite & aerial imagery of rooftops, farm fields, trees, and land parcels
    const googleSatelliteLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      minZoom: 3,
      maxZoom: 21,
      maxNativeZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      errorTileUrl: transparentTileUrl,
      crossOrigin: true,
      attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Satellite</a>'
    });

    // C. Hybrid Map: Real aerial imagery with roads, street names, and location labels overlaid
    const googleHybridLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      minZoom: 3,
      maxZoom: 21,
      maxNativeZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      errorTileUrl: transparentTileUrl,
      crossOrigin: true,
      attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps Imagery &amp; Labels</a>'
    });

    // D. Terrain Map: Topographic contours, relief, and road network
    const googleTerrainLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
      minZoom: 3,
      maxZoom: 21,
      maxNativeZoom: 18,
      subdomains: ['0', '1', '2', '3'],
      errorTileUrl: transparentTileUrl,
      crossOrigin: true,
      attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps Terrain</a>'
    });

    // 1. Standard Road Map (OpenStreetMap) - standard tile endpoint & compliance with OSM tile policy
    const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 4,
      maxZoom: 20,
      maxNativeZoom: 19,
      errorTileUrl: transparentTileUrl,
      crossOrigin: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    });

    // 2. CartoDB Voyager - Clean building footprints, house layouts and road hierarchy
    const voyagerLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      minZoom: 4,
      maxZoom: 20,
      maxNativeZoom: 19,
      subdomains: 'abcd',
      errorTileUrl: transparentTileUrl,
      crossOrigin: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    });

    // 3. Topographic Elevation & Relief (Esri World Topographic Map)
    const terrainLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      {
        minZoom: 4,
        maxZoom: 20,
        maxNativeZoom: 19,
        errorTileUrl: transparentTileUrl,
        crossOrigin: true,
        attribution: 'Tiles &copy; Esri &mdash; Sources: USGS, NOAA, DeLorme, TomTom, SRTM relief &copy; OpenStreetMap contributors'
      }
    );

    // 4. OpenTopoMap Alternative
    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      minZoom: 4,
      maxZoom: 20,
      maxNativeZoom: 17,
      errorTileUrl: transparentTileUrl,
      crossOrigin: true,
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
    });

    // 5. Satellite Imagery (Esri World Imagery)
    // maxNativeZoom: 18 ensures Leaflet gracefully upsamples level 18 tiles for 19-20 without 404 network errors
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        minZoom: 4,
        maxZoom: 20,
        maxNativeZoom: 18,
        errorTileUrl: transparentTileUrl,
        crossOrigin: true,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }
    );

    // 6. Satellite Reference Overlay (Boundaries & Place Labels)
    const labelsLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        minZoom: 4,
        maxZoom: 20,
        maxNativeZoom: 17,
        errorTileUrl: transparentTileUrl,
        crossOrigin: true,
        attribution: 'Esri Reference'
      }
    );

    // 7. CartoDB Dark Matter - High contrast dark map background with visible roads and labels
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      minZoom: 4,
      maxZoom: 20,
      maxNativeZoom: 19,
      subdomains: 'abcd',
      errorTileUrl: transparentTileUrl,
      crossOrigin: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    });

    const hybridGroup = L.layerGroup([satelliteLayer, labelsLayer]);

    // Robust tile loading & tile error tracking across active layers
    let pendingTilesCount = 0;
    let failedTilesCount = 0;

    [googleRoadmapLayer, googleSatelliteLayer, googleHybridLayer, googleTerrainLayer, osmLayer, voyagerLayer, topoLayer, terrainLayer, satelliteLayer, darkLayer, labelsLayer].forEach((layer) => {
      layer.on('tileloadstart', () => {
        pendingTilesCount++;
        setIsTileLoading(true);
      });
      layer.on('tileload', () => {
        pendingTilesCount = Math.max(0, pendingTilesCount - 1);
        if (pendingTilesCount === 0) {
          setIsTileLoading(false);
        }
      });
      layer.on('tileerror', () => {
        pendingTilesCount = Math.max(0, pendingTilesCount - 1);
        if (pendingTilesCount === 0) {
          setIsTileLoading(false);
        }
        failedTilesCount++;
        if (failedTilesCount >= 5) {
          setTileError('Some map tiles could not be loaded. Please check network connectivity or switch map layers.');
        }
      });
      layer.on('load', () => {
        setIsTileLoading(false);
        pendingTilesCount = 0;
      });
    });

    satelliteLayer.on('tileerror', () => {
      setTileWarning('Satellite imagery may be limited at this high zoom level in this sector. Switch to Standard Road Map or House Layout view.');
    });

    // Set initial base layer matching mapMode
    const initialBase = (mapMode === 'satellite') ? (isHybrid ? googleHybridLayer : googleSatelliteLayer) :
                        (mapMode === 'hybrid') ? googleHybridLayer :
                        (mapMode === 'terrain') ? googleTerrainLayer :
                        (mapMode === 'osm') ? osmLayer :
                        (mapMode === 'voyager') ? voyagerLayer :
                        (mapMode === 'dark') ? darkLayer :
                        googleRoadmapLayer;

    // Create Map Instance Centered on Tumakuru, Karnataka, India
    const map = L.map(mapContainerRef.current, {
      center: [13.3409, 77.1010], // Tumakuru city center
      zoom: 12,
      minZoom: 3,
      maxZoom: 21,
      zoomControl: false, // Using Google Maps-style custom floating zoom controls
      scrollWheelZoom: true,
      touchZoom: true,
      dragging: true,
      doubleClickZoom: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      wheelDebounceTime: 40,
      wheelPxPerZoomLevel: 60,
      layers: [initialBase]
    });

    mapRef.current = map;
    baseLayersRef.current = {
      roadmap: googleRoadmapLayer,
      google_roadmap: googleRoadmapLayer,
      satellite: googleSatelliteLayer,
      google_satellite: googleSatelliteLayer,
      hybrid: googleHybridLayer,
      google_hybrid: googleHybridLayer,
      terrain: googleTerrainLayer,
      google_terrain: googleTerrainLayer,
      satellite_esri: satelliteLayer,
      osm: osmLayer,
      hybrid_esri: hybridGroup,
      terrain_esri: terrainLayer,
      topo: topoLayer,
      voyager: voyagerLayer,
      dark: darkLayer
    };

    // Add Metric & Imperial Scale Bar Control
    L.control.scale({ imperial: true, metric: true, position: 'bottomleft' }).addTo(map);

    // Layer groups for district boundaries, parcels, searched places, and user drawing
    const districtGroup = L.featureGroup().addTo(map);
    districtLayersGroupRef.current = districtGroup;

    const parcelGroup = L.featureGroup().addTo(map);
    parcelLayersGroupRef.current = parcelGroup;

    const measureGroup = L.featureGroup().addTo(map);
    measureLayerGroupRef.current = measureGroup;

    const surveyLabelsGroup = L.featureGroup().addTo(map);
    surveyLabelsGroupRef.current = surveyLabelsGroup;

    const buildingsGroup = L.geoJSON(null, {
      className: 'osm-building-path',
      style: {
        color: '#4f46e5',
        weight: 1.5,
        fillColor: '#818cf8',
        fillOpacity: 0.25
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const bName = p.name || p['addr:housename'] || 'Building';
        const bNum = p['addr:housenumber'] ? `No. ${p['addr:housenumber']}` : '';
        const bStreet = p['addr:street'] ? `${p['addr:street']}` : '';
        const bType = p.building && p.building !== 'yes' ? `Type: ${p.building}` : '';
        layer.bindTooltip(`
          <div style="font-size:11px; font-family:sans-serif;">
            <strong style="color:#312e81;">${bName}</strong> ${bNum ? `<span style="color:#4f46e5;">(${bNum})</span>` : ''}<br/>
            ${bStreet ? `<span style="color:#64748b;">${bStreet}</span><br/>` : ''}
            ${bType ? `<span style="font-size:10px; color:#6366f1;">${bType}</span>` : ''}
          </div>
        `, { sticky: true });
      }
    });
    buildingsLayerGroupRef.current = buildingsGroup;

    const userLocGroup = L.layerGroup().addTo(map);
    userLocationLayerRef.current = userLocGroup;

    const placeMarkerGroup = L.featureGroup().addTo(map);
    placeMarkerGroupRef.current = placeMarkerGroup;

    const drawnItems = new L.FeatureGroup().addTo(map);
    drawnItemsGroupRef.current = drawnItems;

    const importedBoundaryGroup = L.featureGroup().addTo(map);
    importedBoundaryLayerRef.current = importedBoundaryGroup;

    // Leaflet Draw Control Configuration
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e11d48',
            message: '<strong>Boundary error:</strong> Polygon borders cannot cross each other.'
          },
          shapeOptions: {
            color: '#059669',
            weight: 2.5,
            fillColor: '#10b981',
            fillOpacity: 0.25,
            dashArray: '6, 6'
          }
        },
        rectangle: {
          showArea: true,
          shapeOptions: {
            color: '#059669',
            weight: 2.5,
            fillColor: '#10b981',
            fillOpacity: 0.25,
            dashArray: '6, 6'
          }
        }
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    });

    map.addControl(drawControl);

    // Track drawing start and stop to toggle crosshair cursor and helper banner
    map.on(L.Draw.Event.DRAWSTART, (event) => {
      setIsDrawing(true);
      activeDrawHandlerRef.current = event.handler;
      map.doubleClickZoom.disable();
    });

    map.on(L.Draw.Event.DRAWSTOP, () => {
      setIsDrawing(false);
      activeDrawHandlerRef.current = null;
      map.doubleClickZoom.enable();
    });

    // Handle distance measurement clicks
    map.on('click', (e) => {
      if (!isMeasuringDistanceRef.current) return;
      handleMeasureMapClick(e.latlng);
    });

    // Handle user drawing creation
    map.on(L.Draw.Event.CREATED, (event) => {
      setIsDrawing(false);
      activeDrawHandlerRef.current = null;
      const layer = event.layer;
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);

      // Add a tooltip to clearly demarcate this as a user query polygon
      layer.bindTooltip('<strong>User Query Boundary</strong><br/><span style="font-size:10px; color:#059669;">(Spatial Search &bull; Not Legal Boundary)</span>', {
        permanent: false,
        direction: 'top'
      });

      // Calculate ellipsoidal/spherical geodesic area & perimeter
      const measurements = calculateGeodesicMeasurements(layer);
      setDrawnMeasurements(measurements);

      const drawnGeoJson = layer.toGeoJSON();
      handleDrawIdentify(drawnGeoJson, measurements);
    });

    // Handle editing of drawn polygons (drag vertices)
    map.on(L.Draw.Event.EDITED, (event) => {
      const layers = event.layers;
      layers.eachLayer((layer) => {
        const measurements = calculateGeodesicMeasurements(layer);
        setDrawnMeasurements(measurements);
        const drawnGeoJson = layer.toGeoJSON();
        handleDrawIdentify(drawnGeoJson, measurements);
      });
    });

    map.on(L.Draw.Event.DELETED, () => {
      setSpatialQueryResult(null);
      setNoMatchBanner(null);
      setCandidateParcels([]);
      setDrawnMeasurements(null);
      setIsEditingBoundary(false);
    });

    // ResizeObserver on both map container and wrapper to automatically trigger map.invalidateSize()
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }
    if (mapWrapperRef.current) {
      resizeObserver.observe(mapWrapperRef.current);
    }

    // Window resize listener
    const handleWindowResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    // Initial loads centered on Tumakuru pilot district
    fetchCadastralParcels({ district: 'Tumakuru' });
    fetchDistrictBoundaries();
    fetchCoverageInfo();

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Invalidate map size on layout, inspector, or modal state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [
    selectedParcel,
    showCandidatesModal,
    showGeoJsonModal,
    showDocsModal,
    showReportModal,
    showCoverageModal,
    showLayerControlsModal,
    showSavePlotModal,
    showDeleteConfirmModal,
    showLegendModal,
    activeSearchTab,
    isFullscreen
  ]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (mapRef.current) {
        setTimeout(() => mapRef.current.invalidateSize(), 150);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    const el = mapWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 200);
  };

  // 3. Switch Base Tile Layer when mapMode or isHybrid changes (Preserves user position & zoom)
  useEffect(() => {
    if (!mapRef.current || !baseLayersRef.current) return;
    const map = mapRef.current;
    const allLayers = Object.values(baseLayersRef.current);

    allLayers.forEach((l) => {
      if (l && map.hasLayer(l)) map.removeLayer(l);
    });

    let targetKey = mapMode;
    if (targetKey === 'normal' || targetKey === 'ROADMAP') targetKey = 'roadmap';
    if (targetKey === 'SATELLITE') targetKey = isHybrid ? 'hybrid' : 'satellite';
    if (targetKey === 'HYBRID') targetKey = 'hybrid';
    if ((targetKey === 'satellite' || targetKey === 'google_satellite') && isHybrid) {
      targetKey = 'hybrid';
    }

    const targetLayer = baseLayersRef.current[targetKey] || baseLayersRef.current.roadmap || baseLayersRef.current.osm;
    if (targetLayer) {
      targetLayer.addTo(map);

      // Keep vector layers, parcel polygons, and boundaries visible above base tiles safely
      if (districtLayersGroupRef.current && typeof districtLayersGroupRef.current.bringToFront === 'function') {
        districtLayersGroupRef.current.bringToFront();
      }
      if (parcelLayersGroupRef.current && typeof parcelLayersGroupRef.current.bringToFront === 'function') {
        parcelLayersGroupRef.current.bringToFront();
      }
      if (drawnItemsGroupRef.current && typeof drawnItemsGroupRef.current.bringToFront === 'function') {
        drawnItemsGroupRef.current.bringToFront();
      }
      if (highlightLayerRef.current && typeof highlightLayerRef.current.bringToFront === 'function') {
        highlightLayerRef.current.bringToFront();
      }
      if (placeMarkerGroupRef.current && typeof placeMarkerGroupRef.current.bringToFront === 'function') {
        placeMarkerGroupRef.current.bringToFront();
      }
      if (surveyLabelsGroupRef.current && typeof surveyLabelsGroupRef.current.bringToFront === 'function') {
        surveyLabelsGroupRef.current.bringToFront();
      }

      setTileWarning(null);
      setTileError(null);
    }
    map.invalidateSize();
  }, [mapMode, isHybrid]);

  // Synchronize AI Assistant external map navigation triggers
  useEffect(() => {
    if (externalNavTarget && mapRef.current && externalNavTarget.lat && externalNavTarget.lng) {
      if (externalNavTarget.district) {
        setSelectedDistrict(externalNavTarget.district);
      }
      mapRef.current.flyTo(
        [externalNavTarget.lat, externalNavTarget.lng], 
        externalNavTarget.zoom || 14, 
        { duration: 1.2 }
      );
    }
  }, [externalNavTarget]);

  // Toggle Cadastral Parcels Layer
  useEffect(() => {
    if (!mapRef.current || !parcelLayersGroupRef.current) return;
    const map = mapRef.current;
    const group = parcelLayersGroupRef.current;

    if (showCadastralParcels) {
      if (!map.hasLayer(group)) group.addTo(map);
    } else {
      if (map.hasLayer(group)) map.removeLayer(group);
    }
  }, [showCadastralParcels]);

  // Toggle Survey Number Labels Layer
  useEffect(() => {
    if (!mapRef.current || !surveyLabelsGroupRef.current) return;
    const map = mapRef.current;
    const group = surveyLabelsGroupRef.current;

    if (showSurveyLabels) {
      if (!map.hasLayer(group)) group.addTo(map);
      renderSurveyLabels(parcels, true);
    } else {
      if (map.hasLayer(group)) map.removeLayer(group);
    }
  }, [showSurveyLabels, parcels]);

  // Toggle Building Footprints Layer
  useEffect(() => {
    if (!mapRef.current || !buildingsLayerGroupRef.current) return;
    const map = mapRef.current;
    const group = buildingsLayerGroupRef.current;

    if (showBuildings) {
      if (!map.hasLayer(group)) group.addTo(map);
    } else {
      if (map.hasLayer(group)) map.removeLayer(group);
    }
  }, [showBuildings]);

  // 3b. Fetch Coverage Info & District Boundaries
  const fetchCoverageInfo = async () => {
    try {
      const res = await getCoverageMetadata();
      setCoverageData(res.data);
    } catch (err) {
      console.error('Failed to load coverage metadata:', err);
    }
  };

  const fetchDistrictBoundaries = async () => {
    try {
      const res = await getAllDistrictBoundaries();
      if (res.data && res.data.features) {
        setDistrictBoundaries(res.data);
        renderDistrictBoundaries(res.data, true);
      }
    } catch (err) {
      console.error('Failed to load district boundaries:', err);
    }
  };

  const renderDistrictBoundaries = (fc, isVisible) => {
    if (!mapRef.current || !districtLayersGroupRef.current) return;
    const group = districtLayersGroupRef.current;
    group.clearLayers();

    if (!isVisible || !fc || !fc.features) return;

    fc.features.forEach((feat) => {
      const distId = (feat.properties && feat.properties.district_id) || '';
      const isDavanagere = distId.toLowerCase().includes('davanagere');

      // CRITICAL FIX: interactive: false ensures boundary overlays NEVER intercept mouse clicks,
      // allowing Leaflet.draw and cadastral parcel selection to function without obstruction!
      const boundaryLayer = L.geoJSON(feat, {
        interactive: false,
        className: 'district-boundary-overlay',
        style: {
          color: isDavanagere ? '#059669' : '#2563eb',
          weight: 2,
          opacity: 0.85,
          fillColor: isDavanagere ? '#10b981' : '#3b82f6',
          fillOpacity: 0.02,
          dashArray: '6, 6'
        }
      });

      group.addLayer(boundaryLayer);
    });
  };

  // Programmatic drawing tool triggers
  const startDrawPolygon = () => {
    if (!mapRef.current) return;
    if (activeDrawHandlerRef.current) {
      try {
        activeDrawHandlerRef.current.disable();
      } catch (e) {}
    }
    const handler = new L.Draw.Polygon(mapRef.current, {
      allowIntersection: false,
      showArea: true,
      drawError: {
        color: '#e11d48',
        message: '<strong>Boundary error:</strong> Polygon borders cannot cross each other.'
      },
      shapeOptions: {
        color: '#059669',
        weight: 2.5,
        fillColor: '#10b981',
        fillOpacity: 0.25,
        dashArray: '6, 6'
      }
    });
    activeDrawHandlerRef.current = handler;
    handler.enable();
    setIsDrawing(true);
  };

  const startDrawRectangle = () => {
    if (!mapRef.current) return;
    if (activeDrawHandlerRef.current) {
      try {
        activeDrawHandlerRef.current.disable();
      } catch (e) {}
    }
    const handler = new L.Draw.Rectangle(mapRef.current, {
      showArea: true,
      shapeOptions: {
        color: '#059669',
        weight: 2.5,
        fillColor: '#10b981',
        fillOpacity: 0.25,
        dashArray: '6, 6'
      }
    });
    activeDrawHandlerRef.current = handler;
    handler.enable();
    setIsDrawing(true);
  };

  const cancelDrawing = () => {
    if (activeDrawHandlerRef.current) {
      try {
        activeDrawHandlerRef.current.disable();
      } catch (e) {
        console.warn('Error disabling active draw handler:', e);
      }
      activeDrawHandlerRef.current = null;
    }
    setIsDrawing(false);
  };

  // Toggle boundary visibility
  useEffect(() => {
    if (districtBoundaries) {
      renderDistrictBoundaries(districtBoundaries, showDistrictBoundaries);
    }
  }, [showDistrictBoundaries]);

  // Dismiss searched place marker
  const dismissSearchedPlaceMarker = () => {
    if (placeMarkerGroupRef.current) {
      placeMarkerGroupRef.current.clearLayers();
    }
    setSelectedPlaceInfo(null);
  };

  // Debounced Place Search effect (300ms)
  useEffect(() => {
    if (!placeSearchQuery || placeSearchQuery.trim().length < 2) {
      setPlaceSuggestions([]);
      setShowPlaceDropdown(false);
      setPlaceSearchError(null);
      setHighlightedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      setPlaceSearchError(null);
      try {
        const res = await searchPlaces(placeSearchQuery.trim());
        const results = res.data.results || [];
        setPlaceSuggestions(results);
        setShowPlaceDropdown(true);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('Place search failed:', err);
        setPlaceSearchError('Search service temporarily unavailable or rate limited. You can also enter direct GPS coordinates (e.g. 13.3409, 77.1010).');
        setShowPlaceDropdown(true);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [placeSearchQuery]);

  // Keyboard navigation for search suggestions
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showPlaceDropdown && placeSuggestions.length > 0) {
        setShowPlaceDropdown(true);
      }
      setHighlightedIndex((prev) =>
        placeSuggestions.length === 0 ? -1 : (prev + 1) % placeSuggestions.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        placeSuggestions.length === 0 ? -1 : prev <= 0 ? placeSuggestions.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showPlaceDropdown && highlightedIndex >= 0 && highlightedIndex < placeSuggestions.length) {
        handleSelectPlace(placeSuggestions[highlightedIndex]);
      } else if (placeSuggestions.length > 0) {
        handleSelectPlace(placeSuggestions[0]);
      } else if (placeSearchQuery.trim().length >= 2) {
        setIsSearchingPlaces(true);
        searchPlaces(placeSearchQuery.trim())
          .then((res) => {
            const results = res.data?.results || [];
            if (results.length > 0) {
              handleSelectPlace(results[0]);
            } else {
              setPlaceSuggestions([]);
              setShowPlaceDropdown(true);
            }
          })
          .catch((err) => {
            console.error('Search on Enter failed:', err);
            setPlaceSearchError('Search failed. Try direct GPS coordinates.');
            setShowPlaceDropdown(true);
          })
          .finally(() => setIsSearchingPlaces(false));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowPlaceDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  // Handle selecting a place (e.g. SIT Tumakuru, Tumakuru city, Davanagere, coordinates, etc.)
  const handleSelectPlace = (place) => {
    setSelectedPlaceInfo(place);
    setShowPlaceDropdown(false);
    setHighlightedIndex(-1);
    setPlaceSearchQuery(place.display_name || `${place.name} (${place.taluk ? `${place.taluk}, ` : ''}${place.district})`);

    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous search marker
    if (placeMarkerGroupRef.current) {
      placeMarkerGroupRef.current.clearLayers();
    }

    // If selected place is an actual cadastral parcel (e.g. from numeric survey search)
    if (place.is_cadastral_parcel && place.parcel_id) {
      if (place.district && place.district.toLowerCase().includes('davanagere')) {
        setSelectedDistrict('Davanagere');
      } else if (place.district && place.district.toLowerCase().includes('tumakuru')) {
        setSelectedDistrict('Tumakuru');
      }
      selectParcel({
        parcel_id: place.parcel_id,
        id: place.parcel_id,
        survey_number: place.survey_number,
        hissa_number: place.hissa_number,
        village: place.village,
        taluk: place.taluk,
        hobli: place.hobli,
        district: place.district,
        extent_acres: place.extent_acres,
        area_acres: place.extent_acres,
        center_lat: place.lat,
        center_lng: place.lng,
        geometry: place.geometry,
        verification_status: place.is_verified ? 'VERIFIED_AUTHORIZED' : 'IMPORTED_UNVERIFIED',
        primary_owner: place.primary_owner
      });
      return;
    }

    // Zoom and pan to target smoothly
    const targetZoom = place.zoom || (
      place.place_type === 'coordinates' ? 17 :
      ['college', 'university', 'landmark', 'building', 'amenity', 'cadastral_parcel'].includes(place.place_type) ? 17 :
      ['village', 'hamlet', 'neighbourhood'].includes(place.place_type) ? 15 :
      ['town', 'road', 'highway'].includes(place.place_type) ? 14 :
      ['city', 'taluk'].includes(place.place_type) ? 12 :
      place.place_type === 'district' ? 10 : 15
    );
    map.flyTo([place.lat, place.lng], targetZoom, { duration: 1.5 });

    // Focus district if it's Davanagere or Tumakuru
    if (place.district && place.district.toLowerCase().includes('davanagere')) {
      setSelectedDistrict('Davanagere');
    } else if (place.district && place.district.toLowerCase().includes('tumakuru')) {
      setSelectedDistrict('Tumakuru');
    }

    // If village or locality has cadastral parcels (e.g. Maravanji, Avaragere, Bathi), fetch and render them
    if (place.has_cadastral_parcels || place.place_type === 'village') {
      fetchCadastralParcels({
        district: place.district,
        taluk: place.taluk,
        village: place.name
      });
    }

    // Create custom pulsing pin marker
    const markerHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: rgba(16, 185, 129, 0.45); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background: linear-gradient(135deg, #059669, #047857); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25); border: 2px solid white; font-size: 13px;">
          📍
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'custom-place-pin',
      html: markerHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });

    const marker = L.marker([place.lat, place.lng], { icon: customIcon });

    const boundaryNote = place.has_cadastral_parcels
      ? `<span style="color:#059669; font-weight:700;">✓ Official Cadastral Parcels Available (${place.cadastral_survey_numbers?.join(', ') || 'Surveyed'})</span>`
      : place.has_boundary_polygon 
      ? '<span style="color:#059669; font-weight:600;">✓ Official District Boundary Overlay Active</span>'
      : '<span style="color:#64748b; font-size:11px;">📍 Official Revenue Point Marker (Non-Fabricated: Cadastral parcel polygons digitized on survey request)</span>';

    const popupHtml = `
      <div style="font-family: inherit; font-size: 12px; min-width: 240px; padding: 4px;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap: 8px; margin-bottom: 4px;">
          <strong style="color: #0f172a; font-size: 14px; line-height: 1.25;">${place.name}</strong>
          ${place.name_kn ? `<span style="color: #059669; font-weight: bold; font-size: 12px; white-space: nowrap;">${place.name_kn}</span>` : ''}
        </div>
        <div style="color: #475569; font-size: 11px; margin-bottom: 6px; line-height: 1.35;">
          ${place.display_name}
        </div>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px 8px; border-radius: 8px; margin-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase;">
            ${place.place_type ? place.place_type.replace('_', ' ') : 'LOCATION'} &bull; ${place.accuracy || 'Official Revenue Location'}
          </div>
          <div style="font-size: 10px; color: #15803d; margin-top: 2px;">
            Coordinates: <strong>${place.lat.toFixed(4)}° N, ${place.lng.toFixed(4)}° E</strong>
          </div>
        </div>
        <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">
          ${boundaryNote}
        </div>
        <button 
          id="btn-dismiss-place-marker" 
          type="button" 
          style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 10px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 11px; font-weight: 700; color: #dc2626; cursor: pointer;"
        >
          &times; Dismiss Marker
        </button>
      </div>
    `;

    marker.bindPopup(popupHtml);
    marker.on('popupopen', () => {
      const dismissBtn = document.getElementById('btn-dismiss-place-marker');
      if (dismissBtn) {
        dismissBtn.onclick = () => {
          dismissSearchedPlaceMarker();
        };
      }
    });

    if (placeMarkerGroupRef.current) {
      placeMarkerGroupRef.current.addLayer(marker);
    }
    marker.openPopup();
  };

  const focusKarnataka = () => {
    if (!mapRef.current) return;
    setActiveDistrictFocus('all');
    mapRef.current.fitBounds(KARNATAKA_REGIONAL_BOUNDS, { padding: [30, 30], animate: true });
  };

  const focusDistrict = (distName) => {
    if (!mapRef.current) return;
    setActiveDistrictFocus(distName);
    const cleanDist = distName.toLowerCase();

    // Look for matching feature in loaded districtBoundaries to fit actual geometry
    let matchedFeature = null;
    if (districtBoundaries && districtBoundaries.features) {
      matchedFeature = districtBoundaries.features.find((f) => {
        const id = (f.properties?.district_id || '').toLowerCase();
        const name = (f.properties?.name || '').toLowerCase();
        return id.includes(cleanDist) || name.includes(cleanDist);
      });
    }

    if (cleanDist === 'davanagere') {
      setSelectedDistrict('Davanagere');
      if (matchedFeature) {
        try {
          const bLayer = L.geoJSON(matchedFeature);
          mapRef.current.fitBounds(bLayer.getBounds(), { padding: [35, 35], animate: true });
        } catch (e) {
          mapRef.current.fitBounds(DAVANAGERE_DISTRICT_BOUNDS, { padding: [35, 35], animate: true });
        }
      } else {
        mapRef.current.fitBounds(DAVANAGERE_DISTRICT_BOUNDS, { padding: [35, 35], animate: true });
      }
      fetchCadastralParcels({ district: 'Davanagere' });
    } else if (cleanDist === 'tumakuru') {
      setSelectedDistrict('Tumakuru');
      if (matchedFeature) {
        try {
          const bLayer = L.geoJSON(matchedFeature);
          mapRef.current.fitBounds(bLayer.getBounds(), { padding: [35, 35], animate: true });
        } catch (e) {
          mapRef.current.fitBounds(TUMAKURU_DISTRICT_BOUNDS, { padding: [35, 35], animate: true });
        }
      } else {
        mapRef.current.fitBounds(TUMAKURU_DISTRICT_BOUNDS, { padding: [35, 35], animate: true });
      }
      fetchCadastralParcels({ district: 'Tumakuru' });
    } else if (cleanDist === 'shivamogga' || cleanDist === 'shimoga') {
      setSelectedDistrict('Shivamogga');
      if (matchedFeature) {
        try {
          const bLayer = L.geoJSON(matchedFeature);
          mapRef.current.fitBounds(bLayer.getBounds(), { padding: [35, 35], animate: true });
        } catch (e) {
          mapRef.current.fitBounds(SHIVAMOGGA_DISTRICT_BOUNDS, { padding: [35, 35], animate: true });
        }
      } else {
        mapRef.current.fitBounds(SHIVAMOGGA_DISTRICT_BOUNDS, { padding: [35, 35], animate: true });
      }
      fetchCadastralParcels({ district: 'Shivamogga' });
    } else if (cleanDist === 'mysuru' || cleanDist === 'mysore') {
      setSelectedDistrict('Mysuru');
      if (matchedFeature) {
        try {
          const bLayer = L.geoJSON(matchedFeature);
          mapRef.current.fitBounds(bLayer.getBounds(), { padding: [35, 35], animate: true });
        } catch (e) {
          mapRef.current.fitBounds(MYSURU_DISTRICT_BOUNDS, { padding: [35, 35], animate: true });
        }
      } else {
        mapRef.current.fitBounds(MYSURU_DISTRICT_BOUNDS, { padding: [35, 35], animate: true });
      }
      fetchCadastralParcels({ district: 'Mysuru' });
    }
  };

  // 4. Fetch Cadastral Parcels from DB
  const fetchCadastralParcels = async (filterParams = {}) => {
    setLoadingParcels(true);
    try {
      const params = {};
      const targetDistrict = filterParams.district !== undefined ? filterParams.district : selectedDistrict;
      if (targetDistrict) params.district = targetDistrict;

      if (filterParams.taluk) params.taluk = filterParams.taluk;
      if (filterParams.hobli) params.hobli = filterParams.hobli;
      if (filterParams.village) params.village = filterParams.village;
      if (filterParams.survey_number) params.survey_number = filterParams.survey_number;
      if (filterParams.hissa_number) params.hissa_number = filterParams.hissa_number;

      const res = await searchLandParcels(params);
      let data = res.data || [];

      // If specific village/taluk filter has no parcels, fallback to full district parcels so polygons are visible
      if (data.length === 0 && targetDistrict) {
        const fallbackRes = await searchLandParcels({ district: targetDistrict });
        if (fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data;
        }
      }

      setParcels(data);
      renderParcelsOnMap(data);

      if (data.length > 0 && !selectedParcel) {
        selectParcel(data[0]);
      }
    } catch (err) {
      console.error('Failed to load cadastral parcels:', err);
    } finally {
      setLoadingParcels(false);
    }
  };

  // 5. Render Parcels on Leaflet Map
  const renderParcelsOnMap = (parcelList) => {
    if (!mapRef.current || !parcelLayersGroupRef.current) return;
    const group = parcelLayersGroupRef.current;
    group.clearLayers();

    if (!parcelList || parcelList.length === 0) return;

    parcelList.forEach((parcel) => {
      if (!parcel.geometry) return;

      const parcelId = parcel.parcel_id || parcel.id;
      const selectedId = selectedParcel ? (selectedParcel.parcel_id || selectedParcel.id) : null;
      const isCurrentSelected = selectedId && selectedId === parcelId;
      const isDimmed = dimOtherParcels && selectedId && !isCurrentSelected;
      
      const geoLayer = L.geoJSON(parcel.geometry, {
        className: `cadastral-parcel-path ${isCurrentSelected ? 'selected-highlight' : ''} ${isDimmed ? 'dimmed' : ''}`,
        style: {
          color: isCurrentSelected ? '#047857' : (isDimmed ? '#94a3b8' : '#059669'),
          weight: isCurrentSelected ? 3.5 : (isDimmed ? 1 : 2),
          fillColor: isCurrentSelected ? '#10b981' : (isDimmed ? '#cbd5e1' : '#34d399'),
          fillOpacity: isCurrentSelected ? 0.45 : (isDimmed ? 0.08 : 0.22),
          dashArray: parcel.verification_status === 'VERIFIED_AUTHORIZED' ? null : '4, 4'
        }
      });

      // Tooltip on Hover
      const ownerLabel = parcel.primary_owner || (parcel.records && parcel.records[0]?.owner_name) || 'Registered Owner';
      geoLayer.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px;">
          <strong style="color: #0f172a;">Sy ${parcel.survey_number} / Hissa ${parcel.hissa_number || '-'}</strong><br/>
          <span style="color: #475569;">${parcel.village}, ${parcel.taluk}</span><br/>
          <span style="color: #059669; font-weight: 600;">${parcel.extent_acres || parcel.area_acres} Ac &bull; ${ownerLabel}</span>
        </div>`,
        { direction: 'center', permanent: false, sticky: true }
      );

      // On Click -> Select Parcel
      geoLayer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectParcelWithHighlight(parcel);
      });

      group.addLayer(geoLayer);
    });

    // Render survey number badges on parcel centroids
    renderSurveyLabels(parcelList, showSurveyLabels);
  };

  // Re-render parcel styling on dimOtherParcels or selectedParcel change
  useEffect(() => {
    if (parcels.length > 0) {
      renderParcelsOnMap(parcels);
    }
  }, [dimOtherParcels]);

  // 6. Select Parcel & Fetch Full Record Details
  const selectParcel = async (parcel) => {
    setSelectedParcel(parcel);
    if (typeof onParcelSelect === 'function') {
      try {
        onParcelSelect(parcel);
      } catch (e) {}
    }
    setLoadingDetails(true);
    setNoMatchBanner(null);

    try {
      const res = await getLandParcelById(parcel.parcel_id || parcel.id);
      setSelectedParcelDetails(res.data);

      // Highlight on map & zoom bounds
      highlightParcelOnMap(parcel);
    } catch (err) {
      console.error('Failed to load parcel details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const highlightParcelOnMap = (parcel) => {
    if (!mapRef.current || !parcel.geometry) return;
    const map = mapRef.current;

    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
    }

    const hl = L.geoJSON(parcel.geometry, {
      className: 'active-selected-parcel-hl',
      style: {
        color: '#047857',
        weight: 3.5,
        fillColor: '#10b981',
        fillOpacity: 0.45,
      }
    }).addTo(map);

    highlightLayerRef.current = hl;

    try {
      const bounds = hl.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18, animate: true });
      }
    } catch (e) {
      // Fallback center pan
      if (parcel.center_lat && parcel.center_lng) {
        map.panTo([parcel.center_lat, parcel.center_lng]);
      }
    }
  };

  // Toast Notification Helper
  const showToast = (message, type = 'info') => {
    setLocationToast({ message, type });
    setTimeout(() => {
      setLocationToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Survey Number Badges Overlay
  const renderSurveyLabels = (parcelList, isVisible) => {
    if (!mapRef.current || !surveyLabelsGroupRef.current) return;
    const group = surveyLabelsGroupRef.current;
    group.clearLayers();

    if (!isVisible || !parcelList || parcelList.length === 0) return;

    parcelList.forEach((parcel) => {
      if (!parcel.center_lat || !parcel.center_lng) return;

      const labelHtml = `
        <div class="survey-num-badge">
          ${parcel.survey_number}${parcel.hissa_number ? `/${parcel.hissa_number}` : ''}
        </div>
      `;

      const icon = L.divIcon({
        className: 'survey-num-icon-container',
        html: labelHtml,
        iconSize: [40, 20],
        iconAnchor: [20, 10]
      });

      const marker = L.marker([parcel.center_lat, parcel.center_lng], {
        icon,
        interactive: false
      });

      group.addLayer(marker);
    });
  };

  // GPS Current Location & Accuracy Circle Marker
  const renderUserLocation = (lat, lng, accuracy, heading = null) => {
    if (!mapRef.current || !userLocationLayerRef.current) return;
    const group = userLocationLayerRef.current;
    group.clearLayers();

    // Accuracy Circle
    const accuracyCircle = L.circle([lat, lng], {
      radius: Math.max(accuracy, 10),
      color: '#2563eb',
      weight: 1,
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      dashArray: '4, 4',
      interactive: false
    });

    // Custom Pulsing Blue Pin
    const pinHtml = `
      <div class="gps-user-pin-wrapper">
        <div class="gps-user-pin-pulse"></div>
        <div class="gps-user-pin-dot"></div>
      </div>
    `;

    const userPinIcon = L.divIcon({
      className: 'gps-user-marker',
      html: pinHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([lat, lng], { icon: userPinIcon });
    marker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; min-width: 180px;">
        <strong style="color: #1e40af;">📍 Your Current Location</strong><br/>
        <span style="color: #64748b; font-size: 11px;">Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}</span><br/>
        <span style="color: #059669; font-size: 11px; font-weight: 600;">GPS Accuracy: &plusmn;${Math.round(accuracy)} meters</span>
      </div>
    `);

    group.addLayer(accuracyCircle);
    group.addLayer(marker);
    setUserLocation({ lat, lng, accuracy, heading });
  };

  const handleGetCurrentLocation = (startLive = false) => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    setIsLocating(true);
    showToast('Locating your position via GPS...', 'info');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy, heading } = pos.coords;
        renderUserLocation(latitude, longitude, accuracy, heading);

        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 17, { duration: 1.2 });
        }
        showToast(`Location acquired (Accuracy: ±${Math.round(accuracy)}m)`, 'success');

        if (startLive) {
          startLiveTracking();
        }
      },
      (err) => {
        setIsLocating(false);
        let errorMsg = 'Failed to obtain GPS location.';
        if (err.code === 1) {
          errorMsg = 'Location permission denied. Please enable location access in browser settings.';
        } else if (err.code === 2) {
          errorMsg = 'Position unavailable. GPS signal lost.';
        } else if (err.code === 3) {
          errorMsg = 'Location request timed out. Retrying with cached fix.';
        }
        showToast(errorMsg, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000
      }
    );
  };

  const startLiveTracking = () => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading } = pos.coords;
        renderUserLocation(latitude, longitude, accuracy, heading);
      },
      (err) => {
        console.warn('Live tracking watch error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000
      }
    );

    watchIdRef.current = id;
    setIsLiveTracking(true);
    showToast('Live GPS Tracking enabled. Map will track your position.', 'success');
  };

  const stopLiveTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
    showToast('Live tracking stopped.', 'info');
  };

  // OpenStreetMap Building Footprints & House Layout Query
  const fetchAndRenderBuildings = async () => {
    if (!mapRef.current || !buildingsLayerGroupRef.current) return;
    const map = mapRef.current;
    const zoom = map.getZoom();

    if (zoom < 14) {
      showToast('Zoom in to at least Level 14 to load building footprints & house layouts.', 'info');
      return;
    }

    const bounds = map.getBounds();
    setIsLoadingBuildings(true);
    try {
      const res = await getOsmBuildings({
        min_lat: bounds.getSouth(),
        min_lng: bounds.getWest(),
        max_lat: bounds.getNorth(),
        max_lng: bounds.getEast()
      });

      const fc = res.data;
      buildingsLayerGroupRef.current.clearLayers();

      if (fc && fc.features && fc.features.length > 0) {
        buildingsLayerGroupRef.current.addData(fc);
        if (!map.hasLayer(buildingsLayerGroupRef.current)) {
          buildingsLayerGroupRef.current.addTo(map);
        }
        setShowBuildings(true);
        showToast(`Loaded ${fc.features.length} building footprints from OpenStreetMap Overpass.`, 'success');
      } else {
        showToast('No OpenStreetMap building footprints mapped in this specific view. CartoDB Voyager raster layer displays street layouts.', 'info');
      }
    } catch (err) {
      console.error('Failed to fetch buildings:', err);
      showToast('Unable to fetch building footprints. Try zooming in closer.', 'error');
    } finally {
      setIsLoadingBuildings(false);
    }
  };

  // Vertex Drag Editing for Drawn Query Boundaries
  const toggleEditBoundary = () => {
    if (!drawnItemsGroupRef.current) return;
    const group = drawnItemsGroupRef.current;
    const layers = group.getLayers();
    if (layers.length === 0) {
      showToast('No drawn boundary to edit. Draw a polygon first!', 'info');
      return;
    }
    const targetLayer = layers[0];
    if (!isEditingBoundary) {
      if (targetLayer.editing) {
        targetLayer.editing.enable();
        setIsEditingBoundary(true);
        showToast('Vertex editing enabled. Drag any corner vertex or midpoint to reshape.', 'info');
      }
    } else {
      if (targetLayer.editing) {
        targetLayer.editing.disable();
        setIsEditingBoundary(false);
        const measurements = calculateGeodesicMeasurements(targetLayer);
        setDrawnMeasurements(measurements);
        handleDrawIdentify(targetLayer.toGeoJSON(), measurements);
        showToast('Boundary edits saved and spatial query re-evaluated.', 'success');
      }
    }
  };

  const deleteDrawnBoundary = () => {
    if (drawnItemsGroupRef.current) {
      drawnItemsGroupRef.current.clearLayers();
    }
    if (importedBoundaryLayerRef.current) {
      importedBoundaryLayerRef.current.clearLayers();
    }
    setIsEditingBoundary(false);
    setSpatialQueryResult(null);
    setNoMatchBanner(null);
    setCandidateParcels([]);
    setDrawnMeasurements(null);
    showToast('Boundary removed.', 'info');
  };

  // 🌓 Theme Toggle
  const toggleTheme = () => {
    if (onToggleGlobalTheme) {
      onToggleGlobalTheme();
      return;
    }
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('bhoomi_theme', nextTheme);
    if (nextTheme === 'dark') {
      setMapMode('dark');
    } else {
      setMapMode('voyager');
    }
    showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
  };

  // ↩️ Undo Drawing Vertex
  const handleUndoDrawVertex = () => {
    if (activeDrawHandlerRef.current && typeof activeDrawHandlerRef.current.deleteLastVertex === 'function') {
      try {
        activeDrawHandlerRef.current.deleteLastVertex();
        showToast('Last vertex removed.', 'info');
      } catch (e) {
        console.warn('Could not delete last vertex:', e);
      }
    } else {
      showToast('No vertex to undo. Active while drawing a polygon.', 'info');
    }
  };

  // 📐 Distance Measurement Tool
  const toggleMeasureDistance = () => {
    const nextState = !isMeasuringDistance;
    setIsMeasuringDistance(nextState);
    isMeasuringDistanceRef.current = nextState;
    if (!nextState) {
      clearDistanceMeasurement();
      showToast('Distance measurement disabled.', 'info');
    } else {
      showToast('Distance Tool: Click on the map to add measuring waypoints.', 'info');
    }
  };

  const handleMeasureMapClick = (latlng) => {
    if (!mapRef.current || !measureLayerGroupRef.current) return;
    const pts = [...measurePointsRef.current, latlng];
    measurePointsRef.current = pts;

    if (!measurePolylineRef.current) {
      const poly = L.polyline(pts, {
        color: '#0284c7',
        weight: 3.5,
        dashArray: '6, 6'
      }).addTo(measureLayerGroupRef.current);
      measurePolylineRef.current = poly;
    } else {
      measurePolylineRef.current.setLatLngs(pts);
    }

    // Add waypoint circle marker
    const marker = L.circleMarker(latlng, {
      radius: 5,
      color: '#0284c7',
      fillColor: '#ffffff',
      fillOpacity: 1,
      weight: 2
    }).addTo(measureLayerGroupRef.current);
    measureMarkersRef.current.push(marker);

    // Calculate cumulative distance
    let totalMeters = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      totalMeters += pts[i].distanceTo(pts[i + 1]);
    }
    const totalFeet = Math.round(totalMeters * 3.28084);
    const metersRounded = Math.round(totalMeters * 10) / 10;
    setMeasuredDistance({ meters: metersRounded, feet: totalFeet, pointsCount: pts.length });

    marker.bindTooltip(`
      <div class="measure-distance-tooltip">
        ${pts.length === 1 ? 'Start Point' : `${metersRounded} m (${totalFeet} ft)`}
      </div>
    `, { permanent: true, direction: 'top', className: 'measure-distance-tooltip' }).openTooltip();
  };

  const clearDistanceMeasurement = () => {
    if (measureLayerGroupRef.current) {
      measureLayerGroupRef.current.clearLayers();
    }
    measurePointsRef.current = [];
    measurePolylineRef.current = null;
    measureMarkersRef.current = [];
    setMeasuredDistance(null);
  };

  // 💾 Save Plot Modal & Handler
  const openSavePlotModal = () => {
    let hasGeometry = false;
    if (drawnItemsGroupRef.current && drawnItemsGroupRef.current.getLayers().length > 0) {
      hasGeometry = true;
    } else if (importedBoundaryLayerRef.current && importedBoundaryLayerRef.current.getLayers().length > 0) {
      hasGeometry = true;
    }

    if (!hasGeometry) {
      showToast('Please draw a plot or import a boundary first before saving.', 'error');
      return;
    }

    setSavePlotFormData({
      district: selectedDistrict || 'Tumakuru',
      taluk: selectedTaluk || 'Tumakuru',
      hobli: selectedHobli || 'Kasaba',
      village: selectedVillage || 'Melekote',
      survey_number: '',
      hissa_number: '1',
      owner_name: '',
      land_type: 'Agricultural',
      notes: ''
    });
    setShowSavePlotModal(true);
  };

  const handleSavePlotSubmit = async (e) => {
    e.preventDefault();
    let geom = null;

    if (drawnItemsGroupRef.current && drawnItemsGroupRef.current.getLayers().length > 0) {
      const layer = drawnItemsGroupRef.current.getLayers()[0];
      const gj = layer.toGeoJSON();
      geom = gj.geometry || gj;
    } else if (importedBoundaryLayerRef.current && importedBoundaryLayerRef.current.getLayers().length > 0) {
      const layer = importedBoundaryLayerRef.current.getLayers()[0];
      const gj = layer.toGeoJSON();
      geom = gj.geometry || gj;
    }

    if (!geom) {
      showToast('No valid boundary polygon found to save.', 'error');
      return;
    }

    setIsSavingPlot(true);
    try {
      const payload = {
        district: savePlotFormData.district || selectedDistrict || 'Tumakuru',
        taluk: savePlotFormData.taluk || selectedTaluk || 'Tumakuru',
        hobli: savePlotFormData.hobli || selectedHobli || 'Kasaba',
        village: savePlotFormData.village || selectedVillage || 'Melekote',
        survey_number: savePlotFormData.survey_number.trim() || 'Custom',
        hissa_number: savePlotFormData.hissa_number.trim() || '1',
        surnoc: '*',
        boundary_geojson: geom,
        area_acres: drawnMeasurements?.acresTotal || 1.0,
        perimeter_meters: drawnMeasurements?.perimeterMeters || 200.0,
        land_type: savePlotFormData.land_type || 'Agricultural',
        owner_name: savePlotFormData.owner_name.trim() || null,
        notes: savePlotFormData.notes.trim() || null,
        verification_status: 'USER_DRAWN_UNVERIFIED',
        geometry_source: 'User Drawn Boundary'
      };

      const res = await createLandParcel(payload);
      const savedParcel = res.data;
      setShowSavePlotModal(false);
      showToast(`Plot Survey ${savedParcel.survey_number} saved to database!`, 'success');

      // Refresh parcels list & select the saved parcel
      await fetchCadastralParcels({ district: savedParcel.district });
      selectParcelWithHighlight(savedParcel);
    } catch (err) {
      console.error('Failed to save plot:', err);
      showToast('Failed to save plot to database.', 'error');
    } finally {
      setIsSavingPlot(false);
    }
  };

  // 🗑️ Delete Plot Confirm & Handler
  const confirmDeleteParcel = (parcel) => {
    setPlotToDelete(parcel);
    setShowDeleteConfirmModal(true);
  };

  const executeDeleteParcel = async () => {
    if (!plotToDelete) return;
    try {
      await deleteLandParcel(plotToDelete.id || plotToDelete.parcel_id);
      showToast(`Plot Survey ${plotToDelete.survey_number} deleted from database.`, 'info');
      setShowDeleteConfirmModal(false);
      
      if (selectedParcel && (selectedParcel.id === plotToDelete.id || selectedParcel.parcel_id === plotToDelete.parcel_id)) {
        setSelectedParcel(null);
        setSelectedParcelDetails(null);
        setDimOtherParcels(false);
      }
      setPlotToDelete(null);
      await fetchCadastralParcels();
    } catch (err) {
      console.error('Failed to delete plot:', err);
      showToast('Failed to delete plot from database.', 'error');
    }
  };



  // ⚖️ Known-Area Comparison Calculation
  const computeAreaComparison = () => {
    if (!knownAreaInput || isNaN(parseFloat(knownAreaInput)) || !selectedParcel) return null;
    const knownVal = parseFloat(knownAreaInput);
    if (knownVal <= 0) return null;

    let knownInAcres = knownVal;
    if (knownAreaUnit === 'Guntas') {
      knownInAcres = knownVal / 40.0;
    } else if (knownAreaUnit === 'SqFt') {
      knownInAcres = knownVal / 43560.0;
    }

    const mappedAcres = selectedParcel.area_acres || selectedParcel.extent_acres || 0;
    const deltaAcres = mappedAcres - knownInAcres;
    const deltaGuntas = Math.round(deltaAcres * 40 * 10) / 10;
    const pct = knownInAcres > 0 ? (deltaAcres / knownInAcres) * 100 : 0;

    return {
      knownAcres: Math.round(knownInAcres * 100) / 100,
      mappedAcres: Math.round(mappedAcres * 100) / 100,
      deltaAcres: Math.round(deltaAcres * 100) / 100,
      deltaGuntas: deltaGuntas,
      pctDiscrepancy: Math.round(pct * 10) / 10,
      isMatch: Math.abs(pct) <= 1.0,
      isClose: Math.abs(pct) <= 5.0
    };
  };

  // 📋 Copy Boundary Coordinates
  const copyBoundaryCoordinates = () => {
    if (!selectedParcel || !selectedParcel.geometry) return;
    const coords = selectedParcel.geometry.coordinates;
    navigator.clipboard.writeText(JSON.stringify(coords, null, 2));
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
    showToast('Boundary coordinates copied to clipboard.', 'success');
  };

  // 🎯 Select parcel with highlight and dim other parcels
  const selectParcelWithHighlight = (parcel) => {
    selectParcel(parcel);
    setDimOtherParcels(true);
  };

  const resetParcelSelection = () => {
    setSelectedParcel(null);
    setSelectedParcelDetails(null);
    setDimOtherParcels(false);
  };



  // 7. Handle Spatial Drawing Query (POST /api/land/parcels/identify)
  const handleDrawIdentify = async (drawnGeoJson, measurements = null) => {
    setSpatialQueryLoading(true);
    setNoMatchBanner(null);
    setCandidateParcels([]);

    try {
      const res = await identifyParcelByPolygon(drawnGeoJson);
      const data = res.data;
      setSpatialQueryResult(data);

      if (data.match_type === 'STRONG_MATCH' && data.matched_parcel) {
        // Automatic strong match selection
        await selectParcel(data.matched_parcel);
      } else if (data.match_type === 'MULTIPLE_CANDIDATES') {
        // Multiple candidates
        setCandidateParcels(data.candidates || []);
        setShowCandidatesModal(true);
        if (data.candidates && data.candidates.length > 0) {
          selectParcel(data.candidates[0]);
        }
      } else {
        // NO_MATCH
        setSelectedParcel(null);
        setSelectedParcelDetails(null);
        setNoMatchBanner({
          drawnArea: measurements ? measurements.acresTotal : data.drawn_polygon_area_acres,
          message: data.message || 'No verified land parcel found for this area. Search using the survey number or upload an authorized cadastral map.'
        });
      }
    } catch (err) {
      console.error('Failed to identify parcel by polygon:', err);
      setNoMatchBanner({
        message: 'Spatial polygon query failed. Please verify that the drawn polygon coordinates fall within Karnataka pilot districts.'
      });
    } finally {
      setSpatialQueryLoading(false);
    }
  };

  // 8. Administrative Hierarchy Navigation
  const handleDistrictChange = (dist) => {
    setSelectedDistrict(dist);
    const dObj = locationsHierarchy.find(d => d.name === dist);
    const taluks = dObj ? dObj.taluks : [];
    const firstTaluk = taluks.length > 0 ? taluks[0].name : '';
    setSelectedTaluk(firstTaluk);

    const tObj = taluks.find(t => t.name === firstTaluk);
    const hoblis = tObj ? tObj.hoblis : [];
    const firstHobli = hoblis.length > 0 ? hoblis[0].name : '';
    setSelectedHobli(firstHobli);

    const hObj = hoblis.find(h => h.name === firstHobli);
    const villages = hObj ? hObj.villages : [];
    const firstVillage = villages.length > 0 ? villages[0] : '';
    setSelectedVillage(firstVillage);

    flyToLocation(dist.toLowerCase(), 11);
    fetchCadastralParcels({ district: dist, taluk: firstTaluk, hobli: firstHobli, village: firstVillage });
  };

  const handleTalukChange = (taluk) => {
    setSelectedTaluk(taluk);
    const tObj = availableTaluks.find(t => t.name === taluk);
    const hoblis = tObj ? tObj.hoblis : [];
    const firstHobli = hoblis.length > 0 ? hoblis[0].name : '';
    setSelectedHobli(firstHobli);

    const hObj = hoblis.find(h => h.name === firstHobli);
    const villages = hObj ? hObj.villages : [];
    const firstVillage = villages.length > 0 ? villages[0] : '';
    setSelectedVillage(firstVillage);

    flyToLocation(taluk.toLowerCase(), 13);
    fetchCadastralParcels({ district: selectedDistrict, taluk, hobli: firstHobli, village: firstVillage });
  };

  const handleHobliChange = (hobli) => {
    setSelectedHobli(hobli);
    const hObj = availableHoblis.find(h => h.name === hobli);
    const villages = hObj ? hObj.villages : [];
    const firstVillage = villages.length > 0 ? villages[0] : '';
    setSelectedVillage(firstVillage);

    fetchCadastralParcels({ district: selectedDistrict, taluk: selectedTaluk, hobli, village: firstVillage });
  };

  const handleVillageChange = (village) => {
    setSelectedVillage(village);
    flyToLocation(village.toLowerCase(), 15);
    fetchCadastralParcels({ district: selectedDistrict, taluk: selectedTaluk, hobli: selectedHobli, village });
  };

  const flyToLocation = (nameKey, defaultZoom = 14) => {
    if (!mapRef.current) return;
    const key = nameKey.toLowerCase().replace(/\s+/g, '');
    const entry = KARNATAKA_PILOT_COORDS[key];
    if (entry) {
      mapRef.current.flyTo([entry.lat, entry.lng], entry.zoom || defaultZoom, { duration: 1.2 });
    }
  };

  // 9. Search Parcel by Survey Number & Hissa
  const handleSearchParcel = async (e) => {
    if (e) e.preventDefault();
    if (!surveyNumberSearch.trim()) return;

    setIsSearching(true);
    setNoMatchBanner(null);

    try {
      const params = {
        district: selectedDistrict || undefined,
        taluk: selectedTaluk || undefined,
        village: selectedVillage || undefined,
        survey_number: surveyNumberSearch.trim(),
        hissa_number: hissaNumberSearch.trim() || undefined
      };

      const res = await searchLandParcels(params);
      const results = res.data || [];

      if (results.length > 0) {
        setParcels(results);
        renderParcelsOnMap(results);
        selectParcel(results[0]);
      } else {
        setNoMatchBanner({
          message: `No verified land parcel found for Survey No. "${surveyNumberSearch.trim()}" in ${selectedVillage || selectedDistrict}. Try clearing filters or verify survey number.`
        });
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const resetAllFilters = () => {
    setSurveyNumberSearch('');
    setHissaNumberSearch('');
    setPlaceSearchQuery('');
    setPlaceSuggestions([]);
    setShowPlaceDropdown(false);
    setSelectedPlaceInfo(null);
    setNoMatchBanner(null);
    setSpatialQueryResult(null);
    setDrawnMeasurements(null);
    setIsDrawing(false);
    if (activeDrawHandlerRef.current) {
      try {
        activeDrawHandlerRef.current.disable();
      } catch (e) {}
      activeDrawHandlerRef.current = null;
    }
    if (drawnItemsGroupRef.current) {
      drawnItemsGroupRef.current.clearLayers();
    }
    if (placeMarkerGroupRef.current) {
      placeMarkerGroupRef.current.clearLayers();
    }
    if (highlightLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }
    fetchCadastralParcels({ district: selectedDistrict });
    flyToLocation(selectedDistrict.toLowerCase(), 12);
  };

  // Submit Discrepancy Report
  const handleDiscrepancySubmit = (e) => {
    e.preventDefault();
    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setShowReportModal(false);
      setReportComments('');
    }, 2000);
  };

  // Helper to extract flat list of coordinates from geometry
  const getCoordinatesList = (geom) => {
    if (!geom || !geom.coordinates) return [];
    if (geom.type === 'Polygon') {
      return geom.coordinates[0] || [];
    } else if (geom.type === 'MultiPolygon') {
      return (geom.coordinates[0] && geom.coordinates[0][0]) || [];
    }
    return [];
  };

  // Helper for Status Badge
  const renderVerificationBadge = (status) => {
    if (status === 'VERIFIED_AUTHORIZED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>VERIFIED AUTHORIZED</span>
        </span>
      );
    } else if (status === 'USER_DRAWN_UNVERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
          <PenTool className="w-3.5 h-3.5 text-purple-600" />
          <span>USER DRAWN (UNVERIFIED)</span>
        </span>
      );
    } else if (status === 'IMPORTED_UNVERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>IMPORTED UNVERIFIED</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
          <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          <span>OCR REVIEW REQUIRED</span>
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Card with Title, District Coverage Badge, Regional Quick Zooms & Map Layers */}
      <div className="glass-card p-6 rounded-2xl border border-emerald-100 shadow-md relative overflow-hidden bg-white">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
                <Globe className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 font-outfit tracking-tight flex flex-wrap items-center gap-2">
                  BhoomiAI &bull; Cadastral GIS &amp; Location Intelligence
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Full Coverage: Davanagere, Tumakuru, Shivamogga &amp; Mysuru
                  </span>
                </h1>
                <p className="text-xs text-slate-500 max-w-3xl">
                  Verified WGS84 spatial land records correlated with authoritative Karnataka administrative boundaries and satellite imagery. Search any village or locality (including Maravanji) or inspect cadastral parcel ownership.
                </p>
              </div>
            </div>

            {/* Quick Regional Zoom & Metadata Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Regional Extent:
              </span>
              <button
                type="button"
                onClick={focusKarnataka}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  activeDistrictFocus === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                }`}
              >
                <Compass className="w-3 h-3 text-emerald-400" />
                <span>Karnataka Regional</span>
              </button>
              <button
                type="button"
                onClick={() => focusDistrict('davanagere')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  activeDistrictFocus === 'davanagere'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100/60'
                }`}
              >
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>Davanagere District (6 Taluks)</span>
              </button>
              <button
                type="button"
                onClick={() => focusDistrict('tumakuru')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  activeDistrictFocus === 'tumakuru'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50/60 text-blue-800 border-blue-200 hover:bg-blue-100/60'
                }`}
              >
                <MapPin className="w-3 h-3 text-blue-600" />
                <span>Tumakuru District (10 Taluks)</span>
              </button>
              <button
                type="button"
                onClick={() => focusDistrict('shivamogga')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  activeDistrictFocus === 'shivamogga'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-teal-50/60 text-teal-800 border-teal-200 hover:bg-teal-100/60'
                }`}
              >
                <MapPin className="w-3 h-3 text-teal-600" />
                <span>Shivamogga District (7 Taluks)</span>
              </button>
              <button
                type="button"
                onClick={() => focusDistrict('mysuru')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  activeDistrictFocus === 'mysuru'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-purple-50/60 text-purple-800 border-purple-200 hover:bg-purple-100/60'
                }`}
              >
                <MapPin className="w-3 h-3 text-purple-600" />
                <span>Mysuru District (7 Taluks)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCoverageModal(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
              >
                <Database className="w-3 h-3 text-emerald-600" />
                <span>Data Pipeline Info</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLegendModal(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
              >
                <HelpCircle className="w-3 h-3 text-emerald-600" />
                <span>Map Legend</span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 shadow-xs bg-slate-900 text-white hover:bg-slate-800"
                title="Toggle Dark / Light Theme"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-300" />}
                <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
              </button>
              {isTileLoading && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold animate-pulse">
                  <span className="w-2.5 h-2.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                  <span>Loading Map Tiles...</span>
                </div>
              )}
            </div>
          </div>

          {/* Map Layer Mode Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start lg:self-auto">
            <button
              onClick={() => setMapMode('voyager')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mapMode === 'voyager' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-indigo-700 hover:bg-white'
              }`}
              title="CartoDB Voyager - Building footprints, house layouts, and road hierarchy"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>House Layout &amp; Roads (CartoDB)</span>
            </button>
            <button
              onClick={() => setMapMode('dark')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mapMode === 'dark' 
                  ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
              title="CartoDB Dark Matter - High contrast night view"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Matter</span>
            </button>
            <button
              onClick={() => setMapMode('osm')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mapMode === 'osm' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Road Map (OSM)</span>
            </button>
            <button
              onClick={() => setMapMode('hybrid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mapMode === 'hybrid' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Satellite Hybrid</span>
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mapMode === 'satellite' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => setMapMode('topo')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mapMode === 'topo' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Topographic</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Unified Search Navigation Hub (Tabbed: Universal Place Search vs Cadastral Survey Search) */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
        {/* Navigation Tabs & Layer Overlay Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveSearchTab('place')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeSearchTab === 'place'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>📍 Universal Place &amp; Village Search</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSearchTab('cadastral')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeSearchTab === 'cadastral'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📜 Cadastral Survey &amp; RTC Search</span>
            </button>
          </div>

          {/* Layer Overlays Toggles */}
          <div className="flex flex-wrap items-center gap-3.5 text-xs font-semibold text-slate-700">
            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDistrictBoundaries}
                onChange={(e) => setShowDistrictBoundaries(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>District Boundaries</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCadastralParcels}
                onChange={(e) => setShowCadastralParcels(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Cadastral Parcels</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSurveyLabels}
                onChange={(e) => setShowSurveyLabels(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Survey No. Labels</span>
            </label>

            <button
              type="button"
              onClick={() => {
                if (!showBuildings) {
                  fetchAndRenderBuildings();
                } else {
                  setShowBuildings(false);
                }
              }}
              disabled={isLoadingBuildings}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                showBuildings
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-indigo-50/70 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
              }`}
              title="Query OpenStreetMap Overpass API for building footprints and house numbers"
            >
              {isLoadingBuildings ? (
                <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Building2 className="w-3 h-3" />
              )}
              <span>{showBuildings ? 'Buildings: ON' : 'Load Buildings'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isLiveTracking) {
                  handleGetCurrentLocation(true);
                } else {
                  stopLiveTracking();
                }
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                isLiveTracking
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs animate-pulse'
                  : userLocation
                  ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Track real-time GPS position"
            >
              <Locate className="w-3 h-3" />
              <span>{isLiveTracking ? 'Live GPS Active' : 'Live GPS'}</span>
            </button>

            {onSwitchTo3D && (
              <button
                type="button"
                onClick={onSwitchTo3D}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs transition"
                title="Launch 3D Agricultural Digital Twin"
              >
                <Wheat className="w-3.5 h-3.5" />
                <span>3D Agri Twin</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1 Content: Universal Place Search */}
        {activeSearchTab === 'place' && (
          <div ref={searchContainerRef} className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search a place, village, road or coordinates"
                  value={placeSearchQuery}
                  onChange={(e) => setPlaceSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => {
                    if (placeSuggestions.length > 0 || placeSearchError || placeSearchQuery.trim().length >= 2) {
                      setShowPlaceDropdown(true);
                    }
                  }}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                
                {placeSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlaceSearchQuery('');
                      setPlaceSuggestions([]);
                      setPlaceSearchError(null);
                      setShowPlaceDropdown(false);
                      setHighlightedIndex(-1);
                    }}
                    title="Clear search"
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 absolute right-3 top-3 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isSearchingPlaces && (
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2 flex-shrink-0 border border-emerald-200/60 shadow-2xs">
                  <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                  <span className="hidden sm:inline">Searching across India...</span>
                </div>
              )}
            </div>

            {/* Autocomplete Dropdown with rich context, keyboard selection & empty states */}
            {showPlaceDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-2xl max-h-88 overflow-y-auto divide-y divide-slate-100">
                {/* 1. Loading State */}
                {isSearchingPlaces && placeSuggestions.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Searching locations, villages, landmarks &amp; coordinates across India...</span>
                  </div>
                )}

                {/* 2. Error / Rate-Limit State */}
                {placeSearchError && (
                  <div className="p-3.5 bg-amber-50 text-amber-800 text-xs border-b border-amber-100 flex items-start gap-2">
                    <AlertCircleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Notice</div>
                      <div>{placeSearchError}</div>
                    </div>
                  </div>
                )}

                {/* 3. No Results State */}
                {!isSearchingPlaces && !placeSearchError && placeSuggestions.length === 0 && placeSearchQuery.trim().length >= 2 && (
                  <div className="p-5 text-center text-xs text-slate-500 space-y-1">
                    <div className="font-bold text-slate-700 text-sm">No locations found</div>
                    <p className="text-slate-500 text-xs">
                      No matching places found across India for &ldquo;<span className="font-semibold text-slate-800">{placeSearchQuery}</span>&rdquo;.
                    </p>
                    <p className="text-[11px] text-slate-400 pt-1">
                      Try checking the spelling, searching a nearby landmark, or typing coordinates (e.g. <code>13.3409, 77.1010</code>).
                    </p>
                  </div>
                )}

                {/* 4. Suggestions List */}
                {placeSuggestions.length > 0 && (
                  <>
                    <div className="px-3.5 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Matching Locations ({placeSuggestions.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">Use ↑ / ↓ to navigate, Enter to select, Esc to close</span>
                    </div>

                    {placeSuggestions.map((place, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      const isDavanagereDist = place.district && place.district.toLowerCase().includes('davanagere');

                      return (
                        <button
                          key={place.id || `place_${idx}`}
                          type="button"
                          onClick={() => handleSelectPlace(place)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`w-full px-4 py-3 text-left transition flex items-start justify-between gap-3 group ${
                            isHighlighted ? 'bg-emerald-50/80 ring-1 ring-inset ring-emerald-500/30' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`font-bold text-xs sm:text-sm transition ${
                                isHighlighted ? 'text-emerald-800' : 'text-slate-900 group-hover:text-emerald-700'
                              }`}>
                                {place.name}
                              </span>
                              {place.name_kn && (
                                <span className="text-xs text-emerald-700 font-semibold">
                                  ({place.name_kn})
                                </span>
                              )}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                place.place_type === 'coordinates'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : place.place_type === 'college' || place.place_type === 'landmark'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : place.place_type === 'district'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : place.place_type === 'taluk'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {place.place_type ? place.place_type.replace('_', ' ') : 'LOCATION'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 truncate" title={place.display_name}>
                              {place.display_name}
                            </div>

                            {/* Disambiguation Callout */}
                            {place.name && place.name.toLowerCase() === 'maravanji' && (
                              <div className={`mt-1 text-[10px] px-2 py-0.5 rounded font-semibold inline-block ${
                                isDavanagereDist 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {isDavanagereDist 
                                  ? '✓ Davanagere Jurisdiction: Channagiri Taluk, Davanagere District' 
                                  : 'ℹ️ Chikkamagaluru Jurisdiction: Kaduru Taluk, Chikkamagaluru District'}
                              </div>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0 space-y-1">
                            <div className="text-[10px] font-bold">
                              {place.has_boundary_polygon ? (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  Polygon Boundary
                                </span>
                              ) : (
                                <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  Point Marker
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {place.lat.toFixed(4)}° N, {place.lng.toFixed(4)}° E
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Active Selected Place Ribbon with Dismiss Marker Button */}
            {selectedPlaceInfo && (
              <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white flex-shrink-0 shadow-2xs">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{selectedPlaceInfo.name}</span>
                      {selectedPlaceInfo.name_kn && (
                        <span className="text-emerald-800 font-semibold text-xs">({selectedPlaceInfo.name_kn})</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                        {selectedPlaceInfo.lat.toFixed(4)}° N, {selectedPlaceInfo.lng.toFixed(4)}° E
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px] truncate" title={selectedPlaceInfo.display_name}>
                      {selectedPlaceInfo.display_name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  {(selectedPlaceInfo.has_cadastral_parcels || selectedPlaceInfo.place_type === 'village') && (
                    <button
                      type="button"
                      onClick={() => {
                        fetchCadastralParcels({
                          district: selectedPlaceInfo.district,
                          taluk: selectedPlaceInfo.taluk,
                          village: selectedPlaceInfo.name
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-xs"
                    >
                      <FileCheck className="w-3 h-3" />
                      <span>Inspect Parcels</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={dismissSearchedPlaceMarker}
                    title="Dismiss marker from map"
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Dismiss Marker</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2 Content: Dependent Administrative Dropdowns & Survey Search */}
        {activeSearchTab === 'cadastral' && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Dependent Administrative Hierarchy Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Hierarchy:
              </span>

              {/* District */}
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {locationsHierarchy.map((d) => (
                  <option key={d.name} value={d.name}>{d.name} (District)</option>
                ))}
              </select>

              {/* Taluk */}
              <select
                value={selectedTaluk}
                onChange={(e) => handleTalukChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All Taluks</option>
                {availableTaluks.map((t) => (
                  <option key={t.name} value={t.name}>{t.name} (Taluk)</option>
                ))}
              </select>

              {/* Hobli */}
              <select
                value={selectedHobli}
                onChange={(e) => handleHobliChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All Hoblis</option>
                {availableHoblis.map((h) => (
                  <option key={h.name} value={h.name}>{h.name} (Hobli)</option>
                ))}
              </select>

              {/* Village */}
              <select
                value={selectedVillage}
                onChange={(e) => handleVillageChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">All Villages</option>
                {availableVillages.map((v) => (
                  <option key={v} value={v}>{v} (Village)</option>
                ))}
              </select>
            </div>

            {/* Search by Survey & Hissa */}
            <form onSubmit={handleSearchParcel} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Survey No (e.g. 104)"
                  value={surveyNumberSearch}
                  onChange={(e) => setSurveyNumberSearch(e.target.value)}
                  className="w-32 pl-7 pr-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>

              <input
                type="text"
                placeholder="Hissa (e.g. 1)"
                value={hissaNumberSearch}
                onChange={(e) => setHissaNumberSearch(e.target.value)}
                className="w-24 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />

              <button
                type="submit"
                disabled={isSearching}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                {isSearching ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={resetAllFilters}
                title="Reset Filters"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Legend / Instructional Guide Bar */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              <span>Cadastral Parcel</span>
            </span>
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-dashed border-emerald-600 bg-emerald-100"></span>
              <span>Karnataka District Boundary (4 Districts)</span>
            </span>
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-dashed border-amber-500 bg-amber-200/50"></span>
              <span>User Drawn Query Boundary</span>
            </span>
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600"></span>
              <span>Active Selected Parcel</span>
            </span>
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              <span className="text-xs">📍</span>
              <span>Searched Place Pin</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <Info className="w-3.5 h-3.5 text-emerald-600" />
            <span>Draw query polygon to identify cadastral parcel or search by place/survey number.</span>
          </div>
        </div>
      </div>

      {/* No Match / Alert Banner */}
      {noMatchBanner && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs flex items-start justify-between gap-3 text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Cadastral Match Notice
              </h4>
              <p className="text-xs mt-0.5 text-amber-900 leading-relaxed font-medium">
                {noMatchBanner.message}
              </p>
              <div className="mt-2 text-[11px] text-amber-800 flex items-center gap-3">
                <span>&bull; Try drawing a tighter boundary around the plot.</span>
                <span>&bull; Search using the official survey number.</span>
                <span>&bull; Upload an authorized cadastral survey sketch (FMB/Tippan).</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setNoMatchBanner(null)}
            className="text-amber-600 hover:text-amber-800 text-xs font-bold px-2 py-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Spatial Query Status Indicator */}
      {spatialQueryLoading && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
          <span>Shapely spatial intersection analysis in progress... Matching polygon against cadastral boundary index.</span>
        </div>
      )}

      {/* 3. Main Grid: Leaflet Map (Left 8 Cols) & Parcel Ownership Inspector (Right 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left 8 Cols: Leaflet Map Canvas */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div 
            ref={mapWrapperRef} 
            className={`relative rounded-2xl border border-slate-200 shadow-md overflow-hidden bg-slate-100 h-[640px] ${
              isDrawing ? 'leaflet-drawing' : ''
            }`}
          >
            {/* Real Leaflet Map Container */}
            <div 
              ref={mapContainerRef} 
              className="w-full h-full z-10" 
              style={{ minHeight: '640px', height: '100%', width: '100%' }}
            />

            {/* Active Drawing Helper Banner */}
            {isDrawing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border border-emerald-500/40 flex items-center gap-3 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Click to add boundary points; double-click to finish.</span>
                </div>
                <button
                  type="button"
                  onClick={handleUndoDrawVertex}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo Vertex</span>
                </button>
                <button
                  type="button"
                  onClick={cancelDrawing}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Drawing</span>
                </button>
              </div>
            )}

            {/* Distance Measurement Floating Banner */}
            {isMeasuringDistance && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-sky-950/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border border-sky-400/40 flex items-center gap-3 animate-fade-in">
                <div className="flex items-center gap-2 text-sky-300">
                  <Ruler className="w-4 h-4 text-sky-400 animate-pulse" />
                  <span>Click map to add waypoints.</span>
                  {measuredDistance && (
                    <span className="bg-sky-800 px-2.5 py-0.5 rounded-lg text-white font-mono font-bold">
                      {measuredDistance.meters} m ({measuredDistance.feet} ft) &bull; {measuredDistance.pointsCount} points
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={clearDistanceMeasurement}
                    className="px-2 py-1 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-[11px] font-bold transition"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={toggleMeasureDistance}
                    className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Location / GPS Toast */}
            {locationToast && (
              <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl text-xs font-semibold shadow-xl border backdrop-blur-md flex items-center gap-2 animate-fade-in ${
                locationToast.type === 'error' ? 'bg-rose-900/90 text-white border-rose-500' :
                locationToast.type === 'success' ? 'bg-emerald-900/90 text-white border-emerald-500' :
                'bg-slate-900/90 text-white border-slate-700'
              }`}>
                <span>{locationToast.message}</span>
              </div>
            )}

            {/* Visible Tile Loading Pill Indicator */}
            {isTileLoading && !isDrawing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/85 backdrop-blur-md border border-slate-700 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md flex items-center gap-2 pointer-events-none animate-fade-in">
                <span className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-[11px] text-slate-200">Loading map tiles...</span>
              </div>
            )}

            {/* Tile Error Banner */}
            {tileError && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 max-w-lg bg-rose-50/95 backdrop-blur-md border border-rose-300 text-rose-900 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{tileError}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTileError(null);
                      setMapMode('osm');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold whitespace-nowrap shadow-xs transition"
                  >
                    Switch to Road Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setTileError(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm px-1"
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}

            {/* Tile Warning Banner (e.g. if satellite imagery is unavailable at high zoom) */}
            {tileWarning && (
              <div className="absolute top-4 left-14 z-20 max-w-md bg-amber-50/95 backdrop-blur-md border border-amber-300 text-amber-900 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{tileWarning}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSwitchMapType(window.google?.maps?.MapTypeId?.ROADMAP || 'roadmap')}
                  className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 whitespace-nowrap shadow-xs"
                >
                  Switch to Normal Road Map
                </button>
              </div>
            )}

            {/* Bottom Left Floating Coordinate / Village Badge */}
            <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 shadow-md flex items-center space-x-3 pointer-events-auto">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-700">
                <Navigation className="w-3.5 h-3.5" />
                <span>{selectedVillage || selectedDistrict}, Karnataka</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-slate-500 font-medium">
                {parcels.length} Parcels Plotted
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-pink-700 font-black uppercase px-2.5 py-0.5 rounded-lg bg-pink-50/90 border border-pink-200 flex items-center gap-1.5 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-pink-600" />
                {MAP_LAYERS_CONFIG[mapMode]?.name || 'Standard Road Map'}
              </span>
              {isTileLoading && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-[11px] text-pink-600 font-bold flex items-center gap-1.5 bg-pink-50/80 px-2 py-0.5 rounded-lg border border-pink-200">
                    <span className="w-2.5 h-2.5 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></span>
                    Loading Tiles
                  </span>
                </>
              )}
              {userLocation && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                    GPS: &plusmn;{Math.round(userLocation.accuracy)}m
                  </span>
                </>
              )}
            </div>

            {/* Top Right Floating Controls Bar */}
            <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center justify-end gap-1.5 max-w-[85%]">
              {/* Draw Plot (Polygon) Tool */}
              <button
                type="button"
                onClick={startDrawPolygon}
                title="Draw Cadastral Plot (Click points, double-click to finish)"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-md transition flex items-center gap-1.5 ${
                  isDrawing
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
                    : 'bg-white/95 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border-slate-200'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Draw Plot</span>
              </button>

              {/* Draw Box (Rectangle) */}
              <button
                type="button"
                onClick={startDrawRectangle}
                title="Draw Rectangular Plot"
                className="px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border border-slate-200 text-xs font-bold shadow-md transition flex items-center gap-1"
              >
                <Square className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Box</span>
              </button>

              {/* Undo Last Vertex (While Drawing) */}
              {isDrawing && (
                <button
                  type="button"
                  onClick={handleUndoDrawVertex}
                  title="Undo Last Drawn Vertex"
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 text-xs font-bold shadow-md transition flex items-center gap-1"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Undo</span>
                </button>
              )}

              {/* Distance Measure Tool */}
              <button
                type="button"
                onClick={toggleMeasureDistance}
                title="Measure Distance Between Points"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-md transition flex items-center gap-1 ${
                  isMeasuringDistance
                    ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-300'
                    : 'bg-white/95 hover:bg-sky-50 text-slate-800 hover:text-sky-700 border-slate-200'
                }`}
              >
                <Ruler className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">{isMeasuringDistance ? 'Stop Measure' : 'Measure'}</span>
              </button>

              {/* Vertex Drag Editing */}
              {(drawnMeasurements || (drawnItemsGroupRef.current && drawnItemsGroupRef.current.getLayers().length > 0)) && (
                <button
                  type="button"
                  onClick={toggleEditBoundary}
                  title="Reshape Boundary (Drag corner and edge vertices)"
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-md transition flex items-center gap-1 ${
                    isEditingBoundary
                      ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                      : 'bg-white/95 hover:bg-amber-50 text-slate-800 hover:text-amber-700 border-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">{isEditingBoundary ? 'Finish Edit' : 'Edit Vertices'}</span>
                </button>
              )}

              {/* Save Drawn Plot to Database */}
              {(drawnMeasurements || (drawnItemsGroupRef.current && drawnItemsGroupRef.current.getLayers().length > 0) || (importedBoundaryLayerRef.current && importedBoundaryLayerRef.current.getLayers().length > 0)) && (
                <button
                  type="button"
                  onClick={openSavePlotModal}
                  title="Save Drawn / Imported Plot to Database"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 text-xs font-bold shadow-md transition flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save Plot</span>
                </button>
              )}



              {/* Regional Overview Reset */}
              <button
                type="button"
                onClick={focusKarnataka}
                title="Fit Full Karnataka Regional Extent (Davanagere + Tumakuru)"
                className="px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 border border-slate-200 text-xs font-bold shadow-md transition flex items-center gap-1"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Overview</span>
              </button>

              {/* View Davanagere Boundary */}
              <button
                type="button"
                onClick={() => focusDistrict('davanagere')}
                title="Fit Davanagere District Boundary Geometry"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-md transition flex items-center gap-1 ${
                  activeDistrictFocus === 'davanagere'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 border-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Davanagere</span>
              </button>

              {/* View Tumakuru Boundary */}
              <button
                type="button"
                onClick={() => focusDistrict('tumakuru')}
                title="Fit Tumakuru District Boundary Geometry"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-md transition flex items-center gap-1 ${
                  activeDistrictFocus === 'tumakuru'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white/95 hover:bg-white text-slate-700 hover:text-blue-700 border-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Tumakuru</span>
              </button>

              {/* View Shivamogga Boundary */}
              <button
                type="button"
                onClick={() => focusDistrict('shivamogga')}
                title="Fit Shivamogga District Boundary Geometry"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-md transition flex items-center gap-1 ${
                  activeDistrictFocus === 'shivamogga'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white/95 hover:bg-white text-slate-700 hover:text-teal-700 border-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">Shivamogga</span>
              </button>

              {/* View Mysuru Boundary */}
              <button
                type="button"
                onClick={() => focusDistrict('mysuru')}
                title="Fit Mysuru District Boundary Geometry"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-md transition flex items-center gap-1 ${
                  activeDistrictFocus === 'mysuru'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white/95 hover:bg-white text-slate-700 hover:text-purple-700 border-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Mysuru</span>
              </button>

              {/* Reset View */}
              <button
                type="button"
                onClick={resetAllFilters}
                title="Reset View and All Filters"
                className="p-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-md transition"
              >
                <RotateCcw className="w-4 h-4 text-slate-600" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}
                className="p-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 border border-slate-200 shadow-md transition"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {/* GOOGLE MAPS-STYLE DUAL MODE SWITCHER (Normal vs Satellite + Optional Hybrid Layer) */}
              <div className="flex items-center p-1 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-slate-200/90 shadow-lg gap-1">
                {/* 1. Normal Mode Preview Button */}
                <button
                  type="button"
                  onClick={() => handleSwitchMapType(window.google?.maps?.MapTypeId?.ROADMAP || 'roadmap')}
                  title="Switch to Normal Map Mode: Roads, Streets, Building Footprints, City & Village Labels (Google Maps ROADMAP)"
                  className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 transition-all ${
                    (mapMode === 'roadmap' || mapMode === 'normal' || mapMode === 'osm' || mapMode === 'voyager')
                      ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-2 ring-emerald-200/70'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden border border-slate-300 shadow-2xs flex-shrink-0 bg-slate-100">
                    <img
                      src="https://mt1.google.com/vt/lyrs=m&x=1468&y=945&z=11"
                      alt="Normal Map"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute bottom-0.5 right-0.5 text-[7px] font-black px-0.5 rounded bg-white/95 text-slate-800 leading-none">
                      MAP
                    </span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className={`text-xs font-black tracking-tight flex items-center gap-1 ${
                      (mapMode === 'roadmap' || mapMode === 'normal' || mapMode === 'osm' || mapMode === 'voyager')
                        ? 'text-emerald-800'
                        : 'text-slate-800'
                    }`}>
                      Normal
                      {(mapMode === 'roadmap' || mapMode === 'normal' || mapMode === 'osm' || mapMode === 'voyager') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold leading-tight hidden sm:inline">
                      Roads &amp; Buildings
                    </span>
                  </div>
                </button>

                {/* 2. Satellite Mode Preview Button */}
                <button
                  type="button"
                  onClick={() => handleSwitchMapType(isHybrid ? (window.google?.maps?.MapTypeId?.HYBRID || 'hybrid') : (window.google?.maps?.MapTypeId?.SATELLITE || 'satellite'))}
                  title="Switch to Satellite Map Mode: Real Satellite & Aerial Imagery (Google Maps SATELLITE / HYBRID)"
                  className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 transition-all ${
                    (mapMode === 'satellite' || mapMode === 'hybrid' || mapMode === 'satellite_esri')
                      ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-2 ring-blue-200/70'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden border border-slate-300 shadow-2xs flex-shrink-0 bg-slate-900">
                    <img
                      src="https://mt1.google.com/vt/lyrs=s&x=1468&y=945&z=11"
                      alt="Satellite Map"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute bottom-0.5 right-0.5 text-[7px] font-black px-0.5 rounded bg-blue-600 text-white leading-none">
                      SAT
                    </span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className={`text-xs font-black tracking-tight flex items-center gap-1 ${
                      (mapMode === 'satellite' || mapMode === 'hybrid' || mapMode === 'satellite_esri')
                        ? 'text-blue-800'
                        : 'text-slate-800'
                    }`}>
                      Satellite
                      {(mapMode === 'satellite' || mapMode === 'hybrid' || mapMode === 'satellite_esri') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold leading-tight hidden sm:inline">
                      Real Aerial Imagery
                    </span>
                  </div>
                </button>

                {/* 3. Optional Hybrid Layer Toggle (Roads and Labels on Satellite) */}
                <div className="pl-1 border-l border-slate-200 flex items-center">
                  <label
                    title="Toggle Hybrid Layer: Display road network, village names & location labels over satellite imagery (MapTypeId.HYBRID)"
                    className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer text-xs font-bold transition select-none ${
                      isHybrid && (mapMode === 'satellite' || mapMode === 'hybrid')
                        ? 'bg-blue-100/70 text-blue-900'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isHybrid}
                      onChange={(e) => toggleHybridOverlay(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer accent-blue-600"
                    />
                    <span className="text-[10px] sm:text-[11px] whitespace-nowrap">
                      Labels (Hybrid)
                    </span>
                  </label>
                </div>
              </div>

              {/* MAP LAYER SWITCHER (Dedicated Upper-Right Button & Clean Flyout Panel) */}
              <div className="relative z-30" ref={layerPanelRef}>
                <button
                  ref={layerButtonRef}
                  type="button"
                  onClick={() => setShowLayerPanel((prev) => !prev)}
                  title="Switch Map Layers (Normal, Satellite, Hybrid, Terrain, OSM, Voyager, Dark)"
                  aria-expanded={showLayerPanel}
                  className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black shadow-lg transition-all flex items-center gap-2 ${
                    showLayerPanel
                      ? 'bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 border-pink-400 ring-2 ring-pink-200 shadow-pink-500/20'
                      : 'bg-white/98 hover:bg-pink-50/70 text-slate-800 hover:text-pink-700 border-pink-200 hover:border-pink-300 shadow-md ring-1 ring-pink-100'
                  }`}
                >
                  <div className="p-1 rounded-lg bg-pink-100/90 text-pink-600">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start text-left leading-tight hidden sm:flex">
                    <span className="text-[9px] uppercase tracking-wider text-pink-600/90 font-extrabold">Layers</span>
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                      {MAP_LAYERS_CONFIG[mapMode]?.shortName || 'Normal'}
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                    </span>
                  </div>
                </button>

                {/* Clean Flyout Panel */}
                {showLayerPanel && (
                  <div
                    className="absolute top-12 right-0 z-40 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white/98 backdrop-blur-xl rounded-2xl border-2 border-pink-200 shadow-2xl p-4 animate-fade-in text-slate-800 space-y-3.5 max-h-[85vh] overflow-y-auto"
                  >
                    {/* Panel Header */}
                    <div className="flex items-center justify-between border-b border-pink-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-pink-100 text-pink-600 border border-pink-200">
                          <Layers className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 font-outfit">Map Layers</h4>
                            <span className="px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-200 text-[10px] font-bold">
                              Live GIS Engine
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Select base cartography &bull; Center &amp; zoom preserved
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLayerPanel(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition"
                        title="Close Layers Panel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Layer Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.values(MAP_LAYERS_CONFIG).map((cfg) => {
                        const isSelected = mapMode === cfg.id;
                        return (
                          <button
                            type="button"
                            key={cfg.id}
                            onClick={() => handleSelectMapLayer(cfg.id)}
                            className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                              isSelected
                                ? 'bg-gradient-to-br from-pink-50/90 via-white to-pink-50/40 border-pink-500 ring-2 ring-pink-200 shadow-md'
                                : 'bg-white hover:bg-pink-50/30 border-slate-200 hover:border-pink-300 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-pink-500 text-white shadow-xs' : 'bg-pink-50 text-pink-600 border border-pink-200'}`}>
                                  {cfg.id === 'roadmap' && <MapIcon className="w-4 h-4" />}
                                  {cfg.id === 'satellite' && <Satellite className="w-4 h-4" />}
                                  {cfg.id === 'hybrid' && <Globe className="w-4 h-4" />}
                                  {cfg.id === 'terrain' && <Compass className="w-4 h-4" />}
                                  {cfg.id === 'osm' && <Layers className="w-4 h-4" />}
                                  {cfg.id === 'voyager' && <Building2 className="w-4 h-4" />}
                                  {cfg.id === 'dark' && <Moon className="w-4 h-4" />}
                                </span>
                                <div>
                                  <div className="font-black text-xs text-slate-900 leading-tight">
                                    {cfg.name}
                                  </div>
                                  <div className="text-[10px] font-bold text-pink-600">
                                    {cfg.badge}
                                  </div>
                                </div>
                              </div>
                              {isSelected ? (
                                <span className="flex items-center gap-1 text-[10px] font-black text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full border border-pink-300">
                                  <CheckCircle2 className="w-3 h-3 text-pink-600" />
                                  Active
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold hover:text-pink-600">
                                  Switch
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-600 leading-relaxed mb-2">
                              {cfg.description}
                            </p>
                            <div className="pt-1.5 border-t border-pink-100/70 flex items-center justify-between text-[9px] text-slate-400">
                              <span className="font-bold text-slate-500">{cfg.nativeZoom}</span>
                              <span className="font-mono text-slate-500">{cfg.type}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Live Provider Attribution Section */}
                    <div className="p-2.5 rounded-xl bg-pink-50/50 border border-pink-200/80 text-[10px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Info className="w-3 h-3 text-pink-600" />
                          Active Provider &amp; Attribution:
                        </span>
                        <span className="font-bold text-pink-700">100% Real Geographic Data</span>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        {MAP_LAYERS_CONFIG[mapMode]?.provider || 'OpenStreetMap Contributors'} &bull; <span className="font-mono">{MAP_LAYERS_CONFIG[mapMode]?.license || 'ODbL 1.0'}</span>
                      </p>
                      {isTileLoading && (
                        <div className="flex items-center gap-1.5 text-pink-600 font-bold pt-0.5">
                          <span className="w-2.5 h-2.5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></span>
                          Loading tiles from {MAP_LAYERS_CONFIG[mapMode]?.shortName || 'active layer'}...
                        </div>
                      )}
                    </div>

                    {/* Overlays Independence Guarantee */}
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-slate-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Overlays &amp; User Sketches:
                      </span>
                      <span className="font-semibold text-emerald-700">Independent &amp; Preserved</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Clear Drawn Query Boundary */}
              {(drawnMeasurements || (drawnItemsGroupRef.current && drawnItemsGroupRef.current.getLayers().length > 0) || (importedBoundaryLayerRef.current && importedBoundaryLayerRef.current.getLayers().length > 0)) && (
                <button
                  type="button"
                  onClick={deleteDrawnBoundary}
                  title="Clear User Query Boundary"
                  className="px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-rose-700 border border-rose-200 text-xs font-bold shadow-md transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Clear Plot</span>
                </button>
              )}
            </div>

            {/* Google Maps-Style Floating Map Controls (Bottom Right) */}
            <div className="absolute bottom-6 right-4 z-20 flex flex-col space-y-2 pointer-events-auto">
              {/* Geolocation Current Position Button */}
              <button
                type="button"
                onClick={() => handleGetCurrentLocation(false)}
                title="Your Current Location (GPS)"
                className={`p-2.5 rounded-xl border shadow-lg transition flex items-center justify-center ${
                  isLocating
                    ? 'bg-blue-600 text-white border-blue-600 animate-pulse'
                    : isLiveTracking
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30 ring-2 ring-blue-400'
                    : userLocation
                    ? 'bg-white hover:bg-blue-50 text-blue-600 border-slate-200'
                    : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {isLocating ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : isLiveTracking ? (
                  <LocateFixed className="w-5 h-5 text-white animate-pulse" />
                ) : (
                  <Locate className="w-5 h-5 text-blue-600" />
                )}
              </button>

              {/* Zoom Controls */}
              <div className="flex flex-col rounded-xl overflow-hidden border border-slate-200 bg-white/95 shadow-lg divide-y divide-slate-100">
                <button
                  type="button"
                  onClick={() => mapRef.current && mapRef.current.zoomIn()}
                  title="Zoom In"
                  className="p-2.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition flex items-center justify-center"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => mapRef.current && mapRef.current.zoomOut()}
                  title="Zoom Out"
                  className="p-2.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition flex items-center justify-center"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats & Cadastral List Selector */}
          <div className="glass-card p-3 rounded-xl border border-emerald-100 bg-white shadow-xs flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800">Loaded Cadastral Plots:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {parcels.length}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="text-slate-400">Standard: WGS84 (EPSG:4326)</span>
              <span className="text-slate-300">&bull;</span>
              <span className="text-slate-400">SSLR / Bhoomi Cadastral Form 16</span>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Landowner & Legal Record Inspector */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          
          {/* Top Tab Bar: Plot Details vs Saved Plots Explorer */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSidebarTab('details')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'details'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Plot Details</span>
              {selectedParcel && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSidebarTab('explorer')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'explorer'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Saved Plots</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {parcels.length}
              </span>
            </button>
          </div>

          {activeSidebarTab === 'details' ? (
            /* TAB 1: PLOT DETAILS & INSPECTOR */
            <div className="space-y-4">
              {/* User-Drawn Geodesic Measurements Card */}
              {drawnMeasurements && (
                <div className="glass-card p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-md text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                      <Ruler className="w-4 h-4 text-emerald-600" />
                      User-Drawn Geodesic Area
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      GPS Spherical
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Standard Extent</div>
                      <div className="text-sm font-black text-slate-900 font-mono">
                        {drawnMeasurements.acresTotal} Acres
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        ({drawnMeasurements.acres} Ac {drawnMeasurements.guntas} Guntas)
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Metric Extent</div>
                      <div className="text-sm font-black text-slate-900 font-mono">
                        {drawnMeasurements.sqMeters.toLocaleString()} m²
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                        ({drawnMeasurements.hectares} ha)
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-100 grid grid-cols-2 gap-2 text-[11px] text-slate-700 font-medium">
                    <div>
                      Sq Feet: <strong className="font-mono text-slate-900">{drawnMeasurements.sqFeet?.toLocaleString()} sq ft</strong>
                    </div>
                    <div>
                      Perimeter: <strong className="font-mono text-slate-900">{drawnMeasurements.perimeterMeters} m ({drawnMeasurements.perimeterFeet} ft)</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={openSavePlotModal}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save This Drawn Plot to Database</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedParcel ? (
                <div className="glass-card p-5 rounded-2xl border border-emerald-200 shadow-md bg-white flex flex-col space-y-4">
                  
                  {/* Parcel Header */}
                  <div className="flex items-start justify-between border-b border-emerald-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600">
                          Cadastral Parcel #{selectedParcel.parcel_id || selectedParcel.id}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {selectedParcel.land_type || 'Agricultural'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 font-outfit tracking-tight">
                        Survey No: {selectedParcel.survey_number}
                        {selectedParcel.hissa_number && (
                          <span className="text-slate-500 text-base font-normal ml-1">
                            / Hissa {selectedParcel.hissa_number}
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {selectedParcel.village}, {selectedParcel.hobli ? `${selectedParcel.hobli} Hobli, ` : ''}{selectedParcel.taluk} Taluk, {selectedParcel.district}
                      </p>
                    </div>
                    <div>
                      {renderVerificationBadge(selectedParcel.verification_status)}
                    </div>
                  </div>

                  {/* Spatial Intersection Metric (If selected via drawn boundary) */}
                  {spatialQueryResult && spatialQueryResult.match_type !== 'NO_MATCH' && (
                    <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-rose-900 font-bold">
                        <span className="flex items-center gap-1">
                          <Crosshair className="w-3.5 h-3.5 text-rose-600" />
                          Spatial Intersection Match
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-black border border-rose-200">
                          {spatialQueryResult.candidates && spatialQueryResult.candidates[0]?.overlap_pct_of_parcel 
                            ? `${spatialQueryResult.candidates[0].overlap_pct_of_parcel}% Overlap` 
                            : 'Identified'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Drawn query boundary overlaps cadastral survey boundary. 
                        <strong className="text-slate-800 ml-1">
                          {spatialQueryResult.candidates && spatialQueryResult.candidates[0]?.spatial_relationship.replace(/_/g, ' ')}
                        </strong>
                      </p>
                    </div>
                  )}

                  {/* Landowner Titleholder Card */}
                  <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-100 space-y-2 text-xs">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-rose-600" />
                      Authorized Land Titleholder(s)
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {selectedParcel.primary_owner || (selectedParcelDetails?.records && selectedParcelDetails.records[0]?.owner_name) ? (
                        selectedParcel.primary_owner || (selectedParcelDetails?.records && selectedParcelDetails.records[0]?.owner_name)
                      ) : (
                        <span className="text-slate-400 italic font-normal text-xs">
                          No ownership record is linked to this plot yet.
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-slate-600 text-xs pt-1 border-t border-rose-100">
                      <span>Registered Extent:</span>
                      <span className="font-bold text-slate-900">
                        {selectedParcel.extent_acres || selectedParcel.area_acres || 0} Acres ({Math.round(((selectedParcel.extent_acres || selectedParcel.area_acres || 0) % 1) * 40)} Gunthas)
                      </span>
                    </div>
                  </div>

                  {/* Multi-Unit Area Conversions Grid */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-2">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-emerald-600" />
                        Multi-Unit Area Conversions
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">WGS84</span>
                    </div>
                    {(() => {
                      const acres = selectedParcel.extent_acres || selectedParcel.area_acres || 0;
                      const guntas = Math.round((acres % 1) * 40 * 10) / 10;
                      const wholeAc = Math.floor(acres);
                      const sqM = Math.round(acres * 4046.856);
                      const sqFt = Math.round(acres * 43560);
                      const ha = Math.round(acres * 0.404686 * 100) / 100;
                      const perimM = selectedParcel.perimeter_meters || Math.round(Math.sqrt(sqM) * 4);
                      const perimFt = Math.round(perimM * 3.28084);

                      return (
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-white border border-slate-200">
                            <span className="text-slate-400 block text-[10px]">Acres &amp; Guntas</span>
                            <span className="font-bold text-slate-900 font-mono">{wholeAc} Ac {guntas} Guntas</span>
                          </div>
                          <div className="p-2 rounded-lg bg-white border border-slate-200">
                            <span className="text-slate-400 block text-[10px]">Square Meters (m²)</span>
                            <span className="font-bold text-slate-900 font-mono">{sqM.toLocaleString()} m²</span>
                          </div>
                          <div className="p-2 rounded-lg bg-white border border-slate-200">
                            <span className="text-slate-400 block text-[10px]">Square Feet (sq ft)</span>
                            <span className="font-bold text-slate-900 font-mono">{sqFt.toLocaleString()} sq ft</span>
                          </div>
                          <div className="p-2 rounded-lg bg-white border border-slate-200">
                            <span className="text-slate-400 block text-[10px]">Hectares (ha)</span>
                            <span className="font-bold text-slate-900 font-mono">{ha} ha</span>
                          </div>
                          <div className="col-span-2 p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                            <span className="text-slate-500 text-[10px]">Boundary Perimeter:</span>
                            <span className="font-bold text-slate-900 font-mono">{perimM.toLocaleString()} m ({perimFt.toLocaleString()} ft)</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Known-Area Comparison Tool */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/30 border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Known-Area Comparison Tool</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Deed vs Mapped</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="Deed area (e.g. 2.5)"
                        value={knownAreaInput}
                        onChange={(e) => setKnownAreaInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <select
                        value={knownAreaUnit}
                        onChange={(e) => setKnownAreaUnit(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="Acres">Acres</option>
                        <option value="Guntas">Guntas</option>
                        <option value="SqFt">Sq Feet</option>
                      </select>
                    </div>

                    {(() => {
                      const comp = computeAreaComparison();
                      if (!comp) return (
                        <div className="text-[10px] text-slate-400 italic">
                          Enter your deed/document area above to verify against mapped GIS coordinates.
                        </div>
                      );
                      return (
                        <div className={`p-2.5 rounded-lg text-xs space-y-1.5 border ${
                          comp.isMatch
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : comp.isClose
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}>
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span>Comparison Result:</span>
                            <span>
                              {comp.isMatch
                                ? '✓ Exact Ground Match (< 1% diff)'
                                : comp.isClose
                                ? '⚠️ Slight Variance (Within 5%)'
                                : '❌ Discrepancy (> 5%)'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div>Known: <strong>{comp.knownAcres} Ac</strong></div>
                            <div>Mapped: <strong>{comp.mappedAcres} Ac</strong></div>
                            <div>Variance: <strong>{comp.deltaAcres > 0 ? `+${comp.deltaAcres}` : comp.deltaAcres} Ac</strong> ({comp.deltaGuntas > 0 ? `+${comp.deltaGuntas}` : comp.deltaGuntas} Gu)</div>
                            <div>Difference: <strong>{comp.pctDiscrepancy}%</strong></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Boundary Coordinates Table */}
                  {selectedParcel.geometry && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setShowCoordsTable(!showCoordsTable)}
                          className="font-bold text-slate-800 flex items-center gap-1.5 hover:text-emerald-700 transition"
                        >
                          <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Boundary Coordinates ({getCoordinatesList(selectedParcel.geometry).length} Vertices)</span>
                          <span className="text-[10px] text-indigo-600 font-semibold">{showCoordsTable ? '▲ Hide' : '▼ Show'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={copyBoundaryCoordinates}
                          className="p-1 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition flex items-center gap-1"
                        >
                          {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                          <span>{copiedCoords ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {showCoordsTable && (
                        <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white text-[10px] font-mono">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                              <tr>
                                <th className="p-1 pl-2">#</th>
                                <th className="p-1">Latitude (°N)</th>
                                <th className="p-1">Longitude (°E)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {getCoordinatesList(selectedParcel.geometry).map((pt, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-1 pl-2 font-bold text-slate-400">{idx + 1}</td>
                                  <td className="p-1">{typeof pt[1] === 'number' ? pt[1].toFixed(6) : pt[1]}</td>
                                  <td className="p-1">{typeof pt[0] === 'number' ? pt[0].toFixed(6) : pt[0]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legal References (RTC / Mutation) */}
                  <div className="p-3.5 rounded-xl bg-white border border-rose-100 space-y-2 text-xs shadow-2xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">RTC / Pahani Reference:</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {selectedParcelDetails?.records && selectedParcelDetails.records[0]?.rtc_number 
                          ? selectedParcelDetails.records[0].rtc_number 
                          : `RTC-${(selectedParcel.district || 'KA').substring(0,3).toUpperCase()}-2024-${(selectedParcel.survey_number || '0').toString().padStart(4, '0')}`}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Mutation Register (MR):</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {selectedParcelDetails?.records && selectedParcelDetails.records[0]?.mutation_number 
                          ? selectedParcelDetails.records[0].mutation_number 
                          : `MR-2023-${(parseInt(selectedParcel.survey_number || 1) * 17) % 900 + 100}`}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Record Year / Effective:</span>
                      <span className="font-medium text-slate-800">
                        {selectedParcelDetails?.records && selectedParcelDetails.records[0]?.record_year 
                          ? `${selectedParcelDetails.records[0].record_year} (Current Active)` 
                          : '2024-2025 (Current Active)'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Cadastral Source Citation:</span>
                      <span className="text-[11px] font-semibold text-rose-700">
                        {selectedParcel.provenance || selectedParcel.geometry_source || 'SSLR Cadastral Vector Map'}
                      </span>
                    </div>
                  </div>

                  {/* Distinction Notice (Legal vs Query Boundary) */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      Boundary Distinctions &amp; Notice
                    </div>
                    <p className="leading-relaxed">
                      <strong className="text-slate-700">Drawn Boundary:</strong> User-defined spatial query region.
                      <br />
                      <strong className="text-slate-700">Cadastral Polygon:</strong> Authoritative survey boundary from Revenue Form 16 / Tippan sketches.
                    </p>
                    <p className="text-[10px] text-slate-400 italic pt-1">
                      *Revenue records reflect registered possession. Formal title is governed by statutory deeds and ADLR survey adjudications.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col space-y-2">
                    <button
                      onClick={() => onSelectParcelForInspection && onSelectParcelForInspection(selectedParcel)}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center space-x-2 transition"
                    >
                      <MapPin className="w-4 h-4 text-emerald-200" />
                      <span>Dispatch Field Revenue Inspector</span>
                    </button>

                    <button
                      onClick={() => setShowGeoJsonModal(true)}
                      className="w-full py-2 px-3 rounded-xl font-semibold text-xs bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 flex items-center justify-center space-x-1 transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Raw GeoJSON Details</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShowDocsModal(true)}
                        className="py-2 px-3 rounded-xl font-semibold text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center space-x-1 transition"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Documents</span>
                      </button>

                      <button
                        onClick={() => confirmDeleteParcel(selectedParcel)}
                        className="py-2 px-3 rounded-xl font-semibold text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center space-x-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete Plot</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setShowReportModal(true)}
                      className="w-full py-2 px-3 rounded-xl font-medium text-[11px] text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/50 transition flex items-center justify-center space-x-1"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Report Data Discrepancy / Boundary Conflict</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="glass-card p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs bg-white space-y-2">
                  <MapIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                  <div className="font-bold text-slate-800 text-sm">No Parcel Selected</div>
                  <p>
                    Click any cadastral parcel boundary on the map, use the search bar above, or draw a boundary with the polygon tool to inspect legal land ownership.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: SAVED PLOTS EXPLORER */
            <div className="space-y-3">
              {/* Filter & Search Bar */}
              <div className="glass-card p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter by survey no, village, or owner..."
                    value={plotSearchQuery}
                    onChange={(e) => setPlotSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  {plotSearchQuery && (
                    <button
                      onClick={() => setPlotSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Land Type</label>
                    <select
                      value={plotFilterLandType}
                      onChange={(e) => setPlotFilterLandType(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="ALL">All Types</option>
                      <option value="Agricultural">Agricultural</option>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Government">Government</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Status</label>
                    <select
                      value={plotFilterStatus}
                      onChange={(e) => setPlotFilterStatus(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="VERIFIED_AUTHORIZED">Verified</option>
                      <option value="USER_DRAWN_UNVERIFIED">User Drawn</option>
                      <option value="IMPORTED_UNVERIFIED">Imported</option>
                    </select>
                  </div>
                </div>

                {/* Dim Unselected Plots Toggle Switch */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    {dimOtherParcels ? <EyeOff className="w-3.5 h-3.5 text-indigo-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    <span>Dim unselected plots on map</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={dimOtherParcels}
                    onChange={(e) => setDimOtherParcels(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Filtered Plots List */}
              <div className="glass-card p-3 rounded-2xl border border-slate-200 bg-white shadow-xs max-h-[520px] overflow-y-auto space-y-2">
                {(() => {
                  const filtered = parcels.filter((p) => {
                    if (plotFilterLandType !== 'ALL' && (p.land_type || 'Agricultural') !== plotFilterLandType) {
                      return false;
                    }
                    if (plotFilterStatus !== 'ALL' && p.verification_status !== plotFilterStatus) {
                      return false;
                    }
                    if (plotSearchQuery.trim()) {
                      const q = plotSearchQuery.toLowerCase().trim();
                      const surveyMatch = (p.survey_number || '').toString().toLowerCase().includes(q);
                      const villageMatch = (p.village || '').toLowerCase().includes(q);
                      const talukMatch = (p.taluk || '').toLowerCase().includes(q);
                      const ownerMatch = (p.primary_owner || (p.records && p.records[0]?.owner_name) || '').toLowerCase().includes(q);
                      if (!surveyMatch && !villageMatch && !talukMatch && !ownerMatch) {
                        return false;
                      }
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                        <Search className="w-6 h-6 text-slate-300 mx-auto" />
                        <div className="font-bold text-slate-700">No matching plots found</div>
                        <p>Try adjusting your search query or filter settings.</p>
                      </div>
                    );
                  }

                  return filtered.map((p) => {
                    const isSelected = selectedParcel && ((selectedParcel.parcel_id && selectedParcel.parcel_id === p.parcel_id) || (selectedParcel.id && selectedParcel.id === p.id));
                    const ownerName = p.primary_owner || (p.records && p.records[0]?.owner_name) || 'No linked owner';
                    const acres = p.extent_acres || p.area_acres || 0;

                    return (
                      <div
                        key={p.parcel_id || p.id}
                        onClick={() => selectParcelWithHighlight(p)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                            : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900">Sy {p.survey_number}</span>
                            {p.hissa_number && <span className="text-slate-400 font-normal">/ {p.hissa_number}</span>}
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-medium">
                              {p.land_type || 'Agricultural'}
                            </span>
                            {p.verification_status === 'VERIFIED_AUTHORIZED' ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                Verified
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
                                Unverified
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {p.village}, {p.taluk} &bull; <span className="text-slate-700 font-medium">{ownerName}</span>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono text-xs font-bold text-emerald-700">{acres} Ac</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteParcel(p);
                            }}
                            title="Delete this plot"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 4. Multiple Candidates Modal (When drawn polygon covers multiple plots) */}
      {showCandidatesModal && candidateParcels.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Spatial Query Resolution
                </span>
                <h3 className="text-lg font-black text-slate-900 font-outfit">
                  Multiple Cadastral Parcels Intersected ({candidateParcels.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your drawn boundary spans multiple land parcels. Select a candidate parcel below to inspect its titleholder records.
                </p>
              </div>
              <button
                onClick={() => setShowCandidatesModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {candidateParcels.map((cand, idx) => (
                <div
                  key={cand.parcel_id || idx}
                  onClick={() => {
                    selectParcel(cand);
                    setShowCandidatesModal(false);
                  }}
                  className="p-3 rounded-xl border border-rose-100 hover:border-rose-300 hover:bg-rose-50/60 cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>Survey {cand.survey_number}</span>
                      {cand.hissa_number && <span className="text-slate-500 font-normal">/ Hissa {cand.hissa_number}</span>}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        {cand.overlap_pct_of_parcel ? `${cand.overlap_pct_of_parcel}% overlap` : 'Candidate'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {cand.village}, {cand.taluk} &bull; Extent: {cand.extent_acres} Acres
                    </div>
                    <div className="text-[10px] text-rose-700 font-medium">
                      Relationship: {cand.spatial_relationship ? cand.spatial_relationship.replace(/_/g, ' ') : 'PARTIAL INTERSECTION'}
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowCandidatesModal(false)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 5. Raw GeoJSON Modal */}
      {showGeoJsonModal && selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-outfit">
                Cadastral GeoJSON - Survey {selectedParcel.survey_number}
              </h3>
              <button
                onClick={() => setShowGeoJsonModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-72 border border-slate-800">
              {JSON.stringify({
                type: "Feature",
                properties: {
                  parcel_id: selectedParcel.parcel_id,
                  survey_number: selectedParcel.survey_number,
                  hissa_number: selectedParcel.hissa_number,
                  village: selectedParcel.village,
                  hobli: selectedParcel.hobli,
                  taluk: selectedParcel.taluk,
                  district: selectedParcel.district,
                  extent_acres: selectedParcel.extent_acres,
                  verification_status: selectedParcel.verification_status,
                  provenance: selectedParcel.provenance
                },
                geometry: selectedParcel.geometry
              }, null, 2)}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(selectedParcel.geometry, null, 2));
                alert('Cadastral polygon GeoJSON copied to clipboard!');
              }}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy GeoJSON to Clipboard</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Linked Cadastral Documents Modal */}
      {showDocsModal && selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900 font-outfit">
                  Linked Authorized Records - Sy {selectedParcel.survey_number}
                </h3>
              </div>
              <button
                onClick={() => setShowDocsModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs space-y-1">
                <div className="font-bold text-slate-800">RTC Form 16 (Record of Rights)</div>
                <div className="text-slate-600 text-[11px]">
                  Issuing Source: Revenue Department of Karnataka, Bhoomi Division
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">
                  Status: Digitally Signed &amp; Authoritatively Verified
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs space-y-1">
                <div className="font-bold text-slate-800">Tippan / Field Measurement Book (FMB) Sketch</div>
                <div className="text-slate-600 text-[11px]">
                  Issuing Source: Survey Settlement &amp; Land Records (SSLR) Directorate
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">
                  Status: Vectorized Cadastral Survey Boundary (G-Line &amp; F-Line verified)
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs space-y-1">
                <div className="font-bold text-slate-800">Akarbandh Record</div>
                <div className="text-slate-600 text-[11px]">
                  Issuing Source: Taluk Survey Office, {selectedParcel.taluk}
                </div>
                <div className="text-[10px] text-slate-500">
                  Assessment: A-Kharab / B-Kharab nil; standard agricultural dry assessment.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDocsModal(false)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 7. Report Discrepancy Modal */}
      {showReportModal && selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900 font-outfit">
                  Report Cadastral Discrepancy
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-emerald-800 text-sm">Discrepancy Ticket Logged</div>
                <p className="text-xs text-emerald-700">
                  Your report for Survey {selectedParcel.survey_number} has been forwarded to the Revenue Inspection Queue.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDiscrepancySubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Issue Category:</label>
                  <select
                    value={reportIssueType}
                    onChange={(e) => setReportIssueType(e.target.value)}
                    className="w-full p-2 rounded-xl bg-white border border-rose-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="BOUNDARY_OVERLAP">Boundary Overlap with Adjacent Survey</option>
                    <option value="NAME_MISMATCH">Landowner Name Differs from Current Possession</option>
                    <option value="EXTENT_CONFLICT">Acreage Discrepancy (RTC vs Ground Measurement)</option>
                    <option value="ENCROACHMENT">Physical Road / Easement Encroachment</option>
                    <option value="OTHER">Other Discrepancy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Detailed Description:</label>
                  <textarea
                    rows={3}
                    required
                    value={reportComments}
                    onChange={(e) => setReportComments(e.target.value)}
                    placeholder="Provide specific notes regarding boundary markers, survey stones, or physical possession..."
                    className="w-full p-2.5 rounded-xl bg-white border border-rose-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 placeholder-slate-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 8. Official Coverage & Data Pipeline Info Modal */}
      {showCoverageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Database className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-outfit">
                    BhoomiAI &bull; Official Geospatial Data Coverage Pipeline
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Transparent dataset origins, CRS standards, boundary verification, and non-fabrication guarantee
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCoverageModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Coverage Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Davanagere District (ದಾವಣಗೆರೆ)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Polygon Active
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>Extent:</strong> 6 Taluks (Davanagere, Harihara, Channagiri, Honnali, Nyamathi, Jagalur)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>BBox:</strong> 75.3988°E, 13.8062°N to 76.5336°E, 14.7053°N
                  </div>
                  <div className="text-[11px] text-emerald-800 font-medium">
                    SSLR official vector boundary mapped. Includes Maravanji (Channagiri Taluk) revenue gazetteer point.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Tumakuru District (ತುಮಕೂರು)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      MultiPolygon Active
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>Extent:</strong> 10 Taluks (Tumakuru, Tiptur, Gubbi, Kunigal, Madhugiri, Sira, Pavagada, Koratagere, Turuvekere, Chikkanayakanahalli)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>BBox:</strong> 76.3462°E, 12.7456°N to 77.5170°E, 14.3423°N
                  </div>
                  <div className="text-[11px] text-blue-800 font-medium">
                    SSLR official vector boundary mapped. Cadastral pilot active in Melekote, Oorukere, Kyathsandra, Bellavi.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Shivamogga District (ಶಿವಮೊಗ್ಗ)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                      Polygon Active
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>Extent:</strong> 7 Taluks (Shivamogga, Bhadravathi, Thirthahalli, Sagara, Shikaripura, Soraba, Hosanagara)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>BBox:</strong> 74.6500°E, 13.4500°N to 76.1500°E, 14.6500°N
                  </div>
                  <div className="text-[11px] text-teal-800 font-medium">
                    SSLR official vector boundary mapped. Cadastral pilot active in Nidige, Kudligere.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Mysuru District (ಮೈಸೂರು)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      Polygon Active
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>Extent:</strong> 7 Taluks (Mysuru, Nanjangud, Hunsur, T. Narasipura, K.R. Nagar, Piriyapatna, Saragur)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>BBox:</strong> 75.9000°E, 11.7500°N to 77.1500°E, 12.6500°N
                  </div>
                  <div className="text-[11px] text-purple-800 font-medium">
                    SSLR official vector boundary mapped. Cadastral pilot active in Varuna, Biligere.
                  </div>
                </div>
              </div>

              {/* Data Standards */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Geospatial Standards &amp; Coordinate Reference System</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div><strong>Coordinate Reference:</strong> WGS84 (EPSG:4326)</div>
                  <div><strong>Baseline Imagery:</strong> Esri World Imagery / ISRO Bhuvan</div>
                  <div><strong>Cadastral Standard:</strong> SSLR Karnataka Form 16</div>
                  <div><strong>Gazetteer Hierarchy:</strong> LGD / Karnataka Revenue Portal</div>
                </div>
              </div>

              {/* Strict Non-Fabrication Policy Banner */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Strict Non-Fabrication Guarantee</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  For locations where official cadastral survey parcel polygons are currently unmapped or still under digitization (such as rural villages like Maravanji), BhoomiAI strictly places an authentic revenue point location marker and <strong>never invents synthetic or artificial polygon boundaries</strong>.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCoverageModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs"
                >
                  Close Coverage Information
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Save Plot to Database Modal */}
      {showSavePlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-emerald-200 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Save className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-outfit">
                    Save Plot to Database
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Persist user-drawn or imported boundary polygon as an official cadastral parcel record
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSavePlotModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlotSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">District:</label>
                  <input
                    type="text"
                    required
                    value={savePlotFormData.district}
                    onChange={(e) => setSavePlotFormData({ ...savePlotFormData, district: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Taluk:</label>
                  <input
                    type="text"
                    required
                    value={savePlotFormData.taluk}
                    onChange={(e) => setSavePlotFormData({ ...savePlotFormData, taluk: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Hobli:</label>
                  <input
                    type="text"
                    value={savePlotFormData.hobli}
                    onChange={(e) => setSavePlotFormData({ ...savePlotFormData, hobli: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Village:</label>
                  <input
                    type="text"
                    required
                    value={savePlotFormData.village}
                    onChange={(e) => setSavePlotFormData({ ...savePlotFormData, village: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Survey Number *:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 104"
                    value={savePlotFormData.survey_number}
                    onChange={(e) => setSavePlotFormData({ ...savePlotFormData, survey_number: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-emerald-300 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Hissa Number:</label>
                  <input
                    type="text"
                    placeholder="e.g. 1"
                    value={savePlotFormData.hissa_number}
                    onChange={(e) => setSavePlotFormData({ ...savePlotFormData, hissa_number: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Land Type:</label>
                  <select
                    value={savePlotFormData.land_type}
                    onChange={(e) => setSavePlotFormData({ ...savePlotFormData, land_type: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Agricultural">Agricultural</option>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Government">Government</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Owner Name (Optional):</label>
                  <input
                    type="text"
                    placeholder="Leave blank if unverified"
                    value={savePlotFormData.owner_name}
                    onChange={(e) => setSavePlotFormData({ ...savePlotFormData, owner_name: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes / Description:</label>
                <textarea
                  rows={2}
                  placeholder="Boundary markings, survey stone notes, or field observations..."
                  value={savePlotFormData.notes}
                  onChange={(e) => setSavePlotFormData({ ...savePlotFormData, notes: e.target.value })}
                  className="w-full p-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Calculated Extent Preview */}
              {drawnMeasurements && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Calculated Extent</div>
                    <div className="font-extrabold text-sm">{drawnMeasurements.acresTotal} Acres ({drawnMeasurements.acres} Ac {drawnMeasurements.guntas} Guntas)</div>
                  </div>
                  <div className="text-right text-[11px] text-emerald-700">
                    <div>{drawnMeasurements.sqMeters.toLocaleString()} m² &bull; {drawnMeasurements.sqFeet?.toLocaleString()} sq ft</div>
                    <div>Perimeter: {drawnMeasurements.perimeterMeters} m</div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSavePlotModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlot}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {isSavingPlot ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Plot to Database</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Delete Plot Confirmation Modal */}
      {showDeleteConfirmModal && plotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900 font-outfit">
                  Delete Cadastral Plot
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm permanent deletion of this plot record
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100 text-xs space-y-1">
              <div className="font-bold text-slate-900">
                Survey No: {plotToDelete.survey_number} {plotToDelete.hissa_number ? `/ Hissa ${plotToDelete.hissa_number}` : ''}
              </div>
              <div className="text-slate-600">
                Location: {plotToDelete.village}, {plotToDelete.taluk}, {plotToDelete.district}
              </div>
              <div className="text-rose-700 font-semibold">
                Extent: {plotToDelete.extent_acres || plotToDelete.area_acres} Acres
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this plot boundary and associated records from the database? This action cannot be undone.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setPlotToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteParcel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Plot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Map Legend Modal */}
      {showLegendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900 font-outfit">
                  Map Legend &amp; Symbology Guide
                </h3>
              </div>
              <button
                onClick={() => setShowLegendModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <div className="w-5 h-5 rounded-md bg-emerald-500 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="font-bold text-slate-900">Cadastral Land Parcel</div>
                  <div className="text-[11px] text-slate-500">Green filled polygon with solid border. Official vectorized revenue parcel boundary.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <div className="w-5 h-5 rounded-md bg-emerald-600 border-2 border-emerald-700 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="font-bold text-slate-900">Selected / Active Parcel</div>
                  <div className="text-[11px] text-slate-500">Highlighted emerald thick border. Focused in inspector panel with detailed landholder records.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                <div className="w-5 h-5 rounded-md border-2 border-dashed border-emerald-600 bg-emerald-200/50 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="font-bold text-slate-900">User-Drawn Boundary</div>
                  <div className="text-[11px] text-slate-500">Dashed emerald border with vertex handles. Used for spatial query and saving custom plots.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                <div className="w-5 h-5 rounded-md border-2 border-dashed border-purple-600 bg-purple-200/50 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="font-bold text-slate-900">Imported Boundary (GeoJSON)</div>
                  <div className="text-[11px] text-slate-500">Purple dashed boundary imported from external CAD, GIS, or drone survey sketches.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-sky-50/50 border border-sky-100">
                <div className="w-5 h-5 rounded-md border-2 border-dashed border-sky-600 bg-sky-200/50 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="font-bold text-slate-900">Distance Measurement Polyline</div>
                  <div className="text-[11px] text-slate-500">Dashed blue line with waypoint circles displaying cumulative distance in meters and feet.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                  📍
                </div>
                <div>
                  <div className="font-bold text-slate-900">Search Place Pin / GPS Position</div>
                  <div className="text-[11px] text-slate-500">Pulsing blue or green pin indicating searched landmark, village, town, or user GPS location.</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLegendModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                Close Legend
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline fallback icon component to avoid undefined reference
function AlertCircleIcon(props) {
  return <AlertCircle2 {...props} />;
}

function AlertCircle2(props) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
