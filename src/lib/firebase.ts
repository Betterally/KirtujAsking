
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase projenizden alınan gerçek yapılandırma bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyDQ17WnDJG9Kbzk_LZ4RUVFAh0X1F_uKWs",
  authDomain: "yantmatik.firebaseapp.com",
  projectId: "yantmatik",
  storageBucket: "yantmatik.firebasestorage.app",
  messagingSenderId: "911776326766",
  appId: "1:911776326766:web:1f0904ac132e5fcc3e727f"
  // measurementId: "G-YOUR_MEASUREMENT_ID" // Google Analytics için (opsiyonel, ekran görüntüsünde yoktu)
};

let app: FirebaseApp;
let db: Firestore;

try {
  // Firebase yapılandırmasının yer tutucu değerler içerip içermediğini kontrol et (Artık doğrudan değerleri kullandığımız için bu kontrol basitleştirilebilir veya kaldırılabilir, ancak güvenlik için bırakmakta fayda var)
  if (
    !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("YOUR_") || firebaseConfig.apiKey.startsWith("AIzaSyYOUR_") || // Genel yer tutucular
    !firebaseConfig.projectId || firebaseConfig.projectId.startsWith("YOUR_") ||
    !firebaseConfig.authDomain || firebaseConfig.authDomain.includes("YOUR_PROJECT_ID") ||
    !firebaseConfig.storageBucket || firebaseConfig.storageBucket.includes("YOUR_PROJECT_ID") ||
    !firebaseConfig.messagingSenderId || firebaseConfig.messagingSenderId.startsWith("YOUR_") ||
    !firebaseConfig.appId || firebaseConfig.appId.includes("YOUR_APP_ID")
  ) {
    // Bu kontrol, eğer kopyala-yapıştır sırasında bir hata olursa veya değerler eksikse yine de bir uyarı verebilir.
    // Ancak ideal durumda, yukarıdaki değerler doğru olduğu için bu bloğa girilmemeli.
    const placeholderDetected =
      firebaseConfig.apiKey === "AIzaSyDQ17WnDJG9Kbzk_LZ4RUVFAh0X1F_uKWs" && // Bu değerler artık gerçek olduğu için bu kontrol geçerliliğini yitirir.
      firebaseConfig.projectId === "yantmatik"; // Bu değerler artık gerçek olduğu için bu kontrol geçerliliğini yitirir.


    if (placeholderDetected && (firebaseConfig.apiKey.includes("YOUR_") || firebaseConfig.projectId.includes("YOUR_"))) {
        const errorMessage = `
        !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        KRİTİK HATA: Firebase yapılandırması eksik veya yer tutucu değerler içeriyor gibi görünüyor!
        Lütfen src/lib/firebase.ts dosyasındaki 'firebaseConfig' nesnesini kendi Firebase
        projenizin gerçek bilgileriyle DİKKATLİCE güncelleyin.
        Bu mesaj, değerlerin kopyalanmasına rağmen bir sorun olabileceğini gösteriyor.
        Firebase konsolundan (Proje Ayarları -> Genel) bu değerleri tekrar kontrol edin.
        !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        `;
        console.error(errorMessage);
        throw new Error("Firebase configuration might still be using placeholders or is incomplete. Double-check src/lib/firebase.ts.");
    }
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
