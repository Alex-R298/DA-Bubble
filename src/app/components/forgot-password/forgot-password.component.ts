import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SvgImagesComponent, TranslateModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  isSubmitted: boolean = false;
  resetLink: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  goBack(): void {
    this.router.navigate(['/login']);
  }

  async onSubmit(): Promise<void> {
    if (!this.email) {
      this.errorMessage = 'Bitte E-Mail eingeben';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const result = await this.authService.sendPasswordResetEmail(this.email);

    this.loading = false;

    if (result.success) {
      this.isSubmitted = true;
    } else {
      this.errorMessage = result.message;
    }
  }
}