export type FormaEstante = 'RECTANGULAR' | 'FORMA_L';
export type TipoEstanteria = 'GONDOLA_COMERCIAL' | 'RACK_PESADO';

export interface ZonaEstante {
  id: string;
  codigoUbicacion: string; // Ej: 'EST-A-P03-Z02' o 'EST-L-P01-B01'
  ordenIzquierda: number;  // 1, 2, 3...
  porcentajeAncho: number; // 25 = 25% del piso
  brazo?: 'PRINCIPAL' | 'BRAZO_L'; // Indica en qué tramo de la L se encuentra
  productoId?: string;     // ID del producto asignado (o undefined si está libre)
}

export interface PisoEstante {
  id: string;
  nivel: number;           // 1 (inferior) a N (superior)
  alturaBaseM: number;
  altoUtilM: number;
  zonas: ZonaEstante[];
}

export interface Estante {
  id: string;
  codigo: string;          // Ej: 'EST-A'
  nombre: string;          // Ej: 'Pasillo 1 - Motores y Bombas'
  categoria: string;
  forma: FormaEstante;     // 'RECTANGULAR' o 'FORMA_L'
  tipoVisual: TipoEstanteria; // 'GONDOLA_COMERCIAL' (beige) o 'RACK_PESADO' (azul/naranja)
  posX: number;            // Coordenada X en la escena 3D
  posZ: number;            // Coordenada Z en la escena 3D
  rotacionGrados: number;  // 0, 90, 180, 270
  anchoM: number;          // Largo del estante o brazo principal en metros (ej: 3.8m)
  largoBrazoL?: number;    // Largo del brazo en L en metros (ej: 2.6m)
  profundidadM: number;    // Fondo (ej: 0.8m)
  altoM: number;           // Altura total (ej: 2.8m o 3.5m)
  pisos: PisoEstante[];
}

export interface Producto {
  id: string;
  sku: string;             // Ej: 'RTR-4G-MAR'
  codigoBarras: string;    // Ej: '742100892012'
  nombre: string;          // Ej: 'Router Marino Dual Band 4G/LTE'
  marca: string;           // Ej: 'MikroTik / Teltonika Marine'
  categoria: string;
  precioVentaHnl: number;  // Lempiras
  precioVentaUsd: number;  // Dólares
  costoUsd: number;
  stockActual: number;
  stockMinimoAlerta: number;       // Ej: 10 unidades
  cantidadReordenSugerida: number; // Ej: Pedir 20 a USA
  leadTimeDias: number;            // Días que tarda desde Miami/USA
  estadoPedidoUsa?: 'NINGUNO' | 'CRITICO' | 'EN_TRANSITO';
  ubicacionId?: string;    // Código de ubicación Ej: 'EST-A-P03-Z02'
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}
