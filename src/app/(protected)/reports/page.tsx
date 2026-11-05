'use client';

import React from 'react';
import { useProjects } from '../../../context/ProjectsContext';
import { formatCurrency } from '../../../lib/clients';
import { BarChart3, Download, TrendingUp, DollarSign, RotateCcw, Calendar, Users, ShieldCheck } from 'lucide-react';

export default function ReportsPage() {
  const { clients, stats, activeProject } = useProjects();

  const isSubscription = activeProject?.tipo === 'suscripcion';

  const handleExportCSV = () => {
    if (clients.length === 0) return;

    const headers = [
      'ID',
      'Nombre',
      'Cedula',
      'Telefono',
      'Email',
      isSubscription ? 'Precio Plan' : 'Monto Deuda',
      'Moneda',
      'Fecha Vence',
      'Estado',
    ];

    const rows = clients.map(c => [
      c.id,
      `"${c.nombre}"`,
      `"${c.cedula}"`,
      `"${c.telefono}"`,
      `"${c.email}"`,
      c.monto,
      c.moneda,
      c.fechaVence,
      c.statusConfig.label,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `CobranzaGD_Reporte_${activeProject?.nombre || 'General'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <span>Reportes Financieros</span>
        </h2>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center space-x-1.5 active:scale-95 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* METRICAS PRINCIPALES SEGÚN MODELO DE NEGOCIO */}
      {isSubscription ? (
        <div className="space-y-3">
          {/* CUADROS DE INGRESOS Y REEMBOLSOS DE SUSCRIPCIÓN */}
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-panel px-3 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-400 leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wider truncate">Cobrado Este Mes</span>
                <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 ml-1" />
              </div>
              <p className="text-[17px] font-black text-emerald-400 tracking-tight leading-tight my-1">
                {formatCurrency(stats.cobradoMes || 0)}
              </p>
              <span className="text-[9.5px] text-emerald-300/80 block leading-none">Ingreso neto del mes</span>
            </div>

            <div className="glass-panel px-3 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-indigo-400 leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wider truncate">Total Histórico</span>
                <DollarSign className="w-3.5 h-3.5 flex-shrink-0 ml-1" />
              </div>
              <p className="text-[17px] font-black text-indigo-300 tracking-tight leading-tight my-1">
                {formatCurrency(stats.totalHistorico || 0)}
              </p>
              <span className="text-[9.5px] text-indigo-300/80 block leading-none">Ingresos acumulados</span>
            </div>

            <div className="glass-panel px-3 py-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-400 leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wider truncate">Total Devuelto</span>
                <RotateCcw className="w-3.5 h-3.5 flex-shrink-0 ml-1" />
              </div>
              <p className="text-[17px] font-black text-rose-400 tracking-tight leading-tight my-1">
                {formatCurrency(stats.totalDevuelto || 0)}
              </p>
              <span className="text-[9.5px] text-rose-300/80 block leading-none">Reembolsos procesados</span>
            </div>

            <div className="glass-panel px-3 py-2.5 rounded-xl border border-teal-500/30 bg-teal-950/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-teal-400 leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wider truncate">MRR Recurrente</span>
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 ml-1" />
              </div>
              <p className="text-[17px] font-black text-teal-300 tracking-tight leading-tight my-1">
                {formatCurrency(stats.mrrActivo || 0)}
              </p>
              <span className="text-[9.5px] text-teal-300/80 block leading-none">Suscripciones activas</span>
            </div>
          </div>

          {/* HISTORIAL DE GENERACIÓN POR CADA MES */}
          <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Historial de Generación Mensual</span>
            </h3>

            <div className="space-y-2">
              {stats.ingresosPorMes && stats.ingresosPorMes.length > 0 ? (
                stats.ingresosPorMes.map(m => (
                  <div
                    key={m.mesKey}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block text-sm">{m.mesLabel}</span>
                      <span className="text-[10px] text-slate-400">
                        {m.suscriptores} {m.suscriptores === 1 ? 'movimiento' : 'movimientos'}
                      </span>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="font-black text-emerald-400 text-sm block">
                        Neto: {formatCurrency(m.neto)}
                      </span>
                      <div className="flex items-center justify-end space-x-2 text-[10px]">
                        <span className="text-slate-400">Cobrado: {formatCurrency(m.cobrado)}</span>
                        {m.devuelto > 0 && (
                          <span className="text-rose-400 font-bold">Devuelto: -{formatCurrency(m.devuelto)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Sin historial de ingresos registrado.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* MODELO DE CRÉDITO / PRESTAMOS / PRODUCTOS */
        <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Proyección del Mes
            </span>
            <span className="text-xs font-extrabold text-emerald-400">
              {formatCurrency(stats.proyeccionMes || 0)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[10px] text-slate-400 block">Cobrado / Recuperado</span>
              <span className="text-sm font-extrabold text-emerald-400">
                {formatCurrency(stats.capitalRecuperado || 0)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Pendiente por Cobrar</span>
              <span className="text-sm font-extrabold text-white">
                {formatCurrency(stats.montoPendiente)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ESTADO DE LA CARTERA */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Estado de la Cartera ({clients.length})
        </h3>

        <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-medium">
                {isSubscription ? 'Suscripciones Activas' : 'Al Día'}
              </span>
            </div>
            <span className="font-bold text-white">{stats.alDia} clientes</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-300 font-medium">
                {isSubscription ? 'Suscripciones Vencidas' : 'En Mora'}
              </span>
            </div>
            <span className="font-bold text-rose-400">{stats.enMora} clientes</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span className="text-slate-300 font-medium">Próximos a Vencer (7d)</span>
            </div>
            <span className="font-bold text-sky-300">{stats.proximos} clientes</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <span className="text-slate-300 font-medium">
                {isSubscription ? 'Inactivas / Canceladas' : 'Completados'}
              </span>
            </div>
            <span className="font-bold text-indigo-300">{stats.pagados} clientes</span>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-white">Exportar Base de Datos</h4>
          <p className="text-[11px] text-slate-400">Descarga un reporte Excel/CSV de tus clientes.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center space-x-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </div>
    </div>
  );
}
