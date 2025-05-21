// src/services/questionService.ts
'use server'; 

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initialQuestions } from '@/lib/data'; 

const QUESTIONS_COLLECTION = 'questions';

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
      console.log("Firestore'da soru bulunamadı, initialQuestions yükleniyor...");
      try {
        const batch = writeBatch(db);
        initialQuestions.forEach((q) => {
          const questionDocRef = doc(db, QUESTIONS_COLLECTION, q.id);
          batch.set(questionDocRef, q);
        });
        await batch.commit();
        console.log("Initial questions Firestore'a yüklendi.");
        return JSON.parse(JSON.stringify(initialQuestions)); 
      } catch (writeError: any) {
        console.error("!!! KRİTİK: initialQuestions Firestore'a YAZILAMADI !!!");
        console.error("Yazma Hatası Detayları:", writeError);
        console.error("Olası Nedenler: Firestore güvenlik kuralları yazma izni vermiyor olabilir (özellikle '/questions' koleksiyonu için). Lütfen Firebase konsolundaki Firestore güvenlik kurallarınızı kontrol edin.");
        throw new Error(`Initial questions could not be written to Firestore: ${writeError.message}. Check Firestore security rules and server logs.`);
      }
    }
    
    questions.sort((a, b) => {
        const aIdStr = String(a.id || ''); 
        const bIdStr = String(b.id || ''); 

        const numA = parseInt(aIdStr.replace('q', ''), 10);
        const numB = parseInt(bIdStr.replace('q', ''), 10);

        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return aIdStr.localeCompare(bIdStr);
    });

    return questions;
  } catch (error: any) {
    console.error("Firestore'dan soruları getirme/işleme genel hatası: ", error);
    if (error.message && error.message.startsWith("Initial questions could not be written")) {
        throw error; // Re-throw the specific error
    }
    throw new Error(`Sorular yüklenirken bir hata oluştu: ${error.message}`);
  }
}

// Firestore'a yeni bir soru ekler veya mevcut bir soruyu günceller
export async function saveQuestion(question: Question): Promise<void> {
  try {
    const { id, ...questionData } = question;
    if (!id) {
      throw new Error("Kaydedilecek soru için ID belirtilmelidir.");
    }
    const questionDocRef = doc(db, QUESTIONS_COLLECTION, id);
    await setDoc(questionDocRef, questionData); 
    console.log(`Soru '${id}' başarıyla Firestore'a kaydedildi/güncellendi.`);
  } catch (error: any) {
    console.error(`Firestore'a soru (${question.id || 'ID_YOK'}) kaydetme hatası: `, error);
    console.error("Olası Nedenler: Firestore güvenlik kuralları yazma izni vermiyor olabilir veya veri formatı (schema) ile ilgili bir sorun olabilir.");
    throw new Error(`Soru kaydedilirken bir hata oluştu: ${error.message}. Check Firestore security rules and server logs.`);
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
    console.log(`Soru '${questionId}' başarıyla Firestore'dan silindi.`);
  } catch (error: any) {
    console.error(`Firestore'dan soru (${questionId}) silme hatası: `, error);
    console.error("Olası Nedenler: Firestore güvenlik kuralları silme izni vermiyor olabilir.");
    throw new Error(`Soru silinirken bir hata oluştu: ${error.message}. Check Firestore security rules and server logs.`);
  }
}
