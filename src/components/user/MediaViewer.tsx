
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
    return null; // Don't render anything if no media is selected
  }

  const altText = media.altText?.[currentLanguage] || media.altText?.['en'] || `Media content for ${media.type}`;

  return (
    <Card className="mt-8 w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-medium">Media Response</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center items-center p-4">
        {media.type === 'image' && (
          <Image
            src={media.url}
            alt={altText}
            width={600}
            height={400}
            className="rounded-md object-contain max-h-[400px]"
            data-ai-hint={media.dataAiHint || 'media content'}
            onError={(e) => e.currentTarget.src = 'https://placehold.co/600x400.png?text=Error+Loading+Image'}
          />
        )}
        {media.type === 'audio' && (
          <div className="w-full">
            <audio controls src={media.url} className="w-full rounded-md" aria-label={altText}>
              Your browser does not support the audio element.
            </audio>
            <p className="text-sm text-muted-foreground mt-2">{altText}</p>
          </div>
        )}
        {media.type === 'video' && (
          <div className="w-full">
            <video controls width="100%" className="rounded-md max-h-[400px]" aria-label={altText}>
              <source src={media.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <p className="text-sm text-muted-foreground mt-2">{altText}</p>
          </div>
        )}
        {!['image', 'audio', 'video'].includes(media.type) && (
          <div className="text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Unsupported media type.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
