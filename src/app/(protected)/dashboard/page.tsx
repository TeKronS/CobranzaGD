'use client';

import React, { useState, useEffect } from 'react';
import { useProjects } from '../../../context/ProjectsContext';
import { ClientMobileCard } from '../../../components/ClientMobileCard';
import { BottomSheet } from '../../../components/BottomSheet';
import { PaymentOrRenewalModal } from '../../../components/PaymentOrRenewalModal';
import { RefundModal } from '../../../components/RefundModal';
import { BusinessOnboardingModal } from '../../../components/BusinessOnboardingModal';
import { GoogleDriveConnectModal } from '../../../components/GoogleDriveConnectModal';
import { formatCurrency, calculateDashboardStats, formatDateDDMMAAAA } from '../../../lib/clients';
import type { EnrichedClient } from '../../../types';
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  ShieldCheck,
  Zap,
  HardDrive,
  Briefcase,
  FileSpreadsheet,
  FolderOpen,
  ExternalLink,
  ArrowUpRight,
  RotateCcw,
  ShoppingBag,
  Plus,
  CheckCircle2,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { buildWhatsAppLink } from '../../../lib/messaging';

export default function DashboardPage() {
  const { allClients, activeProject, accessToken, refundSubscription, addSaleToClient } = useProjects();
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | null>(null);
  const [paymentModalClient, setPaymentModalClient] = useState<EnrichedClient | null>(null);
  const [refundModalClient, setRefundModalClient] = useState<EnrichedClient | null>(null);
  const [dashboardFilter, setDashboardFilter] = useState<'vencidos' | 'proximos'>('vencidos');
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [excelUrl, setExcelUrl] = useState('');
  const [docsUrl, setDocsUrl] = useState('');

  // States for adding a sale to a client in Pago Único
  const [saleModalClient, setSaleModalClient] = useState<EnrichedClient | null>(null);
  const [saleItemName, setSaleItemName] = useState('');
  const [saleItemQty, setSaleItemQty] = useState('1');
  const [saleItemTotal, setSaleItemTotal] = useState('');
  const [saleItemDate, setSaleItemDate] = useState('');
  const [isSavingSale, setIsSavingSale] = useState(false);

  const isUnico = activeProject?.tipo === 'unico';

  const unicoProducts = React.useMemo(() => {
    if (!activeProject) return [];
    const prods = [...(activeProject.productosCredito || [])];
    if (activeProject.tipo === 'unico' && activeProject.planesSuscripcion) {
      for (const p of activeProject.planesSuscripcion) {
        if (!prods.some(existing => existing.nombre.toLowerCase() === p.nombre.toLowerCase())) {
          prods.push({
            id: p.id,
            proyectoId: activeProject.id,
            nombre: p.nombre,
            precio: p.monto,
            modelo: undefined,
            serial: undefined,
            fechaRegistro: '',
          });
        }
      }
    }
    return prods;
  }, [activeProject]);

  const handleDashboardAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleModalClient || !saleItemName.trim() || !saleItemTotal || isSavingSale) return;

    try {
      setIsSavingSale(true);
      const qty = parseInt(saleItemQty) || 1;
      const total = parseFloat(saleItemTotal) || 0;
      const fecha = saleItemDate || new Date().toISOString().split('T')[0];

      await addSaleToClient(saleModalClient.id, {
        nombre: saleItemName.trim(),
        cantidad: qty,
        precioTotal: total,
        fecha,
      });

      setSaleModalClient(null);
      setSaleItemName('');
      setSaleItemQty('1');
      setSaleItemTotal('');
      setSaleItemDate('');
    } finally {
      setIsSavingSale(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setExcelUrl(localStorage.getItem('cgd_excel_url') || '');
      setDocsUrl(localStorage.getItem('cgd_docs_folder_url') || '');
    }
  }, []);

  // Filter clients strictly belonging to the currently active business portfolio
  const activeClients = allClients.filter(
    c => !activeProject || c.proyectoId === activeProject.id
  );

  const modelStats = calculateDashboardStats(
    activeClients,
    activeProject?.tipo || 'credito'
  );

  const expiredClients = activeClients.filter(
    c => c.estadoCalc === 'mora' || c.estadoCalc === 's_vencido'
  );

  const upcomingClients = activeClients.filter(
    c => c.estadoCalc === 'proximo' || c.estadoCalc === 's_vencer' || c.estadoCalc === 'hoy'
  );

  const displayClients = (dashboardFilter === 'vencidos' ? expiredClients : upcomingClients).sort((a, b) => {
    const deudaA = a.deudaRestante !== undefined ? a.deudaRestante : (a.monto || 0);
    const deudaB = b.deudaRestante !== undefined ? b.deudaRestante : (b.monto || 0);
    return deudaB - deudaA;
  });

  return (
    <div className="space-y-5 pb-6">
      {/* Banner de Sincronización Google Drive con Accesos a Excel y Carpeta de Documentos */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/30 space-y-3">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30 flex items-center space-x-1">
            <HardDrive className="w-3 h-3" />
            <span>{accessToken ? 'Drive Conectado' : 'Guardando en Drive'}</span>
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShowDriveModal(true)}
              className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold flex items-center space-x-1"
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>Ver Archivos Excel</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {activeProject?.nombre || 'Control de Cobranzas GD'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeClients.length} registro{activeClients.length !== 1 ? 's' : ''} estructurado{activeClients.length !== 1 ? 's' : ''} en Google Drive.
            </p>
          </div>
          <button
            onClick={() => setShowBusinessModal(true)}
            className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center space-x-1 hover:bg-emerald-500/30 active:scale-95 transition-all"
            title="Cambiar o Crear Negocio"
          >
            <Briefcase className="w-4 h-4" />
            <span className="hidden sm:inline">Negocios</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas específicas del Negocio Activo */}
      {isUnico ? (
        /* ── MÉTRICAS DIRECTAS PARA PAGO ÚNICO: SOLO POR COBRAR Y COBRADO MES ── */
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/clients"
            className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-950/15 hover:border-amber-500/60 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-amber-400 leading-none">
              <span className="text-[11px] font-extrabold uppercase tracking-wider group-hover:text-amber-300">
                Dinero por Cobrar
              </span>
              <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
            </div>
            <p className="text-2xl font-black text-amber-400 tracking-tight my-2">
              {formatCurrency(modelStats.montoPendiente)}
            </p>
            <span className="text-[10px] text-amber-300/90 font-bold block leading-none">
              {activeClients.filter(c => (c.deudaRestante !== undefined ? c.deudaRestante : c.monto) > 0).length} clientes con deuda pendiente →
            </span>
          </Link>

          <Link
            href="/reports"
            className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 hover:border-emerald-500/60 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-emerald-400 leading-none">
              <span className="text-[11px] font-extrabold uppercase tracking-wider group-hover:text-emerald-300">
                Cobrado Este Mes
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            </div>
            <p className="text-2xl font-black text-emerald-400 tracking-tight my-2">
              {formatCurrency(modelStats.capitalRecuperado || 0)}
            </p>
            <span className="text-[10px] text-emerald-300/90 font-bold block leading-none">
              Abonos y cobros recibidos →
            </span>
          </Link>
        </div>
      ) : (
        /* ── MÉTRICAS PARA CRÉDITO Y SUSCRIPCIÓN ── */
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/reports"
            className="glass-panel px-3 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/60 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-400 leading-none">
              <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-emerald-300 truncate">
                {activeProject?.tipo === 'suscripcion' ? 'MRR / Recurrente' : 'Por Cobrar'}
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-1" />
            </div>
            <p className="text-[17px] font-black text-emerald-400 tracking-tight leading-tight my-1">
              {formatCurrency(modelStats.montoPendiente)}
            </p>
            <span className="text-[9.5px] text-emerald-300/90 font-bold block group-hover:text-emerald-200 underline decoration-emerald-500/40 leading-none">
              {activeProject?.tipo === 'suscripcion' ? 'Ver estadísticas →' : 'Ver proyecciones →'}
            </span>
          </Link>

          {/* BOTÓN FILTRO: SUSCRIPCIONES VENCIDAS */}
          <button
            type="button"
            onClick={() => setDashboardFilter('vencidos')}
            className={`glass-panel px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between ${
              dashboardFilter === 'vencidos'
                ? 'border-2 border-rose-500 bg-rose-950/40 shadow-md shadow-rose-500/10 scale-[1.01]'
                : 'border border-rose-500/30 bg-rose-950/20 hover:border-rose-500/60 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between text-rose-400 leading-none">
              <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-rose-300 truncate">
                {activeProject?.tipo === 'suscripcion' ? 'Suscrip. Vencidas' : 'En Mora / Vencido'}
              </span>
              <AlertTriangle className={`w-3.5 h-3.5 text-rose-400 flex-shrink-0 ml-1 ${dashboardFilter === 'vencidos' ? 'animate-bounce' : ''}`} />
            </div>
            <p className="text-[17px] font-black text-rose-400 tracking-tight leading-tight my-1">
              {modelStats.enMora}{' '}
              {activeProject?.tipo === 'suscripcion' ? (
                <span className="text-[11px] font-semibold text-rose-300">
                  ({modelStats.enMora === 1 ? '1 vencida' : `${modelStats.enMora} vencidas`})
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-rose-300">
                  ({formatCurrency(modelStats.montoMora)})
                </span>
              )}
            </p>
            <span className={`text-[9.5px] font-bold block leading-none ${dashboardFilter === 'vencidos' ? 'text-rose-300 underline font-black' : 'text-rose-300/80 group-hover:text-rose-200'}`}>
              {dashboardFilter === 'vencidos' ? 'Mostrando en lista ↓' : 'Mostrar en lista ↓'}
            </span>
          </button>

          {/* BOTÓN FILTRO: POR VENCER (7D) */}
          <button
            type="button"
            onClick={() => setDashboardFilter('proximos')}
            className={`glass-panel px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between ${
              dashboardFilter === 'proximos'
                ? 'border-2 border-sky-500 bg-sky-950/40 shadow-md shadow-sky-500/10 scale-[1.01]'
                : 'border border-sky-500/30 bg-sky-950/20 hover:border-sky-500/60 hover:scale-[1.01]'
            }`}
          >
            <div className="flex items-center justify-between text-sky-400 leading-none">
              <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-sky-300 truncate">
                {activeProject?.tipo === 'suscripcion' ? 'Por Vencer (7d)' : 'Próximos Cobros'}
              </span>
              <Clock className={`w-3.5 h-3.5 text-sky-400 flex-shrink-0 ml-1 ${dashboardFilter === 'proximos' ? 'animate-bounce' : ''}`} />
            </div>
            <p className="text-[17px] font-black text-sky-300 tracking-tight leading-tight my-1">
              {modelStats.proximos}
            </p>
            <span className={`text-[9.5px] font-bold block leading-none ${dashboardFilter === 'proximos' ? 'text-sky-300 underline font-black' : 'text-sky-300/80 group-hover:text-sky-200'}`}>
              {dashboardFilter === 'proximos' ? 'Mostrando en lista ↓' : 'Mostrar en lista ↓'}
            </span>
          </button>

          <Link
            href="/reports"
            className="glass-panel px-3 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 hover:border-indigo-500/60 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-indigo-400 leading-none">
              <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-indigo-300 truncate">
                Cobrado Mes
              </span>
              <Zap className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 ml-1" />
            </div>
            <p className="text-[17px] font-black text-indigo-300 tracking-tight leading-tight my-1">
              {formatCurrency(modelStats.capitalRecuperado || 0)}
            </p>
            <span className="text-[9.5px] text-indigo-300/90 font-bold block group-hover:text-indigo-200 underline decoration-indigo-500/40 leading-none">
              Ver estadísticas →
            </span>
          </Link>
        </div>
      )}

      {/* Sección de Gestión en el Inicio */}
      {isUnico ? (
        /* ── SECCIÓN DIRECTA DE CLIENTES FRECUENTES PARA PAGO ÚNICO ── */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Clientes Frecuentes / Por Cobrar</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Agrega nuevos cobros o registra abonos directamente
              </p>
            </div>

            <Link
              href="/clients"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-0.5"
            >
              <span>Ver todos ({activeClients.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeClients.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-center space-y-2 border border-white/5">
              <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-white">No tienes clientes registrados aún</p>
              <p className="text-[11px] text-slate-400">
                Presiona el botón (+) inferior para registrar tu primera venta o cliente fiado.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...activeClients]
                .sort((a, b) => {
                  const deudaA = a.deudaRestante !== undefined ? a.deudaRestante : (a.monto || 0);
                  const deudaB = b.deudaRestante !== undefined ? b.deudaRestante : (b.monto || 0);
                  if (deudaB !== deudaA) return deudaB - deudaA;
                  return a.nombre.localeCompare(b.nombre);
                })
                .map(client => {
                  const deuda = client.deudaRestante !== undefined ? client.deudaRestante : (client.monto || 0);
                  const hasDebt = deuda > 0;
                  const waLink = buildWhatsAppLink(client);

                  return (
                    <div
                      key={client.id}
                      className="glass-panel-interactive rounded-2xl p-4 border border-white/10 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                          onClick={() => setSelectedClient(client)}
                        >
                          <div className="w-11 h-11 rounded-2xl shrink-0 bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center font-bold text-sm text-amber-400 shadow-inner">
                            {client.iniciales}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-white tracking-tight leading-tight truncate">
                              {client.nombre}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="shrink-0 font-mono">
                                {client.identificacion || client.cedula || 'Sin cédula'}
                              </span>
                              {client.telefono && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="truncate text-slate-300">{client.telefono}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            {hasDebt ? 'Por Cobrar' : 'Solvente'}
                          </span>
                          <span className={`text-base font-black ${hasDebt ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {formatCurrency(deuda, client.moneda)}
                          </span>
                        </div>
                      </div>

                      {/* ACCIONES DIRECTAS: + VENTA / COBRO | ABONAR | WHATSAPP */}
                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setSaleModalClient(client);
                            if (unicoProducts.length > 0) {
                              const first = unicoProducts[0];
                              setSaleItemName(first.nombre);
                              setSaleItemQty('1');
                              setSaleItemTotal(first.precio.toFixed(2));
                            } else {
                              setSaleItemName('');
                              setSaleItemQty('1');
                              setSaleItemTotal('');
                            }
                            setSaleItemDate(new Date().toISOString().split('T')[0]);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-sm shadow-amber-500/5"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>+ Cobro / Venta</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentModalClient(client)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-sm shadow-emerald-500/5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Abonar</span>
                        </button>

                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-800/90 text-emerald-400 hover:bg-emerald-500/20 border border-slate-700/80 active:scale-95 transition-all flex items-center justify-center"
                          title="Enviar mensaje por WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* ── SECCIÓN DE GESTIÓN PARA CRÉDITO Y SUSCRIPCIÓN (VENCIDAS VS POR VENCER) ── */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1.5 bg-slate-900/90 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setDashboardFilter('vencidos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  dashboardFilter === 'vencidos'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {activeProject?.tipo === 'suscripcion'
                    ? `Vencidas (${expiredClients.length})`
                    : `Vencidos (${expiredClients.length})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardFilter('proximos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  dashboardFilter === 'proximos'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {activeProject?.tipo === 'suscripcion'
                    ? `Por Vencer (${upcomingClients.length})`
                    : `Próximos (${upcomingClients.length})`}
                </span>
              </button>
            </div>

            <Link
              href="/clients"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-0.5"
            >
              <span>Ver cartera</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {displayClients.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-center space-y-2 border border-white/5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${dashboardFilter === 'vencidos' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'}`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-white">
                {dashboardFilter === 'vencidos'
                  ? '¡Sin suscripciones vencidas!'
                  : '¡Sin vencimientos en los próximos 7 días!'}
              </p>
              <p className="text-[11px] text-slate-400">
                {dashboardFilter === 'vencidos'
                  ? 'Todos tus clientes se encuentran al día con sus suscripciones.'
                  : 'No hay clientes programados para vencer durante esta semana.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayClients.map(client => (
                <ClientMobileCard
                  key={client.id}
                  client={client}
                  onSelect={c => setSelectedClient(c)}
                  onQuickPayment={c => setPaymentModalClient(c)}
                  onRefund={activeProject?.tipo === 'suscripcion' ? (c => setRefundModalClient(c)) : undefined}
                  projectType={activeProject?.tipo}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <BusinessOnboardingModal isOpen={showBusinessModal} onClose={() => setShowBusinessModal(false)} />
      <GoogleDriveConnectModal isOpen={showDriveModal} onClose={() => setShowDriveModal(false)} />

      {/* Modal Detalle del Cliente */}
      <BottomSheet
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.nombre}
      >
        {selectedClient && (
          <div className="space-y-4 pt-1 text-slate-200">
            <div className="flex items-center space-x-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
              {selectedClient.driveFotoURL ? (
                <img
                  src={selectedClient.driveFotoURL}
                  alt={selectedClient.nombre}
                  className="w-12 h-12 rounded-2xl object-cover border border-emerald-500/40"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 border border-white/10 flex items-center justify-center font-bold text-base text-white shadow-md">
                  {selectedClient.iniciales}
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-sm text-white">{selectedClient.nombre}</h4>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedClient.identificacion || selectedClient.cedula || 'Sin Identificación'}
                </p>
                {!isUnico ? (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${selectedClient.statusConfig.badgeClass}`}>
                    {selectedClient.statusConfig.label}
                  </span>
                ) : (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    (selectedClient.deudaRestante !== undefined ? selectedClient.deudaRestante : selectedClient.monto) > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {(selectedClient.deudaRestante !== undefined ? selectedClient.deudaRestante : selectedClient.monto) > 0 ? 'Por Cobrar' : 'Solvente ✓'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px] block">
                  {activeProject?.tipo === 'suscripcion' ? 'Días Restantes:' : isUnico ? 'Total en Ventas:' : 'Monto / Deuda:'}
                </span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {activeProject?.tipo === 'suscripcion'
                    ? (selectedClient.diasRestantes > 0 ? `${selectedClient.diasRestantes} días` : selectedClient.diasRestantes === 0 ? 'Vence Hoy' : `Vencido (${Math.abs(selectedClient.diasRestantes)}d)`)
                    : isUnico
                    ? formatCurrency(selectedClient.monto, selectedClient.moneda)
                    : (selectedClient.deudaRestanteFormateada || selectedClient.montoFormateado)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px] block">
                  {isUnico ? 'Deuda Pendiente:' : 'Vencimiento:'}
                </span>
                <span className={`text-xs ${isUnico ? 'font-black text-amber-400' : 'font-bold text-white'}`}>
                  {isUnico
                    ? formatCurrency(selectedClient.deudaRestante !== undefined ? selectedClient.deudaRestante : selectedClient.monto, selectedClient.moneda)
                    : formatDateDDMMAAAA(selectedClient.fechaVence)}
                </span>
              </div>
            </div>

            {/* BOTONES DE ACCION RÁPIDA */}
            <div className="space-y-2 pt-2">
              {isUnico && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedClient;
                    setSelectedClient(null);
                    setSaleModalClient(target);
                    if (unicoProducts.length > 0) {
                      const first = unicoProducts[0];
                      setSaleItemName(first.nombre);
                      setSaleItemQty('1');
                      setSaleItemTotal(first.precio.toFixed(2));
                    } else {
                      setSaleItemName('');
                      setSaleItemQty('1');
                      setSaleItemTotal('');
                    }
                    setSaleItemDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-sm shadow-amber-500/10"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Agregar Otro Cobro / Artículo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const target = selectedClient;
                  setSelectedClient(null);
                  setPaymentModalClient(target);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                {activeProject?.tipo === 'suscripcion' ? 'Renovar Plan' : 'Registrar Pago / Abono'}
              </button>

              {activeProject?.tipo === 'suscripcion' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedClient;
                    setSelectedClient(null);
                    setRefundModalClient(target);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Procesar Devolución / Reembolso</span>
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Modal Registrar Nuevo Cobro / Artículo a Cliente (Pago Único) */}
      <BottomSheet
        isOpen={!!saleModalClient}
        onClose={() => setSaleModalClient(null)}
        title={`+ Cobro / Venta a ${saleModalClient?.nombre || ''}`}
      >
        {saleModalClient && (
          <form onSubmit={handleDashboardAddSale} className="space-y-4 pt-1">
            {unicoProducts.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Cargar desde el Catálogo
                </label>
                <select
                  value=""
                  onChange={e => {
                    const prod = unicoProducts.find(p => p.nombre === e.target.value);
                    if (prod) {
                      setSaleItemName(prod.nombre);
                      const qty = parseInt(saleItemQty) || 1;
                      setSaleItemTotal((prod.precio * qty).toFixed(2));
                    }
                  }}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Seleccionar producto del catálogo --</option>
                  {unicoProducts.map(p => (
                    <option key={p.id} value={p.nombre}>
                      {p.nombre} ({formatCurrency(p.precio, saleModalClient.moneda)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Artículo / Detalle del Cobro *
              </label>
              <input
                type="text"
                required
                value={saleItemName}
                onChange={e => setSaleItemName(e.target.value)}
                placeholder="Ej. Harina Pan, Refresco, Cuaderno..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={saleItemQty}
                  onChange={e => {
                    const val = e.target.value;
                    setSaleItemQty(val);
                    const prod = unicoProducts.find(p => p.nombre.toLowerCase() === saleItemName.toLowerCase());
                    if (prod) {
                      const qty = parseInt(val) || 1;
                      setSaleItemTotal((prod.precio * qty).toFixed(2));
                    }
                  }}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Monto Total ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={saleItemTotal}
                  onChange={e => setSaleItemTotal(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Fecha del Cobro / Venta
              </label>
              <input
                type="date"
                value={saleItemDate}
                onChange={e => setSaleItemDate(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingSale || !saleItemName.trim() || !saleItemTotal}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSavingSale ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando en Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Añadir Cobro a {saleModalClient.nombre}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      {/* Modal de Registro de Pago o Renovación de Plan */}
      <PaymentOrRenewalModal
        client={paymentModalClient}
        onClose={() => setPaymentModalClient(null)}
      />

      {/* Modal de Devolución / Reembolso */}
      <RefundModal
        client={refundModalClient}
        isOpen={!!refundModalClient}
        onClose={() => setRefundModalClient(null)}
        onConfirmRefund={async (cId, pCount, mDev, nts) => {
          await refundSubscription(cId, pCount, mDev, nts);
        }}
      />
    </div>
  );
}
