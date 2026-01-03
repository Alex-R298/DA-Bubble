import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SvgImagesComponent } from '../../svg-images/svg-images.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SvgImagesComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  displayName: string = '';
  email: string = '';
  password: string = '';
  privacyAccepted: boolean = false;

  async onSubmit(): Promise<void> {
    if (this.displayName && this.email && this.password && this.privacyAccepted) {
      await this.authService.register(this.email, this.password, this.displayName);
      this.router.navigate(['/login']);
    }
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}

