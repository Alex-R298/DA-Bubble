import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../../svg-images/svg-images.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SvgImagesComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  newPassword: string = '';
  confirmPassword: string = '';
  token: string | null = null;
  passwordsMatch: boolean = true;
  isSubmitted: boolean = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.router.navigate(['/login']);
    }
  }

  checkPasswordsMatch(): void {
    this.passwordsMatch = this.newPassword === this.confirmPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.newPassword && this.confirmPassword && this.passwordsMatch) {
      // Password reset logic here
      console.log('Password reset for token:', this.token);
      this.isSubmitted = true;
      
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    }
  }
}
