import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { PrivacyStateService } from '../../services/privacy-state.service';

/**
 * Privacy policy page component.
 * Displays the privacy policy and handles user acceptance for signup flow.
 */
@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterModule, SvgImagesComponent],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.css'
})
export class PrivacyPolicyComponent {
  private location = inject(Location);
  private router = inject(Router);
  private privacyStateService = inject(PrivacyStateService);

  /**
   * Navigates back to the previous page.
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Accepts the privacy policy and navigates back.
   * If coming from signup, marks privacy as accepted and returns to signup page.
   */
  acceptAndGoBack(): void {
    const returnRoute = this.privacyStateService.getReturnRoute();
    if (returnRoute === '/signup') {
      this.privacyStateService.setPrivacyAccepted(true);
      this.privacyStateService.clearReturnRoute();
      this.router.navigate(['/signup']);
    } else {
      this.location.back();
    }
  }
}
