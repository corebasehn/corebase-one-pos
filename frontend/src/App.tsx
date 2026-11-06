import { useState } from 'react';
import { INITIAL_PRODUCTS, INITIAL_RACKS } from './data/mockData';
import type { Producto, Estante, ItemCarrito } from './types';
import { Warehouse3D } from './components/Warehouse3D';
import { PointOfSale } from './components/PointOfSale';
import { InventoryManager } from './components/InventoryManager';
import { LabelPrinter } from './components/LabelPrinter';
import { RackConfigurator } from './components/RackConfigurator';
import { Box, ShoppingCart, Package, Printer, Settings, ShieldCheck, Radio } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'3D' | 'POS' | 'INVENTORY' | 'CONFIG' | 'LABELS'>('3D');
  const [products, setProducts] = useState<Producto[]>(INITIAL_PRODUCTS);
  const [racks, setRacks] = useState<Estante[]>(INITIAL_RACKS);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

  // When a sale is completed, deduct stock
  const handleSaleComplete = (cart: ItemCarrito[]) => {
    setProducts((prev) =>
      prev.map((prod) => {
        const itemSold = cart.find((c) => c.producto.id === prod.id);
        if (itemSold) {
          const newStock = Math.max(0, prod.stockActual - itemSold.cantidad);
          return {
            ...prod,
            stockActual: newStock,
            estadoPedidoUsa: newStock <= prod.stockMinimoAlerta ? 'CRITICO' : 'NINGUNO',
          };
        }
        return prod;
      })
    );
  };

  // Update product stock (e.g. arrival of shipment from USA)
  const handleUpdateStock = (productId: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            stockActual: newStock,
            estadoPedidoUsa: newStock <= p.stockMinimoAlerta ? 'CRITICO' : 'NINGUNO',
          };
        }
        return p;
      })
    );
  };

  // Switch to 3D and focus on a specific product
  const handleLocateIn3D = (product: Producto) => {
    setSelectedProduct(product);
    setActiveTab('3D');
  };

  // Switch to Labels tab for a specific product
  const handlePrintLabel = (product: Producto) => {
    setSelectedProduct(product);
    setActiveTab('LABELS');
  };

  const criticalAlertsCount = products.filter((p) => p.stockActual <= p.stockMinimoAlerta).length;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans">
      {/* TOP CORPORATE NAVIGATION BAR */}
      <header className="bg-[#06101e]/95 backdrop-blur-md border-b border-[#00d4ff]/25 sticky top-0 z-40 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Client Identification */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg border border-emerald-500/50 shadow-md shadow-emerald-500/10">
              <img src="/Logo_CoreBase.png" alt="CoreBase Solutions" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white tracking-tight">CoreBase Solutions</span>
                <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                  WMS 3D • ROATÁN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sistema POS, Inventario con Alertas EE. UU. y Bodega en 3D
              </p>
            </div>
          </div>

          {/* Hardware & Cloud Status Indicators */}
          <div className="hidden lg:flex items-center gap-4 text-[11px] bg-[#0c1c33]/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Pistola 2D: Online (USB 2.4G)</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <Printer className="w-3.5 h-3.5" />
              <span>Impresora Viñetas: Lista</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Servidor: Conectado</span>
            </div>
          </div>

          {/* Main Module Tabs */}
          <nav className="flex items-center gap-1 bg-[#091426] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('3D')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === '3D'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Bodega 3D</span>
            </button>

            <button
              onClick={() => setActiveTab('POS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'POS'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Punto de Venta</span>
            </button>

            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'INVENTORY'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inventario</span>
              {criticalAlertsCount > 0 && (
                <span className="bg-red-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {criticalAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('CONFIG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'CONFIG'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurar Estantes</span>
            </button>

            <button
              onClick={() => setActiveTab('LABELS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'LABELS'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Viñetas</span>
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* ACTIVE MODULE VIEW */}
        {activeTab === '3D' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <span>Gemelo Digital de la Bodega (Modelo 3D Interactivo)</span>
                  <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    60 FPS WebGL
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Arrastra con el ratón para rotar 360° &middot; Rueda para zoom &middot; Haz clic en cualquier casilla para ver el repuesto asignado.
                </p>
              </div>

              {selectedProduct && (
                <div className="flex items-center gap-2 bg-[#0c1c33] border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-400">Enfocado:</span>
                  <strong className="text-cyan-300 truncate max-w-xs">{selectedProduct.nombre}</strong>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-slate-400 hover:text-white text-xs ml-1 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <Warehouse3D
              racks={racks}
              products={products}
              selectedProduct={selectedProduct}
              onSelectProduct={setSelectedProduct}
              onSelectZone={(code) => console.log('Zona seleccionada:', code)}
            />
          </div>
        )}

        {activeTab === 'POS' && (
          <PointOfSale
            products={products}
            onSaleComplete={handleSaleComplete}
            onLocateIn3D={handleLocateIn3D}
          />
        )}

        {activeTab === 'INVENTORY' && (
          <InventoryManager
            products={products}
            onUpdateStock={handleUpdateStock}
            onLocateIn3D={handleLocateIn3D}
            onPrintLabel={handlePrintLabel}
          />
        )}

        {activeTab === 'CONFIG' && (
          <RackConfigurator
            racks={racks}
            products={products}
            onUpdateRacks={setRacks}
            onUpdateProducts={setProducts}
            onSwitchTo3D={() => setActiveTab('3D')}
          />
        )}

        {activeTab === 'LABELS' && (
          <LabelPrinter
            products={products}
            racks={racks}
            initialSelectedProduct={selectedProduct}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-[#040b16] border-t border-slate-800 text-[11px] text-slate-400 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>CoreBase Solutions S. de R.L.</strong> • Soluciones de Software Industrial, WMS 3D y Automatización
          </span>
          <span className="text-slate-400">
            Diseñado para Bodega de Repuestos Marinos • Roatán, Islas de la Bahía
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
