
"use client";

import type { LanguageCode } from "@/constants/languages";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface LanguageSwitcherProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  idSuffix?: string;
}

export function LanguageSwitcher({ currentLanguage, onLanguageChange, idSuffix = "" }: LanguageSwitcherProps) {
  const labelId = `language-switcher-label-${idSuffix}`;
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={`language-select-${idSuffix}`} id={labelId} className="text-sm font-medium">Language:</Label>
      <Select value={currentLanguage} onValueChange={(value) => onLanguageChange(value as LanguageCode)}>
        <SelectTrigger className="w-[120px]" id={`language-select-${idSuffix}`} aria-labelledby={labelId}>
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
