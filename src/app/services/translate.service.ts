import { Injectable, signal } from '@angular/core';
import { TranslateService as NgxTranslateService } from '@ngx-translate/core';

/** Supported language codes */
export type SupportedLanguage = 'de' | 'en' | 'es' | 'fr';

/** Language option for display in UI */
export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

/**
 * Service for managing application translations and language preferences.
 * Supports German (default), English, Spanish, and French.
 * Persists language selection to localStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private static readonly STORAGE_KEY = 'da-bubble-language';
  
  /** Available language options for the language selector */
  readonly languages: LanguageOption[] = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];
  
  /** Reactive signal for the currently active language */
  readonly currentLanguage = signal<SupportedLanguage>('de');

  constructor(private translate: NgxTranslateService) {
    this.initializeTranslation();
  }

  /**
   * Initializes the translation service with available languages
   * and restores the user's preferred language from storage or browser settings
   */
  private initializeTranslation(): void {
    this.translate.addLangs(['de', 'en', 'es', 'fr']);
    this.translate.setDefaultLang('de');
    
    const savedLang = this.getSavedLanguage();
    if (savedLang && this.isValidLanguage(savedLang)) {
      this.setLanguage(savedLang);
    } else {
      this.setLanguageFromBrowserOrDefault();
    }
  }

  /**
   * Sets language based on browser preference or falls back to German
   */
  private setLanguageFromBrowserOrDefault(): void {
    const browserLang = this.translate.getBrowserLang() as SupportedLanguage;
    if (browserLang && this.isValidLanguage(browserLang)) {
      this.setLanguage(browserLang);
    } else {
      this.setLanguage('de');
    }
  }

  /**
   * Changes the active language and persists the selection
   * @param lang - The language code to switch to
   */
  setLanguage(lang: SupportedLanguage): void {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    this.saveLanguage(lang);
  }

  /**
   * Returns the currently active language code
   * @returns The current language code
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage();
  }

  /**
   * Returns all available language options for UI display
   * @returns Array of language options with code, name, and flag
   */
  getLanguageOptions(): LanguageOption[] {
    return this.languages;
  }

  /**
   * Retrieves the saved language preference from localStorage
   * @returns The saved language code or null if not found
   */
  private getSavedLanguage(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TranslationService.STORAGE_KEY);
    }
    return null;
  }

  /**
   * Persists the language preference to localStorage
   * @param lang - The language code to save
   */
  private saveLanguage(lang: SupportedLanguage): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TranslationService.STORAGE_KEY, lang);
    }
  }

  /**
   * Type guard to check if a string is a valid supported language
   * @param lang - The language string to validate
   * @returns True if the language is supported
   */
  private isValidLanguage(lang: string): lang is SupportedLanguage {
    return ['de', 'en', 'es', 'fr'].includes(lang);
  }
}