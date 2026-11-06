import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Estante, Producto } from '../types';
import {
  AlertTriangle,
  Maximize2,
  Minimize2,
  Search,
  ShoppingCart,
  Printer,
  Settings,
  X,
} from 'lucide-react';

interface Warehouse3DProps {
  racks: Estante[];
  products: Producto[];
  selectedProduct: Producto | null;
  onSelectProduct: (product: Producto | null) => void;
  onSelectZone: (zoneCode: string) => void;
  onGoToPos?: (product: Producto) => void;
  onPrintLabel?: (product: Producto) => void;
  onGoToConfig?: (zoneCode: string) => void;
}

export const Warehouse3D: React.FC<Warehouse3DProps> = ({
  racks,
  products,
  selectedProduct,
  onSelectProduct,
  onSelectZone,
  onGoToPos,
  onPrintLabel,
  onGoToConfig,
}) => {
  const rootContainerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ zoneCode: string; product?: Producto } | null>(null);
  const [pinnedInfo, setPinnedInfo] = useState<{ zoneCode: string; product?: Producto } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Internal Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const binsMapRef = useRef<Map<string, { mesh: THREE.Mesh; zoneCode: string; product?: Producto }>>(new Map());
  const animFrameRef = useRef<number | null>(null);

  // Fullscreen toggle handler (with CSS fallback for iOS/Mobile browsers)
  const toggleFullscreen = () => {
    if (!rootContainerRef.current) return;
    if (document.fullscreenEnabled && rootContainerRef.current.requestFullscreen) {
      if (!document.fullscreenElement) {
        rootContainerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen((prev) => !prev);
          setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        });
      } else {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
          setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        });
      }
    } else {
      setIsFullscreen((prev) => !prev);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      // Trigger canvas resize after transition
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const initialMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const defaultRadius = initialMobile ? 30 : 22;

  // Camera Orbit Control state - Default CCTV Camera Angle matching BodegaReal.jpg
  const camControl = useRef({
    theta: 0,
    phi: 1.05,
    radius: defaultRadius,
    target: new THREE.Vector3(0, 1.2, -1.0),
    desiredTheta: 0,
    desiredPhi: 1.05,
    desiredRadius: defaultRadius,
    desiredTarget: new THREE.Vector3(0, 1.2, -1.0),
    isDragging: false,
    prevX: 0,
    prevY: 0,
  });

  // Focus specific rack
  const focusRack = (rack: Estante) => {
    const ctrl = camControl.current;
    const isNarrow = window.innerWidth < 768;
    ctrl.desiredTarget.set(rack.posX, rack.altoM * 0.45, rack.posZ);
    ctrl.desiredRadius = Math.max(rack.anchoM * (isNarrow ? 2.1 : 1.5), isNarrow ? 9.0 : 6.5);
    ctrl.desiredPhi = 1.08;
    ctrl.desiredTheta = rack.posX < 0 ? -0.35 : 0.35;
  };

  // Preset Views
  const setCameraView = (type: 'cctv' | 'isometric' | 'top') => {
    const ctrl = camControl.current;
    const isNarrow = window.innerWidth < 768;
    if (type === 'cctv') {
      ctrl.desiredTheta = 0;
      ctrl.desiredPhi = 1.05;
      ctrl.desiredRadius = isNarrow ? 30 : 22;
      ctrl.desiredTarget.set(0, 1.2, -1.0);
    } else if (type === 'isometric') {
      ctrl.desiredTheta = 0.65;
      ctrl.desiredPhi = 0.95;
      ctrl.desiredRadius = isNarrow ? 31 : 23;
      ctrl.desiredTarget.set(0, 1.2, 0);
    } else if (type === 'top') {
      ctrl.desiredTheta = 0;
      ctrl.desiredPhi = 0.05;
      ctrl.desiredRadius = isNarrow ? 32 : 24;
      ctrl.desiredTarget.set(0, 0, 0);
    }
  };

  const highlightedZonesRef = useRef<Set<string>>(new Set());

  // Sync highlighted zones whenever selectedProduct, pinnedInfo, or searchQuery changes
  useEffect(() => {
    const set = new Set<string>();
    if (selectedProduct?.ubicacionId) {
      set.add(selectedProduct.ubicacionId);
    }
    if (pinnedInfo?.zoneCode) {
      set.add(pinnedInfo.zoneCode);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      products.forEach((p) => {
        if (
          p.ubicacionId &&
          (p.nombre.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.ubicacionId.toLowerCase().includes(q))
        ) {
          set.add(p.ubicacionId);
        }
      });
    }
    highlightedZonesRef.current = set;
  }, [selectedProduct, pinnedInfo, searchQuery, products]);

  // Fly to selected product if changed externally (e.g. from POS or Inventory)
  useEffect(() => {
    if (selectedProduct && selectedProduct.ubicacionId) {
      setPinnedInfo({ zoneCode: selectedProduct.ubicacionId, product: selectedProduct });
      const binItem = binsMapRef.current.get(selectedProduct.ubicacionId);
      if (binItem) {
        const pos = new THREE.Vector3();
        binItem.mesh.getWorldPosition(pos);
        camControl.current.desiredTarget.copy(pos);
        camControl.current.desiredRadius = window.innerWidth < 768 ? 8.5 : 6.0;
        camControl.current.desiredPhi = 1.15;
      }
    }
  }, [selectedProduct]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window;

    // 1. SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060f1e);
    scene.fog = new THREE.FogExp2(0x060f1e, 0.022);
    sceneRef.current = scene;

    // 2. CAMERA
    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 360);
    const camera = new THREE.PerspectiveCamera(width < height ? 55 : 45, width / height, 0.1, 100);
    cameraRef.current = camera;

    // 3. RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobileDevice,
      powerPreference: isMobileDevice ? 'default' : 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileDevice ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. LIGHTS
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.75);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
    mainLight.position.set(12, 18, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = isMobileDevice ? 512 : 1024;
    mainLight.shadow.mapSize.height = isMobileDevice ? 512 : 1024;
    scene.add(mainLight);

    // Cyan high-tech fill
    const cyanFill = new THREE.PointLight(0x00d4ff, 0.7, 30);
    cyanFill.position.set(-8, 6, -6);
    scene.add(cyanFill);

    // Amber warehouse fill
    const amberFill = new THREE.PointLight(0xf59e0b, 0.45, 30);
    amberFill.position.set(8, 6, 6);
    scene.add(amberFill);

    // 5. WAREHOUSE FLOOR & AISLE MARKINGS
    const floorGeo = new THREE.PlaneGeometry(26, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x091426,
      roughness: 0.75,
      metalness: 0.25,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid lines on floor
    const gridHelper = new THREE.GridHelper(26, 26, 0x00d4ff, 0x142845);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Yellow safety aisle lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const createAisleLine = (x1: number, z1: number, x2: number, z2: number, width = 0.12) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const angle = Math.atan2(x2 - x1, z2 - z1);
      const lineGeo = new THREE.PlaneGeometry(width, len);
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.rotation.z = -angle;
      lineMesh.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
      scene.add(lineMesh);
    };

    // Central traffic lanes for forklift and pallet jack (matching BodegaReal.jpg)
    createAisleLine(-1.8, -9, -1.8, 9);
    createAisleLine(3.5, -9, 3.5, 9);

    // 6. REALISTIC BODEGA ENVIRONMENT ACCENTS (matching BodegaReal.jpg & BodegaReal2.jpg)
    // Perimeter Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c1c33, roughness: 0.9 });

    // Front/Entrance Wall (facing viewer)
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(26, 5, 0.2), wallMat);
    frontWall.position.set(0, 2.5, 10);
    scene.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 20), wallMat);
    leftWall.position.set(-13, 2.5, 0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 20), wallMat);
    rightWall.position.set(13, 2.5, 0);
    scene.add(rightWall);

    // Back wall with cargo roll-up door opening (in the background, exactly as in BodegaReal.jpg)
    const backWallLeft = new THREE.Mesh(new THREE.BoxGeometry(10.5, 5, 0.2), wallMat);
    backWallLeft.position.set(-7.75, 2.5, -10);
    scene.add(backWallLeft);

    const backWallRight = new THREE.Mesh(new THREE.BoxGeometry(10.5, 5, 0.2), wallMat);
    backWallRight.position.set(7.75, 2.5, -10);
    scene.add(backWallRight);

    // Roll-up Shutter Door (Portón de Carga)
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.8, 0.1), shutterMat);
    shutter.position.set(0, 1.9, -10);
    scene.add(shutter);

    // Yellow Caution Header on Roll-up door
    const cautionMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const cautionHeader = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 0.12), cautionMat);
    cautionHeader.position.set(0, 3.9, -10);
    scene.add(cautionHeader);

    // Office Cabin (Oficina Prefabricada en esquina izquierda, al lado del portón, como en BodegaReal.jpg)
    const officeGroup = new THREE.Group();
    officeGroup.position.set(-10.5, 0, -6.8);
    const officeWallsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const officeGlassMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
    });

    const officeBody = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.8, 3.8), officeWallsMat);
    officeBody.position.y = 1.4;
    officeGroup.add(officeBody);

    const officeWindow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.1), officeGlassMat);
    officeWindow.position.set(0.5, 1.5, 1.91);
    officeGroup.add(officeWindow);

    scene.add(officeGroup);

    // Staging Pallet with spare boxes (Zona de Carga central)
    const palletMat = new THREE.MeshStandardMaterial({ color: 0x85542b, roughness: 0.8 });
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.2), palletMat);
    pallet.position.set(0.5, 0.07, -3.5);
    scene.add(pallet);

    const boxMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.9), boxMat);
    cargoBox.position.set(0.5, 0.55, -3.5);
    scene.add(cargoBox);

    // 7. BUILD RACKS (RECTANGULAR & FORMA EN L)
    binsMapRef.current.clear();

    // Shared materials
    const heavyPostMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45, metalness: 0.5 }); // Industrial Royal Blue
    const heavyBeamMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.35, metalness: 0.4 }); // Safety Orange
    const heavyDeckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.3 });
    const footplateMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5, metalness: 0.6 });

    const gondolaPostMat = new THREE.MeshStandardMaterial({ color: 0xd6ccbc, roughness: 0.5, metalness: 0.2 }); // Beige
    const gondolaBackboardMat = new THREE.MeshStandardMaterial({ color: 0xbeaf9b, roughness: 0.7, metalness: 0.1 });
    const gondolaShelfMat = new THREE.MeshStandardMaterial({ color: 0xe5ded3, roughness: 0.4, metalness: 0.2 });
    const gondolaLipMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.3 }); // Blue price rail

    racks.forEach((rack) => {
      const rackGroup = new THREE.Group();
      rackGroup.position.set(rack.posX, 0, rack.posZ);
      rackGroup.rotation.y = (rack.rotacionGrados * Math.PI) / 180;

      const isHeavy = rack.tipoVisual === 'RACK_PESADO';
      const postMaterial = isHeavy ? heavyPostMat : gondolaPostMat;
      const beamMaterial = isHeavy ? heavyBeamMat : gondolaShelfMat;
      const deckMaterial = isHeavy ? heavyDeckMat : gondolaShelfMat;

      const W = rack.anchoM;
      const D = rack.profundidadM;
      const H = rack.altoM;
      const postThickness = isHeavy ? 0.09 : 0.06;

      // Helper to add an upright column with base footplate
      const addColumn = (x: number, z: number) => {
        const colGeo = new THREE.BoxGeometry(postThickness, H, postThickness);
        const colMesh = new THREE.Mesh(colGeo, postMaterial);
        colMesh.position.set(x, H / 2, z);
        colMesh.castShadow = true;
        rackGroup.add(colMesh);

        // Footplate
        const footGeo = new THREE.BoxGeometry(postThickness * 1.6, 0.02, postThickness * 1.6);
        const footMesh = new THREE.Mesh(footGeo, isHeavy ? footplateMat : postMaterial);
        footMesh.position.set(x, 0.01, z);
        rackGroup.add(footMesh);
      };

      if (rack.forma === 'FORMA_L') {
        // --- L-SHAPED CORNER RACK ---
        const L = rack.largoBrazoL || 2.8;

        // Uprights on corner and arms:
        // Arm 1 (Main): from X=0 to X=W at Z=[0, D]
        // Arm 2 (L): from Z=D to Z=L at X=[0, D]
        // Corner posts:
        addColumn(0, 0);
        addColumn(D, 0);
        addColumn(0, D);
        addColumn(D, D);

        // Main arm end posts:
        addColumn(W, 0);
        addColumn(W, D);
        if (W > 3.0) {
          addColumn(W / 2, 0);
          addColumn(W / 2, D);
        }

        // L-arm end posts:
        addColumn(0, L);
        addColumn(D, L);
        if (L > 3.0) {
          addColumn(0, (D + L) / 2);
          addColumn(D, (D + L) / 2);
        }

        // Shelves and load beams for each level
        rack.pisos.forEach((piso) => {
          const py = piso.alturaBaseM;

          // Main arm beams
          const beamW = W - D;
          const mainBeamGeo = new THREE.BoxGeometry(beamW, 0.08, 0.04);
          const mbFront = new THREE.Mesh(mainBeamGeo, beamMaterial);
          mbFront.position.set(D + beamW / 2, py, D);
          rackGroup.add(mbFront);

          const mbBack = new THREE.Mesh(mainBeamGeo, beamMaterial);
          mbBack.position.set(D + beamW / 2, py, 0);
          rackGroup.add(mbBack);

          // L-arm beams
          const beamL = L - D;
          const lBeamGeo = new THREE.BoxGeometry(0.04, 0.08, beamL);
          const lbRight = new THREE.Mesh(lBeamGeo, beamMaterial);
          lbRight.position.set(D, py, D + beamL / 2);
          rackGroup.add(lbRight);

          const lbLeft = new THREE.Mesh(lBeamGeo, beamMaterial);
          lbLeft.position.set(0, py, D + beamL / 2);
          rackGroup.add(lbLeft);

          // Decking: Main arm, L-arm, and Corner bridge plate
          const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(beamW - 0.02, 0.03, D - 0.04), deckMaterial);
          mainDeck.position.set(D + beamW / 2, py + 0.02, D / 2);
          rackGroup.add(mainDeck);

          const lDeck = new THREE.Mesh(new THREE.BoxGeometry(D - 0.04, 0.03, beamL - 0.02), deckMaterial);
          lDeck.position.set(D / 2, py + 0.02, D + beamL / 2);
          rackGroup.add(lDeck);

          const cornerDeck = new THREE.Mesh(new THREE.BoxGeometry(D - 0.04, 0.03, D - 0.04), deckMaterial);
          cornerDeck.position.set(D / 2, py + 0.02, D / 2);
          rackGroup.add(cornerDeck);

          // Separate bins into Main arm vs L-arm
          const mainZones = piso.zonas.filter((z) => (z.brazo || 'PRINCIPAL') === 'PRINCIPAL');
          const lZones = piso.zonas.filter((z) => z.brazo === 'BRAZO_L');

          // If no zones were tagged BRAZO_L, split evenly
          const effectiveMainZones = lZones.length > 0 ? mainZones : piso.zonas.slice(0, Math.ceil(piso.zonas.length / 2));
          const effectiveLZones = lZones.length > 0 ? lZones : piso.zonas.slice(Math.ceil(piso.zonas.length / 2));

          // Render bins on Main arm (distributed along X)
          const mSlotW = (W - D - 0.2) / Math.max(1, effectiveMainZones.length);
          effectiveMainZones.forEach((zona, idx) => {
            const zx = D + 0.1 + mSlotW * idx + mSlotW / 2;
            const zz = D / 2;
            renderBin(zona, zx, py, zz, mSlotW * 0.85, D * 0.75, piso.altoUtilM, rackGroup, rack, piso.nivel);
          });

          // Render bins on L-arm (distributed along Z)
          const lSlotL = (L - D - 0.2) / Math.max(1, effectiveLZones.length);
          effectiveLZones.forEach((zona, idx) => {
            const zx = D / 2;
            const zz = D + 0.1 + lSlotL * idx + lSlotL / 2;
            renderBin(zona, zx, py, zz, D * 0.75, lSlotL * 0.85, piso.altoUtilM, rackGroup, rack, piso.nivel);
          });
        });
      } else {
        // --- STRAIGHT RECTANGULAR RACK ---
        const halfW = W / 2;
        const halfD = D / 2;

        // Uprights
        addColumn(-halfW, -halfD);
        addColumn(halfW, -halfD);
        addColumn(-halfW, halfD);
        addColumn(halfW, halfD);

        // Center uprights if long
        if (W > 3.0) {
          addColumn(0, -halfD);
          addColumn(0, halfD);
        }

        // Gondola perforated central spine (pegboard)
        if (!isHeavy) {
          const spineGeo = new THREE.BoxGeometry(W - 0.08, H * 0.9, 0.03);
          const spineMesh = new THREE.Mesh(spineGeo, gondolaBackboardMat);
          spineMesh.position.set(0, H * 0.48, 0);
          rackGroup.add(spineMesh);

          // Bottom base plinth
          const plinthGeo = new THREE.BoxGeometry(W, 0.14, D * 1.05);
          const plinthMesh = new THREE.Mesh(plinthGeo, gondolaPostMat);
          plinthMesh.position.set(0, 0.07, 0);
          rackGroup.add(plinthMesh);
        }

        // Shelves and load beams
        rack.pisos.forEach((piso) => {
          const py = piso.alturaBaseM;

          if (isHeavy) {
            // Heavy duty load beams
            const beamGeo = new THREE.BoxGeometry(W, 0.08, 0.04);
            const frontBeam = new THREE.Mesh(beamGeo, beamMaterial);
            frontBeam.position.set(0, py, halfD);
            rackGroup.add(frontBeam);

            const backBeam = new THREE.Mesh(beamGeo, beamMaterial);
            backBeam.position.set(0, py, -halfD);
            rackGroup.add(backBeam);
          } else {
            // Gondola price tag channels
            const lipGeo = new THREE.BoxGeometry(W, 0.03, 0.02);
            const frontLip = new THREE.Mesh(lipGeo, gondolaLipMat);
            frontLip.position.set(0, py + 0.03, halfD);
            rackGroup.add(frontLip);

            const backLip = new THREE.Mesh(lipGeo, gondolaLipMat);
            backLip.position.set(0, py + 0.03, -halfD);
            rackGroup.add(backLip);
          }

          // Decking plate
          const deckGeo = new THREE.BoxGeometry(W - 0.04, 0.03, D - 0.04);
          const deck = new THREE.Mesh(deckGeo, deckMaterial);
          deck.position.set(0, py + 0.02, 0);
          deck.receiveShadow = true;
          rackGroup.add(deck);

          // Bins along width
          const numZonas = piso.zonas.length;
          const totalW = W - 0.2;
          const slotW = totalW / numZonas;

          piso.zonas.forEach((zona, zIdx) => {
            const zx = -totalW / 2 + slotW * zIdx + slotW / 2;
            renderBin(zona, zx, py, 0, slotW * 0.85, D * 0.75, piso.altoUtilM, rackGroup, rack, piso.nivel);
          });
        });
      }

      scene.add(rackGroup);
    });

    // Helper to render bin box
    function renderBin(
      zona: any,
      x: number,
      y: number,
      z: number,
      sizeX: number,
      sizeZ: number,
      altoUtilM: number,
      parentGroup: THREE.Group,
      rack: Estante,
      nivel: number
    ) {
      const assignedProd = products.find((p) => p.id === zona.productoId);

      let binColor = 0x334155; // Default free
      let opacity = 0.55;
      let isCritical = false;

      if (assignedProd) {
        if (assignedProd.stockActual <= assignedProd.stockMinimoAlerta) {
          binColor = 0xef4444; // RED CRITICAL (USA Reorder)
          opacity = 0.95;
          isCritical = true;
        } else if (assignedProd.stockActual <= assignedProd.stockMinimoAlerta * 1.5) {
          binColor = 0xf59e0b; // AMBER WARNING
          opacity = 0.85;
        } else {
          binColor = 0x10b981; // GREEN OPTIMAL
          opacity = 0.85;
        }
      }

      const binMat = new THREE.MeshStandardMaterial({
        color: binColor,
        roughness: 0.35,
        metalness: 0.3,
        transparent: !isCritical,
        opacity: opacity,
      });

      const binH = Math.min(altoUtilM * 0.75, 0.45);
      const binGeo = new THREE.BoxGeometry(sizeX, binH, sizeZ);
      const binMesh = new THREE.Mesh(binGeo, binMat);
      binMesh.position.set(x, y + binH / 2 + 0.035, z);
      binMesh.castShadow = true;
      binMesh.receiveShadow = true;

      // Neon wireframe outline for filtered/selected highlight
      const edgesGeo = new THREE.EdgesGeometry(binGeo);
      const outlineMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
      });
      const outlineMesh = new THREE.LineSegments(edgesGeo, outlineMat);
      binMesh.add(outlineMesh);

      binMesh.userData = {
        zoneCode: zona.codigoUbicacion,
        product: assignedProd,
        rackCode: rack.codigo,
        nivel: nivel,
        isCritical: isCritical,
        baseColor: binColor,
        baseOpacity: opacity,
        outlineMat: outlineMat,
      };

      parentGroup.add(binMesh);
      binsMapRef.current.set(zona.codigoUbicacion, {
        mesh: binMesh,
        zoneCode: zona.codigoUbicacion,
        product: assignedProd,
      });
    }

    // 8. MOUSE CONTROLS (Smooth Orbit & Click Raycasting)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      camControl.current.isDragging = true;
      camControl.current.prevX = e.clientX;
      camControl.current.prevY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (camControl.current.isDragging) {
        const deltaX = e.clientX - camControl.current.prevX;
        const deltaY = e.clientY - camControl.current.prevY;
        camControl.current.desiredTheta -= deltaX * 0.007;
        camControl.current.desiredPhi = Math.max(
          0.08,
          Math.min(Math.PI / 2 - 0.02, camControl.current.desiredPhi - deltaY * 0.007)
        );
        camControl.current.prevX = e.clientX;
        camControl.current.prevY = e.clientY;
      } else {
        // Hover Raycasting
        raycaster.setFromCamera(mouse, camera);
        const meshes = Array.from(binsMapRef.current.values()).map((v) => v.mesh);
        const intersects = raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          setHoveredInfo({
            zoneCode: hit.userData.zoneCode,
            product: hit.userData.product,
          });
          container.style.cursor = 'pointer';
        } else {
          setHoveredInfo(null);
          container.style.cursor = 'grab';
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - camControl.current.prevX, e.clientY - camControl.current.prevY);
      camControl.current.isDragging = false;

      // Click detection if not dragged
      if (dist < 4) {
        raycaster.setFromCamera(mouse, camera);
        const meshes = Array.from(binsMapRef.current.values()).map((v) => v.mesh);
        const intersects = raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          const zoneCode = hit.userData.zoneCode;
          const prod = hit.userData.product;

          setPinnedInfo({ zoneCode, product: prod });
          onSelectZone(zoneCode);
          if (prod) {
            onSelectProduct(prod);
          } else {
            onSelectProduct(null);
          }
        } else {
          setPinnedInfo(null);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camControl.current.desiredRadius = Math.max(
        4,
        Math.min(38, camControl.current.desiredRadius + e.deltaY * 0.015)
      );
    };

    // 8b. TOUCH CONTROLS (Mobile 1-Finger Orbit, 2-Finger Pinch Zoom & Tap Raycasting)
    let touchStartX = 0;
    let touchStartY = 0;
    let lastPinchDist = 0;
    let lastTouchCenterX = 0;
    let lastTouchCenterY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        camControl.current.isDragging = true;
        camControl.current.prevX = t.clientX;
        camControl.current.prevY = t.clientY;
      } else if (e.touches.length === 2) {
        camControl.current.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.hypot(dx, dy);
        lastTouchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        lastTouchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();

      if (e.touches.length === 1 && camControl.current.isDragging) {
        const t = e.touches[0];
        const deltaX = t.clientX - camControl.current.prevX;
        const deltaY = t.clientY - camControl.current.prevY;
        camControl.current.desiredTheta -= deltaX * 0.008;
        camControl.current.desiredPhi = Math.max(
          0.08,
          Math.min(Math.PI / 2 - 0.02, camControl.current.desiredPhi - deltaY * 0.008)
        );
        camControl.current.prevX = t.clientX;
        camControl.current.prevY = t.clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);

        if (lastPinchDist > 0) {
          const pinchDelta = lastPinchDist - dist;
          camControl.current.desiredRadius = Math.max(
            4,
            Math.min(42, camControl.current.desiredRadius + pinchDelta * 0.045)
          );
        }
        lastPinchDist = dist;

        // 2-finger pan
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const panX = (centerX - lastTouchCenterX) * 0.015;
        const panZ = (centerY - lastTouchCenterY) * 0.015;
        camControl.current.desiredTarget.x = Math.max(-12, Math.min(12, camControl.current.desiredTarget.x - panX));
        camControl.current.desiredTarget.z = Math.max(-10, Math.min(10, camControl.current.desiredTarget.z - panZ));
        lastTouchCenterX = centerX;
        lastTouchCenterY = centerY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      camControl.current.isDragging = false;
      lastPinchDist = 0;

      if (e.changedTouches.length === 1) {
        const t = e.changedTouches[0];
        const moveDist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
        if (moveDist < 12) {
          const rect = container.getBoundingClientRect();
          mouse.x = ((t.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((t.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(mouse, camera);
          const meshes = Array.from(binsMapRef.current.values()).map((v) => v.mesh);
          const intersects = raycaster.intersectObjects(meshes, false);

          if (intersects.length > 0) {
            const hit = intersects[0].object;
            const zoneCode = hit.userData.zoneCode;
            const prod = hit.userData.product;

            setPinnedInfo({
              zoneCode,
              product: prod,
            });
            setHoveredInfo({
              zoneCode,
              product: prod,
            });
            onSelectZone(zoneCode);
            onSelectProduct(prod || null);
          } else {
            setPinnedInfo(null);
            setHoveredInfo(null);
          }
        }
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    // 9. RESIZE LISTENER & RESIZE OBSERVER
    const onResize = () => {
      if (!container || !camera || !renderer) return;
      const w = Math.max(container.clientWidth, 280);
      const h = Math.max(container.clientHeight, 320);
      camera.fov = w < h ? 55 : 45;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => onResize()) : null;
    if (resizeObserver) resizeObserver.observe(container);

    // 10. ANIMATION LOOP
    let pulseTime = 0;
    const animate = () => {
      pulseTime += 0.04;
      const ctrl = camControl.current;

      // Smooth camera interpolation
      ctrl.theta += (ctrl.desiredTheta - ctrl.theta) * 0.08;
      ctrl.phi += (ctrl.desiredPhi - ctrl.phi) * 0.08;
      ctrl.radius += (ctrl.desiredRadius - ctrl.radius) * 0.08;
      ctrl.target.lerp(ctrl.desiredTarget, 0.08);

      camera.position.x = ctrl.target.x + ctrl.radius * Math.sin(ctrl.phi) * Math.sin(ctrl.theta);
      camera.position.y = ctrl.target.y + ctrl.radius * Math.cos(ctrl.phi);
      camera.position.z = ctrl.target.z + ctrl.radius * Math.sin(ctrl.phi) * Math.cos(ctrl.theta);
      camera.lookAt(ctrl.target);

      // Pulse highlighted/filtered bins in Electric Blue, and critical bins in Red
      const pulse = (Math.sin(pulseTime * 3) + 1) / 2;
      const fastPulse = (Math.sin(pulseTime * 6) + 1) / 2;

      binsMapRef.current.forEach(({ mesh, zoneCode }) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const outlineMat = mesh.userData.outlineMat as THREE.LineBasicMaterial | undefined;
        const isHighlighted = highlightedZonesRef.current.has(zoneCode);

        if (isHighlighted) {
          mat.color.setHex(0x0088ff); // Electric Blue
          mat.emissive.setHex(0x00f0ff); // Neon Cyan Flash
          mat.emissiveIntensity = 0.65 + fastPulse * 1.15;
          mat.opacity = 1.0;
          if (outlineMat) outlineMat.opacity = 0.95;
          const s = 1 + fastPulse * 0.14;
          mesh.scale.set(s, s, s);
        } else {
          mat.color.setHex(mesh.userData.baseColor ?? 0x334155);
          mat.opacity = mesh.userData.baseOpacity ?? 0.85;
          if (outlineMat) outlineMat.opacity = 0;
          mesh.scale.set(1, 1, 1);

          if (mesh.userData.isCritical) {
            mat.emissive.setHex(0xff0000);
            mat.emissiveIntensity = 0.35 + pulse * 0.65;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      });

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
    };
  }, [racks, products]);

  // Statistics counters
  const totalSlots = racks.reduce(
    (acc, r) => acc + r.pisos.reduce((pAcc, p) => pAcc + p.zonas.length, 0),
    0
  );
  const occupiedSlots = products.filter((p) => p.ubicacionId).length;
  const criticalProducts = products.filter((p) => p.stockActual <= p.stockMinimoAlerta);

  // Quick 3D search matches
  const searchResults =
    searchQuery.trim().length > 0
      ? products.filter(
          (p) =>
            p.ubicacionId &&
            (p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.ubicacionId.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : [];

  const handleSelectSearchResult = (prod: Producto) => {
    setSearchQuery('');
    if (prod.ubicacionId) {
      setPinnedInfo({ zoneCode: prod.ubicacionId, product: prod });
      onSelectZone(prod.ubicacionId);
      onSelectProduct(prod);
      const binItem = binsMapRef.current.get(prod.ubicacionId);
      if (binItem) {
        const pos = new THREE.Vector3();
        binItem.mesh.getWorldPosition(pos);
        camControl.current.desiredTarget.copy(pos);
        camControl.current.desiredRadius = window.innerWidth < 768 ? 8.5 : 6.0;
        camControl.current.desiredPhi = 1.15;
      }
    }
  };

  const activeInfo = pinnedInfo || hoveredInfo;

  return (
    <div
      ref={rootContainerRef}
      className={`relative w-full bg-[#06101e] overflow-hidden border border-[#00d4ff]/30 shadow-2xl flex flex-col transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-[100dvh] w-screen rounded-none border-none'
          : 'h-[520px] sm:h-[650px] rounded-xl'
      }`}
    >
      {/* Top HUD Control Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
        {/* Left Status, Telemetry & Quick 3D Search */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0c1c33]/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-[#00d4ff]/30 shadow-lg">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-[11px] sm:text-xs font-bold text-white tracking-wider">GEMELO 3D</span>
            <span className="text-[11px] sm:text-xs text-slate-400 border-l border-slate-700 pl-2">
              Casillas: <strong className="text-cyan-400">{occupiedSlots}</strong>/{totalSlots}
            </span>
            <span className="text-[11px] sm:text-xs text-red-400 border-l border-slate-700 pl-2 flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
              <span>Críticos:</span> <strong>{criticalProducts.length}</strong>
            </span>
          </div>

          {/* Quick Search inside 3D */}
          <div className="relative">
            <div className="flex items-center bg-[#0c1c33]/95 backdrop-blur-md border border-cyan-500/40 rounded-lg px-2.5 py-1 shadow-lg">
              <Search className="w-3.5 h-3.5 text-cyan-400 mr-1.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto o casilla en 3D..."
                className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute left-0 mt-1 w-72 bg-[#091528]/98 backdrop-blur-md border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden z-30 max-h-56 overflow-y-auto">
                {searchResults.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => handleSelectSearchResult(prod)}
                    className="w-full text-left px-3 py-2 hover:bg-cyan-500/20 border-b border-slate-800/80 last:border-none flex items-center justify-between gap-2 transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{prod.nombre}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        SKU: {prod.sku} • Stock: {prod.stockActual} uds
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30 shrink-0">
                      {prod.ubicacionId}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Dynamic Camera Preset Controls & Fullscreen Toggle */}
        <div className="flex items-center gap-1.5 pointer-events-auto max-w-full">
          <div className="flex items-center gap-1 bg-[#0c1c33]/90 backdrop-blur-md p-1 rounded-lg border border-[#00d4ff]/30 shadow-lg overflow-x-auto max-w-[68vw] sm:max-w-[55vw]">
            <button
              onClick={() => setCameraView('cctv')}
              className="px-2 py-1 text-[11px] sm:text-xs font-bold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 rounded transition whitespace-nowrap"
              title="Vista idéntica a la cámara de seguridad (BodegaReal.jpg)"
            >
              Cámara Real
            </button>
            <button
              onClick={() => setCameraView('isometric')}
              className="px-2 py-1 text-[11px] sm:text-xs font-medium text-slate-200 hover:text-cyan-300 hover:bg-[#112645] rounded transition whitespace-nowrap"
              title="Vista Isométrica 360°"
            >
              Isométrica
            </button>
            <button
              onClick={() => setCameraView('top')}
              className="px-2 py-1 text-[11px] sm:text-xs font-medium text-slate-200 hover:text-cyan-300 hover:bg-[#112645] rounded transition whitespace-nowrap"
              title="Plano Cenital Superior"
            >
              Cenital
            </button>

            {/* Dynamic Pill for Every Rack */}
            <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />
            {racks.map((rack) => (
              <button
                key={rack.id}
                onClick={() => focusRack(rack)}
                className="px-2 py-0.5 text-[11px] font-mono font-bold text-cyan-300 hover:text-slate-950 hover:bg-cyan-400 rounded transition whitespace-nowrap bg-[#06101e] border border-cyan-500/30"
                title={`Enfocar ${rack.nombre} (${rack.forma})`}
              >
                {rack.codigo}
                {rack.forma === 'FORMA_L' && <span className="text-[9px] text-amber-400 ml-0.5">(L)</span>}
              </button>
            ))}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap shadow-lg backdrop-blur-md ${
              isFullscreen
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
            }`}
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Expandir mapa 3D a pantalla completa'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir Pantalla Completa</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pantalla Completa</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full flex-1 min-h-0 touch-none select-none cursor-grab active:cursor-grabbing"
      />

      {/* Floating Interactive Information & Action Card */}
      {activeInfo && (
        <div className="absolute bottom-4 left-4 z-20 bg-[#0c1c33]/95 backdrop-blur-md p-3.5 rounded-xl border border-[#00d4ff]/50 shadow-2xl max-w-sm pointer-events-auto transition-all">
          <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5 mb-2">
            <span className="text-xs font-bold font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {activeInfo.zoneCode}
            </span>
            <div className="flex items-center gap-1.5">
              {activeInfo.product ? (
                activeInfo.product.stockActual <= activeInfo.product.stockMinimoAlerta ? (
                  <span className="text-[10px] font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/40 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> CRÍTICO: PEDIR {activeInfo.product.cantidadReordenSugerida}
                  </span>
                ) : activeInfo.product.stockActual <= activeInfo.product.stockMinimoAlerta * 1.5 ? (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" /> STOCK PREVENTIVO (≤
                    {Math.round(activeInfo.product.stockMinimoAlerta * 1.5)})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    STOCK SALUDABLE
                  </span>
                )
              ) : (
                <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                  CASILLA DISPONIBLE
                </span>
              )}

              {pinnedInfo && (
                <button
                  onClick={() => {
                    setPinnedInfo(null);
                    setHoveredInfo(null);
                    onSelectProduct(null);
                  }}
                  className="text-slate-400 hover:text-white p-0.5 rounded"
                  title="Cerrar tarjeta"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {activeInfo.product ? (
            <div>
              <p className="text-sm font-bold text-white line-clamp-1">{activeInfo.product.nombre}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300">
                <span>
                  SKU: <strong className="text-slate-100 font-mono">{activeInfo.product.sku}</strong>
                </span>
                <span>
                  Stock:{' '}
                  <strong
                    className={
                      activeInfo.product.stockActual <= activeInfo.product.stockMinimoAlerta
                        ? 'text-red-400 font-bold'
                        : activeInfo.product.stockActual <= activeInfo.product.stockMinimoAlerta * 1.5
                        ? 'text-amber-400 font-bold'
                        : 'text-emerald-400'
                    }
                  >
                    {activeInfo.product.stockActual} uds
                  </strong>
                </span>
                <span>
                  Precio:{' '}
                  <strong className="text-cyan-300">
                    L. {activeInfo.product.precioVentaHnl.toLocaleString()}
                  </strong>
                </span>
              </div>

              {/* Action buttons when interacting with a slot */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
                {onGoToPos && (
                  <button
                    onClick={() => onGoToPos(activeInfo.product!)}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    <span>Vender en POS</span>
                  </button>
                )}
                {onPrintLabel && (
                  <button
                    onClick={() => onPrintLabel(activeInfo.product!)}
                    className="bg-[#112645] hover:bg-slate-700 text-cyan-300 font-bold text-[11px] py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 border border-cyan-500/30 transition cursor-pointer"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Viñeta</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 italic">
                Casilla libre en el estante. Puedes asignarle un producto desde el configurador.
              </p>
              {onGoToConfig && (
                <button
                  onClick={() => onGoToConfig(activeInfo.zoneCode)}
                  className="w-full bg-[#112645] hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-[11px] py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 border border-cyan-500/30 transition cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Asignar Producto a {activeInfo.zoneCode}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Right Accurate Legend */}
      <div className="absolute bottom-3 right-3 z-10 bg-[#0c1c33]/85 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/60 flex flex-wrap items-center gap-3 text-[11px] pointer-events-none text-slate-300 shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 animate-ping" />
          <span className="text-cyan-300 font-bold">Buscado / Seleccionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>Óptimo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span>Preventivo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500 animate-pulse" />
          <span>Crítico (Pedir)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 opacity-60" />
          <span>Libre</span>
        </div>
      </div>
    </div>
  );
};