import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserProfileModalUser } from '../user-profile-modal/user-profile-modal.component';

/** Helper class for handling user profile modal functionality */
export class SidebarProfileHelper {
  showUserProfileModal = false;
  selectedProfileUser: UserProfileModalUser | null = null;

  /** Opens the user profile modal for a user */
  openUserProfile(user: any): void {
    if (!user) return;
    this.selectedProfileUser = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      status: user.status
    };
    this.showUserProfileModal = true;
  }

  /** Closes the user profile modal */
  closeUserProfile(): void {
    this.showUserProfileModal = false;
    this.selectedProfileUser = null;
  }

  /** Checks if the selected profile belongs to the current user */
  isSelectedProfileOwn(authService: AuthService): boolean {
    const currentUid = authService.getCurrentUser()?.uid;
    if (!currentUid) return false;
    return this.selectedProfileUser?.uid === currentUid;
  }

  /** Starts a direct message from the user profile modal */
  async startDirectMessageFromProfile(user: UserProfileModalUser, authService: AuthService, router: Router): Promise<void> {
    this.closeUserProfile();
    if (!user?.uid) return;
    if (user.uid === authService.getCurrentUser()?.uid) return;
    await router.navigate(['/dashboard/chat/user', user.uid]);
  }
}
