import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { HeaderLoginComponent } from '../header-login/header-login.component';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

/**
 * Reset password component for setting a new password.
 * Validates the reset code from email link and allows users to set a new password.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SvgImagesComponent,
    HeaderLoginComponent,
    TranslateModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  newPassword: string = '';
  confirmPassword: string = '';
  oobCode: string | null = null;
  passwordsMatch: boolean = true;
  isSubmitted: boolean = false;
  errorMessage: string = '';
  validCode: boolean = false;
  loading: boolean = false;

  /**
   * Initializes the component by extracting and validating the reset code from URL.
   * Redirects to login if the code is missing or invalid.
   */
  async ngOnInit(): Promise<void> {
    this.oobCode = this.route.snapshot.queryParamMap.get('oobCode');

    if (!this.oobCode) {
      this.errorMessage = 'Ungültiger Reset-Link';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
      return;
    }

    const result = await this.authService.verifyResetCode(this.oobCode);
    if (result.success) {
      this.validCode = true;
    } else {
      this.errorMessage = 'Der Reset-Link ist ungültig oder abgelaufen';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    }
  }

  /**
   * Validates that the new password and confirmation password match.
   */
  checkPasswordsMatch(): void {
    this.passwordsMatch = this.newPassword === this.confirmPassword;
  }

  /**
   * Submits the new password to Firebase for password reset.
   * Validates password requirements and redirects to login on success.
   */
  async onSubmit(): Promise<void> {
    if (!this.newPassword || !this.confirmPassword || !this.passwordsMatch) {
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein';
      return;
    }

    if (!this.oobCode) {
      this.errorMessage = 'Ungültiger Reset-Code';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const result = await this.authService.confirmPasswordReset(
      this.oobCode,
      this.newPassword
    );

    this.loading = false;

    if (result.success) {
      this.isSubmitted = true;
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } else {
      this.errorMessage = result.message;
    }
  }
}
