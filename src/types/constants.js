export const ACTIVITY_STATUSES = {
  PENDING: {
    id: 'pending',
    label: 'Pendiente',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300',
    color: '#f59e0b',
    iconName: 'Clock'
  },
  IN_PROGRESS: {
    id: 'in_progress',
    label: 'En Progreso',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300',
    color: '#3b82f6',
    iconName: 'PlayCircle'
  },
  COMPLETED: {
    id: 'completed',
    label: 'Completada',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300',
    color: '#10b981',
    iconName: 'CheckCircle2'
  }
};

export const ACTIVITY_TYPES = [
  { 
    id: 'foro', 
    label: 'Foro', 
    icon: 'MessagesSquare', 
    color: '#8b5cf6', 
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' 
  },
  { 
    id: 'actividad_formativa', 
    label: 'Actividad Formativa', 
    icon: 'FileText', 
    color: '#2563eb', 
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' 
  },
  { 
    id: 'examen', 
    label: 'Examen', 
    icon: 'GraduationCap', 
    color: '#e11d48', 
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' 
  },
  { 
    id: 'reunion_sincrona', 
    label: 'Reunión Síncrona', 
    icon: 'Video', 
    color: '#059669', 
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' 
  }
];

export const DEFAULT_TETRAS = [];
export const DEFAULT_SUBJECTS = [];

