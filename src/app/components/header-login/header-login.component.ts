import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService, SupportedLanguage, LanguageOption } from '../../services/translate.service';

@Component({
  selector: 'app-header-login',
  standalone: true,
  imports: [RouterModule, SvgImagesComponent, CommonModule, TranslateModule],
  templateUrl: './header-login.component.html',
  styleUrl: './header-login.component.css'
})
export class HeaderLoginComponent {
  showLanguageDropdown = false;
  languages: LanguageOption[];

  constructor(private translationService: TranslationService) {
    this.languages = this.translationService.getLanguageOptions();
  }

  get currentLanguage(): SupportedLanguage {
    return this.translationService.getCurrentLanguage();
  }

  get currentLanguageOption(): LanguageOption {
    return this.languages.find(l => l.code === this.currentLanguage) || this.languages[0];
  }

  toggleLanguageDropdown(): void {
    this.showLanguageDropdown = !this.showLanguageDropdown;
  }

  selectLanguage(lang: SupportedLanguage): void {
    this.translationService.setLanguage(lang);
    this.showLanguageDropdown = false;
  }

  closeDropdown(): void {
    this.showLanguageDropdown = false;
  }
}
