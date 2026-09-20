import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── 1. Inicialización de Firebase Admin SDK ──────────────────────────────────
let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('🔑 Credenciales cargadas exitosamente desde variable de entorno (GitHub Secrets).');
  } catch (err) {
    console.error('❌ Error al parsear JSON en FIREBASE_SERVICE_ACCOUNT:', err.message);
    process.exit(1);
  }
} else {
  // Intentar cargar localmente para pruebas de desarrollo
  const localCandidates = [
    path.join(__dirname, '..', 'server', 'ucnl-actividades-firebase-adminsdk-fbsvc-667f99f82f.json'),
    path.join(__dirname, '..', 'ucnl-actividades-firebase-adminsdk-fbsvc-667f99f82f.json')
  ];
  for (const loc of localCandidates) {
    if (fs.existsSync(loc)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(loc, 'utf-8'));
        console.log(`🔑 Credenciales cargadas desde archivo local: ${loc}`);
        break;
      } catch (e) {
        console.warn(`⚠️ No se pudo leer archivo ${loc}:`, e.message);
      }
    }
  }
}

if (!serviceAccount) {
  console.error('❌ Error fatal: No se proporcionaron credenciales de Firebase Admin SDK.');
  console.error('   Asegúrate de configurar el secret FIREBASE_SERVICE_ACCOUNT en GitHub Actions.');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const messaging = getMessaging();

// ─── 2. Funciones Auxiliares ──────────────────────────────────────────────────

/**
 * Obtiene la configuración de notificaciones guardada en Firestore
 */
async function getNotificationConfig() {
  const defaults = {
    daily7DaysReminderEnabled: true,
    notificationHour: '08:00',
    notify7Days: true,
    notify4Days: true,
    notify3DaysDaily: true,
    notifyNewActivity: true,
    notifyNewUserToAdmins: true
  };

  try {
    const docSnap = await db.collection('config').doc('notifications').get();
    if (docSnap.exists) {
      console.log('⚙️ Configuración de notificaciones cargada desde Firestore.');
      return { ...defaults, ...docSnap.data() };
    }
  } catch (err) {
    console.warn('⚠️ No se pudo cargar config/notifications, usando valores por defecto:', err.message);
  }
  return defaults;
}

/**
 * Recopila todos los usuarios y sus tokens FCM
 */
async function getAllUsersWithTokens() {
  const users = [];
  try {
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const userId = userDoc.id;
      const tokens = new Set();

      // Tokens del arreglo principal
      if (Array.isArray(data.fcmTokens)) {
        data.fcmTokens.forEach(t => t && typeof t === 'string' && tokens.add(t.trim()));
      }
      // Token único legado o lastFcmToken
      if (data.lastFcmToken && typeof data.lastFcmToken === 'string') {
        tokens.add(data.lastFcmToken.trim());
      }
      if (data.fcmToken && typeof data.fcmToken === 'string') {
        tokens.add(data.fcmToken.trim());
      }

      // Tokens en subcolección 'tokens'
      try {
        const subTokensSnap = await db.collection('users').doc(userId).collection('tokens').get();
        subTokensSnap.forEach(tDoc => {
          const tData = tDoc.data();
          if (tData.token && typeof tData.token === 'string') {
            tokens.add(tData.token.trim());
          } else if (tDoc.id && tDoc.id.length > 20) {
            tokens.add(tDoc.id.trim());
          }
        });
      } catch (_) {
        // Ignorar si no existe la subcolección
      }

      users.push({
        id: userId,
        email: data.email || 'Sin email',
        name: data.name || data.displayName || 'Estudiante',
        role: data.role || 'student',
        tokens: Array.from(tokens)
      });
    }
  } catch (err) {
    console.error('❌ Error al consultar usuarios en Firestore:', err.message);
  }
  return users;
}

/**
 * Enviar mensaje push multicast mediante FCM
 */
async function sendFcmPush(tokens, title, body, dataPayload = {}) {
  if (!tokens || tokens.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const tokenList = Array.from(new Set(tokens.filter(Boolean)));
  const results = { sent: 0, failed: 0, invalidTokens: [] };
  const BATCH_SIZE = 500;

  for (let i = 0; i < tokenList.length; i += BATCH_SIZE) {
    const batch = tokenList.slice(i, i + BATCH_SIZE);
    const message = {
      tokens: batch,
      notification: {
        title,
        body
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title,
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [200, 100, 200],
          requireInteraction: false
        },
        fcmOptions: {
          link: '/'
        }
      },
      data: {
        ...dataPayload,
        title,
        body,
        timestamp: new Date().toISOString()
      }
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      results.sent += response.successCount;
      results.failed += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            results.invalidTokens.push(batch[idx]);
          }
        }
      });
    } catch (err) {
      console.error('❌ Error al enviar lote de notificaciones FCM:', err.message);
      results.failed += batch.length;
    }
  }

  return results;
}

/**
 * Limpieza de tokens inválidos o expirados en Firestore
 */
async function cleanInvalidTokens(invalidTokens, users) {
  if (!invalidTokens || invalidTokens.length === 0) return;

  console.log(`🧹 Limpiando ${invalidTokens.length} tokens inválidos/expirados...`);
  const invalidSet = new Set(invalidTokens);

  for (const user of users) {
    const tokensToRemove = user.tokens.filter(t => invalidSet.has(t));
    if (tokensToRemove.length > 0) {
      try {
        // Remover de users/{uid}
        await db.collection('users').doc(user.id).update({
          fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
        });

        // Remover de users/{uid}/tokens/{token}
        for (const tok of tokensToRemove) {
          try {
            await db.collection('users').doc(user.id).collection('tokens').doc(tok).delete();
          } catch (_) {}
        }
        console.log(`   ✓ Tokens eliminados del usuario ${user.email} (${user.id})`);
      } catch (err) {
        console.warn(`   ⚠️ No se pudo limpiar token para usuario ${user.id}:`, err.message);
      }
    }
  }
}

/**
 * Registrar mensaje en broadcast_notifications para la interfaz web en tiempo real
 */
async function recordBroadcast(title, body, extra = {}) {
  try {
    await db.collection('broadcast_notifications').add({
      title,
      body,
      ...extra,
      source: 'github-actions-worker',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('⚠️ No se pudo registrar broadcast en Firestore:', err.message);
  }
}

// ─── 3. Flujo Principal de Evaluación ─────────────────────────────────────────
async function runNotificationWorker() {
  const startTime = Date.now();
  console.log('====================================================');
  console.log('🚀 UCNL Actividades — Automated Notification Worker');
  console.log(`📅 Fecha/Hora: ${new Date().toISOString()} (${new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' })} Monterrey)`);
  console.log('====================================================');

  // 1. Obtener configuración
  const config = await getNotificationConfig();
  console.log('Configuración activa:', JSON.stringify(config, null, 2));

  // 2. Obtener usuarios y tokens
  const users = await getAllUsersWithTokens();
  const totalTokens = users.reduce((acc, u) => acc + u.tokens.length, 0);
  console.log(`👥 Usuarios registrados: ${users.length} (${totalTokens} tokens FCM activos en total)`);

  // 3. Obtener actividades pendientes
  const activitiesSnap = await db.collection('activities').get();
  const now = new Date();
  const pendingActivities = [];
  const dueIn7Days = [];
  const milestoneAlerts = [];

  activitiesSnap.forEach(docSnap => {
    const act = { id: docSnap.id, ...docSnap.data() };
    if (!act.dueDate || act.status === 'completed' || act.status === 'cancelled') return;

    const dueDate = new Date(act.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    pendingActivities.push({ ...act, daysLeft });

    // Actividades que vencen hoy o en los siguientes 7 días
    if (daysLeft >= 0 && daysLeft <= 7) {
      dueIn7Days.push({ ...act, daysLeft });
    }

    // Reglas de alerta por hito de urgencia
    if (daysLeft === 7 && config.notify7Days !== false) {
      milestoneAlerts.push({
        type: '7_days',
        title: `🟢 Recordatorio (7 días restantes): ${act.subject || 'Materia'}`,
        body: `La actividad "${act.title}" vence en 7 días (${act.dueDate.replace('T', ' ')}).`,
        activityId: act.id,
        daysLeft
      });
    } else if (daysLeft === 4 && config.notify4Days !== false) {
      milestoneAlerts.push({
        type: '4_days',
        title: `🟡 Recordatorio (4 días restantes): ${act.subject || 'Materia'}`,
        body: `Quedan 4 días para entregar "${act.title}" (${act.dueDate.replace('T', ' ')}).`,
        activityId: act.id,
        daysLeft
      });
    } else if (daysLeft <= 3 && daysLeft >= 0 && config.notify3DaysDaily !== false) {
      const urg = daysLeft === 0 ? '¡VENCE HOY!' : daysLeft === 1 ? '¡Vence mañana!' : `${daysLeft} días restantes`;
      milestoneAlerts.push({
        type: 'urgent',
        title: `🔴 Entrega Urgente (${urg}): ${act.subject || 'Materia'}`,
        body: `"${act.title}" debe entregarse pronto (${act.dueDate.replace('T', ' ')}).`,
        activityId: act.id,
        daysLeft
      });
    }
  });

  console.log(`📚 Total actividades en la base de datos: ${activitiesSnap.size}`);
  console.log(`📌 Actividades pendientes en los próximos 7 días: ${dueIn7Days.length}`);
  console.log(`🚨 Alertas de hitos específicas hoy: ${milestoneAlerts.length}`);

  let totalSent = 0;
  let totalFailed = 0;
  const invalidTokensCollected = [];

  // 4. Enviar Recordatorio Diario Personalizado (si está habilitado)
  if (config.daily7DaysReminderEnabled !== false && dueIn7Days.length > 0) {
    console.log('\n--- Evaluando recordatorios personalizados por alumno ---');
    let studentsNotified = 0;

    for (const user of users) {
      if (user.tokens.length === 0) continue;

      // Obtener completadas por el alumno
      let completedIds = new Set();
      try {
        const compSnap = await db.collection('users').doc(user.id).collection('completions').get();
        compSnap.forEach(cDoc => {
          const cData = cDoc.data();
          if (cData.status === 'completed' || cData.completed === true) {
            completedIds.add(cDoc.id);
          }
        });
      } catch (e) {
        console.warn(`No se pudieron consultar completions de ${user.id}:`, e.message);
      }

      // Filtrar pendientes para este usuario
      const userPending = dueIn7Days.filter(a => !completedIds.has(a.id));
      const pendingCount = userPending.length;

      if (pendingCount > 0) {
        let title = '';
        let body = '';

        if (pendingCount === 1) {
          const singleAct = userPending[0];
          const urg = singleAct.daysLeft === 0 ? '¡Vence hoy!' : singleAct.daysLeft === 1 ? '¡Vence mañana!' : `Vence en ${singleAct.daysLeft} días`;
          title = `📚 Tienes 1 actividad pendiente (Próximos 7 días)`;
          body = `"${singleAct.title}" (${singleAct.subject || 'Materia'}) - ${urg} (${singleAct.dueDate?.replace('T', ' ')}).`;
        } else {
          title = `📚 Tienes ${pendingCount} actividades pendientes (Próximos 7 días)`;
          const sample = userPending.slice(0, 2).map(a => `"${a.title}"`).join(', ');
          const more = pendingCount > 2 ? ` y ${pendingCount - 2} más.` : '.';
          body = `Tienes ${pendingCount} tareas por entregar en los próximos 7 días: ${sample}${more}`;
        }

        const pushRes = await sendFcmPush(user.tokens, title, body, {
          type: 'daily_7days_reminder',
          pendingCount: String(pendingCount)
        });

        totalSent += pushRes.sent;
        totalFailed += pushRes.failed;
        invalidTokensCollected.push(...pushRes.invalidTokens);
        studentsNotified++;
        console.log(`   ✉️ Notificado ${user.name} (${user.email}): ${pendingCount} pendientes -> ${pushRes.sent} enviado(s)`);
      }
    }

    console.log(`✅ Recordatorio diario personalizado completado: ${studentsNotified} alumnos notificados.`);

    // Registrar en broadcast para el feed web
    await recordBroadcast(
      `📚 Recordatorio Diario: ${dueIn7Days.length} actividades próximas a cerrar`,
      `Hay actividades escolares programadas para entrega en los próximos 7 días. ¡Revisa tu estado en el tablero!`,
      { type: 'daily_7days_reminder', count: dueIn7Days.length }
    );
  }

  // 5. Enviar Alertas de Hitos Específicos solo si el recordatorio diario consolidado no está habilitado
  if (config.daily7DaysReminderEnabled === false && milestoneAlerts.length > 0) {
    console.log('\n--- Enviando alertas de hitos de vencimiento (modo individual) ---');
    const allTokens = users.flatMap(u => u.tokens);

    for (const alert of milestoneAlerts) {
      console.log(`   🚨 Enviando alerta: "${alert.title}"`);
      const pushRes = await sendFcmPush(allTokens, alert.title, alert.body, {
        type: alert.type,
        activityId: alert.activityId,
        daysLeft: String(alert.daysLeft)
      });

      totalSent += pushRes.sent;
      totalFailed += pushRes.failed;
      invalidTokensCollected.push(...pushRes.invalidTokens);

      await recordBroadcast(alert.title, alert.body, {
        type: 'due_alert',
        activityId: alert.activityId,
        daysLeft: alert.daysLeft
      });
    }
  }

  // 6. Limpieza de tokens si hubo fallos
  if (invalidTokensCollected.length > 0) {
    await cleanInvalidTokens(invalidTokensCollected, users);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n====================================================');
  console.log(`🎉 Resumen de Ejecución (${durationSec}s):`);
  console.log(`   • Pushes enviados con éxito: ${totalSent}`);
  console.log(`   • Pushes fallidos:           ${totalFailed}`);
  console.log(`   • Tokens depurados:          ${invalidTokensCollected.length}`);
  console.log('====================================================\n');
}

// Ejecutar
runNotificationWorker()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error no controlado en el worker:', err);
    process.exit(1);
  });
