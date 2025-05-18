
"use client";

import type { Question, Choice, LanguageCode, MediaItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Volume2, Film, AlertCircle, Paperclip } from "lucide-react";
import { useState, useEffect } from "react"; // Added useEffect here

interface QuestionDisplayProps {
  question: Question;
  currentLanguage: LanguageCode;
  onAnswerSelect: (choice: Choice) => void;
}

const getMediaIconElement = (mediaType: MediaItem['type'] | undefined) => {
  if (!mediaType) return null;
  switch (mediaType) {
    case 'image':
      return <ImageIcon className="w-4 h-4 ml-2 text-muted-foreground" />;
    case 'audio':
      return <Volume2 className="w-4 h-4 ml-2 text-muted-foreground" />;
    case 'video':
      return <Film className="w-4 h-4 ml-2 text-muted-foreground" />;
    default:
      return <Paperclip className="w-4 h-4 ml-2 text-muted-foreground" />; 
  }
};

const getChoiceDisplayIcons = (mediaItems: MediaItem[]) => {
  if (!mediaItems || mediaItems.length === 0) return null;
  
  const icons = [];
  if (mediaItems.some(m => m.type === 'image')) {
    icons.push(<ImageIcon key="image-icon" className="w-4 h-4 ml-2 text-muted-foreground" />);
  }
  if (mediaItems.some(m => m.type === 'audio')) {
    icons.push(<Volume2 key="audio-icon" className="w-4 h-4 ml-1 text-muted-foreground" />);
  }
  if (mediaItems.some(m => m.type === 'video')) {
    icons.push(<Film key="video-icon" className="w-4 h-4 ml-1 text-muted-foreground" />);
  }

  if (icons.length > 0) return <>{icons}</>;
  
  // Fallback for unknown or other types, if any single media item exists
  if (mediaItems[0]) return getMediaIconElement(mediaItems[0].type);
  return null;
};

export function QuestionDisplay({ question, currentLanguage, onAnswerSelect }: QuestionDisplayProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);

  const handleSelect = (choiceId: string) => {
    setSelectedValue(choiceId);
    const selectedChoice = question.choices.find(c => c.id === choiceId);
    if (selectedChoice) {
      onAnswerSelect(selectedChoice);
    }
  };

  useEffect(() => {
    // Reset selected value when question changes
    setSelectedValue(undefined);
  }, [question]);

  if (!question) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-6 w-6 text-destructive" />
            Soru Mevcut Değil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Lütfen daha sonra tekrar deneyin veya destek ile iletişime geçin.</p>
        </CardContent>
      </Card>
    );
  }
  
  const questionText = question.text[currentLanguage] || question.text['tr'] || "Soru metni bulunamadı";

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">
          {questionText}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedValue} onValueChange={handleSelect} className="space-y-4">
          {question.choices.map((choice, index) => {
            const choiceText = choice.text[currentLanguage] || choice.text['tr'] || "Seçenek metni bulunamadı";
            const choiceId = `${question.id}-choice-${choice.id}`; // Ensure unique id for label association
            return (
              <div key={choice.id} className="flex items-center">
                <RadioGroupItem value={choice.id} id={choiceId} />
                <Label htmlFor={choiceId} className="ml-3 flex-1 cursor-pointer text-lg p-3 rounded-md hover:bg-accent/20 transition-colors border border-transparent focus-within:border-primary">
                  <span className="flex items-center justify-between">
                    {choiceText}
                    {getChoiceDisplayIcons(choice.media)}
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
