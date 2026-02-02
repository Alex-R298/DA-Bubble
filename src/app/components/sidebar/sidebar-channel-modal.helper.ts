import { ChannelService } from '../../services/channel.service';
import { AuthService } from '../../services/auth.service';

/** Helper class for handling channel creation modal functionality */
export class SidebarChannelModalHelper {
  showNewChannelModal = false;
  showAddPeopleModal = false;
  newChannelName = '';
  newChannelDescription = '';
  newChannelError: string | null = null;
  addPeopleSelection: 'all' | 'specific' | null = null;
  addPeopleQuery = '';
  selectedAddPeople: any[] = [];
  selectedSourceChannelId: string | null = null;

  /** Opens the modal for creating a new channel */
  openNewChannelModal(): void {
    this.showNewChannelModal = true;
    this.showAddPeopleModal = false;
    this.newChannelName = '';
    this.newChannelDescription = '';
    this.newChannelError = null;
    this.addPeopleSelection = null;
    this.addPeopleQuery = '';
    this.selectedAddPeople = [];
    this.selectedSourceChannelId = null;
  }

  /** Closes the new channel modal */
  closeNewChannelModal(): void {
    this.showNewChannelModal = false;
    this.newChannelError = null;
  }

  /** Opens the modal for adding people to the new channel */
  openAddPeopleModal(): boolean {
    this.newChannelError = null;
    if (!this.newChannelName.trim()) {
      this.newChannelError = 'Bitte Channelnamen eingeben';
      return false;
    }
    this.showNewChannelModal = false;
    this.showAddPeopleModal = true;
    this.addPeopleSelection = null;
    this.addPeopleQuery = '';
    this.selectedAddPeople = [];
    this.selectedSourceChannelId = null;
    return true;
  }

  /** Closes the add people modal */
  closeAddPeopleModal(): void {
    this.showAddPeopleModal = false;
    this.newChannelError = null;
  }

  /** Sets the member selection mode for the new channel */
  setAddPeopleSelection(value: 'all' | 'specific', channel?: any): void {
    this.addPeopleSelection = value;
    if (value === 'all') {
      this.selectedSourceChannelId = channel?.id ?? null;
    } else {
      this.selectedSourceChannelId = null;
      this.addPeopleQuery = '';
      this.selectedAddPeople = [];
    }
  }

  /** Gets the filtered list of users available for adding to the channel */
  getFilteredAddPeople(users: any[]): any[] {
    const query = this.addPeopleQuery.trim().toLowerCase();
    if (!query) return [];
    const selectedIds = new Set(this.selectedAddPeople.map(u => u.uid));
    const candidates = users.filter(u => !selectedIds.has(u.uid));

    // Prefer name matches. For short queries (1-2 chars) only match names to avoid noisy email matches.
    const nameMatches = candidates.filter(u => (u.name || '').toLowerCase().includes(query));
    if (query.length < 3) {
      return nameMatches;
    }

    // For longer queries, include email matches as well (but avoid duplicates).
    const emailMatches = candidates
      .filter(u => (u.email || '').toLowerCase().includes(query) && !nameMatches.includes(u));

    return [...nameMatches, ...emailMatches];
  }

  /** Adds a user to the selected members list */
  addPersonToSelection(user: any): void {
    if (!user || this.selectedAddPeople.find(u => u.uid === user.uid)) return;
    this.selectedAddPeople = [...this.selectedAddPeople, user];
    this.addPeopleQuery = '';
  }

  /** Removes a user from the selected members list */
  removeSelectedAddPerson(uid: string): void {
    this.selectedAddPeople = this.selectedAddPeople.filter(u => u.uid !== uid);
  }

  /** Creates a new channel with the selected members */
  async createChannel(channels: any[], authService: AuthService, channelService: ChannelService): Promise<boolean> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return false;

    const desiredName = this.newChannelName.trim();
    if (!desiredName) return false;
    const normalizedDesiredName = desiredName.toLowerCase();
    const hasDuplicate = channels.some(c => (c?.name || '').trim().toLowerCase() === normalizedDesiredName);
    if (hasDuplicate) {
      this.newChannelError = 'Ein Channel mit diesem Namen existiert bereits!';
      return false;
    }

    let memberUids: string[] = [];

    if (this.addPeopleSelection === 'all' && this.selectedSourceChannelId) {
      const sourceChannel = channels.find(c => c.id === this.selectedSourceChannelId);
      memberUids = Array.isArray(sourceChannel?.members) ? sourceChannel.members : [];
    }

    if (this.addPeopleSelection === 'specific') {
      memberUids = this.selectedAddPeople.map(u => u.uid).filter(Boolean);
    }

    await channelService.createChannel(
      desiredName,
      this.newChannelDescription,
      currentUser.uid,
      memberUids
    );

    this.closeAddPeopleModal();
    return true;
  }
}
