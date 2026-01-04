import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../../svg-images/svg-images.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SvgImagesComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  email: string = '';
  isSubmitted: boolean = false;

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/login']);
  }

  onSubmit(): void {
    if (this.email) {
      this.isSubmitted = true;
      
      // Generate example reset token (in production, this would be done by backend)
      const resetToken = this.generateMockToken();
      const resetLink = `${window.location.origin}/reset-password?token=${resetToken}`;
      
      console.log('Password reset email sent to:', this.email);
      console.log('Reset link (for testing):', resetLink);
      console.log('Token:', resetToken);
    }
  }

  private generateMockToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
