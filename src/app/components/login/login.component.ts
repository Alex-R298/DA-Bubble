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
   * Maps Firebase authentication error codes to user-friendly messages.
   * @param errorCode - The Firebase error code.
   * @returns An object containing the error title and message.
   */
  private getErrorMessage(errorCode: string): { title: string; message: string } {
    const errorMessages: { [key: string]: { title: string; message: string } } = {
      'auth/user-not-found': {
        title: 'Benutzer nicht gefunden',
        message: 'Es existiert kein Konto mit dieser E-Mail-Adresse.'
      },
      'auth/wrong-password': {
        title: 'Falsches Passwort',
        message: 'Das eingegebene Passwort ist falsch. Bitte versuchen Sie es erneut.'
      },
      'auth/invalid-email': {
        title: 'Ungültige E-Mail',
        message: 'Die eingegebene E-Mail-Adresse ist ungültig.'
      },
      'auth/user-disabled': {
        title: 'Konto deaktiviert',
        message: 'Dieses Konto wurde deaktiviert. Bitte kontaktieren Sie den Support.'
      },
      'auth/too-many-requests': {
        title: 'Zu viele Versuche',
        message: 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuchen Sie es später erneut.'
      },
      'auth/network-request-failed': {
        title: 'Netzwerkfehler',
        message: 'Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung.'
      },
      'auth/invalid-credential': {
        title: 'Ungültige Anmeldedaten',
        message: 'Die eingegebenen Anmeldedaten sind falsch. Bitte überprüfen Sie E-Mail und Passwort.'
      }
    };

    return errorMessages[errorCode] || {
      title: 'Anmeldefehler',
      message: 'Bei der Anmeldung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.'
    };
  }

  /**
   * Handles the login form submission with email and password.
   * Shows success overlay and redirects to dashboard on success, or displays error overlay on failure.
   */
  async onSubmit(): Promise<void> {
    if (this.email && this.password) {
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
        const errorInfo = this.getErrorMessage(error.code || '');
        this.overlayType = 'error';
        this.overlayTitle = errorInfo.title;
        this.overlayMessage = errorInfo.message;
        this.showOverlay = true;
      }
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
   * Maps Google OAuth error codes to user-friendly messages.
   * @param errorCode - The Firebase/Google error code.
   * @returns An object containing the error title and message.
   */
  private getGoogleErrorMessage(errorCode: string): { title: string; message: string } {
    const errorMessages: { [key: string]: { title: string; message: string } } = {
      'auth/popup-closed-by-user': {
        title: 'Anmeldung abgebrochen',
        message: 'Das Anmeldefenster wurde geschlossen. Bitte versuchen Sie es erneut.'
      },
      'auth/popup-blocked': {
        title: 'Popup blockiert',
        message: 'Das Anmeldefenster wurde vom Browser blockiert. Bitte erlauben Sie Popups für diese Seite.'
      },
      'auth/cancelled-popup-request': {
        title: 'Anmeldung abgebrochen',
        message: 'Die Anmeldung wurde abgebrochen. Bitte versuchen Sie es erneut.'
      },
      'auth/account-exists-with-different-credential': {
        title: 'Konto existiert bereits',
        message: 'Ein Konto mit dieser E-Mail-Adresse existiert bereits mit einer anderen Anmeldemethode.'
      },
      'auth/network-request-failed': {
        title: 'Netzwerkfehler',
        message: 'Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung.'
      }
    };

    return errorMessages[errorCode] || {
      title: 'Google-Anmeldung fehlgeschlagen',
      message: 'Bei der Anmeldung mit Google ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.'
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

