
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Ortam değişkenlerini modül kapsamında logla (sunucu tarafında ilk yüklendiğinde çalışır)
console.log("DEBUG: Firebase Environment Variables Checkpoint 1 (src/lib/firebase.ts module scope)");
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
console.log("DEBUG: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);

interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

const firebaseConfigFromEnv: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function checkFirebaseConfig(config: FirebaseConfig): { isValid: boolean; detailedErrorLog?: string; missingOrPlaceholderKeysInfo?: Array<{ key: string, value: string | undefined, reason: string }> } {
  const essentialKeys: (keyof FirebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  let detailedErrorLog = "Firebase Environment Variable Check Details (from src/lib/firebase.ts):\n";
  const missingOrPlaceholderKeysInfo: Array<{ key: string, value: string | undefined, reason: string }> = [];

  essentialKeys.forEach(key => {
    const value = config[key];
    let isProblematic = false;
    let reason = "";

    if (!value || String(value).trim() === "") {
      isProblematic = true;
      reason = "is missing or empty";
    } else if (
      String(value).toUpperCase().startsWith("YOUR_") ||
      String(value).toUpperCase().startsWith("PASTE_YOUR_") ||
      String(value).toUpperCase().startsWith("AIZASYBYOUR_") ||
      (key === 'projectId' && String(value).toUpperCase() === "YOUR-PROJECT-ID") ||
      (String(value).toUpperCase().includes("XXXX") && String(value).length > 10) // Genellikle redakte edilmiş anahtarlar X içerir
    ) {
      isProblematic = true;
      reason = "appears to be a placeholder or redacted value";
    }
    
    detailedErrorLog += ` - ${key.padEnd(20)}: Value='${String(value)}' (Problematic: ${isProblematic})${isProblematic ? ` (Reason: ${reason})` : ''}\n`;
    
    if (isProblematic) {
      missingOrPlaceholderKeysInfo.push({ key, value, reason });
    }
  });

  if (missingOrPlaceholderKeysInfo.length > 0) {
    return { isValid: false, detailedErrorLog, missingOrPlaceholderKeysInfo };
  }
  return { isValid: true };
}


let app: FirebaseApp;
let db: Firestore;

try {
  console.log("DEBUG: Firebase Initialization Checkpoint 2 (Attempting to validate config)");
  const configCheck = checkFirebaseConfig(firebaseConfigFromEnv);

  if (!configCheck.isValid && configCheck.detailedErrorLog && configCheck.missingOrPlaceholderKeysInfo) {
    console.error(configCheck.detailedErrorLog); // Log detailed issues
    const problematicKeysSummary = configCheck.missingOrPlaceholderKeysInfo.map(info => `${info.key} (${info.reason})`).join(', ');
    throw new Error(
      `Firebase config error from Environment Variables: Problematic values detected for [${problematicKeysSummary}]. ` +
      `Review the 'Firebase Environment Variable Check Details' in your SERVER CONSOLE (it starts with 'Firebase Environment Variable Check Details (from src/lib/firebase.ts):') to see the exact values being read by the application. ` +
      `Ensure all Firebase environment variables are correctly set in Firebase Studio and the application is restarted/redeployed.`
    );
  }
  
  console.log("DEBUG: Firebase Initialization Checkpoint 3 (Config seems valid, attempting to initialize)");
  const finalConfig: any = { ...firebaseConfigFromEnv };
  if (!finalConfig.measurementId) {
    delete finalConfig.measurementId;
  }

  if (!getApps().length) {
    app = initializeApp(finalConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
  console.log("Firebase başarıyla ortam değişkenleri kullanılarak başlatıldı. Proje ID: " + firebaseConfigFromEnv.projectId);

} catch (error: any) {
  // Log detailed error information to the server console
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("KRİTİK FIREBASE BAŞLATMA HATASI (src/lib/firebase.ts)!");
  console.error("Orijinal Hata Mesajı (from caught error): ", error.message);
  if (error.cause && error.cause !== error.message) { // Log original cause if different
      console.error("Orijinal Neden (Original Cause):", error.cause);
  }
  console.error("Detaylı hata bilgisi için yukarıdaki DEBUG loglarını ve 'Firebase Environment Variable Check Details' bölümünü (eğer varsa) inceleyin.");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

  // Throw a user-friendly error. If it's a config error from checkFirebaseConfig, it already has good guidance.
  if (error.message?.includes("Firebase config error from Environment Variables")) {
      // The error from checkFirebaseConfig is already descriptive for config issues
      throw error; 
  }
  // For other types of errors (e.g., SDK internal, network issues not related to config values)
  throw new Error(`Firebase Initialization Failed (using env vars): An unexpected error occurred during Firebase setup. Original error: ${error.message}. Please check server logs for details, especially Firebase SDK messages.`);
}

export { db, app };
