
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { LanguageCode, Question, Choice, MediaItem } from '@/lib/types';
// import { initialQuestions } from '@/lib/data'; // Artık Firestore'dan yüklenecek
import { getQuestions } from '@/services/questionService';
import { QuestionDisplay } from '@/components/user/QuestionDisplay';
import { MediaViewer } from '@/components/user/MediaViewer';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";

export default function UserPage() {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('tr');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [visualMediaForViewer, setVisualMediaForViewer] = useState<MediaItem | null>(null);
  const [audioMediaForViewer, setAudioMediaForViewer] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadQuestionsFromService = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedQuestions = await getQuestions();
       // Gelen veriyi derin kopyalayarak ve medya formatını düzelterek state'e atayalım
      const processedQuestions = loadedQuestions.map(q => ({
        ...q,
        choices: q.choices.map(c => ({
          ...c,
          media: Array.isArray(c.media) ? c.media : (c.media ? [c.media] : [])
        }))
      }));
      setQuestions(processedQuestions);
      setCurrentQuestionIndex(0); // Sorular yüklendiğinde ilk soruya git
      resetMediaAndChoice();
    } catch (error: any) {
      console.error("Error loading questions for user page:", error);
      toast({
        title: "Hata",
        description: error.message || "Sorular yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    loadQuestionsFromService();
  }, [loadQuestionsFromService]);

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    // Dil değiştiğinde medya ve seçimi sıfırla, ama soru indeksini koru
    resetMediaAndChoice(); 
  };

  const resetMediaAndChoice = () => {
    setSelectedChoice(null);
    setVisualMediaForViewer(null);
    setAudioMediaForViewer(null);
  }

  const handleAnswerSelect = (choice: Choice) => {
    setSelectedChoice(choice);

    const image = choice.media.find(m => m.type === 'image');
    const video = choice.media.find(m => m.type === 'video');
    const audio = choice.media.find(m => m.type === 'audio');

    setVisualMediaForViewer(image || video || null);
    setAudioMediaForViewer(audio || null);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      resetMediaAndChoice();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      resetMediaAndChoice();
    }
  };
  
  const handleRestart = async () => {
    // Yeniden başlatırken soruları servisten tekrar yükle
    await loadQuestionsFromService();
    // setCurrentQuestionIndex(0) ve resetMediaAndChoice() zaten loadQuestionsFromService içinde çağrılıyor.
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (isLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
             <Header currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
            <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Sorular yükleniyor...</p>
            </main>
             <footer className="py-4 text-center text-sm text-muted-foreground border-t">
                © {new Date().getFullYear()} YanıtMatik. Firestore Bağlı.
            </footer>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        {questions.length === 0 && !isLoading ? (
          <Card className="w-full max-w-2xl p-8 text-center">
            <p className="text-xl text-muted-foreground">Gösterilecek soru bulunmuyor veya yüklenemedi.</p>
             <Button onClick={handleRestart} variant="default" className="mt-4">
               <RefreshCw className="mr-2 h-4 w-4" /> Yeniden Yükle
            </Button>
          </Card>
        ) : currentQuestion ? (
          <>
            <QuestionDisplay
              question={currentQuestion}
              currentLanguage={currentLanguage}
              onAnswerSelect={handleAnswerSelect}
              selectedChoiceId={selectedChoice?.id}
            />
            
            {(visualMediaForViewer || audioMediaForViewer) && (
              <MediaViewer
                visualMedia={visualMediaForViewer}
                audioMedia={audioMediaForViewer}
                currentLanguage={currentLanguage}
              />
            )}

            {selectedChoice && !visualMediaForViewer && !audioMediaForViewer && (
               <Card className="mt-8 w-full max-w-2xl mx-auto shadow-lg">
                 <CardContent className="p-6 text-center">
                   <p className="text-muted-foreground">Bu seçenekle ilişkili medya bulunmuyor.</p>
                 </CardContent>
               </Card>
            )}

            <div className="mt-8 flex justify-between w-full max-w-2xl">
              <Button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0 || isLoading} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" /> Önceki
              </Button>
              {currentQuestionIndex === questions.length - 1 && questions.length > 0 ? (
                 <Button onClick={handleRestart} variant="default" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Testi Yeniden Başlat
                 </Button>
              ) : (
                <Button onClick={handleNextQuestion} disabled={!selectedChoice || currentQuestionIndex >= questions.length - 1 || isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sonraki <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        ) : (
           !isLoading && questions.length > 0 && // Sadece sorular varsa ve yükleme bittiyse bu bloğu göster
          <Card className="w-full max-w-2xl p-8 text-center">
            <p className="text-xl">Tüm soruları tamamladınız!</p>
            <Button onClick={handleRestart} variant="default" className="mt-4" disabled={isLoading}>
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Testi Yeniden Başlat
            </Button>
          </Card>
        )}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} YanıtMatik. Firestore Bağlı.
      </footer>
    </div>
  );
}
