
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Ortam değişkenlerinden Firebase yapılandırma bilgilerini al
// Bu loglar, değişkenlerin doğru yüklenip yüklenmediğini görmek için eklendi.
console.log("DEBUG: Firebase Environment Variables Checkpoint 1");
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);


const firebaseConfigFromEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Opsiyonel, yoksa undefined olabilir
};

let app: FirebaseApp;
let db: Firestore;

try {
  // Temel yapılandırma anahtarlarının eksik olup olmadığını kontrol et
  const essentialKeys: (keyof typeof firebaseConfigFromEnv)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingOrPlaceholderKeys = essentialKeys.filter(key => {
    const value = firebaseConfigFromEnv[key];
    // Değerin tanımsız, boş veya bilinen bir yer tutucu olup olmadığını kontrol et
    return !value || String(value).trim() === "" || String(value).startsWith("YOUR_") || String(value).startsWith("PASTE_YOUR_") || String(value).startsWith("AIzaSyYOUR_") || String(value) === "YOUR-PROJECT-ID";
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
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=proje-ismi
    Lütfen geliştirme sunucunuzu yeniden başlattığınızdan emin olun.
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    `;
    console.error(detailedErrorMessage);
    // Bu özel hata mesajı, dış try...catch bloğu tarafından yakalanacak
    throw new Error(`Firebase config error from Environment Variables: Missing or placeholder values for [${missingOrPlaceholderKeys.join(', ')}]. Check Vercel/hosting environment variables or local .env.local file, and server console for details.`);
  }

  // Firebase'i başlat
  if (!getApps().length) {
    app = initializeApp(firebaseConfigFromEnv as any); // 'any' cast because measurementId can be undefined
  } else {
    app = getApp();
  }
  db = getFirestore(app);
  // Başarılı başlatma durumunda konsola bilgi yazdır
  console.log("Firebase başarıyla ortam değişkenleri kullanılarak başlatıldı. Proje ID: " + firebaseConfigFromEnv.projectId);

} catch (error: any) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("KRİTİK FIREBASE BAŞLATMA HATASI (Ortam Değişkenleri Kullanılırken)!");
  console.error("Firebase SDK'sından gelen orijinal hata (eğer varsa):", error.cause || error); // Hatanın daha derinine inmek için
  console.error("Bu hata, genellikle ortam değişkenlerindeki yanlış veya eşleşmeyen değerlerden, Firebase proje ayarlarından (örn: proje silinmiş olabilir, faturalandırma sorunları), ağ sorunlarından veya yanlış SDK yapılandırmasından kaynaklanabilir.");
  console.error("Lütfen Vercel/hosting ortam değişkenlerinizi veya yerel .env.local dosyanızı ve Firebase proje ayarlarınızı (özellikle Firestore veritabanı durumu ve güvenlik kuralları) dikkatlice kontrol edin.");
  console.error("Orijinal Hata Mesajı: ", error.message);
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  
  // Eğer Firebase başlatılamazsa, db tanımsız kalacaktır.
  // Uygulamanın tanımsız bir 'db' kullanmaya çalışmasını engellemek için hatayı yeniden fırlatıyoruz.
  throw new Error(`Firebase Initialization Failed (using env vars): ${error.message}. Check server console for extensive details and verify your environment variables.`);
}

export { db, app };
