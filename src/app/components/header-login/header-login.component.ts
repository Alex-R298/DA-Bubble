import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService, SupportedLanguage, LanguageOption } from '../../services/translate.service';

/**
 * Header component for the login page.
 * Displays the application logo and provides language selection functionality.
 */
@Component({
  selector: 'app-header-login',
  standalone: true,
  imports: [RouterModule, SvgImagesComponent, CommonModule, TranslateModule],
  templateUrl: './header-login.component.html',
  styleUrl: './header-login.component.css'
})
export class HeaderLoginComponent {
  /** Controls the visibility of the language dropdown menu. */
  showLanguageDropdown = false;

  /** List of available language options for selection. */
  languages: LanguageOption[];

  /**
   * Initializes the component with available language options.
   * @param translationService - Service for handling translations and language switching.
   */
  constructor(private translationService: TranslationService) {
    this.languages = this.translationService.getLanguageOptions();
  }

  /**
   * Gets the currently selected language code.
   * @returns The current language as a SupportedLanguage type.
   */
  get currentLanguage(): SupportedLanguage {
    return this.translationService.getCurrentLanguage();
  }

  /**
   * Gets the full language option object for the currently selected language.
   * @returns The LanguageOption matching the current language, or the first available option as fallback.
   */
  get currentLanguageOption(): LanguageOption {
    return this.languages.find(l => l.code === this.currentLanguage) || this.languages[0];
  }

  /**
   * Toggles the visibility of the language dropdown menu.
   */
  toggleLanguageDropdown(): void {
    this.showLanguageDropdown = !this.showLanguageDropdown;
  }

  /**
   * Sets the application language and closes the dropdown.
   * @param lang - The language code to switch to.
   */
  selectLanguage(lang: SupportedLanguage): void {
    this.translationService.setLanguage(lang);
    this.showLanguageDropdown = false;
  }

  /**
   * Closes the language dropdown menu.
   */
  closeDropdown(): void {
    this.showLanguageDropdown = false;
  }
}
