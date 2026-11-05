'use client';

import React from 'react';
import type { TipoCobro } from '../types';
import { CreditCard, Repeat, ShoppingBag, Layers } from 'lucide-react';

export type BusinessModelFilter = TipoCobro | 'todos';

interface BusinessModelSelectorProps {
  selectedModel: BusinessModelFilter;
  onSelectModel: (model: BusinessModelFilter) => void;
  counts?: {
    credito?: number;
    suscripcion?: number;
    unico?: number;
    todos?: number;
  };
}

export function BusinessModelSelector({
  selectedModel,
  onSelectModel,
  counts = {},
}: BusinessModelSelectorProps) {
  const models: { id: BusinessModelFilter; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'credito',
      label: 'Ventas a Crédito',
      icon: <CreditCard className="w-3.5 h-3.5" />,
      color: 'from-emerald-500 to-teal-400',
    },
    {
      id: 'suscripcion',
      label: 'Suscripciones Recurrentes',
      icon: <Repeat className="w-3.5 h-3.5" />,
      color: 'from-indigo-500 to-purple-400',
    },
    {
      id: 'unico',
      label: 'Ventas y Pago Único',
      icon: <ShoppingBag className="w-3.5 h-3.5" />,
      color: 'from-amber-500 to-orange-400',
    },
    {
      id: 'todos',
      label: 'Todos los Modelos',
      icon: <Layers className="w-3.5 h-3.5" />,
      color: 'from-slate-600 to-slate-400',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
          <span>Modelo de Negocio Activo</span>
        </span>
        <span className="text-[10px] text-slate-400">Filtrado dinámico</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {models.map(model => {
          const isSelected = selectedModel === model.id;
          const count = counts[model.id] ?? 0;

          return (
            <button
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 active:scale-95 ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {model.icon}
                </div>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <div>
                <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {model.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
