import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const FirebaseStatusBanner = ({ error, onDismiss }) => {
  const [copied, setCopied] = useState(false);
  if (!error) return null;

  const isPermissionError = error.code === 'permission-denied' || (error.message && error.message.includes('permission'));

  const sampleRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /activities/{activityId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(sampleRules);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 text-amber-900 shadow-sm animate-in fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-amber-900">
              Aviso de Conexión de Firebase: {error.message || 'Permisos o Base de datos pendiente'}
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed max-w-3xl">
              Si es la primera vez que usas el proyecto <code>ucnl-actividades</code>, asegúrate de haber creado la base de datos <strong>Cloud Firestore</strong> y el bucket de <strong>Firebase Storage</strong> en la Consola de Firebase.
            </p>

            {isPermissionError && (
              <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-xs space-y-2">
                <p className="font-semibold text-slate-800">
                  Pasos para permitir lectura pública y edición autenticada:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Ve a <a href="https://console.firebase.google.com/project/ucnl-actividades/firestore" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline inline-flex items-center">Consola Firebase &gt; Firestore <ExternalLink className="w-3 h-3 ml-0.5" /></a></li>
                  <li>Ve a la pestaña <strong>Reglas (Rules)</strong> y pega las reglas que permiten lectura a todos y escritura a usuarios autenticados.</li>
                </ol>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={copyRules}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-[11px] transition shadow-xs flex items-center space-x-1"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    <span>{copied ? '¡Reglas Copiadas!' : 'Copiar Reglas de Seguridad'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-amber-600 hover:text-amber-800 rounded-lg hover:bg-amber-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FirebaseStatusBanner;
