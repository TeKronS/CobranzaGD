'use client';

import React, { useState } from 'react';
import { useProjects } from '../../../context/ProjectsContext';
import { BottomSheet } from '../../../components/BottomSheet';
import { formatCurrency } from '../../../lib/clients';
import type { Currency, Frequency } from '../../../types';
import {
  Zap,
  Plus,
  CheckCircle2,
  Package,
  ShoppingBag,
  Trash2,
  Tag,
  ShieldCheck,
  Hash,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function CatalogOrPlansPage() {
  const {
    activeProject,
    addSubscriptionPlan,
    addCreditProduct,
    deleteCreditProduct,
  } = useProjects();

  const isCredit = activeProject?.tipo === 'credito' || !activeProject?.tipo;
  const isSubscription = activeProject?.tipo === 'suscripcion';
  const isSingle = activeProject?.tipo === 'unico';

  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for subscription plan
  const [planNombre, setPlanNombre] = useState('');
  const [planMonto, setPlanMonto] = useState('');
  const [planMoneda, setPlanMoneda] = useState<Currency>('USD');
  const [planFrecuencia, setPlanFrecuencia] = useState<Frequency>('mensual');

  // Form states for credit product
  const [prodNombre, setProdNombre] = useState('');
  const [prodModelo, setProdModelo] = useState('');
  const [prodPrecio, setProdPrecio] = useState('');
  const [prodSerial, setProdSerial] = useState('');

  const plans = activeProject?.planesSuscripcion || [];
  const creditProducts = activeProject?.productosCredito || [];

  const handleCreateSubscriptionPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planNombre.trim() || !planMonto || !activeProject) return;

    await addSubscriptionPlan(activeProject.id, {
      nombre: planNombre.trim(),
      monto: parseFloat(planMonto) || 0,
      moneda: planMoneda,
      frecuencia: planFrecuencia,
    });

    setPlanNombre('');
    setPlanMonto('');
    setShowAddModal(false);
  };

  const handleCreateCreditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNombre.trim() || !prodPrecio || !activeProject) return;

    await addCreditProduct(activeProject.id, {
      nombre: prodNombre.trim(),
      modelo: prodModelo.trim() || undefined,
      precio: parseFloat(prodPrecio) || 0,
      serial: prodSerial.trim() || undefined,
    });

    setProdNombre('');
    setProdModelo('');
    setProdPrecio('');
    setProdSerial('');
    setShowAddModal(false);
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (confirm('¿Deseas eliminar este producto del catálogo?')) {
      if (activeProject) {
        await deleteCreditProduct(activeProject.id, prodId);
      }
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* HEADER DINÁMICO SEGÚN MODELO DE NEGOCIO */}
      <div className="space-y-3">
        <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
          {isCredit && <Package className="w-5 h-5 text-emerald-400" />}
          {isSubscription && <Zap className="w-5 h-5 text-amber-400" />}
          {isSingle && <ShoppingBag className="w-5 h-5 text-amber-400" />}
          <span>
            {isCredit && 'Productos a Crédito'}
            {isSubscription && 'Planes de Suscripción'}
            {isSingle && 'Catálogo de Productos / Servicios'}
          </span>
        </h2>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs flex items-center justify-center space-x-2 hover:bg-emerald-500/30 active:scale-98 transition-all shadow-md shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>
            {isCredit && '+ Registrar Producto a Crédito'}
            {isSubscription && '+ Crear Nuevo Plan de Suscripción'}
            {isSingle && '+ Registrar Artículo / Servicio'}
          </span>
        </button>
      </div>

      {/* TARJETA INFORMATIVA DEL NEGOCIO ACTIVO */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            Proyecto Activo
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
            {isCredit && 'Venta a Crédito'}
            {isSubscription && 'Cobro Recurrente'}
            {isSingle && 'Cobro Único'}
          </span>
        </div>
        <h3 className="text-sm font-bold text-white">{activeProject?.nombre || 'Selecciona un negocio'}</h3>
        <p className="text-xs text-slate-400">
          {isCredit && 'Catálogo de productos y artículos disponibles para vender a crédito o en cuotas.'}
          {isSubscription && 'Define planes de tarifas recurrentes para asignar rápidamente a nuevos clientes.'}
          {isSingle && 'Catálogo de artículos y servicios para cobro único o contado.'}
        </p>
      </div>

      {/* RENDERIZADO PARA NEGOCIO A CRÉDITO: LISTA DE PRODUCTOS */}
      {isCredit && (
        <>
          {creditProducts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center space-y-2 border border-white/5 my-4">
              <Package className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">No tienes productos registrados</p>
              <p className="text-xs text-slate-400">
                Registra tus productos o artículos disponibles para vender a crédito presionando el botón superior.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-400">
                <span>Productos en Catálogo ({creditProducts.length})</span>
                <span>Precio Crédito</span>
              </div>
              {creditProducts.map(prod => (
                <div
                  key={prod.id}
                  className="glass-panel-interactive rounded-2xl p-4 border border-white/10 space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-white">{prod.nombre}</h4>
                        {prod.modelo && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono border border-slate-700">
                            {prod.modelo}
                          </span>
                        )}
                      </div>
                      {prod.serial && (
                        <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-mono">
                          <Hash className="w-3 h-3 text-slate-500" />
                          <span>Serial / Código: {prod.serial}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-base font-black text-emerald-400 block">
                        {formatCurrency(prod.precio)}
                      </span>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 active:scale-95 transition-all inline-flex items-center"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Disponible para venta a crédito</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* RENDERIZADO PARA SUSCRIPCIÓN O PAGO ÚNICO: LISTA DE PLANES */}
      {!isCredit && (
        <>
          {plans.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center space-y-2 border border-white/5 my-4">
              <Zap className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">No tienes planes creados</p>
              <p className="text-xs text-slate-400">
                Crea tu primer plan de cobro presionando el botón superior.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  className="glass-panel-interactive rounded-2xl p-4 border border-white/10 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{plan.nombre}</h4>
                      <span className="text-[11px] text-slate-400 capitalize">
                        Cobro {plan.frecuencia}
                      </span>
                    </div>
                    <span className="text-base font-black text-emerald-400">
                      {formatCurrency(plan.monto, plan.moneda)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Disponible para clientes del proyecto</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL BOTTOMSHEET DINÁMICO */}
      <BottomSheet
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          isCredit
            ? 'Registrar Producto a Crédito 📦'
            : isSubscription
            ? 'Crear Plan de Suscripción ⚡'
            : 'Registrar Artículo / Servicio 🛍️'
        }
      >
        {isCredit ? (
          /* FORMULARIO PARA REGISTRAR PRODUCTO A CRÉDITO */
          <form onSubmit={handleCreateCreditProduct} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Nombre del Producto / Artículo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Nevera, Celular, Calzado, Mercancía..."
                value={prodNombre}
                onChange={e => setProdNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Modelo / Talla / Versión
                </label>
                <input
                  type="text"
                  placeholder="Ej: 128GB, Talla 42, Estándar"
                  value={prodModelo}
                  onChange={e => setProdModelo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Serial / IMEI / Código
                </label>
                <input
                  type="text"
                  placeholder="Ej: SN-94812, IMEI, REF-01"
                  value={prodSerial}
                  onChange={e => setProdSerial(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Precio de Venta a Crédito *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={prodPrecio}
                onChange={e => setProdPrecio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold text-emerald-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-98 transition-all mt-2"
            >
              Guardar Producto en Google Drive
            </button>
          </form>
        ) : (
          /* FORMULARIO PARA PLANES DE SUSCRIPCIÓN */
          <form onSubmit={handleCreateSubscriptionPlan} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Nombre del Plan *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Membresía Premium VIP"
                value={planNombre}
                onChange={e => setPlanNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Monto del Plan *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={planMonto}
                  onChange={e => setPlanMonto(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold text-emerald-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Moneda
                </label>
                <select
                  value={planMoneda}
                  onChange={e => setPlanMoneda(e.target.value as Currency)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-xs bg-slate-900"
                >
                  <option value="USD">USD ($)</option>
                  <option value="VES">VES (Bs.)</option>
                  <option value="COP">COP ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="MXN">MXN ($)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Frecuencia de Cobro
              </label>
              <select
                value={planFrecuencia}
                onChange={e => setPlanFrecuencia(e.target.value as Frequency)}
                className="w-full px-3 py-2.5 rounded-xl glass-input text-xs bg-slate-900"
              >
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-98 transition-all mt-2"
            >
              Guardar Plan en Google Drive
            </button>
          </form>
        )}
      </BottomSheet>
    </div>
  );
}
