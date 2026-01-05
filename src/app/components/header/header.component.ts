import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, User } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['../../shared/styles/shared-ui.css', './header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  user: {
    name?: string;
    profileImageUrl?: string;
    email?: string;
    status?: 'online' | 'offline' | 'away'
  } | null = null;
  
  searchQuery = '';
  showUserMenu = false;
  showProfileView = false;
  showEditProfileView = false;
  editedFullName = '';
  editNameFocused = false;
  private userSubscription?: any;

  ngOnInit(): void {
    this.authService.authState$.subscribe(async (authUser) => {
      if (authUser) {
        this.userSubscription = this.userService.subscribeToUser(authUser.uid)
          .subscribe(userData => {
            if (userData) {
              this.user = {
                name: userData.name,
                profileImageUrl: userData.profileImageUrl,
                email: userData.email,
                status: userData.status
              };
            }
          });
      } else {
        this.user = null;
        this.userSubscription?.unsubscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  getStatusClass(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away';
    return 'status-offline';
  }

  getStatusText(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return 'Aktiv';
    if (user?.status === 'away') return 'Abwesend';
    return 'Offline';
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
    this.editedFullName = this.user?.name || '';
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

  async saveEditProfile(): Promise<void> {
    const nextName = this.editedFullName.trim();
    if (!nextName) return;

    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      await this.userService.updateUserProfile(currentUser.uid, nextName);
      this.user = { ...this.user, name: nextName };
    }

    this.closeEditProfileView();
  }

  async onLogout(): Promise<void> {
  this.closeMenus();
  await this.authService.logout();
  await this.router.navigate(['/login']);
}
}