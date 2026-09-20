import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Layers, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Save, 
  AlertCircle,
  Loader2,
  GraduationCap,
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Key,
  Mail,
  UserCheck,
  Search,
  CheckCircle2,
  Lock,
  Bell,
  BellRing,
  Clock,
  Sparkles,
  Send,
  Server,
  Globe,
  RefreshCw,
  Radio,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { 
  createAppUser, 
  subscribeToUsers, 
  updateUserRole, 
  updateUserStatus,
  SUPER_ADMIN_EMAIL 
} from '../services/userService';
import {
  getNotificationScheduleConfig,
  saveNotificationScheduleConfig,
  sendLocalTestNotification,
  DEFAULT_NOTIFICATION_CONFIG,
  areNotificationsSupported,
  fetchBackendStatus,
  triggerBackendDueEvaluation,
  triggerDaily7DaysReminder,
  getBackendUrl,
  setBackendUrl,
  DEFAULT_BACKEND_URL
} from '../services/notificationService';

export const ConfigModal = ({
  isOpen,
  onClose,
  academicStructure = [],
  onSaveStructure,
  isAdmin = false,
  currentUser = null
}) => {
  const [activeTab, setActiveTab] = useState('tetras'); // 'tetras' | 'subjects' | 'users' | 'notifications'
  const [tetras, setTetras] = useState([]);
  const [selectedTetraId, setSelectedTetraId] = useState('');
  
  // Estados para nuevo Tetra
  const [newTetraName, setNewTetraName] = useState('');
  const [editingTetraId, setEditingTetraId] = useState(null);
  const [editingTetraName, setEditingTetraName] = useState('');

  // Estados para nueva Materia
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editingSubjectName, setEditingSubjectName] = useState('');
  const [editingSubjectCode, setEditingSubjectCode] = useState('');

  // Estados para Notificaciones y Horarios
  const [notificationConfig, setNotificationConfig] = useState(DEFAULT_NOTIFICATION_CONFIG);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState('');
  const [notificationError, setNotificationError] = useState('');
  const [testNotificationLoading, setTestNotificationLoading] = useState(false);
  const [testNotificationResult, setTestNotificationResult] = useState('');

  // Estados para Backend Autónomo
  const [backendUrlInput, setBackendUrlInput] = useState(getBackendUrl());
  const [backendStatus, setBackendStatus] = useState(null);
  const [backendChecking, setBackendChecking] = useState(false);
  const [triggerDueLoading, setTriggerDueLoading] = useState(false);
  const [triggerDueResult, setTriggerDueResult] = useState('');
  const [triggerDailyLoading, setTriggerDailyLoading] = useState(false);
  const [triggerDailyResult, setTriggerDailyResult] = useState('');

  // Estados para Gestión de Usuarios
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('docente');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userActionSuccess, setUserActionSuccess] = useState('');
  const [userActionError, setUserActionError] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (academicStructure) {
      setTetras(JSON.parse(JSON.stringify(academicStructure)));
      setSelectedTetraId(prev => {
        if (prev && academicStructure.some(t => t.id === prev)) return prev;
        return academicStructure[0]?.id || '';
      });
    }
  }, [academicStructure, isOpen]);

  // Suscripción en tiempo real a usuarios si es Admin y modal abierto
  useEffect(() => {
    if (!isOpen || !isAdmin) return;

    setUsersLoading(true);
    const unsubscribe = subscribeToUsers(
      (users) => {
        setUsersList(users);
        setUsersLoading(false);
      },
      (err) => {
        console.error('Error al cargar lista de usuarios:', err);
        setUsersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, isAdmin]);

  // Cargar configuración de notificaciones al abrir el modal o cambiar a la pestaña
  useEffect(() => {
    if (!isOpen) return;

    const loadNotifConfig = async () => {
      setLoadingNotifications(true);
      try {
        const config = await getNotificationScheduleConfig();
        setNotificationConfig(config);
      } catch (err) {
        console.warn('Error al cargar config de notificaciones:', err);
      } finally {
        setLoadingNotifications(false);
      }
    };

    loadNotifConfig();
  }, [isOpen]);

  const handleSaveNotificationConfig = async (e) => {
    if (e) e.preventDefault();
    setSavingNotifications(true);
    setNotificationSuccess('');
    setNotificationError('');

    try {
      await saveNotificationScheduleConfig(notificationConfig, currentUser);
      setNotificationSuccess('¡Configuración de notificaciones guardada y sincronizada exitosamente!');
      setTimeout(() => setNotificationSuccess(''), 4000);
    } catch (err) {
      console.error('Error al guardar configuración de notificaciones:', err);
      setNotificationError('No se pudo guardar la configuración de notificaciones.');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleTestNotification = async () => {
    setTestNotificationLoading(true);
    setTestNotificationResult('');
    try {
      await sendLocalTestNotification();
      setTestNotificationResult('success');
      setTimeout(() => setTestNotificationResult(''), 5000);
    } catch (err) {
      console.error('Error en prueba de notificación:', err);
      setTestNotificationResult('error: ' + (err.message || 'Error al emitir notificación de prueba'));
    } finally {
      setTestNotificationLoading(false);
    }
  };

  const handleCheckBackend = async () => {
    setBackendChecking(true);
    setBackendStatus(null);
    try {
      const res = await fetchBackendStatus(backendUrlInput);
      setBackendStatus(res);
      if (res.ok) {
        setBackendUrl(backendUrlInput);
      }
    } catch (e) {
      setBackendStatus({ ok: false, error: e.message || 'Error de conexión' });
    } finally {
      setBackendChecking(false);
    }
  };

  const handleTriggerBackendDue = async () => {
    setTriggerDueLoading(true);
    setTriggerDueResult('');
    try {
      const res = await triggerBackendDueEvaluation(backendUrlInput);
      setTriggerDueResult(`¡Evaluación completada! ${res.alertsFound !== undefined ? res.alertsFound : 0} alertas procesadas.`);
      setTimeout(() => setTriggerDueResult(''), 6000);
    } catch (e) {
      setTriggerDueResult(`Error: ${e.message}`);
      setTimeout(() => setTriggerDueResult(''), 6000);
    } finally {
      setTriggerDueLoading(false);
    }
  };

  const handleTriggerDaily7Days = async () => {
    setTriggerDailyLoading(true);
    setTriggerDailyResult('');
    try {
      const res = await triggerDaily7DaysReminder(backendUrlInput);
      if (res.success) {
        setTriggerDailyResult(`✅ Recordatorio diario ejecutado: ${res.results?.studentsNotified || 0} estudiantes notificados (${res.results?.totalSent || 0} mensajes push enviados).`);
      } else {
        setTriggerDailyResult(`⚠️ ${res.message || res.error || 'Evaluación terminada.'}`);
      }
      setTimeout(() => setTriggerDailyResult(''), 7000);
    } catch (e) {
      setTriggerDailyResult(`Error: ${e.message}`);
      setTimeout(() => setTriggerDailyResult(''), 7000);
    } finally {
      setTriggerDailyLoading(false);
    }
  };

  // Comprobar estado del backend al entrar a la pestaña de notificaciones
  useEffect(() => {
    if (activeTab === 'notifications' && isOpen) {
      handleCheckBackend();
    }
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const currentTetra = tetras.find(t => t.id === selectedTetraId) || tetras[0];

  // --- Manejo de Tetramestres ---
  const handleAddTetra = (e) => {
    e.preventDefault();
    if (!newTetraName.trim()) return;

    const newId = `tetra_${Date.now()}`;
    const newTetraObj = {
      id: newId,
      name: newTetraName.trim(),
      order: tetras.length + 1,
      subjects: []
    };

    setTetras([...tetras, newTetraObj]);
    setNewTetraName('');
    setSelectedTetraId(newId);
  };

  const handleSaveEditTetra = (id) => {
    if (!editingTetraName.trim()) return;
    setTetras(tetras.map(t => t.id === id ? { ...t, name: editingTetraName.trim() } : t));
    setEditingTetraId(null);
    setEditingTetraName('');
  };

  const handleDeleteTetra = (id) => {
    const target = tetras.find(t => t.id === id);
    if (target?.subjects?.length > 0) {
      if (!window.confirm(`El "${target.name}" contiene ${target.subjects.length} materias. ¿Seguro que deseas eliminarlo?`)) {
        return;
      }
    }
    const updated = tetras.filter(t => t.id !== id);
    setTetras(updated);
    if (selectedTetraId === id) {
      setSelectedTetraId(updated[0]?.id || '');
    }
  };

  // --- Manejo de Materias dentro del Tetra Seleccionado ---
  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !selectedTetraId) return;

    const newSubObj = {
      id: `sub_${Date.now()}`,
      name: newSubjectName.trim(),
      code: newSubjectCode.trim() || `MAT-${Math.floor(100 + Math.random() * 900)}`
    };

    setTetras(tetras.map(t => {
      if (t.id === selectedTetraId) {
        return {
          ...t,
          subjects: [...(t.subjects || []), newSubObj]
        };
      }
      return t;
    }));

    setNewSubjectName('');
    setNewSubjectCode('');
  };

  const handleSaveEditSubject = (subjectId) => {
    if (!editingSubjectName.trim()) return;

    setTetras(tetras.map(t => {
      if (t.id === selectedTetraId) {
        return {
          ...t,
          subjects: (t.subjects || []).map(s => {
            if (s.id === subjectId) {
              return {
                ...s,
                name: editingSubjectName.trim(),
                code: editingSubjectCode.trim() || s.code
              };
            }
            return s;
          })
        };
      }
      return t;
    }));

    setEditingSubjectId(null);
    setEditingSubjectName('');
    setEditingSubjectCode('');
  };

  const handleDeleteSubject = (subjectId) => {
    setTetras(tetras.map(t => {
      if (t.id === selectedTetraId) {
        return {
          ...t,
          subjects: (t.subjects || []).filter(s => s.id !== subjectId)
        };
      }
      return t;
    }));
  };

  // --- Manejo de Creación de Usuarios (Admin Only) ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setUserActionError('');
    setUserActionSuccess('');

    if (!newUserEmail.trim() || !newUserPassword.trim() || !newUserName.trim()) {
      setUserActionError('Por favor completa todos los campos requeridos.');
      return;
    }

    if (newUserPassword.length < 6) {
      setUserActionError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCreatingUser(true);
    try {
      await createAppUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        displayName: newUserName.trim(),
        role: newUserRole,
        adminUser: currentUser
      });

      setUserActionSuccess(`¡Usuario "${newUserName.trim()}" (${newUserEmail.trim()}) registrado con éxito con rol de ${newUserRole === 'admin' ? 'Administrador' : newUserRole === 'estudiante' ? 'Estudiante' : 'Docente'}!`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('estudiante');

      setTimeout(() => {
        setUserActionSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Error al registrar usuario:', err);
      if (err.code === 'auth/email-already-in-use') {
        setUserActionError('El correo ingresado ya se encuentra registrado.');
      } else if (err.code === 'auth/invalid-email') {
        setUserActionError('El formato de correo no es válido.');
      } else if (err.code === 'auth/weak-password') {
        setUserActionError('La contraseña es demasiado débil.');
      } else {
        setUserActionError(err.message || 'No se pudo crear el usuario.');
      }
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async (user, newRole) => {
    if (!isAdmin) return;
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert('El administrador principal no puede ser modificado.');
      return;
    }
    if (user.uid === currentUser?.uid && newRole !== 'admin') {
      if (!window.confirm('¿Estás seguro de quitarte los privilegios de administrador?')) {
        return;
      }
    }

    try {
      await updateUserRole(user.uid, newRole);
    } catch (err) {
      console.error('Error al actualizar rol:', err);
      alert('Error al actualizar rol de usuario.');
    }
  };

  const handleStatusChange = async (user, newStatus) => {
    if (!isAdmin) return;
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert('El administrador principal no puede ser desactivado.');
      return;
    }

    try {
      await updateUserStatus(user.uid, newStatus);
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      alert('Error al actualizar estado de usuario.');
    }
  };

  // --- Guardar cambios globales de estructura ---
  const handleSaveAll = async () => {
    setIsSaving(true);
    setError('');
    setSavedSuccess(false);

    try {
      await onSaveStructure(tetras);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error al guardar estructura:', err);
      setError('No se pudo guardar la configuración. Verifica tus permisos de red.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrado de usuarios en la tabla
  const filteredUsers = usersList.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full h-full bg-slate-100 animate-in fade-in duration-150">
      <div 
        className="bg-white flex-1 flex flex-col overflow-hidden w-full h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Superior: Pestañas con degradado azul oscuro y Botón Cerrar Rojo */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 border-b border-blue-900/60 px-3 sm:px-6 py-2 gap-2 flex-shrink-0 sticky top-0 z-30 shadow-md shadow-blue-950/25">
          
          {/* Pestañas de Navegación */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar touch-scroll flex-1 min-w-0 py-0.5">
            <button
              onClick={() => setActiveTab('tetras')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'tetras'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40'
                  : 'bg-white/5 text-slate-300 border border-white/5 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'tetras' ? 'text-white' : 'text-blue-300'}`} />
              <span>1. Tetras ({tetras.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'subjects'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40'
                  : 'bg-white/5 text-slate-300 border border-white/5 hover:text-white hover:bg-white/10'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'subjects' ? 'text-white' : 'text-blue-300'}`} />
              <span>2. Materias</span>
            </button>

            {/* Pestaña Exclusiva de Administradores */}
            {isAdmin ? (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                    : 'bg-white/5 text-indigo-200 border border-white/5 hover:text-white hover:bg-indigo-900/40'
                }`}
              >
                <Users className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'users' ? 'text-white' : 'text-indigo-300'}`} />
                <span>3. Usuarios ({usersList.length})</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
            ) : (
              <div 
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-500 cursor-not-allowed opacity-50 whitespace-nowrap bg-white/5 rounded-xl border border-white/5"
                title="Solo disponible para el administrador"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>3. Usuarios</span>
              </div>
            )}

            {/* Pestaña 4: Notificaciones y Horarios */}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40'
                  : 'bg-white/5 text-slate-300 border border-white/5 hover:text-white hover:bg-white/10'
              }`}
            >
              <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'notifications' ? 'text-white' : 'text-blue-300'}`} />
              <span>4. Notificaciones</span>
            </button>
          </div>

          {/* Botón Cerrar Rojo a la derecha (Sin etiqueta) */}
          <div className="flex-shrink-0 pl-1">
            <button
              onClick={onClose}
              className="p-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white border border-rose-500/50 rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
              title="Cerrar configuración (Esc)"
              aria-label="Cerrar configuración"
            >
              <X className="w-4 h-4 text-white stroke-[2.5]" />
            </button>
          </div>

        </div>

        {/* Contenido de Pestañas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 text-sm touch-scroll max-w-7xl w-full mx-auto">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PESTAÑA 1: TETRAMESTRES */}
          {activeTab === 'tetras' && (
            <div className="space-y-4">
              {/* Formulario para nuevo Tetra */}
              <form onSubmit={handleAddTetra} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nombre del nuevo Tetra (Ej. 4to Tetramestre)"
                  value={newTetraName}
                  onChange={(e) => setNewTetraName(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-xs transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Tetra</span>
                </button>
              </form>

              {/* Lista de Tetras */}
              <div className="space-y-2">
                {tetras.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl space-y-1">
                    <p className="font-semibold text-slate-600">No hay Tetramestres registrados</p>
                    <p className="text-[11px] text-slate-400">Ingresa el nombre arriba (Ej. "1er Tetramestre") y haz clic en "Agregar Tetra".</p>
                  </div>
                ) : (
                  tetras.map((tetra, index) => (
                    <div
                      key={tetra.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl transition hover:border-blue-300"
                    >
                      {editingTetraId === tetra.id ? (
                        <div className="flex-1 flex items-center space-x-2 pr-2">
                          <input
                            type="text"
                            value={editingTetraName}
                            onChange={(e) => setEditingTetraName(e.target.value)}
                            className="flex-1 px-3 py-1 rounded-xl border border-blue-300 text-sm font-semibold"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEditTetra(tetra.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingTetraId(null)}
                            className="p-1.5 bg-slate-200 text-slate-700 rounded-xl"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{tetra.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {tetra.subjects?.length || 0} materias registradas
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingTetraId(tetra.id);
                            setEditingTetraName(tetra.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                          title="Renombrar Tetra"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTetra(tetra.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Eliminar Tetra"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 2: MATERIAS POR TETRAMESTRE */}
          {activeTab === 'subjects' && (
            <div className="space-y-4">
              {tetras.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                  <p className="font-semibold text-slate-700">No hay Tetramestres creados aún</p>
                  <p className="text-slate-400">Primero ve a la pestaña "1. Tetramestres" y crea al menos un tetramestre.</p>
                  <button
                    onClick={() => setActiveTab('tetras')}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear un Tetramestre</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Selector de Tetramestre */}
                  <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Seleccionar Tetramestre:
                    </label>
                    <select
                      value={selectedTetraId}
                      onChange={(e) => setSelectedTetraId(e.target.value)}
                      className="px-3.5 py-1.5 rounded-xl border border-blue-300 bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {tetras.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.subjects?.length || 0} materias)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Formulario para nueva Materia */}
                  <form onSubmit={handleAddSubject} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nombre de la materia (Ej. Bases de Datos Avanzadas)"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Código (Ej. BD-201)"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                      className="w-full sm:w-32 px-3 py-2 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-xs transition shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Materia</span>
                    </button>
                  </form>
                </>
              )}

              {/* Lista de Materias en el Tetra seleccionado */}
              <div className="space-y-2">
                {(!currentTetra?.subjects || currentTetra.subjects.length === 0) ? (
                  <div className="p-6 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                    No hay materias agregadas en este Tetramestre. Usa el formulario superior para añadir materias.
                  </div>
                ) : (
                  currentTetra.subjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-300 transition"
                    >
                      {editingSubjectId === sub.id ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 pr-2">
                          <input
                            type="text"
                            value={editingSubjectName}
                            onChange={(e) => setEditingSubjectName(e.target.value)}
                            className="flex-1 px-3 py-1 rounded-xl border border-blue-300 text-xs font-semibold"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editingSubjectCode}
                            onChange={(e) => setEditingSubjectCode(e.target.value)}
                            className="w-24 px-2 py-1 rounded-xl border border-blue-300 text-xs"
                          />
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleSaveEditSubject(sub.id)}
                              className="p-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSubjectId(null)}
                              className="p-1.5 bg-slate-200 text-slate-700 rounded-xl"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{sub.name}</p>
                            {sub.code && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                                {sub.code}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingSubjectId(sub.id);
                            setEditingSubjectName(sub.name);
                            setEditingSubjectCode(sub.code || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                          title="Editar Materia"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Eliminar Materia"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 3: GESTIÓN DE USUARIOS Y DOCENTES (ADMIN ONLY) */}
          {activeTab === 'users' && isAdmin && (
            <div className="space-y-6">
              
              {/* Tarjeta Informativa / Header de Admin */}
              <div className="p-4 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>Administrador de Perfiles y Autenticación</span>
                    </h3>
                    <p className="text-xs text-indigo-200/80">
                      Crea cuentas en Firebase Auth y asigna perfiles en Firestore (`users/[uid]`).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                  <div className="px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                    <span className="text-slate-300">Total: </span>
                    <strong className="text-white">{usersList.length}</strong>
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-500/20 rounded-xl backdrop-blur-xs border border-emerald-400/30">
                    <span className="text-emerald-200">Estudiantes: </span>
                    <strong className="text-white">{usersList.filter(u => u.role === 'estudiante').length}</strong>
                  </div>
                  <div className="px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                    <span className="text-slate-300">Docentes / Tutores: </span>
                    <strong className="text-white">{usersList.filter(u => u.role === 'docente' || (!u.role && u.role !== 'admin')).length}</strong>
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-500/30 rounded-xl backdrop-blur-xs border border-emerald-400/40 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-200">Notificación Confirmada: </span>
                    <strong className="text-white">{usersList.filter(u => u.notificationConfirmed).length}</strong>
                  </div>
                  <div className="px-3 py-1.5 bg-indigo-500/30 rounded-xl backdrop-blur-xs border border-indigo-400/30">
                    <span className="text-indigo-200">Admins: </span>
                    <strong className="text-white">{usersList.filter(u => u.role === 'admin').length}</strong>
                  </div>
                </div>
              </div>

              {/* Formulario de Creación de Usuario */}
              <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-4">
                <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>Crear Nuevo Usuario / Docente</span>
                </div>

                {userActionSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{userActionSuccess}</span>
                  </div>
                )}

                {userActionError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{userActionError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Nombre Completo */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Dr. Mario Silva"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base sm:text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
                      />
                    </div>

                    {/* Correo Electrónico */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Correo Institucional *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="usuario@ucnl.edu.mx"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base sm:text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
                      />
                    </div>

                    {/* Contraseña Inicial */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Contraseña Inicial *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base sm:text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
                      />
                    </div>

                    {/* Rol */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Rol en Plataforma *
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base sm:text-xs bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px]"
                      >
                        <option value="estudiante">Estudiante (Solo Consulta y Entrega)</option>
                        <option value="docente">Docente / Tutor (Publicar y Editar Tareas)</option>
                        <option value="admin">Administrador (Control Total)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>El usuario se registra mediante Firebase Auth y almacena su perfil en Firestore.</span>
                    </p>
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                    >
                      {creatingUser ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Registrando...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Registrar Usuario</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista y Búsqueda de Usuarios */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Perfiles de Usuario Registrados ({filteredUsers.length})</span>
                  </h4>

                  {/* Buscador de usuarios */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o correo..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {usersLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    <span className="text-xs text-slate-500">Consultando perfiles en Firestore...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <tr>
                            <th className="py-3 px-4">Usuario</th>
                            <th className="py-3 px-4">Correo Electrónico</th>
                            <th className="py-3 px-4">Rol Asignado</th>
                            <th className="py-3 px-4">Estado</th>
                            <th className="py-3 px-4">Registrado Por</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredUsers.map((user) => {
                            const isSuper = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                            const isCurrent = user.uid === currentUser?.uid;

                            return (
                              <tr key={user.uid || user.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white uppercase shadow-xs ${
                                      user.role === 'admin' 
                                        ? 'bg-gradient-to-tr from-indigo-600 to-purple-600' 
                                        : user.role === 'estudiante'
                                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                                        : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
                                    }`}>
                                      {user.displayName ? user.displayName[0] : (user.email ? user.email[0] : 'U')}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                        <span>{user.displayName || 'Sin nombre'}</span>
                                        {user.notificationConfirmed && (
                                          <span 
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                                            title={`Notificación confirmada: ${user.notificationConfirmedAt ? new Date(user.notificationConfirmedAt).toLocaleString('es-MX') : 'Confirmado'}`}
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                                            <span>Confirmado</span>
                                          </span>
                                        )}
                                        {isSuper && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                                            Super Admin
                                          </span>
                                        )}
                                        {isCurrent && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">
                                            Tú
                                          </span>
                                        )}
                                      </p>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        UID: {(user.uid || user.id || '').substring(0, 10)}...
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-4 font-mono text-slate-600">
                                  {user.email}
                                </td>

                                <td className="py-3 px-4">
                                  {isSuper ? (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      <Shield className="w-3 h-3 text-indigo-600" />
                                      <span>Administrador</span>
                                    </span>
                                  ) : (
                                    <select
                                      value={user.role || 'estudiante'}
                                      onChange={(e) => handleRoleChange(user, e.target.value)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition focus:outline-none ${
                                        user.role === 'admin'
                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                                          : user.role === 'estudiante'
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                          : 'bg-blue-50 border-blue-200 text-blue-800'
                                      }`}
                                    >
                                      <option value="estudiante">Estudiante</option>
                                      <option value="docente">Docente / Tutor</option>
                                      <option value="admin">Administrador</option>
                                    </select>
                                  )}
                                </td>

                                <td className="py-3 px-4">
                                  {isSuper ? (
                                    <span className="inline-flex items-center text-emerald-700 font-bold text-[11px]">
                                      <Check className="w-3 h-3 mr-1" /> Activo
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleStatusChange(user, user.status === 'inactive' ? 'active' : 'inactive')}
                                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition ${
                                        user.status === 'inactive'
                                          ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700'
                                      }`}
                                    >
                                      {user.status === 'inactive' ? 'Inactivo' : 'Activo'}
                                    </button>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-slate-500 text-[11px]">
                                  {user.createdBy || 'Sistema'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* PESTAÑA 4: NOTIFICACIONES Y HORARIOS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              
              {/* Header informativo */}
              <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>Configuración de Notificaciones y Horarios</span>
                    </h3>
                    <p className="text-xs text-blue-200/80">
                      Gestiona las reglas de recordatorio automático según la urgencia y el horario de envío.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    disabled={testNotificationLoading}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition disabled:opacity-50"
                  >
                    {testNotificationLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Probar en este equipo</span>
                  </button>
                </div>
              </div>

              {/* Mensajes de Estado */}
              {notificationSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium">{notificationSuccess}</span>
                </div>
              )}

              {notificationError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{notificationError}</span>
                </div>
              )}

              {testNotificationResult === 'success' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>¡Notificación de prueba enviada! Revisa el centro de notificaciones de tu sistema.</span>
                </div>
              )}

              {testNotificationResult.startsWith('error') && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{testNotificationResult}</span>
                </div>
              )}

              {/* Tarjeta de Servidor Backend Autónomo (IP Externa / Local / Tareas Cron) */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 flex-shrink-0">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-white">Servidor Backend de Notificaciones</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          backendStatus?.ok
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {backendStatus?.ok ? '● En Línea 24/7' : '○ Comprobando...'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Ejecutándose de forma autónoma con cron jobs y escuchador de Firestore.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCheckBackend}
                      disabled={backendChecking}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${backendChecking ? 'animate-spin' : ''}`} />
                      <span>Verificar IP</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerBackendDue}
                      disabled={triggerDueLoading}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50"
                    >
                      {triggerDueLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Radio className="w-3.5 h-3.5" />
                      )}
                      <span>Evaluar Tareas Ahora</span>
                    </button>
                  </div>
                </div>

                {/* Datos de Red e IPs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-black/30 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">🌐 IP Externa Pública</span>
                    <span className="font-mono text-cyan-300 font-bold text-sm break-all">
                      {backendStatus?.data?.externalIp || '148.230.165.236'}
                    </span>
                  </div>

                  <div className="p-3 bg-black/30 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">🏠 IP Local LAN</span>
                    <span className="font-mono text-emerald-300 font-bold text-sm">
                      {backendStatus?.data?.localIp || '10.200.79.130'}:3001
                    </span>
                  </div>

                  <div className="p-3 bg-black/30 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">⏰ Programación Automática</span>
                    <span className="text-amber-300 font-bold">
                      08:00 AM y c/2 hrs
                    </span>
                  </div>
                </div>

                {/* Input de URL del Backend */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      URL del Endpoint Backend
                    </label>
                    <input
                      type="text"
                      value={backendUrlInput}
                      onChange={(e) => setBackendUrlInput(e.target.value)}
                      placeholder="http://148.230.165.236:3001"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:self-end">
                    <a
                      href={`${backendUrlInput}/api/status`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir API Status</span>
                    </a>
                  </div>
                </div>

                {triggerDueResult && (
                  <div className="p-3 bg-indigo-900/60 border border-indigo-400/40 rounded-xl text-xs text-indigo-200 animate-in fade-in">
                    {triggerDueResult}
                  </div>
                )}
              </div>

              {/* Sección 1: Recordatorio Diario de Actividades Pendientes (Próximos 7 Días) */}
              <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-4">
                <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                  <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Recordatorio Diario: Actividades Pendientes (Próximos 7 Días)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Zona Horaria: America/Monterrey</span>
                </div>

                {/* Switch de Activación/Desactivación */}
                <label className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                  notificationConfig.daily7DaysReminderEnabled !== false
                    ? 'bg-blue-50/60 border-blue-200'
                    : 'bg-white border-slate-200 opacity-60'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      notificationConfig.daily7DaysReminderEnabled !== false ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
                    }`} />
                    <div>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm block">
                        {notificationConfig.daily7DaysReminderEnabled !== false ? 'Recordatorio Diario Activado' : 'Recordatorio Diario Desactivado'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Envía un resumen matutino con las tareas que vencen en los siguientes 7 días.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationConfig.daily7DaysReminderEnabled !== false}
                    onChange={(e) => setNotificationConfig({ ...notificationConfig, daily7DaysReminderEnabled: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                  />
                </label>

                {/* Configuración de Hora y Explicación */}
                {notificationConfig.daily7DaysReminderEnabled !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Hora de Envío Diario
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={notificationConfig.notificationHour || '08:00'}
                          onChange={(e) => setNotificationConfig({ ...notificationConfig, notificationHour: e.target.value })}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="06:00">06:00 AM (Madrugada)</option>
                          <option value="07:00">07:00 AM (Temprano)</option>
                          <option value="08:00">08:00 AM (Por Defecto - Inicio de jornada)</option>
                          <option value="09:00">09:00 AM (Mañana)</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="12:00">12:00 PM (Mediodía)</option>
                          <option value="14:00">02:00 PM (Tarde)</option>
                          <option value="18:00">06:00 PM (Fin de jornada)</option>
                          <option value="20:00">08:00 PM (Noche)</option>
                        </select>
                        <input
                          type="time"
                          value={notificationConfig.notificationHour || '08:00'}
                          onChange={(e) => setNotificationConfig({ ...notificationConfig, notificationHour: e.target.value })}
                          className="w-28 px-2 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white text-slate-700 text-center"
                          title="Hora exacta personalizada"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800">¿Qué incluye el recordatorio?</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        A las <strong>{notificationConfig.notificationHour || '08:00'}</strong>, cada alumno recibe una notificación push con la cantidad exacta de tareas pendientes que vencen en los próximos 7 días, descontando las que ya marcó como terminadas.
                      </p>
                    </div>
                  </div>
                )}

                {/* Botón de prueba rápida del recordatorio diario */}
                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={handleTriggerDaily7Days}
                    disabled={triggerDailyLoading || (backendStatus && !backendStatus.ok)}
                    className="inline-flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-xs transition shadow-xs disabled:opacity-50"
                  >
                    {triggerDailyLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5" />
                    )}
                    <span>Probar Recordatorio Diario de 7 Días Ahora</span>
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Evalúa actividades de $\le$ 7 días y envía push a dispositivos
                  </span>
                </div>

                {triggerDailyResult && (
                  <div className="p-3 bg-blue-900/80 border border-blue-400/40 rounded-xl text-xs text-blue-100 animate-in fade-in">
                    {triggerDailyResult}
                  </div>
                )}
              </div>

              {/* Sección 2: Reglas de Recordatorio por Nivel de Urgencia */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>Reglas de Recordatorio por Tiempo Restante</span>
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {/* Regla Verde: 7 Días Antes */}
                  <label className={`flex items-start justify-between p-4 rounded-2xl border transition cursor-pointer ${
                    notificationConfig.notify7Days 
                      ? 'bg-emerald-50/50 border-emerald-300' 
                      : 'bg-white border-slate-200 opacity-60'
                  }`}>
                    <div className="flex items-start space-x-3 pr-3">
                      <div className="w-4 h-4 mt-0.5 rounded-full bg-emerald-500 flex-shrink-0 shadow-xs" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-800 text-sm">Recordatorio a los 7 Días Restantes</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Nivel Verde
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Envía una notificación preventiva 7 días antes de la fecha límite para que los alumnos planifiquen sus entregas con anticipación.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!notificationConfig.notify7Days}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, notify7Days: e.target.checked })}
                      className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-1 cursor-pointer flex-shrink-0"
                    />
                  </label>

                  {/* Regla Amarilla: 4 Días Antes */}
                  <label className={`flex items-start justify-between p-4 rounded-2xl border transition cursor-pointer ${
                    notificationConfig.notify4Days 
                      ? 'bg-amber-50/50 border-amber-300' 
                      : 'bg-white border-slate-200 opacity-60'
                  }`}>
                    <div className="flex items-start space-x-3 pr-3">
                      <div className="w-4 h-4 mt-0.5 rounded-full bg-amber-400 flex-shrink-0 shadow-xs" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-800 text-sm">Recordatorio a los 4 Días Restantes</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Nivel Amarillo
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Envía una alerta de seguimiento cuando quedan 4 días para recordar revisar avances y consultar dudas con el docente.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!notificationConfig.notify4Days}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, notify4Days: e.target.checked })}
                      className="w-5 h-5 text-amber-500 rounded border-slate-300 focus:ring-amber-500 mt-1 cursor-pointer flex-shrink-0"
                    />
                  </label>

                  {/* Regla Roja: 3 Días o Menos - Diario */}
                  <label className={`flex items-start justify-between p-4 rounded-2xl border transition cursor-pointer ${
                    notificationConfig.notify3DaysDaily 
                      ? 'bg-rose-50/50 border-rose-300' 
                      : 'bg-white border-slate-200 opacity-60'
                  }`}>
                    <div className="flex items-start space-x-3 pr-3">
                      <div className="w-4 h-4 mt-0.5 rounded-full bg-rose-500 flex-shrink-0 shadow-xs animate-pulse" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-800 text-sm">Recordatorio Diario a los 3 Días o Menos</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Nivel Rojo (Alta Urgencia)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Envía recordatorios <strong>a diario</strong> durante los últimos 3 días (faltando 3 días, 2 días, 1 día y el día del vencimiento) hasta que el estudiante o docente marque la actividad como terminada.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!notificationConfig.notify3DaysDaily}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, notify3DaysDaily: e.target.checked })}
                      className="w-5 h-5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 mt-1 cursor-pointer flex-shrink-0"
                    />
                  </label>

                  {/* Regla Extra: Nueva Actividad Creada */}
                  <label className={`flex items-start justify-between p-4 rounded-2xl border transition cursor-pointer ${
                    notificationConfig.notifyNewActivity 
                      ? 'bg-blue-50/50 border-blue-300' 
                      : 'bg-white border-slate-200 opacity-60'
                  }`}>
                    <div className="flex items-start space-x-3 pr-3">
                      <div className="w-4 h-4 mt-0.5 rounded-full bg-blue-500 flex-shrink-0 shadow-xs" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-800 text-sm">Alerta Inmediata al Publicar Nueva Actividad</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Tiempo Real
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Notifica instantáneamente a todos los estudiantes registrados cuando un docente crea una nueva tarea o proyecto.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!notificationConfig.notifyNewActivity}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, notifyNewActivity: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-1 cursor-pointer flex-shrink-0"
                    />
                  </label>

                  {/* Regla Extra: Registro de Nuevos Usuarios (Solo Administradores) */}
                  <label className={`flex items-start justify-between p-4 rounded-2xl border transition cursor-pointer ${
                    notificationConfig.notifyNewUserToAdmins 
                      ? 'bg-indigo-50/50 border-indigo-300' 
                      : 'bg-white border-slate-200 opacity-60'
                  }`}>
                    <div className="flex items-start space-x-3 pr-3">
                      <div className="w-4 h-4 mt-0.5 rounded-full bg-indigo-600 flex-shrink-0 shadow-xs" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-800 text-sm">Notificar Nuevos Usuarios a Administradores</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Para Admins
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Envía una notificación push instantánea a todos los usuarios con rol de <strong>Administrador</strong> en cuanto un nuevo usuario se registre en la aplicación.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationConfig.notifyNewUserToAdmins !== false}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, notifyNewUserToAdmins: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-1 cursor-pointer flex-shrink-0"
                    />
                  </label>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Pie del modal con botón Guardar */}
        <div className="px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 text-center sm:text-left">
              {savedSuccess ? (
                <span className="text-emerald-600 font-bold flex items-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>¡Estructura guardada y sincronizada!</span>
                </span>
              ) : activeTab === 'notifications' ? (
                'Los ajustes de horarios y alertas se guardarán en Firebase.'
              ) : (
                'Los cambios en Tetras y Materias se sincronizarán en Firestore e IndexedDB.'
              )}
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cerrar
              </button>
              {activeTab === 'notifications' ? (
                <button
                  onClick={handleSaveNotificationConfig}
                  disabled={savingNotifications}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-blue-500/25 transition disabled:opacity-50"
                >
                  {savingNotifications ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Notificaciones</span>
                    </>
                  )}
                </button>
              ) : activeTab !== 'users' ? (
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md shadow-blue-500/25 transition disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Estructura</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConfigModal;
