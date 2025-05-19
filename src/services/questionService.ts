// src/services/questionService.ts
'use server'; // Next.js Server Action olarak işaretleyebiliriz veya API route kullanabiliriz.
              // Şimdilik doğrudan client-side import edilecek şekilde bırakalım.
              // Eğer Server Actions kullanacaksak, bu dosyanın yapısı biraz değişebilir.
              // Ancak temel Firestore işlemleri aynı kalır.

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, orderBy } from 'firebase/firestore';
import type { Question } from '@/lib/types';
import { initialQuestions } from '@/lib/data'; // Fallback için

const QUESTIONS_COLLECTION = 'questions';

// Firestore'dan tüm soruları getirir
export async function getQuestions(): Promise<Question[]> {
  try {
    const questionsCollection = collection(db, QUESTIONS_COLLECTION);
    // Soruları ID'ye göre sıralı getirelim ki admin panelinde tutarlı bir sıra olsun
    // initialQuestions'da ID'ler string (q1, q2) olduğu için bu sıralama çok anlamlı olmayabilir
    // ama sayısal veya zaman damgası ID'leri için faydalı olur.
    // Şimdilik basit bir getDocs kullanalım.
    const querySnapshot = await getDocs(questionsCollection);
    
    let questions: Question[] = [];
    querySnapshot.forEach((doc) => {
      questions.push({ id: doc.id, ...doc.data() } as Question);
    });

    // Eğer Firestore'da hiç soru yoksa ve initialQuestions varsa, bunları ekleyelim
    if (questions.length === 0 && initialQuestions.length > 0) {
      console.log("Firestore'da soru bulunamadı, initialQuestions yükleniyor...");
      const batch = writeBatch(db);
      initialQuestions.forEach((q) => {
        const questionDocRef = doc(db, QUESTIONS_COLLECTION, q.id); // initialQuestions ID'lerini kullanalım
        batch.set(questionDocRef, q);
      });
      await batch.commit();
      console.log("Initial questions Firestore'a yüklendi.");
      return JSON.parse(JSON.stringify(initialQuestions)); // Firestore'a eklenenleri döndür
    }
    
    // Soruları, initialQuestions'daki sıraya göre sıralayalım (eğer hepsi initial'dan geliyorsa)
    // Bu, ID'lerin tutarlı olması durumunda daha anlamlı olur.
    // Şimdilik Firestore'dan geldiği sırayla bırakalım.
    // Ya da ID'lerine göre bir sıralama yapabiliriz:
    questions.sort((a, b) => {
        const numA = parseInt(a.id.replace('q', ''), 10);
        const numB = parseInt(b.id.replace('q', ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return a.id.localeCompare(b.id);
    });


    return questions;
  } catch (error) {
    console.error("Firestore'dan soruları getirme hatası: ", error);
    // Hata durumunda, initialQuestions'ı fallback olarak döndürebiliriz.
    // Ancak bu, kullanıcının Firestore'daki güncel veriyi görememesine neden olabilir.
    // Şimdilik boş dizi veya hata fırlatmak daha iyi olabilir.
    // return JSON.parse(JSON.stringify(initialQuestions)); 
    throw new Error("Sorular yüklenirken bir hata oluştu.");
  }
}

// Firestore'a yeni bir soru ekler veya mevcut bir soruyu günceller
export async function saveQuestion(question: Question): Promise<void> {
  try {
    // Question objesinden id'yi ayırıp geri kalanını data olarak kaydediyoruz.
    // Firestore doküman ID'si olarak question.id'yi kullanacağız.
    const { id, ...questionData } = question;
    if (!id) {
      throw new Error("Kaydedilecek soru için ID belirtilmelidir.");
    }
    const questionDocRef = doc(db, QUESTIONS_COLLECTION, id);
    await setDoc(questionDocRef, questionData); // id'siz veriyi kaydet
  } catch (error) {
    console.error("Firestore'a soru kaydetme hatası: ", error);
    throw new Error("Soru kaydedilirken bir hata oluştu.");
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
  } catch (error) {
    console.error("Firestore'dan soru silme hatası: ", error);
    throw new Error("Soru silinirken bir hata oluştu.");
  }
}
