import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { HeaderLoginComponent } from '../header-login/header-login.component';
import { OverlayComponent } from '../overlay/overlay.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SvgImagesComponent,
    HeaderLoginComponent,
    OverlayComponent,
    TranslateModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  submitted = false;
  emailError = '';     // Fehlermeldung für E-Mail-Feld
  passwordError = '';  // Fehlermeldung für Passwort-Feld

  showOverlay = false;
  overlayType: 'error' | 'success' = 'error';
  overlayTitle = '';
  overlayMessage = '';

  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  /** Setzt Fehlermeldungen zurück beim Tippen */
  clearErrors(): void {
    this.passwordError = '';
    this.emailError = '';
  }

  isEmailValid(): boolean {
    const email = this.email.trim();
    if (email.includes('@@') || email.includes('::') || email.includes('..')) {
      return false;
    }
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) {
      return false;
    }
    return this.emailRegex.test(email);
  }

  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /** Einheitliche Auth-Fehlermeldung (kein Information Leak) */
  private getGenericAuthError(): { title: string; message: string } {
    return {
      title: 'Anmeldung fehlgeschlagen',
      message: 'Die Anmeldedaten sind ungültig. Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.'
    };
  }

  /** Reduzierte, sichere Fehlerabbildung */
  private getErrorMessage(errorCode: string): { title: string; message: string } {
    switch (errorCode) {
      case 'auth/network-request-failed':
        return {
          title: 'Netzwerkfehler',
          message: 'Keine Verbindung zum Server möglich. Bitte versuchen Sie es erneut.'
        };

      case 'auth/too-many-requests':
        return {
          title: 'Zu viele Versuche',
          message: 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte warten Sie einige Minuten.'
        };

      case 'auth/user-disabled':
        return {
          title: 'Konto deaktiviert',
          message: 'Dieses Konto ist deaktiviert. Bitte kontaktieren Sie den Support.'
        };

      default:
        return this.getGenericAuthError();
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    this.emailError = '';
    this.passwordError = '';

    if (!this.isEmailValid()) {
      return;
    }

    if (!this.password) {
      this.passwordError = 'Passwort ist erforderlich.';
      return;
    }

    try {
      sessionStorage.removeItem('guestMode');
      await this.authService.login(this.email, this.password);

      this.overlayType = 'success';
      this.overlayTitle = 'Erfolgreich angemeldet';
      this.overlayMessage = 'Weiterleitung zum Dashboard...';
      this.showOverlay = true;

      setTimeout(() => {
        this.showOverlay = false;
        this.router.navigate(['/dashboard']);
      }, 1500);
    } catch (error: any) {
      const errorCode = error?.code ?? '';
      

      if (errorCode === 'auth/wrong-password' ||
          errorCode === 'auth/invalid-credential' ||
          errorCode === 'auth/user-not-found' || 
          errorCode === 'auth/invalid-email') {
        this.passwordError = 'E-Mail oder Passwort ist falsch.';
        return;
      }
      const errorInfo = this.getErrorMessage(errorCode);
      this.overlayType = 'error';
      this.overlayTitle = errorInfo.title;
      this.overlayMessage = errorInfo.message;
      this.showOverlay = true;
    }
  }

  async onGoogleLogin(): Promise<void> {
    try {
      sessionStorage.removeItem('guestMode');
      await this.authService.loginWithGoogle();

      this.overlayType = 'success';
      this.overlayTitle = 'Erfolgreich angemeldet';
      this.overlayMessage = 'Weiterleitung zum Dashboard...';
      this.showOverlay = true;

      setTimeout(() => {
        this.showOverlay = false;
        this.router.navigate(['/dashboard']);
      }, 1500);
    } catch {
      this.overlayType = 'error';
      this.overlayTitle = 'Anmeldung fehlgeschlagen';
      this.overlayMessage = 'Die Anmeldung mit Google war nicht erfolgreich. Bitte versuchen Sie es erneut.';
      this.showOverlay = true;
    }
  }

  onOverlayClose(): void {
    this.showOverlay = false;
  }

  onGuestLogin(): void {
    sessionStorage.setItem('guestMode', 'true');
    this.router.navigate(['/dashboard']);
  }
}