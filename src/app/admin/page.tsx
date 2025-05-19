
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Question, Choice, MediaItem, LocalizedText } from '@/lib/types';
// import { initialQuestions } from '@/lib/data'; // Artık Firestore'dan yüklenecek
import { getQuestions, saveQuestion, deleteQuestion } from '@/services/questionService';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Edit3, List, Image as ImageIcon, AudioWaveform, Film, Loader2 } from 'lucide-react';

const createEmptyTurkishText = (): LocalizedText => ({ tr: "" });

const createNewChoice = (idSuffix: string): Choice => ({
  id: `newChoice-${idSuffix}-${Date.now()}`,
  text: createEmptyTurkishText(),
  media: [],
});

const createNewQuestion = (): Question => ({
  id: `newQuestion-${Date.now()}`, // Firestore'a kaydederken bu ID kullanılacak
  text: createEmptyTurkishText(),
  choices: [createNewChoice('1'), createNewChoice('2')],
});

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  const loadQuestionsFromService = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedQuestions = await getQuestions();
      const processedQuestions = loadedQuestions.map(q => ({
        ...q,
        choices: q.choices.map(c => ({
          ...c,
          media: Array.isArray(c.media) ? c.media : (c.media ? [c.media] : [])
        }))
      }));
      setQuestions(processedQuestions);
    } catch (error: any) {
      console.error("Error loading questions from service:", error);
      let description = error.message || "Sorular yüklenirken bir sorun oluştu.";
      if (error.message === "An unexpected response was received from the server.") {
        description = "Sunucudan beklenmedik bir yanıt alındı. Lütfen sunucu loglarını (terminal) ve Firestore güvenlik kurallarınızı kontrol edin.";
      }
      toast({
        title: "Hata",
        description: description,
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

  const updateOrAddMediaItem = (choiceIndex: number, mediaType: 'image' | 'audio' | 'video', newUrl: string, newAltText?: string) => {
    if (!selectedQuestion) return;

    const choicesCopy = JSON.parse(JSON.stringify(selectedQuestion.choices)) as Choice[];
    const choiceToUpdate = choicesCopy[choiceIndex];

    if (!Array.isArray(choiceToUpdate.media)) {
        choiceToUpdate.media = [];
    }

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
        newMediaItem.dataAiHint = "custom image";
      }
      choiceToUpdate.media.push(newMediaItem);
    }
    setSelectedQuestion(prev => prev ? { ...prev, choices: choicesCopy } : null);
  };

  const handleChoiceMediaPropertyChange = (choiceIndex: number, mediaType: 'image' | 'audio' | 'video', property: 'url' | 'altText', value: string) => {
    if (!selectedQuestion) return;

    const choicesCopy = JSON.parse(JSON.stringify(selectedQuestion.choices)) as Choice[];
    const choiceToUpdate = choicesCopy[choiceIndex];

    if (!Array.isArray(choiceToUpdate.media)) {
        choiceToUpdate.media = [];
    }

    let mediaItem = choiceToUpdate.media.find(m => m.type === mediaType);

    if (!mediaItem && property === 'url' && value) {
        mediaItem = { type: mediaType, url: '' };
        if (mediaType === 'image') {
            mediaItem.altText = createEmptyTurkishText();
        }
        choiceToUpdate.media.push(mediaItem);
        mediaItem = choiceToUpdate.media.find(m => m.type === mediaType)!;
    } else if (!mediaItem) {
        return;
    }

    if (property === 'url') {
        mediaItem.url = value;
        if (!value && !mediaItem.url.startsWith('data:')) {
            choiceToUpdate.media = choiceToUpdate.media.filter(m => m.type !== mediaType);
        }
    } else if (property === 'altText' && mediaType === 'image') {
        if (!mediaItem.altText) mediaItem.altText = createEmptyTurkishText();
        mediaItem.altText.tr = value;
    }

    setSelectedQuestion(prev => prev ? { ...prev, choices: choicesCopy } : null);
  };

  const handleChoiceMediaFileUpload = (choiceIndex: number, mediaType: 'image' | 'audio' | 'video', file: File | null) => {
    if (!selectedQuestion) return;

    if (!file) {
        handleRemoveChoiceMedia(choiceIndex, mediaType);
        toast({ title: "Dosya Temizlendi", description: "Daha önce seçilen dosya kaldırıldı." });
        const fileInput = document.getElementById(`media-file-${selectedQuestion.choices[choiceIndex].id}-${mediaType}`) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const altText = mediaType === 'image' ? (selectedQuestion.choices[choiceIndex].media.find(m=>m.type==='image')?.altText?.tr || file.name) : undefined;
        updateOrAddMediaItem(choiceIndex, mediaType, dataUrl, altText);
        toast({ title: "Dosya Hazır", description: `${file.name} seçildi. Kalıcı olması için soruyu kaydedin.` });
    };
    reader.onerror = () => {
        toast({ title: "Dosya Hatası", description: "Seçilen dosya okunamadı.", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveChoiceMedia = (choiceIndex: number, mediaType: 'image' | 'audio' | 'video') => {
    if (!selectedQuestion) return;
    const choicesCopy = JSON.parse(JSON.stringify(selectedQuestion.choices)) as Choice[];
    if (!Array.isArray(choicesCopy[choiceIndex].media)) {
        choicesCopy[choiceIndex].media = [];
    }
    choicesCopy[choiceIndex].media = choicesCopy[choiceIndex].media.filter(m => m.type !== mediaType);
    setSelectedQuestion(prev => prev ? { ...prev, choices: choicesCopy } : null);
    toast({ title: "Medya Kaldırıldı", description: `${mediaType === 'image' ? 'Resim' : (mediaType === 'audio' ? 'Ses' : 'Video')} medyası kaldırıldı.`});

    const fileInputId = `media-file-${choicesCopy[choiceIndex].id}-${mediaType}`;
    const fileInput = document.getElementById(fileInputId) as HTMLInputElement;
    if (fileInput) fileInput.value = "";

    const urlInputId = `media-url-${choicesCopy[choiceIndex].id}-${mediaType}`;
    const urlInput = document.getElementById(urlInputId) as HTMLInputElement;
    if (urlInput) urlInput.value = "";
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

  const handleSaveQuestion = async () => {
    if (!selectedQuestion) return;
    setIsLoading(true);

    let missingText = false;
    if (!selectedQuestion.text.tr) {
        missingText = true;
    }
    selectedQuestion.choices.forEach(choice => {
        if (!choice.text.tr) {
            missingText = true;
        }
        if(!Array.isArray(choice.media)) choice.media = [];
        choice.media.forEach(m => {
            if (m.type === 'image' && (!m.altText || !m.altText.tr)) {
                if (!m.altText) m.altText = createEmptyTurkishText();
                m.altText.tr = "Resim için alternatif metin";
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
        setIsLoading(false);
        return;
    }

    try {
      const questionToSave = JSON.parse(JSON.stringify(selectedQuestion));
      await saveQuestion(questionToSave);
      toast({ title: "Başarılı", description: `Soru "${questionToSave.text.tr}" Firestore'a kaydedildi.` });
      setSelectedQuestion(null);
      setIsCreatingNew(false);
      await loadQuestionsFromService();
    } catch (error: any) {
      console.error("Error saving question:", error);
      let description = error.message || "Soru kaydedilirken bir sorun oluştu.";
      if (error.message === "An unexpected response was received from the server.") {
        description = "Sunucudan beklenmedik bir yanıt alındı. Lütfen sunucu loglarını (terminal) ve Firestore güvenlik kurallarınızı kontrol edin.";
      }
      toast({
        title: "Kaydetme Hatası",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!selectedQuestion || isCreatingNew) return;
    setIsLoading(true);

    try {
      await deleteQuestion(selectedQuestion.id);
      toast({ title: "Silindi", description: `Soru "${selectedQuestion.text.tr}" Firestore'dan silindi.`, variant: "default" });
      setSelectedQuestion(null);
      await loadQuestionsFromService();
    } catch (error: any) {
      console.error("Error deleting question:", error);
      let description = error.message || "Soru silinirken bir sorun oluştu.";
      if (error.message === "An unexpected response was received from the server.") {
        description = "Sunucudan beklenmedik bir yanıt alındı. Lütfen sunucu loglarını (terminal) ve Firestore güvenlik kurallarınızı kontrol edin.";
      }
      toast({
        title: "Silme Hatası",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getChoiceMediaItem = (choice: Choice | undefined, type: 'image' | 'audio' | 'video'): MediaItem | undefined => {
    if (!choice || !Array.isArray(choice.media)) return undefined;
    return choice.media.find(m => m.type === type);
  };

  if (isLoading && questions.length === 0 && !selectedQuestion) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Sorular yükleniyor...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentLanguage="tr" onLanguageChange={() => {}} showLanguageSwitcher={false} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5" /> Sorular</CardTitle>
              <Button onClick={handleAddNewQuestion} size="sm" className="w-full mt-2" disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Soru Ekle
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading && questions.length === 0 ? (
                <div className="flex justify-center items-center h-[calc(100vh-320px)]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : questions.length === 0 && !isLoading ? (
                 <p className="text-center text-muted-foreground py-4">Gösterilecek soru bulunmuyor.</p>
              ) : (
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {questions.map(q => (
                    <Button
                      key={q.id}
                      variant={selectedQuestion?.id === q.id && !isCreatingNew ? "secondary" : "ghost"}
                      className="w-full justify-start mb-2 text-left h-auto py-2"
                      onClick={() => handleSelectQuestion(q.id)}
                      disabled={isLoading}
                    >
                      {q.text.tr || "Başlıksız Soru"}
                    </Button>
                  ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {selectedQuestion ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Edit3 className="mr-2 h-5 w-5" />
                  {isCreatingNew ? "Yeni Soru Oluştur" : `Soruyu Düzenle: ${selectedQuestion.text.tr || 'Başlıksız'}`}
                </CardTitle>
                <CardDescription>
                  Tüm metinler Türkçe olmalıdır. Değişiklikler Firestore'da saklanır.
                  {isLoading && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}
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
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />
                  <h3 className="text-lg font-semibold">Seçenekler</h3>
                  {selectedQuestion.choices.map((choice, choiceIndex) => {
                    const imageMedia = getChoiceMediaItem(choice, 'image');
                    const audioMedia = getChoiceMediaItem(choice, 'audio');
                    const videoMedia = getChoiceMediaItem(choice, 'video');
                    return (
                      <Card key={choice.id} className="p-4 space-y-3 bg-muted/30 mb-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Seçenek {choiceIndex + 1}</h4>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveChoiceFromQuestion(choiceIndex)} aria-label="Seçeneği kaldır" disabled={isLoading}>
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
                            disabled={isLoading}
                          />
                        </div>

                        {/* Image Media Section */}
                        <div className="space-y-2 pt-2 border-t mt-3">
                          <Label className="flex items-center"><ImageIcon className="mr-2 h-4 w-4" /> Resim Medyası</Label>
                          <Input
                              id={`media-file-${choice.id}-image`}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleChoiceMediaFileUpload(choiceIndex, 'image', e.target.files?.[0] || null)}
                              className="mt-1 w-full"
                              disabled={isLoading}
                          />
                          <Input
                              id={`media-url-${choice.id}-image`}
                              value={imageMedia?.url?.startsWith('data:') ? "" : imageMedia?.url || ''}
                              onChange={(e) => handleChoiceMediaPropertyChange(choiceIndex, 'image', 'url', e.target.value)}
                              placeholder="Veya Resim URL'si yapıştırın"
                              className="mt-1 w-full"
                              disabled={isLoading || !!(imageMedia?.url && imageMedia.url.startsWith('data:'))}
                          />
                          {imageMedia?.url?.startsWith('data:') && (
                              <p className="text-xs text-muted-foreground mt-1">
                                  Yüklenen resim Data URI olarak saklandı.
                                  <Button variant="link" size="sm" className="p-0 h-auto ml-1 text-destructive" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'image')} disabled={isLoading}>Temizle</Button>
                              </p>
                          )}
                          {imageMedia && (
                            <Input
                                id={`media-altText-${choice.id}-image`}
                                value={imageMedia.altText?.tr || ""}
                                onChange={(e) => handleChoiceMediaPropertyChange(choiceIndex, 'image', 'altText', e.target.value)}
                                placeholder="Resim Alternatif Metni (Türkçe)"
                                className="mt-1 w-full"
                                disabled={isLoading}
                            />
                          )}
                           {imageMedia && (
                             <Button variant="outline" size="sm" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'image')} className="mt-1" disabled={isLoading}>
                                <Trash2 className="mr-1 h-3 w-3" /> Resmi Temizle
                            </Button>
                           )}
                        </div>

                        {/* Audio Media Section */}
                        <div className="space-y-2 pt-2 border-t mt-3">
                          <Label className="flex items-center"><AudioWaveform className="mr-2 h-4 w-4" /> Ses Medyası</Label>
                           <Input
                                id={`media-file-${choice.id}-audio`}
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleChoiceMediaFileUpload(choiceIndex, 'audio', e.target.files?.[0] || null)}
                                className="mt-1 w-full"
                                disabled={isLoading}
                            />
                            <Input
                                id={`media-url-${choice.id}-audio`}
                                value={audioMedia?.url?.startsWith('data:') ? "" : audioMedia?.url || ''}
                                onChange={(e) => handleChoiceMediaPropertyChange(choiceIndex, 'audio', 'url', e.target.value)}
                                placeholder="Veya Ses URL'si yapıştırın"
                                className="mt-1 w-full"
                                disabled={isLoading || !!(audioMedia?.url && audioMedia.url.startsWith('data:'))}
                            />
                            {audioMedia?.url?.startsWith('data:') && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Yüklenen ses Data URI olarak saklandı.
                                    <Button variant="link" size="sm" className="p-0 h-auto ml-1 text-destructive" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'audio')} disabled={isLoading}>Temizle</Button>
                                </p>
                            )}
                           {audioMedia && (
                             <Button variant="outline" size="sm" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'audio')} className="mt-1" disabled={isLoading}>
                                <Trash2 className="mr-1 h-3 w-3" /> Sesi Temizle
                            </Button>
                           )}
                        </div>

                        {/* Video Media Section */}
                        <div className="space-y-2 pt-2 border-t mt-3">
                          <Label className="flex items-center"><Film className="mr-2 h-4 w-4" /> Video Medyası</Label>
                           <Input
                                id={`media-file-${choice.id}-video`}
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleChoiceMediaFileUpload(choiceIndex, 'video', e.target.files?.[0] || null)}
                                className="mt-1 w-full"
                                disabled={isLoading}
                            />
                            <Input
                                id={`media-url-${choice.id}-video`}
                                value={videoMedia?.url?.startsWith('data:') ? "" : videoMedia?.url || ''}
                                onChange={(e) => handleChoiceMediaPropertyChange(choiceIndex, 'video', 'url', e.target.value)}
                                placeholder="Veya Video URL'si yapıştırın"
                                className="mt-1 w-full"
                                disabled={isLoading || !!(videoMedia?.url && videoMedia.url.startsWith('data:'))}
                            />
                            {videoMedia?.url?.startsWith('data:') && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Yüklenen video Data URI olarak saklandı.
                                    <Button variant="link" size="sm" className="p-0 h-auto ml-1 text-destructive" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'video')} disabled={isLoading}>Temizle</Button>
                                </p>
                            )}
                           {videoMedia && (
                             <Button variant="outline" size="sm" onClick={() => handleRemoveChoiceMedia(choiceIndex, 'video')} className="mt-1" disabled={isLoading}>
                                <Trash2 className="mr-1 h-3 w-3" /> Videoyu Temizle
                            </Button>
                           )}
                        </div>
                      </Card>
                    );
                  })}
                  <Button variant="outline" onClick={handleAddChoiceToQuestion} className="w-full" disabled={isLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Seçenek Ekle
                  </Button>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  {selectedQuestion && !isCreatingNew && (
                     <Button variant="destructive" onClick={handleDeleteQuestion} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Soruyu Sil
                     </Button>
                  )}
                  <Button onClick={handleSaveQuestion} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Soruyu Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <CardHeader>
                <CardTitle>Soru Seçilmedi</CardTitle>
              </CardHeader>
              <CardContent>
                 {isLoading ? (
                    <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-muted-foreground">Yükleniyor...</p>
                    </div>
                 ) : (
                    <>
                        <p className="text-muted-foreground">Düzenlemek için listeden bir soru seçin veya yeni bir tane ekleyin.</p>
                        <Button onClick={handleAddNewQuestion} size="lg" className="mt-6" disabled={isLoading}>
                            <PlusCircle className="mr-2 h-5 w-5" /> Yeni Soru Ekle
                        </Button>
                    </>
                 )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        Yönetici Paneli - YanıtMatik (Firestore Bağlı)
      </footer>
    </div>
  );
}

    