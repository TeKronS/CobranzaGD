// ============================================================
// Cobranza GD — Google Drive Powered Collection Studio Types
// ============================================================

export type ClientStatus =
  | 'mora'
  | 'hoy'
  | 'proximo'
  | 'al_dia'
  | 'pagado'
  | 'refinanciado'
  | 's_activo'
  | 's_vencer'
  | 's_vencido'
  | 's_finalizado'
  | 'u_deudor'
  | 'u_a_favor'
  | 'u_cero';

export type Currency = 'USD' | 'VES' | 'COP' | 'EUR' | 'MXN';
export type Frequency = 'unico' | 'semanal' | 'quincenal' | 'mensual' | 'anual';
export type UserRole = 'admin' | 'usuario';
export type TipoCobro = 'credito' | 'unico' | 'suscripcion';

export interface SubscriptionPlan {
  id: string;
  nombre: string;
  monto: number;
  frecuencia: Frequency;
  moneda: Currency;
}

export interface CreditProduct {
  id: string;
  proyectoId: string;
  nombre: string;
  modelo?: string;
  precio: number;
  serial?: string;
  fechaRegistro?: string;
}

export interface Project {
  id: string;
  nombre: string;
  tipo: TipoCobro;
  fechaRegistro: string;
  planesSuscripcion?: SubscriptionPlan[];
  productosCredito?: CreditProduct[];
}

export interface PaymentRecord {
  id: string;
  clienteId: string;
  fecha: string;
  monto: number;
  moneda: Currency;
  metodo: string;
  notas?: string;
  comprobanteDriveUrl?: string;
  registradoPor: string;
}

export interface Cuota {
  id: string;
  fecha: string;
  monto: number;
  estado: 'pendiente' | 'pagado';
  tipo?: 'cargo' | 'abono';
  descripcion?: string;
}

export interface SubscriptionTransaction {
  id: string;
  clienteId: string;
  fecha: string;
  tipo: 'pago' | 'renovacion' | 'devolucion';
  periodos: number;
  monto: number;
  moneda: Currency;
  notas?: string;
}

export interface MonthlyRevenue {
  mesLabel: string;
  mesKey: string;
  cobrado: number;
  devuelto: number;
  neto: number;
  suscriptores: number;
}

export interface ClientDataConfig {
  precioTotal?: number;
  pagoInicial?: number;
  inicialPagada?: boolean;
  porcentajeGanancia?: number;
  plazoMeses?: number;
  diasSuscripcion?: number;
  planNombre?: string;
  documentoLegalUrl?: string;
  productoCreditoId?: string;
  productoNombre?: string;
  productoModelo?: string;
  productoSerial?: string;
  productoCantidad?: number;
  deudaRestante?: number;
  transacciones?: SubscriptionTransaction[];
}

export interface Client {
  id: string;
  proyectoId: string;
  nombre: string;
  cedula: string; // Serves as RIF / DNI / CI / Tax ID
  identificacion?: string;
  telefono: string;
  email: string;
  monto: number;
  moneda: Currency;
  fechaInicio: string;
  fechaVence: string;
  frecuencia: Frequency;
  estado: string; // 'activo' | 'inactivo' | 'archivado'
  notas: string;
  driveFotoURL: string;
  documentoLegalURL?: string;
  fechaRegistro: string;
  planPagos?: Cuota[];
  config?: ClientDataConfig;
}

export interface StatusConfig {
  label: string;
  badgeClass: string;
  panelClass: string;
  icon: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export interface EnrichedClient extends Client {
  estadoCalc: ClientStatus;
  diasRestantes: number;
  statusConfig: StatusConfig;
  iniciales: string;
  montoFormateado: string;
  nextCuota?: Cuota;
  deudaRestante?: number;
  deudaRestanteFormateada?: string;
  cuotasPagadas?: number;
  cuotasTotales?: number;
  ultimoMovimiento?: string;
}

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  sub: string;
}

export interface DashboardStats {
  total: number;
  enMora: number;
  proximos: number;
  alDia: number;
  pagados: number;
  montoPendiente: number;
  montoMora: number;
  s_activos?: number;
  s_vencer?: number;
  s_vencidos?: number;
  capitalRecuperado?: number;
  proyeccionMes?: number;
  // Subscription Specific Metrics
  cobradoMes?: number;
  totalHistorico?: number;
  totalDevuelto?: number;
  mrrActivo?: number;
  ingresosPorMes?: MonthlyRevenue[];
}

export interface DriveUploadResult {
  id: string;
  viewLink: string;
  directLink: string;
}

export interface AppConfig {
  GOOGLE_CLIENT_ID: string;
  SHEETS_ID: string;
  GOOGLE_SCOPES: string;
  SHEETS: {
    CLIENTES: string;
    USUARIOS: string;
  };
  DRIVE_FOLDER_NAME: string;
  DIAS_AVISO: number;
  APP_NAME: string;
  APP_VERSION: string;
}

export type DriveSyncStatus = 'synced' | 'local_only' | 'syncing' | 'error';

export interface DriveCheckResult {
  exists: boolean;
  hasData: boolean;
  isUnauthorized?: boolean;
  projects?: Project[];
  clients?: Client[];
  spreadsheetUrl?: string;
  docsFolderUrl?: string;
}
