import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../../svg-images/svg-images.component';
import { PrivacyStateService } from '../../services/privacy-state.service';

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

  goBack(): void {
    this.location.back();
  }

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
