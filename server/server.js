const express = require('express');
const cors = require('cors');
const os = require('os');
const axios = require('axios');
const cron = require('node-cron');
const admin = require('firebase-admin');
const path = require('path');

// ─── Inicializar Firebase Admin SDK con Service Account ──────────────────────
const serviceAccountPath = path.join(__dirname, 'ucnl-actividades-firebase-adminsdk-fbsvc-667f99f82f.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();
const messaging = admin.messaging();

// ─── Express ─────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Estado del Servidor ──────────────────────────────────────────────────────
let externalIp = 'Detectando...';
let localIp = '127.0.0.1';
let startTime = new Date();
let lastEvaluatedDueCount = 0;
let lastSentCount = 0;

// Configuración activa de recordatorios
let currentConfig = {
  daily7DaysReminderEnabled: true,
  notificationHour: '08:00',
  notify7Days: true,
  notify4Days: true,
  notify3DaysDaily: true,
  notifyNewActivity: true,
  notifyNewUserToAdmins: true
};

let daily7DaysCronJob = null;
let periodicCronJob = null;

// ─── Utilidades de Red ────────────────────────────────────────────────────────
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

async function fetchExternalIp() {
  try {
    const res = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
    if (res.data?.ip) { externalIp = res.data.ip; return externalIp; }
  } catch (_) {
    try {
      const res2 = await axios.get('https://ifconfig.me/ip', { timeout: 5000 });
      if (res2.data) { externalIp = res2.data.trim(); return externalIp; }
    } catch (e) {
      externalIp = '148.230.165.236';
    }
  }
  return externalIp;
}

// ─── FCM: Obtener todos los tokens registrados ────────────────────────────────
async function getAllFcmTokens(role = 'all') {
  const tokens = [];
  try {
    const snap = await db.collection('users').get();
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (role !== 'all' && data.role !== role) return;

      if (Array.isArray(data.fcmTokens)) {
        data.fcmTokens.forEach((tok) => {
          if (tok && !tokens.some(t => t.token === tok)) {
            tokens.push({ token: tok, userId: docSnap.id, email: data.email, role: data.role });
          }
        });
      } else if (data.fcmToken) {
        if (!tokens.some(t => t.token === data.fcmToken)) {
          tokens.push({ token: data.fcmToken, userId: docSnap.id, email: data.email, role: data.role });
        }
      }
    });
  } catch (err) {
    console.error('❌ Error al obtener tokens FCM:', err.message);
  }
  return tokens;
}

// ─── FCM: Enviar push a múltiples tokens ─────────────────────────────────────
async function sendFcmPushToTokens(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    console.log('⚠️ No hay tokens FCM registrados para enviar.');
    return { sent: 0, failed: 0, errors: [] };
  }

  const results = { sent: 0, failed: 0, errors: [] };
  const tokenStrings = tokens.map(t => (typeof t === 'string' ? t : t.token)).filter(Boolean);

  const BATCH_SIZE = 500;
  for (let i = 0; i < tokenStrings.length; i += BATCH_SIZE) {
    const batch = tokenStrings.slice(i, i + BATCH_SIZE);
    const message = {
      tokens: batch,
      notification: { title, body },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          title,
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [200, 100, 200],
          requireInteraction: false,
        },
        fcmOptions: { link: '/' }
      },
      data: { ...data, title, body }
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      results.sent += response.successCount;
      results.failed += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/registration-token-not-registered') {
            results.errors.push({ token: batch[idx], error: errCode });
          }
        }
      });
    } catch (err) {
      console.error('❌ Error al enviar lote FCM:', err.message);
      results.failed += batch.length;
    }
  }

  console.log(`📨 FCM: ${results.sent} enviados, ${results.failed} fallidos.`);
  return results;
}

// ─── Firestore: escribir en broadcast_notifications (para banner in-app) ──────
async function writeBroadcast(title, body, extra = {}) {
  try {
    await db.collection('broadcast_notifications').add({
      title,
      body,
      ...extra,
      serverIp: externalIp,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('⚠️ No se pudo escribir broadcast en Firestore:', err.message);
  }
}

// ─── Recordatorio Diario de Actividades Pendientes (Próximos 7 Días) ─────────
async function evaluateDaily7DaysReminders() {
  console.log(`[${new Date().toLocaleTimeString()}] 📚 Evaluando recordatorio diario de actividades pendientes (próximos 7 días)...`);
  const now = new Date();
  const results = { totalEvaluated: 0, activitiesInNext7Days: 0, studentsNotified: 0, totalSent: 0 };

  try {
    const activitiesSnap = await db.collection('activities').get();
    const dueIn7Days = [];

    activitiesSnap.forEach((docSnap) => {
      const act = { id: docSnap.id, ...docSnap.data() };
      if (!act.dueDate || act.status === 'completed' || act.status === 'cancelled') return;

      const dueDate = new Date(act.dueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Actividades que vencen hoy o en los próximos 7 días (0 <= daysLeft <= 7)
      if (daysLeft >= 0 && daysLeft <= 7) {
        dueIn7Days.push({ ...act, daysLeft });
      }
    });

    results.totalEvaluated = activitiesSnap.size;
    results.activitiesInNext7Days = dueIn7Days.length;

    console.log(`📌 Encontradas ${dueIn7Days.length} actividades que cierran en los próximos 7 días.`);

    if (dueIn7Days.length === 0) {
      console.log('✅ No hay actividades próximas a vencer en los siguientes 7 días.');
      return { success: true, message: 'No hay actividades pendientes en los próximos 7 días.', results };
    }

    // Obtener usuarios para evaluar completitud personalizada
    const usersSnap = await db.collection('users').get();
    const allTokensHandled = new Set();

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Extraer tokens del usuario
      const userTokens = [];
      if (Array.isArray(userData.fcmTokens)) {
        userData.fcmTokens.forEach(t => t && userTokens.push(t));
      } else if (userData.fcmToken) {
        userTokens.push(userData.fcmToken);
      }

      if (userTokens.length === 0) continue;
      userTokens.forEach(t => allTokensHandled.add(t));

      // Consultar completados personales del estudiante
      const completionsSnap = await db.collection('users').doc(userId).collection('completions').get();
      const completedIds = new Set();
      completionsSnap.forEach(c => {
        const cData = c.data();
        if (cData.status === 'completed' || cData.completed === true) {
          completedIds.add(c.id);
        }
      });

      // Filtrar actividades pendientes para este alumno
      const pendingForStudent = dueIn7Days.filter(a => !completedIds.has(a.id));
      const pendingCount = pendingForStudent.length;

      if (pendingCount > 0) {
        let title = '';
        let body = '';

        if (pendingCount === 1) {
          const singleAct = pendingForStudent[0];
          const urg = singleAct.daysLeft === 0 ? '¡Vence hoy!' : singleAct.daysLeft === 1 ? '¡Vence mañana!' : `Vence en ${singleAct.daysLeft} días`;
          title = `📚 Tienes 1 actividad pendiente (Próximos 7 días)`;
          body = `"${singleAct.title}" (${singleAct.subject || 'Materia'}) - ${urg} (${singleAct.dueDate?.replace('T', ' ')}).`;
        } else {
          title = `📚 Tienes ${pendingCount} actividades pendientes (Próximos 7 días)`;
          const sample = pendingForStudent.slice(0, 2).map(a => `"${a.title}"`).join(', ');
          const more = pendingCount > 2 ? ` y ${pendingCount - 2} más.` : '.';
          body = `Tienes ${pendingCount} tareas por entregar en los próximos 7 días: ${sample}${more}`;
        }

        const pushRes = await sendFcmPushToTokens(userTokens, title, body, {
          type: 'daily_7days_reminder',
          pendingCount: String(pendingCount)
        });

        results.studentsNotified++;
        results.totalSent += pushRes.sent;
      }
    }

    // Notificación en broadcast de Firestore para visualización en tiempo real
    const summaryTitle = `📚 Recordatorio Diario: ${dueIn7Days.length} actividades próximas a cerrar`;
    const summaryBody = `Hay actividades escolares programadas para entrega en los próximos 7 días. ¡Revisa tu estado en el tablero!`;
    await writeBroadcast(summaryTitle, summaryBody, {
      type: 'daily_7days_reminder',
      count: dueIn7Days.length
    });

    lastEvaluatedDueCount = dueIn7Days.length;
    lastSentCount = results.totalSent;

    console.log(`✅ Recordatorio diario completado: ${results.studentsNotified} estudiantes notificados (${results.totalSent} pushes enviados).`);
    return { success: true, results };
  } catch (err) {
    console.error('❌ Error en evaluateDaily7DaysReminders:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Evaluación clásica por reglas de urgencia ────────────────────────────────
async function evaluateDueActivities() {
  console.log(`[${new Date().toLocaleTimeString()}] 🔍 Evaluando fechas límite por regla de días...`);
  const now = new Date();
  const alerts = [];

  try {
    const activitiesSnap = await db.collection('activities').get();
    const activities = [];
    activitiesSnap.forEach(d => activities.push({ id: d.id, ...d.data() }));

    activities.forEach((act) => {
      if (!act.dueDate || act.status === 'completed' || act.status === 'cancelled') return;
      const dueDate = new Date(act.dueDate);
      const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      let title = '', body = '';
      if (daysLeft === 7 && currentConfig.notify7Days !== false) {
        title = `🟢 Recordatorio (7 días): ${act.subject || 'Materia'}`;
        body = `"${act.title}" vence en 7 días.`;
      } else if (daysLeft === 4 && currentConfig.notify4Days !== false) {
        title = `🟡 Recordatorio (4 días): ${act.subject || 'Materia'}`;
        body = `Quedan 4 días para entregar "${act.title}".`;
      } else if (daysLeft <= 3 && daysLeft >= 0 && currentConfig.notify3DaysDaily !== false) {
        const urg = daysLeft === 0 ? '¡VENCE HOY!' : daysLeft === 1 ? '¡Vence mañana!' : `${daysLeft} días`;
        title = `🔴 Entrega Urgente (${urg}): ${act.subject || 'Materia'}`;
        body = `"${act.title}" vence pronto (${act.dueDate?.replace('T', ' ')}).`;
      }

      if (title) alerts.push({ title, body, activityId: act.id, daysLeft });
    });

    lastEvaluatedDueCount = alerts.length;
    console.log(`✅ ${alerts.length} alertas de vencimiento encontradas.`);

    if (alerts.length > 0) {
      const allTokens = await getAllFcmTokens('all');
      for (const alert of alerts) {
        await sendFcmPushToTokens(allTokens, alert.title, alert.body, { activityId: alert.activityId });
        await writeBroadcast(alert.title, alert.body, { type: 'due', activityId: alert.activityId });
      }
      lastSentCount = alerts.length;
    }

    return { success: true, evaluatedAt: new Date().toISOString(), activitiesEvaluated: activities.length, alertsFound: alerts.length, alerts };
  } catch (err) {
    console.error('❌ Error evaluando vencimientos:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Programador Dinámico de Cron ─────────────────────────────────────────────
function updateCronSchedules(newConfig = {}) {
  currentConfig = { ...currentConfig, ...newConfig };

  if (daily7DaysCronJob) {
    daily7DaysCronJob.stop();
    daily7DaysCronJob = null;
  }

  const isEnabled = currentConfig.daily7DaysReminderEnabled !== false;
  const hourStr = currentConfig.notificationHour || '08:00';
  const [hStr, mStr] = hourStr.split(':');
  const hour = parseInt(hStr || '8', 10);
  const minute = parseInt(mStr || '0', 10);
  const cronExpr = `${minute} ${hour} * * *`;

  if (isEnabled) {
    console.log(`⏰ [CRON] Programado recordatorio diario de 7 días: "${hourStr}" (${cronExpr}) [America/Monterrey / Sistema]`);
    daily7DaysCronJob = cron.schedule(cronExpr, async () => {
      console.log(`⏰ [CRON ${hourStr}] Disparando recordatorio diario de actividades pendientes...`);
      await evaluateDaily7DaysReminders();
    });
  } else {
    console.log('⏰ [CRON] Recordatorio diario de 7 días está DESACTIVADO en la configuración.');
  }

  // Programar chequeo periódico cada 2 horas si no existe
  if (!periodicCronJob) {
    periodicCronJob = cron.schedule('0 */2 * * *', async () => {
      console.log('⏰ [CRON Periódico] Revisión de actividades cada 2h...');
      await evaluateDueActivities();
    });
  }
}

function listenToNotificationConfig() {
  try {
    db.collection('config').doc('notifications').onSnapshot((snap) => {
      if (snap.exists) {
        const data = snap.data();
        console.log('⚙️ Configuración de notificaciones actualizada desde Firestore:', data);
        updateCronSchedules(data);
      } else {
        updateCronSchedules();
      }
    }, (err) => {
      console.warn('⚠️ Listener de config/notifications:', err.message);
    });
  } catch (err) {
    console.warn('⚠️ No se pudo iniciar listener de config:', err.message);
    updateCronSchedules();
  }
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/status
app.get('/api/status', async (req, res) => {
  const tokens = await getAllFcmTokens('all');
  const uptimeSec = Math.floor((new Date() - startTime) / 1000);
  res.json({
    status: 'online',
    name: 'UCNL Notifications Backend (Admin SDK + FCM)',
    externalIp,
    localIp,
    port: PORT,
    fullExternalUrl: `http://${externalIp}:${PORT}`,
    fullLocalUrl: `http://${localIp}:${PORT}`,
    uptimeSeconds: uptimeSec,
    uptimeHuman: `${Math.floor(uptimeSec/3600)}h ${Math.floor((uptimeSec%3600)/60)}m ${uptimeSec%60}s`,
    registeredDevicesCount: tokens.length,
    config: currentConfig,
    activeSchedule: {
      daily7DaysReminderEnabled: currentConfig.daily7DaysReminderEnabled !== false,
      notificationHour: currentConfig.notificationHour || '08:00'
    },
    lastEvaluatedDueCount,
    lastSentCount,
    timestamp: new Date().toISOString()
  });
});

// POST /api/notify/daily-7days  — Disparar manualmente el recordatorio diario de 7 días
app.post('/api/notify/daily-7days', async (req, res) => {
  console.log('[API POST /api/notify/daily-7days] Ejecutando recordatorio diario de 7 días manualmente...');
  const result = await evaluateDaily7DaysReminders();
  res.json(result);
});

// POST /api/notify/due  — Evaluar vencimientos manualmente
app.post('/api/notify/due', async (req, res) => {
  const result = await evaluateDueActivities();
  res.json(result);
});

// POST /api/notify/test  — Notificación de prueba (FCM real)
app.post('/api/notify/test', async (req, res) => {
  const { title, body } = req.body || {};
  const notifTitle = title || '🔔 UCNL Actividades - Prueba Remota';
  const notifBody  = body  || `Notificación FCM real desde el servidor ${externalIp}`;

  console.log(`[TEST] Enviando notificación de prueba FCM: "${notifTitle}"`);

  const allTokens = await getAllFcmTokens('all');
  const fcmResult = await sendFcmPushToTokens(allTokens, notifTitle, notifBody, { type: 'test' });
  await writeBroadcast(notifTitle, notifBody, { type: 'test' });

  res.json({
    success: true,
    message: 'Notificación FCM enviada y broadcast escrito en Firestore.',
    title: notifTitle,
    body: notifBody,
    tokensFound: allTokens.length,
    fcmResult,
    serverIp: externalIp,
    timestamp: new Date().toISOString()
  });
});

// POST /api/notify/broadcast  — Difusión general
app.post('/api/notify/broadcast', async (req, res) => {
  const { title, body, role = 'all', url = '/' } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'Se requiere "title" y "body".' });

  console.log(`[BROADCAST] "${title}" → rol: ${role}`);

  const tokens = await getAllFcmTokens(role);
  const fcmResult = await sendFcmPushToTokens(tokens, title, body, { type: 'broadcast', url });
  await writeBroadcast(title, body, { type: 'broadcast', role, url });

  res.json({
    success: true,
    message: `Difusión enviada a rol: ${role}`,
    title, body, role,
    tokensFound: tokens.length,
    fcmResult,
    timestamp: new Date().toISOString()
  });
});

// GET /  — Página de estado
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>UCNL Backend</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;padding:2rem}
  .card{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:2rem;max-width:600px;margin:0 auto}
  h1{color:#38bdf8;margin-top:0}
  .badge{padding:.25rem .75rem;border-radius:9999px;font-weight:bold;font-size:.75rem;text-transform:uppercase}
  .green{background:#065f46;color:#34d399}
  .ip{background:#0f172a;border-radius:.5rem;padding:1rem;font-family:monospace;color:#a5f3fc;margin:1rem 0;word-break:break-all}
  .btn{background:#2563eb;color:#fff;border:none;padding:.6rem 1.2rem;border-radius:.5rem;font-weight:bold;cursor:pointer;text-decoration:none;display:inline-block;margin-top:1rem}
</style></head>
<body><div class="card">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <h1>UCNL Backend Service</h1>
    <span class="badge green">Admin SDK + FCM</span>
  </div>
  <p style="color:#94a3b8">Notificaciones push reales vía Firebase Admin SDK y FCM.</p>
  <div class="ip">
    <div><strong>IP Externa:</strong> ${externalIp}</div>
    <div><strong>IP Local:</strong> ${localIp}</div>
    <div><strong>Puerto:</strong> ${PORT}</div>
    <div><strong>Hora Recordatorio Diario:</strong> ${currentConfig.notificationHour || '08:00'} (${currentConfig.daily7DaysReminderEnabled !== false ? 'Activo' : 'Desactivado'})</div>
    <div><strong>API:</strong> http://${externalIp}:${PORT}/api/status</div>
  </div>
  <a class="btn" href="/api/status" target="_blank">Ver /api/status</a>
</div></body></html>`);
});

// ─── Arranque del Servidor ────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  localIp = getLocalNetworkIp();
  await fetchExternalIp();

  console.log('====================================================');
  console.log('🚀 SERVIDOR UCNL — Firebase Admin SDK + FCM Real');
  console.log('====================================================');
  console.log(`🌐 IP Externa:   http://${externalIp}:${PORT}`);
  console.log(`🏠 IP Local LAN: http://${localIp}:${PORT}`);
  console.log(`💻 Localhost:    http://localhost:${PORT}`);
  console.log(`📡 API Status:   http://${externalIp}:${PORT}/api/status`);
  console.log('====================================================');

  listenToNotificationConfig();
});
