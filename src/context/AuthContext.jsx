import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { ensureAdminProfile, SUPER_ADMIN_EMAIL } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Traductor de errores comunes de Firebase Auth al español
export const getFriendlyAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'El correo electrónico ya está registrado por otra cuenta.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico es inválido.';
    case 'auth/network-request-failed':
      return 'Error de red. Comprueba tu conexión a Internet.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Intenta más tarde.';
    default:
      return 'Ocurrió un error al autenticar. Verifica tu correo y contraseña.';
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const profile = await ensureAdminProfile(user);
          setUserProfile(profile);
        } catch (err) {
          console.warn('No se pudo cargar el perfil de Firestore:', err);
          const isSuper = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          setUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: isSuper ? 'admin' : 'docente'
          });
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email, password, displayName, role = 'estudiante') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    // Asegurar perfil al registrarse con el rol solicitado
    await ensureAdminProfile(userCredential.user, role);
    return userCredential;
  };

  const logout = async () => {
    return signOut(auth);
  };

  const resetPassword = async (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isAdmin = isSuperAdmin || userProfile?.role === 'admin';
  const isDocente = userProfile?.role === 'docente';
  const isEditor = isAdmin || isDocente;
  const isStudent = userProfile?.role === 'estudiante' || (!isAdmin && !isDocente && !!currentUser);

  const value = {
    currentUser,
    userProfile,
    isEditor,
    isAdmin,
    isDocente,
    isStudent,
    loading,
    loginWithEmail,
    registerWithEmail,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
