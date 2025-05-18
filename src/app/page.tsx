
"use client";

import { useState, useEffect } from 'react';
import type { LanguageCode, Question, Choice, MediaItem } from '@/lib/types';
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
  const [visualMediaForViewer, setVisualMediaForViewer] = useState<MediaItem | null>(null);
  const [audioMediaForViewer, setAudioMediaForViewer] = useState<MediaItem | null>(null);

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
     loadedQuestions.forEach(q => {
        q.choices.forEach(c => {
            if (!Array.isArray(c.media)) {
                c.media = c.media ? [c.media] : [];
            }
        });
    });
    setQuestions(loadedQuestions);
    setCurrentQuestionIndex(0);
    resetMediaAndChoice();
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    resetMediaAndChoice(); // Reset choice and media when language changes, audio should stop
  };

  const resetMediaAndChoice = () => {
    setSelectedChoice(null);
    setVisualMediaForViewer(null);
    setAudioMediaForViewer(null);
  }

  const handleAnswerSelect = (choice: Choice) => {
    setSelectedChoice(choice);

    const image = choice.media.find(m => m.type === 'image');
    const video = choice.media.find(m => m.type === 'video'); // Video is also a visual
    const audio = choice.media.find(m => m.type === 'audio');

    setVisualMediaForViewer(image || video || null); // Prioritize image, then video
    setAudioMediaForViewer(audio || null); // Set audio if present
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
  
  const handleRestart = () => {
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
    resetMediaAndChoice();
  };

  const currentQuestion = questions[currentQuestionIndex];

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
