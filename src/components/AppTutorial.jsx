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
  Users, 
  Shield, 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Bell, 
  BellRing, 
  MessageSquare, 
  FileText, 
  Download, 
  Eye, 
  Plus, 
  Settings, 
  Lock, 
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
  FileCheck,
  Send,
  SlidersHorizontal,
  Key,
  Database
} from 'lucide-react';

export const TUTORIAL_MODULES = [
  {
    id: 'intro-auth',
    number: '1',
    title: 'Inicio de Sesión y Perfiles',
    shortTitle: '1. Acceso y Roles',
    icon: ShieldCheck,
    color: 'from-blue-600 to-indigo-600',
    description: 'Acceso seguro a la plataforma, credenciales institucionales y roles disponibles.',
    content: {
      summary: 'UCNL Actividades es una plataforma especializada para la gestión, entrega y seguimiento de tareas y proyectos escolares de la Universidad Ciudadana de Nuevo León.',
      sections: [
        {
          title: 'Roles de Usuario en la Plataforma',
          items: [
            {
              role: '👨‍🎓 Estudiante',
              badge: 'Estudiante',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
              text: 'Consulta las actividades de su tetramestre, visualiza documentos/recursos en el visor integrado, mantiene un hilo privado de dudas con el docente y marca su progreso personal (Pendiente, En Proceso, Terminada).'
            },
            {
              role: '👨‍🏫 Docente / Tutor',
              badge: 'Docente',
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
              text: 'Crea y edita tareas o proyectos, adjunta archivos de apoyo (PDF, Word, Excel, PowerPoint, videos), responde las dudas individuales de los alumnos en tiempo real y supervisa las entregas.'
            },
            {
              role: '🛡️ Administrador',
              badge: 'Administrador',
              badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
              text: 'Control total de la plataforma. Administra la estructura de Tetramestres y Materias, gestiona las cuentas de usuario (roles, estados, última hora de conexión y dispositivos vinculados) y configura los horarios de notificaciones push.'
            }
          ]
        },
        {
          title: 'Registro Seguro de Dispositivos',
          text: 'Al iniciar sesión, el sistema identifica automáticamente el tipo de equipo (Celular, Computadora o Tablet), sistema operativo y navegador para registrarlo de forma transparente en tu perfil institucional, asegurando un control de acceso confiable.'
        }
      ]
    }
  },
  {
    id: 'views-kanban',
    number: '2',
    title: 'Vistas del Tablero Escolar',
    shortTitle: '2. Vistas y Tablero',
    icon: Layers,
    color: 'from-indigo-600 to-purple-600',
    description: 'Tablero Kanban por estados, vista de lista detallada y calendario mensual.',
    content: {
      summary: 'Organiza tu carga de trabajo mediante 3 modos de visualización diseñados para adaptarse a tu estilo de estudio o docencia.',
      sections: [
        {
          title: 'Las 3 Vistas Principales',
          items: [
            {
              role: '📊 Tablero Kanban',
              badge: 'Vista Predeterminada',
              badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
              text: 'Distribuye las actividades en 3 columnas: "Pendientes", "En Proceso" y "Terminadas". Puedes mover o cambiar el estado de cualquier actividad con un solo clic en los botones de acción rápida de cada tarjeta.'
            },
            {
              role: '📋 Vista de Lista',
              badge: 'Compacta y Ordenada',
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
              text: 'Presentación en formato de tabla con columnas para Materia, Tetramestre, Título, Fecha Límite exacta, Urgencia y Botones directos para abrir recursos o el espacio de trabajo.'
            },
            {
              role: '📅 Calendario Escolar',
              badge: 'Planificación Mensual',
              badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
              text: 'Cuadrícula mensual que ubica cada tarea en su día exacto de vencimiento con códigos de color de urgencia. Te permite anticipar semanas pesadas y coordinar tus entregas con tiempo.'
            }
          ]
        },
        {
          title: 'Ordenamiento Inteligente',
          text: 'Todas las actividades se ordenan automáticamente de manera cronológica: las que vencen más pronto aparecen primero arriba para que nunca pierdas de vista las entregas inmediatas.'
        }
      ]
    }
  },
  {
    id: 'filters-urgency',
    number: '3',
    title: 'Filtros y Semáforo de Urgencia',
    shortTitle: '3. Filtros y Urgencia',
    icon: Search,
    color: 'from-emerald-600 to-teal-600',
    description: 'Búsqueda en tiempo real, filtro por tetramestre/materia y niveles de alerta.',
    content: {
      summary: 'Encuentra cualquier tarea al instante y prioriza tus actividades con el sistema visual de semáforo por tiempo restante.',
      sections: [
        {
          title: 'Semáforo de Urgencia por Tiempo Restante',
          items: [
            {
              role: '🟢 Nivel Verde (Tranquilo)',
              badge: '7+ Días Restantes',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
              text: 'Queda más de una semana para la entrega. Tiempo ideal para leer las instrucciones, revisar lecturas y planificar el borrador.'
            },
            {
              role: '🟡 Nivel Amarillo (Atención)',
              badge: '4 a 6 Días Restantes',
              badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
              text: 'Momento de avanzar en el desarrollo de la tarea y plantear dudas al docente a través del hilo de comentarios.'
            },
            {
              role: '🔴 Nivel Rojo (Urgente / Inminente)',
              badge: '3 Días o Menos',
              badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
              text: 'Plazo crítico. Incluye avisos de "Vence hoy" o "Vence mañana" para garantizar el envío final antes del cierre de plataforma.'
            }
          ]
        },
        {
          title: 'Herramientas de Filtrado en el Ribbon',
          text: 'Usa el buscador superior para filtrar en vivo por palabras clave en títulos o descripciones. Filtra por Tetramestre para ver solo tu periodo actual y por Materia específica para concentrarte en una sola asignatura.'
        }
      ]
    }
  },
  {
    id: 'workspace-resources',
    number: '4',
    title: 'Espacio de Trabajo y Visor de Recursos',
    shortTitle: '4. Espacio de Trabajo',
    icon: BookOpen,
    color: 'from-blue-700 to-cyan-700',
    description: 'Visor integrado multiformato (PDF, Office, Videos), recursos y entregas.',
    content: {
      summary: 'El Espacio de Trabajo (Workspace) unifica las instrucciones, los documentos de apoyo y la navegación entre actividades en un solo lugar sin salir de la app.',
      sections: [
        {
          title: 'Dos Modos de Exploración',
          items: [
            {
              role: '📂 Modo Explorador (Botón Recursos)',
              badge: 'Navegación Global',
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
              text: 'Al pulsar "Recursos" en la barra superior o en el ribbon, se abre el explorador con el listado completo de actividades a la izquierda y un panel interactivo a la derecha para examinar los materiales de cualquier materia.'
            },
            {
              role: '🎯 Modo Actividad Específica',
              badge: 'Trabajo Directo',
              badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
              text: 'Al abrir una tarea desde el tablero o la lista, ingresas directamente a su espacio de trabajo con instrucciones detalladas, recursos adjuntos, visor integrado y panel de entrega.'
            }
          ]
        },
        {
          title: 'Visor Integrado Multiformato',
          text: 'Visualiza archivos PDF, documentos de Word (.docx), hojas de cálculo de Excel (.xlsx), presentaciones de PowerPoint (.pptx), imágenes y videos embebidos (YouTube, Google Drive, Cloudinary) directamente en pantalla, con opción de descarga con un solo clic.'
        }
      ]
    }
  },
  {
    id: 'comments-chat',
    number: '5',
    title: 'Hilo de Dudas por Alumno (Chat 1 MB)',
    shortTitle: '5. Dudas por Alumno',
    icon: MessageSquare,
    color: 'from-purple-600 to-pink-600',
    description: 'Canal de comunicación privado por actividad con medidor de capacidad.',
    content: {
      summary: 'Cada estudiante cuenta con su propio hilo individual de comentarios por cada actividad, garantizando privacidad y consultas directas con sus docentes.',
      sections: [
        {
          title: 'Características del Hilo de Dudas',
          items: [
            {
              role: '🔒 Privacidad e Independencia',
              badge: '1 Documento por Alumno',
              badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
              text: 'Tus preguntas e intercambios con el docente están organizados en tu hilo personal. Ningún otro alumno interfiere con tus dudas ni satura tu conversación.'
            },
            {
              role: '📊 Medidor de Capacidad (1 MB)',
              badge: 'Límite de Texto',
              badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
              text: 'Cada hilo cuenta con un indicador en tiempo real del tamaño de los mensajes para aprovechar eficientemente el espacio (1 MB permite miles de mensajes de texto).'
            },
            {
              role: '⚡ Respuestas en Tiempo Real',
              badge: 'Sincronización Firestore',
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
              text: 'Los mensajes muestran fecha, hora y rol de quien responde, actualizándose instantáneamente sin necesidad de recargar la página.'
            }
          ]
        }
      ]
    }
  },
  {
    id: 'activity-management',
    number: '6',
    title: 'Creación y Edición (Docentes y Admins)',
    shortTitle: '6. Publicar Tareas',
    icon: Plus,
    color: 'from-amber-600 to-orange-600',
    description: 'Formulario enriquecido para publicar tareas, adjuntar archivos y definir fechas.',
    content: {
      summary: 'Los docentes y administradores pueden publicar nuevas actividades con instrucciones detalladas, fechas de entrega y recursos educativos adjuntos.',
      sections: [
        {
          title: 'Formulario de Creación de Actividades',
          items: [
            {
              role: '📝 Datos Principales',
              badge: 'Estructura',
              badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
              text: 'Selección de Tetramestre y Materia, título descriptivo, nombre del docente responsable y fecha/hora límite de entrega.'
            },
            {
              role: '📎 Archivos Adjuntos y Enlaces',
              badge: 'Cloudinary & Web',
              badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
              text: 'Sube guías en PDF, rúbricas o plantillas (almacenamiento seguro en Cloudinary) y agrega enlaces externos a videoconferencias, videos o artículos.'
            },
            {
              role: '📢 Alerta Automática a Estudiantes',
              badge: 'Tiempo Real',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              text: 'Al publicar la actividad, los estudiantes suscritos reciben una notificación instantánea en sus dispositivos alertándoles sobre la nueva tarea.'
            }
          ]
        }
      ]
    }
  },
  {
    id: 'notifications-system',
    number: '7',
    title: 'Notificaciones Push y Resumen Diario',
    shortTitle: '7. Notificaciones Push',
    icon: BellRing,
    color: 'from-rose-600 to-red-600',
    description: 'Recordatorio diario matutino a las 08:00 AM, alertas con app cerrada y campanita.',
    content: {
      summary: 'Sistema integral de alertas que te mantiene al día con tus entregas escolares sin generar spam ni avisos innecesarios.',
      sections: [
        {
          title: '¿Cómo funcionan las Notificaciones?',
          items: [
            {
              role: '🌅 Resumen Diario Matutino (08:00 AM)',
              badge: 'Consolidado',
              badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
              text: 'A las 08:00 AM, cada estudiante recibe un único mensaje consolidado con el total de actividades pendientes y en proceso que vencen en los siguientes 7 días.'
            },
            {
              role: '📱 Recepción con la App Cerrada (Web Push / FCM)',
              badge: 'FCM en Segundo Plano',
              badgeColor: 'bg-red-100 text-red-800 border-red-200',
              text: 'Gracias al Service Worker y Firebase Cloud Messaging, las alertas llegan al centro de notificaciones de Windows, Android, macOS o iOS aunque no tengas la app abierta.'
            },
            {
              role: '🚫 Descarte de Tareas Terminadas',
              badge: 'Filtro Inteligente',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              text: 'En cuanto marcas una tarea como "Terminada", el sistema la excluye de inmediato de todos los recordatorios futuros.'
            },
            {
              role: '🔔 Campanita e Historial Local',
              badge: 'IndexedDB',
              badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
              text: 'Revisa en la barra superior el panel de notificaciones con contador de no leídos y registro persistente de todos los avisos recibidos.'
            }
          ]
        }
      ]
    }
  },
  {
    id: 'admin-config',
    number: '8',
    title: 'Panel de Configuración y Usuarios (Admins)',
    shortTitle: '8. Panel de Admins',
    icon: Settings,
    color: 'from-slate-800 to-indigo-900',
    description: 'Estructura académica, gestión de usuarios, última conexión y visor de dispositivos.',
    content: {
      summary: 'Herramientas avanzadas exclusivas para administradores para gestionar la vida académica y la seguridad del portal.',
      sections: [
        {
          title: 'Módulos de Configuración',
          items: [
            {
              role: '📚 Tetramestres y Materias',
              badge: 'Estructura Curricular',
              badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
              text: 'Crea, renombra o elimina tetramestres y asignaturas con sus códigos oficiales (ej. MAT-101, BD-201).'
            },
            {
              role: '👥 Gestión de Usuarios y Roles',
              badge: 'Control de Acceso',
              badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
              text: 'Tabla completa con buscador, filtros, cambio de roles (Admin, Docente, Estudiante) y activación/desactivación de cuentas en tiempo real.'
            },
            {
              role: '💻 Visor de Dispositivos y Última Conexión',
              badge: 'Seguridad y Auditoría',
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
              text: 'Muestra la hora de última conexión y un botón con el número de dispositivos de cada usuario. Al hacer clic, abre un modal con el desglose de celulares, computadoras, tablets, navegador y modo PWA.'
            },
            {
              role: '⏰ Horarios de Notificaciones',
              badge: 'Reglas de Envío',
              badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
              text: 'Ajusta la hora de envío del resumen diario, activa alertas de 7 días, 4 días o urgentes de 3 días, y realiza pruebas en tu equipo.'
            }
          ]
        }
      ]
    }
  },
  {
    id: 'pwa-offline',
    number: '9',
    title: 'Instalación PWA y Modo Sin Conexión',
    shortTitle: '9. PWA y Offline',
    icon: Smartphone,
    color: 'from-emerald-700 to-blue-800',
    description: 'Instala la app en tu escritorio o celular y consulta tus tareas sin internet.',
    content: {
      summary: 'UCNL Actividades es una Progressive Web App (PWA) de última generación que funciona como una aplicación nativa en todos tus dispositivos.',
      sections: [
        {
          title: 'Cómo Instalar la Aplicación',
          items: [
            {
              role: '💻 En Computadoras (Windows / Mac / Linux)',
              badge: 'Google Chrome / Edge',
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
              text: 'Haz clic en el icono de instalación (pantalla con flecha) en la barra de direcciones del navegador o en el menú de 3 puntos → "Instalar UCNL Actividades". Se creará un acceso directo en tu escritorio e inicio.'
            },
            {
              role: '📱 En Celulares Android',
              badge: 'Chrome Android',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              text: 'Al ingresar verás el banner inferior "Instalar App". O pulsa los 3 puntos del navegador y elige "Agregar a la pantalla principal".'
            },
            {
              role: '🍏 En iPhone / iPad (iOS)',
              badge: 'Safari iOS',
              badgeColor: 'bg-slate-200 text-slate-800 border-slate-300',
              text: 'Abre la app en Safari, pulsa el botón "Compartir" (cuadrado con flecha hacia arriba) y selecciona "Agregar al inicio".'
            }
          ]
        },
        {
          title: 'Funcionamiento Offline (IndexedDB)',
          text: 'Todas las actividades, materias y tareas completadas se guardan en la base de datos local de tu navegador. Si te quedas sin internet en el transporte o en una zona sin cobertura, podrás seguir consultando tus tareas y materiales sin interrupciones.'
        }
      ]
    }
  }
];

export const AppTutorial = ({ onClose, currentUser = null }) => {
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const currentModule = TUTORIAL_MODULES[activeModuleIndex] || TUTORIAL_MODULES[0];

  // Filtrado de módulos si hay búsqueda
  const filteredModules = TUTORIAL_MODULES.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.content.summary.toLowerCase().includes(q)
    );
  });

  const handleNext = () => {
    if (activeModuleIndex < TUTORIAL_MODULES.length - 1) {
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
      } else if (e.key === 'ArrowRight' && activeModuleIndex < TUTORIAL_MODULES.length - 1) {
        setActiveModuleIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && activeModuleIndex > 0) {
        setActiveModuleIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activeModuleIndex]);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
      
      {/* Barra Superior del Tutorial */}
      <header className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 border-b border-indigo-900/60 px-4 sm:px-8 py-3 flex items-center justify-between gap-3 text-white flex-shrink-0 shadow-lg shadow-black/40 z-20">
        
        {/* Identidad y Título */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0 border border-blue-400/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                UCNL Actividades
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                Tutorial Completo
              </span>
            </div>
            <p className="text-[11px] text-indigo-200/80 hidden sm:block truncate">
              Manual y guía interactiva de todas las características de la plataforma
            </p>
          </div>
        </div>

        {/* Buscador Rápido en Tutorial */}
        <div className="relative hidden md:block w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" />
          <input
            type="text"
            placeholder="Buscar tema o función..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-indigo-300/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              {currentUser ? 'Volver al Tablero' : 'Iniciar Sesión'}
            </span>
          </button>
        </div>
      </header>

      {/* Contenedor Principal: Sidebar de Módulos + Área de Contenido */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-900">
        
        {/* Sidebar de Navegación de Módulos */}
        <aside className="w-full md:w-80 lg:w-96 bg-slate-950/80 border-b md:border-b-0 md:border-r border-indigo-900/40 flex flex-col flex-shrink-0 min-h-0">
          
          {/* Encabezado del Índice */}
          <div className="p-3.5 px-4 bg-slate-950 border-b border-indigo-950 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Módulos del Tutorial ({TUTORIAL_MODULES.length})
            </span>
            <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-900/60">
              Paso {activeModuleIndex + 1} de {TUTORIAL_MODULES.length}
            </span>
          </div>

          {/* Lista de Módulos (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 touch-scroll no-scrollbar">
            {filteredModules.map((mod) => {
              const Icon = mod.icon;
              const index = TUTORIAL_MODULES.findIndex(m => m.id === mod.id);
              const isActive = index === activeModuleIndex;

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveModuleIndex(index)}
                  className={`w-full text-left p-3 rounded-2xl transition flex items-center space-x-3 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/30 border border-blue-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-indigo-300'
                  }`}>
                    {mod.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-xs truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {mod.title}
                    </p>
                    <p className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {mod.description}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Barra de Progreso Inferior en Sidebar */}
          <div className="p-3 bg-slate-950 border-t border-indigo-950/80 hidden md:block">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Progreso del tutorial</span>
              <span className="font-bold text-indigo-300">
                {Math.round(((activeModuleIndex + 1) / TUTORIAL_MODULES.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${((activeModuleIndex + 1) / TUTORIAL_MODULES.length) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Área Central de Contenido del Módulo */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 touch-scroll bg-slate-900 text-slate-100">
          
          {/* Tarjeta de Encabezado del Módulo */}
          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/30 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-4 min-w-0">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${currentModule.color} flex items-center justify-center text-white shadow-lg flex-shrink-0 border border-white/20`}>
                  {React.createElement(currentModule.icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      Módulo {currentModule.number}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400 font-medium">UCNL Actividades</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                    {currentModule.title}
                  </h2>
                </div>
              </div>

              {/* Botones de Navegación Rápida */}
              <div className="flex items-center space-x-2 flex-shrink-0 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={activeModuleIndex === 0}
                  className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/10"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={activeModuleIndex === TUTORIAL_MODULES.length - 1}
                  className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30 border border-blue-400/40"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-300 mt-4 leading-relaxed max-w-3xl">
              {currentModule.content.summary}
            </p>
          </div>

          {/* Secciones Detalladas del Módulo */}
          <div className="space-y-5 max-w-4xl">
            {currentModule.content.sections.map((section, sIdx) => (
              <div 
                key={sIdx}
                className="bg-slate-950/70 border border-indigo-900/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md"
              >
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>{section.title}</span>
                </h3>

                {section.text && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {section.text}
                  </p>
                )}

                {section.items && (
                  <div className="grid grid-cols-1 gap-3 pt-1">
                    {section.items.map((item, iIdx) => (
                      <div 
                        key={iIdx}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-white">
                            {item.role}
                          </h4>
                          {item.badge && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tarjeta de Sugerencia / Tip Pro */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-blue-950 to-slate-950 border border-indigo-700/50 rounded-2xl text-xs text-indigo-200 flex items-start space-x-3 max-w-4xl shadow-inner">
            <HelpCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white block font-bold">💡 Acceso directo sin enlaces</strong>
              <p className="text-indigo-200/90 leading-relaxed">
                Puedes volver a consultar esta guía en cualquier momento y desde cualquier dispositivo agregando <code className="bg-black/40 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">?tuto</code> al final de la dirección web en tu navegador (ejemplo: <code className="bg-black/40 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">https://ucnl-actividades.web.app/?tuto</code>) sin necesidad de iniciar sesión.
              </p>
            </div>
          </div>

          {/* Navegación al final del módulo */}
          <div className="flex items-center justify-between pt-4 border-t border-indigo-950 max-w-4xl">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeModuleIndex === 0}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Módulo Anterior</span>
            </button>

            {activeModuleIndex < TUTORIAL_MODULES.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer border border-blue-400/40"
              >
                <span>Siguiente Módulo ({TUTORIAL_MODULES[activeModuleIndex + 1]?.shortTitle})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer border border-emerald-400/40"
              >
                <Check className="w-4 h-4" />
                <span>{currentUser ? 'Finalizar y Volver al Tablero' : 'Comenzar e Iniciar Sesión'}</span>
              </button>
            )}
          </div>

        </main>

      </div>

    </div>
  );
};

export default AppTutorial;
