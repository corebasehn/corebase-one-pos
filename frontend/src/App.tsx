import { useState } from 'react';
import { INITIAL_PRODUCTS, INITIAL_RACKS } from './data/mockData';
import type { Producto, Estante, ItemCarrito } from './types';
import { Warehouse3D } from './components/Warehouse3D';
import { PointOfSale } from './components/PointOfSale';
import { InventoryManager } from './components/InventoryManager';
import { LabelPrinter } from './components/LabelPrinter';
import { RackConfigurator } from './components/RackConfigurator';
import { Box, ShoppingCart, Package, Printer, Settings, ShieldCheck, Radio, Layers } from 'lucide-react';

export function App() {
  const [enable3D, setEnable3D] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'3D' | 'POS' | 'INVENTORY' | 'CONFIG' | 'LABELS'>('3D');
  const [products, setProducts] = useState<Producto[]>(INITIAL_PRODUCTS);
  const [racks, setRacks] = useState<Estante[]>(INITIAL_RACKS);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [posProductToAdd, setPosProductToAdd] = useState<Producto | null>(null);

  const handleToggle3DModule = () => {
    setEnable3D((prev) => {
      const next = !prev;
      if (!next && (activeTab === '3D' || activeTab === 'CONFIG')) {
        setActiveTab('POS');
      }
      return next;
    });
  };

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

  // Update product stock (e.g. arrival of shipment)
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

  // Create or edit product and synchronize 3D rack slot assignment
  const handleSaveProduct = (savedProd: Producto, isNew: boolean) => {
    setProducts((prev) => {
      // If another product had this same ubicacionId, free it
      const cleaned = prev.map((p) =>
        savedProd.ubicacionId && p.ubicacionId === savedProd.ubicacionId && p.id !== savedProd.id
          ? { ...p, ubicacionId: undefined }
          : p
      );
      if (isNew) {
        return [savedProd, ...cleaned];
      }
      return cleaned.map((p) => (p.id === savedProd.id ? savedProd : p));
    });

    // Synchronize rack zones with the product's ubicacionId
    setRacks((prevRacks) =>
      prevRacks.map((rack) => ({
        ...rack,
        pisos: rack.pisos.map((piso) => ({
          ...piso,
          zonas: piso.zonas.map((zona) => {
            if (zona.codigoUbicacion === savedProd.ubicacionId) {
              return { ...zona, productoId: savedProd.id };
            }
            if (zona.productoId === savedProd.id && zona.codigoUbicacion !== savedProd.ubicacionId) {
              return { ...zona, productoId: undefined };
            }
            return zona;
          }),
        })),
      }))
    );
  };

  // Switch to 3D and focus on a specific product
  const handleLocateIn3D = (product: Producto) => {
    if (!enable3D) return;
    setSelectedProduct(product);
    setActiveTab('3D');
  };

  // Switch to POS and add the product to invoice
  const handleGoToPosWithProduct = (product: Producto) => {
    setPosProductToAdd(product);
    setActiveTab('POS');
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
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Brand & Suite Identification */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-lg border border-emerald-500/50 shadow-md shadow-emerald-500/10">
                <img src="/Logo_CoreBase.png" alt="CoreBase Solutions" className="h-8 w-auto object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-white tracking-tight">CoreBase One</span>
                  <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                    {enable3D ? 'POS 3D • SUITE' : 'POS & INVENTARIO'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {enable3D
                    ? 'Punto de Venta, Inventario Inteligente y Gemelo Digital 3D'
                    : 'Sistema de Punto de Venta e Inventario Empresarial'}
                </p>
              </div>
            </div>

            {/* Mobile 3D Module Switch */}
            <button
              onClick={handleToggle3DModule}
              className={`lg:hidden px-2.5 py-1 rounded-lg text-[10px] font-extrabold border flex items-center gap-1 transition cursor-pointer ${
                enable3D
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Activar o desactivar el módulo de Bodega 3D según plan del cliente"
            >
              <Layers className="w-3 h-3" />
              <span>3D: {enable3D ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Hardware, Cloud Status & Suite Plan Switch */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] bg-[#0c1c33]/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Pistola 2D: Online</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <Printer className="w-3.5 h-3.5" />
              <span>Impresora: Lista</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 font-medium border-r border-slate-700 pr-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloud: Activo</span>
            </div>
            <button
              onClick={handleToggle3DModule}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border flex items-center gap-1.5 transition cursor-pointer ${
                enable3D
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Simular licencia de cliente con o sin Gemelo Digital 3D"
            >
              <Layers className="w-3 h-3" />
              <span>Módulo 3D: {enable3D ? 'ACTIVO' : 'INACTIVO'}</span>
            </button>
          </div>

          {/* Main Module Tabs */}
          <nav className="flex items-center gap-1 bg-[#091426] p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {enable3D && (
              <button
                onClick={() => setActiveTab('3D')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === '3D'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Bodega 3D</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('POS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
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

            {enable3D && (
              <button
                onClick={() => setActiveTab('CONFIG')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'CONFIG'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar Estantes</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('LABELS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
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
        {enable3D && activeTab === '3D' && (
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
                  Arrastra para rotar 360° &middot; Pellizca o usa rueda para zoom &middot; Toca cualquier casilla para operar el producto.
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
              onSelectZone={() => {}}
              onGoToPos={handleGoToPosWithProduct}
              onPrintLabel={handlePrintLabel}
              onGoToConfig={() => setActiveTab('CONFIG')}
            />
          </div>
        )}

        {activeTab === 'POS' && (
          <PointOfSale
            products={products}
            enable3D={enable3D}
            initialProductToAdd={posProductToAdd}
            onClearInitialProduct={() => setPosProductToAdd(null)}
            onSaleComplete={handleSaleComplete}
            onLocateIn3D={handleLocateIn3D}
          />
        )}

        {activeTab === 'INVENTORY' && (
          <InventoryManager
            products={products}
            racks={racks}
            enable3D={enable3D}
            onUpdateStock={handleUpdateStock}
            onSaveProduct={handleSaveProduct}
            onLocateIn3D={handleLocateIn3D}
            onPrintLabel={handlePrintLabel}
          />
        )}

        {enable3D && activeTab === 'CONFIG' && (
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
            <strong>CoreBase One {enable3D ? 'POS 3D' : 'POS'}</strong> • Un producto de{' '}
            <strong>CoreBase Solutions S. de R.L.</strong>
          </span>
          <span className="text-slate-400">
            Suite Empresarial de Punto de Venta, Inventario y Gemelo Digital 3D
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
