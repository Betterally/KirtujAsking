
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase yapılandırma bilgileri ortam değişkenlerinden okunacak
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Opsiyonel
};

let app: FirebaseApp;
let db: Firestore;

try {
  // Temel yapılandırma anahtarlarının eksik olup olmadığını kontrol et
  const essentialKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey', 
    'authDomain', 
    'projectId', 
    'storageBucket', 
    'messagingSenderId', 
    'appId'
  ];
  
  const missingOrPlaceholderKeys = essentialKeys.filter(key => {
    const value = firebaseConfig[key];
    // Değerin tanımsız, boş veya genel bir yer tutucu olup olmadığını kontrol et
    return !value || value.trim() === "" || value.startsWith("YOUR_") || value.startsWith("PASTE_YOUR_") || value.startsWith("AIzaSyYOUR_");
  });

  if (missingOrPlaceholderKeys.length > 0) {
    const detailedErrorMessage = `
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    KRİTİK FIREBASE YAPILANDIRMA HATASI (Ortam Değişkenleri):
    Aşağıdaki Firebase yapılandırma ortam değişkenleri eksik veya bilinen yer tutucu değerler içeriyor:
    ${missingOrPlaceholderKeys.map(key => `NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`).join(', ')}

    Lütfen Vercel (veya hosting platformunuzdaki) projenizin ortam değişkenlerini,
    Firebase projenizin (Proje Ayarları -> Genel sekmesinden) edindiğiniz
    GERÇEK ve DOĞRU bilgileriyle ayarladığınızdan emin olun.
    Yerelde çalışıyorsanız, projenizin kök dizininde bir '.env.local' dosyası oluşturup 
    bu değişkenleri oraya tanımlayabilirsiniz. Örn:
    NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXX
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    `;
    console.error(detailedErrorMessage);
    throw new Error(`Firebase config error from Environment Variables: Missing or placeholder values for [${missingOrPlaceholderKeys.join(', ')}]. Check Vercel/hosting environment variables or local .env.local file, and server console for details.`);
  }

  // Firebase'i başlat
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
  // Başarılı başlatma durumunda konsola bilgi yazdır
  console.log("Firebase başarıyla ortam değişkenleri kullanılarak başlatıldı. Proje ID: " + firebaseConfig.projectId);

} catch (error: any) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("KRİTİK FIREBASE BAŞLATMA HATASI (Ortam Değişkenleri Kullanılırken)!");
  console.error("Firebase SDK'sından gelen orijinal hata:", error);
  console.error("Bu hata, genellikle ortam değişkenlerindeki yanlış veya eşleşmeyen değerlerden, Firebase proje ayarlarından veya ağ sorunlarından kaynaklanabilir.");
  console.error("Lütfen Vercel/hosting ortam değişkenlerinizi veya yerel .env.local dosyanızı ve Firebase proje ayarlarınızı (özellikle Firestore veritabanı durumu ve güvenlik kuralları) dikkatlice kontrol edin.");
  console.error("Orijinal Hata Mesajı: ", error.message);
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  
  throw new Error(`Firebase Initialization Failed (using env vars): ${error.message}. Check server console for extensive details and verify your environment variables.`);
}

export { db, app };
