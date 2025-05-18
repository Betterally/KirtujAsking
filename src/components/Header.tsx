
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Home } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { LanguageCode } from '@/constants/languages';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  showLanguageSwitcher?: boolean; // New optional prop
}

export function Header({ currentLanguage, onLanguageChange, showLanguageSwitcher = true }: HeaderProps) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <header className="py-4 px-6 shadow-md bg-card">
      <div className="container mx-auto flex items-center justify-between">
        <AppLogo />
        <div className="flex items-center gap-4">
          {showLanguageSwitcher && ( // Conditionally render LanguageSwitcher
            <LanguageSwitcher 
              currentLanguage={currentLanguage} 
              onLanguageChange={onLanguageChange}
              idSuffix={isAdminPage ? "admin" : "user"}
            />
          )}
          {isAdminPage ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/" aria-label="Go to User View">
                <Home className="mr-2 h-4 w-4" /> Kullanıcı Arayüzü
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin" aria-label="Go to Admin Panel">
                <Settings className="mr-2 h-4 w-4" /> Admin
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
