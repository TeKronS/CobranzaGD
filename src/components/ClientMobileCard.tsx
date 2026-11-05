'use client';

import React from 'react';
import type { EnrichedClient } from '../types';
import { buildWhatsAppLink } from '../lib/messaging';
import { formatDateDDMMAAAA } from '../lib/clients';
import {
  MessageSquare,
  ChevronRight,
  Phone,
  Calendar,
  CreditCard,
  Repeat,
  ShoppingBag,
  RotateCw,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface ClientMobileCardProps {
  client: EnrichedClient;
  onSelect: (client: EnrichedClient) => void;
  onQuickPayment: (client: EnrichedClient) => void;
  onRefund?: (client: EnrichedClient) => void;
  projectType?: string;
}

export function ClientMobileCard({ client, onSelect, onQuickPayment, onRefund, projectType }: ClientMobileCardProps) {
  const waLink = buildWhatsAppLink(client);
  const statusConfig = client.statusConfig;

  const isSubscriptionModel =
    projectType === 'suscripcion' ||
    (!projectType && (client.config?.planNombre !== undefined || client.estadoCalc?.startsWith('s_')));

  const isUnicoModel =
    projectType === 'unico' ||
    client.frecuencia === 'unico' ||
    client.estadoCalc === 'u_deudor' ||
    client.estadoCalc === 'u_a_favor' ||
    client.estadoCalc === 'u_cero';

  const cuotasTotal = client.cuotasTotales || 0;
  const cuotasPagadas = client.cuotasPagadas || 0;
  const percentPaid = cuotasTotal > 0 ? Math.round((cuotasPagadas / cuotasTotal) * 100) : 0;

  // Determine business model badge
  const getModelBadge = () => {
    if (isSubscriptionModel) {
      return {
        label: client.config?.planNombre ? `Plan: ${client.config.planNombre}` : 'Suscripción',
        icon: <Repeat className="w-2.5 h-2.5 text-indigo-400" />,
        className: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      };
    }
    if (client.frecuencia === 'unico' || projectType === 'unico') {
      return {
        label: 'Pago Único',
        icon: <ShoppingBag className="w-2.5 h-2.5 text-amber-400" />,
        className: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      };
    }
    return {
      label: 'Crédito',
      icon: <CreditCard className="w-2.5 h-2.5 text-emerald-400" />,
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    };
  };

  const modelBadge = getModelBadge();

  let displayStatusLabel = statusConfig.label;
  let displayBadgeClass = statusConfig.badgeClass;

  if (isSubscriptionModel) {
    if (client.estadoCalc === 'mora' || client.estadoCalc === 's_vencido' || client.diasRestantes < 0) {
      displayStatusLabel = 'Suscripción Vencida';
      displayBadgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    } else if (client.estadoCalc === 'proximo' || client.estadoCalc === 's_vencer') {
      displayStatusLabel = 'Renovar Pronto';
      displayBadgeClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    } else if (client.estadoCalc === 'al_dia' || client.estadoCalc === 's_activo') {
      displayStatusLabel = 'Suscripción Activa';
      displayBadgeClass = 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    }
  } else if (isUnicoModel) {
    if (client.estadoCalc === 'pagado' || client.estado === 'pagado' || (client.deudaRestante !== undefined && client.deudaRestante <= 0)) {
      displayStatusLabel = 'Completado ✓';
      displayBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    } else {
      displayStatusLabel = 'Pendiente';
      displayBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  }

  const validPhone =
    client.telefono &&
    !client.telefono.startsWith('#') &&
    client.telefono.toLowerCase() !== 'error'
      ? client.telefono.replace(/^'/, '').trim()
      : '';

  const validCedula =
    (client.identificacion || client.cedula) &&
    !(client.identificacion || client.cedula).startsWith('#') &&
    (client.identificacion || client.cedula).toLowerCase() !== 'error'
      ? (client.identificacion || client.cedula).replace(/^'/, '').trim()
      : '';

  return (
    <div className="glass-panel-interactive rounded-2xl p-4 mb-3 border border-white/10 relative overflow-hidden">
      {/* HEADER: AVATAR, NOMBRE & BADGES */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0" onClick={() => onSelect(client)}>
          <div className="w-11 h-11 rounded-2xl shrink-0 bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center font-bold text-sm text-emerald-400 shadow-inner">
            {client.iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-white tracking-tight leading-tight truncate">
              {client.nombre}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="shrink-0 font-mono">{validCedula || 'Sin cédula'}</span>
              {validPhone && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1 text-slate-300 min-w-0">
                    <Phone className="w-2.5 h-2.5 shrink-0 text-emerald-500/70" />
                    <span className="truncate">{validPhone}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-1">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${displayBadgeClass}`}
          >
            {displayStatusLabel}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border flex items-center space-x-1 ${modelBadge.className}`}>
            {modelBadge.icon}
            <span>{modelBadge.label}</span>
          </span>
        </div>
      </div>

      {/* MIDDLE BOX: DÍAS PENDIENTES / MONTO PENDIENTE */}
      {isSubscriptionModel ? (
        <div
          className="bg-gradient-to-r from-slate-950/60 via-indigo-950/30 to-slate-950/60 rounded-xl p-3 mb-3 border border-indigo-500/20 flex items-center justify-between cursor-pointer"
          onClick={() => onSelect(client)}
        >
          <div>
            <span className="text-[10px] text-indigo-300/80 block uppercase font-bold tracking-wider">
              Días Pendientes
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              {client.diasRestantes > 0 ? (
                <span className="text-base font-black text-emerald-400 tracking-tight">
                  {client.diasRestantes} {client.diasRestantes === 1 ? 'día' : 'días'} restantes
                </span>
              ) : client.diasRestantes === 0 ? (
                <span className="text-base font-black text-amber-400">Vence Hoy</span>
              ) : (
                <span className="text-base font-black text-rose-400">
                  Vencido hace {Math.abs(client.diasRestantes)} {Math.abs(client.diasRestantes) === 1 ? 'día' : 'días'}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 flex items-center justify-end space-x-1 uppercase font-medium">
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>Vence</span>
            </span>
            <span className="text-xs font-bold text-slate-200 block">{formatDateDDMMAAAA(client.fechaVence)}</span>
            <span className="text-[10px] font-semibold text-emerald-400 block mt-0.5">
              {client.montoFormateado} / {client.frecuencia}
            </span>
          </div>
        </div>
      ) : isUnicoModel ? (
        <div
          className="bg-slate-950/40 rounded-xl p-3 mb-3 border border-amber-500/20 flex items-center justify-between cursor-pointer"
          onClick={() => onSelect(client)}
        >
          <div>
            <span className="text-[10px] text-amber-400/90 block uppercase font-bold tracking-wider">
              Monto Pendiente
            </span>
            <span className="text-base font-black text-amber-400">
              {client.deudaRestanteFormateada || client.montoFormateado}
            </span>
            {client.config?.productoNombre && (
              <span className="text-[10px] text-slate-400 block truncate max-w-[170px] mt-0.5">
                {client.config.productoNombre} {client.config?.productoCantidad ? `(x${client.config.productoCantidad})` : ''}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">
              Modalidad
            </span>
            <span className="text-xs font-bold text-amber-300 flex items-center justify-end space-x-1">
              <ShoppingBag className="w-3 h-3 text-amber-400" />
              <span>Pago Único</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
              Sin vencimiento
            </span>
          </div>
        </div>
      ) : (
        <div
          className="bg-slate-950/40 rounded-xl p-3 mb-3 border border-slate-800/60 flex items-center justify-between cursor-pointer"
          onClick={() => onSelect(client)}
        >
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">
              Monto Pendiente
            </span>
            <span className="text-base font-extrabold text-emerald-400">
              {client.deudaRestanteFormateada || client.montoFormateado}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 flex items-center justify-end space-x-1 uppercase font-medium">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Vence</span>
            </span>
            <span className="text-xs font-bold text-slate-200 block">
              {formatDateDDMMAAAA(client.fechaVence)}
            </span>
            <span className="text-[10px] font-semibold block mt-0.5">
              {client.estadoCalc === 'pagado' ? (
                <span className="text-emerald-400 font-bold">Completado ✓</span>
              ) : client.diasRestantes > 1 ? (
                <span className="text-sky-300">Faltan {client.diasRestantes} días</span>
              ) : client.diasRestantes === 1 ? (
                <span className="text-amber-300">Falta 1 día</span>
              ) : client.diasRestantes === 0 ? (
                <span className="text-amber-400 font-bold">Vence hoy</span>
              ) : (
                <span className="text-rose-400">
                  Vencido hace {Math.abs(client.diasRestantes)} {Math.abs(client.diasRestantes) === 1 ? 'día' : 'días'}
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* PROGRESO DE CUOTAS (SOLO CRÉDITO) */}
      {!isSubscriptionModel && !isUnicoModel && cuotasTotal > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Progreso de cuotas</span>
            <span className="font-semibold text-slate-300">
              {cuotasPagadas} / {cuotasTotal} ({percentPaid}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>
      )}

      {/* BOTONES INFERIORES */}
      <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/80">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </a>

        <button
          onClick={() => onQuickPayment(client)}
          className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all ${
            isSubscriptionModel
              ? 'bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10'
              : isUnicoModel
              ? 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
          }`}
        >
          {isSubscriptionModel ? (
            <>
              <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Renovar Plan</span>
            </>
          ) : isUnicoModel ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Abonar / Cancelar</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Abonar / Pago</span>
            </>
          )}
        </button>

        {isSubscriptionModel && onRefund && (
          <button
            onClick={() => onRefund(client)}
            title="Devolver pago / Reembolso"
            className="py-2 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 active:scale-95 transition-all flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold hidden sm:inline">Devolver</span>
          </button>
        )}

        <button
          onClick={() => onSelect(client)}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
