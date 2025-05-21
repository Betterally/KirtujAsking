
// src/services/questionService.ts
'use server'; 

import { db, app } from '@/lib/firebase'; // 'app' import edildi
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL, deleteObject as deleteStorageObject } from 'firebase/storage'; // Storage importları eklendi
import type { Question, MediaItem, Choice } from '@/lib/types';
import { initialQuestions } from '@/lib/data'; 

const QUESTIONS_COLLECTION = 'questions';
const storage = getStorage(app); // Firebase Storage başlatıldı

// Firestore'dan tüm soruları getirir
export async function getQuestions(): Promise<Question[]> {
  try {
    const questionsCollection = collection(db, QUESTIONS_COLLECTION);
    const querySnapshot = await getDocs(questionsCollection);
    
    let questions: Question[] = [];
    querySnapshot.forEach((doc) => {
      questions.push({ id: doc.id, ...doc.data() } as Question);
    });

    if (questions.length === 0 && initialQuestions.length > 0) {
      console.log("[questionService] Firestore'da soru bulunamadı, initialQuestions yükleniyor...");
      try {
        const batch = writeBatch(db);
        const questionsToSaveInitially: Question[] = JSON.parse(JSON.stringify(initialQuestions));

        for (const q of questionsToSaveInitially) {
          for (const choice of q.choices) {
            for (const mediaItem of choice.media) {
              if (mediaItem.url && mediaItem.url.startsWith('data:')) {
                console.warn(`[questionService] Initial question ${q.id}, choice ${choice.id} media URL is a data URI. This should ideally be a direct URL or uploaded during a proper save operation.`);
              } else if (mediaItem.url && !mediaItem.url.startsWith('https://') && !mediaItem.url.startsWith('http://')) {
                console.warn(`[questionService] Initial question ${q.id}, choice ${choice.id} media URL is not a valid HTTP/HTTPS URL: ${mediaItem.url}.`);
              }
            }
          }
          const questionDocRef = doc(db, QUESTIONS_COLLECTION, q.id);
          batch.set(questionDocRef, q);
        }
        await batch.commit();
        console.log("[questionService] Initial questions Firestore'a yüklendi.");
        return questionsToSaveInitially;
      } catch (writeError: any) {
        console.error("[questionService] !!! KRİTİK: initialQuestions Firestore'a YAZILAMADI !!!");
        console.error("[questionService] Yazma Hatası Detayları:", writeError);
        console.error("[questionService] Olası Nedenler: Firestore güvenlik kuralları yazma izni vermiyor olabilir (özellikle '/questions' koleksiyonu için). Lütfen Firebase konsolundaki Firestore güvenlik kurallarınızı kontrol edin.");
        throw new Error(`Initial questions could not be written to Firestore: ${writeError.message}. Check Firestore security rules and server logs.`);
      }
    }
    
    questions.sort((a, b) => {
        const aIdStr = String(a.id || ''); 
        const bIdStr = String(b.id || ''); 

        const numA = parseInt(aIdStr.replace(/\D/g, ''), 10);
        const numB = parseInt(bIdStr.replace(/\D/g, ''), 10);

        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
            return numA - numB;
        }
        return aIdStr.localeCompare(bIdStr);
    });

    return questions;
  } catch (error: any) {
    console.error("[questionService] Firestore'dan soruları getirme/işleme genel hatası: ", error);
    if (error.message && error.message.startsWith("Initial questions could not be written")) {
        throw error; 
    }
    throw new Error(`Sorular yüklenirken bir hata oluştu: ${error.message}. Sunucu loglarını kontrol edin.`);
  }
}

// Firestore'a yeni bir soru ekler veya mevcut bir soruyu günceller
export async function saveQuestion(question: Question): Promise<void> {
  try {
    const { id, ...questionData } = question;
    if (!id) {
      throw new Error("Kaydedilecek soru için ID belirtilmelidir.");
    }

    const questionToSave: Question = JSON.parse(JSON.stringify({ id, ...questionData })); 

    for (const choice of questionToSave.choices) {
      for (let i = 0; i < choice.media.length; i++) {
        const mediaItem = choice.media[i];
        if (mediaItem.url && mediaItem.url.startsWith('data:')) {
          console.log(`[questionService] Processing data URI for question ${id}, choice ${choice.id}, type ${mediaItem.type}.`);
          const [header, base64Data] = mediaItem.url.split(',');
          if (!base64Data) {
            console.error("[questionService] Invalid data URI format: base64Data is missing.");
            throw new Error('Invalid data URI format for media.');
          }
          const mimeTypeMatch = header.match(/:(.*?);/);
          const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'application/octet-stream';
          
          const fileExtension = mimeType.split('/')[1] || 'bin';
          const fileName = `${mediaItem.type}_${Date.now()}_${Math.random().toString(36).substring(2,7)}.${fileExtension}`;
          const filePath = `questions_media/${id}/${choice.id}/${fileName}`;
          const fileRef = storageRef(storage, filePath);

          console.log(`[questionService] Attempting to upload to Firebase Storage. Path: ${filePath}, MimeType: ${mimeType}`);
          try {
            await uploadString(fileRef, base64Data, 'base64', { contentType: mimeType });
            const downloadURL = await getDownloadURL(fileRef);
            mediaItem.url = downloadURL; 
            console.log(`[questionService] Media uploaded successfully to Firebase Storage. URL: ${downloadURL}`);
          } catch (storageUploadError: any) {
            console.error(`[questionService] FIREBASE STORAGE UPLOAD/GET_URL ERROR for question ${id}, choice ${choice.id}, media type ${mediaItem.type}, path ${filePath}:`);
            console.error(`[questionService] Storage Error Code: ${storageUploadError.code}`);
            console.error(`[questionService] Storage Error Message: ${storageUploadError.message}`);
            console.error("[questionService] Full Storage Error Object:", JSON.stringify(storageUploadError, Object.getOwnPropertyNames(storageUploadError), 2));
            throw new Error(`Firebase Storage operation failed for media ${mediaItem.type}: ${storageUploadError.message} (Code: ${storageUploadError.code})`);
          }
        }
      }
    }

    const questionDocRef = doc(db, QUESTIONS_COLLECTION, id);
    await setDoc(questionDocRef, { ...questionToSave, id: undefined }); 
    console.log(`[questionService] Soru '${id}' başarıyla Firestore'a kaydedildi/güncellendi.`);
  } catch (error: any) {
    console.error(`[questionService] Genel hata saveQuestion fonksiyonunda, soru ID ${question.id || 'ID_YOK'}:`, error);
    if (error.message?.includes("Firebase Storage operation failed")) {
      throw new Error(`Soru kaydedilemedi: ${error.message}. Sunucu loglarını ve Storage/Firestore güvenlik kurallarını kontrol edin.`);
    } else if (error.code && (error.code.startsWith('storage/') || error.code.startsWith('firestore/'))) {
      throw new Error(`Soru kaydedilirken bir Firebase hatası oluştu: ${error.message} (Kod: ${error.code}). Güvenlik kurallarını ve sunucu loglarını kontrol edin.`);
    } else {
      throw new Error(`Soru kaydedilirken bir hata oluştu: ${error.message}. Firestore/Storage güvenlik kurallarını ve sunucu loglarını kontrol edin.`);
    }
  }
}


// Firestore'dan bir soruyu siler
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    if (!questionId) {
      throw new Error("Silinecek soru için ID belirtilmelidir.");
    }
    // İsteğe bağlı Storage'dan silme kodu buraya eklenebilir.
    // Örnek: (önce soruyu çekip medya URL'lerini almak gerekir)
    // const questionDoc = await getDoc(doc(db, QUESTIONS_COLLECTION, questionId));
    // if (questionDoc.exists()) {
    //   const questionData = questionDoc.data() as Question;
    //   for (const choice of questionData.choices) {
    //     for (const media of choice.media) {
    //       if (media.url.includes("firebasestorage.googleapis.com")) {
    //         try {
    //           const fileStorageRef = storageRef(storage, media.url); // URL'den ref oluştur
    //           await deleteStorageObject(fileStorageRef);
    //           console.log(`[questionService] Firebase Storage'dan silindi: ${media.url}`);
    //         } catch (storageError: any) {
    //           console.error(`[questionService] Storage'dan dosya silme hatası (${media.url}): `, storageError.message);
    //         }
    //       }
    //     }
    //   }
    // }

    const questionDocRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await deleteDoc(questionDocRef);
    console.log(`[questionService] Soru '${questionId}' başarıyla Firestore'dan silindi.`);
  } catch (error: any) {
    console.error(`[questionService] Firestore'dan soru (${questionId}) silme hatası: `, error);
    console.error("[questionService] Olası Nedenler: Firestore güvenlik kuralları silme izni vermiyor olabilir.");
    throw new Error(`Soru silinirken bir hata oluştu: ${error.message}. Check Firestore security rules and server logs.`);
  }
}

export type { Question, MediaItem, Choice };
