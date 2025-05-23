
// src/services/questionService.ts
'use server';

import { db, app } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
// Firebase Storage ile ilgili importlar kaldırıldı
import type { Question, MediaItem, Choice } from '@/lib/types';
import { initialQuestions } from '@/lib/data';

const QUESTIONS_COLLECTION = 'questions';
// storage sabiti kaldırıldı

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

    // Medya dosyalarını Firebase Storage'a yükleme mantığı kaldırıldı.
    // Veri URI'leri doğrudan Firestore'a kaydedilecek.
    const questionToSave: Question = JSON.parse(JSON.stringify({ id, ...questionData }));

    const questionDocRef = doc(db, QUESTIONS_COLLECTION, id);
    await setDoc(questionDocRef, { ...questionToSave, id: undefined }); 
    console.log(`[questionService] Soru '${id}' başarıyla Firestore'a kaydedildi/güncellendi.`);

  } catch (error: any) {
    console.error(`[questionService] saveQuestion fonksiyonunda genel hata (Soru ${question.id || 'ID_YOK'}):`, error);
    // Hata mesajı genel tutuldu, Storage ile ilgili referanslar kaldırıldı.
    if (String(error.message).includes("exceeds the maximum allowed size")) {
        throw new Error(`Firestore doküman boyutu sınırı aşıldı. Yüklediğiniz medya dosyaları çok büyük olabilir. Orijinal Hata: ${error.message}`);
    }
    throw new Error(`Soru kaydedilirken bir hata oluştu: ${error.message}. Firestore güvenlik kurallarını ve sunucu loglarını kontrol edin.`);
  }
}


// Firestore'dan bir soruyu siler
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    if (!questionId) {
      throw new Error("Silinecek soru için ID belirtilmelidir.");
    }
    // Firebase Storage'dan dosya silme ile ilgili yorum satırı kaldırıldı.
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
