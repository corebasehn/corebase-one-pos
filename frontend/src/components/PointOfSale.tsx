import React, { useState } from 'react';
import type { Producto, ItemCarrito } from '../types';
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle, Barcode, MapPin } from 'lucide-react';

interface PointOfSaleProps {
  products: Producto[];
  onSaleComplete: (cart: ItemCarrito[]) => void;
  onLocateIn3D: (product: Producto) => void;
}

export const PointOfSale: React.FC<PointOfSaleProps> = ({
  products,
  onSaleComplete,
  onLocateIn3D,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeScanInput, setBarcodeScanInput] = useState('');
  const [cart, setCart] = useState<ItemCarrito[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);

  const categories = ['TODAS', ...Array.from(new Set(products.map((p) => p.categoria)))];

  // Barcode Scanner simulation or USB scanner Enter key event
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeScanInput.trim()) return;

    const matchedProduct = products.find(
      (p) => p.codigoBarras === barcodeScanInput.trim() || p.sku.toLowerCase() === barcodeScanInput.trim().toLowerCase()
    );

    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeScanInput('');
    } else {
      alert(`Código o SKU "${barcodeScanInput}" no encontrado en el catálogo.`);
    }
  };

  const addToCart = (product: Producto) => {
    if (product.stockActual <= 0) {
      alert(`¡No hay existencias disponibles de ${product.nombre}!`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.producto.id === product.id);
      if (existing) {
        if (existing.cantidad >= product.stockActual) {
          alert(`Stock máximo disponible alcanzado (${product.stockActual} unidades).`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.producto.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prevCart, { producto: product, cantidad: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.producto.id === productId) {
            const newQty = item.cantidad + delta;
            if (newQty > item.producto.stockActual) {
              alert(`Stock máximo disponible alcanzado (${item.producto.stockActual} uds).`);
              return item;
            }
            return { ...item, cantidad: newQty };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.producto.id !== productId));
  };

  const totalHnl = cart.reduce((acc, item) => acc + item.producto.precioVentaHnl * item.cantidad, 0);
  const totalUsd = cart.reduce((acc, item) => acc + item.producto.precioVentaUsd * item.cantidad, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    onSaleComplete(cart);
    setSaleSuccessMessage(`¡Venta realizada con éxito! Total: L. ${totalHnl.toLocaleString()} ($${totalUsd.toFixed(2)} USD). Kárdex e inventario actualizados.`);
    setCart([]);
    setTimeout(() => setSaleSuccessMessage(null), 5000);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigoBarras.includes(searchTerm);
    const matchesCat = selectedCategory === 'TODAS' || p.categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* LEFT 2 COLS: SEARCH, SCANNER & PRODUCT CATALOG */}
      <div className="lg:col-span-2 space-y-4">
        {/* BARCODE SCANNER LIVE INPUT */}
        <div className="bg-[#0c1c33] border border-[#00d4ff]/40 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm whitespace-nowrap">
            <Barcode className="w-5 h-5 animate-pulse text-cyan-300" />
            <span>Pistola Lectora de Barras:</span>
          </div>
          <form onSubmit={handleBarcodeSubmit} className="flex-1 flex gap-2 w-full">
            <input
              type="text"
              placeholder="Escanea con la pistola o digita el SKU (ej: 74210982001 o RTR-4G-MAR)..."
              value={barcodeScanInput}
              onChange={(e) => setBarcodeScanInput(e.target.value)}
              className="flex-1 bg-[#06101e] border border-cyan-500/30 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition"
            >
              Escanear
            </button>
          </form>
        </div>

        {/* SEARCH & CATEGORY CHIPS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por repuesto, bomba, filtro, marca, hélice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0c1c33] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-[#0c1c33] text-slate-300 hover:bg-[#112645] border border-slate-700/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* SUCCESS NOTIFICATION */}
        {saleSuccessMessage && (
          <div className="bg-emerald-950/80 border border-emerald-500/60 p-3.5 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{saleSuccessMessage}</span>
          </div>
        )}

        {/* PRODUCTS CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const isCritical = p.stockActual <= p.stockMinimoAlerta;
            return (
              <div
                key={p.id}
                className={`bg-[#0c1c33] border rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-cyan-500/50 transition group ${
                  isCritical ? 'border-red-500/40' : 'border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded">
                      SKU: {p.sku}
                    </span>
                    {p.ubicacionId && (
                      <button
                        onClick={() => onLocateIn3D(p)}
                        className="text-[11px] font-bold text-cyan-300 hover:text-white bg-[#112645] hover:bg-cyan-600 px-2 py-0.5 rounded flex items-center gap-1 transition"
                        title="Ver ubicación en 3D"
                      >
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        <span>{p.ubicacionId}</span>
                      </button>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-cyan-200 transition">
                    {p.nombre}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.marca}</p>
                </div>

                <div className="flex items-end justify-between border-t border-slate-800/80 pt-2">
                  <div>
                    <div className="text-sm font-extrabold text-cyan-400">
                      L. {p.precioVentaHnl.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">${p.precioVentaUsd} USD</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        isCritical
                          ? 'bg-red-950/80 text-red-400 border border-red-500/40 animate-pulse'
                          : 'bg-emerald-950/60 text-emerald-400'
                      }`}
                    >
                      {p.stockActual} uds
                    </span>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={p.stockActual <= 0}
                      className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-950 font-bold p-1.5 rounded-lg transition"
                      title="Agregar a la factura"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COL: ACTIVE TICKET / CART */}
      <div className="bg-[#0c1c33] border border-[#00d4ff]/30 rounded-xl p-4 flex flex-col justify-between shadow-xl">
        <div>
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <ShoppingCart className="w-5 h-5 text-cyan-400" />
              <span>Factura Mostrador</span>
            </div>
            <span className="text-xs bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded-full font-mono">
              {cart.reduce((a, b) => a + b.cantidad, 0)} artículos
            </span>
          </div>

          {/* Cart items list */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                <p>El ticket está vacío.</p>
                <p className="mt-1">Escanea un repuesto con la pistola para agregarlo.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.producto.id}
                  className="bg-[#06101e] border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.producto.nombre}</p>
                    <p className="text-[10px] text-cyan-400">
                      L. {item.producto.precioVentaHnl.toLocaleString()} c/u
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.producto.id, -1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-6 text-center text-white">{item.cantidad}</span>
                    <button
                      onClick={() => updateQuantity(item.producto.id, 1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.producto.id)}
                      className="p-1 rounded text-red-400 hover:bg-red-950/40 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TOTALS & CHECKOUT BUTTON */}
        <div className="border-t border-slate-700/80 pt-3 mt-4 space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span>L. {(totalHnl * 0.85).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>I.S.V. (15%):</span>
              <span>L. {(totalHnl * 0.15).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-white border-t border-slate-800 pt-1">
              <span>Total Lempiras:</span>
              <span className="text-cyan-400">L. {totalHnl.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Equivalente en Dólares:</span>
              <span className="text-emerald-400 font-bold">${totalUsd.toFixed(2)} USD</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-extrabold py-3 rounded-lg text-sm transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>COBRAR Y DESPACHAR (F1)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
