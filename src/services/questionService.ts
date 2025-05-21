
// src/services/questionService.ts
'use server'; 

import { db, app } from '@/lib/firebase'; // 'app' import edildi
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
// Firebase Storage importları kaldırıldı
import type { Question, MediaItem, Choice } from '@/lib/types';
import { initialQuestions } from '@/lib/data'; 

const QUESTIONS_COLLECTION = 'questions';
// Firebase Storage başlatma kaldırıldı

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
                console.warn(`[questionService] Initial question ${q.id}, choice ${choice.id} media URL is a data URI. Bu, Firestore doküman boyutunu etkileyebilir.`);
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

    // Firebase Storage'a yükleme mantığı kaldırıldı.
    // Veri URI'leri (eğer varsa) doğrudan Firestore'a kaydedilecek.
    const questionToSave: Question = JSON.parse(JSON.stringify({ id, ...questionData })); 

    // Medya öğelerini kontrol et, data URI'leri doğrudan saklanacak
    for (const choice of questionToSave.choices) {
      for (const mediaItem of choice.media) {
        if (mediaItem.url && mediaItem.url.startsWith('data:')) {
          console.log(`[questionService] Data URI for question ${id}, choice ${choice.id}, type ${mediaItem.type} Firestore'a doğrudan kaydedilecek.`);
          // Base64 verisinin boyutu Firestore 1MB doküman sınırını aşabilir, dikkatli olunmalı.
        }
      }
    }

    const questionDocRef = doc(db, QUESTIONS_COLLECTION, id);
    // Firestore'a yazarken `id` alanını ayrı olarak göndermiyoruz, doküman ID'si olarak kullanılıyor.
    // Bu nedenle questionToSave'den id'yi çıkarmaya gerek yok, zaten setDoc'a verilmeyen bir nesne.
    // Ancak, questionData zaten id'yi içermiyor, bu yüzden {...questionData} yeterli.
    await setDoc(questionDocRef, { ...questionData }); // id alanı dokümanın verisine yazılmaz
    console.log(`[questionService] Soru '${id}' başarıyla Firestore'a kaydedildi/güncellendi.`);

  } catch (error: any) {
    console.error(`[questionService] Genel hata saveQuestion fonksiyonunda, soru ID ${question.id || 'ID_YOK'}:`, error);
    // Hata mesajı Storage ile ilgili olmayacak şekilde genel tutuldu.
    if (error.code && error.code.startsWith('firestore/')) {
      throw new Error(`Soru kaydedilirken bir Firestore hatası oluştu: ${error.message} (Kod: ${error.code}). Güvenlik kurallarını ve sunucu loglarını kontrol edin.`);
    } else {
      throw new Error(`Soru kaydedilirken bir hata oluştu: ${error.message}. Firestore güvenlik kurallarını ve sunucu loglarını kontrol edin.`);
    }
  }
}


// Firestore'dan bir soruyu siler
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    if (!questionId) {
      throw new Error("Silinecek soru için ID belirtilmelidir.");
    }
    // Firebase Storage'dan medya silme kodu kaldırıldı.

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
