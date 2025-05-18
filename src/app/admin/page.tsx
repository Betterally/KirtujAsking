
"use client";

import { useState, useEffect } from 'react';
import type { LanguageCode, Question, Choice, MediaItem, LocalizedText } from '@/lib/types';
import { initialQuestions } from '@/lib/data'; // Using initialQuestions as a starting point / example
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Edit3, List } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';

// This is a simplified admin page. In a real app, this would interact with a backend.
// For this scaffold, it manages questions in local state. Changes do not persist.

const createEmptyLocalizedText = (): LocalizedText => {
  const obj: LocalizedText = {};
  SUPPORTED_LANGUAGES.forEach(lang => obj[lang.code] = "");
  return obj;
};

const createNewChoice = (idSuffix: string): Choice => ({
  id: `newChoice-${idSuffix}-${Date.now()}`,
  text: createEmptyLocalizedText(),
  media: null,
});

const createNewQuestion = (): Question => ({
  id: `newQuestion-${Date.now()}`,
  text: createEmptyLocalizedText(),
  choices: [createNewChoice('1'), createNewChoice('2')],
});


export default function AdminPage() {
  const [currentEditLanguage, setCurrentEditLanguage] = useState<LanguageCode>('en');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    // Load initial data - in a real app, this would be fetched.
    // Deep copy to avoid modifying the imported initialQuestions directly if it's used elsewhere.
    setQuestions(JSON.parse(JSON.stringify(initialQuestions)));
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentEditLanguage(lang);
  };

  const handleSelectQuestion = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      // Deep copy for editing
      setSelectedQuestion(JSON.parse(JSON.stringify(question)));
      setIsCreatingNew(false);
    }
  };

  const handleAddNewQuestion = () => {
    setSelectedQuestion(createNewQuestion());
    setIsCreatingNew(true);
  };

  const handleQuestionChange = (field: keyof LocalizedText, value: string, lang?: LanguageCode) => {
    if (!selectedQuestion) return;
    const langToUpdate = lang || currentEditLanguage;
    setSelectedQuestion(prev => prev ? { ...prev, text: { ...prev.text, [langToUpdate]: value } } : null);
  };
  
  const handleChoiceTextChange = (choiceIndex: number, value: string, lang?: LanguageCode) => {
    if (!selectedQuestion) return;
    const langToUpdate = lang || currentEditLanguage;
    const updatedChoices = [...selectedQuestion.choices];
    updatedChoices[choiceIndex].text[langToUpdate] = value;
    setSelectedQuestion(prev => prev ? { ...prev, choices: updatedChoices } : null);
  };

  const handleChoiceMediaChange = (choiceIndex: number, field: keyof MediaItem | 'type', value: string) => {
    if (!selectedQuestion) return;
    const updatedChoices = [...selectedQuestion.choices];
    let media = updatedChoices[choiceIndex].media;
    if (!media) media = { type: 'image', url: '', altText: createEmptyLocalizedText() };

    if (field === 'type') {
      media.type = value as MediaItem['type'];
    } else if (field === 'url') {
      media.url = value;
    } else if (field === 'altTextEN') {
      if (!media.altText) media.altText = createEmptyLocalizedText();
      media.altText['en'] = value;
    } else if (field === 'altTextTR') {
       if (!media.altText) media.altText = createEmptyLocalizedText();
      media.altText['tr'] = value;
    }
    
    updatedChoices[choiceIndex].media = media;
    setSelectedQuestion(prev => prev ? { ...prev, choices: updatedChoices } : null);
  };
  
  const handleRemoveChoiceMedia = (choiceIndex: number) => {
    if (!selectedQuestion) return;
    const updatedChoices = [...selectedQuestion.choices];
    updatedChoices[choiceIndex].media = null;
    setSelectedQuestion(prev => prev ? { ...prev, choices: updatedChoices } : null);
  };

  const handleAddChoiceToQuestion = () => {
    if (!selectedQuestion) return;
    setSelectedQuestion(prev => prev ? {
      ...prev,
      choices: [...prev.choices, createNewChoice((prev.choices.length + 1).toString())]
    } : null);
  };

  const handleRemoveChoiceFromQuestion = (choiceIndex: number) => {
    if (!selectedQuestion || selectedQuestion.choices.length <= 1) {
      toast({ title: "Error", description: "A question must have at least one choice.", variant: "destructive" });
      return;
    }
    setSelectedQuestion(prev => prev ? {
      ...prev,
      choices: prev.choices.filter((_,idx) => idx !== choiceIndex)
    } : null);
  };

  const handleSaveQuestion = () => {
    if (!selectedQuestion) return;

    if (isCreatingNew) {
      setQuestions(prev => [...prev, selectedQuestion]);
    } else {
      setQuestions(prev => prev.map(q => q.id === selectedQuestion.id ? selectedQuestion : q));
    }
    toast({ title: "Success", description: `Question "${selectedQuestion.text[currentEditLanguage] || selectedQuestion.text['en']}" saved.` });
    setSelectedQuestion(null);
    setIsCreatingNew(false);
  };

  const handleDeleteQuestion = () => {
    if (!selectedQuestion || isCreatingNew) return; // Cannot delete a new unsaved question this way
    setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
    toast({ title: "Deleted", description: `Question "${selectedQuestion.text[currentEditLanguage] || selectedQuestion.text['en']}" deleted.`, variant: "destructive" });
    setSelectedQuestion(null);
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Header currentLanguage={currentEditLanguage} onLanguageChange={handleLanguageChange} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Questions List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5" /> Questions</CardTitle>
              <Button onClick={handleAddNewQuestion} size="sm" className="w-full mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Question
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-280px)]">
                {questions.map(q => (
                  <Button
                    key={q.id}
                    variant={selectedQuestion?.id === q.id && !isCreatingNew ? "secondary" : "ghost"}
                    className="w-full justify-start mb-2 text-left h-auto py-2"
                    onClick={() => handleSelectQuestion(q.id)}
                  >
                    {q.text[currentEditLanguage] || q.text['en'] || "Untitled Question"}
                  </Button>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Question Editor Form */}
          {selectedQuestion ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Edit3 className="mr-2 h-5 w-5" /> 
                  {isCreatingNew ? "Create New Question" : `Edit Question: ${selectedQuestion.text[currentEditLanguage] || selectedQuestion.text['en']}`}
                </CardTitle>
                <CardDescription>
                  Editing language: {SUPPORTED_LANGUAGES.find(l=>l.code === currentEditLanguage)?.name}. Changes are local and won't persist.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                <div className="space-y-4">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <div key={`qtext-${lang.code}`}>
                      <Label htmlFor={`questionText-${lang.code}`}>Question Text ({lang.name})</Label>
                      <Textarea
                        id={`questionText-${lang.code}`}
                        value={selectedQuestion.text[lang.code] || ""}
                        onChange={(e) => handleQuestionChange(lang.code as keyof LocalizedText, e.target.value, lang.code as LanguageCode)}
                        placeholder={`Enter question text in ${lang.name}`}
                      />
                    </div>
                  ))}
                </div>

                <Separator />
                <h3 className="text-lg font-semibold">Choices</h3>
                {selectedQuestion.choices.map((choice, choiceIndex) => (
                  <Card key={choice.id} className="p-4 space-y-3 bg-muted/30">
                    <div className="flex justify-between items-center">
                       <h4 className="font-medium">Choice {choiceIndex + 1}</h4>
                       <Button variant="ghost" size="icon" onClick={() => handleRemoveChoiceFromQuestion(choiceIndex)} aria-label="Remove choice">
                         <Trash2 className="h-4 w-4 text-destructive"/>
                       </Button>
                    </div>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <div key={`ctext-${choice.id}-${lang.code}`}>
                        <Label htmlFor={`choiceText-${choice.id}-${lang.code}`}>Choice Text ({lang.name})</Label>
                        <Input
                          id={`choiceText-${choice.id}-${lang.code}`}
                          value={choice.text[lang.code] || ""}
                          onChange={(e) => handleChoiceTextChange(choiceIndex, e.target.value, lang.code as LanguageCode)}
                          placeholder={`Choice text in ${lang.name}`}
                        />
                      </div>
                    ))}
                    
                    {/* Media Configuration */}
                    <div className="space-y-2 pt-2 border-t mt-2">
                        <Label>Media (Optional)</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Select
                                value={choice.media?.type || "none"}
                                onValueChange={(value) => handleChoiceMediaChange(choiceIndex, 'type', value === "none" ? "" : value)}
                            >
                                <SelectTrigger><SelectValue placeholder="Media Type" /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="image">Image</SelectItem>
                                <SelectItem value="audio">Audio</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                </SelectContent>
                            </Select>
                            {choice.media?.type && choice.media?.type !== "none" && (
                                <Button variant="outline" size="sm" onClick={() => handleRemoveChoiceMedia(choiceIndex)}>
                                    <Trash2 className="mr-1 h-3 w-3" /> Clear Media
                                </Button>
                            )}
                        </div>
                        {choice.media && choice.media.type !== "none" && (
                        <>
                            <Input
                            value={choice.media.url}
                            onChange={(e) => handleChoiceMediaChange(choiceIndex, 'url', e.target.value)}
                            placeholder="Media URL (e.g., https://example.com/image.jpg)"
                            />
                            {choice.media.type === 'image' && SUPPORTED_LANGUAGES.map(lang => (
                            <Input
                                key={`altText-${choice.id}-${lang.code}`}
                                value={choice.media?.altText?.[lang.code] || ""}
                                onChange={(e) => handleChoiceMediaChange(choiceIndex, lang.code === 'en' ? 'altTextEN' : 'altTextTR', e.target.value)}
                                placeholder={`Alt text for image (${lang.name})`}
                            />
                            ))}
                        </>
                        )}
                    </div>

                  </Card>
                ))}
                <Button variant="outline" onClick={handleAddChoiceToQuestion} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Choice
                </Button>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  {selectedQuestion && !isCreatingNew && (
                     <Button variant="destructive" onClick={handleDeleteQuestion}>Delete Question</Button>
                  )}
                  <Button onClick={handleSaveQuestion}>Save Question</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <CardHeader>
                <CardTitle>No Question Selected</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Select a question from the list to edit, or add a new one.</p>
                 <Button onClick={handleAddNewQuestion} size="lg" className="mt-6">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New Question
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        Admin Panel - YanıtMatik
      </footer>
    </div>
  );
}
