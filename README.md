# 🎓 UCNL Actividades - Gestor de Actividades Escolares

Aplicación web desarrollada en **React + Vite + Tailwind CSS** con backend en la nube en **Firebase (Authentication, Cloud Firestore y Firebase Storage)** para organizar tareas, proyectos, exámenes y subir/descargar documentos escolares.

---

## 🚀 Características Principales

1. **Acceso Público de Consulta (Lectura)**:
   - Cualquier persona con el enlace puede acceder sin necesidad de cuenta.
   - Consulta el tablero Kanban, la lista filtrable y el calendario interactivo.
   - Visualiza descripciones completas y descarga todos los documentos adjuntos (PDF, Word, Excel, PPT, imágenes).

2. **Gestión Protegida para Docentes y Editores (Autenticación)**:
   - Inicio de sesión y registro con Correo/Contraseña o con Google Sign-In.
   - Creación, edición y eliminación de actividades escolares.
   - Subida de archivos a **Firebase Storage** con barra de progreso en vivo.
   - Cambio ágil de estados (*Pendiente*, *En Progreso*, *Completada*).

3. **3 Vistas Interactivas**:
   - 📊 **Tablero Kanban**: Columnas visuales por estado.
   - 📋 **Lista / Tabla**: Con ordenamiento por fecha de entrega, prioridad o materia.
   - 📅 **Calendario Mensual**: Con marcadores por materia y fecha límite.

---

## 🔒 Reglas de Seguridad en Firebase Console

Para que la aplicación funcione con lectura pública y edición autenticada:

### 1. Cloud Firestore (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /activities/{activityId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

### 2. Firebase Storage (`storage.rules`):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write, delete: if request.auth != null;
    }
  }
}
```

---

## 💻 Ejecución en Servidor Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Vite
npm run dev
```

Abre en tu navegador: `http://localhost:5173`
