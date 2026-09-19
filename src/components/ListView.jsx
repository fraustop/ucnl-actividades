import React, { useState } from 'react';
import { ArrowUpDown, Calendar, BookOpen, AlertCircle, Plus } from 'lucide-react';
import ActivityCard from './ActivityCard';
import { useAuth } from '../context/AuthContext';
import { compareActivitiesByDueDate } from '../utils/dateUtils';

export const ListView = ({
  activities = [],
  onViewDetails,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenNewActivity,
  isStudent = false,
  studentCompletions = {},
  onToggleStudentCompletion,
  onSetPersonalStatus,
  selectedActivity = null
}) => {
  const { isAdmin } = useAuth();
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate', 'subject', 'title'

  const sortedActivities = [...activities].sort((a, b) => {
    if (sortBy === 'dueDate') {
      return compareActivitiesByDueDate(a, b);
    }
    if (sortBy === 'subject') {
      return (a.subject || '').localeCompare(b.subject || '');
    }
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No se encontraron actividades</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          No hay actividades que coincidan con los filtros aplicados o aún no se han registrado tareas.
        </p>
        {isAdmin && onOpenNewActivity && (
          <button
            onClick={onOpenNewActivity}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-2xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Crear la primera actividad</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-3 min-h-0">
      {/* Controles de ordenamiento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 px-1 flex-shrink-0">
        <span className="font-semibold text-slate-600">
          Mostrando {activities.length} {activities.length === 1 ? 'actividad' : 'actividades'}
        </span>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="font-medium whitespace-nowrap">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 sm:flex-none bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs text-xs"
          >
            <option value="dueDate">Fecha de Entrega (Próxima)</option>
            <option value="subject">Materia / Asignatura</option>
            <option value="title">Título alfabético</option>
          </select>
        </div>
      </div>

      {/* Grid de Tarjetas Full-Width Desplazable */}
      <div className="flex-1 overflow-y-auto touch-scroll min-h-0 pr-1 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {sortedActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              isStudent={isStudent}
              studentCompletions={studentCompletions}
              onToggleStudentCompletion={onToggleStudentCompletion}
              onSetPersonalStatus={onSetPersonalStatus}
              selectedActivity={selectedActivity}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListView;
