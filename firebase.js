import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, get, remove, query, orderByChild, limitToLast }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZsWW8sKosivJD8jGIE19cq6NL-zbIa6U",
  authDomain: "app-eta-6320b.firebaseapp.com",
  databaseURL: "https://app-eta-6320b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "app-eta-6320b",
  storageBucket: "app-eta-6320b.firebasestorage.app",
  messagingSenderId: "24326511208",
  appId: "1:24326511208:web:6980d4e17959b08e02f9dd",
  measurementId: "G-JLV56QTXYV"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function getDeviceId() {
  let id = localStorage.getItem('paypal_device_id');
  if (!id) {
    id = 'device_' + Math.random().toString(36).substr(2, 12) + Date.now();
    localStorage.setItem('paypal_device_id', id);
  }
  return id;
}

window.saveHistoryFirebase = async function(result) {
  try {
    const deviceId = getDeviceId();
    await push(ref(db, `history/${deviceId}`), {
      date: new Date().toISOString(),
      dateDisplay: new Date().toLocaleString('vi-VN'),
      correct: result.correct,
      total: result.total,
      pct: result.pct,
      time: result.timeStr,
      createdAt: Date.now()
    });
  } catch (e) {
    console.warn('Firebase save failed:', e);
  }
};

window.getHistoryFirebase = async function() {
  try {
    const deviceId = getDeviceId();
    const snapshot = await get(ref(db, `history/${deviceId}`));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.values(data).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  } catch (e) {
    console.warn('Firebase get failed:', e);
    return null;
  }
};

window.clearHistoryFirebase = async function() {
  try {
    const deviceId = getDeviceId();
    await remove(ref(db, `history/${deviceId}`));
    return true;
  } catch (e) {
    console.warn('Firebase delete failed:', e);
    return false;
  }
};

console.log('Firebase Realtime DB ready, deviceId:', getDeviceId());
