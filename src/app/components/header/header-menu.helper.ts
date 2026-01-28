import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

/**
 * Helper class for handling menu and profile functionality in the header component
 */
export class HeaderMenuHelper {
  showUserMenu = false;
  showProfileView = false;
  showEditProfileView = false;
  editedFullName = '';
  editNameFocused = false;

  /** Toggles the user menu visibility */
  toggleUserMenu(): void {
    if (this.showProfileView || this.showEditProfileView) {
      this.showProfileView = false;
      this.showEditProfileView = false;
      this.showUserMenu = true;
      return;
    }
    this.showUserMenu = !this.showUserMenu;
  }

  /** Closes the user menu */
  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  /** Closes all menus and views */
  closeMenus(): void {
    this.showUserMenu = false;
    this.showProfileView = false;
    this.showEditProfileView = false;
  }

  /** Opens the profile view */
  openProfile(): void {
    this.showUserMenu = false;
    this.showProfileView = true;
    this.showEditProfileView = false;
  }

  /** Closes the profile view and returns to menu */
  closeProfileView(): void {
    this.showProfileView = false;
    this.showEditProfileView = false;
    this.showUserMenu = true;
  }

  /** Opens the edit profile view */
  openEditProfile(currentUserName: string): void {
    this.editedFullName = currentUserName || '';
    this.editNameFocused = false;
    this.showProfileView = false;
    this.showEditProfileView = true;
    this.showUserMenu = false;
  }

  /** Handles focus event on edit name input */
  onEditNameFocus(): void {
    this.editNameFocused = true;
  }

  /** Handles blur event on edit name input */
  onEditNameBlur(): void {
    this.editNameFocused = false;
  }

  /** Closes edit profile view and returns to profile view */
  closeEditProfileView(): void {
    this.showEditProfileView = false;
    this.showProfileView = true;
  }

  /** Cancels profile editing */
  cancelEditProfile(): void {
    this.closeEditProfileView();
  }

  /** Saves the edited profile information */
  async saveEditProfile(
    authService: AuthService,
    userService: UserService,
    updateUserCallback: (name: string) => void
  ): Promise<void> {
    const nextName = this.editedFullName.trim();
    if (!nextName) return;

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      await userService.updateUserProfile(currentUser.uid, nextName);
      updateUserCallback(nextName);
    }

    this.closeEditProfileView();
  }

  /** Opens the settings page */
  openSettings(router: Router): void {
    this.closeMenus();
    router.navigate(['/settings']);
  }

  /** Logs out the current user and navigates to login */
  async onLogout(authService: AuthService, router: Router): Promise<void> {
    this.closeMenus();
    await authService.logout();
    await router.navigate(['/login']);
  }
}
