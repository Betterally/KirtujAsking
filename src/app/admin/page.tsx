
"use client";

import { useState, useEffect } from 'react';
import type { Question, Choice, MediaItem, LocalizedText } from '@/lib/types';
import { initialQuestions } from '@/lib/data';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Edit3, List, Image as ImageIcon, AudioWave } from 'lucide-react';

const createEmptyTurkishText = (): LocalizedText => ({ tr: "" });

const createNewChoice = (idSuffix: string): Choice => ({
  id: `newChoice-${idSuffix}-${Date.now()}`,
  text: createEmptyTurkishText(),
  media: [],
});

const createNewQuestion = (): Question => ({
  id: `newQuestion-${Date.now()}`,
  text: createEmptyTurkishText(),
  choices: [createNewChoice('1'), createNewChoice('2')],
});

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    // Deep clone initialQuestions to avoid modifying the original data
    const clonedInitialQuestions = JSON.parse(JSON.stringify(initialQuestions));
    // Ensure media is always an array
    clonedInitialQuestions.forEach((q: Question) => {
      q.choices.forEach((c: Choice) => {
        if (!Array.isArray(c.media)) {
          c.media = c.media ? [c.media] : [];
        }
      });
    });
    setQuestions(clonedInitialQuestions);
  }, []);

  const handleSelectQuestion = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      setSelectedQuestion(JSON.parse(JSON.stringify(question))); // Deep clone
      setIsCreatingNew(false);
    }
  };

  const handleAddNewQuestion = () => {
    setSelectedQuestion(createNewQuestion());
    setIsCreatingNew(true);
  };

  const handleQuestionTextChange = (value: string) => {
    if (!selectedQuestion) return;
    setSelectedQuestion(prev => prev ? { ...prev, text: { ...prev.text, tr: value } } : null);
  };
  
  const handleChoiceTextChange = (choiceIndex: number, value: string) => {
    if (!selectedQuestion) return;
    const updatedChoices = JSON.parse(JSON.stringify(selectedQuestion.choices));
    updatedChoices[choiceIndex].text.tr = value;
    setSelectedQuestion(prev => prev ? { ...prev, choices: updatedChoices } : null);
  };

  const updateOrAddMediaItem = (choiceIndex: number, mediaType: 'image' | 'audio', newUrl: string, newAltText?: string) => {
    if (!selectedQuestion) return;

    const choicesCopy = JSON.parse(JSON.stringify(selectedQuestion.choices)) as Choice[];
    const choiceToUpdate = choicesCopy[choiceIndex];
    
    let existingMediaItem = choiceToUpdate.media.find(m => m.type === mediaType);

    if (existingMediaItem) {
      existingMediaItem.url = newUrl;
      if (mediaType === 'image') {
        if (!existingMediaItem.altText) existingMediaItem.altText = createEmptyTurkishText();
        existingMediaItem.altText.tr = newAltText || existingMediaItem.altText.tr || "";
      }
    } else {
      const newMediaItem: MediaItem = {
        type: mediaType,
        url: newUrl,
      };
      if (mediaType === 'image') {
        newMediaItem.altText = { tr: newAltText || "" };
        newMediaItem.dataAiHint = "custom image"; // default hint
      }
      choiceToUpdate.media.push(newMediaItem);
    }
    setSelectedQuestion(prev => prev ? { ...prev, choices: choicesCopy } : null);
  };

  const handleChoiceMediaPropertyChange = (choiceIndex: number, mediaType: 'image' | 'audio', property: 'url' | 'altText', value: string) => {
    if (!selectedQuestion) return;
    
    const choicesCopy = JSON.parse(JSON.stringify(selectedQuestion.choices)) as Choice[];
    const choiceToUpdate = choicesCopy[choiceIndex];
    let mediaItem = choiceToUpdate.media.find(m => m.type === mediaType);

    if (!mediaItem && property === 'url' && value) { // Create if not exists and URL is being set
        mediaItem = { type: mediaType, url: '', altText: mediaType === 'image' ? createEmptyTurkishText() : undefined };
        choiceToUpdate.media.push(mediaItem);
    } else if (!mediaItem) {
        return; // Cannot set altText for non-existing media
    }
    
    if (property === 'url') {
        mediaItem.url = value;
         // If URL is cleared, consider removing the media item or just clearing URL
        if (!value) {
            choiceToUpdate.media = choiceToUpdate.media.filter(m => m.type !== mediaType);
        }
    } else if (property === 'altText' && mediaType === 'image') {
        if (!mediaItem.altText) mediaItem.altText = createEmptyTurkishText();
        mediaItem.altText.tr = value;
    }
    
    setSelectedQuestion(prev => prev ? { ...prev, choices: choicesCopy } : null);
  };
  
  const handleChoiceMediaFileUpload = (choiceIndex: number, mediaType: 'image' | 'audio', file: File | null) => {
    if (!selectedQuestion) return;

    if (!file) { // File was cleared
        handleRemoveChoiceMedia(choiceIndex, mediaType); // Remove or clear the media
        toast({ title: "Dosya Temizlendi", description: "Daha önce seçilen dosya kaldırıldı." });
        // Visually clear the file input - this is tricky. It's better to just update the state.
        const fileInput = document.getElementById(`media-file-${selectedQuestion.choices[choiceIndex].id}-${mediaType}`) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
        const dataUrl = reader.result as string;
        updateOrAddMediaItem(choiceIndex, mediaType, dataUrl, mediaType === 'image' ? (selectedQuestion.choices[choiceIndex].media.find(m=>m.type==='image')?.altText?.tr || file.name) : undefined);
        toast({ title: "Dosya Hazır", description: `${file.name} seçildi. Kalıcı olması için soruyu kaydedin.` });
    };
    reader.onerror = () => {
        toast({ title: "Dosya Hatası", description: "Seçilen dosya okunamadı.", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveChoiceMedia = (choiceIndex: number, mediaType: 'image' | 'audio') => {
    if (!selectedQuestion) return;
    const choicesCopy = JSON.parse(JSON.stringify(selectedQuestion.choices)) as Choice[];
    choicesCopy[choiceIndex].media = choicesCopy[choiceIndex].media.filter(m => m.type !== mediaType);
    setSelectedQuestion(prev => prev ? { ...prev, choices: choicesCopy } : null);
    toast({ title: "Medya Kaldırıldı", description: `${mediaType === 'image' ? 'Resim' : 'Ses'} medyası kaldırıldı.`});
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

    let missingText = false;
    if (!selectedQuestion.text.tr) {
        missingText = true;
    }
    selectedQuestion.choices.forEach(choice => {
        if (!choice.text.tr) {
            missingText = true;
        }
        // Ensure media array items have necessary fields if they exist
        choice.media.forEach(m => {
            if (m.type === 'image' && (!m.altText || !m.altText.tr)) {
                if (!m.altText) m.altText = createEmptyTurkishText();
                m.altText.tr = "Resim için alternatif metin"; // Default alt text
                toast({ title: "Uyarı", description: `Bir resim için varsayılan alternatif metin eklendi. Lütfen güncelleyin.`, variant: "default", duration: 4000 });
            }
        });
    });

    if (missingText) {
        toast({
            title: "Eksik Bilgi",
            description: "Lütfen tüm soru ve seçenek metinlerini (Türkçe) doldurun.",
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
    toast({ title: "Başarılı", description: `Soru "${selectedQuestion.text.tr}" kaydedildi.` });
    setSelectedQuestion(null);
    setIsCreatingNew(false);
  };

  const handleDeleteQuestion = () => {
    if (!selectedQuestion || isCreatingNew) return; 
    setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
    toast({ title: "Silindi", description: `Soru "${selectedQuestion.text.tr}" silindi.`, variant: "destructive" });
    setSelectedQuestion(null);
  };

  const getChoiceMediaItem = (choice: Choice | undefined, type: 'image' | 'audio'): MediaItem | undefined => {
    return choice?.media?.find(m => m.type === type);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentLanguage="tr" onLanguageChange={() => {}} showLanguageSwitcher={false} />
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
                    {q.text.tr || "Başlıksız Soru"}
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
                  {isCreatingNew ? "Yeni Soru Oluştur" : `Soruyu Düzenle: ${selectedQuestion.text.tr}`}
                </CardTitle>
                <CardDescription>
                  Değişiklikler yereldir ve kalıcı olmaz. Tüm metinler Türkçe olmalıdır.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ScrollArea className="h-[calc(100vh-320px)] pr-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="questionText-tr">Soru Metni (Türkçe)</Label>
                      <Textarea
                        id="questionText-tr"
                        value={selectedQuestion.text.tr || ""}
                        onChange={(e) => handleQuestionTextChange(e.target.value)}
                        placeholder="Türkçe soru metnini girin"
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />
                  <h3 className="text-lg font-semibold">Seçenekler</h3>
                  {selectedQuestion.choices.map((choice, choiceIndex) => {
                    const imageMedia = getChoiceMediaItem(choice, 'image');
                    const audioMedia = getChoiceMediaItem(choice, 'audio');
                    return (
                      <Card key={choice.id} className="p-4 space-y-3 bg-muted/30 mb-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Seçenek {choiceIndex + 1}</h4>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveChoiceFromQuestion(choiceIndex)} aria-label="Seçeneği kaldır">
                            <Trash2 className="h-4 w-4 text-destructive"/>
                          </Button>
                        </div>
                        <div>
                          <Label htmlFor={`choiceText-${choice.id}-tr`}>Seçenek Metni (Türkçe)</Label>
                          <Input
                            id={`choiceText-${choice.id}-tr`}
                            value={choice.text.tr || ""}
                            onChange={(e) => handleChoiceTextChange(choiceIndex, e.target.value)}
                            placeholder="Türkçe seçenek metni"
                          />
                        </div>
                        
                        {/* Image Media Section */}
                        <div className="space-y-2 pt-2 border-t mt-3">
                          <Label className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Resim Medyası (İsteğe Bağlı)</Label>
                          <div className="mt-1">
                              <Label htmlFor={`media-file-${choice.id}-image`}>Resim Yükle</Label>
                              <Input
                                  id={`media-file-${choice.id}-image`}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleChoiceMediaFileUpload(choiceIndex, 'image', e.target.files?.[0] || null)}
                                  className="mt-1 w-full"
                              />
                          </div>
                          <div className="mt-1">
                              <Label htmlFor={`media-url-${choice.id}-image`}>Veya Resim URL Yapıştır</Label>
                              <Input
                                  id={`media-url-${choice.id}-image`}
                                  value={imageMedia?.url?.startsWith('data:') ? "" : imageMedia?.url || ''}
                                  onChange={(e) => handleChoiceMediaPropertyChange(choiceIndex, 'image', 'url', e.target.value)}
                                  placeholder="Örn: https://example.com/resim.jpg"
                                  className="mt-1 w-full"
                                  disabled={!!(imageMedia?.url && imageMedia.url.startsWith('data:'))}
                              />
                              {imageMedia?.url && imageMedia.url.startsWith('data:') && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                      Yüklenen resim Data URI olarak saklandı. (Boyut: {(imageMedia.url.length * 0.75 / (1024*1024)).toFixed(2)} MB)
                                      <Button variant="link" size="sm" className="p-0 h-auto ml-1 text-destructive" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'image')}>Temizle</Button>
                                  </p>
                              )}
                          </div>
                          {imageMedia && (
                            <div className="mt-1">
                              <Label htmlFor={`media-altText-${choice.id}-image`}>Resim Alternatif Metni (Türkçe)</Label>
                              <Input
                                  id={`media-altText-${choice.id}-image`}
                                  value={imageMedia.altText?.tr || ""}
                                  onChange={(e) => handleChoiceMediaPropertyChange(choiceIndex, 'image', 'altText', e.target.value)}
                                  placeholder="Resim için alternatif metin (Türkçe)"
                                  className="mt-1 w-full"
                              />
                            </div>
                          )}
                           {imageMedia && (
                             <Button variant="outline" size="sm" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'image')} className="mt-1">
                                <Trash2 className="mr-1 h-3 w-3" /> Resmi Temizle
                            </Button>
                           )}
                        </div>

                        {/* Audio Media Section */}
                        <div className="space-y-2 pt-2 border-t mt-3">
                          <Label className="flex items-center"><AudioWave className="mr-2 h-4 w-4" /> Ses Medyası (İsteğe Bağlı)</Label>
                           <div className="mt-1">
                              <Label htmlFor={`media-file-${choice.id}-audio`}>Ses Dosyası Yükle</Label>
                              <Input
                                  id={`media-file-${choice.id}-audio`}
                                  type="file"
                                  accept="audio/*"
                                  onChange={(e) => handleChoiceMediaFileUpload(choiceIndex, 'audio', e.target.files?.[0] || null)}
                                  className="mt-1 w-full"
                              />
                          </div>
                          <div className="mt-1">
                              <Label htmlFor={`media-url-${choice.id}-audio`}>Veya Ses URL Yapıştır</Label>
                              <Input
                                  id={`media-url-${choice.id}-audio`}
                                  value={audioMedia?.url?.startsWith('data:') ? "" : audioMedia?.url || ''}
                                  onChange={(e) => handleChoiceMediaPropertyChange(choiceIndex, 'audio', 'url', e.target.value)}
                                  placeholder="Örn: https://example.com/ses.mp3"
                                  className="mt-1 w-full"
                                  disabled={!!(audioMedia?.url && audioMedia.url.startsWith('data:'))}
                              />
                              {audioMedia?.url && audioMedia.url.startsWith('data:') && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                      Yüklenen ses Data URI olarak saklandı. (Boyut: {(audioMedia.url.length * 0.75 / (1024*1024)).toFixed(2)} MB)
                                      <Button variant="link" size="sm" className="p-0 h-auto ml-1 text-destructive" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'audio')}>Temizle</Button>
                                  </p>
                              )}
                          </div>
                           {audioMedia && (
                             <Button variant="outline" size="sm" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'audio')} className="mt-1">
                                <Trash2 className="mr-1 h-3 w-3" /> Sesi Temizle
                            </Button>
                           )}
                        </div>
                      </Card>
                    );
                  })}
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
