
"use client";

import type { MediaItem, LanguageCode } from "@/lib/types";
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface MediaViewerProps {
  media?: MediaItem | null;
  currentLanguage: LanguageCode;
}

export function MediaViewer({ media, currentLanguage }: MediaViewerProps) {
  if (!media) {
    return null; 
  }

  // For images, altText is relevant. For audio/video, it can be used as an accessible name.
  const accessibleName = media.altText?.[currentLanguage] || media.altText?.['tr'] || media.altText?.['en'] || `Media content for ${media.type}`;

  return (
    <Card className="mt-8 w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-medium">Medya Yanıtı</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center items-center p-4">
        {media.type === 'image' && (
          <Image
            src={media.url}
            alt={accessibleName}
            width={600}
            height={400}
            className="rounded-md object-contain max-h-[400px]"
            data-ai-hint={media.dataAiHint || 'media content'}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://placehold.co/600x400.png?text=Resim+Yüklenemedi';
              target.alt = 'Resim yüklenirken hata oluştu';
            }}
          />
        )}
        {media.type === 'audio' && (
          <div className="w-full">
            <audio controls src={media.url} className="w-full rounded-md" aria-label={accessibleName} autoPlay>
              Tarayıcınız ses öğesini desteklemiyor.
            </audio>
            {media.altText && <p className="text-sm text-muted-foreground mt-2">{accessibleName}</p>}
          </div>
        )}
        {media.type === 'video' && (
          <div className="w-full">
            <video controls width="100%" className="rounded-md max-h-[400px]" aria-label={accessibleName} autoPlay>
              <source src={media.url} /> {/* Let browser infer type or add type if known e.g. type="video/mp4" */}
              Tarayıcınız video etiketini desteklemiyor.
            </video>
            {media.altText && <p className="text-sm text-muted-foreground mt-2">{accessibleName}</p>}
          </div>
        )}
        {!['image', 'audio', 'video'].includes(media.type) && (
          <div className="text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Desteklenmeyen medya türü.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    
