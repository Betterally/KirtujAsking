
import type { LanguageCode } from '@/constants/languages';

export interface LocalizedText {
  [key: string]: string; // Allow string for easier indexing e.g. LocalizedText[LanguageCode]
}

export interface MediaItem {
  type: 'image' | 'audio' | 'video';
  url: string;
  altText?: LocalizedText; // For images, accessibility
  dataAiHint?: string; // For image placeholders
}

export interface Choice {
  id: string;
  text: LocalizedText;
  media: MediaItem[]; // Changed from MediaItem | null
}

export interface Question {
  id: string;
  text: LocalizedText;
  choices: Choice[];
}
