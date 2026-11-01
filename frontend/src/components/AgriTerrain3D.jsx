import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Compass, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Eye, 
  MapPin, 
  Maximize2, 
  Minimize2, 
  Building2, 
  Wheat, 
  Sparkles, 
  Info, 
  CheckCircle2, 
  ShieldCheck, 
  Camera, 
  ChevronRight, 
  ExternalLink, 
  RefreshCw,
  Sun,
  X,
  Map as MapIcon,
  Warehouse,
  Droplets,
  Calendar,
  Activity
} from 'lucide-react';
import { searchLandParcels } from '../api';
import { CROP_DATABASE, getCropInfoByLandType, GRANARY_METRICS } from '../data/cropPhotos';

export default function AgriTerrain3D({ onSwitchTo2D, onSelectParcelForInspection, theme = 'dark' }) {
  const mountRef = useRef(null);
  const isLight = theme === 'light';

  // State
  const [parcels, setParcels] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [hoveredParcel, setHoveredParcel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showGranaryModal, setShowGranaryModal] = useState(false);
  const [cameraViewMode, setCameraViewMode] = useState('isometric'); // 'top', 'isometric', 'drone'
  const [webglSupported, setWebglSupported] = useState(true);

  // References to Three.js objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const parcelMeshesMap = useRef(new Map());
  const granaryMeshRef = useRef(null);
  const isTransitioningRef = useRef(false);

  // Check WebGL availability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch (e) {
      setWebglSupported(false);
    }
  }, []);

  // Fetch real parcels
  useEffect(() => {
    loadRealParcels();
  }, []);

  const loadRealParcels = async () => {
    setLoading(true);
    try {
      const res = await searchLandParcels({ district: 'Tumakuru' });
      const data = Array.isArray(res.data) ? res.data : [];
      setParcels(data);
    } catch (err) {
      console.error("Error fetching parcels for 3D terrain:", err);
    } finally {
      setLoading(false);
    }
  };

  // Main Three.js Scene Setup & Lifecycle
  useEffect(() => {
    if (!webglSupported || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Background & atmospheric fog
    const skyColor = isLight ? 0xe2e8f0 : 0x091419;
    const fogColor = isLight ? 0xd1dbe4 : 0x0d1f1c;
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(fogColor, 0.0022);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, 110, 150);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isLight ? 1.15 : 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below ground
    controls.minDistance = 20;
    controls.maxDistance = 450;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const hemiLight = new THREE.HemisphereLight(0xdcfce7, 0x14532d, isLight ? 1.0 : 0.7);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, isLight ? 1.4 : 1.2);
    dirLight.position.set(120, 180, 90);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 500;
    const d = 160;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 0.45 : 0.35);
    scene.add(ambientLight);

    // 6. Realistic Agrarian Terrain Mesh
    const terrainSize = 600;
    const terrainSegments = 100;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = [];

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // Procedural agrarian elevation contours: gentle rolling hills with terraced farm plots
      const distFromCenter = Math.sqrt(vx * vx + vz * vz);
      let elevation = 
        Math.sin(vx * 0.015) * 4.5 +
        Math.cos(vz * 0.018) * 3.8 +
        Math.sin((vx + vz) * 0.035) * 1.8;

      // Outer ridge hills surrounding the valley
      if (distFromCenter > 130) {
        const factor = (distFromCenter - 130) * 0.09;
        elevation += Math.pow(factor, 1.4) * (Math.sin(vx * 0.02) + 1.2);
      }

      pos.setY(i, elevation);

      // Vertex color variations: rich loam, lush crop patches, and sandy irrigation furrows
      const c = new THREE.Color();
      const patchNoise = Math.sin(vx * 0.04) * Math.cos(vz * 0.04);
      if (patchNoise > 0.35) {
        c.setHex(isLight ? 0x86efac : 0x166534); // Bright crops
      } else if (patchNoise > -0.2) {
        c.setHex(isLight ? 0x4ade80 : 0x14532d); // Forest farm loam
      } else {
        c.setHex(isLight ? 0xa7f3d0 : 0x064e3b); // Irrigated wetland
      }
      colors.push(c.r, c.g, c.b);
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.08,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // 7. 3D Village Granary Complex ("Krishi Bhandara & State Warehousing")
    createGranaryFacility(scene);

    // 8. Agrarian Vegetation: Procedural Palms & Crop Trees
    createVillageAgriVegetation(scene, pos);

    // 9. Raycasting for plot selection & hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(parcelMeshesMap.current.values()).map(item => item.mesh);
      
      // Include granary
      if (granaryMeshRef.current) meshes.push(granaryMeshRef.current);

      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData?.isGranary) {
          container.style.cursor = 'pointer';
          setHoveredParcel({ isGranary: true, name: GRANARY_METRICS.facilityName });
        } else if (hit.userData?.parcel) {
          container.style.cursor = 'pointer';
          setHoveredParcel(hit.userData.parcel);
        }
      } else {
        container.style.cursor = 'default';
        setHoveredParcel(null);
      }
    };

    const handleClick = (event) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(parcelMeshesMap.current.values()).map(item => item.mesh);
      if (granaryMeshRef.current) meshes.push(granaryMeshRef.current);

      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData?.isGranary) {
          setShowGranaryModal(true);
        } else if (hit.userData?.parcel) {
          selectParcel(hit.userData.parcel, hit.position);
        }
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    // 10. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 11. Animation Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [webglSupported, isLight]);

  // Construct 3D Granary Facility (Krishi Bhandara)
  const createGranaryFacility = (scene) => {
    const granaryGroup = new THREE.Group();
    granaryGroup.position.set(-65, 0, -35);

    // 1. Concrete Base Plinth
    const plinthGeo = new THREE.BoxGeometry(45, 2.5, 30);
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = 1.25;
    plinth.receiveShadow = true;
    granaryGroup.add(plinth);

    // 2. Main Storage Warehouse (Karnataka State Agricultural Granary)
    const shedGeo = new THREE.BoxGeometry(26, 12, 18);
    const shedMat = new THREE.MeshStandardMaterial({ 
      color: 0x064e3b, // Forest Green Warehouse
      roughness: 0.6,
      metalness: 0.2
    });
    const shed = new THREE.Mesh(shedGeo, shedMat);
    shed.position.set(-7, 7.5, 0);
    shed.castShadow = true;
    shed.receiveShadow = true;
    granaryGroup.add(shed);

    // Roof
    const roofGeo = new THREE.ConeGeometry(17, 5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }); // Harvest Gold Roof
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-7, 16, 0);
    roof.scale.set(1.1, 0.8, 1.2);
    roof.castShadow = true;
    granaryGroup.add(roof);

    // 3. Modern Cylindrical Grain Silos (Silo A, Silo B, Silo C)
    const siloPositions = [
      { x: 12, z: -8, color: 0x84cc16 }, // Ragi Silo
      { x: 12, z: 0, color: 0x10b981 },  // Paddy Silo
      { x: 12, z: 8, color: 0xeab308 },  // Maize Silo
    ];

    siloPositions.forEach((sp, idx) => {
      const siloGroup = new THREE.Group();
      siloGroup.position.set(sp.x, 0, sp.z);

      // Silo Cylinder
      const siloCylGeo = new THREE.CylinderGeometry(3.6, 3.6, 17, 24);
      const siloMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.6,
        roughness: 0.3
      });
      const siloMesh = new THREE.Mesh(siloCylGeo, siloMat);
      siloMesh.position.y = 9.5;
      siloMesh.castShadow = true;
      siloGroup.add(siloMesh);

      // Silo Conical Dome
      const domeGeo = new THREE.ConeGeometry(3.8, 2.5, 24);
      const domeMat = new THREE.MeshStandardMaterial({ color: sp.color, metalness: 0.4, roughness: 0.4 });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.y = 19.25;
      dome.castShadow = true;
      siloGroup.add(dome);

      granaryGroup.add(siloGroup);
    });

    // Invisible Hit Box for clicking Granary
    const hitBoxGeo = new THREE.BoxGeometry(48, 24, 32);
    const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
    hitBox.position.set(0, 12, 0);
    hitBox.userData = { isGranary: true };
    granaryMeshRef.current = hitBox;
    granaryGroup.add(hitBox);

    scene.add(granaryGroup);
  };

  // Create Procedural Farmland Trees (Arecanut palms & coconut trees)
  const createVillageAgriVegetation = (scene, terrainPos) => {
    const palmGroup = new THREE.Group();

    // Create instanced palm trees along farmland periphery
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 11, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });

    const frondGeo = new THREE.ConeGeometry(4.5, 2.5, 7);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });

    // Seed 45 trees along perimeter
    for (let i = 0; i < 45; i++) {
      const angle = (i / 45) * Math.PI * 2;
      const radius = 95 + (Math.sin(i * 3.7) * 40);
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;

      const singleTree = new THREE.Group();
      singleTree.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 5.5;
      trunk.castShadow = true;
      singleTree.add(trunk);

      const fronds = new THREE.Mesh(frondGeo, frondMat);
      fronds.position.y = 11.5;
      fronds.castShadow = true;
      singleTree.add(fronds);

      palmGroup.add(singleTree);
    }

    scene.add(palmGroup);
  };

  // Convert real database GeoJSON WGS84 polygons into 3D parcels
  useEffect(() => {
    if (!sceneRef.current || parcels.length === 0) return;

    const scene = sceneRef.current;

    // Clear existing parcel meshes
    parcelMeshesMap.current.forEach(item => {
      scene.remove(item.mesh);
      scene.remove(item.line);
    });
    parcelMeshesMap.current.clear();

    // 1. Calculate cluster centroid to convert WGS84 lat/lng to local meters
    let sumLat = 0, sumLng = 0, validCount = 0;
    parcels.forEach(p => {
      if (p.center_lat && p.center_lng) {
        sumLat += p.center_lat;
        sumLng += p.center_lng;
        validCount++;
      }
    });

    const centerLat = validCount > 0 ? sumLat / validCount : 13.3409;
    const centerLng = validCount > 0 ? sumLng / validCount : 77.1010;

    const M_PER_DEG_LAT = 111139.0;
    const M_PER_DEG_LNG = 111139.0 * Math.cos(centerLat * Math.PI / 180.0);

    // Scale down meter space to fit comfortable 3D viewport (1 meter = 0.25 Three.js units)
    const SCALE = 0.25;

    parcels.forEach((parcel) => {
      const geom = parcel.geometry || parcel.boundary_geojson;
      if (!geom || !geom.coordinates || geom.coordinates.length === 0) return;

      const ring = geom.coordinates[0];
      if (!ring || ring.length < 3) return;

      const shape = new THREE.Shape();
      const points3D = [];

      ring.forEach((coord, i) => {
        const lng = coord[0];
        const lat = coord[1];

        // Project relative to center point
        const localX = (lng - centerLng) * M_PER_DEG_LNG * SCALE;
        const localZ = (centerLat - lat) * M_PER_DEG_LAT * SCALE; // inverted Z for North

        if (i === 0) {
          shape.moveTo(localX, -localZ);
        } else {
          shape.lineTo(localX, -localZ);
        }

        points3D.push(new THREE.Vector3(localX, 1.2, localZ));
      });

      // Extrude polygon slightly to give 3D terrain terrace appearance
      const extrudeSettings = {
        depth: 1.8,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.3,
        bevelThickness: 0.4
      };

      const extrudeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      extrudeGeo.rotateX(Math.PI / 2); // Align flat onto XZ plane

      // Assign crop color
      const cropInfo = getCropInfoByLandType(parcel.land_type, parcel.survey_number);
      const isSelected = selectedParcel?.id === parcel.id;

      const parcelMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x10b981 : cropInfo.threeColor,
        roughness: 0.65,
        metalness: 0.15,
        emissive: isSelected ? 0x064e3b : 0x000000,
        emissiveIntensity: isSelected ? 0.4 : 0.0,
      });

      const parcelMesh = new THREE.Mesh(extrudeGeo, parcelMat);
      parcelMesh.position.y = 0.4;
      parcelMesh.castShadow = true;
      parcelMesh.receiveShadow = true;
      parcelMesh.userData = { parcel, cropInfo };

      // Raised glowing plot boundary line
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points3D);
      const lineMat = new THREE.LineBasicMaterial({ 
        color: isSelected ? 0x34d399 : 0xffffff, 
        linewidth: isSelected ? 3 : 1,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.4
      });
      const lineMesh = new THREE.LineLoop(lineGeo, lineMat);

      scene.add(parcelMesh);
      scene.add(lineMesh);

      parcelMeshesMap.current.set(parcel.id, { mesh: parcelMesh, line: lineMesh });
    });

  }, [parcels, selectedParcel]);

  // Handle parcel selection and smooth camera animation
  const selectParcel = (parcel, targetPos) => {
    setSelectedParcel(parcel);
    const cropInfo = getCropInfoByLandType(parcel.land_type, parcel.survey_number);
    setSelectedCrop(cropInfo);
    setActivePhotoIdx(0);

    if (!cameraRef.current || !controlsRef.current) return;

    // Smoothly fly camera to focus on selected parcel
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Calculate approximate center of parcel
    const meshItem = parcelMeshesMap.current.get(parcel.id);
    if (meshItem) {
      meshItem.mesh.geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      meshItem.mesh.geometry.boundingBox.getCenter(center);
      center.add(meshItem.mesh.position);

      const targetCameraPos = new THREE.Vector3(
        center.x + 25,
        center.y + 40,
        center.z + 55
      );

      // Animate camera position and target
      animateCameraTo(targetCameraPos, center);
    }
  };

  // Smooth camera interpolation helper
  const animateCameraTo = (newPos, newTarget) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();

    let progress = 0;
    const duration = 40; // frames (~650ms)

    const step = () => {
      progress++;
      const t = easeInOutCubic(progress / duration);

      camera.position.lerpVectors(startPos, newPos, t);
      controls.target.lerpVectors(startTarget, newTarget, t);

      if (progress < duration) {
        requestAnimationFrame(step);
      } else {
        controls.update();
      }
    };
    step();
  };

  const easeInOutCubic = (x) => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };

  // Camera preset buttons
  const setCameraPreset = (mode) => {
    setCameraViewMode(mode);
    if (!cameraRef.current || !controlsRef.current) return;

    const controls = controlsRef.current;
    const currentTarget = controls.target.clone();

    if (mode === 'top') {
      // Orthogonal top-down bird's-eye view
      animateCameraTo(new THREE.Vector3(currentTarget.x, 180, currentTarget.z + 0.1), currentTarget);
    } else if (mode === 'isometric') {
      // 45 degree isometric perspective
      animateCameraTo(new THREE.Vector3(currentTarget.x + 100, 110, currentTarget.z + 130), currentTarget);
    } else if (mode === 'drone') {
      // Low altitude drone tour
      animateCameraTo(new THREE.Vector3(currentTarget.x + 40, 28, currentTarget.z + 50), currentTarget);
    }
  };

  const resetCamera = () => {
    setCameraViewMode('isometric');
    animateCameraTo(new THREE.Vector3(0, 110, 150), new THREE.Vector3(0, 0, 0));
    setSelectedParcel(null);
    setSelectedCrop(null);
  };

  if (!webglSupported) {
    return (
      <div className={`p-8 rounded-3xl border text-center space-y-4 max-w-2xl mx-auto ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <Info className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>WebGL 3D Accelerated Graphics Unavailable</h3>
        <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Your browser or device hardware acceleration is currently disabled. You can continue using our high-performance 2D Cadastral GIS Leaflet engine with full parcel search and drawing capabilities.
        </p>
        <button
          onClick={onSwitchTo2D}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-glow-sm"
        >
          Switch to 2D Cadastral GIS Map
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[640px] rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/30">
      
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Header Floating Badge */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className={`pointer-events-auto px-4 py-2 rounded-2xl border backdrop-blur-xl shadow-xl flex items-center space-x-2.5 ${
          isLight ? 'bg-white/95 border-emerald-200 text-emerald-950' : 'bg-slate-950/85 border-emerald-500/30 text-white'
        }`}>
          <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Wheat className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xs tracking-wide">BhoomiAI 3D Agri-Digital Twin</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE 3D
              </span>
            </div>
            <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Tumakuru Agrarian Cadastre &bull; Real Database Coordinates
            </div>
          </div>
        </div>

        {/* Quick 2D Fallback Switcher */}
        <button
          onClick={onSwitchTo2D}
          className={`pointer-events-auto px-3.5 py-2 rounded-2xl border backdrop-blur-xl shadow-xl flex items-center space-x-2 text-xs font-bold transition ${
            isLight 
              ? 'bg-white/95 hover:bg-slate-100 border-slate-300 text-slate-800' 
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title="Switch to 2D Leaflet Cadastral Map"
        >
          <MapIcon className="w-3.5 h-3.5 text-emerald-500" />
          <span>Switch to 2D Map</span>
        </button>

        {/* Krishi Bhandara Granary Quick Trigger */}
        <button
          onClick={() => setShowGranaryModal(true)}
          className="pointer-events-auto px-3.5 py-2 rounded-2xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold backdrop-blur-xl shadow-xl flex items-center space-x-2 transition"
          title="Inspect State Granary Silos"
        >
          <Warehouse className="w-3.5 h-3.5 text-amber-400" />
          <span>State Granary Silos</span>
        </button>
      </div>

      {/* Camera Controls & Presets Bar (Right Toolbar) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2 pointer-events-none">
        <div className={`pointer-events-auto p-1.5 rounded-2xl border backdrop-blur-xl shadow-xl flex flex-col space-y-1.5 ${
          isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-950/85 border-slate-800'
        }`}>
          <button
            onClick={() => setCameraPreset('top')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
              cameraViewMode === 'top' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800')
            }`}
            title="Top-down Orthogonal Aerial View"
          >
            <Compass className="w-4 h-4" />
            <span className="text-[11px] hidden sm:inline">Top Nadir</span>
          </button>

          <button
            onClick={() => setCameraPreset('isometric')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
              cameraViewMode === 'isometric' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800')
            }`}
            title="45° Panoramic Isometric Perspective"
          >
            <Eye className="w-4 h-4" />
            <span className="text-[11px] hidden sm:inline">Isometric</span>
          </button>

          <button
            onClick={() => setCameraPreset('drone')}
            className={`p-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
              cameraViewMode === 'drone' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : (isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800')
            }`}
            title="Low-Altitude Agrarian Drone Tour"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[11px] hidden sm:inline">Drone Tour</span>
          </button>

          <button
            onClick={resetCamera}
            className={`p-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
              isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Reset Horizon Vantage"
          >
            <RotateCw className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Hover Info Tooltip (Floating when hovering plot) */}
      {hoveredParcel && !selectedParcel && (
        <div className={`absolute bottom-6 left-6 z-20 pointer-events-none p-3.5 rounded-2xl border backdrop-blur-xl shadow-xl flex items-center space-x-3 animate-in fade-in duration-200 ${
          isLight ? 'bg-white/95 border-emerald-300 text-slate-900' : 'bg-slate-950/90 border-emerald-500/40 text-white'
        }`}>
          {hoveredParcel.isGranary ? (
            <>
              <Warehouse className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-amber-400">Click to Inspect Granary</div>
                <div className="text-[11px] text-slate-400">{hoveredParcel.name}</div>
              </div>
            </>
          ) : (
            <>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping"></div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>Survey No. {hoveredParcel.survey_number}</span>
                  {hoveredParcel.hissa_number && (
                    <span className="text-emerald-500">/ {hoveredParcel.hissa_number}</span>
                  )}
                </div>
                <div className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {hoveredParcel.village}, {hoveredParcel.district} &bull; {hoveredParcel.area_acres} Acres &bull; Click to open 3D details
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* FLOATING LAND-INFORMATION PANEL (When a parcel is selected) */}
      {selectedParcel && (
        <div className={`absolute bottom-6 left-6 z-30 max-w-sm sm:max-w-md w-full rounded-3xl border shadow-2xl backdrop-blur-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-300 ${
          isLight 
            ? 'bg-white/98 border-emerald-300 text-slate-900' 
            : 'bg-slate-950/95 border-emerald-500/40 text-white'
        }`}>
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>{selectedParcel.verification_status || 'VERIFIED_AUTHORIZED'}</span>
              </div>
              <h3 className="text-xl font-black font-outfit tracking-tight flex items-center space-x-2">
                <span>Survey No. {selectedParcel.survey_number}</span>
                {selectedParcel.hissa_number && (
                  <span className="text-emerald-500">/{selectedParcel.hissa_number}</span>
                )}
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {selectedParcel.village}, {selectedParcel.taluk || 'Tumakuru'}, {selectedParcel.district}
              </p>
            </div>

            <button
              onClick={() => setSelectedParcel(null)}
              className={`p-1.5 rounded-xl border transition ${
                isLight ? 'border-slate-200 text-slate-500 hover:bg-slate-100' : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Land Extent</div>
              <div className="text-base font-black font-mono text-emerald-500">
                {selectedParcel.area_acres} Ac
              </div>
              <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Approx {Math.round(selectedParcel.area_acres * 40)} Guntas
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Verified Titleholder</div>
              <div className="text-xs font-bold truncate">
                {selectedParcel.primary_owner || selectedParcel.records?.[0]?.owner_name || 'Government Revenue Land'}
              </div>
              <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {selectedParcel.records?.[0]?.relative_name ? `W/o or S/o ${selectedParcel.records[0].relative_name}` : 'Bhoomi RTC Verified'}
              </div>
            </div>
          </div>

          {/* Crop Classification & Agronomic Details */}
          {selectedCrop && (
            <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
              isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/30 border-emerald-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wheat className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold">{selectedCrop.name}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-500 font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  {selectedCrop.category}
                </span>
              </div>

              {/* Crop Photo Carousel */}
              {selectedCrop.photos && selectedCrop.photos.length > 0 && (
                <div className="space-y-1.5">
                  <div className="relative h-28 w-full rounded-xl overflow-hidden border border-emerald-500/20 group">
                    <img 
                      src={selectedCrop.photos[activePhotoIdx].url} 
                      alt={selectedCrop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2">
                      <p className="text-[10px] text-white line-clamp-1">
                        {selectedCrop.photos[activePhotoIdx].caption}
                      </p>
                    </div>

                    {selectedCrop.photos.length > 1 && (
                      <div className="absolute top-2 right-2 flex space-x-1">
                        {selectedCrop.photos.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActivePhotoIdx(idx)}
                            className={`w-2 h-2 rounded-full transition ${
                              activePhotoIdx === idx ? 'bg-emerald-400 scale-125' : 'bg-white/60 hover:bg-white'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Agronomic Specs */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Soil Profile:</span>
                  <span className="font-medium">{selectedCrop.soilType}</span>
                </div>
                <div>
                  <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Irrigation:</span>
                  <span className="font-medium">{selectedCrop.irrigationType}</span>
                </div>
                <div>
                  <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Expected Yield:</span>
                  <span className="font-mono font-medium">{selectedCrop.averageYield}</span>
                </div>
                <div>
                  <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>State Granary MSP:</span>
                  <span className="font-mono text-emerald-500 font-bold">{selectedCrop.mspValue}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={onSwitchTo2D}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-glow-sm transition flex items-center justify-center space-x-1.5"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Inspect in 2D GIS</span>
            </button>

            {onSelectParcelForInspection && (
              <button
                onClick={() => onSelectParcelForInspection(selectedParcel)}
                className={`py-2 px-3 border rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  isLight 
                    ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800' 
                    : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <span>GPS Inspect</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STATE GRANARY MODAL (Krishi Bhandara & Storage Silos) */}
      {showGranaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`max-w-2xl w-full rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-5 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950 border-emerald-500/30 text-white'
          }`}>
            <div className="flex items-start justify-between border-b pb-4 border-slate-800/80">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Warehouse className="w-3.5 h-3.5" />
                  <span>State Agricultural Granary Facility</span>
                </div>
                <h3 className="text-xl font-black font-outfit">
                  {GRANARY_METRICS.facilityName}
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {GRANARY_METRICS.location} &bull; Live Telemetry &amp; Grain Inventory
                </p>
              </div>

              <button
                onClick={() => setShowGranaryModal(false)}
                className="p-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Granary Capacity Meter */}
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="flex items-center gap-1.5 text-amber-500">
                  <Activity className="w-4 h-4" />
                  <span>Total Grain Reserve Occupancy</span>
                </span>
                <span className="font-mono text-base">{GRANARY_METRICS.occupancyPercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-amber-600 rounded-full transition-all duration-1000"
                  style={{ width: `${GRANARY_METRICS.occupancyPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Stored: {GRANARY_METRICS.currentStockQuintals.toLocaleString()} Quintals</span>
                <span>Max Capacity: {GRANARY_METRICS.totalCapacityQuintals.toLocaleString()} Quintals</span>
              </div>
            </div>

            {/* Individual Silos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GRANARY_METRICS.silos.map(silo => (
                <div key={silo.id} className={`p-3.5 rounded-2xl border space-y-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold" style={{ color: silo.color }}>{silo.id}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                      {silo.fillPercent}%
                    </span>
                  </div>
                  <div className="text-xs font-bold truncate">{silo.name}</div>
                  <div className="space-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <div className="flex justify-between">
                      <span>Stock:</span>
                      <span className="font-mono text-slate-200 font-bold">{silo.storedQuintals} Qtl</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Temp / Moisture:</span>
                      <span className="font-mono">{silo.temperatureC}°C / {silo.moisturePercent}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Farmer Grain Deposits */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Farmer Harvest Procurement Receipts:
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {GRANARY_METRICS.recentGrainReceipts.map(rec => (
                  <div key={rec.receiptId} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{rec.farmerName}</span>
                        <span className="text-[10px] text-emerald-500 font-mono">(Sy {rec.surveyNumber}, {rec.village})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Receipt: {rec.receiptId} &bull; {rec.quantityQuintals} Quintals of {rec.crop}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-500">
                        ₹{rec.totalPayment.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Ref: {rec.receiptId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
