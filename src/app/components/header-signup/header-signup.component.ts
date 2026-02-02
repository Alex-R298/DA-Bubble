import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService, SupportedLanguage, LanguageOption } from '../../services/translate.service';

@Component({
  selector: 'app-header-signup',
  standalone: true,
  imports: [RouterModule, SvgImagesComponent, CommonModule, TranslateModule],
  templateUrl: './header-signup.component.html',
  styleUrl: './header-signup.component.css'
})
export class HeaderSignupComponent {
  showLanguageDropdown = false;
  languages: LanguageOption[];

  constructor(
    private translationService: TranslationService,
    private location: Location,
    private router: Router
  ) {
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

  goBack(): void {
    this.location.back();
  }
}
