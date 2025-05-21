
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
      console.log("Firestore'da soru bulunamadı, initialQuestions yükleniyor...");
      try {
        const batch = writeBatch(db);
        const questionsToSaveInitially: Question[] = JSON.parse(JSON.stringify(initialQuestions));

        for (const q of questionsToSaveInitially) {
          for (const choice of q.choices) {
            for (const mediaItem of choice.media) {
              if (mediaItem.url && mediaItem.url.startsWith('data:')) {
                // Bu başlangıçta data URI ise, normalde olmamalı ama bir güvenlik önlemi
                console.warn(`Initial question ${q.id}, choice ${choice.id} media URL is a data URI. This should ideally be a direct URL or uploaded during a proper save operation.`);
              } else if (mediaItem.url && !mediaItem.url.startsWith('https://') && !mediaItem.url.startsWith('http://')) {
                // Bu, bir yer tutucu veya geçersiz bir URL olabilir, initialQuestions için doğrudan URL'ler beklenir.
                console.warn(`Initial question ${q.id}, choice ${choice.id} media URL is not a valid HTTP/HTTPS URL: ${mediaItem.url}. Using placeholder.`);
                // mediaItem.url = `https://placehold.co/300x200.png?text=${mediaItem.type}`; // Veya boş bırakılabilir
              }
            }
          }
          const questionDocRef = doc(db, QUESTIONS_COLLECTION, q.id);
          batch.set(questionDocRef, q);
        }
        await batch.commit();
        console.log("Initial questions Firestore'a yüklendi.");
        return questionsToSaveInitially;
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

        const numA = parseInt(aIdStr.replace(/\D/g, ''), 10); // Sadece sayıları al
        const numB = parseInt(bIdStr.replace(/\D/g, ''), 10);

        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
            return numA - numB;
        }
        return aIdStr.localeCompare(bIdStr); // Sayısal kısımlar aynıysa veya sayısal değilse string karşılaştırması
    });

    return questions;
  } catch (error: any) {
    console.error("Firestore'dan soruları getirme/işleme genel hatası: ", error);
    if (error.message && error.message.startsWith("Initial questions could not be written")) {
        throw error; // Re-throw the specific error
    }
    // Genel hatayı istemciye daha anlaşılır bir şekilde yeniden fırlat
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

    const questionToSave: Question = JSON.parse(JSON.stringify({ id, ...questionData })); // Deep copy

    // Medya dosyalarını Firebase Storage'a yükle
    for (const choice of questionToSave.choices) {
      for (let i = 0; i < choice.media.length; i++) {
        const mediaItem = choice.media[i];
        if (mediaItem.url && mediaItem.url.startsWith('data:')) {
          console.log(`Uploading media for question ${id}, choice ${choice.id}, type ${mediaItem.type} to Firebase Storage...`);
          const [header, base64Data] = mediaItem.url.split(',');
          if (!base64Data) {
            throw new Error('Invalid data URI format for media.');
          }
          const mimeTypeMatch = header.match(/:(.*?);/);
          const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'application/octet-stream';
          
          const fileExtension = mimeType.split('/')[1] || 'bin';
          const fileName = `${mediaItem.type}_${Date.now()}_${Math.random().toString(36).substring(2,7)}.${fileExtension}`;
          const filePath = `questions_media/${id}/${choice.id}/${fileName}`;
          const fileRef = storageRef(storage, filePath);

          await uploadString(fileRef, base64Data, 'base64', { contentType: mimeType });
          const downloadURL = await getDownloadURL(fileRef);
          mediaItem.url = downloadURL; // URL'yi Firebase Storage URL'si ile güncelle
          console.log(`Media uploaded. URL: ${downloadURL}`);
        }
      }
    }

    const questionDocRef = doc(db, QUESTIONS_COLLECTION, id);
    await setDoc(questionDocRef, { ...questionToSave, id: undefined }); // Firestore'a id'yi ayrı bir alan olarak kaydetme, doküman ID'si zaten id
    console.log(`Soru '${id}' başarıyla Firestore'a kaydedildi/güncellendi (medya Firebase Storage'a yüklendi).`);
  } catch (error: any) {
    console.error(`Firestore'a soru (${question.id || 'ID_YOK'}) kaydetme hatası: `, error);
    console.error("Olası Nedenler: Firestore/Storage güvenlik kuralları yazma/okuma izni vermiyor olabilir, veri formatı (schema) ile ilgili bir sorun olabilir veya geçersiz bir data URI olabilir.");
    throw new Error(`Soru kaydedilirken bir hata oluştu: ${error.message}. Check Firestore/Storage security rules and server logs.`);
  }
}


// Firestore'dan bir soruyu siler
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    if (!questionId) {
      throw new Error("Silinecek soru için ID belirtilmelidir.");
    }

    // İsteğe bağlı: Soru silinirken ilişkili Firebase Storage dosyalarını da silmek
    // Bu kısım için önce soruyu Firestore'dan okuyup medya URL'lerini almak gerekir.
    // Şimdilik sadece Firestore dokümanını silelim. Daha sonra bu geliştirilebilir.
    // Örneğin:
    // const questionDoc = await getDoc(doc(db, QUESTIONS_COLLECTION, questionId));
    // if (questionDoc.exists()) {
    //   const questionData = questionDoc.data() as Question;
    //   for (const choice of questionData.choices) {
    //     for (const media of choice.media) {
    //       if (media.url.includes("firebasestorage.googleapis.com")) {
    //         try {
    //           const fileStorageRef = storageRef(storage, media.url);
    //           await deleteStorageObject(fileStorageRef);
    //           console.log(`Firebase Storage'dan silindi: ${media.url}`);
    //         } catch (storageError: any) {
    //           // Eğer dosya bulunamazsa veya silinemezse hatayı logla ama devam et
    //           console.error(`Storage'dan dosya silme hatası (${media.url}): `, storageError.message);
    //         }
    //       }
    //     }
    //   }
    // }


    const questionDocRef = doc(db, QUESTIONS_COLLECTION, questionId);
    await deleteDoc(questionDocRef);
    console.log(`Soru '${questionId}' başarıyla Firestore'dan silindi.`);
  } catch (error: any) {
    console.error(`Firestore'dan soru (${questionId}) silme hatası: `, error);
    console.error("Olası Nedenler: Firestore güvenlik kuralları silme izni vermiyor olabilir.");
    throw new Error(`Soru silinirken bir hata oluştu: ${error.message}. Check Firestore security rules and server logs.`);
  }
}

// Tür tanımlarını da ekleyelim ki içe aktarmada sorun olmasın
export type { Question, MediaItem, Choice };
