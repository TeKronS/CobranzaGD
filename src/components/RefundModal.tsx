'use client';

import React, { useState } from 'react';
import type { EnrichedClient } from '../types';
import { formatCurrency, subtractSubscriptionPeriods } from '../lib/clients';
import { RotateCcw, AlertTriangle, Calendar, DollarSign, X } from 'lucide-react';

interface RefundModalProps {
  client: EnrichedClient | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmRefund: (clientId: string, periodos: number, montoDevuelto: number, notas?: string) => Promise<void>;
}

export function RefundModal({ client, isOpen, onClose, onConfirmRefund }: RefundModalProps) {
  const [periodos, setPeriodos] = useState<number>(1);
  const [notas, setNotas] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !client) return null;

  const precioMensual = client.monto || 0;
  const montoDevuelto = precioMensual * periodos;
  const nuevaFechaVence = subtractSubscriptionPeriods(client.fechaVence, client.frecuencia, periodos);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirmRefund(client.id, periodos, montoDevuelto, notas);
      onClose();
    } catch (err) {
      console.error('Error processing refund:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-rose-500/20 shadow-2xl relative space-y-5 bg-slate-900/95">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2 text-rose-400">
            <RotateCcw className="w-5 h-5" />
            <h3 className="text-base font-black tracking-tight text-white">Devolver Pago / Reembolso</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CLIENT SUMMARY */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-white/5 space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-white text-sm">{client.nombre}</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[10px]">
              Suscripción
            </span>
          </div>
          <p className="text-slate-400">
            Plan contratado: <strong className="text-emerald-400">{formatCurrency(precioMensual, client.moneda)} / {client.frecuencia || 'mes'}</strong>
          </p>
          <p className="text-slate-400">
            Vencimiento actual: <strong className="text-slate-200">{client.fechaVence || 'N/A'}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SELECCIÓN DE PERÍODOS A DEVOLVER */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Cantidad de períodos a devolver:
            </label>
            <div className="flex items-center justify-between gap-2">
              {[1, 2, 3, 6].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPeriodos(num)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                    periodos === num
                      ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20 scale-105'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {num} {num === 1 ? 'Mes' : 'Meses'}
                </button>
              ))}
            </div>
          </div>

          {/* CÁLCULOS EN TIEMPO REAL */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1">
              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                Total a Reembolsar
              </span>
              <p className="text-base font-black text-rose-400">
                {formatCurrency(montoDevuelto, client.moneda)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Nuevo Vencimiento
              </span>
              <p className="text-sm font-bold text-slate-200 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{nuevaFechaVence}</span>
              </p>
            </div>
          </div>

          {/* ADVERTENCIA */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-2 text-[11px] text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <span>
              Al procesar este reembolso, la fecha de vencimiento del cliente retrocederá {periodos} período(s) y el monto de {formatCurrency(montoDevuelto, client.moneda)} se restará de los ingresos cobrados.
            </span>
          </div>

          {/* NOTAS / MOTIVO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Motivo o notas del reembolso:
            </label>
            <input
              type="text"
              placeholder="Ej: Reclamo del banco / cobro no utilizado..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs"
            />
          </div>

          {/* BOTONES */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Procesando...' : `Devolver ${formatCurrency(montoDevuelto, client.moneda)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
