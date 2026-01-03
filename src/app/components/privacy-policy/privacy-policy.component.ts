import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../../svg-images/svg-images.component';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterModule, SvgImagesComponent],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.css'
})
export class PrivacyPolicyComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/signup']);
  }
}
