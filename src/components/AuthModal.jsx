import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  GraduationCap
} from 'lucide-react';
import { useAuth, getFriendlyAuthErrorMessage } from '../context/AuthContext';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login', customMessage = '' }) => {
  const [mode, setMode] = useState(initialMode); // 'login', 'register', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMessage('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      if (err.code) {
        setError(getFriendlyAuthErrorMessage(err.code));
      } else {
        setError(err.message || 'No se pudo iniciar sesión con Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onClose();
      } else if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Por favor escribe tu nombre completo.');
        }
        await registerWithEmail(email, password, name.trim());
        onClose();
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
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md my-auto max-h-[92vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur border border-white/20 mb-3 shadow-inner">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'login' && 'Iniciar Sesión'}
            {mode === 'register' && 'Crear Cuenta Docente'}
            {mode === 'reset' && 'Recuperar Contraseña'}
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xs mx-auto">
            {customMessage || (
              mode === 'login' 
                ? 'Accede con tu correo institucional y contraseña para gestionar actividades.' 
                : mode === 'register'
                  ? 'Regístrate con tu correo y contraseña para publicar tareas y documentos.'
                  : 'Ingresa tu correo para enviarte instrucciones.'
            )}
          </p>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-5 sm:p-8 space-y-4 overflow-y-auto touch-scroll">
          {/* Mensajes de Alerta */}
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

          {/* Botón Continuar con Google */}
          {mode !== 'reset' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-bold rounded-2xl border border-slate-200 shadow-sm hover:shadow transition disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Conectando con Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{mode === 'login' ? 'Continuar con Google' : 'Registrarse con Google'}</span>
                  </>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">o con correo</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Prof. Juan Pérez"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ucnl.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Contraseña
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(''); setSuccessMessage(''); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
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
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-2xl shadow-md shadow-blue-500/25 transition disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Ingresar al Portal'}
                    {mode === 'register' && 'Crear Cuenta'}
                    {mode === 'reset' && 'Enviar Correo de Recuperación'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle de Modos */}
          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            {mode === 'login' && (
              <p>
                ¿Aún no tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Regístrate aquí
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p>
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Inicia sesión aquí
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
                className="font-bold text-blue-600 hover:underline"
              >
                ← Volver al inicio de sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
