
"use client";

import type { Question, Choice, LanguageCode, MediaItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Volume2, Film, AlertCircle, Paperclip } from "lucide-react";
import { useState } from "react";

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
      return <Paperclip className="w-4 h-4 ml-2 text-muted-foreground" />; // Generic for other or multiple
  }
};

const getChoiceDisplayIcon = (mediaItems: MediaItem[]) => {
  if (!mediaItems || mediaItems.length === 0) return null;
  
  const hasImage = mediaItems.some(m => m.type === 'image');
  const hasAudio = mediaItems.some(m => m.type === 'audio');

  if (hasImage && hasAudio) {
    return (
      <>
        <ImageIcon className="w-4 h-4 ml-2 text-muted-foreground" />
        <Volume2 className="w-4 h-4 ml-1 text-muted-foreground" />
      </>
    );
  }
  if (hasImage) return getMediaIconElement('image');
  if (hasAudio) return getMediaIconElement('audio');
  // If other types exist, you can extend this logic or use a generic icon
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

  if (!question) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-6 w-6 text-destructive" />
            No Question Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please try again later or contact support.</p>
        </CardContent>
      </Card>
    );
  }
  
  const questionText = question.text[currentLanguage] || question.text['tr'] || question.text['en']; // Fallback logic

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
            const choiceText = choice.text[currentLanguage] || choice.text['tr'] || choice.text['en']; // Fallback logic
            const choiceId = `${question.id}-choice-${index}`;
            return (
              <div key={choice.id} className="flex items-center">
                <RadioGroupItem value={choice.id} id={choiceId} />
                <Label htmlFor={choiceId} className="ml-3 flex-1 cursor-pointer text-lg p-3 rounded-md hover:bg-accent/20 transition-colors border border-transparent focus-within:border-primary">
                  <span className="flex items-center justify-between">
                    {choiceText}
                    {getChoiceDisplayIcon(choice.media)}
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
