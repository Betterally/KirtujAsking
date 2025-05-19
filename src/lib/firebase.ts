
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

let app: FirebaseApp;
let db: Firestore;

try {
  // Firebase yapılandırmasının yer tutucu değerler içerip içermediğini kontrol et
  if (
    !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY" ||
    !firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_PROJECT_ID" ||
    !firebaseConfig.authDomain || firebaseConfig.authDomain.includes("YOUR_PROJECT_ID") ||
    !firebaseConfig.storageBucket || firebaseConfig.storageBucket.includes("YOUR_PROJECT_ID") ||
    !firebaseConfig.messagingSenderId || firebaseConfig.messagingSenderId === "YOUR_MESSAGING_SENDER_ID" ||
    !firebaseConfig.appId || firebaseConfig.appId === "YOUR_APP_ID"
  ) {
    const errorMessage = `
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      KRİTİK HATA: Firebase yapılandırması eksik veya yer tutucu değerler içeriyor!
      Lütfen src/lib/firebase.ts dosyasındaki 'firebaseConfig' nesnesini kendi Firebase
      projenizin gerçek bilgileriyle güncelleyin. Özellikle apiKey ve projectId kontrol edin.
      Uygulama geçerli bir Firebase yapılandırması olmadan başlatılamaz.
      Firebase konsolundan (Proje Ayarları -> Genel) bu değerleri alabilirsiniz.
      !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    `;
    console.error(errorMessage);
    // Bu hata, sunucu başlatılırken veya sayfa yüklenirken fırlatılacak ve sorunu netleştirecektir.
    throw new Error("Firebase configuration is incomplete. Check console and src/lib/firebase.ts.");
  }

  // Firebase'i başlat
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);

} catch (error: any) {
  console.error("KRİTİK HATA: Firebase veya Firestore başlatılamadı. Bu durum, genellikle src/lib/firebase.ts dosyasındaki geçersiz 'firebaseConfig' değerlerinden veya ağ sorunlarından kaynaklanır. Lütfen Firebase yapılandırmanızı ve sunucu loglarınızı kontrol edin.", error);
  // Eğer Firebase başlatılamazsa, db tanımsız kalacaktır.
  // Uygulamanın tanımsız bir 'db' kullanmaya çalışmasını engellemek için hatayı yeniden fırlatıyoruz.
  throw new Error(`Firebase başlatma hatası: ${error.message}. Sunucu loglarını ve firebaseConfig'i kontrol edin.`);
}

export { db, app };
