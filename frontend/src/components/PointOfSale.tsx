import React, { useEffect, useState } from 'react';
import type { Producto, ItemCarrito } from '../types';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Barcode,
  MapPin,
  CreditCard,
  Banknote,
  Landmark,
  AlertCircle,
  User,
  Receipt,
} from 'lucide-react';

interface PointOfSaleProps {
  products: Producto[];
  enable3D?: boolean;
  initialProductToAdd?: Producto | null;
  onClearInitialProduct?: () => void;
  onSaleComplete: (cart: ItemCarrito[]) => void;
  onLocateIn3D: (product: Producto) => void;
}

export const PointOfSale: React.FC<PointOfSaleProps> = ({
  products,
  enable3D = true,
  initialProductToAdd,
  onClearInitialProduct,
  onSaleComplete,
  onLocateIn3D,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeScanInput, setBarcodeScanInput] = useState('');
  const [cart, setCart] = useState<ItemCarrito[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO_HNL' | 'EFECTIVO_USD' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO_HNL');
  const [customerName, setCustomerName] = useState('Consumidor Final');
  const [customerRtn, setCustomerRtn] = useState('');
  const [cashTendered, setCashTendered] = useState<string>('');

  const showError = (msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => setErrorBanner(null), 4000);
  };

  // If navigated from 3D "Vender en POS" button, automatically add product to cart
  useEffect(() => {
    if (initialProductToAdd) {
      addToCart(initialProductToAdd);
      if (onClearInitialProduct) onClearInitialProduct();
    }
  }, [initialProductToAdd]);

  const categories = ['TODAS', ...Array.from(new Set(products.map((p) => p.categoria)))];

  // Barcode Scanner simulation or USB scanner Enter key event
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeScanInput.trim()) return;

    const matchedProduct = products.find(
      (p) =>
        p.codigoBarras === barcodeScanInput.trim() ||
        p.sku.toLowerCase() === barcodeScanInput.trim().toLowerCase()
    );

    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeScanInput('');
    } else {
      showError(`Código o SKU "${barcodeScanInput}" no encontrado en el catálogo.`);
    }
  };

  const addToCart = (product: Producto) => {
    if (product.stockActual <= 0) {
      showError(`Sin existencias disponibles de "${product.nombre}".`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.producto.id === product.id);
      if (existing) {
        if (existing.cantidad >= product.stockActual) {
          showError(`Stock máximo disponible alcanzado (${product.stockActual} unidades).`);
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
              showError(`Stock máximo disponible alcanzado (${item.producto.stockActual} uds).`);
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
  const totalItems = cart.reduce((a, b) => a + b.cantidad, 0);

  const openCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod('EFECTIVO_HNL');
    setCashTendered(String(totalHnl));
    setShowCheckoutModal(true);
  };

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const methodLabels = {
      EFECTIVO_HNL: 'Efectivo (L.)',
      EFECTIVO_USD: 'Efectivo ($ USD)',
      TARJETA: 'Tarjeta POS',
      TRANSFERENCIA: 'Transferencia Bancaria',
    };

    onSaleComplete(cart);
    setShowCheckoutModal(false);
    setSaleSuccessMessage(
      `¡Factura emitida a ${customerName || 'Consumidor Final'}! Total: L. ${totalHnl.toLocaleString()} ($${totalUsd.toFixed(
        2
      )} USD) • Pago: ${methodLabels[paymentMethod]}. Inventario actualizado.`
    );
    setCart([]);
    setCustomerName('Consumidor Final');
    setCustomerRtn('');
    setTimeout(() => setSaleSuccessMessage(null), 6000);
  };

  const tenderedNum = Number(cashTendered) || 0;
  const changeAmount =
    paymentMethod === 'EFECTIVO_HNL'
      ? Math.max(0, tenderedNum - totalHnl)
      : paymentMethod === 'EFECTIVO_USD'
      ? Math.max(0, tenderedNum - totalUsd)
      : 0;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigoBarras.includes(searchTerm);
    const matchesCat = selectedCategory === 'TODAS' || p.categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-16 lg:pb-0">
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
              className="bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition cursor-pointer"
            >
              Escanear
            </button>
          </form>
        </div>

        {/* SEARCH INPUT */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por producto, código, marca o categoría..."
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
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-[#0c1c33] text-slate-300 hover:bg-[#112645] border border-slate-700/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ERROR TOAST BANNER */}
        {errorBanner && (
          <div className="bg-red-950/90 border border-red-500/60 p-3 rounded-xl text-red-200 text-xs flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold">{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-red-300 hover:text-white font-bold">
              ✕
            </button>
          </div>
        )}

        {/* SUCCESS NOTIFICATION */}
        {saleSuccessMessage && (
          <div className="bg-emerald-950/80 border border-emerald-500/60 p-3.5 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{saleSuccessMessage}</span>
          </div>
        )}

        {/* PRODUCTS CARDS GRID (Click anywhere on card to add to cart!) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const isCritical = p.stockActual <= p.stockMinimoAlerta;
            const isPreventive =
              !isCritical && p.stockActual <= p.stockMinimoAlerta * 1.5;
            return (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className={`bg-[#0c1c33] border rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-cyan-400 hover:bg-[#102442]/90 transition group cursor-pointer select-none ${
                  isCritical
                    ? 'border-red-500/45'
                    : isPreventive
                    ? 'border-amber-500/45'
                    : 'border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded">
                      SKU: {p.sku}
                    </span>
                    {enable3D && p.ubicacionId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLocateIn3D(p);
                        }}
                        className="text-[11px] font-bold text-cyan-300 hover:text-white bg-[#112645] hover:bg-cyan-600 px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
                        title="Ver ubicación en Bodega 3D"
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
                          : isPreventive
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-950/60 text-emerald-400'
                      }`}
                    >
                      {p.stockActual} uds
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p);
                      }}
                      disabled={p.stockActual <= 0}
                      className="bg-cyan-500 group-hover:bg-cyan-400 disabled:bg-slate-700 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                      title="Agregar a la factura"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COL: ACTIVE TICKET / CART */}
      <div
        id="pos-ticket-panel"
        className="bg-[#0c1c33] border border-[#00d4ff]/30 rounded-xl p-4 flex flex-col justify-between shadow-xl"
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <ShoppingCart className="w-5 h-5 text-cyan-400" />
              <span>Factura Mostrador</span>
            </div>
            <span className="text-xs bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded-full font-mono">
              {totalItems} artículos
            </span>
          </div>

          {/* Cart items list */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                <p>El ticket está vacío.</p>
                <p className="mt-1">Toca cualquier producto o escanéalo para agregarlo.</p>
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
                      L. {item.producto.precioVentaHnl.toLocaleString()} c/u • Subtotal: L.{' '}
                      {(item.producto.precioVentaHnl * item.cantidad).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.producto.id, -1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-6 text-center text-white">{item.cantidad}</span>
                    <button
                      onClick={() => updateQuantity(item.producto.id, 1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.producto.id)}
                      className="p-1 rounded text-red-400 hover:bg-red-950/40 ml-1 cursor-pointer"
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
              <span>Subtotal Exento/Gravado:</span>
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
            onClick={openCheckout}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-extrabold py-3 rounded-lg text-sm transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>COBRAR Y FACTURAR ({totalItems})</span>
          </button>
        </div>
      </div>

      {/* MOBILE FLOATING CART BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-3 left-3 right-3 z-30 lg:hidden bg-[#09182e]/95 backdrop-blur-md border border-cyan-400/50 rounded-xl p-3 shadow-2xl flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-white">{totalItems} artículos en factura</p>
            <p className="text-sm font-extrabold text-cyan-400">
              L. {totalHnl.toLocaleString()}{' '}
              <span className="text-xs text-emerald-400 font-normal">(${totalUsd.toFixed(2)} USD)</span>
            </p>
          </div>
          <button
            onClick={openCheckout}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-lg"
          >
            Cobrar Ahora
          </button>
        </div>
      )}

      {/* MODAL: CHECKOUT, PAYMENT METHOD & CHANGE CALCULATOR */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleConfirmSale}
            className="bg-[#0c1c33] border border-cyan-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-extrabold text-white">Confirmar Cobro y Factura</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Totals Summary Banner */}
            <div className="bg-[#06101e] border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Total a Pagar (Lempiras)</span>
                <span className="text-xl font-black text-cyan-400">L. {totalHnl.toLocaleString()}</span>
              </div>
              <div className="text-right border-l border-slate-800 pl-4">
                <span className="text-[11px] text-slate-400 block">Total en Dólares</span>
                <span className="text-lg font-extrabold text-emerald-400">${totalUsd.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cliente:</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">RTN (Opcional):</label>
                <input
                  type="text"
                  placeholder="0801-XXXX-XXXXXX"
                  value={customerRtn}
                  onChange={(e) => setCustomerRtn(e.target.value)}
                  className="w-full bg-[#06101e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Método de Pago:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('EFECTIVO_HNL');
                    setCashTendered(String(totalHnl));
                  }}
                  className={`p-2.5 rounded-xl border font-bold flex items-center gap-2 transition cursor-pointer ${
                    paymentMethod === 'EFECTIVO_HNL'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-[#06101e] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-cyan-400" />
                  <span>Efectivo (L.)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('EFECTIVO_USD');
                    setCashTendered(String(totalUsd));
                  }}
                  className={`p-2.5 rounded-xl border font-bold flex items-center gap-2 transition cursor-pointer ${
                    paymentMethod === 'EFECTIVO_USD'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-[#06101e] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Efectivo ($ USD)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('TARJETA')}
                  className={`p-2.5 rounded-xl border font-bold flex items-center gap-2 transition cursor-pointer ${
                    paymentMethod === 'TARJETA'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-[#06101e] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>Tarjeta POS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFERENCIA')}
                  className={`p-2.5 rounded-xl border font-bold flex items-center gap-2 transition cursor-pointer ${
                    paymentMethod === 'TRANSFERENCIA'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-[#06101e] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Landmark className="w-4 h-4 text-cyan-400" />
                  <span>Transferencia</span>
                </button>
              </div>
            </div>

            {/* Cash Received & Change Calculation */}
            {(paymentMethod === 'EFECTIVO_HNL' || paymentMethod === 'EFECTIVO_USD') && (
              <div className="bg-[#06101e] border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300">
                    Monto Recibido ({paymentMethod === 'EFECTIVO_HNL' ? 'Lempiras L.' : 'Dólares $'}):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-32 bg-[#0c1c33] border border-cyan-500/40 rounded-lg px-2.5 py-1 text-right text-sm font-mono font-extrabold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400 font-semibold">Cambio / Vuelto a Entregar:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {paymentMethod === 'EFECTIVO_HNL'
                      ? `L. ${changeAmount.toLocaleString()}`
                      : `$${changeAmount.toFixed(2)} USD`}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Volver
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Emitir Factura</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
