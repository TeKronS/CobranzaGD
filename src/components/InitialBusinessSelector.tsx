'use client';

import React, { useState } from 'react';
import { useProjects } from '../context/ProjectsContext';
import type { Project, TipoCobro } from '../types';
import { GuidedBusinessOnboarding } from './GuidedBusinessOnboarding';
import {
  Briefcase,
  Plus,
  CreditCard,
  Repeat,
  ShoppingBag,
  CheckCircle2,
  ChevronRight,
  HardDrive,
  Sparkles,
  ArrowRight,
  LogOut,
} from 'lucide-react';

interface InitialBusinessSelectorProps {
  onSelectProject: (project: Project) => void;
}

export function InitialBusinessSelector({ onSelectProject }: InitialBusinessSelectorProps) {
  const { projects, activeProject, setAccessToken } = useProjects();
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cgd_drive_email');
        localStorage.removeItem('cgd_drive_token');
        localStorage.removeItem('cgd_user_authorized');
        localStorage.removeItem('cgd_excel_url');
        localStorage.removeItem('cgd_docs_folder_url');
        sessionStorage.removeItem('cgd_is_demo');
      }
      window.location.href = '/';
    }
  };

  const getModelBadge = (tipo?: string) => {
    switch (tipo) {
      case 'suscripcion':
        return {
          label: 'Suscripciones Recurrentes 🔁',
          icon: <Repeat className="w-4 h-4 text-indigo-400" />,
          bg: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300',
        };
      case 'unico':
        return {
          label: 'Ventas y Pago Único 🛍️',
          icon: <ShoppingBag className="w-4 h-4 text-amber-400" />,
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
        };
      default:
        return {
          label: 'Ventas a Crédito 💳',
          icon: <CreditCard className="w-4 h-4 text-emerald-400" />,
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
        };
    }
  };

  if (showCreateWizard) {
    return (
      <GuidedBusinessOnboarding
        onComplete={() => {
          setShowCreateWizard(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 z-10 py-6">
        {/* HEADER */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-500/25">
            <Briefcase className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold inline-flex items-center space-x-1.5 mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Drive Conectado</span>
          </span>

          <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
            Selecciona el Negocio a Gestionar
          </h1>

          <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
            Tienes <span className="text-emerald-400 font-bold">{projects.length}</span> negocio(s) configurado(s) en tu cuenta privada de Google Drive.
          </p>
        </div>

        {/* BUSINESS LIST */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 shadow-2xl bg-slate-900/90">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
            <span>Tus Carteras ({projects.length})</span>
            <button
              onClick={() => setShowCreateWizard(true)}
              className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-extrabold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Negocio</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {projects.map(proj => {
              const isSelected = activeProject?.id === proj.id;
              const badge = getModelBadge(proj.tipo);

              return (
                <button
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 active:scale-98 ${
                    isSelected
                      ? 'bg-emerald-500/15 border-2 border-emerald-400 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/90 border border-white/25 hover:border-white/50 text-slate-200 hover:bg-slate-800/90 shadow-md'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="font-extrabold text-sm text-white flex items-center space-x-2">
                      <span>{proj.nombre}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center space-x-1 ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-emerald-400 text-xs font-bold pl-2">
                    <span>Gestionar</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowCreateWizard(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20 active:scale-98 transition-all"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Crear y Configurar Nuevo Negocio</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center space-x-1.5 hover:bg-rose-500/20 active:scale-98 transition-all mt-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión de Google</span>
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-500 font-mono pt-1">
          Cobranza GD v3.0 • Respaldo en Google Drive API
        </p>
      </div>
    </div>
  );
}
