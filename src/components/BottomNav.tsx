'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProjects } from '../context/ProjectsContext';
import { LayoutDashboard, Users, Zap, BarChart3, Plus, Package, ShoppingBag } from 'lucide-react';

interface BottomNavProps {
  onQuickAction?: () => void;
}

export function BottomNav({ onQuickAction }: BottomNavProps) {
  const pathname = usePathname();
  const { activeProject } = useProjects();

  const getCatalogTab = () => {
    if (activeProject?.tipo === 'credito') {
      return { label: 'Productos', href: '/plans', icon: Package };
    }
    if (activeProject?.tipo === 'unico') {
      return { label: 'Catálogo', href: '/plans', icon: ShoppingBag };
    }
    return { label: 'Planes', href: '/plans', icon: Zap };
  };

  const navItems = [
    { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Clientes', href: '/clients', icon: Users },
    getCatalogTab(),
    { label: 'Reportes', href: '/reports', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1322] border-t border-slate-800 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {navItems.slice(0, 2).map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={onQuickAction}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-all border-2 border-[#0d1322]"
            aria-label="Nuevo Cobro / Cliente"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>
        </div>

        {navItems.slice(2).map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
