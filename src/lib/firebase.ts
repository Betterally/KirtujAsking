// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// TODO: BU BİLGİLERİ KENDİ FIREBASE PROJE AYARLARINIZLA DEĞİŞTİRİN!
// Firebase konsolunda projenizi oluşturduktan sonra Ayarlar > Proje Ayarları kısmından bu bilgileri alabilirsiniz.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Firebase SDK API Key
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // Projenizin authDomain'i
  projectId: "YOUR_PROJECT_ID", // Projenizin ID'si
  storageBucket: "YOUR_PROJECT_ID.appspot.com", // Projenizin storageBucket'ı
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Mesajlaşma gönderen ID'si
  appId: "YOUR_APP_ID", // Uygulama ID'niz
  // measurementId: "G-YOUR_MEASUREMENT_ID" // Google Analytics için (opsiyonel)
};

// Firebase'i başlat
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);

export { db, app };
