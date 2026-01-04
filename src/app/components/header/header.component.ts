import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['../../shared/styles/shared-ui.css', './header.component.css']
})
export class HeaderComponent {
  private router = inject(Router);

  // Keep it compatible with your desired template fields.
  userProfile: {
    name?: string;
    profileImageUrl?: string;
    email?: string;
    status?: 'online' | 'offline'
  } | null = null;
  searchQuery = '';
  showUserMenu = false;
  showProfileView = false;
  showEditProfileView = false;

  editedFullName = '';
  editNameFocused = false;

  getStatusClass(user: { status?: 'online' | 'offline' } | null): string {
    return user?.status === 'online' ? 'status-online' : 'status-offline';
  }

  getStatusText(user: { status?: 'online' | 'offline' } | null): string {
    return user?.status === 'online' ? 'Aktiv' : 'Abwesend';
  }

  toggleUserMenu(): void {
    if (this.showProfileView || this.showEditProfileView) {
      this.showProfileView = false;
      this.showEditProfileView = false;
      this.showUserMenu = true;
      return;
    }

    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  closeMenus(): void {
    this.showUserMenu = false;
    this.showProfileView = false;
    this.showEditProfileView = false;
  }

  openProfile(): void {
    this.showUserMenu = false;
    this.showProfileView = true;
    this.showEditProfileView = false;
  }

  closeProfileView(): void {
    this.showProfileView = false;
    this.showEditProfileView = false;
    this.showUserMenu = true;
  }

  openEditProfile(): void {
    this.editedFullName = '';
    this.editNameFocused = false;
    this.showProfileView = false;
    this.showEditProfileView = true;
    this.showUserMenu = false;
  }

  onEditNameFocus(): void {
    this.editNameFocused = true;
  }

  onEditNameBlur(): void {
    this.editNameFocused = false;
  }

  closeEditProfileView(): void {
    this.showEditProfileView = false;
    this.showProfileView = true;
  }

  cancelEditProfile(): void {
    this.closeEditProfileView();
  }

  saveEditProfile(): void {
    const nextName = this.editedFullName.trim();
    if (nextName) {
      this.userProfile = { ...(this.userProfile ?? {}), name: nextName };
    }

    this.closeEditProfileView();
  }

  async onLogout(): Promise<void> {
    this.closeUserMenu();
    this.showProfileView = false;
    this.showEditProfileView = false;
    // Auth/Firebase is handled by another colleague; avoid injecting services here.
    await this.router.navigate(['/login']);
  }
}

