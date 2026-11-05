'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Project,
  Client,
  EnrichedClient,
  DashboardStats,
  DriveSyncStatus,
  SubscriptionPlan,
  CreditProduct,
  Cuota,
} from '../types';
import {
  getLocalProjects,
  saveLocalProjects,
  getLocalClients,
  saveLocalClients,
  clearAllLocalState,
} from '../lib/sheets';
import {
  enrichClient,
  calculateDashboardStats,
  addSubscriptionPeriods,
  subtractSubscriptionPeriods,
  calculateDaysRemaining,
} from '../lib/clients';
import type { SubscriptionTransaction } from '../types';
import { checkAndLoadUserDriveStorage, syncExcelSpreadsheetToDrive } from '../lib/drive';

interface ProjectsContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (proj: Project) => void;
  clients: EnrichedClient[];
  allClients: EnrichedClient[];
  stats: DashboardStats;
  syncStatus: DriveSyncStatus;
  isCheckingDrive: boolean;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  addClient: (clientData: Omit<Client, 'id' | 'fechaRegistro'>) => Promise<boolean>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<boolean>;
  registerPayment: (clientId: string, cuotaId?: string | string[], monto?: number, notas?: string) => Promise<boolean>;
  renewSubscription: (clientId: string, periodos: number, montoTotal: number, notas?: string) => Promise<boolean>;
  refundSubscription: (clientId: string, periodos: number, montoDevuelto: number, notas?: string) => Promise<boolean>;
  archiveClient: (id: string) => Promise<boolean>;
  reactivateClient: (id: string) => Promise<boolean>;
  addProject: (nombre: string, tipo: 'credito' | 'unico' | 'suscripcion') => Promise<Project>;
  addSubscriptionPlan: (projectId: string, plan: Omit<SubscriptionPlan, 'id'>) => Promise<boolean>;
  addCreditProduct: (projectId: string, product: Omit<CreditProduct, 'id' | 'proyectoId'>) => Promise<boolean>;
  deleteCreditProduct: (projectId: string, productId: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
  clearAllData: () => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [rawClients, setRawClients] = useState<Client[]>([]);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<DriveSyncStatus>('local_only');
  const [isCheckingDrive, setIsCheckingDrive] = useState<boolean>(false);

  useEffect(() => {
    const loadedProjects = getLocalProjects();
    const loadedClients = getLocalClients();
    setProjects(loadedProjects);
    if (loadedProjects.length > 0) {
      setActiveProject(loadedProjects[0]);
    }
    setRawClients(loadedClients);

    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('cgd_drive_token');
      if (storedToken) {
        handleSetAccessToken(storedToken);
      }
    }
  }, []);

  const handleSetAccessToken = async (token: string | null) => {
    setAccessTokenState(token);
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('cgd_drive_token', token);
      } else {
        localStorage.removeItem('cgd_drive_token');
        localStorage.removeItem('cgd_drive_email');
        localStorage.removeItem('cgd_user_authorized');
        localStorage.removeItem('cgd_excel_url');
        localStorage.removeItem('cgd_docs_folder_url');
        sessionStorage.removeItem('cgd_is_demo');
      }
    }

    if (token) {
      setIsCheckingDrive(true);
      try {
        const driveInfo = await checkAndLoadUserDriveStorage(token);

        if (driveInfo.isUnauthorized) {
          console.warn('[Cobranza GD] Stale or expired Drive token detected (401). Resetting session.');
          setAccessTokenState(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cgd_drive_token');
            localStorage.removeItem('cgd_drive_email');
            localStorage.removeItem('cgd_user_authorized');
            localStorage.removeItem('cgd_excel_url');
            localStorage.removeItem('cgd_docs_folder_url');
          }
          const localProjs = getLocalProjects();
          if (localProjs.length > 0) {
            setProjects(localProjs);
            setActiveProject(localProjs[0]);
          }
          setSyncStatus('local_only');
          return;
        }

        const projs = driveInfo.projects;
        if (projs && projs.length > 0) {
          setProjects(projs);
          setActiveProject(prev => {
            if (prev && projs.some(p => p.id === prev.id)) {
              return projs.find(p => p.id === prev.id) || projs[0];
            }
            return projs[0];
          });
          setRawClients(driveInfo.clients || []);
          saveLocalProjects(projs);
          saveLocalClients(driveInfo.clients || []);
          setSyncStatus('synced');

          if (typeof window !== 'undefined') {
            if (driveInfo.spreadsheetUrl) localStorage.setItem('cgd_excel_url', driveInfo.spreadsheetUrl);
            if (driveInfo.docsFolderUrl) localStorage.setItem('cgd_docs_folder_url', driveInfo.docsFolderUrl);
          }
        } else {
          const localProjs = getLocalProjects();
          if (localProjs.length > 0) {
            setProjects(localProjs);
            setActiveProject(localProjs[0]);
          }
          setSyncStatus('synced');
        }
      } catch (err) {
        console.error('Error auto-syncing Drive storage on setAccessToken:', err);
        setSyncStatus('error');
      } finally {
        setIsCheckingDrive(false);
      }
    } else {
      setSyncStatus('local_only');
    }
  };

  const safeSyncDrive = async (token: string, clientsToSync: Client[], projectsToSync: Project[]) => {
    try {
      await syncExcelSpreadsheetToDrive(token, clientsToSync, projectsToSync);
    } catch (err: any) {
      if (err?.message === 'UNAUTHENTICATED' || err?.status === 401) {
        console.warn('[Cobranza GD] Drive token expired during sync operation. Resetting session.');
        await handleSetAccessToken(null);
      }
    }
  };

  const addClient = async (clientData: Omit<Client, 'id' | 'fechaRegistro'>): Promise<boolean> => {
    const newClientId = `c-${Date.now()}`;
    const targetProject = projects.find(p => p.id === clientData.proyectoId);

    let configObj = { ...(clientData.config || {}) };
    if (targetProject?.tipo === 'suscripcion') {
      const initialTx: SubscriptionTransaction = {
        id: `tx-${Date.now()}`,
        clienteId: newClientId,
        fecha: clientData.fechaInicio || new Date().toISOString().split('T')[0],
        tipo: 'pago',
        periodos: 1,
        monto: clientData.monto,
        moneda: clientData.moneda,
        notas: 'Alta de suscripción e ingreso inicial',
      };
      configObj.transacciones = [initialTx];
    }

    const newClient: Client = {
      ...clientData,
      id: newClientId,
      config: configObj,
      fechaRegistro: new Date().toISOString().split('T')[0],
      identificacion: clientData.identificacion || clientData.cedula || '',
    };
    const updated = [newClient, ...rawClients];
    setRawClients(updated);
    saveLocalClients(updated);

    const tokenToUse =
      accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('cgd_drive_token') : null);

    if (tokenToUse) {
      await safeSyncDrive(tokenToUse, updated, projects);
    }
    return true;
  };

  const updateClient = async (id: string, updates: Partial<Client>): Promise<boolean> => {
    const updated = rawClients.map(c => (c.id === id ? { ...c, ...updates } : c));
    setRawClients(updated);
    saveLocalClients(updated);

    const tokenToUse =
      accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('cgd_drive_token') : null);

    if (tokenToUse) {
      await safeSyncDrive(tokenToUse, updated, projects);
    }
    return true;
  };

  const registerPayment = async (
    clientId: string,
    cuotaId?: string | string[],
    monto?: number,
    notas?: string
  ): Promise<boolean> => {
    const target = rawClients.find(c => c.id === clientId);
    if (!target) return false;

    // ── PAGO ÚNICO (sin cuotas / sin vencimiento): manejar abono / cancelación directa ──
    const isUnicoModel =
      target.frecuencia === 'unico' ||
      activeProject?.tipo === 'unico' ||
      (target as any).estadoCalc === 'u_deudor' ||
      (target as any).estadoCalc === 'u_a_favor' ||
      (target as any).estadoCalc === 'u_cero';

    if (isUnicoModel) {
      const paymentMonto = monto !== undefined ? monto : 0;
      const deudaActual = target.config?.deudaRestante !== undefined ? target.config.deudaRestante : (target.monto || 0);
      const newDeuda = Math.max(0, parseFloat((deudaActual - paymentMonto).toFixed(2)));
      const allPaidUnico = newDeuda <= 0;

      const notaPago = `[${new Date().toLocaleDateString()}] Pago registrado - Monto: $${paymentMonto.toFixed(2)}${notas ? ` - ${notas}` : ''}`;
      const notasActualizadas = target.notas ? `${target.notas}\n${notaPago}` : notaPago;

      return await updateClient(clientId, {
        planPagos: [],
        estado: allPaidUnico ? 'pagado' : target.estado,
        config: {
          ...(target.config || {}),
          deudaRestante: newDeuda,
        },
        notas: notasActualizadas,
      });
    }

    let updatedPlan = target.planPagos ? [...target.planPagos] : [];

    // Fallback if client did not have planPagos stored yet (sólo para crédito)
    if (updatedPlan.length === 0 && (target.monto || 0) > 0) {
      const meses = target.config?.plazoMeses || 6;
      let totalCuotas = meses;
      if (target.frecuencia === 'semanal') totalCuotas = meses * 4;
      else if (target.frecuencia === 'quincenal') totalCuotas = meses * 2;

      const montoPorCuota = parseFloat(((target.monto || 0) / totalCuotas).toFixed(2));
      const autoCuotas: Cuota[] = [];
      let cur = new Date((target.fechaInicio || target.fechaVence || new Date().toISOString().split('T')[0]) + 'T12:00:00');

      for (let i = 1; i <= totalCuotas; i++) {
        if (target.frecuencia === 'semanal') cur.setDate(cur.getDate() + 7);
        else if (target.frecuencia === 'quincenal') cur.setDate(cur.getDate() + 15);
        else if (target.frecuencia === 'anual') cur.setFullYear(cur.getFullYear() + 1);
        else cur.setMonth(cur.getMonth() + 1);

        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');

        autoCuotas.push({
          id: `cuota-${i}`,
          fecha: `${y}-${m}-${d}`,
          monto: montoPorCuota,
          estado: 'pendiente',
          descripcion: `Cuota ${i} de ${totalCuotas}`,
        });
      }
      updatedPlan = autoCuotas;
    }

    const paymentMonto = monto !== undefined ? monto : 0;
    const cuotaIdList: string[] = Array.isArray(cuotaId) ? cuotaId : (cuotaId ? [cuotaId] : []);

    // Check if exact matching cuotas were selected
    const selectedCuotasSum = updatedPlan
      .filter(c => cuotaIdList.includes(c.id))
      .reduce((sum, c) => sum + c.monto, 0);

    if (cuotaIdList.length > 0 && Math.abs(paymentMonto - selectedCuotasSum) < 0.05) {
      // Mark all specified cuotas as paid
      updatedPlan = updatedPlan.map(cuota =>
        cuotaIdList.includes(cuota.id) ? { ...cuota, estado: 'pagado' } : cuota
      );
    } else if (paymentMonto > 0) {
      // Custom amount / Abono Libre: Waterfall application from first pending cuota downwards
      let remainingToApply = paymentMonto;
      updatedPlan = updatedPlan.map(cuota => {
        if (cuota.estado === 'pagado') return cuota;
        if (remainingToApply <= 0) return cuota;

        if (remainingToApply >= cuota.monto - 0.005) {
          // Fully pays this cuota
          remainingToApply = Math.max(0, remainingToApply - cuota.monto);
          return { ...cuota, estado: 'pagado' };
        } else {
          // Partially pays this cuota (reduces the pending amount)
          const newCuotaMonto = parseFloat((cuota.monto - remainingToApply).toFixed(2));
          remainingToApply = 0;
          return {
            ...cuota,
            monto: newCuotaMonto,
            descripcion: cuota.descripcion?.includes('(Abonado)')
              ? cuota.descripcion
              : `${cuota.descripcion || 'Cuota'} (Abonado)`,
          };
        }
      });
    } else if (cuotaIdList.length > 0) {
      updatedPlan = updatedPlan.map(cuota =>
        cuotaIdList.includes(cuota.id) ? { ...cuota, estado: 'pagado' } : cuota
      );
    }

    const allPaid = updatedPlan.length > 0 && updatedPlan.every(c => c.estado === 'pagado');
    const nextPending = updatedPlan.find(c => c.estado === 'pendiente');

    const notaPago = `[${new Date().toLocaleDateString()}] Pago registrado - Monto: $${paymentMonto.toFixed(2)}${notas ? ` - ${notas}` : ''}`;
    const notasActualizadas = target.notas ? `${target.notas}\n${notaPago}` : notaPago;

    return await updateClient(clientId, {
      planPagos: updatedPlan,
      fechaVence: nextPending ? nextPending.fecha : target.fechaVence,
      estado: allPaid ? 'pagado' : target.estado,
      notas: notasActualizadas,
    });
  };

  const renewSubscription = async (
    clientId: string,
    periodos: number,
    montoTotal: number,
    notas?: string
  ): Promise<boolean> => {
    const target = rawClients.find(c => c.id === clientId);
    if (!target) return false;

    const nuevaFechaVence = addSubscriptionPeriods(target.fechaVence, target.frecuencia, periodos);

    const renewalTx: SubscriptionTransaction = {
      id: `tx-${Date.now()}`,
      clienteId: target.id,
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'renovacion',
      periodos,
      monto: montoTotal,
      moneda: target.moneda,
      notas: notas || `Renovación de ${periodos} período/s`,
    };
    const updatedTxs = [...(target.config?.transacciones || []), renewalTx];

    const notaRenovacion = `[${new Date().toLocaleDateString()}] Renovación de plan (${periodos} período/s) - Total: $${montoTotal.toFixed(2)}${notas ? ` - ${notas}` : ''}`;
    const notasActualizadas = target.notas ? `${target.notas}\n${notaRenovacion}` : notaRenovacion;

    return await updateClient(clientId, {
      fechaVence: nuevaFechaVence,
      estado: 's_activo',
      notas: notasActualizadas,
      config: {
        ...(target.config || {}),
        transacciones: updatedTxs,
      },
    });
  };

  const refundSubscription = async (
    clientId: string,
    periodos: number,
    montoDevuelto: number,
    notas?: string
  ): Promise<boolean> => {
    const target = rawClients.find(c => c.id === clientId);
    if (!target) return false;

    const nuevaFechaVence = subtractSubscriptionPeriods(target.fechaVence, target.frecuencia, periodos);

    const refundTx: SubscriptionTransaction = {
      id: `tx-${Date.now()}`,
      clienteId: target.id,
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'devolucion',
      periodos,
      monto: Math.abs(montoDevuelto),
      moneda: target.moneda,
      notas: notas || 'Devolución / Reembolso de pago',
    };
    const updatedTxs = [...(target.config?.transacciones || []), refundTx];

    const notaDevolucion = `[${new Date().toLocaleDateString()}] REEMBOLSO/DEVOLUCIÓN (-${periodos} período/s) - Monto devuelto: $${Math.abs(montoDevuelto).toFixed(2)}${notas ? ` - Motivo: ${notas}` : ''}`;
    const notasActualizadas = target.notas ? `${target.notas}\n${notaDevolucion}` : notaDevolucion;

    const diasRem = calculateDaysRemaining(nuevaFechaVence);
    const nuevoEstado = diasRem < 0 ? 's_vencido' : 's_activo';

    return await updateClient(clientId, {
      fechaVence: nuevaFechaVence,
      estado: nuevoEstado,
      notas: notasActualizadas,
      config: {
        ...(target.config || {}),
        transacciones: updatedTxs,
      },
    });
  };

  const archiveClient = async (id: string): Promise<boolean> => {
    return await updateClient(id, { estado: 'archivado' });
  };

  const reactivateClient = async (id: string): Promise<boolean> => {
    return await updateClient(id, { estado: 'activo' });
  };

  const addProject = async (nombre: string, tipo: 'credito' | 'unico' | 'suscripcion'): Promise<Project> => {
    const newProj: Project = {
      id: `p-${Date.now()}`,
      nombre,
      tipo,
      fechaRegistro: new Date().toISOString().split('T')[0],
      productosCredito: [],
    };
    const updated = [...projects, newProj];
    setProjects(updated);
    saveLocalProjects(updated);
    setActiveProject(newProj);

    const tokenToUse =
      accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('cgd_drive_token') : null);

    if (tokenToUse) {
      await safeSyncDrive(tokenToUse, rawClients, updated);
    }
    return newProj;
  };

  const addSubscriptionPlan = async (projectId: string, plan: Omit<SubscriptionPlan, 'id'>): Promise<boolean> => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        const plans = p.planesSuscripcion || [];
        return {
          ...p,
          planesSuscripcion: [...plans, { ...plan, id: `plan-${Date.now()}` }],
        };
      }
      return p;
    });
    setProjects(updated);
    saveLocalProjects(updated);
    const activeUpdated = updated.find(p => p.id === activeProject?.id);
    if (activeUpdated) setActiveProject(activeUpdated);

    const tokenToUse =
      accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('cgd_drive_token') : null);

    if (tokenToUse) {
      await safeSyncDrive(tokenToUse, rawClients, updated);
    }
    return true;
  };

  const addCreditProduct = async (
    projectId: string,
    product: Omit<CreditProduct, 'id' | 'proyectoId'>
  ): Promise<boolean> => {
    const newProd: CreditProduct = {
      ...product,
      id: `prod-${Date.now()}`,
      proyectoId: projectId,
      fechaRegistro: new Date().toISOString().split('T')[0],
    };

    const updated = projects.map(p => {
      if (p.id === projectId) {
        const prods = p.productosCredito || [];
        return {
          ...p,
          productosCredito: [...prods, newProd],
        };
      }
      return p;
    });

    setProjects(updated);
    saveLocalProjects(updated);
    const activeUpdated = updated.find(p => p.id === activeProject?.id);
    if (activeUpdated) setActiveProject(activeUpdated);

    const tokenToUse =
      accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('cgd_drive_token') : null);

    if (tokenToUse) {
      await safeSyncDrive(tokenToUse, rawClients, updated);
    }
    return true;
  };

  const deleteCreditProduct = async (projectId: string, productId: string): Promise<boolean> => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        const prods = p.productosCredito || [];
        return {
          ...p,
          productosCredito: prods.filter(item => item.id !== productId),
        };
      }
      return p;
    });

    setProjects(updated);
    saveLocalProjects(updated);
    const activeUpdated = updated.find(p => p.id === activeProject?.id);
    if (activeUpdated) setActiveProject(activeUpdated);

    const tokenToUse =
      accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('cgd_drive_token') : null);

    if (tokenToUse) {
      await safeSyncDrive(tokenToUse, rawClients, updated);
    }
    return true;
  };

  const refreshData = async () => {
    if (!accessToken) return;
    setSyncStatus('syncing');
    setIsCheckingDrive(true);
    try {
      const driveInfo = await checkAndLoadUserDriveStorage(accessToken);
      if (driveInfo.isUnauthorized) {
        console.warn('[Cobranza GD] Token expired on refresh. Resetting auth state.');
        await handleSetAccessToken(null);
        setSyncStatus('local_only');
        return;
      }
      const projs = driveInfo.projects;
      if (projs && projs.length > 0) {
        setProjects(projs);
        setActiveProject(prev => {
          if (prev && projs.some(p => p.id === prev.id)) {
            return projs.find(p => p.id === prev.id) || projs[0];
          }
          return projs[0];
        });
        setRawClients(driveInfo.clients || []);
        saveLocalProjects(projs);
        saveLocalClients(driveInfo.clients || []);
        setSyncStatus('synced');
      } else {
        setSyncStatus('synced');
      }
    } catch (err) {
      console.error('Error refreshing Drive data:', err);
      setSyncStatus('error');
    } finally {
      setIsCheckingDrive(false);
    }
  };

  const clearAllData = () => {
    clearAllLocalState();
    setProjects([]);
    setActiveProject(null);
    setRawClients([]);
    setSyncStatus('local_only');
  };

  const activeProjectId = activeProject?.id;
  const filteredRawClients = activeProjectId
    ? rawClients.filter(c => c.proyectoId === activeProjectId)
    : rawClients;

  const clients: EnrichedClient[] = filteredRawClients.map(c => enrichClient(c, activeProject?.tipo, projects));
  const allClients: EnrichedClient[] = rawClients.map(c => {
    const proj = projects.find(p => p.id === c.proyectoId);
    return enrichClient(c, proj?.tipo || activeProject?.tipo, projects);
  });
  const stats = calculateDashboardStats(clients, activeProject?.tipo || 'credito');

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        activeProject,
        setActiveProject,
        clients,
        allClients,
        stats,
        syncStatus,
        isCheckingDrive,
        accessToken,
        setAccessToken: handleSetAccessToken,
        addClient,
        updateClient,
        registerPayment,
        renewSubscription,
        refundSubscription,
        archiveClient,
        reactivateClient,
        addProject,
        addSubscriptionPlan,
        addCreditProduct,
        deleteCreditProduct,
        refreshData,
        clearAllData,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}
