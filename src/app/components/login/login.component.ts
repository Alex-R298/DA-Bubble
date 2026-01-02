import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
    private router = inject(Router);

  email: string = '';
  password: string = '';

  async onSubmit(): Promise<void> {
    await this.authService.login(this.email, this.password);
    this.router.navigate(['/dashboard']);
  }
}

