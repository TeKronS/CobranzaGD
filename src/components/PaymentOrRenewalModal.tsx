'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BottomSheet } from './BottomSheet';
import { useProjects } from '../context/ProjectsContext';
import { addSubscriptionPeriods, formatCurrency, formatDateDDMMAAAA } from '../lib/clients';
import type { EnrichedClient } from '../types';
import {
  Repeat,
  Calendar,
  CheckCircle2,
  RotateCw,
  Plus,
  Minus,
  CreditCard,
  Check,
  DollarSign,
  Layers,
  Sparkles,
  Info,
  ArrowRight,
  ShoppingBag,
  BadgeCheck,
} from 'lucide-react';

interface PaymentOrRenewalModalProps {
  client: EnrichedClient | null;
  onClose: () => void;
}

export function PaymentOrRenewalModal({ client, onClose }: PaymentOrRenewalModalProps) {
  const { activeProject, registerPayment, renewSubscription } = useProjects();

  const [renewPeriods, setRenewPeriods] = useState<number>(1);
  const [selectedCuotaIds, setSelectedCuotaIds] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [unicoMode, setUnicoMode] = useState<'abono' | 'cancelar'>('abono');
  const abonoInputRef = useRef<HTMLInputElement>(null);

  const isSubscription =
    activeProject?.tipo === 'suscripcion' ||
    (!activeProject?.tipo && (client?.config?.planNombre !== undefined || client?.estadoCalc?.startsWith('s_')));

  const isUnico =
    activeProject?.tipo === 'unico' ||
    client?.frecuencia === 'unico' ||
    client?.estadoCalc === 'u_deudor' ||
    client?.estadoCalc === 'u_a_favor' ||
    client?.estadoCalc === 'u_cero';

  const pendingCuotas = useMemo(() => {
    let list = client?.planPagos || [];
    if (list.length === 0 && !isSubscription && client && (client.monto || 0) > 0) {
      const meses = client.config?.plazoMeses || 6;
      let totalCuotas = meses;
      if (client.frecuencia === 'semanal') totalCuotas = meses * 4;
      else if (client.frecuencia === 'quincenal') totalCuotas = meses * 2;

      const montoPorCuota = parseFloat(((client.monto || 0) / totalCuotas).toFixed(2));
      const autoCuotas = [];
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
          estado: 'pendiente' as const,
          descripcion: `Cuota ${i} de ${totalCuotas}`,
        });
      }
      list = autoCuotas;
    }
    return list.filter(c => c.estado === 'pendiente');
  }, [client, isSubscription]);

  useEffect(() => {
    if (client) {
      setRenewPeriods(1);
      setPaymentNotes('');

      if (!isSubscription) {
        if (isUnico) {
          setSelectedCuotaIds([]);
          setPaymentAmount('');
          setUnicoMode('abono');
          setTimeout(() => {
            abonoInputRef.current?.focus();
            abonoInputRef.current?.select();
          }, 150);
        } else if (pendingCuotas.length > 0) {
          const first = pendingCuotas[0];
          setSelectedCuotaIds([first.id]);
          setPaymentAmount(String(first.monto));
        } else {
          setSelectedCuotaIds([]);
          setPaymentAmount(String(client.monto || ''));
        }
      }
    }
  }, [client, isSubscription, isUnico, pendingCuotas]);

  // Calculations for subscription
  const unitMonto = client?.monto || 0;
  const totalMontoSub = unitMonto * renewPeriods;
  const newExpirationDate = client?.fechaVence
    ? addSubscriptionPeriods(client.fechaVence, client.frecuencia, renewPeriods)
    : '';

  // Consecutive multi-cuota selection handler
  const handleToggleCuota = (targetIdx: number) => {
    const currentCount = selectedCuotaIds.length;
    let newCount = 1;

    if (targetIdx >= currentCount) {
      // User clicked a cuota beyond current selection -> select all up to targetIdx (consecutive)
      newCount = targetIdx + 1;
    } else if (targetIdx === currentCount - 1) {
      // User clicked the last currently selected cuota
      if (currentCount > 1) {
        newCount = currentCount - 1;
      } else {
        newCount = 1;
      }
    } else {
      // User clicked an earlier cuota -> narrow selection down to targetIdx
      newCount = targetIdx + 1;
    }

    const newSelected = pendingCuotas.slice(0, newCount).map(c => c.id);
    setSelectedCuotaIds(newSelected);

    const sum = pendingCuotas.slice(0, newCount).reduce((s, c) => s + c.monto, 0);
    setPaymentAmount(sum.toFixed(2));
  };

  const handleQuickSelectCount = (count: number) => {
    const safeCount = Math.min(count, pendingCuotas.length);
    const newSelected = pendingCuotas.slice(0, safeCount).map(c => c.id);
    setSelectedCuotaIds(newSelected);

    const sum = pendingCuotas.slice(0, safeCount).reduce((s, c) => s + c.monto, 0);
    setPaymentAmount(sum.toFixed(2));
  };

  // Real-time calculation of custom payment impact (Waterfall)
  const paymentAmountNum = parseFloat(paymentAmount) || 0;
  const totalSelectedCuotasSum = pendingCuotas
    .filter(c => selectedCuotaIds.includes(c.id))
    .reduce((s, c) => s + c.monto, 0);

  const customSimulation = useMemo(() => {
    if (isSubscription || paymentAmountNum <= 0 || pendingCuotas.length === 0) return null;

    let remaining = paymentAmountNum;
    let fullPaidCount = 0;
    let partialIdx = -1;
    let partialBalanceRemaining = 0;
    let partialAmountApplied = 0;

    for (let i = 0; i < pendingCuotas.length; i++) {
      const c = pendingCuotas[i];
      if (remaining <= 0) break;

      if (remaining >= c.monto - 0.005) {
        fullPaidCount++;
        remaining -= c.monto;
      } else {
        partialIdx = i;
        partialAmountApplied = remaining;
        partialBalanceRemaining = parseFloat((c.monto - remaining).toFixed(2));
        remaining = 0;
        break;
      }
    }

    const isExactSelection =
      selectedCuotaIds.length > 0 &&
      Math.abs(paymentAmountNum - totalSelectedCuotasSum) < 0.05;

    return {
      fullPaidCount,
      partialIdx,
      partialBalanceRemaining,
      partialAmountApplied,
      isExactSelection,
      allSettled: fullPaidCount >= pendingCuotas.length,
    };
  }, [isSubscription, paymentAmountNum, pendingCuotas, selectedCuotaIds, totalSelectedCuotasSum]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    if (isSubscription) {
      await renewSubscription(client.id, renewPeriods, totalMontoSub, paymentNotes);
    } else if (isUnico) {
      // Pago único: cancel full debt OR register partial payment
      const montoNum = unicoMode === 'cancelar' ? (client.monto || 0) : (parseFloat(paymentAmount) || 0);
      await registerPayment(client.id, [], montoNum, paymentNotes);
    } else {
      const montoNum = parseFloat(paymentAmount) || 0;
      await registerPayment(client.id, selectedCuotaIds, montoNum, paymentNotes);
    }
    onClose();
  };

  if (!client) return null;

  const modalTitle = isSubscription
    ? `Renovar Plan — ${client.nombre}`
    : isUnico
    ? `Pago Único — ${client.nombre}`
    : `Registrar Pago de Cuota — ${client.nombre}`;

  return (
    <BottomSheet
      isOpen={!!client}
      onClose={onClose}
      title={modalTitle}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {isSubscription ? (
          <>
            {/* SUBSCRIPTION SUMMARY CARD */}
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Plan Contratado:</span>
                <span className="text-xs font-bold text-indigo-300 flex items-center space-x-1">
                  <Repeat className="w-3 h-3 text-indigo-400" />
                  <span>{client.config?.planNombre || 'Plan Personalizado'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-2">
                <span className="text-slate-400">Tarifa del Plan:</span>
                <span className="font-bold text-white">
                  {formatCurrency(unitMonto, client.moneda)} / {client.frecuencia}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Vencimiento Actual:</span>
                <span className="font-bold text-slate-300">{formatDateDDMMAAAA(client.fechaVence)}</span>
              </div>
            </div>

            {/* PERIOD SELECTOR */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Seleccionar Cantidad de Períodos a Renovar *
              </label>

              {/* QUICK PILLS */}
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {[1, 2, 3, 6].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRenewPeriods(num)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      renewPeriods === num
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30 border border-indigo-400'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {num} {client.frecuencia === 'anual' ? (num === 1 ? 'Año' : 'Años') : (num === 1 ? 'Mes' : 'Meses')}
                  </button>
                ))}
              </div>

              {/* COUNTER CONTROLS */}
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="text-xs">
                  <span className="font-bold text-white block">Períodos a Renovar</span>
                  <span className="text-[10px] text-slate-400">
                    {renewPeriods} x {formatCurrency(unitMonto, client.moneda)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setRenewPeriods(p => Math.max(1, p - 1))}
                    className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-bold flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-base font-black text-indigo-400 w-8 text-center">{renewPeriods}</span>
                  <button
                    type="button"
                    onClick={() => setRenewPeriods(p => p + 1)}
                    className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-bold flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* DYNAMIC RESULT CARD */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 p-3.5 rounded-2xl border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Nueva Fecha de Vencimiento:</span>
                <span className="text-xs font-black text-emerald-400 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDateDDMMAAAA(newExpirationDate)}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
                <span className="text-slate-400 font-bold">Monto Total a Cobrar:</span>
                <span className="text-base font-black text-emerald-300">
                  {formatCurrency(totalMontoSub, client.moneda)}
                </span>
              </div>
            </div>

            {/* NOTES */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Notas / Referencia del Pago (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Pago verificado vía Zelle / Efectivo / Transf..."
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-indigo-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Confirmar Renovación ({formatCurrency(totalMontoSub, client.moneda)})</span>
            </button>
          </>
        ) : isUnico ? (
          /* ── PAGO ÚNICO FORM ── */
          <>
            {/* RESUMEN DEUDA */}
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-amber-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  Pago Único
                </span>
                <span className="font-bold text-white">{client.nombre}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Monto Total de la Venta:</span>
                <span className="font-bold text-white text-sm">{client.montoFormateado}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Saldo Pendiente Actual:</span>
                <span className="font-black text-amber-400 text-sm">
                  {client.deudaRestanteFormateada || client.montoFormateado}
                </span>
              </div>
              {client.config?.productoNombre && (
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Producto:</span>
                  <span className="text-slate-200 font-medium">
                    {client.config.productoNombre} {client.config.productoCantidad ? `(x${client.config.productoCantidad})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* SELECCIONAR ACCIÓN: CANCELAR O ABONAR */}
            <div className="space-y-3">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Selecciona la opción de pago *
              </label>

              {/* OPCIÓN 1: BOTÓN CANCELAR DEUDA COMPLETA */}
              <button
                type="button"
                onClick={() => {
                  setUnicoMode('cancelar');
                  setPaymentAmount('');
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer active:scale-98 ${
                  unicoMode === 'cancelar'
                    ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/50'
                    : 'bg-slate-900/90 border-emerald-500/35 hover:border-emerald-400/80 hover:bg-emerald-950/20 text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    unicoMode === 'cancelar'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                      : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                  }`}>
                    <BadgeCheck className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">
                      Cancelar Deuda Completa
                    </span>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      El cliente pagó el total pendiente: <strong className="text-emerald-400 font-extrabold">{client.deudaRestanteFormateada || client.montoFormateado}</strong>
                    </span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  unicoMode === 'cancelar'
                    ? 'border-emerald-400 bg-emerald-500 text-slate-950 shadow-sm'
                    : 'border-emerald-500/60 bg-slate-800/80'
                }`}>
                  {unicoMode === 'cancelar' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>

              {/* OPCIÓN 2: INPUT PARA COLOCAR MONTO QUE ESTÁ ABONANDO */}
              <div
                onClick={() => {
                  setUnicoMode('abono');
                  setTimeout(() => {
                    abonoInputRef.current?.focus();
                    abonoInputRef.current?.select();
                  }, 50);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  unicoMode === 'abono'
                    ? 'bg-amber-950/40 border-amber-400 shadow-lg shadow-amber-500/15 ring-2 ring-amber-500/50'
                    : 'bg-slate-900/90 border-amber-500/35 hover:border-amber-400/80 hover:bg-amber-950/20 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      unicoMode === 'abono'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                        : 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                    }`}>
                      <DollarSign className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block">
                        Abonar Monto Parcial
                      </span>
                      <span className="text-[11px] text-slate-300 block mt-0.5">
                        Ingresar la cantidad que el cliente está abonando
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    unicoMode === 'abono'
                      ? 'border-amber-400 bg-amber-500 text-slate-950 shadow-sm'
                      : 'border-amber-500/60 bg-slate-800/80'
                  }`}>
                    {unicoMode === 'abono' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {unicoMode === 'abono' && (
                  <div className="pt-2.5 border-t border-slate-800/80 space-y-2" onClick={e => e.stopPropagation()}>
                    <label className="block text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      Monto que está abonando ({client.moneda}) *
                    </label>
                    <div className="relative">
                      <input
                        ref={abonoInputRef}
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        autoFocus
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 rounded-xl glass-input text-base font-extrabold text-amber-400"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {client.moneda}
                      </span>
                    </div>
                    {paymentAmount && parseFloat(paymentAmount) > 0 ? (
                      <div className="flex items-center justify-between text-[11px] pt-1 px-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                        <span className="text-slate-400">Saldo que quedará pendiente:</span>
                        <span className="font-extrabold text-amber-300 text-xs">
                          {formatCurrency(
                            Math.max(0, (client.deudaRestante !== undefined ? client.deudaRestante : client.monto || 0) - parseFloat(paymentAmount)),
                            client.moneda
                          )}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">
                        Escribe el monto en el campo para calcular el saldo restante automáticamente.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* NOTAS */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Notas / Referencia del Pago (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Pago en efectivo / Transferencia / Zelle..."
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={unicoMode === 'abono' && (!paymentAmount || parseFloat(paymentAmount) <= 0)}
              className={`w-full py-3.5 rounded-2xl font-black text-xs shadow-lg active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                unicoMode === 'cancelar'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 shadow-amber-500/25'
              }`}
            >
              {unicoMode === 'cancelar' ? (
                <>
                  <BadgeCheck className="w-4 h-4" />
                  <span>Confirmar Cancelación de Deuda Completa</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Guardar Abono {paymentAmount ? `(${formatCurrency(parseFloat(paymentAmount) || 0, client.moneda)})` : ''}
                  </span>
                </>
              )}
            </button>
          </>
        ) : (
          /* CREDIT / INSTALLMENT PAYMENT FORM */
          <>
            {/* RESUMEN DE SALDO DEL CRÉDITO */}
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Cliente:</span>
                <span className="font-bold text-white">{client.nombre}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Deuda Restante:</span>
                <span className="font-black text-emerald-400 text-sm">
                  {client.deudaRestanteFormateada || client.montoFormateado}
                </span>
              </div>
              {client.cuotasTotales ? (
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400">Progreso de Cuotas:</span>
                  <span className="font-bold text-emerald-300">
                    {client.cuotasPagadas} de {client.cuotasTotales} cuotas pagadas ({Math.round(((client.cuotasPagadas || 0) / client.cuotasTotales) * 100)}%)
                  </span>
                </div>
              ) : null}
            </div>

            {/* SELECCIONADOR CONSECUTIVO DE CUOTAS */}
            {pendingCuotas.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Seleccionar Cuotas a Pagar *
                  </label>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {selectedCuotaIds.length} {selectedCuotaIds.length === 1 ? 'cuota seleccionada' : 'cuotas seleccionadas'}
                  </span>
                </div>

                {/* BOTONES RÁPIDOS DE SELECCIÓN CONSECUTIVA */}
                {pendingCuotas.length > 1 && (
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                    {[1, 2, 3].filter(n => n <= pendingCuotas.length).map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleQuickSelectCount(n)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-1 text-center whitespace-nowrap active:scale-95 ${
                          selectedCuotaIds.length === n
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {n} {n === 1 ? 'Cuota' : 'Cuotas'}
                      </button>
                    ))}
                    {pendingCuotas.length > 3 && (
                      <button
                        type="button"
                        onClick={() => handleQuickSelectCount(pendingCuotas.length)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap active:scale-95 ${
                          selectedCuotaIds.length === pendingCuotas.length
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Todas ({pendingCuotas.length})
                      </button>
                    )}
                  </div>
                )}

                {/* LISTA CONSECUTIVA DE CUOTAS */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {pendingCuotas.map((cuota, idx) => {
                    const isSelected = selectedCuotaIds.includes(cuota.id);
                    return (
                      <button
                        key={cuota.id}
                        type="button"
                        onClick={() => handleToggleCuota(idx)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all active:scale-98 ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                : 'border-slate-700 text-slate-500'
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                          </div>
                          <div>
                            <span className={`text-xs font-bold block ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {cuota.descripcion || `Cuota ${idx + 1}`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Vence: {formatDateDDMMAAAA(cuota.fecha)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-400">
                          {formatCurrency(cuota.monto, client.moneda)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* CAMPO DE MONTO PERSONALIZABLE */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Monto del Pago / Abono ($) *
                </label>
                {selectedCuotaIds.length > 0 && Math.abs(paymentAmountNum - totalSelectedCuotasSum) > 0.01 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(totalSelectedCuotasSum.toFixed(2))}
                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                  >
                    Restablecer a {formatCurrency(totalSelectedCuotasSum, client.moneda)}
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl glass-input text-sm font-bold text-emerald-400"
              />
            </div>

            {/* SIMULACIÓN INTELIGENTE DEL ABONO PERSONALIZADO */}
            {customSimulation && (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center space-x-1.5 font-bold text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Distribución del pago:</span>
                </div>

                {customSimulation.allSettled ? (
                  <p className="text-[11px] text-emerald-400 font-bold">
                    🎉 Este monto cubre y liquida la totalidad de las cuotas pendientes.
                  </p>
                ) : customSimulation.fullPaidCount > 0 && customSimulation.partialIdx === -1 ? (
                  <p className="text-[11px] text-emerald-300">
                    ✓ Se marcarán como pagadas exactamente <strong className="text-white">{customSimulation.fullPaidCount} cuota(s)</strong> completas.
                  </p>
                ) : customSimulation.fullPaidCount === 0 && customSimulation.partialIdx !== -1 ? (
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <p>
                      • Se aplicará un abono parcial de <strong className="text-emerald-400">{formatCurrency(customSimulation.partialAmountApplied, client.moneda)}</strong> a la <strong className="text-white">{pendingCuotas[0]?.descripcion || 'Cuota 1'}</strong>.
                    </p>
                    <p className="text-slate-400">
                      • Esta cuota quedará pendiente por <strong className="text-amber-400">{formatCurrency(customSimulation.partialBalanceRemaining, client.moneda)}</strong>.
                    </p>
                  </div>
                ) : customSimulation.fullPaidCount > 0 && customSimulation.partialIdx !== -1 ? (
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <p>
                      • Cubre <strong className="text-white">{customSimulation.fullPaidCount} cuota(s)</strong> completas.
                    </p>
                    <p>
                      • El excedente de <strong className="text-emerald-400">{formatCurrency(customSimulation.partialAmountApplied, client.moneda)}</strong> se abonará a la <strong className="text-white">{pendingCuotas[customSimulation.partialIdx]?.descripcion || `Cuota ${customSimulation.partialIdx + 1}`}</strong> (quedando <strong className="text-amber-400">{formatCurrency(customSimulation.partialBalanceRemaining, client.moneda)}</strong> pendientes).
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Notas del Pago (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Pago realizado en efectivo / Zelle / Transferencia"
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Guardar Pago {paymentAmount ? `(${formatCurrency(parseFloat(paymentAmount) || 0, client.moneda)})` : ''} en Google Drive
              </span>
            </button>
          </>
        )}
      </form>
    </BottomSheet>
  );
}
