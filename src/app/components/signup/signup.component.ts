import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PrivacyStateService } from '../../services/privacy-state.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { OverlayComponent } from '../overlay/overlay.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SvgImagesComponent, OverlayComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private privacyStateService = inject(PrivacyStateService);

  displayName: string = '';
  email: string = '';
  password: string = '';
  privacyAccepted: boolean = false;
  
  showOverlay: boolean = false;
  overlayType: 'error' | 'success' = 'error';
  overlayTitle: string = '';
  overlayMessage: string = '';
  
  private privacySubscription?: Subscription;

  ngOnInit(): void {
    this.privacySubscription = this.privacyStateService.getPrivacyAcceptedStatus()
      .subscribe(accepted => {
        if (accepted) {
          this.privacyAccepted = true;
          this.privacyStateService.resetPrivacyAcceptance();
        }
      });
  }

  ngOnDestroy(): void {
    this.privacySubscription?.unsubscribe();
  }

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

  async onSubmit(): Promise<void> {
    if (this.displayName && this.email && this.password && this.privacyAccepted) {
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

  goBack(): void {
    this.router.navigate(['/login']);
  }

  onPrivacyLinkClick(): void {
    this.privacyStateService.setReturnRoute('/signup');
  }

  onOverlayClose(): void {
    this.showOverlay = false;
  }
}

