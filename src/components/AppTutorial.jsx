import React, { useState, useEffect } from 'react';
import { 
  X, 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Calendar, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Bell, 
  BellRing, 
  MessageSquare, 
  FileText, 
  Download, 
  Eye, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  ExternalLink,
  ChevronRight,
  Wifi,
  WifiOff,
  HelpCircle,
  Play,
  FileSpreadsheet,
  Send,
  SlidersHorizontal,
  Laptop,
  CheckCircle,
  FolderOpen,
  Filter,
  Maximize2
} from 'lucide-react';

// ==========================================
// MÓDULOS DEL TUTORIAL (100% ESTUDIANTES)
// ==========================================
export const STUDENT_TUTORIAL_MODULES = [
  {
    id: 'student-access',
    number: '1',
    title: 'Acceso y Perfil de Estudiante',
    shortTitle: '1. Acceso y Perfil',
    icon: ShieldCheck,
    color: 'from-blue-600 to-indigo-600',
    description: 'Inicio de sesión institucional, selector de tetramestre y registro seguro de tu dispositivo.',
    summary: 'Aprende a ingresar al portal de actividades de la Universidad Ciudadana de Nuevo León, vincular tus dispositivos de forma segura y filtrar únicamente las materias que estás cursando.',
    features: [
      {
        title: 'Inicio de Sesión Seguro',
        badge: 'Google & Correo Institucional',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        text: 'Inicia sesión con un solo clic utilizando tu cuenta institucional de Google o tus credenciales autorizadas. El sistema te asigna de forma automática tu rol de Estudiante.'
      },
      {
        title: 'Selección de Tetramestre',
        badge: 'Personalización',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        text: 'Filtra tus actividades seleccionando tu tetramestre actual en la barra superior. Verás únicamente las asignaturas y tareas que estás cursando en este periodo.'
      },
      {
        title: 'Registro Transparente de Dispositivos',
        badge: 'Celular / PC',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        text: 'Al ingresar, la plataforma registra tu celular, tablet o computadora para mantener tu sesión activa y habilitar la recepción de notificaciones push personalizadas.'
      }
    ]
  },
  {
    id: 'kanban-views',
    number: '2',
    title: 'Tablero Kanban y Modos de Vista',
    shortTitle: '2. Tablero y Vistas',
    icon: Layers,
    color: 'from-indigo-600 to-purple-600',
    description: 'Gestión por columnas de estado (Pendientes, En Proceso, Terminadas), Lista y Calendario.',
    summary: 'Organiza y visualiza tus entregas escolares con 3 formatos interactivos diseñados para adaptarse a tu ritmo de estudio.',
    features: [
      {
        title: 'Tablero Kanban (3 Columnas)',
        badge: 'Vista Principal',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        text: 'Tus tareas se organizan en "📋 Pendientes", "⚡ En Proceso" y "✅ Terminadas". Mueve de columna cualquier actividad con los botones de acción rápida en cada tarjeta.'
      },
      {
        title: 'Vista de Lista Detallada',
        badge: 'Compacta',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        text: 'Visualiza todas tus materias en una tabla ordenada por fecha de vencimiento más próxima, con acceso directo a los recursos de cada actividad.'
      },
      {
        title: 'Calendario Escolar Mensual',
        badge: 'Planificación',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        text: 'Ubica cada fecha límite en un calendario mensual interactivo para planificar semanas de entregas y exámenes con suficiente anticipación.'
      }
    ]
  },
  {
    id: 'urgency-filters',
    number: '3',
    title: 'Semáforo de Urgencia y Búsqueda',
    shortTitle: '3. Semáforo y Filtros',
    icon: Search,
    color: 'from-emerald-600 to-teal-600',
    description: 'Identificación visual por colores según días restantes y buscador instantáneo de tareas.',
    summary: 'Prioriza tu tiempo con el sistema de semáforo que clasifica automáticamente cada tarea según la proximidad de su fecha límite de entrega.',
    features: [
      {
        title: '🟢 Nivel Verde (Tranquilo)',
        badge: 'Más de 7 Días',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        text: 'Tienes más de una semana de margen. Es el momento perfecto para leer las instrucciones, consultar los materiales de apoyo y formular tus primeras dudas.'
      },
      {
        title: '🟡 Nivel Amarillo (Atención)',
        badge: '4 a 6 Días',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        text: 'El plazo se acerca. Te recomendamos avanzar con el desarrollo de tu entrega y resolver dudas puntuales con tu docente en el chat privado.'
      },
      {
        title: '🔴 Nivel Rojo (Urgente / Inminente)',
        badge: '3 Días o Menos',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        text: 'Plazo crítico. Incluye etiquetas llamativas de "Vence hoy" o "Vence mañana" para asegurar tu envío antes del cierre de plataforma.'
      }
    ]
  },
  {
    id: 'workspace-viewer',
    number: '4',
    title: 'Espacio de Trabajo y Visor de Recursos',
    shortTitle: '4. Visor de Recursos',
    icon: BookOpen,
    color: 'from-blue-700 to-cyan-700',
    description: 'Instrucciones completas y visor integrado para PDF, Word, Excel, PowerPoint y Videos.',
    summary: 'Accede a un entorno de estudio unificado donde puedes revisar consignas y abrir archivos adjuntos sin salir de la aplicación ni descargar programas adicionales.',
    features: [
      {
        title: 'Visor Integrado Multiformato',
        badge: 'PDF, Office, Video',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        text: 'Visualiza directamente documentos en PDF, Word (.docx), hojas de Excel (.xlsx), presentaciones de PowerPoint (.pptx) y videos de YouTube o Google Drive.'
      },
      {
        title: 'Descarga con 1 Clic',
        badge: 'Archivos Locales',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        text: 'Si prefieres trabajar sin conexión, descarga cualquier rúbrica, lectura o formato de trabajo a tu dispositivo en segundos.'
      },
      {
        title: 'Instrucciones y Rúbricas Claras',
        badge: 'Detalles de Entrega',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        text: 'Consulta la descripción paso a paso, los criterios de evaluación y los enlaces recomendados por tu docente en un solo panel organizado.'
      }
    ]
  },
  {
    id: 'private-chat',
    number: '5',
    title: 'Hilo Privado de Dudas con el Docente',
    shortTitle: '5. Dudas con Docente',
    icon: MessageSquare,
    color: 'from-purple-600 to-pink-600',
    description: 'Chat individual 1-a-1 por actividad con medidor de capacidad y respuestas en tiempo real.',
    summary: 'Comunícate de manera directa y confidencial con tu profesor para resolver cualquier inquietud sobre la tarea sin que otros alumnos lean tu conversación.',
    features: [
      {
        title: 'Privacidad Absoluta (1-a-1)',
        badge: 'Canal Individual',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        text: 'Cada estudiante tiene su propio hilo independiente por cada actividad. Tus preguntas y las respuestas de tu docente son 100% privadas.'
      },
      {
        title: 'Medidor de Capacidad Inteligente (1 MB)',
        badge: 'Optimización',
        badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
        text: 'El chat incluye un medidor en tiempo real del tamaño de los mensajes para garantizar una carga ultrarrápida (1 MB rinde para miles de mensajes).'
      },
      {
        title: 'Respuestas en Tiempo Real',
        badge: 'Notificación Inmediata',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        text: 'Cuando tu profesor responde a tus dudas, recibes una notificación al instante y el mensaje aparece reflejado de inmediato en el historial.'
      }
    ]
  },
  {
    id: 'push-notifications',
    number: '6',
    title: 'Notificaciones Push y Resumen Diario',
    shortTitle: '6. Notificaciones Push',
    icon: BellRing,
    color: 'from-rose-600 to-red-600',
    description: 'Resumen diario a las 08:00 AM, alertas con app cerrada y descarte de tareas terminadas.',
    summary: 'Recibe avisos oportunos de tus entregas directamente en tu celular o computadora, incluso si tienes la aplicación cerrada.',
    features: [
      {
        title: 'Resumen Diario Matutino (08:00 AM)',
        badge: 'Consolidado',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        text: 'Cada mañana a las 08:00 AM recibes una sola notificación con el conteo exacto de tareas pendientes que vencen en los siguientes 7 días, evitando el spam.'
      },
      {
        title: 'Recepción con la App Cerrada (FCM)',
        badge: 'Web Push en Segundo Plano',
        badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
        text: 'Las notificaciones push llegan al centro de notificaciones de Windows, Android, Mac o iOS a través de Firebase Cloud Messaging.'
      },
      {
        title: 'Descarte Automático de Tareas Terminadas',
        badge: 'Sin Alertas Inútiles',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        text: 'En el momento en que marcas una tarea como "Terminada", el sistema la elimina de futuros recordatorios para que solo te enfoques en lo pendiente.'
      }
    ]
  },
  {
    id: 'pwa-offline-mode',
    number: '7',
    title: 'Instalación PWA y Modo Sin Conexión',
    shortTitle: '7. PWA y Offline',
    icon: Smartphone,
    color: 'from-teal-600 to-emerald-700',
    description: 'Instala la aplicación en tu celular o PC y consulta tus actividades sin conexión a internet.',
    summary: 'Convierte UCNL Actividades en una aplicación nativa en tu pantalla de inicio y accede a tus tareas guardadas en cualquier momento.',
    features: [
      {
        title: 'Instalación en Computadora (PC / Mac)',
        badge: 'Chrome / Edge',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        text: 'Haz clic en el icono de instalación en la barra de direcciones del navegador para crear un acceso directo en tu escritorio e inicio de Windows/macOS.'
      },
      {
        title: 'Instalación en Celular (Android / iOS)',
        badge: 'Pantalla de Inicio',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        text: 'En Android pulsa el banner "Instalar App" o menú de 3 puntos. En iPhone abre en Safari y pulsa Compartir → "Agregar al inicio".'
      },
      {
        title: 'Modo Offline Automático (IndexedDB)',
        badge: 'Sin Internet',
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        text: 'Todas tus actividades se guardan en la memoria local. Si estás de viaje o sin cobertura, puedes abrir la app y consultar tus tareas y lecturas.'
      }
    ]
  }
];

// =========================================================================
// COMPONENTES DE MAQUETAS INTERACTIVAS / CAPTURAS DE PANTALLA DE LA APP
// =========================================================================

// Mockup 1: Acceso y Perfil de Estudiante
const MockupAcceso = () => (
  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-2xl space-y-4">
    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-rose-500/80" />
        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="text-[11px] font-mono text-slate-400 ml-2">https://ucnl-actividades.web.app</span>
      </div>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        SSL 256-bit Seguro
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold border border-blue-500/30">
          <GraduationCap className="w-4 h-4" />
          <span>Universidad Ciudadana de NL</span>
        </div>
        <h4 className="text-base sm:text-lg font-extrabold text-white">
          Bienvenido al Portal Escolar
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Ingresa con tu cuenta institucional para sincronizar tus materias, tareas y recordatorios diarios.
        </p>
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Rol asignado:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Estudiante
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Tetramestre activo:</span>
            <span className="font-bold text-indigo-300">4to Tetramestre</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-indigo-900/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
            JP
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">Juan Pérez (Estudiante)</p>
            <p className="text-[11px] text-slate-400 truncate">juan.perez@alumno.ucnl.edu.mx</p>
          </div>
        </div>

        <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400 font-semibold">
            <span className="flex items-center gap-1"><Laptop className="w-3.5 h-3.5 text-blue-400" /> Dispositivo Vinculado</span>
            <span className="text-emerald-400 font-bold">Activo</span>
          </div>
          <p className="text-slate-400 text-[10px]">Laptop Windows 11 • Navegador Chrome</p>
        </div>

        <div className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold text-center shadow-md">
          Ingresar al Tablero de Tareas →
        </div>
      </div>
    </div>
  </div>
);

// Mockup 2: Tablero Kanban & Vistas
const MockupKanban = () => (
  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-2xl space-y-4">
    {/* Barra superior del Ribbon */}
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
      <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>Tablero Kanban</span>
        </button>
        <button className="px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          <span>Lista</span>
        </button>
        <button className="px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>Calendario</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-indigo-300 font-bold">
          4to Tetra • 6 Tareas
        </span>
      </div>
    </div>

    {/* Columnas Kanban */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Columna Pendientes */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-300 pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            📋 Pendientes
          </span>
          <span className="bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">1</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 hover:border-blue-500/50 transition">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50">
            Base de Datos II
          </span>
          <h5 className="text-xs font-bold text-white">Actividad 3: Consultas SQL</h5>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400"><Clock className="w-3 h-3" /> Vence en 8 días</span>
          </div>
          <button className="w-full py-1 text-[11px] font-bold bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded border border-blue-500/30">
            Mover a En Proceso →
          </button>
        </div>
      </div>

      {/* Columna En Proceso */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-300 pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            ⚡ En Proceso
          </span>
          <span className="bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">1</span>
        </div>

        <div className="bg-slate-950 border border-amber-900/40 rounded-lg p-3 space-y-2 shadow-sm">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-700/50">
            Redes de Computadoras
          </span>
          <h5 className="text-xs font-bold text-white">Actividad 2: Subredes IPv4</h5>
          <div className="flex items-center justify-between text-[10px] text-amber-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Vence en 3 días (Rojo)</span>
          </div>
          <button className="w-full py-1 text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-sm">
            Marcar Terminada ✓
          </button>
        </div>
      </div>

      {/* Columna Terminadas */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-300 pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ✅ Terminadas
          </span>
          <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">1</span>
        </div>

        <div className="bg-slate-950/60 border border-emerald-900/40 rounded-lg p-3 space-y-2 opacity-90">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
            Ética Profesional
          </span>
          <h5 className="text-xs font-bold text-slate-300 line-through">Ensayo de Valores</h5>
          <div className="flex items-center justify-between text-[10px] text-emerald-400">
            <span className="flex items-center gap-1 font-bold"><CheckCircle2 className="w-3 h-3" /> ¡Entregada y Lista!</span>
          </div>
          <button className="w-full py-1 text-[11px] font-medium bg-slate-800 text-slate-400 hover:text-white rounded">
            Reabrir a Pendiente
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Mockup 3: Semáforo de Urgencia y Búsqueda
const MockupSemaforo = () => (
  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-2xl space-y-4">
    {/* Barra de Filtros */}
    <div className="flex flex-col sm:flex-row gap-2.5">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          readOnly 
          value="Proyecto Final" 
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-indigo-300 font-bold flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          <span>Materia: Todas</span>
        </div>
      </div>
    </div>

    {/* Comparación Visual del Semáforo */}
    <div className="space-y-2.5">
      {/* Nivel Verde */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-3">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Investigación de Metodologías Ágiles</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Verde: 9 días restantes
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Ingeniería de Software • Profr. Lic. Garza</p>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-900 self-start sm:self-center">
          Tranquilo (Sin prisa)
        </span>
      </div>

      {/* Nivel Amarillo */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-3">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Práctica 3: Normalización de Base de Datos</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Amarillo: 5 días restantes
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Base de Datos II • Profr. Ing. Morales</p>
          </div>
        </div>
        <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-900 self-start sm:self-center">
          Atención (Avanzar entrega)
        </span>
      </div>

      {/* Nivel Rojo */}
      <div className="bg-slate-900/90 border border-rose-500/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md shadow-rose-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/80 animate-pulse flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Proyecto Final: Auditoría de Seguridad</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-rose-600 text-white border border-rose-400 animate-pulse">
                🔴 ¡Vence Mañana 23:59!
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Seguridad Informática • Profr. Dr. Treviño</p>
          </div>
        </div>
        <span className="text-xs font-extrabold text-rose-300 bg-rose-950 px-2.5 py-1 rounded-lg border border-rose-800 self-start sm:self-center">
          ¡Prioridad Máxima!
        </span>
      </div>
    </div>
  </div>
);

// Mockup 4: Espacio de Trabajo y Visor de Recursos
const MockupWorkspace = () => (
  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-2xl space-y-4">
    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
      <div className="flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        <h4 className="text-xs sm:text-sm font-extrabold text-white">
          Espacio de Trabajo: Actividad 4 - Caso Práctico
        </h4>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-900/50 text-blue-300 border border-blue-700/50">
          Visor Multiformato
        </span>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Panel Izquierdo: Consignas y Recursos */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Instrucciones</span>
          <p className="text-xs text-slate-300 leading-relaxed">
            1. Analiza el archivo PDF adjunto con el caso de estudio.<br />
            2. Llena la plantilla de cálculo en Excel con los indicadores.<br />
            3. Redacta tus conclusiones en Word respetando la rúbrica.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Archivos de Apoyo</span>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="text-slate-200 truncate">Guia_Caso_Estudio_2026.pdf</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="p-1 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white" title="Ver en visor">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white" title="Descargar">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center space-x-2 truncate">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-200 truncate">Plantilla_Indicadores.xlsx</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="p-1 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white" title="Ver en visor">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white" title="Descargar">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho: Visor Integrado de Documentos */}
      <div className="bg-slate-900/90 border border-indigo-900/40 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-cyan-400" /> Visor de Guia_Caso_Estudio_2026.pdf
          </span>
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-400 font-mono">Pág 1 / 4</span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Simulación de página PDF */}
        <div className="bg-white rounded-lg p-3 text-slate-800 text-[10px] space-y-2 shadow-inner h-32 overflow-hidden select-none">
          <div className="flex justify-between border-b pb-1">
            <strong className="text-blue-900 font-bold">UNIVERSIDAD CIUDADANA DE NL</strong>
            <span className="text-slate-500">Tetramestre Mayo-Agosto</span>
          </div>
          <p className="font-semibold text-slate-700">RÚBRICA Y OBJETIVOS DEL PROYECTO</p>
          <p className="text-slate-600 text-[9px] leading-tight">
            El presente documento define los estándares de calidad esperados en el reporte final. El alumno deberá presentar una propuesta estructurada con bibliografía en formato APA.
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Descargar Copia
          </button>
          <span className="text-[11px] text-slate-400">Sin necesidad de Office externo</span>
        </div>
      </div>
    </div>
  </div>
);

// Mockup 5: Hilo Privado de Dudas con el Docente
const MockupDudasChat = () => (
  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-2xl space-y-3.5">
    {/* Header del Chat */}
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center font-bold text-xs">
          💬
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
            Hilo Privado de Dudas • Actividad 3
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
              1 a 1 Privado
            </span>
          </h4>
          <p className="text-[11px] text-slate-400">Docente: Mtro. Roberto Cantú</p>
        </div>
      </div>

      {/* Medidor de 1 MB */}
      <div className="bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 text-[10px] text-slate-300">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span>Capacidad:</span>
          <span className="font-mono font-bold text-pink-400">14.2 KB / 1,000 KB (1.4%)</span>
        </div>
        <div className="w-24 bg-slate-800 h-1 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full w-[1.4%]" />
        </div>
      </div>
    </div>

    {/* Mensajes del Chat */}
    <div className="space-y-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 min-h-[140px] flex flex-col justify-end">
      {/* Mensaje del Alumno */}
      <div className="flex justify-end">
        <div className="max-w-xs sm:max-w-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm p-3 space-y-1 shadow-md">
          <div className="flex items-center justify-between text-[10px] text-blue-200">
            <span className="font-bold">Tú (Juan Pérez)</span>
            <span>10:24 AM</span>
          </div>
          <p className="text-xs leading-relaxed">
            Profesor, ¿en la pregunta 2 de la rúbrica podemos trabajar con PostgreSQL en vez de MySQL?
          </p>
        </div>
      </div>

      {/* Mensaje del Docente */}
      <div className="flex justify-start">
        <div className="max-w-xs sm:max-w-sm bg-slate-800 text-slate-100 rounded-2xl rounded-tl-sm p-3 space-y-1 border border-slate-700 shadow-md">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-bold text-indigo-300 flex items-center gap-1">
              👨‍🏫 Mtro. Roberto Cantú
            </span>
            <span>10:31 AM</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-200">
            Hola Juan. Sí, es totalmente válido. Recuerda incluir el script de creación de tablas en tu entrega final.
          </p>
        </div>
      </div>
    </div>

    {/* Caja de Texto */}
    <div className="flex items-center space-x-2">
      <input 
        type="text" 
        readOnly 
        value="Escribe tu consulta al docente..." 
        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 focus:outline-none"
      />
      <button className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md">
        <Send className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Mockup 6: Notificaciones Push y Resumen Diario
const MockupNotificaciones = () => (
  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-2xl space-y-4">
    {/* Alerta tipo Notificación de Sistema Operativo */}
    <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl border border-indigo-500/40 shadow-xl space-y-2 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-md">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <span className="text-xs font-bold text-white">UCNL Actividades • Notificación Push</span>
            <span className="text-[10px] text-indigo-300 block">Hoy, 08:00 AM (Resumen Diario)</span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
          En Segundo Plano
        </span>
      </div>

      <p className="text-xs text-slate-200 leading-relaxed font-medium pl-9">
        🌅 ¡Buenos días Juan! Tienes <strong>3 actividades pendientes</strong> para esta semana: <strong>1 urgente</strong> (vence mañana) y <strong>2 en tiempo</strong>. ¡Organiza tu día!
      </p>
    </div>

    {/* Panel Desplegable de la Campanita en la App */}
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-1 border-b border-slate-800">
        <span className="flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-indigo-400" />
          Historial de Avisos
        </span>
        <span className="text-[10px] text-slate-400">3 avisos activos</span>
      </div>

      <div className="space-y-1.5">
        <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
            <span className="text-white truncate">Actividad 2 vence mañana a las 23:59 hrs</span>
          </div>
          <span className="text-[10px] text-slate-400 flex-shrink-0">Hace 2 hrs</span>
        </div>

        <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-white truncate">Profesor respondió en tu hilo de dudas</span>
          </div>
          <span className="text-[10px] text-slate-400 flex-shrink-0">Ayer</span>
        </div>
      </div>
    </div>
  </div>
);

// Mockup 7: Instalación PWA y Modo Offline
const MockupPWA = () => (
  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-2xl space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Banner de Instalación Móvil */}
      <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-700/40 rounded-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md border border-blue-400/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Instalar en tu Celular</h5>
            <p className="text-[10px] text-indigo-200">Acceso rápido sin abrir navegador</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Agrega el icono de UCNL Actividades directamente a tu pantalla de inicio en Android o iPhone.
        </p>
        <button className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow flex items-center justify-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Instalar App en Pantalla
        </button>
      </div>

      {/* Indicador de Modo Sin Conexión */}
      <div className="bg-slate-900/90 border border-teal-500/40 rounded-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600/30 border border-teal-500/50 flex items-center justify-center text-teal-300 shadow-md">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Modo Sin Conexión (Offline)</h5>
            <p className="text-[10px] text-teal-300 font-semibold">Base de datos local activa</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Tus tareas, rúbricas y estados se guardan localmente para que puedas estudiar en cualquier lugar sin internet.
        </p>
        <div className="p-2 bg-slate-950 rounded-lg border border-teal-900/60 text-[11px] text-teal-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>Sincronización automática al recuperar señal</span>
        </div>
      </div>
    </div>
  </div>
);

// Mapa de componentes Mockup por ID
const MODULE_MOCKUPS = {
  'student-access': MockupAcceso,
  'kanban-views': MockupKanban,
  'urgency-filters': MockupSemaforo,
  'workspace-viewer': MockupWorkspace,
  'private-chat': MockupDudasChat,
  'push-notifications': MockupNotificaciones,
  'pwa-offline-mode': MockupPWA
};

// ==========================================
// COMPONENTE PRINCIPAL DEL TUTORIAL
// ==========================================
export const AppTutorial = ({ onClose, currentUser = null }) => {
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const currentModule = STUDENT_TUTORIAL_MODULES[activeModuleIndex] || STUDENT_TUTORIAL_MODULES[0];
  const MockupComponent = MODULE_MOCKUPS[currentModule.id] || MockupAcceso;

  // Filtrado de módulos si hay búsqueda
  const filteredModules = STUDENT_TUTORIAL_MODULES.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q)
    );
  });

  const handleNext = () => {
    if (activeModuleIndex < STUDENT_TUTORIAL_MODULES.length - 1) {
      setActiveModuleIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeModuleIndex > 0) {
      setActiveModuleIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && activeModuleIndex < STUDENT_TUTORIAL_MODULES.length - 1) {
        setActiveModuleIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && activeModuleIndex > 0) {
        setActiveModuleIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activeModuleIndex]);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col font-sans overflow-hidden text-slate-100 animate-in fade-in duration-200 select-text">
      
      {/* 1. BARRA SUPERIOR (HEADER GLOBAL) */}
      <header className="bg-slate-950/95 backdrop-blur-md border-b border-indigo-900/50 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0 z-30 shadow-md">
        
        {/* Identidad y Título */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0 border border-blue-400/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base text-white tracking-tight truncate">
                UCNL Actividades
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Guía del Estudiante
              </span>
            </div>
            <p className="text-[11px] text-indigo-200/70 hidden sm:block truncate">
              Manual interactivo de estudio, tareas y herramientas escolares
            </p>
          </div>
        </div>

        {/* Buscador Rápido de Temas */}
        <div className="relative hidden md:block w-64 lg:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" />
          <input
            type="text"
            placeholder="Buscar tema (ej. semáforo, chat)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-indigo-900/60 text-xs text-white placeholder-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Botón Salir / Cerrar Tutorial */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition shadow-sm cursor-pointer border border-rose-500/60"
            title="Cerrar tutorial (Esc)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">
              {currentUser ? 'Volver a Mis Tareas' : 'Ir a Iniciar Sesión'}
            </span>
          </button>
        </div>
      </header>

      {/* 2. CONTENEDOR PRINCIPAL: SIDEBAR + CONTENIDO SCROLLABLE */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-950">
        
        {/* SIDEBAR DE MÓDULOS */}
        <aside className="w-full md:w-80 lg:w-88 bg-slate-950 border-b md:border-b-0 md:border-r border-indigo-950 flex flex-col flex-shrink-0 min-h-0">
          
          {/* Encabezado del Índice */}
          <div className="p-3.5 px-4 bg-slate-900/80 border-b border-indigo-950 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Módulos ({STUDENT_TUTORIAL_MODULES.length})
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-900/60">
              Paso {activeModuleIndex + 1} de {STUDENT_TUTORIAL_MODULES.length}
            </span>
          </div>

          {/* Lista de Módulos (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 touch-scroll">
            {filteredModules.map((mod) => {
              const Icon = mod.icon;
              const index = STUDENT_TUTORIAL_MODULES.findIndex(m => m.id === mod.id);
              const isActive = index === activeModuleIndex;

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveModuleIndex(index)}
                  className={`w-full text-left p-3 rounded-2xl transition flex items-center space-x-3 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30 border border-blue-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-900'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-indigo-400 border border-slate-800'
                  }`}>
                    {mod.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-xs truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {mod.title}
                    </p>
                    <p className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                      {mod.description}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Barra de Progreso Inferior en Sidebar */}
          <div className="p-3.5 bg-slate-900/90 border-t border-indigo-950 flex-shrink-0 hidden md:block">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Tu avance en la guía</span>
              <span className="font-bold text-indigo-300">
                {Math.round(((activeModuleIndex + 1) / STUDENT_TUTORIAL_MODULES.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${((activeModuleIndex + 1) / STUDENT_TUTORIAL_MODULES.length) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        {/* ÁREA CENTRAL DE CONTENIDO (BLOQUE NORMAL SCROLLABLE) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-900/60 min-w-0 touch-scroll">
          
          {/* BARRA DE NAVEGACIÓN Y TÍTULO DEL MÓDULO (HERO CARD COMPLETO Y ESPACIOSO) */}
          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-3xl p-5 sm:p-7 shadow-xl shadow-black/40 space-y-5">
            
            {/* Fila 1: Selector de Pasos y Botones Anterior/Siguiente */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-indigo-900/50">
              
              {/* Botón Anterior */}
              <button
                type="button"
                onClick={handlePrev}
                disabled={activeModuleIndex === 0}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 active:scale-95 disabled:opacity-25 disabled:pointer-events-none text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700/60 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span>Anterior</span>
              </button>

              {/* Selector de Píldoras Numéricas (1..7) */}
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {STUDENT_TUTORIAL_MODULES.map((mod, idx) => (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModuleIndex(idx)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-bold text-xs flex items-center justify-center transition cursor-pointer ${
                      idx === activeModuleIndex
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/50 scale-105'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                    title={mod.title}
                  >
                    {mod.number}
                  </button>
                ))}
              </div>

              {/* Botón Siguiente */}
              {activeModuleIndex < STUDENT_TUTORIAL_MODULES.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30 border border-blue-500/40"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30 border border-emerald-500/40"
                >
                  <Check className="w-4 h-4" />
                  <span>Finalizar</span>
                </button>
              )}
            </div>

            {/* Fila 2: Icono, Título y Descripción del Módulo */}
            <div className="flex items-start space-x-4 sm:space-x-5">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr ${currentModule.color} flex items-center justify-center text-white shadow-lg shadow-indigo-900/40 flex-shrink-0 border border-white/20 mt-1`}>
                {React.createElement(currentModule.icon, { className: 'w-7 h-7 sm:w-8 sm:h-8' })}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Módulo {currentModule.number} de {STUDENT_TUTORIAL_MODULES.length}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400">Guía del Estudiante UCNL</span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {currentModule.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl pt-0.5">
                  {currentModule.summary}
                </p>
              </div>
            </div>
          </div>

          {/* CAPTURA DE PANTALLA / MAQUETA INTERACTIVA DE LA APP */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-blue-400" />
                Vista previa en vivo de la plataforma
              </span>
              <span className="text-[11px] text-indigo-300 font-medium">
                Simulación interactiva
              </span>
            </div>
            
            <MockupComponent />
          </div>

          {/* CARACTERÍSTICAS Y EXPLICACIÓN PASO A PASO */}
          <div className="bg-slate-950/80 border border-indigo-950 rounded-3xl p-5 sm:p-7 space-y-4 shadow-md">
            <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Cómo funciona para ti como estudiante</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {currentModule.features.map((feat, fIdx) => (
                <div 
                  key={fIdx}
                  className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-2xl p-4 transition space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-white">
                        {feat.title}
                      </h4>
                      {feat.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${feat.badgeColor}`}>
                          {feat.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {feat.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TARJETA DE ACCESO PERMANENTE ?tuto */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-950 to-blue-950 border border-indigo-800/40 rounded-2xl text-xs text-indigo-200 flex items-start space-x-3 shadow-inner">
            <HelpCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <strong className="text-white block font-bold">💡 Acceso permanente a esta guía</strong>
              <p className="text-indigo-200/90">
                Puedes volver a abrir este tutorial en cualquier momento desde cualquier celular o computadora agregando <code className="bg-slate-900 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold border border-slate-800">?tuto</code> al final de la dirección web (ejemplo: <code className="bg-slate-900 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold border border-slate-800">https://ucnl-actividades.web.app/?tuto</code>) sin necesidad de iniciar sesión.
              </p>
            </div>
          </div>

          {/* BARRA DE NAVEGACIÓN AL FINAL DE LA PÁGINA */}
          <div className="flex items-center justify-between pt-4 pb-2 border-t border-indigo-950">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeModuleIndex === 0}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Módulo Anterior</span>
            </button>

            {activeModuleIndex < STUDENT_TUTORIAL_MODULES.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer border border-blue-400/40"
              >
                <span>Siguiente ({STUDENT_TUTORIAL_MODULES[activeModuleIndex + 1]?.shortTitle})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer border border-emerald-400/40"
              >
                <Check className="w-4 h-4" />
                <span>{currentUser ? 'Finalizar y Volver a Mis Tareas' : 'Comenzar e Iniciar Sesión'}</span>
              </button>
            )}
          </div>

        </main>

      </div>

    </div>
  );
};

export default AppTutorial;
