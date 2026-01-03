import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  private router = inject(Router);

  // Keep it compatible with your desired template fields.
  userProfile: { name?: string; profileImageUrl?: string; status?: 'online' | 'offline' } | null = null;
  searchQuery = '';
  showUserMenu = false;

  getStatusClass(user: { status?: 'online' | 'offline' } | null): string {
    return user?.status === 'online' ? 'status-online' : 'status-offline';
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  openProfile(): void {
    this.closeUserMenu();
    // Placeholder until a profile page/modal exists
    console.log('Profil öffnen');
  }

  async onLogout(): Promise<void> {
    this.closeUserMenu();
    // Auth/Firebase is handled by another colleague; avoid injecting services here.
    await this.router.navigate(['/login']);
  }
}

