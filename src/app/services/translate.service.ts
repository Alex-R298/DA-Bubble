import { Injectable, signal } from '@angular/core';
import { TranslateService as NgxTranslateService } from '@ngx-translate/core';

// Supported languages: German (default), English, Spanish, French
export type SupportedLanguage = 'de' | 'en' | 'es' | 'fr';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private static readonly STORAGE_KEY = 'da-bubble-language';
  
  readonly languages: LanguageOption[] = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];
  
  readonly currentLanguage = signal<SupportedLanguage>('de');

  constructor(private translate: NgxTranslateService) {
    this.initializeTranslation();
  }

  private initializeTranslation(): void {
    this.translate.addLangs(['de', 'en', 'es', 'fr']);
    this.translate.setDefaultLang('de');
    
    const savedLang = this.getSavedLanguage();
    if (savedLang && this.isValidLanguage(savedLang)) {
      this.setLanguage(savedLang);
    } else {
      const browserLang = this.translate.getBrowserLang() as SupportedLanguage;
      if (browserLang && this.isValidLanguage(browserLang)) {
        this.setLanguage(browserLang);
      } else {
        this.setLanguage('de');
      }
    }
  }

  setLanguage(lang: SupportedLanguage): void {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    this.saveLanguage(lang);
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage();
  }

  getLanguageOptions(): LanguageOption[] {
    return this.languages;
  }

  private getSavedLanguage(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TranslationService.STORAGE_KEY);
    }
    return null;
  }

  private saveLanguage(lang: SupportedLanguage): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TranslationService.STORAGE_KEY, lang);
    }
  }

  private isValidLanguage(lang: string): lang is SupportedLanguage {
    return ['de', 'en', 'es', 'fr'].includes(lang);
  }
}
