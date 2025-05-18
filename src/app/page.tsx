
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

export default function UserPage() {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [showMedia, setShowMedia] = useState(false);

  useEffect(() => {
    // In a real app, fetch questions. For now, use mock.
    setQuestions(initialQuestions);
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    // Reset selection when language changes as text context changes
    setSelectedChoice(null);
    setShowMedia(false);
  };

  const handleAnswerSelect = (choice: Choice) => {
    setSelectedChoice(choice);
    setShowMedia(true); // Show media immediately on selection
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
    setCurrentQuestionIndex(0);
    setSelectedChoice(null);
    setShowMedia(false);
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        {questions.length === 0 ? (
          <Card className="w-full max-w-2xl p-8 text-center">
            <p className="text-xl text-muted-foreground">Loading questions...</p>
          </Card>
        ) : currentQuestion ? (
          <>
            <QuestionDisplay
              question={currentQuestion}
              currentLanguage={currentLanguage}
              onAnswerSelect={handleAnswerSelect}
            />
            {showMedia && selectedChoice?.media && (
              <MediaViewer media={selectedChoice.media} currentLanguage={currentLanguage} />
            )}
            {showMedia && selectedChoice && !selectedChoice.media && (
               <Card className="mt-8 w-full max-w-2xl mx-auto shadow-lg">
                 <CardContent className="p-6 text-center">
                   <p className="text-muted-foreground">No media associated with this choice.</p>
                 </CardContent>
               </Card>
            )}
            <div className="mt-8 flex justify-between w-full max-w-2xl">
              <Button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              {currentQuestionIndex === questions.length - 1 ? (
                 <Button onClick={handleRestart} variant="default">
                    <RefreshCw className="mr-2 h-4 w-4" /> Restart Quiz
                 </Button>
              ) : (
                <Button onClick={handleNextQuestion} disabled={currentQuestionIndex === questions.length - 1}>
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <Card className="w-full max-w-2xl p-8 text-center">
            <p className="text-xl">You've completed all questions!</p>
            <Button onClick={handleRestart} variant="default" className="mt-4">
               <RefreshCw className="mr-2 h-4 w-4" /> Restart Quiz
            </Button>
          </Card>
        )}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} YanıtMatik. All rights reserved.
      </footer>
    </div>
  );
}
