import React, { useState } from 'react';
import type { Estante, Producto, PisoEstante, ZonaEstante, FormaEstante, TipoEstanteria } from '../types';
import {
  Layers,
  Plus,
  Check,
  Settings,
  Box,
  Trash2,
  Copy,
  RotateCw,
  Move,
  LayoutGrid,
  CheckCircle2,
  X,
  Warehouse,
  Maximize2,
} from 'lucide-react';

interface RackConfiguratorProps {
  racks: Estante[];
  products: Producto[];
  onUpdateRacks: (newRacks: Estante[]) => void;
  onUpdateProducts: (newProducts: Producto[]) => void;
  onSwitchTo3D: () => void;
}

export const RackConfigurator: React.FC<RackConfiguratorProps> = ({
  racks,
  products,
  onUpdateRacks,
  onUpdateProducts,
  onSwitchTo3D,
}) => {
  const [selectedRackId, setSelectedRackId] = useState<string>(racks[0]?.id || '');
  const [saveAlert, setSaveAlert] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState<boolean>(false);

  // New Rack Form State
  const [newRackForm, setNewRackForm] = useState<{
    codigo: string;
    nombre: string;
    categoria: string;
    forma: FormaEstante;
    tipoVisual: TipoEstanteria;
    anchoM: number;
    largoBrazoL: number;
    profundidadM: number;
    altoM: number;
    posX: number;
    posZ: number;
    rotacionGrados: number;
    numPisos: number;
    casillasPorPiso: number;
  }>({
    codigo: `EST-${String.fromCharCode(65 + racks.length)}`,
    nombre: `Estante ${String.fromCharCode(65 + racks.length)} - Repuestos`,
    categoria: 'General y Accesorios',
    forma: 'RECTANGULAR',
    tipoVisual: 'GONDOLA_COMERCIAL',
    anchoM: 4.0,
    largoBrazoL: 2.8,
    profundidadM: 0.8,
    altoM: 2.0,
    posX: 0,
    posZ: 0,
    rotacionGrados: 0,
    numPisos: 3,
    casillasPorPiso: 2,
  });

  const currentRack = racks.find((r) => r.id === selectedRackId) || racks[0];

  const triggerNotification = (msg: string) => {
    setSaveAlert(msg);
    setTimeout(() => setSaveAlert(null), 3500);
  };

  // --- ACTIONS ON CURRENT RACK ---

  // Update a physical or geometric property of the current rack
  const handleUpdateCurrentRackProperty = <K extends keyof Estante>(key: K, value: Estante[K]) => {
    if (!currentRack) return;

    const updatedRack: Estante = {
      ...currentRack,
      [key]: value,
    };

    // If switching to Forma L and largoBrazoL was not defined, set default
    if (key === 'forma' && value === 'FORMA_L' && !updatedRack.largoBrazoL) {
      updatedRack.largoBrazoL = 2.8;
    }

    onUpdateRacks(racks.map((r) => (r.id === currentRack.id ? updatedRack : r)));
  };

  // Duplicate current rack
  const handleDuplicateCurrentRack = () => {
    if (!currentRack) return;

    const nextChar = String.fromCharCode(65 + racks.length);
    const newCode = `EST-${nextChar}`;
    const duplicatedRack: Estante = {
      ...currentRack,
      id: `rack-${Date.now()}`,
      codigo: newCode,
      nombre: `${currentRack.nombre} (Copia)`,
      posX: currentRack.posX + 1.2,
      posZ: currentRack.posZ + 1.2,
      pisos: currentRack.pisos.map((p, pIdx) => ({
        ...p,
        id: `piso-${newCode.toLowerCase()}-${pIdx + 1}`,
        zonas: p.zonas.map((z, zIdx) => ({
          ...z,
          id: `z-${newCode.toLowerCase()}-${pIdx + 1}-${zIdx + 1}`,
          codigoUbicacion: `${newCode}-P0${p.nivel}-${z.brazo === 'BRAZO_L' ? 'L' : 'Z'}0${zIdx + 1}`,
          productoId: undefined, // Empty slots by default on duplicate
        })),
      })),
    };

    const newRacks = [...racks, duplicatedRack];
    onUpdateRacks(newRacks);
    setSelectedRackId(duplicatedRack.id);
    triggerNotification(`¡Estante duplicado con éxito como ${newCode}!`);
  };

  // Delete current rack
  const handleDeleteCurrentRack = () => {
    if (!currentRack) return;
    if (racks.length <= 1) {
      alert('Debe haber al menos un estante configurado en la bodega.');
      return;
    }

    if (
      !confirm(
        `¿Confirmas eliminar el ${currentRack.nombre} (${currentRack.codigo})? Los repuestos asignados quedarán libres para reubicar.`
      )
    ) {
      return;
    }

    // Unassign products mapped to this rack's zones
    const rackZoneCodes = new Set(
      currentRack.pisos.flatMap((p) => p.zonas.map((z) => z.codigoUbicacion))
    );

    const updatedProducts = products.map((p) =>
      p.ubicacionId && rackZoneCodes.has(p.ubicacionId) ? { ...p, ubicacionId: undefined } : p
    );
    onUpdateProducts(updatedProducts);

    const remainingRacks = racks.filter((r) => r.id !== currentRack.id);
    onUpdateRacks(remainingRacks);
    setSelectedRackId(remainingRacks[0].id);
    triggerNotification(`Estante ${currentRack.codigo} eliminado.`);
  };

  // Add a new level to the current rack
  const handleAddLevel = () => {
    if (!currentRack) return;

    const newLevelNumber = currentRack.pisos.length + 1;
    const isL = currentRack.forma === 'FORMA_L';

    const defaultZonas: ZonaEstante[] = isL
      ? [
          {
            id: `z-${currentRack.codigo.toLowerCase()}-${newLevelNumber}-1`,
            codigoUbicacion: `${currentRack.codigo}-P0${newLevelNumber}-Z01`,
            ordenIzquierda: 1,
            porcentajeAncho: 50,
            brazo: 'PRINCIPAL',
          },
          {
            id: `z-${currentRack.codigo.toLowerCase()}-${newLevelNumber}-2`,
            codigoUbicacion: `${currentRack.codigo}-P0${newLevelNumber}-Z02`,
            ordenIzquierda: 2,
            porcentajeAncho: 50,
            brazo: 'PRINCIPAL',
          },
          {
            id: `z-${currentRack.codigo.toLowerCase()}-${newLevelNumber}-3`,
            codigoUbicacion: `${currentRack.codigo}-P0${newLevelNumber}-L01`,
            ordenIzquierda: 3,
            porcentajeAncho: 50,
            brazo: 'BRAZO_L',
          },
          {
            id: `z-${currentRack.codigo.toLowerCase()}-${newLevelNumber}-4`,
            codigoUbicacion: `${currentRack.codigo}-P0${newLevelNumber}-L02`,
            ordenIzquierda: 4,
            porcentajeAncho: 50,
            brazo: 'BRAZO_L',
          },
        ]
      : [
          {
            id: `z-${currentRack.codigo.toLowerCase()}-${newLevelNumber}-1`,
            codigoUbicacion: `${currentRack.codigo}-P0${newLevelNumber}-Z01`,
            ordenIzquierda: 1,
            porcentajeAncho: 50,
            brazo: 'PRINCIPAL',
          },
          {
            id: `z-${currentRack.codigo.toLowerCase()}-${newLevelNumber}-2`,
            codigoUbicacion: `${currentRack.codigo}-P0${newLevelNumber}-Z02`,
            ordenIzquierda: 2,
            porcentajeAncho: 50,
            brazo: 'PRINCIPAL',
          },
        ];

    const newPiso: PisoEstante = {
      id: `piso-${currentRack.codigo.toLowerCase()}-${newLevelNumber}`,
      nivel: newLevelNumber,
      alturaBaseM: 0.25 + (newLevelNumber - 1) * 0.7,
      altoUtilM: 0.6,
      zonas: defaultZonas,
    };

    const updatedRack = {
      ...currentRack,
      pisos: [...currentRack.pisos, newPiso],
    };

    onUpdateRacks(racks.map((r) => (r.id === currentRack.id ? updatedRack : r)));
    triggerNotification(`¡Piso ${newLevelNumber} agregado al ${currentRack.nombre}!`);
  };

  // Delete a level
  const handleDeleteLevel = (levelIndex: number) => {
    if (!currentRack) return;
    if (currentRack.pisos.length <= 1) {
      alert('El estante debe tener al menos un piso.');
      return;
    }

    const pisoToRemove = currentRack.pisos[levelIndex];
    const removedZoneCodes = new Set(pisoToRemove.zonas.map((z) => z.codigoUbicacion));

    // Free any assigned products
    const updatedProducts = products.map((p) =>
      p.ubicacionId && removedZoneCodes.has(p.ubicacionId) ? { ...p, ubicacionId: undefined } : p
    );
    onUpdateProducts(updatedProducts);

    const updatedPisos = currentRack.pisos
      .filter((_, idx) => idx !== levelIndex)
      .map((p, idx) => ({ ...p, nivel: idx + 1 }));

    const updatedRack = { ...currentRack, pisos: updatedPisos };
    onUpdateRacks(racks.map((r) => (r.id === currentRack.id ? updatedRack : r)));
    triggerNotification(`Piso ${pisoToRemove.nivel} eliminado.`);
  };

  // Add a zone (division) into a specific level, allowing choice of arm for L-shape
  const handleAddZoneToLevel = (levelIndex: number, targetArm: 'PRINCIPAL' | 'BRAZO_L' = 'PRINCIPAL') => {
    if (!currentRack) return;

    const targetPiso = currentRack.pisos[levelIndex];
    const armZones = targetPiso.zonas.filter((z) => (z.brazo || 'PRINCIPAL') === targetArm);
    const newSubIndex = armZones.length + 1;
    const prefix = targetArm === 'BRAZO_L' ? 'L' : 'Z';
    const zoneCode = `${currentRack.codigo}-P0${targetPiso.nivel}-${prefix}0${newSubIndex}`;

    const newZone: ZonaEstante = {
      id: `z-${currentRack.codigo.toLowerCase()}-${targetPiso.nivel}-${prefix.toLowerCase()}${newSubIndex}-${Date.now()}`,
      codigoUbicacion: zoneCode,
      ordenIzquierda: targetPiso.zonas.length + 1,
      porcentajeAncho: Math.floor(100 / (armZones.length + 1)),
      brazo: targetArm,
    };

    const updatedZonas = [...targetPiso.zonas, newZone];
    const updatedPisos = currentRack.pisos.map((p, idx) =>
      idx === levelIndex ? { ...p, zonas: updatedZonas } : p
    );

    const updatedRack = { ...currentRack, pisos: updatedPisos };
    onUpdateRacks(racks.map((r) => (r.id === currentRack.id ? updatedRack : r)));
    triggerNotification(`¡Casilla ${zoneCode} agregada al Piso ${targetPiso.nivel}!`);
  };

  // Assign product to a specific zone
  const handleAssignProductToZone = (zoneId: string, zoneCode: string, productId: string) => {
    if (!currentRack) return;

    const updatedPisos = currentRack.pisos.map((piso) => ({
      ...piso,
      zonas: piso.zonas.map((zona) =>
        zona.id === zoneId ? { ...zona, productoId: productId || undefined } : zona
      ),
    }));

    const updatedRacks = racks.map((r) => (r.id === currentRack.id ? { ...r, pisos: updatedPisos } : r));
    onUpdateRacks(updatedRacks);

    const updatedProducts = products.map((prod) => {
      if (prod.id === productId) {
        return { ...prod, ubicacionId: zoneCode };
      }
      if (prod.ubicacionId === zoneCode && prod.id !== productId) {
        return { ...prod, ubicacionId: undefined };
      }
      return prod;
    });

    onUpdateProducts(updatedProducts);
    triggerNotification(`¡Producto vinculado exitosamente a la casilla ${zoneCode}!`);
  };

  // --- SUBMIT CREATE NEW RACK MODAL ---
  const handleCreateNewRack = (e: React.FormEvent) => {
    e.preventDefault();

    const newRackId = `rack-${Date.now()}`;
    const code = newRackForm.codigo.trim().toUpperCase() || `EST-${String.fromCharCode(65 + racks.length)}`;

    // Build initial levels and slots
    const initialPisos: PisoEstante[] = [];
    const heightPerLevel = newRackForm.altoM / newRackForm.numPisos;

    for (let i = 1; i <= newRackForm.numPisos; i++) {
      const zonas: ZonaEstante[] = [];

      // Main arm slots
      for (let j = 1; j <= newRackForm.casillasPorPiso; j++) {
        zonas.push({
          id: `z-${code.toLowerCase()}-${i}-z0${j}`,
          codigoUbicacion: `${code}-P0${i}-Z0${j}`,
          ordenIzquierda: j,
          porcentajeAncho: Math.floor(100 / newRackForm.casillasPorPiso),
          brazo: 'PRINCIPAL',
        });
      }

      // If L-shape, add secondary arm slots
      if (newRackForm.forma === 'FORMA_L') {
        const lSlotsCount = Math.max(1, Math.round(newRackForm.casillasPorPiso * 0.75));
        for (let k = 1; k <= lSlotsCount; k++) {
          zonas.push({
            id: `z-${code.toLowerCase()}-${i}-l0${k}`,
            codigoUbicacion: `${code}-P0${i}-L0${k}`,
            ordenIzquierda: newRackForm.casillasPorPiso + k,
            porcentajeAncho: Math.floor(100 / lSlotsCount),
            brazo: 'BRAZO_L',
          });
        }
      }

      initialPisos.push({
        id: `piso-${code.toLowerCase()}-${i}`,
        nivel: i,
        alturaBaseM: +(0.2 + (i - 1) * heightPerLevel).toFixed(2),
        altoUtilM: +(heightPerLevel * 0.8).toFixed(2),
        zonas,
      });
    }

    const createdRack: Estante = {
      id: newRackId,
      codigo: code,
      nombre: newRackForm.nombre.trim() || `Estante ${code}`,
      categoria: newRackForm.categoria.trim() || 'General',
      forma: newRackForm.forma,
      tipoVisual: newRackForm.tipoVisual,
      anchoM: Number(newRackForm.anchoM),
      largoBrazoL: newRackForm.forma === 'FORMA_L' ? Number(newRackForm.largoBrazoL) : undefined,
      profundidadM: Number(newRackForm.profundidadM),
      altoM: Number(newRackForm.altoM),
      posX: Number(newRackForm.posX),
      posZ: Number(newRackForm.posZ),
      rotacionGrados: Number(newRackForm.rotacionGrados),
      pisos: initialPisos,
    };

    onUpdateRacks([...racks, createdRack]);
    setSelectedRackId(newRackId);
    setIsCreateModalOpen(false);
    triggerNotification(`¡Nuevo estante ${createdRack.codigo} creado y renderizado en la Bodega 3D!`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-[#0c1c33] border border-[#00d4ff]/30 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <span>Configurador Paramétrico de Estantes y Formas 3D</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Diseña los estantes físicos de la bodega en Roatán: dibuja formas (Rectangulares o en 'L'), define alturas, estilos visuales y asocia repuestos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setNewRackForm({
                codigo: `EST-${String.fromCharCode(65 + racks.length)}`,
                nombre: `Estante ${String.fromCharCode(65 + racks.length)} - Repuestos`,
                categoria: 'General y Accesorios',
                forma: 'RECTANGULAR',
                tipoVisual: 'GONDOLA_COMERCIAL',
                anchoM: 4.2,
                largoBrazoL: 2.8,
                profundidadM: 0.8,
                altoM: 2.2,
                posX: 0,
                posZ: 0,
                rotacionGrados: 0,
                numPisos: 3,
                casillasPorPiso: 2,
              });
              setIsCreateModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Estante</span>
          </button>

          <button
            onClick={onSwitchTo3D}
            className="bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-cyan-500/20"
          >
            <Box className="w-4 h-4" />
            <span>Ver Cambios en Bodega 3D</span>
          </button>
        </div>
      </div>

      {saveAlert && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 p-3.5 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveAlert}</span>
        </div>
      )}

      {/* RACK SELECTOR TABS */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex gap-2 overflow-x-auto text-xs py-1">
          {racks.map((rack) => (
            <button
              key={rack.id}
              onClick={() => setSelectedRackId(rack.id)}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition shrink-0 ${
                selectedRackId === rack.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-[#0c1c33] text-slate-300 hover:bg-[#112645] border border-slate-700/60'
              }`}
            >
              <span className="font-mono">{rack.codigo}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-mono font-semibold bg-black/30">
                {rack.forma === 'FORMA_L' ? 'L-Corner' : 'Recto'}
              </span>
              <span className="font-normal opacity-80 truncate max-w-[140px]">
                ({rack.nombre.split('-')[1] || rack.nombre})
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 ml-3 shrink-0 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo</span>
        </button>
      </div>

      {/* CURRENT RACK STRUCTURE EDITOR */}
      {currentRack && (
        <div className="space-y-6">
          {/* SECTION 1: SHAPE, STYLE & PHYSICAL BLUEPRINT */}
          <div className="bg-[#0c1c33] border border-[#00d4ff]/30 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-cyan-400" />
                  <span>Configuración Geométrica y Dimensiones Físicas</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Modifica la forma física, el estilo visual (Góndola vs Industrial), coordenadas y orientación en la bodega.
                </p>
              </div>

              {/* Action buttons: Duplicate / Delete */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicateCurrentRack}
                  className="bg-[#112645] hover:bg-[#173561] text-cyan-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition border border-cyan-500/30"
                  title="Duplicar este estante con su estructura"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicar</span>
                </button>
                <button
                  onClick={handleDeleteCurrentRack}
                  className="bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition border border-red-500/40"
                  title="Eliminar este estante"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column: Shape & Style Selector */}
              <div className="space-y-4">
                {/* Shape Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-2">
                    Forma Geométrica del Estante:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentRackProperty('forma', 'RECTANGULAR')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition ${
                        currentRack.forma === 'RECTANGULAR'
                          ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-[#06101e] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-4 rounded bg-cyan-400/80 border border-cyan-300" />
                        {currentRack.forma === 'RECTANGULAR' && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <div>
                        <strong className="text-xs block text-white">Rectangular</strong>
                        <span className="text-[10px] text-slate-400">Pasillo recto continuo</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentRackProperty('forma', 'FORMA_L')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition ${
                        currentRack.forma === 'FORMA_L'
                          ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-[#06101e] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* L-Shape visual icon */}
                        <div className="relative w-7 h-7">
                          <div className="absolute top-0 left-0 w-3 h-7 bg-cyan-400/80 rounded-t" />
                          <div className="absolute bottom-0 left-0 w-7 h-3 bg-cyan-400/80 rounded-r" />
                        </div>
                        {currentRack.forma === 'FORMA_L' && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <div>
                        <strong className="text-xs block text-white">Forma en 'L'</strong>
                        <span className="text-[10px] text-slate-400">Esquinas perimetrales</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Style Selector: Commercial Gondola vs Industrial Pallet Rack */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-2">
                    Tipo Visual / Acabado Físico:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentRackProperty('tipoVisual', 'GONDOLA_COMERCIAL')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition ${
                        currentRack.tipoVisual === 'GONDOLA_COMERCIAL'
                          ? 'bg-amber-950/40 border-amber-400 text-white'
                          : 'bg-[#06101e] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-3 h-3 rounded-full bg-[#d6ccbc] border border-amber-400" />
                        {currentRack.tipoVisual === 'GONDOLA_COMERCIAL' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                      <strong className="text-xs text-white">Góndola Comercial</strong>
                      <span className="text-[10px] text-slate-400">Beige con panel ranurado central</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentRackProperty('tipoVisual', 'RACK_PESADO')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition ${
                        currentRack.tipoVisual === 'RACK_PESADO'
                          ? 'bg-blue-950/40 border-blue-400 text-white'
                          : 'bg-[#06101e] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                        </div>
                        {currentRack.tipoVisual === 'RACK_PESADO' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </div>
                      <strong className="text-xs text-white">Rack Pesado Industrial</strong>
                      <span className="text-[10px] text-slate-400">Azul / Naranja para palets</span>
                    </button>
                  </div>
                </div>

                {/* Name & Code */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Código Estante:</label>
                    <input
                      type="text"
                      value={currentRack.codigo}
                      onChange={(e) => handleUpdateCurrentRackProperty('codigo', e.target.value.toUpperCase())}
                      className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Categoría:</label>
                    <input
                      type="text"
                      value={currentRack.categoria}
                      onChange={(e) => handleUpdateCurrentRackProperty('categoria', e.target.value)}
                      className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 block mb-1">Nombre Descriptivo:</label>
                    <input
                      type="text"
                      value={currentRack.nombre}
                      onChange={(e) => handleUpdateCurrentRackProperty('nombre', e.target.value)}
                      className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Middle Column: Physical Dimensions Sliders & Values */}
              <div className="bg-[#06101e] p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
                <span className="text-slate-300 font-bold block border-b border-slate-800 pb-2">
                  Dimensiones en Metros:
                </span>

                {/* Ancho Principal */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">
                      {currentRack.forma === 'FORMA_L' ? 'Largo Brazo Principal:' : 'Largo Total (Ancho):'}
                    </span>
                    <strong className="text-cyan-400 font-mono">{currentRack.anchoM} m</strong>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="8.0"
                    step="0.1"
                    value={currentRack.anchoM}
                    onChange={(e) => handleUpdateCurrentRackProperty('anchoM', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Largo Brazo L (Active only if FORMA_L) */}
                {currentRack.forma === 'FORMA_L' && (
                  <div className="p-2.5 rounded-lg bg-[#0a182c] border border-cyan-500/40">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-cyan-300 font-semibold">Largo Brazo en 'L' (Perpendicular):</span>
                      <strong className="text-cyan-400 font-mono">{currentRack.largoBrazoL || 2.8} m</strong>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="6.0"
                      step="0.1"
                      value={currentRack.largoBrazoL || 2.8}
                      onChange={(e) => handleUpdateCurrentRackProperty('largoBrazoL', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                )}

                {/* Profundidad */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Profundidad / Fondo:</span>
                    <strong className="text-slate-200 font-mono">{currentRack.profundidadM} m</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={currentRack.profundidadM}
                    onChange={(e) => handleUpdateCurrentRackProperty('profundidadM', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Altura Total */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Altura Estructura:</span>
                    <strong className="text-emerald-400 font-mono">{currentRack.altoM} m</strong>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="4.5"
                    step="0.1"
                    value={currentRack.altoM}
                    onChange={(e) => handleUpdateCurrentRackProperty('altoM', parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                {/* Position X and Z */}
                <div className="border-t border-slate-800 pt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1 flex items-center gap-1">
                      <Move className="w-3 h-3 text-cyan-400" />
                      <span>Posición X (m):</span>
                    </label>
                    <input
                      type="number"
                      step="0.2"
                      value={currentRack.posX}
                      onChange={(e) => handleUpdateCurrentRackProperty('posX', parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#06101e] border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 flex items-center gap-1">
                      <Move className="w-3 h-3 text-cyan-400" />
                      <span>Posición Z (m):</span>
                    </label>
                    <input
                      type="number"
                      step="0.2"
                      value={currentRack.posZ}
                      onChange={(e) => handleUpdateCurrentRackProperty('posZ', parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#06101e] border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <label className="text-slate-400 block mb-1 flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-cyan-400" />
                    <span>Rotación en Plano:</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => handleUpdateCurrentRackProperty('rotacionGrados', deg)}
                        className={`py-1 text-xs rounded font-mono font-bold transition ${
                          currentRack.rotacionGrados === deg
                            ? 'bg-cyan-500 text-slate-950 shadow'
                            : 'bg-[#112645] text-slate-300 hover:bg-[#183966]'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: 2D Minimap Layout Blueprint of the Real Warehouse */}
              <div className="bg-[#06101e] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Plano Cenital 2D de la Bodega</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">24m × 18m</span>
                      <button
                        type="button"
                        onClick={() => setIsBlueprintModalOpen(true)}
                        className="p-1 rounded bg-[#112645] hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 transition border border-cyan-500/30"
                        title="Ver Plano 2D en Pantalla Completa"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Vista aérea en tiempo real. El estante seleccionado se resalta en <strong className="text-cyan-400">cian</strong> con su forma exacta.
                  </p>

                  {/* SVG Blueprint */}
                  <div className="relative w-full aspect-[4/3] bg-[#030712] rounded-lg border border-slate-800 p-2 overflow-hidden flex items-center justify-center">
                    <svg viewBox="-12 -9 24 18" className="w-full h-full">
                      {/* Grid background */}
                      <defs>
                        <pattern id="miniGrid" width="2" height="2" patternUnits="userSpaceOnUse">
                          <path d="M 2 0 L 0 0 0 2" fill="none" stroke="#102035" strokeWidth="0.08" />
                        </pattern>
                      </defs>
                      <rect x="-12" y="-9" width="24" height="18" fill="url(#miniGrid)" />

                      {/* Warehouse Outer Wall */}
                      <rect
                        x="-11.8"
                        y="-8.8"
                        width="23.6"
                        height="17.6"
                        fill="none"
                        stroke="#1e3a5f"
                        strokeWidth="0.2"
                      />

                      {/* Roll-up Cargo Door indicator (Top wall / Back wall in BodegaReal.jpg) */}
                      <rect x="-2.5" y="-8.8" width="5" height="0.4" fill="#f59e0b" />
                      <text x="0" y="-7.6" fill="#f59e0b" fontSize="0.7" textAnchor="middle" fontWeight="bold">
                        PORTÓN
                      </text>

                      {/* Office cabin at top-left / beside portón (BodegaReal.jpg) */}
                      <rect x="-11.6" y="-8.5" width="4.5" height="3.8" fill="#0f233a" stroke="#00d4ff" strokeWidth="0.1" />
                      <text x="-9.35" y="-6.4" fill="#94a3b8" fontSize="0.65" textAnchor="middle">
                        OFICINA
                      </text>

                      {/* Safety yellow traffic lane */}
                      <line x1="-1.8" y1="-8.5" x2="-1.8" y2="8.5" stroke="#f59e0b" strokeWidth="0.08" strokeDasharray="0.3, 0.3" />
                      <line x1="3.5" y1="-8.5" x2="3.5" y2="8.5" stroke="#f59e0b" strokeWidth="0.08" strokeDasharray="0.3, 0.3" />

                      {/* Render all racks on 2D blueprint */}
                      {racks.map((r) => {
                        const isSelected = r.id === currentRack.id;
                        const fillColor = isSelected ? '#00d4ff' : r.tipoVisual === 'RACK_PESADO' ? '#3b82f6' : '#d6ccbc';
                        const strokeColor = isSelected ? '#ffffff' : '#000000';

                        return (
                          <g
                            key={r.id}
                            transform={`translate(${r.posX}, ${r.posZ}) rotate(${r.rotacionGrados})`}
                            className="cursor-pointer"
                            onClick={() => setSelectedRackId(r.id)}
                          >
                            {r.forma === 'FORMA_L' ? (
                              // L-Shape path
                              <path
                                d={`M 0 0 L ${r.anchoM} 0 L ${r.anchoM} ${r.profundidadM} L ${r.profundidadM} ${r.profundidadM} L ${r.profundidadM} ${r.largoBrazoL || 2.8} L 0 ${r.largoBrazoL || 2.8} Z`}
                                fill={fillColor}
                                stroke={strokeColor}
                                strokeWidth={isSelected ? 0.12 : 0.05}
                                opacity={isSelected ? 0.95 : 0.7}
                              />
                            ) : (
                              // Rectangular box
                              <rect
                                x={-r.anchoM / 2}
                                y={-r.profundidadM / 2}
                                width={r.anchoM}
                                height={r.profundidadM}
                                fill={fillColor}
                                stroke={strokeColor}
                                strokeWidth={isSelected ? 0.12 : 0.05}
                                opacity={isSelected ? 0.95 : 0.7}
                              />
                            )}

                            {/* Label */}
                            <text
                              x="0"
                              y="0.3"
                              fill="#ffffff"
                              fontSize="0.75"
                              fontWeight="bold"
                              textAnchor="middle"
                              filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.8))"
                            >
                              {r.codigo}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                    <span>Industrial</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#d6ccbc]" />
                    <span>Góndola</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                    <span>Seleccionado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: LEVELS & BINS ALLOCATION */}
          <div className="bg-[#0c1c33] border border-[#00d4ff]/30 rounded-2xl p-5 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Distribución de Pisos y Repuestos Asignados ({currentRack.codigo})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gestiona las subdivisiones de cada nivel. Asocia los códigos de barras de repuestos marinos para ubicarlos en 3D y en factura.
                </p>
              </div>

              <button
                onClick={handleAddLevel}
                className="bg-[#112645] hover:bg-cyan-600 text-cyan-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Piso Superior</span>
              </button>
            </div>

            {/* List of Levels (from Top Level to Ground Level) */}
            <div className="space-y-4">
              {[...currentRack.pisos].reverse().map((piso, revIdx) => {
                const originalIndex = currentRack.pisos.length - 1 - revIdx;
                const isL = currentRack.forma === 'FORMA_L';

                return (
                  <div
                    key={piso.id}
                    className="bg-[#06101e] border border-slate-800 rounded-xl p-4 space-y-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs px-2.5 py-0.5 rounded font-bold font-mono">
                          PISO {piso.nivel}
                        </span>
                        <span className="text-xs text-slate-400">
                          Altura: <strong className="text-slate-200">{piso.alturaBaseM}m</strong> | Espacio Útil:{' '}
                          <strong className="text-slate-200">{piso.altoUtilM}m</strong>
                        </span>
                        <span className="text-xs text-cyan-400 font-medium">
                          ({piso.zonas.length} casillas activas)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isL ? (
                          <>
                            <button
                              onClick={() => handleAddZoneToLevel(originalIndex, 'PRINCIPAL')}
                              className="text-[11px] font-bold text-cyan-300 hover:text-white bg-[#112645] hover:bg-cyan-600 px-2.5 py-1 rounded flex items-center gap-1 transition"
                              title="Agregar casilla en el brazo principal"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Casilla Brazo Principal</span>
                            </button>
                            <button
                              onClick={() => handleAddZoneToLevel(originalIndex, 'BRAZO_L')}
                              className="text-[11px] font-bold text-cyan-300 hover:text-white bg-[#112645] hover:bg-cyan-600 px-2.5 py-1 rounded flex items-center gap-1 transition"
                              title="Agregar casilla en el brazo L"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Casilla Brazo 'L'</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAddZoneToLevel(originalIndex, 'PRINCIPAL')}
                            className="text-[11px] font-bold text-cyan-300 hover:text-white bg-[#112645] hover:bg-cyan-600 px-2.5 py-1 rounded flex items-center gap-1 transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Dividir / Agregar Casilla</span>
                          </button>
                        )}

                        {currentRack.pisos.length > 1 && (
                          <button
                            onClick={() => handleDeleteLevel(originalIndex)}
                            className="text-[11px] text-red-400 hover:text-white bg-red-950/40 hover:bg-red-800/60 p-1 rounded transition ml-1"
                            title="Eliminar este piso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Zones / Bins in this level */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {piso.zonas.map((zona) => {
                        const assignedProd = products.find((p) => p.id === zona.productoId);
                        const isCritical =
                          assignedProd && assignedProd.stockActual <= assignedProd.stockMinimoAlerta;
                        const isWarning =
                          assignedProd &&
                          !isCritical &&
                          assignedProd.stockActual <= assignedProd.stockMinimoAlerta * 1.5;

                        return (
                          <div
                            key={zona.id}
                            className={`p-3 rounded-lg border flex flex-col justify-between gap-2.5 transition ${
                              assignedProd
                                ? isCritical
                                  ? 'bg-red-950/30 border-red-500/50 shadow-sm shadow-red-950/50'
                                  : isWarning
                                  ? 'bg-amber-950/30 border-amber-500/50 shadow-sm shadow-amber-950/50'
                                  : 'bg-[#0a182c] border-cyan-500/30'
                                : 'bg-[#09111c] border-slate-800/80 border-dashed'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-cyan-300">
                                {zona.codigoUbicacion}
                              </span>
                              {zona.brazo && (
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                                  {zona.brazo === 'BRAZO_L' ? "Brazo 'L'" : 'Principal'}
                                </span>
                              )}
                            </div>

                            {/* Dropdown to assign or change product */}
                            <div>
                              <select
                                value={zona.productoId || ''}
                                onChange={(e) =>
                                  handleAssignProductToZone(zona.id, zona.codigoUbicacion, e.target.value)
                                }
                                className="w-full bg-[#06101e] border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                              >
                                <option value="">(Casilla Disponible / Vacía)</option>
                                {products.map((prod) => (
                                  <option key={prod.id} value={prod.id}>
                                    {prod.nombre} (Stock: {prod.stockActual})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {assignedProd ? (
                              <div className="text-[10px] flex items-center justify-between text-slate-400 border-t border-slate-800/80 pt-1.5">
                                <span>SKU: {assignedProd.sku}</span>
                                <span
                                  className={
                                    isCritical
                                      ? 'text-red-400 font-bold'
                                      : isWarning
                                      ? 'text-amber-400 font-bold'
                                      : 'text-emerald-400'
                                  }
                                >
                                  {assignedProd.stockActual} uds
                                </span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic text-center">
                                Sin repuesto asignado
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW RACK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0c1c33] border border-[#00d4ff]/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Crear Nuevo Estante en la Bodega
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define la forma, dimensiones y estilo visual para renderizarlo inmediatamente en 3D.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewRack} className="space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Código Único:</label>
                  <input
                    type="text"
                    required
                    value={newRackForm.codigo}
                    onChange={(e) =>
                      setNewRackForm({ ...newRackForm, codigo: e.target.value.toUpperCase() })
                    }
                    placeholder="EST-D"
                    className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-bold block mb-1">Nombre Descriptivo:</label>
                  <input
                    type="text"
                    required
                    value={newRackForm.nombre}
                    onChange={(e) => setNewRackForm({ ...newRackForm, nombre: e.target.value })}
                    placeholder="Ej: Góndola Pasillo 3 - Filtros"
                    className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-slate-300 font-bold block mb-1">Categoría de Repuestos:</label>
                  <input
                    type="text"
                    value={newRackForm.categoria}
                    onChange={(e) => setNewRackForm({ ...newRackForm, categoria: e.target.value })}
                    placeholder="Ej: Aceites y Lubricantes"
                    className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Shape Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  1. Selecciona la Forma Geométrica:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRackForm({ ...newRackForm, forma: 'RECTANGULAR' })}
                    className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 transition ${
                      newRackForm.forma === 'RECTANGULAR'
                        ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-lg'
                        : 'bg-[#06101e] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-4 rounded bg-cyan-400/80 border border-cyan-300" />
                      {newRackForm.forma === 'RECTANGULAR' && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <div>
                      <strong className="text-xs block text-white">Rectangular (A lo largo)</strong>
                      <span className="text-[10px] text-slate-400">
                        Estante lineal continuo o pasillo de góndolas.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRackForm({ ...newRackForm, forma: 'FORMA_L' })}
                    className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 transition ${
                      newRackForm.forma === 'FORMA_L'
                        ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-lg'
                        : 'bg-[#06101e] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="relative w-7 h-7">
                        <div className="absolute top-0 left-0 w-3 h-7 bg-cyan-400/80 rounded-t" />
                        <div className="absolute bottom-0 left-0 w-7 h-3 bg-cyan-400/80 rounded-r" />
                      </div>
                      {newRackForm.forma === 'FORMA_L' && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <div>
                      <strong className="text-xs block text-white">Forma en 'L' (Esquina)</strong>
                      <span className="text-[10px] text-slate-400">
                        Aprovecha el rincón o pared perimetral en 90°.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Visual Style Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  2. Selecciona el Tipo Visual / Estilo:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRackForm({ ...newRackForm, tipoVisual: 'GONDOLA_COMERCIAL' })}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition ${
                      newRackForm.tipoVisual === 'GONDOLA_COMERCIAL'
                        ? 'bg-amber-950/40 border-amber-400 text-white'
                        : 'bg-[#06101e] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#d6ccbc] border border-amber-400" />
                      {newRackForm.tipoVisual === 'GONDOLA_COMERCIAL' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <strong className="text-xs text-white">Góndola Comercial (Retail)</strong>
                    <span className="text-[10px] text-slate-400">
                      Acabado beige con panel ranurado central (como en la foto real).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRackForm({ ...newRackForm, tipoVisual: 'RACK_PESADO' })}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition ${
                      newRackForm.tipoVisual === 'RACK_PESADO'
                        ? 'bg-blue-950/40 border-blue-400 text-white'
                        : 'bg-[#06101e] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <span className="w-3 h-3 rounded-full bg-blue-600" />
                        <span className="w-3 h-3 rounded-full bg-orange-600" />
                      </div>
                      {newRackForm.tipoVisual === 'RACK_PESADO' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <strong className="text-xs text-white">Rack Pesado Industrial</strong>
                    <span className="text-[10px] text-slate-400">
                      Columnas azules y vigas de carga naranja/rojo para palets.
                    </span>
                  </button>
                </div>
              </div>

              {/* Physical Dimensions */}
              <div className="bg-[#06101e] p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <span className="text-slate-300 font-bold block border-b border-slate-800 pb-1.5">
                  3. Dimensiones Físicas y Niveles Iniciales:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      {newRackForm.forma === 'FORMA_L' ? 'Ancho Brazo Principal:' : 'Largo / Ancho:'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.5"
                      max="8"
                      value={newRackForm.anchoM}
                      onChange={(e) =>
                        setNewRackForm({ ...newRackForm, anchoM: parseFloat(e.target.value) || 3 })
                      }
                      className="w-full bg-[#0c1c33] border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  {newRackForm.forma === 'FORMA_L' && (
                    <div>
                      <label className="text-cyan-300 font-semibold block mb-1">
                        Largo Brazo en 'L':
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.5"
                        max="6"
                        value={newRackForm.largoBrazoL}
                        onChange={(e) =>
                          setNewRackForm({
                            ...newRackForm,
                            largoBrazoL: parseFloat(e.target.value) || 2.5,
                          })
                        }
                        className="w-full bg-[#0c1c33] border border-cyan-500/50 rounded px-2.5 py-1.5 text-cyan-300 font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-slate-400 block mb-1">Fondo / Prof.:</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.5"
                      value={newRackForm.profundidadM}
                      onChange={(e) =>
                        setNewRackForm({
                          ...newRackForm,
                          profundidadM: parseFloat(e.target.value) || 0.8,
                        })
                      }
                      className="w-full bg-[#0c1c33] border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Altura Total:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.2"
                      max="4.5"
                      value={newRackForm.altoM}
                      onChange={(e) =>
                        setNewRackForm({ ...newRackForm, altoM: parseFloat(e.target.value) || 2.5 })
                      }
                      className="w-full bg-[#0c1c33] border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Posición X (m):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newRackForm.posX}
                      onChange={(e) =>
                        setNewRackForm({ ...newRackForm, posX: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-[#0c1c33] border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Posición Z (m):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newRackForm.posZ}
                      onChange={(e) =>
                        setNewRackForm({ ...newRackForm, posZ: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-[#0c1c33] border border-slate-700 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Pisos Iniciales:</label>
                    <select
                      value={newRackForm.numPisos}
                      onChange={(e) =>
                        setNewRackForm({ ...newRackForm, numPisos: parseInt(e.target.value) || 3 })
                      }
                      className="w-full bg-[#0c1c33] border border-slate-700 rounded px-2 py-1.5 text-white"
                    >
                      <option value="2">2 Pisos</option>
                      <option value="3">3 Pisos</option>
                      <option value="4">4 Pisos</option>
                      <option value="5">5 Pisos</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Casillas / Piso:</label>
                    <select
                      value={newRackForm.casillasPorPiso}
                      onChange={(e) =>
                        setNewRackForm({
                          ...newRackForm,
                          casillasPorPiso: parseInt(e.target.value) || 2,
                        })
                      }
                      className="w-full bg-[#0c1c33] border border-slate-700 rounded px-2 py-1.5 text-white"
                    >
                      <option value="2">2 Casillas</option>
                      <option value="3">3 Casillas</option>
                      <option value="4">4 Casillas</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear y Renderizar en 3D</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN BLUEPRINT MODAL */}
      {isBlueprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0c1c33] border border-[#00d4ff]/40 rounded-2xl w-full max-w-5xl h-[85vh] p-6 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Plano Arquitectónico y Distribución 2D de la Bodega (Roatán)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dimensiones reales: 24m × 18m. Haz clic en cualquier estante para editarlo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onSwitchTo3D}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow"
                >
                  <Box className="w-4 h-4" />
                  <span>Ver en 3D</span>
                </button>
                <button
                  onClick={() => setIsBlueprintModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* High-res Large SVG Canvas */}
            <div className="relative flex-1 w-full bg-[#030712] rounded-xl border border-slate-800 p-4 overflow-hidden flex items-center justify-center">
              <svg viewBox="-12 -9 24 18" className="w-full h-full">
                <defs>
                  <pattern id="modalGrid" width="2" height="2" patternUnits="userSpaceOnUse">
                    <path d="M 2 0 L 0 0 0 2" fill="none" stroke="#102035" strokeWidth="0.08" />
                  </pattern>
                </defs>
                <rect x="-12" y="-9" width="24" height="18" fill="url(#modalGrid)" />

                {/* Warehouse Outer Wall */}
                <rect x="-11.8" y="-8.8" width="23.6" height="17.6" fill="none" stroke="#1e3a5f" strokeWidth="0.2" />

                {/* Roll-up Cargo Door indicator */}
                <rect x="-2.5" y="-8.8" width="5" height="0.4" fill="#f59e0b" />
                <text x="0" y="-7.6" fill="#f59e0b" fontSize="0.6" textAnchor="middle" fontWeight="bold">
                  PORTÓN PRINCIPAL DE CARGA
                </text>

                {/* Office cabin */}
                <rect x="-11.6" y="-8.5" width="4.5" height="3.8" fill="#0f233a" stroke="#00d4ff" strokeWidth="0.1" />
                <text x="-9.35" y="-6.4" fill="#94a3b8" fontSize="0.6" textAnchor="middle">
                  OFICINA Y CAJA
                </text>

                {/* Safety traffic lanes */}
                <line x1="-1.8" y1="-8.5" x2="-1.8" y2="8.5" stroke="#f59e0b" strokeWidth="0.08" strokeDasharray="0.3, 0.3" />
                <line x1="3.5" y1="-8.5" x2="3.5" y2="8.5" stroke="#f59e0b" strokeWidth="0.08" strokeDasharray="0.3, 0.3" />

                {/* Racks */}
                {racks.map((r) => {
                  const isSelected = r.id === currentRack?.id;
                  const fillColor = isSelected ? '#00d4ff' : r.tipoVisual === 'RACK_PESADO' ? '#3b82f6' : '#d6ccbc';
                  const strokeColor = isSelected ? '#ffffff' : '#000000';

                  return (
                    <g
                      key={r.id}
                      transform={`translate(${r.posX}, ${r.posZ}) rotate(${r.rotacionGrados})`}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedRackId(r.id);
                        setIsBlueprintModalOpen(false);
                      }}
                    >
                      {r.forma === 'FORMA_L' ? (
                        <path
                          d={`M 0 0 L ${r.anchoM} 0 L ${r.anchoM} ${r.profundidadM} L ${r.profundidadM} ${r.profundidadM} L ${r.profundidadM} ${r.largoBrazoL || 2.8} L 0 ${r.largoBrazoL || 2.8} Z`}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 0.12 : 0.05}
                          opacity={isSelected ? 0.95 : 0.75}
                        />
                      ) : (
                        <rect
                          x={-r.anchoM / 2}
                          y={-r.profundidadM / 2}
                          width={r.anchoM}
                          height={r.profundidadM}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 0.12 : 0.05}
                          opacity={isSelected ? 0.95 : 0.75}
                        />
                      )}

                      <text
                        x="0"
                        y="0.3"
                        fill="#ffffff"
                        fontSize="0.75"
                        fontWeight="bold"
                        textAnchor="middle"
                        filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.8))"
                      >
                        {r.codigo}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 mt-4 border-t border-slate-800 pt-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span>Rack Pesado Industrial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#d6ccbc]" />
                  <span>Góndola Comercial Retail</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-cyan-400" />
                  <span>Estante Activo / Seleccionado</span>
                </div>
              </div>

              <span className="text-[11px] text-slate-400">
                Presiona <strong>Esc</strong> o el botón ✕ para cerrar
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};