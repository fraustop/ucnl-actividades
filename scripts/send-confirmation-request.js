import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar credenciales locales o desde variable de entorno
let serviceAccount = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  const localCandidates = [
    path.join(__dirname, '..', 'server', 'ucnl-actividades-firebase-adminsdk-fbsvc-667f99f82f.json'),
    path.join(__dirname, '..', 'ucnl-actividades-firebase-adminsdk-fbsvc-667f99f82f.json')
  ];
  for (const loc of localCandidates) {
    if (fs.existsSync(loc)) {
      serviceAccount = JSON.parse(fs.readFileSync(loc, 'utf-8'));
      break;
    }
  }
}

if (!serviceAccount) {
  console.error('❌ No se encontraron credenciales de Firebase Admin SDK.');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const messaging = getMessaging();

async function sendConfirmationRequestPush() {
  console.log('====================================================');
  console.log('📣 Enviando Notificación de Confirmación a Usuarios Registrados');
  console.log('====================================================');

  const title = 'UCNL-Actividades en linea';
  const body = 'Si recibiste esta notificacion dale clic en confirmar, esto ayudará a asgurarme que todos los usuarios de la aplicaicon esten al día con sus tareas.';

  // 1. Obtener todos los tokens FCM registrados
  const usersSnap = await db.collection('users').get();
  const allTokens = new Set();
  const targetedUsers = [];

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const userTokens = new Set();

    if (Array.isArray(data.fcmTokens)) {
      data.fcmTokens.forEach(t => t && userTokens.add(t));
    }
    if (data.lastFcmToken) userTokens.add(data.lastFcmToken);
    if (data.fcmToken) userTokens.add(data.fcmToken);

    try {
      const subSnap = await db.collection('users').doc(doc.id).collection('tokens').get();
      subSnap.forEach(s => {
        const sData = s.data();
        if (sData.token) userTokens.add(sData.token);
        else if (s.id && s.id.length > 20) userTokens.add(s.id);
      });
    } catch (_) {}

    if (userTokens.size > 0) {
      userTokens.forEach(t => allTokens.add(t));
      targetedUsers.push({
        id: doc.id,
        name: data.displayName || data.name || 'Estudiante',
        email: data.email,
        tokenCount: userTokens.size
      });
    }
  }

  const tokenList = Array.from(allTokens);
  console.log(`📱 Encontrados ${tokenList.length} dispositivos en ${targetedUsers.length} usuarios con notificaciones activas:`);
  targetedUsers.forEach(u => console.log(`   • ${u.name} (${u.email}): ${u.tokenCount} token(s)`));

  if (tokenList.length === 0) {
    console.log('⚠️ No hay tokens FCM registrados.');
    return;
  }

  // 2. Enviar Multicast con FCM
  const BATCH_SIZE = 500;
  let totalSent = 0;
  let totalFailed = 0;

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
          requireInteraction: true,
          actions: [
            {
              action: 'confirm_notification',
              title: '✅ Confirmar'
            }
          ]
        },
        fcmOptions: {
          link: '/?action=confirm_notification'
        }
      },
      data: {
        type: 'notification_confirmation_request',
        url: '/?action=confirm_notification',
        title,
        body,
        timestamp: new Date().toISOString()
      }
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      totalSent += response.successCount;
      totalFailed += response.failureCount;
      console.log(`📨 Lote enviado: ${response.successCount} exitosos, ${response.failureCount} fallidos.`);
    } catch (err) {
      console.error('❌ Error al enviar lote:', err.message);
      totalFailed += batch.length;
    }
  }

  // 3. Registrar en broadcast_notifications para la interfaz en vivo
  try {
    await db.collection('broadcast_notifications').add({
      title,
      body,
      type: 'notification_confirmation_request',
      url: '/?action=confirm_notification',
      createdAt: new Date().toISOString()
    });
    console.log('📝 Broadcast registrado en Firestore para los usuarios activos.');
  } catch (err) {
    console.warn('⚠️ No se pudo registrar broadcast:', err.message);
  }

  console.log('\n====================================================');
  console.log(`🎉 Envío completado: ${totalSent} entregados con éxito, ${totalFailed} fallidos.`);
  console.log('====================================================');
}

sendConfirmationRequestPush()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
