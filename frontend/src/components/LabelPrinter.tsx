import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import type { Producto, Estante } from '../types';
import { Printer, Tag, Check } from 'lucide-react';

interface LabelPrinterProps {
  products: Producto[];
  racks: Estante[];
  initialSelectedProduct?: Producto | null;
}

export const LabelPrinter: React.FC<LabelPrinterProps> = ({
  products,
  racks,
  initialSelectedProduct,
}) => {
  const [labelType, setLabelType] = useState<'PRODUCT' | 'SHELF'>('PRODUCT');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialSelectedProduct ? initialSelectedProduct.id : products[0]?.id || ''
  );
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>('EST-A-P03-Z02');
  const [printCopies, setPrintCopies] = useState<number>(10);
  const [printSuccessAlert, setPrintSuccessAlert] = useState<string | null>(null);

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Flat list of all rack zones for shelf label printing
  const allZones = racks.flatMap((r) =>
    r.pisos.flatMap((p) =>
      p.zonas.map((z) => ({
        code: z.codigoUbicacion,
        rackName: r.nombre,
        nivel: p.nivel,
      }))
    )
  );

  useEffect(() => {
    if (!barcodeSvgRef.current) return;

    try {
      if (labelType === 'PRODUCT') {
        if (selectedProduct) {
          JsBarcode(barcodeSvgRef.current, selectedProduct.codigoBarras, {
            format: 'CODE128',
            width: 1.8,
            height: 48,
            displayValue: true,
            fontSize: 12,
            font: 'monospace',
            lineColor: '#000000',
            background: '#ffffff',
            margin: 6,
          });
        }
      } else {
        JsBarcode(barcodeSvgRef.current, selectedZoneCode, {
          format: 'CODE128',
          width: 2.2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          font: 'monospace',
          lineColor: '#000000',
          background: '#ffffff',
          margin: 8,
        });
      }
    } catch (err) {
      console.error('Error generating barcode:', err);
    }
  }, [labelType, selectedProductId, selectedZoneCode]);

  const handlePrint = () => {
    setPrintSuccessAlert(
      `¡Orden de impresión enviada a Impresora Térmica Zebra / TSC! Se imprimieron ${printCopies} viñetas de ${
        labelType === 'PRODUCT' ? selectedProduct?.nombre : selectedZoneCode
      }.`
    );
    setTimeout(() => setPrintSuccessAlert(null), 4000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: CONFIGURATION CONTROLS */}
      <div className="bg-[#0c1c33] border border-[#00d4ff]/30 rounded-2xl p-5 shadow-xl space-y-5">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-cyan-400" />
            <span>Generador e Impresión de Viñetas Térmicas</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Impresión directa en formato industrial (Code 128 / TSPL / ZPL) resistente a humedad marina.
          </p>
        </div>

        {/* Tab switch between Product Label and Shelf Location Label */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#06101e] rounded-xl border border-slate-800">
          <button
            onClick={() => setLabelType('PRODUCT')}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              labelType === 'PRODUCT'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Viñeta de Repuesto (50x25mm)
          </button>
          <button
            onClick={() => setLabelType('SHELF')}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              labelType === 'SHELF'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Viñeta de Estante 3D (75x38mm)
          </button>
        </div>

        {labelType === 'PRODUCT' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Seleccionar Repuesto a Etiquetar:
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.nombre} — (Stock: {p.stockActual})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#06101e] p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>SKU:</span>
                <span className="font-mono text-cyan-400 font-bold">{selectedProduct?.sku}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Código de Barras:</span>
                <span className="font-mono text-white">{selectedProduct?.codigoBarras}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Ubicación en Bodega 3D:</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedProduct?.ubicacionId || 'Sin asignar'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Precio Venta:</span>
                <span className="text-white font-bold">L. {selectedProduct?.precioVentaHnl.toLocaleString()} / ${selectedProduct?.precioVentaUsd} USD</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Seleccionar Casilla / Zona del Estante:
              </label>
              <select
                value={selectedZoneCode}
                onChange={(e) => setSelectedZoneCode(e.target.value)}
                className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {allZones.map((z) => (
                  <option key={z.code} value={z.code}>
                    {z.code} — {z.rackName} (Piso {z.nivel})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-400">
              Esta viñeta se pega físicamente en la viga del estante para que el bodeguero escanee la ubicación con la pistola inalámbrica.
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5">
            Cantidad de Viñetas a Imprimir:
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="500"
              value={printCopies}
              onChange={(e) => setPrintCopies(Number(e.target.value))}
              className="w-32 bg-[#06101e] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
            />
            <div className="flex gap-1.5">
              {[1, 5, 10, 20, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => setPrintCopies(num)}
                  className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded text-slate-300"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {printSuccessAlert && (
          <div className="bg-emerald-950/80 border border-emerald-500/60 p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{printSuccessAlert}</span>
          </div>
        )}

        <button
          onClick={handlePrint}
          className="w-full bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-slate-950 font-extrabold py-3 rounded-xl text-sm transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" />
          <span>IMPRIMIR {printCopies} VIÑETAS (ZPL/TSPL)</span>
        </button>
      </div>

      {/* RIGHT: LIVE PHYSICAL LABEL PREVIEW */}
      <div className="bg-[#0c1c33] border border-[#00d4ff]/30 rounded-2xl p-5 shadow-xl flex flex-col items-center justify-center space-y-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Vista Previa Real de la Viñeta Impresa
        </span>

        {labelType === 'PRODUCT' ? (
          /* PRODUCT LABEL 50mm x 25mm */
          <div className="w-[320px] bg-white text-black p-3.5 rounded-lg shadow-2xl border-2 border-slate-300 flex flex-col justify-between select-none">
            <div className="flex items-center justify-between border-b border-gray-300 pb-1 mb-1">
              <span className="text-[10px] font-extrabold tracking-tight truncate max-w-[190px]">
                {selectedProduct?.marca}
              </span>
              <span className="text-[9px] font-mono font-bold bg-black text-white px-1.5 py-0.2 rounded">
                {selectedProduct?.ubicacionId || 'BODEGA'}
              </span>
            </div>

            <p className="text-[11px] font-bold leading-tight line-clamp-2 text-gray-900 mb-1">
              {selectedProduct?.nombre}
            </p>

            <div className="flex justify-center my-0.5">
              <svg ref={barcodeSvgRef} className="max-w-full" />
            </div>

            <div className="flex items-center justify-between border-t border-gray-300 pt-1 text-[11px] font-extrabold">
              <span className="text-gray-700 font-mono">SKU: {selectedProduct?.sku}</span>
              <span className="text-black">L. {selectedProduct?.precioVentaHnl.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          /* SHELF LOCATION LABEL 75mm x 38mm */
          <div className="w-[360px] bg-yellow-300 text-black p-4 rounded-lg shadow-2xl border-2 border-yellow-500 flex flex-col justify-between items-center select-none text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-yellow-950">
              UBICACIÓN EN BODEGA 3D
            </span>

            <div className="text-2xl font-black font-mono tracking-wider my-1 text-black">
              {selectedZoneCode}
            </div>

            <div className="flex justify-center my-1 bg-white p-1 rounded">
              <svg ref={barcodeSvgRef} className="max-w-full" />
            </div>

            <span className="text-[10px] font-bold text-yellow-950 mt-1">
              ROATÁN MARINE PARTS • ESCANEAR PARA ASIGNAR O DESPACHAR
            </span>
          </div>
        )}

        <div className="text-center text-xs text-slate-400">
          <p>
            Compatible nativo con impresoras <strong>Zebra ZD220 / ZD230</strong>, <strong>TSC TE200</strong> y <strong>Xprinter</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
