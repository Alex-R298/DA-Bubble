import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { UserService, User } from '../../services/user.service';
import { ChannelService, Channel } from '../../services/channel.service';
import { AuthService } from '../../services/auth.service';
import { SvgImagesComponent } from '../svg-images/svg-images.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, SvgImagesComponent, TranslateModule],
  templateUrl: './header.component.html',
  styleUrls: ['../../shared/styles/shared-ui.css', './header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private translateService = inject(TranslateService);
  private channelService = inject(ChannelService);

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
  private userSubscription?: Subscription;
  private usersSubscription?: Subscription;
  private channelsSubscription?: Subscription;
  private routerSub?: Subscription;
  allUsers: User[] = [];
  memberChannels: Channel[] = [];
  showTagDropdown = false;
  tagListType: 'user' | 'channel' | null = null;
  tagQuery = '';
  isChatActive = false;
  isMobile = false;

  ngOnInit(): void {
    this.updateViewportFlags();
    this.checkIfChatActive(this.router.url);
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

    this.usersSubscription = this.userService.getAllUsersRealtime()
      .subscribe(users => {
        const currentUid = this.authService.getCurrentUser()?.uid;
        this.allUsers = users.filter(u => u.uid !== currentUid);
      });

    this.channelsSubscription = this.channelService.getAllChannels()
      .subscribe(channels => {
        const currentUid = this.authService.getCurrentUser()?.uid;
        if (!currentUid) {
          this.memberChannels = [];
          return;
        }
        this.memberChannels = channels.filter(c => Array.isArray(c.members) && c.members.includes(currentUid));
      });

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(ev => this.checkIfChatActive(ev.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.usersSubscription?.unsubscribe();
    this.channelsSubscription?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateViewportFlags();
  }

  getStatusClass(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return 'status-online';
    if (user?.status === 'away') return 'status-away';
    return 'status-offline';
  }

  getStatusText(user: { status?: 'online' | 'offline' | 'away' } | null): string {
    if (user?.status === 'online') return this.translateService.instant('STATUS.ONLINE');
    if (user?.status === 'away') return this.translateService.instant('STATUS.OFFLINE');
    return 'Offline';
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.updateTagState(value);
  }

  get filteredMentionUsers(): User[] {
    if (!this.showTagDropdown || this.tagListType !== 'user') return [];
    const q = this.tagQuery.trim().toLowerCase();
    if (!q) return this.allUsers;
    return this.allUsers.filter(u =>
      (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    );
  }

  get filteredMentionChannels(): Channel[] {
    if (!this.showTagDropdown || this.tagListType !== 'channel') return [];
    const q = this.tagQuery.trim().toLowerCase();
    if (!q) return this.memberChannels;
    return this.memberChannels.filter(c => (c.name || '').toLowerCase().includes(q));
  }

  selectMentionUser(user: User): void {
    this.searchQuery = this.replaceLastTag(this.searchQuery, '@', user.name);
    this.showTagDropdown = false;
    this.tagListType = null;
    this.tagQuery = '';
  }

  selectMentionChannel(channel: Channel): void {
    this.searchQuery = this.replaceLastTag(this.searchQuery, '#', channel.name);
    this.showTagDropdown = false;
    this.tagListType = null;
    this.tagQuery = '';
  }

  private updateTagState(value: string): void {
    const match = value.match(/([@#])[^\s]*$/);
    if (!match) {
      this.showTagDropdown = false;
      this.tagListType = null;
      this.tagQuery = '';
      return;
    }
    const trigger = match[1];
    this.tagListType = trigger === '@' ? 'user' : 'channel';
    this.showTagDropdown = true;
    this.tagQuery = match[0].slice(1);
  }

  private replaceLastTag(value: string, trigger: '@' | '#', name: string): string {
    const pattern = trigger === '@' ? /@[^\s]*$/ : /#[^\s]*$/;
    return value.replace(pattern, `${trigger}${name}`);
  }

  private checkIfChatActive(url: string): void {
    this.isChatActive = url.includes('/channel/') || url.includes('/user/');
  }

  private updateViewportFlags(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
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

  openSettings(): void {
    this.closeMenus();
    this.router.navigate(['/settings']);
  }

  async onLogout(): Promise<void> {
    this.closeMenus();
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}