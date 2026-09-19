import React, { useState } from 'react';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  BookOpen,
  Calendar,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth, getFriendlyAuthErrorMessage } from '../context/AuthContext';

export const AuthScreen = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { loginWithEmail, registerWithEmail, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Por favor escribe tu nombre completo.');
        }
        await registerWithEmail(email, password, name.trim(), 'estudiante');
      } else if (mode === 'reset') {
        await resetPassword(email);
        setSuccessMessage('Te enviamos un enlace a tu correo para restablecer tu contraseña.');
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      if (err.code) {
        setError(getFriendlyAuthErrorMessage(err.code));
      } else {
        setError(err.message || 'Ocurrió un error al procesar la solicitud.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Círculos decorativos de fondo */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Contenedor Principal */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Portal */}
        <div className="bg-gradient-to-br from-blue-800 via-indigo-700 to-blue-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur border border-white/25 mb-3 shadow-inner">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            UCNL Actividades
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xs mx-auto">
            Plataforma externa de gestión y seguimiento de actividades escolares.
          </p>
        </div>

        {/* Pestañas de Modo (Login / Registro) */}
        {mode !== 'reset' && (
          <div className="grid grid-cols-2 p-2 bg-slate-100/90 border-b border-slate-200 text-xs font-bold">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
              className={`py-2 rounded-xl transition ${
                mode === 'login'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
              className={`py-2 rounded-xl transition ${
                mode === 'register'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {/* Formulario */}
        <div className="p-6 sm:p-8 space-y-4">
          
          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs sm:text-sm animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Nombre al registrarse */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Carlos Garza o Prof. Juan Martínez"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                  />
                </div>
              </div>
            )}

            {/* Información de rol en registro público */}
            {mode === 'register' && (
              <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-2xl text-blue-900 text-xs flex items-start space-x-2.5 shadow-xs">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-blue-950">Registro como Estudiante</p>
                  <p className="text-[11px] text-blue-800 leading-snug">
                    Tu cuenta se creará con acceso de <strong>Estudiante</strong>. Si requieres permisos de Docente/Tutor o Administrador, un administrador podrá asignártelos desde el panel de control.
                  </p>
                </div>
              </div>
            )}

            {/* Correo Electrónico */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ucnl.edu o tu correo"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                />
              </div>
            </div>

            {/* Contraseña */}
            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contraseña *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(''); setSuccessMessage(''); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••• (mínimo 6 caracteres)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                  />
                </div>
              </div>
            )}

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/25 transition disabled:opacity-50 mt-4 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Ingresar a la Plataforma'}
                    {mode === 'register' && 'Crear Cuenta de Estudiante'}
                    {mode === 'reset' && 'Enviar Enlace de Recuperación'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Enlace para volver si está en Reset */}
          {mode === 'reset' && (
            <div className="pt-2 text-center text-xs text-slate-500">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
                className="font-bold text-blue-600 hover:underline"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          )}

        </div>

        {/* Pie de pantalla */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400">
          Acceso seguro y privado para la comunidad educativa de la UCNL
        </div>

      </div>
    </div>
  );
};

export default AuthScreen;
