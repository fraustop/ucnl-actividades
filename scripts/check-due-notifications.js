import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Flags de ejecución por línea de comandos o GitHub Actions
const isForce = process.argv.includes('--force') || process.env.INPUT_FORCE === 'true' || process.env.FORCE_RUN === 'true';
const isDryRun = process.argv.includes('--dry-run');

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
 * Obtiene la fecha y hora actual en la zona horaria de Monterrey / Centro de México
 */
function getMonterreyDateTime() {
  const now = new Date();
  
  // Formato YYYY-MM-DD
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Monterrey',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  // Formato HH:MM (24 horas)
  const timeFormatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Monterrey',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const timeParts = timeFormatter.format(now);
  const [hourStr, minuteStr] = timeParts.split(':');
  const currentHour = parseInt(hourStr, 10);
  const currentMinute = parseInt(minuteStr, 10);

  return {
    todayStr: dateParts, // e.g. "2026-09-21"
    timeStr: timeParts,  // e.g. "08:00"
    currentHour,
    currentMinute,
    iso: now.toISOString()
  };
}

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
    notifyNewUserToAdmins: true,
    lastDailyReminderDate: null
  };

  try {
    const docSnap = await db.collection('config').doc('notifications').get();
    if (docSnap.exists) {
      const data = docSnap.data();
      console.log('⚙️ Configuración cargada desde Firestore (config/notifications).');
      return { ...defaults, ...data };
    } else {
      console.log('ℹ️ No existía config/notifications en Firestore, inicializando con valores por defecto.');
      await db.collection('config').doc('notifications').set({
        ...defaults,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return defaults;
    }
  } catch (err) {
    console.warn('⚠️ No se pudo cargar config/notifications, usando valores por defecto:', err.message);
    return defaults;
  }
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
        data.fcmTokens.forEach(t => t && typeof t === 'string' && t.trim().length > 15 && tokens.add(t.trim()));
      }
      // Token único legado o lastFcmToken
      if (data.lastFcmToken && typeof data.lastFcmToken === 'string' && data.lastFcmToken.trim().length > 15) {
        tokens.add(data.lastFcmToken.trim());
      }
      if (data.fcmToken && typeof data.fcmToken === 'string' && data.fcmToken.trim().length > 15) {
        tokens.add(data.fcmToken.trim());
      }

      // Tokens en subcolección 'tokens'
      try {
        const subTokensSnap = await db.collection('users').doc(userId).collection('tokens').get();
        subTokensSnap.forEach(tDoc => {
          const tData = tDoc.data();
          if (tData.token && typeof tData.token === 'string' && tData.token.trim().length > 15) {
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

  if (isDryRun) {
    console.log(`   [DRY-RUN] Simulado envío de push a ${tokenList.length} token(s): "${title}"`);
    return { sent: tokenList.length, failed: 0, invalidTokens: [] };
  }

  const BATCH_SIZE = 500;

  for (let i = 0; i < tokenList.length; i += BATCH_SIZE) {
    const batch = tokenList.slice(i, i + BATCH_SIZE);
    const message = {
      tokens: batch,
      notification: {
        title,
        body
      },
      android: {
        collapseKey: 'ucnl_daily_due',
        priority: 'high',
        notification: {
          tag: 'ucnl_daily_reminder',
          icon: 'icon_notification',
          color: '#2563eb'
        }
      },
      webpush: {
        headers: {
          Urgency: 'high',
          Topic: 'ucnl_daily_due'
        },
        notification: {
          title,
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [200, 100, 200],
          requireInteraction: false,
          tag: 'ucnl_daily_reminder',
          renotify: false
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

// ─── 3. Flujo Principal del Worker Automatizado ──────────────────────────────
async function runNotificationWorker() {
  const startTime = Date.now();
  const mty = getMonterreyDateTime();

  console.log('====================================================');
  console.log('🚀 UCNL Actividades — Automated Notification Worker');
  console.log(`📅 Fecha/Hora Actual: ${mty.todayStr} ${mty.timeStr} (Zona Horaria Monterrey UTC-6)`);
  if (isForce) console.log('⚡ Modo FORZADO activado (--force). Se omitirán comprobaciones de hora y fecha.');
  if (isDryRun) console.log('🧪 Modo DRY-RUN activado. No se enviarán mensajes reales.');
  console.log('====================================================');

  // 1. Obtener configuración activa de Firestore
  const config = await getNotificationConfig();
  const configuredHourStr = config.notificationHour || '08:00';
  const configuredHour = parseInt(configuredHourStr.split(':')[0] || '8', 10);

  console.log(`⚙️ Configuración activa:`);
  console.log(`   • Recordatorio diario activo: ${config.daily7DaysReminderEnabled !== false}`);
  console.log(`   • Hora programada:            ${configuredHourStr} (Hora ${configuredHour}:00)`);
  console.log(`   • Última fecha enviada:       ${config.lastDailyReminderDate || 'Ninguna'}`);

  // 2. Comprobar si el recordatorio diario está habilitado
  if (config.daily7DaysReminderEnabled === false && !isForce) {
    console.log('\n⏹️ El recordatorio diario está DESACTIVADO en la configuración. Finalizando.');
    return;
  }

  // 3. Comprobar si coincide la hora programada
  const hourMatches = mty.currentHour === configuredHour;
  if (!hourMatches && !isForce) {
    console.log(`\n⏳ Hora actual (${mty.timeStr}) no coincide con la hora programada (${configuredHourStr}).`);
    console.log(`   El worker continuará esperando a las ${configuredHourStr} en las siguientes ejecuciones horarias.`);
    return;
  }

  // 4. Comprobar si ya se envió hoy para garantizar estrictamente 1 sola notificación al día
  if (config.lastDailyReminderDate === mty.todayStr && !isForce) {
    console.log(`\n✅ El recordatorio diario ya fue enviado el día de hoy (${mty.todayStr}).`);
    console.log(`   Omitiendo para evitar duplicidad. Se enviará nuevamente mañana a las ${configuredHourStr}.`);
    return;
  }

  console.log('\n🎯 Condiciones cumplidas: Iniciando evaluación de actividades escolares...');

  // 5. Obtener usuarios y tokens
  const users = await getAllUsersWithTokens();
  const totalTokens = users.reduce((acc, u) => acc + u.tokens.length, 0);
  console.log(`👥 Usuarios registrados: ${users.length} (${totalTokens} dispositivos/tokens FCM activos)`);

  // 6. Obtener actividades de Firestore
  const activitiesSnap = await db.collection('activities').get();
  const now = new Date();
  const dueIn7Days = [];

  activitiesSnap.forEach(docSnap => {
    const act = { id: docSnap.id, ...docSnap.data() };
    if (!act.dueDate || act.status === 'completed' || act.status === 'cancelled') return;

    const dueDate = new Date(act.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Actividades que vencen en los próximos 7 días (días restantes >= 0 y <= 7)
    if (daysLeft >= 0 && daysLeft <= 7) {
      dueIn7Days.push({ ...act, daysLeft });
    }
  });

  console.log(`📚 Total actividades en base de datos: ${activitiesSnap.size}`);
  console.log(`📌 Actividades próximas a vencer en los siguientes 7 días: ${dueIn7Days.length}`);

  let totalSent = 0;
  let totalFailed = 0;
  let studentsNotified = 0;
  const invalidTokensCollected = [];

  if (dueIn7Days.length === 0) {
    console.log('✅ No hay actividades pendientes en los próximos 7 días. No se requieren recordatorios hoy.');
  } else {
    // 7. Enviar 1 notificación diaria personalizada por cada estudiante
    console.log('\n--- Enviando notificación diaria personalizada por estudiante ---');

    for (const user of users) {
      if (user.tokens.length === 0) continue;

      // Obtener tareas marcadas como completadas por este estudiante
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

      // Filtrar actividades que este estudiante aún NO ha completado
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
        console.log(`   ✉️ Notificado ${user.name} (${user.email}): ${pendingCount} pendientes -> ${pushRes.sent} push(es)`);
      }
    }
  }

  // 8. Limpiar tokens inválidos encontrados
  if (invalidTokensCollected.length > 0) {
    await cleanInvalidTokens(invalidTokensCollected, users);
  }

  // 9. Registrar fecha de ejecución exitosa en Firestore para no repetir hoy
  if (!isDryRun) {
    try {
      await db.collection('config').doc('notifications').set({
        lastDailyReminderDate: mty.todayStr,
        lastDailyReminderTimestamp: new Date().toISOString(),
        lastExecutionStudentsCount: studentsNotified,
        lastExecutionPushesSent: totalSent,
        lastExecutionStatus: 'success'
      }, { merge: true });
      console.log(`\n💾 Registro diario guardado en Firestore: lastDailyReminderDate = "${mty.todayStr}"`);
    } catch (err) {
      console.warn('⚠️ No se pudo actualizar lastDailyReminderDate en Firestore:', err.message);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n====================================================');
  console.log(`🎉 Resumen de Ejecución Finalizada (${durationSec}s):`);
  console.log(`   • Estudiantes con pendientes: ${studentsNotified}`);
  console.log(`   • Notificaciones push enviadas: ${totalSent}`);
  console.log(`   • Envíos fallidos:             ${totalFailed}`);
  console.log(`   • Tokens inválidos limpiados:  ${invalidTokensCollected.length}`);
  console.log('====================================================\n');
}

// Ejecutar worker
runNotificationWorker()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error no controlado en el worker:', err);
    process.exit(1);
  });
