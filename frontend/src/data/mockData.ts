import type { Estante, Producto, PisoEstante, ZonaEstante } from '../types';

export const INITIAL_PRODUCTS: Producto[] = [
  {
    id: 'prod-1',
    sku: 'RTR-4G-MAR',
    codigoBarras: '74210982001',
    nombre: 'Router Marino Dual Band 4G/LTE Especial Embarcaciones',
    marca: 'Teltonika Marine',
    categoria: 'Electrónica y Navegación',
    precioVentaHnl: 8500,
    precioVentaUsd: 340,
    costoUsd: 210,
    stockActual: 10, // ¡Ejemplo crítico de la llamada!
    stockMinimoAlerta: 10,
    cantidadReordenSugerida: 20,
    leadTimeDias: 12,
    estadoPedidoUsa: 'CRITICO',
    ubicacionId: 'EST-B-P03-Z02',
  },
  {
    id: 'prod-2',
    sku: 'PUMP-RULE-1500',
    codigoBarras: '74210982002',
    nombre: 'Bomba de Achique Automática Rule 1500 GPH 12V Sumergible',
    marca: 'Rule / Xylem',
    categoria: 'Bombas y Plomería Marina',
    precioVentaHnl: 3200,
    precioVentaUsd: 128,
    costoUsd: 75,
    stockActual: 38,
    stockMinimoAlerta: 15,
    cantidadReordenSugerida: 30,
    leadTimeDias: 10,
    estadoPedidoUsa: 'NINGUNO',
    ubicacionId: 'EST-B-P02-Z01',
  },
  {
    id: 'prod-3',
    sku: 'FLT-RACOR-500',
    codigoBarras: '74210982003',
    nombre: 'Filtro Separador de Agua y Combustible Racor 500FG Turbine',
    marca: 'Parker Racor',
    categoria: 'Filtros y Combustible',
    precioVentaHnl: 2850,
    precioVentaUsd: 114,
    costoUsd: 68,
    stockActual: 7, // Stock Crítico
    stockMinimoAlerta: 12,
    cantidadReordenSugerida: 25,
    leadTimeDias: 14,
    estadoPedidoUsa: 'CRITICO',
    ubicacionId: 'EST-B-P03-Z01',
  },
  {
    id: 'prod-4',
    sku: 'PROP-YAM-150',
    codigoBarras: '74210982004',
    nombre: 'Hélice de Aluminio 3 Aspas para Motor Fuera de Borda Yamaha 150HP',
    marca: 'Yamaha Marine',
    categoria: 'Motores y Propulsión',
    precioVentaHnl: 6900,
    precioVentaUsd: 276,
    costoUsd: 170,
    stockActual: 3,
    stockMinimoAlerta: 2,
    cantidadReordenSugerida: 5,
    leadTimeDias: 18,
    estadoPedidoUsa: 'NINGUNO',
    ubicacionId: 'EST-F-P01-Z01',
  },
  {
    id: 'prod-5',
    sku: 'OIL-YAMALUBE-4T',
    codigoBarras: '74210982005',
    nombre: 'Aceite de Motor Marino 4 Tiempos Yamalube 10W-30 (Galón)',
    marca: 'Yamalube',
    categoria: 'Aceites y Lubricantes',
    precioVentaHnl: 1150,
    precioVentaUsd: 46,
    costoUsd: 28,
    stockActual: 84,
    stockMinimoAlerta: 25,
    cantidadReordenSugerida: 50,
    leadTimeDias: 8,
    estadoPedidoUsa: 'NINGUNO',
    ubicacionId: 'EST-A-P01-Z01',
  },
  {
    id: 'prod-6',
    sku: 'ALT-PRESTO-12V',
    codigoBarras: '74210982006',
    nombre: 'Alternador Marino de Alta Salida 12V 105A Ignición Protegida',
    marca: 'Prestolite Marine',
    categoria: 'Sistema Eléctrico',
    precioVentaHnl: 7400,
    precioVentaUsd: 296,
    costoUsd: 185,
    stockActual: 9, // Stock Crítico
    stockMinimoAlerta: 10,
    cantidadReordenSugerida: 15,
    leadTimeDias: 15,
    estadoPedidoUsa: 'CRITICO',
    ubicacionId: 'EST-C-P02-Z02',
  },
  {
    id: 'prod-7',
    sku: 'IMP-JABSCO-YAN',
    codigoBarras: '74210982007',
    nombre: 'Impeller de Bomba de Agua Salada Neopreno para Yanmar 4JH',
    marca: 'Jabsco',
    categoria: 'Enfriamiento y Mangueras',
    precioVentaHnl: 1450,
    precioVentaUsd: 58,
    costoUsd: 32,
    stockActual: 42,
    stockMinimoAlerta: 15,
    cantidadReordenSugerida: 30,
    leadTimeDias: 10,
    estadoPedidoUsa: 'NINGUNO',
    ubicacionId: 'EST-A-P03-Z01',
  },
  {
    id: 'prod-8',
    sku: 'SCR-SS316-BOX',
    codigoBarras: '74210982008',
    nombre: 'Tornillo Marino Cabeza Hexagonal Acero Inox 316 (Caja 100u 1/4"x2")',
    marca: 'Marine Bolt USA',
    categoria: 'Tornillería Inoxidable',
    precioVentaHnl: 850,
    precioVentaUsd: 34,
    costoUsd: 18,
    stockActual: 65,
    stockMinimoAlerta: 20,
    cantidadReordenSugerida: 50,
    leadTimeDias: 8,
    estadoPedidoUsa: 'NINGUNO',
    ubicacionId: 'EST-D-P02-Z01',
  },
];

// Helper to generate 3 standard levels with N zones
function generate3Levels(rackCode: string, zonesPerLevel: number): PisoEstante[] {
  const levels: PisoEstante[] = [];
  const heights = [0.2, 0.8, 1.4];

  for (let lvl = 1; lvl <= 3; lvl++) {
    const zonas: ZonaEstante[] = [];
    for (let z = 1; z <= zonesPerLevel; z++) {
      zonas.push({
        id: `z-${rackCode.toLowerCase()}-${lvl}-${z}`,
        codigoUbicacion: `${rackCode}-P0${lvl}-Z0${z}`,
        ordenIzquierda: z,
        porcentajeAncho: Math.floor(100 / zonesPerLevel),
        brazo: 'PRINCIPAL',
      });
    }

    levels.push({
      id: `piso-${rackCode.toLowerCase()}-${lvl}`,
      nivel: lvl,
      alturaBaseM: heights[lvl - 1],
      altoUtilM: 0.55,
      zonas,
    });
  }

  return levels;
}

// 8 REAL RACKS CONFIGURATION (Matching BodegaReal.jpg & BodegaReal2.jpg)
export const INITIAL_RACKS: Estante[] = [
  // --- LADO IZQUIERDO: 5 GÓNDOLAS COMERCIALES (3 pisos x 3 zonas) ---
  {
    id: 'rack-gond-1',
    codigo: 'EST-A',
    nombre: 'Góndola Pasillo 1 - Lubricantes y Aditivos',
    categoria: 'Aceites y Lubricantes',
    forma: 'RECTANGULAR',
    tipoVisual: 'GONDOLA_COMERCIAL',
    posX: -3.2,
    posZ: 0.5,
    rotacionGrados: 90, // Orientado a lo largo del pasillo
    anchoM: 5.4,
    profundidadM: 0.8,
    altoM: 1.85,
    pisos: generate3Levels('EST-A', 3),
  },
  {
    id: 'rack-gond-2',
    codigo: 'EST-B',
    nombre: 'Góndola Pasillo 2 - Filtros y Bombas Menores',
    categoria: 'Filtros y Bombas',
    forma: 'RECTANGULAR',
    tipoVisual: 'GONDOLA_COMERCIAL',
    posX: -5.2,
    posZ: 0.5,
    rotacionGrados: 90,
    anchoM: 5.4,
    profundidadM: 0.8,
    altoM: 1.85,
    pisos: generate3Levels('EST-B', 3),
  },
  {
    id: 'rack-gond-3',
    codigo: 'EST-C',
    nombre: 'Góndola Pasillo 3 - Sistema Eléctrico y Bujías',
    categoria: 'Electricidad Marina',
    forma: 'RECTANGULAR',
    tipoVisual: 'GONDOLA_COMERCIAL',
    posX: -7.2,
    posZ: 0.5,
    rotacionGrados: 90,
    anchoM: 5.4,
    profundidadM: 0.8,
    altoM: 1.85,
    pisos: generate3Levels('EST-C', 3),
  },
  {
    id: 'rack-gond-4',
    codigo: 'EST-D',
    nombre: 'Góndola Pasillo 4 - Ferretería e Inoxidable',
    categoria: 'Tornillería y Fijación',
    forma: 'RECTANGULAR',
    tipoVisual: 'GONDOLA_COMERCIAL',
    posX: -9.2,
    posZ: 0.5,
    rotacionGrados: 90,
    anchoM: 5.4,
    profundidadM: 0.8,
    altoM: 1.85,
    pisos: generate3Levels('EST-D', 3),
  },
  {
    id: 'rack-gond-5',
    codigo: 'EST-E',
    nombre: 'Góndola Fondo Portón Izquierdo - Accesorios Cubierta',
    categoria: 'Accesorios y Resina',
    forma: 'RECTANGULAR',
    tipoVisual: 'GONDOLA_COMERCIAL',
    posX: -5.5,
    posZ: -6.8, // Junto al portón en el lado izquierdo
    rotacionGrados: 0,
    anchoM: 4.2,
    profundidadM: 0.8,
    altoM: 1.85,
    pisos: generate3Levels('EST-E', 3),
  },

  // --- LADO DERECHO: 3 RACKS PESADOS INDUSTRIALES (BodegaReal2.jpg) ---
  {
    id: 'rack-pesado-1',
    codigo: 'EST-F',
    nombre: 'Rack Pesado Pared Derecha - Motores y Transmisiones',
    categoria: 'Motores y Palets Pesados',
    forma: 'RECTANGULAR',
    tipoVisual: 'RACK_PESADO',
    posX: 11.4,
    posZ: 0.5, // Pegado a la pared lateral derecha
    rotacionGrados: 90,
    anchoM: 8.5, // Largo para albergar 5 zonas de palets
    profundidadM: 1.1,
    altoM: 3.6,
    pisos: generate3Levels('EST-F', 5), // 3 pisos x 5 zonas = 15 zonas
  },
  {
    id: 'rack-pesado-2',
    codigo: 'EST-G',
    nombre: 'Rack Pesado Intermedio - Hélices, Ejes y Carga Media',
    categoria: 'Propulsión y Ejes',
    forma: 'RECTANGULAR',
    tipoVisual: 'RACK_PESADO',
    posX: 7.2,
    posZ: 1.0, // De derecha a izquierda hacia el pasillo
    rotacionGrados: 90,
    anchoM: 5.6,
    profundidadM: 1.1,
    altoM: 3.6,
    pisos: generate3Levels('EST-G', 3), // 3 pisos x 3 zonas = 9 zonas
  },
  {
    id: 'rack-pesado-3',
    codigo: 'EST-H',
    nombre: 'Rack Pesado Portón Derecho - Palets y Equipos Entrada',
    categoria: 'Carga Recepción',
    forma: 'RECTANGULAR',
    tipoVisual: 'RACK_PESADO',
    posX: 5.5,
    posZ: -6.8, // Junto al portón en el lado derecho
    rotacionGrados: 0,
    anchoM: 3.4,
    profundidadM: 1.1,
    altoM: 3.6,
    pisos: generate3Levels('EST-H', 2), // 3 pisos x 2 zonas = 6 zonas
  },
];

// Pre-assign initial demo products to their respective zones
INITIAL_RACKS.forEach((rack) => {
  rack.pisos.forEach((piso) => {
    piso.zonas.forEach((zona) => {
      const match = INITIAL_PRODUCTS.find((p) => p.ubicacionId === zona.codigoUbicacion);
      if (match) {
        zona.productoId = match.id;
      }
    });
  });
});