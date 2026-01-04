import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PrivacyStateService } from '../../services/privacy-state.service';
import { SvgImagesComponent } from '../../svg-images/svg-images.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SvgImagesComponent],
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

  async onSubmit(): Promise<void> {
    if (this.displayName && this.email && this.password && this.privacyAccepted) {
      await this.authService.register(this.email, this.password, this.displayName);
      this.router.navigate(['/login']);
    }
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }

  onPrivacyLinkClick(): void {
    this.privacyStateService.setReturnRoute('/signup');
  }
}

