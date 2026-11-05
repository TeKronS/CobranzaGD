'use client';

import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { useProjects } from '../context/ProjectsContext';
import type { TipoCobro } from '../types';
import { Briefcase, Plus, CreditCard, Repeat, ShoppingBag, CheckCircle2, ChevronRight, HardDrive, LogOut } from 'lucide-react';

interface BusinessOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BusinessOnboardingModal({ isOpen, onClose }: BusinessOnboardingModalProps) {
  const { projects, activeProject, setActiveProject, addProject } = useProjects();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [tipoModelo, setTipoModelo] = useState<TipoCobro>('credito');

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNegocio.trim()) return;

    const newBusiness = await addProject(nombreNegocio.trim(), tipoModelo);
    setActiveProject(newBusiness);
    setNombreNegocio('');
    setShowCreateForm(false);
    onClose();
  };

  const getModelBadge = (tipo?: string) => {
    switch (tipo) {
      case 'suscripcion':
        return { label: 'Suscripciones', icon: <Repeat className="w-3.5 h-3.5 text-indigo-400" />, bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' };
      case 'unico':
        return { label: 'Venta Única', icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />, bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300' };
      default:
        return { label: 'Crédito', icon: <CreditCard className="w-3.5 h-3.5 text-emerald-400" />, bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' };
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Seleccionar / Crear Negocio 💼">
      <div className="space-y-4 pt-1">
        <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center space-x-2 text-xs font-extrabold text-white">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Tus Negocios en Google Drive</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Selecciona la cartera activa o crea un nuevo negocio configurando su modelo de cobranza.
          </p>
        </div>

        {!showCreateForm ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span>Negocios Existentes ({projects.length})</span>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Negocio</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {projects.map(proj => {
                const isSelected = activeProject?.id === proj.id;
                const badge = getModelBadge(proj.tipo);

                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setActiveProject(proj);
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 active:scale-98 ${
                      isSelected
                        ? 'bg-emerald-500/15 border-2 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/90 border border-white/25 hover:border-white/50 text-slate-200 hover:bg-slate-800/90 shadow-md'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-white flex items-center space-x-2">
                        <span>{proj.nombre}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center space-x-1 ${badge.bg}`}>
                          {badge.icon}
                          <span>Modelo: {badge.label}</span>
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Negocio por Modelo</span>
            </button>

            <button
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                  localStorage.removeItem('cgd_drive_email');
                  localStorage.removeItem('cgd_drive_token');
                  localStorage.removeItem('cgd_user_authorized');
                  localStorage.removeItem('cgd_excel_url');
                  localStorage.removeItem('cgd_docs_folder_url');
                  sessionStorage.removeItem('cgd_is_demo');
                  window.location.href = '/';
                }
              }}
              className="w-full py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center space-x-1.5 hover:bg-rose-500/20 active:scale-98 transition-all mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión de Google</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateBusiness} className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Nuevo Negocio / Cartera</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Volver a la lista
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                1. Nombre del Negocio *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Préstamos Electrónicos, Suscripciones IPTV, Venta Ropa"
                value={nombreNegocio}
                onChange={e => setNombreNegocio(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl glass-input text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                2. Selecciona el Modelo de Negocio *
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: 'credito',
                    title: 'Préstamos & Créditos 💳',
                    desc: 'Financiamiento con cuotas (semanal/quincenal), intereses y tabla de amortización.',
                    icon: <CreditCard className="w-5 h-5 text-emerald-400" />,
                    bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
                  },
                  {
                    id: 'suscripcion',
                    title: 'Suscripciones Recurrentes 🔁',
                    desc: 'Cobros periódicos por planes (mensual/anual), membresías y renovación de servicios.',
                    icon: <Repeat className="w-5 h-5 text-indigo-400" />,
                    bg: 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300',
                  },
                  {
                    id: 'unico',
                    title: 'Ventas y Pago Único 🛍️',
                    desc: 'Cobros únicos de contado o cuotas simples sin financiamiento continuo.',
                    icon: <ShoppingBag className="w-5 h-5 text-amber-400" />,
                    bg: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
                  },
                ].map(model => (
                  <button
                    type="button"
                    key={model.id}
                    onClick={() => setTipoModelo(model.id as TipoCobro)}
                    className={`p-3.5 rounded-2xl border text-left flex items-start space-x-3 transition-all ${
                      tipoModelo === model.id
                        ? `${model.bg} shadow-md border-emerald-500/60`
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="mt-0.5">{model.icon}</div>
                    <div>
                      <div className="font-bold text-xs text-white">{model.title}</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{model.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 active:scale-98 transition-all"
            >
              Guardar Negocio en Google Drive
            </button>
          </form>
        )}
      </div>
    </BottomSheet>
  );
}
