
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
    setQuestions(JSON.parse(JSON.stringify(initialQuestions)));
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    setCurrentEditLanguage(lang);
  };

  const handleSelectQuestion = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
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
    const updatedChoices = JSON.parse(JSON.stringify(selectedQuestion.choices));
    updatedChoices[choiceIndex].text[langToUpdate] = value;
    setSelectedQuestion(prev => prev ? { ...prev, choices: updatedChoices } : null);
  };

  const handleChoiceMediaChange = (choiceIndex: number, field: string, value: string) => {
    if (!selectedQuestion) return;
    
    const updatedChoices = JSON.parse(JSON.stringify(selectedQuestion.choices));
    let media = updatedChoices[choiceIndex].media;

    if (!media) {
      // If media is null, and we are trying to set a property, initialize it.
      // Default type can be 'image' or based on field if specific enough.
      // However, type should ideally be set first via the dropdown.
      media = { type: 'image', url: '', altText: createEmptyLocalizedText() };
    }

    if (field === 'type') {
      media.type = value as MediaItem['type'];
      if (value === "none") { // If type is set to "none", clear media object
        updatedChoices[choiceIndex].media = null;
        setSelectedQuestion(prev => prev ? { ...prev, choices: updatedChoices } : null);
        return;
      }
    } else if (field === 'url') {
      media.url = value;
    } else if (field.startsWith('altText-')) {
      const langCode = field.substring('altText-'.length) as LanguageCode;
      if (!media.altText) media.altText = createEmptyLocalizedText();
      media.altText[langCode] = value;
    }
    
    updatedChoices[choiceIndex].media = media;
    setSelectedQuestion(prev => prev ? { ...prev, choices: updatedChoices } : null);
  };

  const handleChoiceMediaFileChange = (choiceIndex: number, file: File | null) => {
    if (!selectedQuestion) return;

    const choicesCopy = JSON.parse(JSON.stringify(selectedQuestion.choices));
    const currentChoiceMedia = choicesCopy[choiceIndex].media;

    if (!file) { // File was cleared from input
        if (currentChoiceMedia && currentChoiceMedia.url && currentChoiceMedia.url.startsWith('data:')) {
            currentChoiceMedia.url = ''; // Clear the data URI
            setSelectedQuestion(prev => prev ? { ...prev, choices: choicesCopy } : null);
            toast({ title: "Dosya Temizlendi", description: "Daha önce seçilen dosya kaldırıldı." });
        }
        // Reset file input visually if needed - this is tricky as file input value is read-only
        // For now, clearing the URL should suffice. User can re-select.
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const dataUrl = reader.result as string;
        
        if (!currentChoiceMedia) { // Should not happen if type is selected first from dropdown
             choicesCopy[choiceIndex].media = { type: 'video', url: dataUrl, altText: createEmptyLocalizedText() };
        } else {
            currentChoiceMedia.url = dataUrl;
            // Optionally update type based on file.type if it's generic,
            // but dropdown selection should be primary.
            // if (!['image', 'audio', 'video'].includes(currentChoiceMedia.type)) {
            //   if (file.type.startsWith('image/')) currentChoiceMedia.type = 'image';
            //   else if (file.type.startsWith('video/')) currentChoiceMedia.type = 'video';
            //   else if (file.type.startsWith('audio/')) currentChoiceMedia.type = 'audio';
            // }
        }
        
        setSelectedQuestion(prev => prev ? { ...prev, choices: choicesCopy } : null);
        toast({ title: "Dosya Hazır", description: `${file.name} seçildi. Kalıcı olması için soruyu kaydedin.` });
    };
    reader.onerror = () => {
        toast({ title: "Dosya Hatası", description: "Seçilen dosya okunamadı.", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveChoiceMedia = (choiceIndex: number) => {
    if (!selectedQuestion) return;
    const updatedChoices = JSON.parse(JSON.stringify(selectedQuestion.choices));
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
      toast({ title: "Hata", description: "Bir sorunun en az bir seçeneği olmalıdır.", variant: "destructive" });
      return;
    }
    setSelectedQuestion(prev => prev ? {
      ...prev,
      choices: prev.choices.filter((_,idx) => idx !== choiceIndex)
    } : null);
  };

  const handleSaveQuestion = () => {
    if (!selectedQuestion) return;

    // Basic validation: check if any required localized text is missing
    let missingText = false;
    if (!selectedQuestion.text[currentEditLanguage] && !selectedQuestion.text['en']) {
        missingText = true;
    }
    selectedQuestion.choices.forEach(choice => {
        if (!choice.text[currentEditLanguage] && !choice.text['en']) {
            missingText = true;
        }
    });

    if (missingText) {
        toast({
            title: "Eksik Bilgi",
            description: `Lütfen en azından İngilizce veya şu anki düzenleme dilindeki (${SUPPORTED_LANGUAGES.find(l=>l.code === currentEditLanguage)?.name}) tüm soru ve seçenek metinlerini doldurun.`,
            variant: "destructive",
            duration: 5000,
        });
        return;
    }


    if (isCreatingNew) {
      setQuestions(prev => [...prev, selectedQuestion]);
    } else {
      setQuestions(prev => prev.map(q => q.id === selectedQuestion.id ? selectedQuestion : q));
    }
    toast({ title: "Başarılı", description: `Soru "${selectedQuestion.text[currentEditLanguage] || selectedQuestion.text['en']}" kaydedildi.` });
    setSelectedQuestion(null);
    setIsCreatingNew(false);
  };

  const handleDeleteQuestion = () => {
    if (!selectedQuestion || isCreatingNew) return; 
    setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
    toast({ title: "Silindi", description: `Soru "${selectedQuestion.text[currentEditLanguage] || selectedQuestion.text['en']}" silindi.`, variant: "destructive" });
    setSelectedQuestion(null);
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Header currentLanguage={currentEditLanguage} onLanguageChange={handleLanguageChange} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5" /> Sorular</CardTitle>
              <Button onClick={handleAddNewQuestion} size="sm" className="w-full mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Soru Ekle
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
                    {q.text[currentEditLanguage] || q.text['en'] || "Başlıksız Soru"}
                  </Button>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {selectedQuestion ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Edit3 className="mr-2 h-5 w-5" /> 
                  {isCreatingNew ? "Yeni Soru Oluştur" : `Soruyu Düzenle: ${selectedQuestion.text[currentEditLanguage] || selectedQuestion.text['en']}`}
                </CardTitle>
                <CardDescription>
                  Düzenleme dili: {SUPPORTED_LANGUAGES.find(l=>l.code === currentEditLanguage)?.name}. Değişiklikler yereldir ve kalıcı olmaz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                <div className="space-y-4">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <div key={`qtext-${lang.code}`}>
                      <Label htmlFor={`questionText-${lang.code}`}>Soru Metni ({lang.name})</Label>
                      <Textarea
                        id={`questionText-${lang.code}`}
                        value={selectedQuestion.text[lang.code] || ""}
                        onChange={(e) => handleQuestionChange(lang.code as keyof LocalizedText, e.target.value, lang.code as LanguageCode)}
                        placeholder={`${lang.name} dilinde soru metnini girin`}
                      />
                    </div>
                  ))}
                </div>

                <Separator />
                <h3 className="text-lg font-semibold">Seçenekler</h3>
                {selectedQuestion.choices.map((choice, choiceIndex) => (
                  <Card key={choice.id} className="p-4 space-y-3 bg-muted/30">
                    <div className="flex justify-between items-center">
                       <h4 className="font-medium">Seçenek {choiceIndex + 1}</h4>
                       <Button variant="ghost" size="icon" onClick={() => handleRemoveChoiceFromQuestion(choiceIndex)} aria-label="Seçeneği kaldır">
                         <Trash2 className="h-4 w-4 text-destructive"/>
                       </Button>
                    </div>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <div key={`ctext-${choice.id}-${lang.code}`}>
                        <Label htmlFor={`choiceText-${choice.id}-${lang.code}`}>Seçenek Metni ({lang.name})</Label>
                        <Input
                          id={`choiceText-${choice.id}-${lang.code}`}
                          value={choice.text[lang.code] || ""}
                          onChange={(e) => handleChoiceTextChange(choiceIndex, e.target.value, lang.code as LanguageCode)}
                          placeholder={`${lang.name} dilinde seçenek metni`}
                        />
                      </div>
                    ))}
                    
                    <div className="space-y-2 pt-2 border-t mt-2">
                        <Label>Medya (İsteğe Bağlı)</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Select
                                value={choice.media?.type || "none"}
                                onValueChange={(value) => handleChoiceMediaChange(choiceIndex, 'type', value)}
                            >
                                <SelectTrigger><SelectValue placeholder="Medya Türü" /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="none">Yok</SelectItem>
                                <SelectItem value="image">Resim</SelectItem>
                                <SelectItem value="audio">Ses</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                </SelectContent>
                            </Select>
                            {choice.media?.type && choice.media?.type !== "none" && (
                                <Button variant="outline" size="sm" onClick={() => handleRemoveChoiceMedia(choiceIndex)}>
                                    <Trash2 className="mr-1 h-3 w-3" /> Medyayı Temizle
                                </Button>
                            )}
                        </div>

                        {choice.media && choice.media.type !== "none" && (
                        <>
                          {(choice.media.type === 'image' || choice.media.type === 'audio' || choice.media.type === 'video') ? (
                            <>
                                <div className="mt-2">
                                    <Label htmlFor={`media-file-${choice.id}`}>
                                      {choice.media.type === 'image' ? 'Resim' : choice.media.type === 'video' ? 'Video' : 'Ses'} Yükle
                                    </Label>
                                    <Input
                                        id={`media-file-${choice.id}`}
                                        type="file"
                                        accept={
                                            choice.media.type === 'image' ? 'image/*' :
                                            choice.media.type === 'video' ? 'video/*' :
                                            choice.media.type === 'audio' ? 'audio/*' : ''
                                        }
                                        onChange={(e) => handleChoiceMediaFileChange(choiceIndex, e.target.files?.[0] || null)}
                                        className="mt-1 w-full"
                                    />
                                </div>
                                <div className="mt-2">
                                    <Label htmlFor={`media-url-${choice.id}`}>Veya URL Yapıştır</Label>
                                    <Input
                                        id={`media-url-${choice.id}`}
                                        value={choice.media.url || ''}
                                        onChange={(e) => handleChoiceMediaChange(choiceIndex, 'url', e.target.value)}
                                        placeholder={`Örn: https://example.com/${choice.media.type}.mp4`}
                                        className="mt-1 w-full"
                                        disabled={!!(choice.media.url && choice.media.url.startsWith('data:'))}
                                    />
                                    {choice.media.url && choice.media.url.startsWith('data:') && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Yüklenen dosya Data URI olarak saklandı. ({ (choice.media.url.length * 0.75 / (1024*1024)).toFixed(2) } MB)
                                        </p>
                                    )}
                                </div>
                            </>
                            ) : (
                                <Input
                                    value={choice.media.url || ''}
                                    onChange={(e) => handleChoiceMediaChange(choiceIndex, 'url', e.target.value)}
                                    placeholder="Medya URL (Örn: https://example.com/dosya.jpg)"
                                />
                            )}

                            {choice.media.type === 'image' && SUPPORTED_LANGUAGES.map(lang => (
                            <Input
                                key={`altText-${choice.id}-${lang.code}`}
                                value={choice.media?.altText?.[lang.code] || ""}
                                onChange={(e) => handleChoiceMediaChange(choiceIndex, `altText-${lang.code}`, e.target.value)}
                                placeholder={`Resim için alternatif metin (${lang.name})`}
                            />
                            ))}
                        </>
                        )}
                    </div>

                  </Card>
                ))}
                <Button variant="outline" onClick={handleAddChoiceToQuestion} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Seçenek Ekle
                </Button>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  {selectedQuestion && !isCreatingNew && (
                     <Button variant="destructive" onClick={handleDeleteQuestion}>Soruyu Sil</Button>
                  )}
                  <Button onClick={handleSaveQuestion}>Soruyu Kaydet</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <CardHeader>
                <CardTitle>Soru Seçilmedi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Düzenlemek için listeden bir soru seçin veya yeni bir tane ekleyin.</p>
                 <Button onClick={handleAddNewQuestion} size="lg" className="mt-6">
                    <PlusCircle className="mr-2 h-5 w-5" /> Yeni Soru Ekle
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        Yönetici Paneli - YanıtMatik
      </footer>
    </div>
  );
}

    