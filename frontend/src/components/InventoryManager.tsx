import React, { useState } from 'react';
import type { Producto, Estante } from '../types';
import {
  AlertTriangle,
  Download,
  Plus,
  Search,
  Truck,
  MapPin,
  Check,
  Filter,
  Printer,
  Edit3,
  PackagePlus,
  Copy,
  CheckCircle2,
} from 'lucide-react';

interface InventoryManagerProps {
  products: Producto[];
  racks?: Estante[];
  enable3D?: boolean;
  onUpdateStock: (productId: string, newStock: number) => void;
  onSaveProduct?: (product: Producto, isNew: boolean) => void;
  onLocateIn3D: (product: Producto) => void;
  onPrintLabel: (product: Producto) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  racks = [],
  enable3D = true,
  onUpdateStock,
  onSaveProduct,
  onLocateIn3D,
  onPrintLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [purchaseOrderModal, setPurchaseOrderModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Producto | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(20);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create / Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const criticalProducts = products.filter((p) => p.stockActual <= p.stockMinimoAlerta);
  const preventiveProducts = products.filter(
    (p) => p.stockActual > p.stockMinimoAlerta && p.stockActual <= p.stockMinimoAlerta * 1.5
  );
  const reorderProducts = [...criticalProducts, ...preventiveProducts];

  // Collect all 3D rack slots for the location selector
  const allSlots = racks.flatMap((r) =>
    r.pisos.flatMap((piso) =>
      piso.zonas.map((z) => ({
        codigo: z.codigoUbicacion,
        rackNombre: r.nombre,
        ocupadoPor: products.find((prod) => prod.ubicacionId === z.codigoUbicacion),
      }))
    )
  );

  const categories = Array.from(
    new Set([
      ...products.map((p) => p.categoria),
      'Electrónica y Navegación',
      'Bombas y Plomería Marina',
      'Filtros y Combustible',
      'Motores y Propulsión',
      'Aceites y Lubricantes',
      'Sistema Eléctrico',
      'Ferretería General',
    ])
  );

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAlert = !filterAlertOnly || p.stockActual <= p.stockMinimoAlerta * 1.5;
    return matchesSearch && matchesAlert;
  });

  const handleApplyStockIncrease = () => {
    if (!adjustingProduct) return;
    onUpdateStock(adjustingProduct.id, adjustingProduct.stockActual + Number(adjustQty));
    showToast(
      `Se sumaron +${adjustQty} uds a "${adjustingProduct.nombre}". Nuevo stock: ${
        adjustingProduct.stockActual + Number(adjustQty)
      } uds.`
    );
    setAdjustingProduct(null);
  };

  const openCreateModal = () => {
    const randomBarcode = '742109' + Math.floor(10000 + Math.random() * 89999);
    const nextNum = products.length + 1;
    setIsCreatingNew(true);
    setEditingProduct({
      id: `prod-${Date.now()}`,
      sku: `CB-ITEM-0${nextNum}`,
      codigoBarras: randomBarcode,
      nombre: '',
      marca: '',
      categoria: categories[0] || 'General',
      precioVentaHnl: 1250,
      precioVentaUsd: 50,
      costoUsd: 30,
      stockActual: 15,
      stockMinimoAlerta: 5,
      cantidadReordenSugerida: 20,
      leadTimeDias: 10,
      estadoPedidoUsa: 'NINGUNO',
      ubicacionId: undefined,
    });
  };

  const openEditModal = (prod: Producto) => {
    setIsCreatingNew(false);
    setEditingProduct({ ...prod });
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.nombre.trim() || !editingProduct.sku.trim()) return;

    const updated: Producto = {
      ...editingProduct,
      estadoPedidoUsa:
        editingProduct.stockActual <= editingProduct.stockMinimoAlerta ? 'CRITICO' : 'NINGUNO',
    };

    if (onSaveProduct) {
      onSaveProduct(updated, isCreatingNew);
    }
    showToast(
      isCreatingNew
        ? `Producto "${updated.nombre}" (${updated.sku}) creado exitosamente.`
        : `Producto "${updated.nombre}" actualizado.`
    );
    setEditingProduct(null);
  };

  const handleCopyOrder = () => {
    const lines = reorderProducts.map(
      (p) =>
        `• [${p.sku}] ${p.nombre} — Stock: ${p.stockActual} | Pedir: +${p.cantidadReordenSugerida} uds ($${(
          p.costoUsd * p.cantidadReordenSugerida
        ).toLocaleString()} USD)`
    );
    const totalUsd = reorderProducts.reduce((acc, p) => acc + p.costoUsd * p.cantidadReordenSugerida, 0);
    const text = `ORDEN DE REABASTECIMIENTO - COREBASE ONE\n${lines.join(
      '\n'
    )}\nTOTAL ESTIMADO: $${totalUsd.toLocaleString()} USD`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast('Lista de orden de compra copiada al portapapeles lista para WhatsApp o Correo.');
    setPurchaseOrderModal(false);
  };

  return (
    <div className="space-y-6">
      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SECTION: CRITICAL & PREVENTIVE REORDER ALERTS */}
      <div className="bg-gradient-to-r from-red-950/80 via-[#171324] to-[#0c1c33] border border-red-500/50 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex flex-wrap items-center gap-2">
                <span>Alertas Inteligentes de Stock • Reabastecimiento</span>
                <span className="bg-red-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold">
                  {criticalProducts.length} Críticos
                </span>
                {preventiveProducts.length > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold">
                    {preventiveProducts.length} Preventivos
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Productos que alcanzaron su umbral crítico o preventivo. Genera la orden de compra en 1 clic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPurchaseOrderModal(true)}
              className="bg-red-500 hover:bg-red-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-red-500/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Generar Orden de Compra ({reorderProducts.length})</span>
            </button>
          </div>
        </div>

        {/* Critical & Preventive items cards banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {reorderProducts.map((p) => {
            const isCrit = p.stockActual <= p.stockMinimoAlerta;
            return (
              <div
                key={p.id}
                className={`bg-[#06101e]/90 border rounded-xl p-3.5 flex flex-col justify-between gap-2.5 relative overflow-hidden ${
                  isCrit ? 'border-red-500/45' : 'border-amber-500/45'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
                    {p.sku}
                  </span>
                  {isCrit ? (
                    <span className="text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-500/30 px-2 py-0.5 rounded animate-pulse">
                      STOCK CRÍTICO
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded">
                      PREVENTIVO (≤{Math.round(p.stockMinimoAlerta * 1.5)})
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{p.nombre}</h4>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                    <span>
                      Stock Actual:{' '}
                      <strong className={isCrit ? 'text-red-400' : 'text-amber-400'}>
                        {p.stockActual} uds
                      </strong>
                    </span>
                    <span>
                      Mínimo: <strong>{p.stockMinimoAlerta} uds</strong>
                    </span>
                  </div>
                </div>

                <div
                  className={`rounded p-2 text-[11px] text-slate-200 flex items-center justify-between border ${
                    isCrit ? 'bg-red-950/30 border-red-500/20' : 'bg-amber-950/25 border-amber-500/20'
                  }`}
                >
                  <span>Sugerencia a Pedir:</span>
                  <strong className="text-emerald-400 font-extrabold">
                    +{p.cantidadReordenSugerida} unidades
                  </strong>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {enable3D && p.ubicacionId && (
                    <button
                      onClick={() => onLocateIn3D(p)}
                      className="flex-1 bg-[#112645] hover:bg-cyan-600 text-cyan-200 hover:text-white text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Ubicar {p.ubicacionId}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAdjustingProduct(p);
                      setAdjustQty(p.cantidadReordenSugerida);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] font-bold px-2.5 py-1.5 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Registrar entrada de mercadería"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Recibir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION: FULL INVENTORY CATALOG TABLE */}
      <div className="bg-[#0c1c33] border border-[#00d4ff]/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por producto, SKU o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#06101e] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setFilterAlertOnly(!filterAlertOnly)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                filterAlertOnly
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-[#112645] text-slate-300 hover:bg-[#1a3860]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Ver Críticos y Preventivos ({reorderProducts.length})</span>
            </button>

            <button
              onClick={openCreateModal}
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ Nuevo Producto</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#081426] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">SKU {enable3D && '/ Ubicación 3D'}</th>
                <th className="py-3 px-3">Producto / Descripción</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3 text-center">Estado / Stock</th>
                <th className="py-3 px-3 text-center">Umbral Mínimo</th>
                <th className="py-3 px-3 text-center">Reorden Sugerido</th>
                <th className="py-3 px-3">Precio Venta</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredProducts.map((p) => {
                const isCritical = p.stockActual <= p.stockMinimoAlerta;
                const isPreventive =
                  !isCritical && p.stockActual <= p.stockMinimoAlerta * 1.5;
                return (
                  <tr key={p.id} className="hover:bg-[#112645]/40 transition">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-cyan-400">{p.sku}</div>
                      {enable3D && (
                        p.ubicacionId ? (
                          <button
                            onClick={() => onLocateIn3D(p)}
                            className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 mt-0.5 cursor-pointer"
                          >
                            <MapPin className="w-2.5 h-2.5 text-cyan-400" />
                            <span>{p.ubicacionId}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">Sin asignar</span>
                        )
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white max-w-xs">{p.nombre}</div>
                      <div className="text-[11px] text-slate-400">{p.marca}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-400">{p.categoria}</td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isCritical ? (
                        <span className="font-extrabold px-2.5 py-1 rounded text-xs bg-red-950/80 text-red-400 border border-red-500/40 animate-pulse inline-flex items-center gap-1">
                          <span>{p.stockActual} uds</span>
                          <span className="text-[9px] uppercase">• Crítico</span>
                        </span>
                      ) : isPreventive ? (
                        <span className="font-extrabold px-2.5 py-1 rounded text-xs bg-amber-950/80 text-amber-400 border border-amber-500/40 inline-flex items-center gap-1">
                          <span>{p.stockActual} uds</span>
                          <span className="text-[9px] uppercase">• Preventivo</span>
                        </span>
                      ) : (
                        <span className="font-extrabold px-2.5 py-1 rounded text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                          {p.stockActual} uds
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {p.stockMinimoAlerta} uds
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="text-cyan-300 font-bold bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/20">
                        +{p.cantidadReordenSugerida} uds
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-white">L. {p.precioVentaHnl.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">${p.precioVentaUsd} USD</div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-amber-500 text-slate-300 hover:text-slate-950 transition cursor-pointer"
                        title="Editar Producto / Ubicación"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onPrintLabel(p)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition cursor-pointer"
                        title="Imprimir Viñeta Térmica"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setAdjustingProduct(p);
                          setAdjustQty(p.cantidadReordenSugerida || 20);
                        }}
                        className="p-1.5 rounded bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition cursor-pointer"
                        title="Registrar Entrada de Mercadería"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE / EDIT PRODUCT */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProductSubmit}
            className="bg-[#0c1c33] border border-cyan-500/40 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-extrabold text-white">
                  {isCreatingNew ? 'Registrar Nuevo Producto en Catálogo' : `Editar Producto (${editingProduct.sku})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-300 block mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Bomba Sumergible 2000 GPH 12V..."
                  value={editingProduct.nombre}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Código SKU *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Código de Barras (EAN / Code128)</label>
                <input
                  type="text"
                  value={editingProduct.codigoBarras}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, codigoBarras: e.target.value })
                  }
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Marca / Fabricante</label>
                <input
                  type="text"
                  placeholder="Ej: Yamaha, Rule, Parker..."
                  value={editingProduct.marca}
                  onChange={(e) => setEditingProduct({ ...editingProduct, marca: e.target.value })}
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Categoría</label>
                <input
                  type="text"
                  list="categorias-list"
                  value={editingProduct.categoria}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, categoria: e.target.value })
                  }
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
                <datalist id="categorias-list">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Precio Venta (Lempiras L.) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editingProduct.precioVentaHnl}
                  onChange={(e) => {
                    const hnl = Number(e.target.value);
                    setEditingProduct({
                      ...editingProduct,
                      precioVentaHnl: hnl,
                      precioVentaUsd: Math.round((hnl / 25) * 100) / 100,
                    });
                  }}
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-bold font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Precio Venta ($ USD)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.01"
                  value={editingProduct.precioVentaUsd}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, precioVentaUsd: Number(e.target.value) })
                  }
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Stock Inicial / Actual (uds)</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.stockActual}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, stockActual: Number(e.target.value) })
                  }
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Umbral Mínimo de Alerta</label>
                <input
                  type="number"
                  min="1"
                  value={editingProduct.stockMinimoAlerta}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stockMinimoAlerta: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-amber-400 font-bold font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Cantidad Sugerida a Pedir</label>
                <input
                  type="number"
                  min="1"
                  value={editingProduct.cantidadReordenSugerida}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      cantidadReordenSugerida: Number(e.target.value),
                    })
                  }
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Costo Unitario ($ USD)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.01"
                  value={editingProduct.costoUsd}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, costoUsd: Number(e.target.value) })
                  }
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              {enable3D && (
                <div className="sm:col-span-2">
                  <label className="font-bold text-cyan-300 block mb-1">
                    Ubicación Física en Bodega 3D (Casilla)
                  </label>
                  <select
                    value={editingProduct.ubicacionId || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        ubicacionId: e.target.value || undefined,
                      })
                    }
                    className="w-full bg-[#06101e] border border-cyan-500/40 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">-- Sin asignar a estante 3D --</option>
                    {allSlots.map((slot) => {
                      const isOtherProd =
                        slot.ocupadoPor && slot.ocupadoPor.id !== editingProduct.id;
                      return (
                        <option key={slot.codigo} value={slot.codigo}>
                          {slot.codigo} — {slot.rackNombre}{' '}
                          {isOtherProd
                            ? `(Ocupado: ${slot.ocupadoPor?.sku})`
                            : slot.ocupadoPor
                            ? '(Ubicación actual)'
                            : '[DISPONIBLE]'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 py-2.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isCreatingNew ? 'Guardar Nuevo Producto' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: REGISTRAR ENTRADA DE MERCADERÍA */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1c33] border border-cyan-500/40 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" />
              <span>Recepción de Mercadería a Bodega</span>
            </h3>

            <div className="bg-[#06101e] p-3 rounded-xl border border-slate-800">
              <p className="text-xs font-bold text-white">{adjustingProduct.nombre}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {adjustingProduct.sku}</p>
              <p className="text-xs text-slate-300 mt-2">
                Stock Actual en Bodega: <strong className="text-cyan-400">{adjustingProduct.stockActual} uds</strong>
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Cantidad recibida a sumar al inventario:
              </label>
              <input
                type="number"
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className="w-full bg-[#06101e] border border-cyan-500/40 rounded-lg px-3 py-2 text-white font-bold font-mono text-base focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAdjustingProduct(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyStockIncrease}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar a Inventario</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORDEN DE COMPRA SUGERIDA */}
      {purchaseOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1c33] border border-red-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Orden de Compra Sugerida para Proveedor
                </h3>
                <p className="text-xs text-slate-400">
                  Generada automáticamente por el motor de alertas de CoreBase One
                </p>
              </div>
              <button
                onClick={() => setPurchaseOrderModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#081426] text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Producto</th>
                    <th className="p-2.5 text-center">Estado / Stock</th>
                    <th className="p-2.5 text-center">Cantidad a Pedir</th>
                    <th className="p-2.5 text-right">Costo Est. USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {reorderProducts.map((p) => {
                    const isCrit = p.stockActual <= p.stockMinimoAlerta;
                    return (
                      <tr key={p.id}>
                        <td className="p-2.5 font-mono text-cyan-400">{p.sku}</td>
                        <td className="p-2.5 font-bold text-white">{p.nombre}</td>
                        <td
                          className={`p-2.5 text-center font-bold ${
                            isCrit ? 'text-red-400' : 'text-amber-400'
                          }`}
                        >
                          {p.stockActual} ({isCrit ? 'Crítico' : 'Preventivo'})
                        </td>
                        <td className="p-2.5 text-center font-bold text-emerald-400">
                          +{p.cantidadReordenSugerida}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          ${(p.costoUsd * p.cantidadReordenSugerida).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-700 pt-3">
              <div className="text-xs text-slate-400">
                Total Estimado de Orden:{' '}
                <strong className="text-white text-sm">
                  $
                  {reorderProducts
                    .reduce((acc, p) => acc + p.costoUsd * p.cantidadReordenSugerida, 0)
                    .toLocaleString()}{' '}
                  USD
                </strong>
              </div>
              <button
                onClick={handleCopyOrder}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Lista para WhatsApp / Correo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
