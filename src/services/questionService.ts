
// src/services/questionService.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { Question, MediaItem, Choice, LocalizedText } from '@/lib/types';
import { initialQuestions } from '@/lib/data';

const QUESTIONS_COLLECTION = 'questions';

// Firestore'dan tüm soruları getirir
export async function getQuestions(): Promise<Question[]> {
  try {
    const questionsCollection = collection(db, QUESTIONS_COLLECTION);
    const querySnapshot = await getDocs(questionsCollection);

    let questions: Question[] = [];
    querySnapshot.forEach((docSnapshot) => {
      // Firestore'dan gelen veriyi Question tipine cast etmeden önce doğrula/dönüştür
      const data = docSnapshot.data();
      const question: Question = {
        id: docSnapshot.id,
        text: data.text || { tr: '' }, // Varsayılan değerler
        choices: (data.choices || []).map((choiceData: any) => ({
          id: choiceData.id || '',
          text: choiceData.text || { tr: '' },
          media: (choiceData.media || []).map((mediaData: any) => ({
            type: mediaData.type,
            url: mediaData.url,
            altText: mediaData.altText, // altText tanımsız olabilir, bu sorun değil
            dataAiHint: mediaData.dataAiHint, // dataAiHint tanımsız olabilir
          })),
        })),
      };
      questions.push(question);
    });


    if (questions.length === 0 && initialQuestions.length > 0) {
      console.log("[questionService] Firestore'da soru bulunamadı, initialQuestions yükleniyor...");
      try {
        const batch = writeBatch(db);
        const questionsToSaveInitially: Question[] = JSON.parse(JSON.stringify(initialQuestions));

        for (const q of questionsToSaveInitially) {
          const { id, ...questionData } = q;
          const questionDocRef = doc(db, QUESTIONS_COLLECTION, id);
          batch.set(questionDocRef, questionData);
        }
        await batch.commit();
        console.log("[questionService] Initial questions Firestore'a yüklendi.");
        return questionsToSaveInitially;
      } catch (writeError: any) {
        console.error("[questionService] !!! KRİTİK: initialQuestions Firestore'a YAZILAMADI !!!");
        console.error("[questionService] Yazma Hatası Detayları:", writeError);
        console.error("[questionService] Olası Nedenler: Firestore güvenlik kuralları yazma izni vermiyor olabilir.");
        throw new Error(`Initial questions could not be written to Firestore: ${writeError.message}. Check Firestore security rules and server logs.`);
      }
    }

    questions.sort((a, b) => {
        const aIdStr = String(a.id || '');
        const bIdStr = String(b.id || '');
        const numA = parseInt(aIdStr.replace(/\D/g, ''), 10);
        const numB = parseInt(bIdStr.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        return aIdStr.localeCompare(bIdStr);
    });

    return questions;
  } catch (error: any) {
    console.error("[questionService] Firestore'dan soruları getirme/işleme genel hatası: ", error);
    if (error.message?.startsWith("Initial questions could not be written")) throw error;
    let userFriendlyMessage = `Sorular yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin. Sorun devam ederse destek ile iletişime geçin.`;
    if (error.message?.toLowerCase().includes("offline") && error.message?.toLowerCase().includes("firestore")) {
        userFriendlyMessage = "Firestore (veritabanı) çevrimdışı veya ulaşılamıyor gibi görünüyor. İnternet bağlantınızı ve Firebase durumunu kontrol edin.";
    } else if (error.message?.toLowerCase().includes("quota") || error.message?.toLowerCase().includes("limit exceeded")) {
        userFriendlyMessage = "Veritabanı işlem kotası aşılmış olabilir. Lütfen Firebase planınızı kontrol edin veya bir süre sonra tekrar deneyin.";
    } else if (error.message) {
        userFriendlyMessage = `Sorular yüklenirken bir hata oluştu: ${error.message}. Sunucu loglarını kontrol edin.`;
    }
    throw new Error(userFriendlyMessage);
  }
}

// Firestore'a yeni bir soru ekler veya mevcut bir soruyu günceller
export async function saveQuestion(question: Question): Promise<void> {
  let dataToLogOnError: any = null; // Hata durumunda loglanacak veri
  try {
    const { id, ...questionData } = question;
    if (!id) {
      throw new Error("Kaydedilecek soru için ID belirtilmelidir.");
    }

    // undefined özelliklerini kaldırmak ve derin bir kopya oluşturmak için JSON.parse(JSON.stringify()) kullanın.
    const questionToSave = JSON.parse(JSON.stringify(questionData));
    dataToLogOnError = questionToSave; // Kaydedilmeye çalışılacak veriyi sakla

    const questionDocRef = doc(db, QUESTIONS_COLLECTION, id);
    await setDoc(questionDocRef, questionToSave); // Sadece questionData'yı (id olmadan) kaydet
    console.log(`[questionService] Soru '${id}' başarıyla Firestore'a kaydedildi/güncellendi.`);

  } catch (error: any) {
    console.error(`[questionService] saveQuestion fonksiyonunda hata (Soru ID: ${question.id || 'ID_YOK'}):`, error);
    let userFriendlyMessage = `Soru kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.`;

    if (error.code === 'invalid-argument' || (error.message && error.message.includes("INVALID_ARGUMENT"))) {
        userFriendlyMessage = `Soru kaydedilirken bir hata oluştu: ${error.message}. Firestore güvenlik kurallarını ve sunucu loglarını kontrol edin.`;
        if (error.message && error.message.includes("Property array contains an invalid nested entity")) {
             console.error("[questionService] DETAYLI BİLGİ: 'Invalid nested entity' hatası genellikle bir dizideki (choice veya media item gibi) bir nesnenin tanımsız bir özelliği olduğu veya Firestore'un beklediği gibi düz bir nesne olarak yapılandırılmadığı anlamına gelir.");
             console.error("[questionService] Kaydedilmeye çalışılan veri:", JSON.stringify(dataToLogOnError, null, 2)); // Sorunlu veriyi logla
        }
    } else if (error.message && error.message.toLowerCase().includes("exceeds the maximum allowed size")) {
        userFriendlyMessage = `Soru kaydedilemedi: Veri boyutu Firestore için çok büyük (maksimum 1MB). Lütfen daha küçük medya dosyaları (veya daha az/kısa metin) kullanın. Orijinal Hata: ${error.message}`;
    } else if (error.message) {
        userFriendlyMessage = `Soru kaydedilirken bir hata oluştu: ${error.message}. Firestore güvenlik kurallarını ve sunucu loglarını kontrol edin.`;
    }
    throw new Error(userFriendlyMessage);
  }
}


// Firestore'dan bir soruyu siler
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    if (!questionId) {
      throw new Error("Silinecek soru için ID belirtilmelidir.");
    }
    const questionDocRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await deleteDoc(questionDocRef);
    console.log(`[questionService] Soru '${questionId}' başarıyla Firestore'dan silindi.`);
  } catch (error: any) {
    console.error(`[questionService] Firestore'dan soru (${questionId}) silme hatası: `, error);
    console.error("[questionService] Olası Nedenler: Firestore güvenlik kuralları silme izni vermiyor olabilir.");
    throw new Error(`Soru silinirken bir hata oluştu: ${error.message}. Firestore güvenlik kurallarını ve sunucu loglarını kontrol edin.`);
  }
}

export type { Question, MediaItem, Choice, LocalizedText };
