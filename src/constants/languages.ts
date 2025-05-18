
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Turkish' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];
