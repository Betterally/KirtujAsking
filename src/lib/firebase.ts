
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase projenizden alınan gerçek yapılandırma bilgileri
// Kullanıcı tarafından sağlanan en son değerler kullanıldı.
const firebaseConfig = {
  apiKey: "AIzaSyDQl7WnDJG9Kbzk_LZ4RUVFAh0X1F_uKWs",
  authDomain: "yantmatik.firebaseapp.com",
  projectId: "yantmatik",
  storageBucket: "yantmatik.firebasestorage.app",
  messagingSenderId: "911776326766",
  appId: "1:911776326766:web:1f0904ac132e5fcc3e727f"
  // measurementId: "G-YOUR_MEASUREMENT_ID" // Google Analytics için (opsiyonel)
};

let app: FirebaseApp;
let db: Firestore;

try {
  // Firebase yapılandırmasının yer tutucu değerler içerip içermediğini kontrol et
  const isInvalidConfig = 
    !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("YOUR_") || firebaseConfig.apiKey.startsWith("AIzaSyYOUR_") ||
    !firebaseConfig.projectId || firebaseConfig.projectId.startsWith("YOUR_") ||
    !firebaseConfig.authDomain || firebaseConfig.authDomain.includes("YOUR_PROJECT_ID") ||
    !firebaseConfig.storageBucket || firebaseConfig.storageBucket.includes("YOUR_PROJECT_ID") ||
    !firebaseConfig.messagingSenderId || firebaseConfig.messagingSenderId.startsWith("YOUR_") ||
    !firebaseConfig.appId || firebaseConfig.appId.includes("YOUR_APP_ID");

  if (isInvalidConfig) {
    const errorMessage = `
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    KRİTİK HATA: Firebase yapılandırması eksik veya yer tutucu değerler içeriyor gibi görünüyor!
    Lütfen src/lib/firebase.ts dosyasındaki 'firebaseConfig' nesnesini kendi Firebase
    projenizin gerçek bilgileriyle DİKKATLİCE güncelleyin.
    Firebase konsolundan (Proje Ayarları -> Genel) bu değerleri tekrar kontrol edin.
    Mevcut Değerler:
    API Key: ${firebaseConfig.apiKey}
    Project ID: ${firebaseConfig.projectId}
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    `;
    console.error(errorMessage);
    // Tarayıcı konsolunda da bu mesajı göstermek için bir uyarı ekleyebiliriz, ancak sunucu tarafı için bu yeterli.
    throw new Error("Firebase configuration is incomplete or uses placeholder values. Check server console and src/lib/firebase.ts.");
  }

  // Firebase'i başlat
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);

} catch (error: any) {
  console.error("KRİTİK HATA: Firebase veya Firestore başlatılamadı. Bu durum, genellikle src/lib/firebase.ts dosyasındaki 'firebaseConfig' değerlerinden veya ağ sorunlarından kaynaklanır. Lütfen Firebase yapılandırmanızı ve sunucu loglarınızı kontrol edin.", error);
  // Eğer Firebase başlatılamazsa, db tanımsız kalacaktır.
  // Uygulamanın tanımsız bir 'db' kullanmaya çalışmasını engellemek için hatayı yeniden fırlatıyoruz.
  throw new Error(`Firebase başlatma hatası: ${error.message}. Sunucu loglarını ve firebaseConfig'i kontrol edin.`);
}

export { db, app };
