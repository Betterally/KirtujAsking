
"use client";

import { useRef, useEffect } from 'react';
import type { MediaItem, LanguageCode } from "@/lib/types";
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface MediaViewerProps {
  visualMedia?: MediaItem | null; // Image or Video
  audioMedia?: MediaItem | null;  // Audio
  currentLanguage: LanguageCode;
}

export function MediaViewer({ visualMedia, audioMedia, currentLanguage }: MediaViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      if (audioMedia?.url) {
        if (audioElement.src !== audioMedia.url) { 
          audioElement.src = audioMedia.url;
          audioElement.load(); 
        }
        audioElement.play().catch(error => {
          console.warn("Audio autoplay failed. User interaction might be required or browser policy restricting.", error);
        });
      } else {
        audioElement.pause();
        audioElement.currentTime = 0;
        if (!audioMedia) { 
            audioElement.src = ""; // Clear src if no new audio, to prevent replaying old audio
        }
      }
    }
    
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioMedia]); 

  if (!visualMedia && !audioMedia) {
    return null; 
  }

  const getAccessibleName = (media: MediaItem | null | undefined, typeFallback: string): string => {
    if (!media) return `Media content for ${typeFallback}`;
    return media.altText?.[currentLanguage] || media.altText?.['tr'] || media.altText?.['en'] || `Media content for ${media.type}`;
  }

  const visualMediaAccessibleName = getAccessibleName(visualMedia, visualMedia?.type || 'visual');
  const audioMediaAccessibleName = getAccessibleName(audioMedia, 'audio');

  return (
    <Card className="mt-8 w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-medium">Medya Yanıtı</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-center items-center p-4 space-y-4">
        {visualMedia?.type === 'image' && (
          <Image
            src={visualMedia.url}
            alt={visualMediaAccessibleName}
            width={600}
            height={400}
            className="rounded-md object-contain max-h-[400px]"
            data-ai-hint={visualMedia.dataAiHint || 'media content'}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://placehold.co/600x400.png?text=Resim+Yüklenemedi';
              target.alt = 'Resim yüklenirken hata oluştu';
            }}
          />
        )}
        {visualMedia?.type === 'video' && (
          <div className="w-full">
            <video controls width="100%" className="rounded-md max-h-[400px]" aria-label={visualMediaAccessibleName} autoPlay muted>
              <source src={visualMedia.url} />
              Tarayıcınız video etiketini desteklemiyor.
            </video>
            {visualMedia.altText && <p className="text-sm text-muted-foreground mt-2">{visualMediaAccessibleName}</p>}
          </div>
        )}
        
        <audio ref={audioRef} style={{ display: 'none' }} aria-label={audioMediaAccessibleName} />

        {!visualMedia && audioMedia && (
            <p className="text-muted-foreground">Ses oynatılıyor...</p>
        )}

        {visualMedia && !['image', 'video'].includes(visualMedia.type) && (
          <div className="text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Desteklenmeyen görsel medya türü.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
