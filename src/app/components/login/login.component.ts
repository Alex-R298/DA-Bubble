import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { HeaderLoginComponent } from '../header-login/header-login.component';
import { OverlayComponent } from '../overlay/overlay.component';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Login component for user authentication.
 * Provides email/password login and Google OAuth login functionality.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SvgImagesComponent, HeaderLoginComponent, OverlayComponent, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  password: string = '';

  showOverlay: boolean = false;
  overlayType: 'error' | 'success' = 'error';
  overlayTitle: string = '';
  overlayMessage: string = '';

  /**
   * Validates email format using regex pattern.
   * @param email - The email address to validate.
   * @returns True if email format is valid, false otherwise.
   */
  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Maps Firebase authentication error codes to precise user-friendly messages.
   * @param errorCode - The Firebase error code.
   * @param email - The email address used in the login attempt (for context).
   * @returns An object containing the error title and message.
   */
  private getErrorMessage(errorCode: string, email?: string): { title: string; message: string } {
    const errorMessages: { [key: string]: { title: string; message: string } } = {
      'auth/user-not-found': {
        title: 'E-Mail-Adresse nicht gefunden',
        message: 'Es existiert kein Konto mit dieser E-Mail-Adresse. Bitte überprüfen Sie die E-Mail-Adresse oder registrieren Sie sich.'
      },
      'auth/wrong-password': {
        title: 'Passwort falsch',
        message: 'Das eingegebene Passwort ist nicht korrekt. Bitte überprüfen Sie Ihr Passwort und versuchen Sie es erneut.'
      },
      'auth/invalid-email': {
        title: 'Ungültige E-Mail-Adresse',
        message: 'Die eingegebene E-Mail-Adresse hat kein gültiges Format. Bitte überprüfen Sie die Schreibweise.'
      },
      'auth/user-disabled': {
        title: 'Konto deaktiviert',
        message: 'Dieses Konto wurde deaktiviert. Bitte kontaktieren Sie den Support für weitere Informationen.'
      },
      'auth/too-many-requests': {
        title: 'Zu viele Anmeldeversuche',
        message: 'Zu viele fehlgeschlagene Anmeldeversuche erkannt. Bitte warten Sie einige Minuten und versuchen Sie es dann erneut.'
      },
      'auth/network-request-failed': {
        title: 'Netzwerkfehler',
        message: 'Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'
      },
      'auth/invalid-credential': {
        title: 'Anmeldung fehlgeschlagen',
        message: this.getInvalidCredentialMessage(email)
      },
      'auth/operation-not-allowed': {
        title: 'Anmeldung nicht erlaubt',
        message: 'Die E-Mail/Passwort-Anmeldung ist für diese Anwendung nicht aktiviert. Bitte kontaktieren Sie den Support.'
      },
      'auth/requires-recent-login': {
        title: 'Erneute Anmeldung erforderlich',
        message: 'Aus Sicherheitsgründen müssen Sie sich erneut anmelden. Bitte melden Sie sich erneut an.'
      }
    };

    return errorMessages[errorCode] || {
      title: 'Anmeldefehler',
      message: 'Bei der Anmeldung ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.'
    };
  }

  /**
   * Provides a more precise message for invalid-credential errors based on email validation.
   * @param email - The email address used in the login attempt.
   * @returns A precise error message.
   */
  private getInvalidCredentialMessage(email?: string): string {
    if (email && this.isValidEmailFormat(email)) {
      return 'Das Passwort ist falsch. Bitte überprüfen Sie Ihr Passwort und versuchen Sie es erneut. Falls Sie Ihr Passwort vergessen haben, nutzen Sie die Funktion "Passwort vergessen".';
    }
    return 'Die E-Mail-Adresse oder das Passwort ist falsch. Bitte überprüfen Sie beide Eingaben und versuchen Sie es erneut.';
  }

  /**
   * Handles the login form submission with email and password.
   * Validates input before API call and shows precise error messages.
   * Shows success overlay and redirects to dashboard on success, or displays error overlay on failure.
   */
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
      this.overlayMessage = 'Die eingegebene E-Mail-Adresse hat kein gültiges Format. Bitte überprüfen Sie die Schreibweise.';
      this.showOverlay = true;
      return;
    }

    try {
      sessionStorage.removeItem('guestMode');
      await this.authService.login(this.email, this.password);
      this.overlayType = 'success';
      this.overlayTitle = 'Erfolgreich angemeldet';
      this.overlayMessage = 'Sie werden zum Dashboard weitergeleitet...';
      this.showOverlay = true;

      setTimeout(() => {
        this.showOverlay = false;
        this.router.navigate(['/dashboard']);
      }, 1500);
    } catch (error: any) {
      const errorInfo = this.getErrorMessage(error.code || '', this.email);
      this.overlayType = 'error';
      this.overlayTitle = errorInfo.title;
      this.overlayMessage = errorInfo.message;
      this.showOverlay = true;
    }
  }

  /**
   * Handles Google OAuth login.
   * Shows success overlay and redirects to dashboard on success, or displays error overlay on failure.
   */
  async onGoogleLogin(): Promise<void> {
    try {
      sessionStorage.removeItem('guestMode');
      await this.authService.loginWithGoogle();
      this.overlayType = 'success';
      this.overlayTitle = 'Erfolgreich angemeldet';
      this.overlayMessage = 'Sie werden zum Dashboard weitergeleitet...';
      this.showOverlay = true;

      setTimeout(() => {
        this.showOverlay = false;
        this.router.navigate(['/dashboard']);
      }, 1500);
    } catch (error: any) {
      const errorInfo = this.getGoogleErrorMessage(error.code || '');
      this.overlayType = 'error';
      this.overlayTitle = errorInfo.title;
      this.overlayMessage = errorInfo.message;
      this.showOverlay = true;
    }
  }

  /**
   * Maps Google OAuth error codes to precise user-friendly messages.
   * @param errorCode - The Firebase/Google error code.
   * @returns An object containing the error title and message.
   */
  private getGoogleErrorMessage(errorCode: string): { title: string; message: string } {
    const errorMessages: { [key: string]: { title: string; message: string } } = {
      'auth/popup-closed-by-user': {
        title: 'Anmeldung abgebrochen',
        message: 'Das Google-Anmeldefenster wurde geschlossen. Bitte klicken Sie erneut auf "Anmelden mit Google" und schließen Sie das Fenster nicht vor Abschluss der Anmeldung.'
      },
      'auth/popup-blocked': {
        title: 'Popup blockiert',
        message: 'Das Google-Anmeldefenster wurde vom Browser blockiert. Bitte erlauben Sie Popups für diese Website in Ihren Browser-Einstellungen und versuchen Sie es erneut.'
      },
      'auth/cancelled-popup-request': {
        title: 'Anmeldung abgebrochen',
        message: 'Die Google-Anmeldung wurde abgebrochen. Bitte versuchen Sie es erneut und schließen Sie das Anmeldefenster nicht vor Abschluss.'
      },
      'auth/account-exists-with-different-credential': {
        title: 'Konto bereits vorhanden',
        message: 'Ein Konto mit dieser E-Mail-Adresse existiert bereits, wurde aber mit einer anderen Anmeldemethode (E-Mail/Passwort) erstellt. Bitte melden Sie sich mit dieser Methode an.'
      },
      'auth/network-request-failed': {
        title: 'Netzwerkfehler',
        message: 'Es konnte keine Verbindung zum Google-Authentifizierungsserver hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'
      },
      'auth/operation-not-allowed': {
        title: 'Google-Anmeldung nicht aktiviert',
        message: 'Die Google-Anmeldung ist für diese Anwendung nicht aktiviert. Bitte kontaktieren Sie den Support.'
      },
      'auth/unauthorized-domain': {
        title: 'Domain nicht autorisiert',
        message: 'Diese Domain ist für die Google-Anmeldung nicht autorisiert. Bitte kontaktieren Sie den Support.'
      }
    };

    return errorMessages[errorCode] || {
      title: 'Google-Anmeldung fehlgeschlagen',
      message: 'Bei der Anmeldung mit Google ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.'
    };
  }

  /**
   * Closes the overlay when the user dismisses it.
   */
  onOverlayClose(): void {
    this.showOverlay = false;
  }

  /** Guest login: set guest flag and navigate to dashboard */
  onGuestLogin(): void {
    sessionStorage.setItem('guestMode', 'true');
    this.router.navigate(['/dashboard']);
  }
}

