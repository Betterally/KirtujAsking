
"use client";

import { useState, useEffect } from 'react';
import type { LanguageCode, Question, Choice } from '@/lib/types';
import { initialQuestions } from '@/lib/data';
import { QuestionDisplay } from '@/components/user/QuestionDisplay';
import { MediaViewer } from '@/components/user/MediaViewer';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const LOCAL_STORAGE_KEY = 'yanitmatik_questions';

export default function UserPage() {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('tr');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [showMedia, setShowMedia] = useState(false);

  useEffect(() => {
    let loadedQuestions: Question[];
    try {
      const storedQuestionsData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedQuestionsData) {
        loadedQuestions = JSON.parse(storedQuestionsData);
      } else {
        loadedQuestions = JSON.parse(JSON.stringify(initialQuestions));
      }
    } catch (error) {
      console.error("Error loading questions from localStorage for user page, falling back to initial data:", error);
      loadedQuestions = JSON.parse(JSON.stringify(initialQuestions));
    }
    // Ensure media is always an array after loading
     loadedQuestions.forEach(q => {
        q.choices.forEach(c => {
            if (!Array.isArray(c.media)) {
                c.media = c.media ? [c.media] : [];
            }
        });
    });
    setQuestions(loadedQuestions);
    setCurrentQuestionIndex(0);
    setSelectedChoice(null);
    setShowMedia(false);
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    setSelectedChoice(null); // Reset choice when language changes
    setShowMedia(false); // Hide media when language changes
  };

  const handleAnswerSelect = (choice: Choice) => {
    setSelectedChoice(choice);
    setShowMedia(true); 
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedChoice(null);
      setShowMedia(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
      setSelectedChoice(null);
      setShowMedia(false);
    }
  };
  
  const handleRestart = () => {
    // Reload questions from localStorage or initialData to ensure consistency
    let loadedQuestions: Question[];
    try {
        const storedQuestionsData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedQuestionsData) {
            loadedQuestions = JSON.parse(storedQuestionsData);
        } else {
            loadedQuestions = JSON.parse(JSON.stringify(initialQuestions));
        }
    } catch (error) {
        console.error("Error reloading questions on restart, falling back to initial data:", error);
        loadedQuestions = JSON.parse(JSON.stringify(initialQuestions));
    }
    loadedQuestions.forEach(q => {
        q.choices.forEach(c => {
            if (!Array.isArray(c.media)) {
                c.media = c.media ? [c.media] : [];
            }
        });
    });
    setQuestions(loadedQuestions);

    setCurrentQuestionIndex(0);
    setSelectedChoice(null);
    setShowMedia(false);
  };

  const currentQuestion = questions[currentQuestionIndex];

  const mediaToDisplay = selectedChoice?.media?.find(m => m.type === 'image') ||
                         selectedChoice?.media?.find(m => m.type === 'audio') ||
                         selectedChoice?.media?.find(m => m.type === 'video') ||
                         selectedChoice?.media?.[0];


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        {questions.length === 0 ? (
          <Card className="w-full max-w-2xl p-8 text-center">
            <p className="text-xl text-muted-foreground">Sorular yükleniyor veya hiç soru bulunmuyor.</p>
          </Card>
        ) : currentQuestion ? (
          <>
            <QuestionDisplay
              question={currentQuestion}
              currentLanguage={currentLanguage}
              onAnswerSelect={handleAnswerSelect}
            />
            {showMedia && mediaToDisplay && (
              <MediaViewer media={mediaToDisplay} currentLanguage={currentLanguage} />
            )}
            {showMedia && selectedChoice && (!selectedChoice.media || selectedChoice.media.length === 0) && (
               <Card className="mt-8 w-full max-w-2xl mx-auto shadow-lg">
                 <CardContent className="p-6 text-center">
                   <p className="text-muted-foreground">Bu seçenekle ilişkili medya bulunmuyor.</p>
                 </CardContent>
               </Card>
            )}
            <div className="mt-8 flex justify-between w-full max-w-2xl">
              <Button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" /> Önceki
              </Button>
              {currentQuestionIndex === questions.length - 1 && questions.length > 0 ? (
                 <Button onClick={handleRestart} variant="default">
                    <RefreshCw className="mr-2 h-4 w-4" /> Testi Yeniden Başlat
                 </Button>
              ) : (
                <Button onClick={handleNextQuestion} disabled={!selectedChoice || currentQuestionIndex >= questions.length - 1}>
                    Sonraki <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <Card className="w-full max-w-2xl p-8 text-center">
            <p className="text-xl">Tüm soruları tamamladınız!</p>
            <Button onClick={handleRestart} variant="default" className="mt-4">
               <RefreshCw className="mr-2 h-4 w-4" /> Testi Yeniden Başlat
            </Button>
          </Card>
        )}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} YanıtMatik. Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
