// ============================================================
// Cobranza GD — Client Calculations & Data Utilities
// ============================================================

import type {
  Client,
  Project,
  EnrichedClient,
  ClientStatus,
  StatusConfig,
  DashboardStats,
  Cuota,
  Currency,
  Frequency,
} from '../types';
import { CONFIG } from './config';

export const STATUS_CONFIGS: Record<ClientStatus, StatusConfig> = {
  mora: {
    label: 'En Mora',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    panelClass: 'border-l-4 border-l-rose-500 bg-rose-950/10',
    icon: 'AlertTriangle',
    color: '#f43f5e',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/30',
  },
  hoy: {
    label: 'Vence Hoy',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    panelClass: 'border-l-4 border-l-amber-500 bg-amber-950/10',
    icon: 'Clock',
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/30',
  },
  proximo: {
    label: 'Próximo a vencer',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    panelClass: 'border-l-4 border-l-sky-500 bg-sky-950/10',
    icon: 'Calendar',
    color: '#0284c7',
    bgClass: 'bg-sky-500/10',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-500/30',
  },
  al_dia: {
    label: 'Al día',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    panelClass: 'border-l-4 border-l-emerald-500 bg-emerald-950/10',
    icon: 'CheckCircle2',
    color: '#10b981',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/30',
  },
  pagado: {
    label: 'Completado',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    panelClass: 'border-l-4 border-l-indigo-500 bg-indigo-950/10',
    icon: 'CheckCheck',
    color: '#6366f1',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-300',
    borderClass: 'border-indigo-500/30',
  },
  refinanciado: {
    label: 'Refinanciado',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    panelClass: 'border-l-4 border-l-purple-500 bg-purple-950/10',
    icon: 'RefreshCw',
    color: '#a855f7',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-500/30',
  },
  s_activo: {
    label: 'Suscripción Activa',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    panelClass: 'border-l-4 border-l-teal-500 bg-teal-950/10',
    icon: 'Zap',
    color: '#14b8a6',
    bgClass: 'bg-teal-500/10',
    textClass: 'text-teal-300',
    borderClass: 'border-teal-500/30',
  },
  s_vencer: {
    label: 'Renovar Pronto',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    panelClass: 'border-l-4 border-l-yellow-500 bg-yellow-950/10',
    icon: 'Clock',
    color: '#eab308',
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-500/30',
  },
  s_vencido: {
    label: 'Suscripción Vencida',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    panelClass: 'border-l-4 border-l-red-500 bg-red-950/10',
    icon: 'AlertOctagon',
    color: '#ef4444',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
  },
  s_finalizado: {
    label: 'Suscripción Cancelada',
    badgeClass: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    panelClass: 'border-l-4 border-l-slate-500 bg-slate-950/10',
    icon: 'MinusCircle',
    color: '#64748b',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-500/30',
  },
  u_deudor: {
    label: 'Pendiente',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    panelClass: 'border-l-4 border-l-orange-500 bg-orange-950/10',
    icon: 'DollarSign',
    color: '#f97316',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-300',
    borderClass: 'border-orange-500/30',
  },
  u_a_favor: {
    label: 'Saldo a favor',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    panelClass: 'border-l-4 border-l-blue-500 bg-blue-950/10',
    icon: 'TrendingUp',
    color: '#3b82f6',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-300',
    borderClass: 'border-blue-500/30',
  },
  u_cero: {
    label: 'Al día',
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    panelClass: 'border-l-4 border-l-slate-500 bg-slate-950/10',
    icon: 'Check',
    color: '#94a3b8',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-300',
    borderClass: 'border-slate-500/30',
  },
};

export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const symbols: Record<Currency, string> = {
    USD: '$',
    VES: 'Bs.',
    COP: 'COP$',
    EUR: '€',
    MXN: 'MX$',
  };
  const sym = symbols[currency] || '$';
  return `${sym} ${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateDDMMAAAA(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

export function calculateDaysRemaining(targetDateStr: string): number {
  if (!targetDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = targetDateStr.split('-');
  if (parts.length < 3) return 0;
  const target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function addSubscriptionPeriods(
  currentFechaVence: string,
  frecuencia: Frequency | string = 'mensual',
  periodos: number = 1
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let baseDate = new Date();
  if (currentFechaVence) {
    const parts = currentFechaVence.split('-');
    if (parts.length === 3) {
      const parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      parsed.setHours(0, 0, 0, 0);
      if (parsed.getTime() >= today.getTime()) {
        baseDate = parsed;
      }
    }
  }

  const result = new Date(baseDate);
  const count = Math.max(1, periodos);

  if (frecuencia === 'anual') {
    result.setFullYear(result.getFullYear() + count);
  } else if (frecuencia === 'quincenal') {
    result.setDate(result.getDate() + count * 15);
  } else if (frecuencia === 'semanal') {
    result.setDate(result.getDate() + count * 7);
  } else {
    // Default 'mensual' or 'unico'
    result.setMonth(result.getMonth() + count);
  }

  const y = result.getFullYear();
  const m = String(result.getMonth() + 1).padStart(2, '0');
  const d = String(result.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function enrichClient(client: Client, projectType?: string, allProjects?: Project[]): EnrichedClient {
  const diasRestantes = calculateDaysRemaining(client.fechaVence);

  let effectiveType = projectType;
  if (!effectiveType && allProjects) {
    const proj = allProjects.find(p => p.id === client.proyectoId);
    if (proj) effectiveType = proj.tipo;
  }
  if (!effectiveType) {
    if (
      client.config?.planNombre !== undefined ||
      (client as any).estadoCalc?.startsWith('s_') ||
      client.estado === 's_activo' ||
      client.estado === 's_vencido' ||
      client.estado === 's_vencer'
    ) {
      effectiveType = 'suscripcion';
    } else if (client.frecuencia === 'unico') {
      effectiveType = 'unico';
    } else {
      effectiveType = 'credito';
    }
  }

  let plan = effectiveType === 'unico' ? [] : (client.planPagos ? [...client.planPagos] : []);

  if (effectiveType === 'credito' && (plan.length === 0 || (plan.length === 1 && (client.config?.plazoMeses || 6) > 1))) {
    const meses = client.config?.plazoMeses || 6;
    let totalCuotas = meses;
    if (client.frecuencia === 'semanal') totalCuotas = meses * 4;
    else if (client.frecuencia === 'quincenal') totalCuotas = meses * 2;

    const montoPorCuota = parseFloat(((client.monto || 0) / totalCuotas).toFixed(2));
    const autoCuotas: Cuota[] = [];
    let cur = new Date((client.fechaInicio || client.fechaVence || new Date().toISOString().split('T')[0]) + 'T12:00:00');

    for (let i = 1; i <= totalCuotas; i++) {
      if (client.frecuencia === 'semanal') cur.setDate(cur.getDate() + 7);
      else if (client.frecuencia === 'quincenal') cur.setDate(cur.getDate() + 15);
      else if (client.frecuencia === 'anual') cur.setFullYear(cur.getFullYear() + 1);
      else cur.setMonth(cur.getMonth() + 1);

      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');

      autoCuotas.push({
        id: `cuota-${i}`,
        fecha: `${y}-${m}-${d}`,
        monto: montoPorCuota,
        estado: 'pendiente',
        descripcion: `Cuota ${i} de ${totalCuotas}`,
      });
    }
    plan = autoCuotas;
  }

  let estadoCalc: ClientStatus = 'al_dia';

  if (effectiveType === 'suscripcion') {
    if (diasRestantes < 0) estadoCalc = 's_vencido';
    else if (diasRestantes <= CONFIG.DIAS_AVISO) estadoCalc = 's_vencer';
    else estadoCalc = 's_activo';
  } else if (effectiveType === 'unico') {
    // Pago único: no lleva fecha de vencimiento
    const deudaUnico = client.config?.deudaRestante ?? client.monto ?? 0;
    if (client.estado === 'pagado' || deudaUnico <= 0) {
      estadoCalc = 'pagado';
    } else {
      estadoCalc = 'u_deudor';
    }
  } else {
    const cuotasPendientes = plan.filter(c => c.estado === 'pendiente');
    const totalCuotas = plan.length;
    const pagadas = totalCuotas - cuotasPendientes.length;

    if (totalCuotas > 0 && pagadas === totalCuotas) {
      estadoCalc = 'pagado';
    } else if (diasRestantes < 0) {
      estadoCalc = 'mora';
    } else if (diasRestantes === 0) {
      estadoCalc = 'hoy';
    } else if (diasRestantes <= CONFIG.DIAS_AVISO) {
      estadoCalc = 'proximo';
    } else {
      estadoCalc = 'al_dia';
    }
  }
  const nextCuota = plan.find(c => c.estado === 'pendiente');
  const cuotasPagadas = effectiveType === 'unico' ? 0 : plan.filter(c => c.estado === 'pagado').length;
  const cuotasTotales = effectiveType === 'unico' ? 0 : plan.length;

  let deudaRestante = client.monto;
  if (effectiveType === 'unico') {
    if (client.estado === 'pagado') {
      deudaRestante = 0;
    } else {
      deudaRestante = client.config?.deudaRestante !== undefined ? client.config.deudaRestante : client.monto;
    }
  } else if (plan.length > 0) {
    deudaRestante = plan
      .filter(c => c.estado === 'pendiente')
      .reduce((sum, c) => sum + c.monto, 0);
  } else if (client.config?.deudaRestante !== undefined) {
    deudaRestante = client.config.deudaRestante;
  }

  const iniciales = (client.nombre || 'C')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase();

  return {
    ...client,
    planPagos: plan,
    estadoCalc,
    diasRestantes,
    statusConfig: STATUS_CONFIGS[estadoCalc] || STATUS_CONFIGS['al_dia'],
    iniciales,
    montoFormateado: formatCurrency(client.monto, client.moneda),
    nextCuota,
    deudaRestante,
    deudaRestanteFormateada: formatCurrency(deudaRestante, client.moneda),
    cuotasPagadas,
    cuotasTotales,
  };
}

export function subtractSubscriptionPeriods(
  currentFechaVence: string,
  frecuencia: Frequency | string = 'mensual',
  periodos: number = 1
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let baseDate = new Date();
  if (currentFechaVence) {
    const parts = currentFechaVence.split('-');
    if (parts.length === 3) {
      const parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      parsed.setHours(0, 0, 0, 0);
      baseDate = parsed;
    }
  }

  const result = new Date(baseDate);
  const count = Math.max(1, periodos);

  if (frecuencia === 'anual') {
    result.setFullYear(result.getFullYear() - count);
  } else if (frecuencia === 'quincenal') {
    result.setDate(result.getDate() - count * 15);
  } else if (frecuencia === 'semanal') {
    result.setDate(result.getDate() - count * 7);
  } else {
    // Default 'mensual' or 'unico'
    result.setMonth(result.getMonth() - count);
  }

  const y = result.getFullYear();
  const m = String(result.getMonth() + 1).padStart(2, '0');
  const d = String(result.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateDashboardStats(clients: EnrichedClient[], projectType: string): DashboardStats {
  const isSubscription = projectType === 'suscripcion';

  const stats: DashboardStats = {
    total: clients.length,
    enMora: 0,
    proximos: 0,
    alDia: 0,
    pagados: 0,
    montoPendiente: 0,
    montoMora: 0,
    capitalRecuperado: 0,
    proyeccionMes: 0,
    cobradoMes: 0,
    totalHistorico: 0,
    totalDevuelto: 0,
    mrrActivo: 0,
    ingresosPorMes: [],
  };

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Monthly buckets map for history (last 6 months)
  const monthlyMap: Record<string, { label: string; cobrado: number; devuelto: number; neto: number; count: number }> = {};
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyMap[key] = { label, cobrado: 0, devuelto: 0, neto: 0, count: 0 };
  }

  clients.forEach(c => {
    if (c.estadoCalc === 'mora' || c.estadoCalc === 's_vencido') {
      stats.enMora++;
      stats.montoMora += c.deudaRestante || c.monto;
    } else if (c.estadoCalc === 'proximo' || c.estadoCalc === 's_vencer' || c.estadoCalc === 'hoy') {
      stats.proximos++;
    } else if (c.estadoCalc === 'pagado') {
      stats.pagados++;
    } else {
      stats.alDia++;
    }

    if (isSubscription) {
      if (c.estadoCalc === 's_activo' || c.estadoCalc === 's_vencer' || c.estadoCalc === 'al_dia' || c.estado === 'activo' || c.estado === 's_activo') {
        stats.mrrActivo = (stats.mrrActivo || 0) + (c.monto || 0);
      }

      const txs = c.config?.transacciones || [];
      if (txs.length > 0) {
        txs.forEach(t => {
          const tMonthKey = t.fecha ? t.fecha.slice(0, 7) : currentMonthKey;
          if (t.tipo === 'pago' || t.tipo === 'renovacion') {
            stats.totalHistorico = (stats.totalHistorico || 0) + t.monto;
            if (tMonthKey === currentMonthKey) {
              stats.cobradoMes = (stats.cobradoMes || 0) + t.monto;
            }
            if (monthlyMap[tMonthKey]) {
              monthlyMap[tMonthKey].cobrado += t.monto;
              monthlyMap[tMonthKey].neto += t.monto;
              monthlyMap[tMonthKey].count += 1;
            }
          } else if (t.tipo === 'devolucion') {
            stats.totalDevuelto = (stats.totalDevuelto || 0) + Math.abs(t.monto);
            stats.totalHistorico = (stats.totalHistorico || 0) - Math.abs(t.monto);
            if (tMonthKey === currentMonthKey) {
              stats.cobradoMes = (stats.cobradoMes || 0) - Math.abs(t.monto);
            }
            if (monthlyMap[tMonthKey]) {
              monthlyMap[tMonthKey].devuelto += Math.abs(t.monto);
              monthlyMap[tMonthKey].neto -= Math.abs(t.monto);
            }
          }
        });
      } else {
        const fee = c.monto || 0;
        const regMonthKey = (c.fechaRegistro || c.fechaInicio || '').slice(0, 7) || currentMonthKey;

        stats.totalHistorico = (stats.totalHistorico || 0) + fee;
        if (regMonthKey === currentMonthKey || c.estadoCalc === 's_activo' || c.estadoCalc === 's_vencer' || c.estadoCalc === 'al_dia') {
          stats.cobradoMes = (stats.cobradoMes || 0) + fee;
        }
        if (monthlyMap[regMonthKey]) {
          monthlyMap[regMonthKey].cobrado += fee;
          monthlyMap[regMonthKey].neto += fee;
          monthlyMap[regMonthKey].count += 1;
        } else if (monthlyMap[currentMonthKey]) {
          monthlyMap[currentMonthKey].cobrado += fee;
          monthlyMap[currentMonthKey].neto += fee;
          monthlyMap[currentMonthKey].count += 1;
        }
      }
    } else {
      if (c.estadoCalc !== 'pagado') {
        stats.montoPendiente += c.deudaRestante || c.monto;
      }

      const paidSum = (c.planPagos || [])
        .filter(cuota => cuota.estado === 'pagado')
        .reduce((s, cuota) => s + cuota.monto, 0);
      stats.capitalRecuperado = (stats.capitalRecuperado || 0) + paidSum;
    }
  });

  if (isSubscription) {
    stats.capitalRecuperado = stats.cobradoMes || 0;
    stats.montoPendiente = stats.mrrActivo || 0;
    stats.proyeccionMes = (stats.cobradoMes || 0) + (stats.mrrActivo || 0);

    stats.ingresosPorMes = Object.keys(monthlyMap).map(key => ({
      mesKey: key,
      mesLabel: monthlyMap[key].label,
      cobrado: monthlyMap[key].cobrado,
      devuelto: monthlyMap[key].devuelto,
      neto: monthlyMap[key].neto,
      suscriptores: monthlyMap[key].count,
    }));
  } else {
    stats.proyeccionMes = (stats.capitalRecuperado || 0) + stats.montoPendiente;
  }

  return stats;
}

export function generateCuotasPlan(
  montoCuota: number,
  frecuencia: Frequency,
  fechaInicioStr: string,
  fechaFinStr: string
): Cuota[] {
  if (!fechaInicioStr || !fechaFinStr || montoCuota <= 0) return [];

  const start = new Date(fechaInicioStr + 'T12:00:00');
  const end = new Date(fechaFinStr + 'T12:00:00');

  if (start > end) return [];

  const cuotas: Cuota[] = [];
  let current = new Date(start);
  let index = 1;

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');

    cuotas.push({
      id: `cuota-${index}`,
      fecha: `${y}-${m}-${d}`,
      monto: montoCuota,
      estado: 'pendiente',
      descripcion: `Cuota ${index}`,
    });

    index++;

    if (frecuencia === 'semanal') {
      current.setDate(current.getDate() + 7);
    } else if (frecuencia === 'quincenal') {
      current.setDate(current.getDate() + 15);
    } else if (frecuencia === 'mensual') {
      current.setMonth(current.getMonth() + 1);
    } else if (frecuencia === 'anual') {
      current.setFullYear(current.getFullYear() + 1);
    } else {
      break;
    }
  }

  return cuotas;
}
