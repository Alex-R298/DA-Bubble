import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PrivacyStateService } from '../../services/privacy-state.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { OverlayComponent } from '../overlay/overlay.component';
import { HeaderSignupComponent } from '../header-signup/header-signup.component';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SvgImagesComponent, OverlayComponent, TranslateModule, HeaderSignupComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private privacyStateService = inject(PrivacyStateService);

  displayName: string = '';
  email: string = '';
  confirmEmail: string = '';
  password: string = '';
  privacyAccepted: boolean = false;
  submitted: boolean = false;

  private nameRegex = /^[a-zA-ZäöüÄÖÜß]+\s+[a-zA-ZäöüÄÖÜß]+$/;
  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  showOverlay: boolean = false;
  overlayType: 'error' | 'success' = 'error';
  overlayTitle: string = '';
  overlayMessage: string = '';

  private privacySubscription?: Subscription;

  /**
   * Initializes the component and subscribes to the privacy acceptance status.
   */
  ngOnInit(): void {
    this.privacySubscription = this.privacyStateService.getPrivacyAcceptedStatus()
      .subscribe(accepted => {
        if (accepted) {
          this.privacyAccepted = true;
          this.privacyStateService.resetPrivacyAcceptance();
        }
      });
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.privacySubscription?.unsubscribe();
  }

  /**
   * Returns a user-friendly error message based on the Firebase error code.
   * @param errorCode - The Firebase authentication error code.
   * @returns An object containing the error title and message.
   */
  private getErrorMessage(errorCode: string): { title: string; message: string } {
    const errorMessages: { [key: string]: { title: string; message: string } } = {
      'auth/email-already-in-use': {
        title: 'E-Mail bereits verwendet',
        message: 'Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet.'
      },
      'auth/invalid-email': {
        title: 'Ungültige E-Mail',
        message: 'Die eingegebene E-Mail-Adresse ist ungültig.'
      },
      'auth/operation-not-allowed': {
        title: 'Vorgang nicht erlaubt',
        message: 'Dieser Vorgang ist nicht erlaubt. Bitte kontaktieren Sie den Support.'
      },
      'auth/weak-password': {
        title: 'Passwort zu schwach',
        message: 'Das Passwort muss mindestens 6 Zeichen lang sein.'
      },
      'auth/network-request-failed': {
        title: 'Netzwerkfehler',
        message: 'Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung.'
      }
    };

    return errorMessages[errorCode] || {
      title: 'Registrierungsfehler',
      message: 'Bei der Registrierung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.'
    };
  }


  /**
   * Checks if the email and confirmEmail fields match.
   * @returns True if emails match, false otherwise.
   */
  checkEmailsMatch(): boolean {
    return this.email === this.confirmEmail;
  }

  /**
   * Validates the display name (must contain first and last name).
   * @returns True if valid, false otherwise.
   */
  isNameValid(): boolean {
    const trimmedName = this.displayName.trim();
    return this.nameRegex.test(trimmedName);
  }

  /**
   * Validates the email format.
   * @returns True if valid, false otherwise.
   */
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

  /**
   * Validates the password (minimum 6 characters).
   * @returns True if valid, false otherwise.
   */
  isPasswordValid(): boolean {
    return this.password.length >= 6;
  }

  /**
   * Checks if the entire form is valid.
   * @returns True if all fields are valid, false otherwise.
   */
  isFormValid(): boolean {
    return this.isNameValid() && this.isEmailValid() && this.isPasswordValid() && this.privacyAccepted;
  }

  /**
   * Handles the form submission for user registration.
   * Validates the form data and attempts to register the user via AuthService.
   */
  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (!this.isNameValid()) {
      return;
    }

    if (!this.isEmailValid()) {
      return;
    }

    if (!this.isPasswordValid()) {
      return;
    }

    if (this.privacyAccepted) {
      try {
        await this.authService.register(this.email, this.password, this.displayName);
        this.overlayType = 'success';
        this.overlayTitle = 'Registrierung erfolgreich';
        this.overlayMessage = 'Ihr Konto wurde erfolgreich erstellt. Sie werden weitergeleitet...';
        this.showOverlay = true;

        setTimeout(() => {
          this.showOverlay = false;
          this.router.navigate(['/choose-avatar'], {
            state: { userName: this.displayName }
          });
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
   * Navigates back to the login page.
   */
  goBack(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Handles the click on the privacy policy link and sets the return route.
   */
  onPrivacyLinkClick(): void {
    this.privacyStateService.setReturnRoute('/signup');
  }

  /**
   * Closes the overlay when triggered.
   */
  onOverlayClose(): void {
    this.showOverlay = false;
  }
}

