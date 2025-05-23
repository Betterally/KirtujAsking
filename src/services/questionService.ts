
// src/services/questionService.ts
'use server';

import { db, app } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Question, MediaItem, Choice } from '@/lib/types';
import { initialQuestions } from '@/lib/data';

const QUESTIONS_COLLECTION = 'questions';
const storage = getStorage(app);

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
        // initialQuestions'ı doğrudan Firestore'a yazarken Storage'a yükleme yapmıyoruz,
        // çünkü initialQuestions'daki URL'ler genellikle placeholder veya doğrudan HTTP URL'leridir.
        // Eğer initialQuestions içinde data URI'leri olsaydı, onlar için de yükleme mantığı gerekirdi.
        const batch = writeBatch(db);
        const questionsToSaveInitially: Question[] = JSON.parse(JSON.stringify(initialQuestions));

        for (const q of questionsToSaveInitially) {
          const questionDocRef = doc(db, QUESTIONS_COLLECTION, q.id);
          batch.set(questionDocRef, q);
        }
        await batch.commit();
        console.log("[questionService] Initial questions Firestore'a yüklendi.");
        return questionsToSaveInitially; // Firestore'dan çekmek yerine doğrudan bunu döndür
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
        throw error; // Bu hatayı doğrudan yukarı fırlat
    }
    // Diğer genel hatalar için
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
      for (const mediaItem of choice.media) {
        if (mediaItem.url && mediaItem.url.startsWith('data:')) {
          console.log(`[questionService] Data URI algılandı: Soru ${id}, Seçenek ${choice.id}, Medya Tipi ${mediaItem.type}. Firebase Storage'a yükleniyor...`);
          try {
            const mimeTypeMatch = mediaItem.url.match(/^data:(.+);base64,/);
            if (!mimeTypeMatch || mimeTypeMatch.length < 2) {
              console.error("[questionService] Geçersiz data URI formatı, MIME türü çıkarılamadı:", mediaItem.url.substring(0, 50));
              throw new Error("Geçersiz data URI formatı.");
            }
            const mimeType = mimeTypeMatch[1];
            const base64Data = mediaItem.url.split(',')[1];

            const fileExtension = mimeType.split('/')[1] || 'bin';
            const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
            const filePath = `questions_media/${id}/${choice.id}/${fileName}`;
            const fileRef = storageRef(storage, filePath);

            console.log(`[questionService] Storage'a yükleniyor: ${filePath}, MimeType: ${mimeType}`);
            const uploadResult = await uploadString(fileRef, base64Data, 'base64', { contentType: mimeType });
            const downloadURL = await getDownloadURL(uploadResult.ref);
            mediaItem.url = downloadURL;
            console.log(`[questionService] Dosya başarıyla yüklendi. URL: ${downloadURL}`);
          } catch (storageError: any) {
            console.error(`[questionService] Firebase Storage'a yükleme hatası (Soru ${id}, Seçenek ${choice.id}):`, storageError);
            console.error("[questionService] Storage Error Code:", storageError.code);
            console.error("[questionService] Storage Error Message:", storageError.message);
            console.error("[questionService] Full Storage Error Object:", JSON.stringify(storageError, null, 2));
            // Hata mesajını daha genel tutalım, çünkü istemciye özel kodlar göstermek istemeyebiliriz.
            throw new Error(`Medya dosyası Firebase Storage'a yüklenirken bir hata oluştu. Lütfen sunucu loglarını ve Firebase Storage güvenlik kurallarınızı kontrol edin. Orijinal Hata: ${storageError.message}`);
          }
        }
      }
    }

    const questionDocRef = doc(db, QUESTIONS_COLLECTION, id);
    await setDoc(questionDocRef, { ...questionToSave, id: undefined }); // id'yi Firestore verisinden çıkarıyoruz
    console.log(`[questionService] Soru '${id}' başarıyla Firestore'a kaydedildi/güncellendi.`);

  } catch (error: any) {
    console.error(`[questionService] saveQuestion fonksiyonunda genel hata (Soru ${id || 'ID_YOK'}):`, error);
    if (String(error.message).includes("exceeds the maximum allowed size")) {
        throw new Error(`Firestore doküman boyutu sınırı aşıldı. Medya dosyaları Storage'a yüklenmeye çalışılırken bir sorun oluşmuş olabilir veya soru metinleri çok uzun. Orijinal Hata: ${error.message}`);
    }
    throw new Error(`Soru kaydedilirken bir hata oluştu: ${error.message}. Firestore ve Storage güvenlik kurallarını, sunucu loglarını kontrol edin.`);
  }
}


// Firestore'dan bir soruyu siler
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    if (!questionId) {
      throw new Error("Silinecek soru için ID belirtilmelidir.");
    }

    // TODO: Eğer soruyla ilişkili dosyalar Firebase Storage'daysa, onları da silmek iyi bir pratik olur.
    // Bunun için önce soru dokümanını çekip içindeki medya URL'lerini alıp Storage'dan silmek gerekir.
    // Şimdilik sadece Firestore dokümanını siliyoruz.

    const questionDocRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await deleteDoc(questionDocRef);
    console.log(`[questionService] Soru '${questionId}' başarıyla Firestore'dan silindi.`);
  } catch (error: any) {
    console.error(`[questionService] Firestore'dan soru (${questionId}) silme hatası: `, error);
    console.error("[questionService] Olası Nedenler: Firestore güvenlik kuralları silme izni vermiyor olabilir.");
    throw new Error(`Soru silinirken bir hata oluştu: ${error.message}. Firestore güvenlik kurallarını ve sunucu loglarını kontrol edin.`);
  }
}

export type { Question, MediaItem, Choice };
