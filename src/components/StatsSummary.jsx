import React from 'react';
import { 
  BookOpen, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { parseISO, isPast } from 'date-fns';

export const StatsSummary = ({ activities = [], onFilterStatus, activeStatusFilter }) => {
  const total = activities.length;
  const pending = activities.filter(a => a.status === 'pending').length;
  const inProgress = activities.filter(a => a.status === 'in_progress').length;
  const completed = activities.filter(a => a.status === 'completed').length;
  
  const overdueOrSoon = activities.filter(a => {
    if (a.status === 'completed' || !a.dueDate) return false;
    try {
      return isPast(parseISO(a.dueDate));
    } catch {
      return false;
    }
  }).length;

  const totalAttachments = activities.reduce((acc, curr) => acc + (curr.attachments?.length || 0), 0);

  const stats = [
    {
      id: 'all',
      label: 'Total Actividades',
      value: total,
      sublabel: `${totalAttachments} documentos adjuntos`,
      icon: BookOpen,
      color: 'from-blue-600 to-indigo-600',
      bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
      filterValue: 'all'
    },
    {
      id: 'pending',
      label: 'Pendientes',
      value: pending,
      sublabel: 'Por iniciar',
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
      filterValue: 'pending'
    },
    {
      id: 'in_progress',
      label: 'En Progreso',
      value: inProgress,
      sublabel: 'En desarrollo',
      icon: PlayCircle,
      color: 'from-blue-500 to-cyan-500',
      bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
      filterValue: 'in_progress'
    },
    {
      id: 'completed',
      label: 'Completadas',
      value: completed,
      sublabel: 'Entregadas / Listas',
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      filterValue: 'completed'
    },
    {
      id: 'overdue',
      label: 'Vencidas',
      value: overdueOrSoon,
      sublabel: 'Requieren atención',
      icon: AlertTriangle,
      color: 'from-rose-500 to-red-600',
      bgLight: 'bg-rose-50 text-rose-700 border-rose-200',
      filterValue: 'overdue'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 mb-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const isActive = activeStatusFilter === stat.filterValue;
        const isLastOnMobile = idx === 4;

        return (
          <button
            key={stat.id}
            onClick={() => onFilterStatus && onFilterStatus(stat.filterValue)}
            className={`flex flex-col text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 active:scale-[0.98] ${
              isLastOnMobile ? 'col-span-2 sm:col-span-1' : ''
            } ${
              isActive 
                ? 'ring-2 ring-blue-500 ring-offset-2 bg-white shadow-md' 
                : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5 sm:mb-2">
              <span className="text-xs font-semibold text-slate-500 truncate">
                {stat.label}
              </span>
              <div className={`p-1.5 rounded-xl border ${stat.bgLight}`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {stat.value}
              </span>
            </div>

            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 truncate">
              {stat.sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default StatsSummary;
