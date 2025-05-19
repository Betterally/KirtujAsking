
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase projenizden alınan gerçek yapılandırma bilgileri
// Kullanıcı tarafından sağlanan en son değerler kullanıldı.
const firebaseConfig = {
  apiKey: "AIzaSyDQl7WnDJG9Kbzk_LZ4RUVFAh0X1F_uKWs",
  authDomain: "yantmatik.firebaseapp.com",
  projectId: "yantmatik",
  storageBucket: "yantmatik.firebasestorage.app", // Kullanıcının en son sağladığı değer
  messagingSenderId: "911776326766",
  appId: "1:911776326766:web:1f0904ac132e5fcc3e727f"
  // measurementId: "G-YOUR_MEASUREMENT_ID" // Google Analytics için (opsiyonel)
};

let app: FirebaseApp;
let db: Firestore;

try {
  // Temel yapılandırma anahtarlarının eksik veya yer tutucu olup olmadığını kontrol et
  const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'projectId', 'authDomain', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingOrPlaceholderKeys = essentialKeys.filter(key => {
    const value = firebaseConfig[key];
    // Değerin olmadığını veya genel yer tutucu kalıplarını içerip içermediğini kontrol et
    return !value || (typeof value === 'string' && (
      value.includes("YOUR_") || value.includes("PASTE_YOUR_") || value.startsWith("AIzaSyYOUR_") || value === "your-project-id"
    ));
  });

  if (missingOrPlaceholderKeys.length > 0) {
    const detailedErrorMessage = `
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    KRİTİK FIREBASE YAPILANDIRMA HATASI:
    Aşağıdaki Firebase yapılandırma anahtarları eksik veya bilinen yer tutucu değerler içeriyor:
    ${missingOrPlaceholderKeys.join(', ')}

    Lütfen src/lib/firebase.ts dosyasındaki 'firebaseConfig' nesnesini,
    Firebase projenizin (Proje Ayarları -> Genel sekmesinden) edindiğiniz
    GERÇEK ve DOĞRU bilgileriyle güncellediğinizden emin olun.
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    `;
    console.error(detailedErrorMessage);
    // Hata katmanında gösterilecek daha net bir mesaj
    throw new Error(`Firebase config error: Missing or placeholder values for [${missingOrPlaceholderKeys.join(', ')}]. Check server console & src/lib/firebase.ts.`);
  }

  // Firebase'i başlat
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
  // Başarılı başlatma durumunda konsola bilgi yazdır
  console.log("Firebase başarıyla başlatıldı. Proje ID: " + firebaseConfig.projectId);

} catch (error: any) {
  // Başlatma sırasında herhangi bir hata olursa, detaylı bilgi logla
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("KRİTİK FIREBASE BAŞLATMA HATASI!");
  console.error("Firebase SDK'sından gelen orijinal hata:", error);
  console.error("Bu hata, genellikle 'firebaseConfig' içindeki yanlış veya eşleşmeyen değerlerden (örn. proje ID'si, API anahtarı, güvenlik kuralları) veya ağ sorunlarından kaynaklanabilir.");
  console.error("Lütfen src/lib/firebase.ts dosyasındaki 'firebaseConfig' değerlerini ve Firebase proje ayarlarınızı (özellikle Firestore veritabanı durumu ve güvenlik kuralları) dikkatlice kontrol edin.");
  console.error("Orijinal Hata Mesajı: ", error.message);
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  
  // Hata katmanında gösterilecek daha genel ama yönlendirici bir hata fırlat
  throw new Error(`Firebase Initialization Failed: ${error.message}. Check server console for extensive details and verify your firebaseConfig in src/lib/firebase.ts.`);
}

export { db, app };
