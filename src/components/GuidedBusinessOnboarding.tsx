'use client';

import React, { useState } from 'react';
import { useProjects } from '../context/ProjectsContext';
import type { TipoCobro } from '../types';
import { Briefcase, CreditCard, Repeat, ShoppingBag, ArrowRight, HardDrive, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';

interface GuidedBusinessOnboardingProps {
  onComplete: () => void;
}

export function GuidedBusinessOnboarding({ onComplete }: GuidedBusinessOnboardingProps) {
  const { addProject, setActiveProject } = useProjects();
  const [step, setStep] = useState<number>(1);
  const [nombreNegocio, setNombreNegocio] = useState<string>('');
  const [tipoModelo, setTipoModelo] = useState<TipoCobro>('credito');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleCreateAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNegocio.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const newProj = await addProject(nombreNegocio.trim(), tipoModelo);
      setActiveProject(newProj);
      onComplete();
    } catch (err) {
      console.error('Error creating initial business:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-5 overflow-y-auto">
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 z-10 py-6">
        {/* HEADER PROGRESS BAR */}
        <div className="space-y-2 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-500/25">
            <Briefcase className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>Configuración Inicial de Negocio</span>
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">Crea tu Primer Negocio</h2>
          <p className="text-xs text-slate-400">
            Guía paso a paso para configurar tu cartera de cobro con respaldo directo en tu Google Drive.
          </p>

          <div className="flex items-center justify-center space-x-2 pt-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i ? 'w-8 bg-emerald-400' : i < step ? 'w-4 bg-emerald-600' : 'w-4 bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: BIENVENIDA E INICIO */}
        {step === 1 && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5 text-center shadow-2xl">
            <div className="space-y-3">
              <h3 className="text-lg font-extrabold text-white">¡Bienvenido a Cobranza GD! 🎉</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Antes de comenzar a registrar clientes y cobros, debes crear tu primer negocio o cartera.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-left text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <HardDrive className="w-4 h-4" />
                <span>100% Guardado en tu Google Drive</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Los datos se guardarán en tu archivo Excel <span className="text-emerald-400 font-mono">📊 CobranzaGD_LibroDeCobros</span> dentro de tu carpeta privada de Google Drive.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20 active:scale-98 transition-all"
            >
              <span>Comenzar Configuración</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: NOMBRE DEL NEGOCIO */}
        {step === 2 && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Paso 1 de 2</span>
              <h3 className="text-lg font-extrabold text-white">¿Cómo se llama tu Negocio o Cartera?</h3>
              <p className="text-xs text-slate-400">
                Escribe un nombre identificativo para esta cartera de clientes.
              </p>
            </div>

            <div>
              <input
                type="text"
                autoFocus
                placeholder="Ej: Préstamos Express, Suscripciones IPTV, Calzado"
                value={nombreNegocio}
                onChange={e => setNombreNegocio(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl glass-input text-xs font-bold text-white placeholder:font-normal"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3.5 px-4 rounded-2xl bg-slate-800/80 text-slate-300 font-bold text-xs"
              >
                Atrás
              </button>

              <button
                type="button"
                disabled={!nombreNegocio.trim()}
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-40"
              >
                <span>Siguiente: Modelo de Negocio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SELECCIÓN DEL MODELO DE NEGOCIO */}
        {step === 3 && (
          <form onSubmit={handleCreateAndStart} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Paso 2 de 2</span>
              <h3 className="text-lg font-extrabold text-white">Selecciona el Modelo de Negocio</h3>
              <p className="text-xs text-slate-400">
                ¿Cómo realizarás los cobros en <span className="text-emerald-400 font-bold">{nombreNegocio}</span>?
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'credito',
                  title: 'Ventas a Crédito y Cuotas 💳',
                  desc: 'Financiamiento de productos/servicios con cuotas, intereses y tabla de amortización.',
                  icon: <CreditCard className="w-5 h-5 text-emerald-400" />,
                  bg: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300',
                },
                {
                  id: 'suscripcion',
                  title: 'Suscripciones Recurrentes 🔁',
                  desc: 'Cobros periódicos por planes (mensual/anual), membresías y renovación de servicios.',
                  icon: <Repeat className="w-5 h-5 text-indigo-400" />,
                  bg: 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300',
                },
                {
                  id: 'unico',
                  title: 'Ventas y Pago Único 🛍️',
                  desc: 'Cobros únicos de contado o cuotas simples sin financiamiento continuo.',
                  icon: <ShoppingBag className="w-5 h-5 text-amber-400" />,
                  bg: 'bg-amber-500/15 border-amber-500/50 text-amber-300',
                },
              ].map(model => (
                <button
                  type="button"
                  key={model.id}
                  onClick={() => setTipoModelo(model.id as TipoCobro)}
                  className={`p-4 rounded-2xl border text-left flex items-start space-x-3 transition-all ${
                    tipoModelo === model.id
                      ? `${model.bg} shadow-md border-emerald-500/60 ring-1 ring-emerald-500/40`
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="mt-0.5">{model.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold text-xs text-white flex items-center justify-between">
                      <span>{model.title}</span>
                      {tipoModelo === model.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">{model.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setStep(2)}
                className="py-3.5 px-4 rounded-2xl bg-slate-800/80 text-slate-300 font-bold text-xs disabled:opacity-50"
              >
                Atrás
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/25 active:scale-98 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Guardando en Google Drive...</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-4 h-4" />
                    <span>Crear y Guardar en Google Drive</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
