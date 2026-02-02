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

  showOverlay = false;
  overlayType: 'error' | 'success' = 'error';
  overlayTitle = '';
  overlayMessage = '';

  /** UX-only E-Mail-Formatprüfung (keine Sicherheitssemantik) */
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
    if (!this.email || !this.password) {
      this.overlayType = 'error';
      this.overlayTitle = 'Eingaben unvollständig';
      this.overlayMessage = 'Bitte füllen Sie alle Felder aus.';
      this.showOverlay = true;
      return;
    }

    if (!this.isValidEmailFormat(this.email)) {
      this.overlayType = 'error';
      this.overlayTitle = 'Ungültige E-Mail-Adresse';
      this.overlayMessage = 'Die eingegebene E-Mail-Adresse hat kein gültiges Format.';
      this.showOverlay = true;
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
      const errorInfo = this.getErrorMessage(error?.code ?? '');
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