'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProjects } from '../../../context/ProjectsContext';
import { ClientMobileCard } from '../../../components/ClientMobileCard';
import { BottomSheet } from '../../../components/BottomSheet';
import { PaymentOrRenewalModal } from '../../../components/PaymentOrRenewalModal';
import { RefundModal } from '../../../components/RefundModal';
import { buildWhatsAppLink } from '../../../lib/messaging';
import { formatCurrency, formatDateDDMMAAAA } from '../../../lib/clients';
import type { EnrichedClient } from '../../../types';
import {
  Search,
  Users,
  MessageSquare,
  Archive,
  Calendar,
  HardDrive,
  ExternalLink,
  FileText,
  Package,
  UserCheck,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

export default function ClientsPage() {
  const { clients, activeProject, archiveClient, reactivateClient, refundSubscription } = useProjects();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'activos' | 'inactivos' | 'mora' | 'proximos' | 'todos'>('activos');
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | null>(null);
  const [paymentModalClient, setPaymentModalClient] = useState<EnrichedClient | null>(null);
  const [refundModalClient, setRefundModalClient] = useState<EnrichedClient | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['activos', 'inactivos', 'mora', 'proximos', 'todos'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const filteredClients = clients.filter(c => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch =
      c.nombre.toLowerCase().includes(searchLower) ||
      (c.identificacion && c.identificacion.toLowerCase().includes(searchLower)) ||
      c.cedula.toLowerCase().includes(searchLower) ||
      c.telefono.includes(searchLower);

    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === 'activos') {
      return c.estado === 'activo' || c.estado === 's_activo' || c.estado === 'al_dia' || c.estado === 'proximo' || c.estado === 'mora' || c.estado === 'hoy' || c.estado === 'u_deudor';
    }
    if (activeTab === 'inactivos') {
      return c.estado === 'inactivo' || c.estado === 'pagado' || c.estado === 'archivado' || c.estado === 's_finalizado' || c.estado === 'u_cero';
    }
    if (activeTab === 'mora') {
      return c.estadoCalc === 'mora' || c.estadoCalc === 's_vencido';
    }
    if (activeTab === 'proximos') {
      return c.estadoCalc === 'proximo' || c.estadoCalc === 's_vencer' || c.estadoCalc === 'hoy';
    }
    return true;
  });

  const activeCount = clients.filter(c => c.estado === 'activo' || c.estado === 's_activo' || c.estado === 'al_dia' || c.estado === 'proximo' || c.estado === 'mora' || c.estado === 'hoy' || c.estado === 'u_deudor').length;
  const inactiveCount = clients.filter(c => c.estado === 'inactivo' || c.estado === 'pagado' || c.estado === 'archivado' || c.estado === 's_finalizado' || c.estado === 'u_cero').length;
  const moraCount = clients.filter(c => c.estadoCalc === 'mora' || c.estadoCalc === 's_vencido').length;
  const proximosCount = clients.filter(c => c.estadoCalc === 'proximo' || c.estadoCalc === 's_vencer' || c.estadoCalc === 'hoy').length;

  return (
    <div className="space-y-4 pb-6">
      {/* CONTENEDOR DE FILTROS SIEMPRE VISIBLES (STICKY TOP BAR) */}
      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-xl pt-2 pb-3 -mx-4 px-4 border-b border-white/10 space-y-2.5 shadow-xl transition-all">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>{activeProject?.nombre || 'Clientes'}</span>
            </h2>
            <span className="text-[11px] text-slate-400 block">
              Lista de clientes estructurada en Google Drive
            </span>
          </div>

          <span className="text-xs font-bold text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800 flex items-center space-x-1.5 shadow-sm">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>{clients.length} Clientes</span>
          </span>
        </div>

        {/* BUSCADOR */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, RIF/DNI o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs"
          />
        </div>

        {/* PESTAÑAS DE FILTRO DISTRIBUIDAS EVENLY EN TODA LA CAJA */}
        <div className="flex flex-wrap gap-1.5 w-full pt-0.5">
          {(activeProject?.tipo === 'unico'
            ? [
                { id: 'activos', label: `Pendientes (${activeCount})` },
                { id: 'inactivos', label: `Pagados (${inactiveCount})` },
                { id: 'todos', label: `Todos (${clients.length})` },
              ]
            : [
                { id: 'activos', label: `Activos (${activeCount})` },
                { id: 'inactivos', label: `Inactivos (${inactiveCount})` },
                {
                  id: 'mora',
                  label: activeProject?.tipo === 'suscripcion' ? `Vencidas ⚠️ (${moraCount})` : `En Mora ⚠️ (${moraCount})`,
                },
                {
                  id: 'proximos',
                  label: activeProject?.tipo === 'suscripcion' ? `Por Vencer ⏳ (${proximosCount})` : `Próximos ⏳ (${proximosCount})`,
                },
                { id: 'todos', label: `Todos (${clients.length})` },
              ]
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[110px] sm:min-w-0 px-2.5 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center transition-all active:scale-95 ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center space-y-2 border border-white/5 my-4">
          <Users className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-white">No se encontraron clientes en este filtro</p>
          <p className="text-xs text-slate-400">
            {search ? 'Intenta cambiar la palabra de búsqueda.' : 'Agrega tu primer cliente en este negocio presionado (+).'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map(client => (
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

      {/* MODAL DETALLE COMPLETO DEL CLIENTE */}
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
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${selectedClient.statusConfig.badgeClass}`}>
                  {selectedClient.statusConfig.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px] block">
                  {activeProject?.tipo === 'suscripcion' ? 'Días Restantes:' : 'Monto / Deuda:'}
                </span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {activeProject?.tipo === 'suscripcion'
                    ? (selectedClient.diasRestantes > 0 ? `${selectedClient.diasRestantes} días` : selectedClient.diasRestantes === 0 ? 'Vence Hoy' : `Vencido (${Math.abs(selectedClient.diasRestantes)}d)`)
                    : (selectedClient.deudaRestanteFormateada || selectedClient.montoFormateado)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px] block">
                  {activeProject?.tipo === 'unico' ? 'Modalidad:' : 'Vencimiento:'}
                </span>
                <span className="font-bold text-white text-xs">
                  {activeProject?.tipo === 'unico' ? 'Pago Único (Sin vencimiento)' : formatDateDDMMAAAA(selectedClient.fechaVence)}
                </span>
              </div>
            </div>

            {/* DETALLES CONFIGURADOS SEGÚN MODELO DE NEGOCIO */}
            {selectedClient.config && (
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Detalles del Contrato / Registro
                </h5>

                {selectedClient.config.planNombre && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan Contratado:</span>
                    <span className="font-bold text-indigo-300">{selectedClient.config.planNombre}</span>
                  </div>
                )}

                {selectedClient.config.productoNombre && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Producto:</span>
                    <span className="font-bold text-emerald-300">
                      {selectedClient.config.productoNombre} {selectedClient.config.productoModelo ? `(${selectedClient.config.productoModelo})` : ''}
                    </span>
                  </div>
                )}

                {selectedClient.config.productoSerial && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Serial / VIN:</span>
                    <span className="font-mono text-slate-200">{selectedClient.config.productoSerial}</span>
                  </div>
                )}

                {selectedClient.config.pagoInicial !== undefined && selectedClient.config.pagoInicial > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pago Inicial:</span>
                    <span className="font-bold text-emerald-400">
                      ${selectedClient.config.pagoInicial.toFixed(2)} {selectedClient.config.inicialPagada ? '(Pagado ✓)' : '(Pendiente)'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTO LEGAL SI EXISTE */}
            {(selectedClient.documentoLegalURL || selectedClient.config?.documentoLegalUrl) && (
              <a
                href={selectedClient.documentoLegalURL || selectedClient.config?.documentoLegalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-between hover:bg-indigo-500/25 transition-all"
              >
                <span className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Ver Documento Legal / Contrato Adjunto</span>
                </span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* CRONOGRAMA DE CUOTAS */}
            {selectedClient.planPagos && selectedClient.planPagos.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cronograma de Cuotas</span>
                </h5>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedClient.planPagos.map((cuota, idx) => (
                    <div
                      key={cuota.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cuota.estado === 'pagado' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-medium text-slate-200">
                          {cuota.descripcion || `Cuota ${idx + 1}`} ({formatDateDDMMAAAA(cuota.fecha)})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(cuota.monto, selectedClient.moneda)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            cuota.estado === 'pagado'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {cuota.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedClient.notas && (
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 text-[10px] block font-semibold mb-1">Notas:</span>
                <p className="text-slate-300 whitespace-pre-line">{selectedClient.notas}</p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <a
                href={buildWhatsAppLink(selectedClient)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2 active:scale-95 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Recordatorio por WhatsApp</span>
              </a>

              {activeProject?.tipo === 'suscripcion' && (
                <button
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

              {selectedClient.estado === 'inactivo' || selectedClient.estado === 'archivado' ? (
                <button
                  onClick={() => {
                    reactivateClient(selectedClient.id);
                    setSelectedClient(null);
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs active:scale-95 transition-all"
                >
                  Reactivar Cliente
                </button>
              ) : (
                <button
                  onClick={() => {
                    archiveClient(selectedClient.id);
                    setSelectedClient(null);
                  }}
                  className="w-full py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:border-rose-500/50 hover:text-rose-100 font-bold text-xs flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm shadow-rose-950/20 group"
                >
                  <Archive className="w-4 h-4 text-rose-400 group-hover:text-rose-300 transition-colors" />
                  <span>Mover a Inactivos / Archivar</span>
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* MODAL REUTILIZABLE DE REGISTRO DE PAGO O RENOVACIÓN DE PLAN */}
      <PaymentOrRenewalModal
        client={paymentModalClient}
        onClose={() => setPaymentModalClient(null)}
      />

      {/* MODAL DE DEVOLUCIÓN / REEMBOLSO */}
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
