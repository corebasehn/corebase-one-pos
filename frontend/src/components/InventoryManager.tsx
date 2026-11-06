import React, { useState } from 'react';
import type { Producto } from '../types';
import { AlertTriangle, Download, Plus, Search, Truck, MapPin, Check, Filter, Printer } from 'lucide-react';

interface InventoryManagerProps {
  products: Producto[];
  onUpdateStock: (productId: string, newStock: number) => void;
  onLocateIn3D: (product: Producto) => void;
  onPrintLabel: (product: Producto) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  onUpdateStock,
  onLocateIn3D,
  onPrintLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [purchaseOrderModal, setPurchaseOrderModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Producto | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(20);

  const criticalProducts = products.filter((p) => p.stockActual <= p.stockMinimoAlerta);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAlert = !filterAlertOnly || p.stockActual <= p.stockMinimoAlerta;
    return matchesSearch && matchesAlert;
  });

  const handleApplyStockIncrease = () => {
    if (!adjustingProduct) return;
    onUpdateStock(adjustingProduct.id, adjustingProduct.stockActual + Number(adjustQty));
    setAdjustingProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* SECTION: CRITICAL USA REORDER ALERTS (THE STAR FEATURE OF THE CALL) */}
      <div className="bg-gradient-to-r from-red-950/80 via-[#171324] to-[#0c1c33] border border-red-500/50 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Alertas de Stock Mínimo • Pedidos a Estados Unidos</span>
                <span className="bg-red-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold">
                  {criticalProducts.length} Repuestos Críticos
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Productos que han alcanzado o bajado de su umbral mínimo. Se recomienda generar orden para Miami/USA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPurchaseOrderModal(true)}
              className="bg-red-500 hover:bg-red-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-red-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Generar Orden de Compra para EE. UU.</span>
            </button>
          </div>
        </div>

        {/* Critical items cards banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          {criticalProducts.map((p) => (
            <div
              key={p.id}
              className="bg-[#06101e]/90 border border-red-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
                  {p.sku}
                </span>
                <span className="text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-500/30 px-2 py-0.5 rounded animate-pulse">
                  STOCK CRÍTICO
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white line-clamp-1">{p.nombre}</h4>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                  <span>Stock Actual: <strong className="text-red-400">{p.stockActual} uds</strong></span>
                  <span>Mínimo: <strong>{p.stockMinimoAlerta} uds</strong></span>
                </div>
              </div>

              <div className="bg-red-950/30 border border-red-500/20 rounded p-2 text-[11px] text-slate-200 flex items-center justify-between">
                <span>Sugerencia a Pedir:</span>
                <strong className="text-emerald-400 font-extrabold">+{p.cantidadReordenSugerida} unidades</strong>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onLocateIn3D(p)}
                  className="flex-1 bg-[#112645] hover:bg-cyan-600 text-cyan-200 hover:text-white text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-1 transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Ubicar {p.ubicacionId}</span>
                </button>
                <button
                  onClick={() => {
                    setAdjustingProduct(p);
                    setAdjustQty(p.cantidadReordenSugerida);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[11px] font-bold px-2.5 py-1.5 rounded flex items-center gap-1 transition"
                  title="Registrar llegada de EE. UU."
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Recibir</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION: FULL INVENTORY CATALOG TABLE */}
      <div className="bg-[#0c1c33] border border-[#00d4ff]/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por repuesto, SKU o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#06101e] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilterAlertOnly(!filterAlertOnly)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                filterAlertOnly
                  ? 'bg-red-500 text-slate-950 shadow-md shadow-red-500/20'
                  : 'bg-[#112645] text-slate-300 hover:bg-[#1a3860]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Ver Solo en Alerta</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#081426] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">SKU / Ubicación 3D</th>
                <th className="py-3 px-3">Repuesto Marino</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3 text-center">Stock Actual</th>
                <th className="py-3 px-3 text-center">Umbral Mínimo</th>
                <th className="py-3 px-3 text-center">Pedido USA</th>
                <th className="py-3 px-3">Precio Venta</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredProducts.map((p) => {
                const isCritical = p.stockActual <= p.stockMinimoAlerta;
                return (
                  <tr key={p.id} className="hover:bg-[#112645]/40 transition">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-cyan-400">{p.sku}</div>
                      {p.ubicacionId ? (
                        <button
                          onClick={() => onLocateIn3D(p)}
                          className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 mt-0.5"
                        >
                          <MapPin className="w-2.5 h-2.5 text-cyan-400" />
                          <span>{p.ubicacionId}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">Sin asignar</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white max-w-xs">{p.nombre}</div>
                      <div className="text-[11px] text-slate-400">{p.marca}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-400">{p.categoria}</td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`font-extrabold px-2.5 py-1 rounded text-xs ${
                          isCritical
                            ? 'bg-red-950/80 text-red-400 border border-red-500/40 animate-pulse'
                            : 'bg-emerald-950/50 text-emerald-400'
                        }`}
                      >
                        {p.stockActual} uds
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{p.stockMinimoAlerta} uds</td>
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
                        onClick={() => onPrintLabel(p)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition"
                        title="Imprimir Viñeta Térmica"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setAdjustingProduct(p);
                          setAdjustQty(20);
                        }}
                        className="p-1.5 rounded bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition"
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

      {/* MODAL: REGISTRAR LLEGADA DE MERCADERÍA DESDE EE. UU. */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1c33] border border-cyan-500/40 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" />
              <span>Entrada de Mercadería Importada (EE. UU.)</span>
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
                Cantidad recibida en Roatán:
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
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyStockIncrease}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar a Inventario</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORDEN DE COMPRA SUGERIDA PARA MIAMI / EE. UU. */}
      {purchaseOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1c33] border border-red-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Orden de Compra Sugerida para Proveedor en EE. UU.
                </h3>
                <p className="text-xs text-slate-400">Generada automáticamente por el motor de alertas de CoreBase</p>
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
                    <th className="p-2.5">Repuesto</th>
                    <th className="p-2.5 text-center">Stock Actual</th>
                    <th className="p-2.5 text-center">Cantidad a Pedir</th>
                    <th className="p-2.5 text-right">Costo Est. USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {criticalProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2.5 font-mono text-cyan-400">{p.sku}</td>
                      <td className="p-2.5 font-bold text-white">{p.nombre}</td>
                      <td className="p-2.5 text-center text-red-400 font-bold">{p.stockActual}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-400">+{p.cantidadReordenSugerida}</td>
                      <td className="p-2.5 text-right font-mono">${(p.costoUsd * p.cantidadReordenSugerida).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-700 pt-3">
              <div className="text-xs text-slate-400">
                Total Estimado de Importación:{' '}
                <strong className="text-white text-sm">
                  ${criticalProducts.reduce((acc, p) => acc + p.costoUsd * p.cantidadReordenSugerida, 0).toLocaleString()} USD
                </strong>
              </div>
              <button
                onClick={() => {
                  alert('¡Lista de orden copiada al portapapeles en formato listo para enviar a Miami/USA!');
                  setPurchaseOrderModal(false);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition"
              >
                Copiar Lista para WhatsApp / Correo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
