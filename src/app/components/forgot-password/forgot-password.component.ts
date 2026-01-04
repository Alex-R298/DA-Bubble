import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SvgImagesComponent } from '../svg-images/svg-images.component';

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
  resetLink: string = '';

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/login']);
  }

  onSubmit(): void {
    if (this.email) {
      // Generate example reset token (in production, this would be done by backend)
      const resetToken = this.generateMockToken();
      this.resetLink = `${window.location.origin}/reset-password?token=${resetToken}`;
      
      console.log('===================================');
      console.log('PASSWORD RESET LINK (FOR TESTING):');
      console.log(this.resetLink);
      console.log('===================================');
      console.log('Email:', this.email);
      console.log('Token:', resetToken);
      console.log('===================================');
      
      this.isSubmitted = true;
    }
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.resetLink).then(() => {
      alert('Link in Zwischenablage kopiert!');
    });
  }

  private generateMockToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
