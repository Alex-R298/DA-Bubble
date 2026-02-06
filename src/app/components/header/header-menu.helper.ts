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
  showAvatarModal = false;
  editedFullName = '';
  editNameFocused = false;
  nameError: string | null = null;
  pendingAvatar: string | null = null;

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
    this.showAvatarModal = false;
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

  /** Set pending avatar chosen in avatar modal (not persisted yet) */
  setPendingAvatar(avatarUrl: string): void {
    this.pendingAvatar = avatarUrl;
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
    this.pendingAvatar = null;
  }

  /** Cancels profile editing */
  cancelEditProfile(): void {
    this.pendingAvatar = null;
    this.closeEditProfileView();
  }

  /** Regex for valid names - only letters, spaces and apostrophes */
  private readonly nameRegex = /^[a-zA-ZäöüÄÖÜßéèêëàâáãåçñíìîïóòôõúùûýÿæœÀÂÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÕÚÙÛÝŸÆŒ\s']+$/;

  /** Validates the name input */
  validateName(): boolean {
    const name = this.editedFullName.trim();
    if (!name) {
      this.nameError = 'Bitte einen Namen eingeben!';
      return false;
    }
    if (!this.nameRegex.test(name)) {
      this.nameError = 'Bitte nur Buchstaben, Leerzeichen und Apostrophe verwenden.';
      return false;
    }
    if (name.length < 2) {
      this.nameError = 'Der Name muss mindestens 2 Zeichen haben.';
      return false;
    }
    this.nameError = null;
    return true;
  }

  /** Clears the name error */
  clearNameError(): void {
    this.nameError = null;
  }

  /** Saves the edited profile information */
  async saveEditProfile(
    authService: AuthService,
    userService: UserService,
    updateUserCallback: (name: string, avatar?: string) => void
  ): Promise<void> {
    if (!this.validateName()) {
      return;
    }
    const nextName = this.editedFullName.trim();

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      await userService.updateUserProfile(currentUser.uid, nextName);
      if (this.pendingAvatar) {
        await userService.updateUserAvatar(currentUser.uid, this.pendingAvatar);
        const sentAvatar = this.pendingAvatar;
        this.pendingAvatar = null;
        userService.clearUserCache();
        updateUserCallback(nextName, sentAvatar);
      } else {
        userService.clearUserCache();
        updateUserCallback(nextName);
      }
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
    await router.navigate(['/login'], { replaceUrl: true });
  }

  /** Opens the avatar modal */
  openAvatarModal(): void {
    this.showAvatarModal = true;
  }

  /** Closes the avatar modal */
  closeAvatarModal(): void {
    this.showAvatarModal = false;
  }
}
