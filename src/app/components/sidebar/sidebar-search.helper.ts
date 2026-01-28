import { User } from '../../services/user.service';
import { Channel } from '../../services/channel.service';
import { Message } from '../../services/message.service';
import { DirectMessage } from '../../services/direct-message.service';
import { SearchService } from '../../services/search.service';

export type SearchMessageResult = {
  type: 'channel' | 'dm';
  messageId?: string;
  content: string;
  senderName?: string;
  senderProfileImage?: string;
  timestamp: Date;
  channelId?: string;
  channelName?: string;
  conversationId?: string;
  otherUserId?: string | null;
  otherUserName?: string;
};

/** Helper class for handling search functionality in the sidebar component */
export class SidebarSearchHelper {
  searchQuery = '';
  showSearchResults = false;
  showTagDropdown = false;
  tagListType: 'user' | 'channel' | null = null;
  tagQuery = '';
  private readonly searchResultLimit = 6;

  /** Gets the normalized search query in lowercase */
  get normalizedSearchQuery(): string {
    return this.searchQuery.trim().toLowerCase();
  }

  /** Handles search input changes */
  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.updateTagState(value);
    this.updateSearchResultsVisibility();
  }

  /** Gets filtered channels based on search query */
  getFilteredSearchChannels(searchableChannels: Channel[]): Channel[] {
    const q = this.normalizedSearchQuery;
    if (!q) return [];
    return searchableChannels
      .filter(c => (c.name || '').toLowerCase().includes(q))
      .slice(0, this.searchResultLimit);
  }

  /** Gets filtered users based on search query */
  getFilteredSearchUsers(
    allUsers: User[],
    currentUserProfile: User | null,
    searchService: SearchService,
    hasMessages: boolean
  ): User[] {
    const q = this.normalizedSearchQuery;
    if (!q) return [];
    const isEmail = searchService.isEmailQuery(this.searchQuery);
    if (!isEmail && q.length < 3) return [];
    if (!isEmail && hasMessages) return [];
    const sourceUsers = searchService.getSearchUsersSource(allUsers, currentUserProfile);
    if (isEmail) {
      return sourceUsers.filter(u => (u.email || '').toLowerCase().includes(q)).slice(0, this.searchResultLimit);
    }
    return sourceUsers
      .filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      .slice(0, this.searchResultLimit);
  }

  /** Gets filtered messages from channels and DMs based on search query */
  getFilteredSearchMessages(
    allChannelMessages: Message[],
    allDirectMessages: DirectMessage[],
    searchableChannels: Channel[],
    currentUserId: string,
    allUsers: User[],
    currentUserProfile: User | null,
    searchService: SearchService
  ): SearchMessageResult[] {
    const q = this.normalizedSearchQuery;
    if (!q) return [];
    if (searchService.isEmailQuery(this.searchQuery)) return [];

    const channelIds = new Set(searchableChannels.map(c => c.id).filter(Boolean) as string[]);

    const channelMessages = allChannelMessages
      .filter(m => channelIds.has(m.channelId) && !(m as any).parentMessageId)
      .filter(m => searchService.messageMatchesQuery(m, q))
      .map(m => ({
        type: 'channel',
        messageId: m.id,
        content: m.content,
        senderName: m.senderName,
        senderProfileImage: (m as any).senderProfileImage,
        timestamp: m.timestamp,
        channelId: m.channelId,
        channelName: searchService.getChannelNameById(m.channelId, searchableChannels)
      } as SearchMessageResult));

    const directMessages = allDirectMessages
      .filter(dm => searchService.isCurrentUserInConversation(dm.conversationId, currentUserId) && !(dm as any).parentMessageId)
      .filter(dm => searchService.messageMatchesQuery(dm, q))
      .map(dm => {
        const otherUserId = searchService.getOtherUserIdFromConversation(dm.conversationId, currentUserId);
        return {
          type: 'dm',
          messageId: dm.id,
          content: dm.content,
          senderName: dm.senderName,
          senderProfileImage: (dm as any).senderProfileImage,
          timestamp: dm.timestamp,
          conversationId: dm.conversationId,
          otherUserId: otherUserId,
          otherUserName: otherUserId ? searchService.getUserNameById(allUsers, currentUserProfile, otherUserId) : undefined
        } as SearchMessageResult;
      });

    return [...channelMessages, ...directMessages]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, this.searchResultLimit);
  }

  /** Gets filtered users for mention dropdown */
  getFilteredMentionUsers(allUsers: User[]): User[] {
    if (!this.showTagDropdown || this.tagListType !== 'user') return [];
    const q = this.tagQuery.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }

  /** Gets filtered channels for mention dropdown */
  getFilteredMentionChannels(searchableChannels: Channel[]): Channel[] {
    if (!this.showTagDropdown || this.tagListType !== 'channel') return [];
    const q = this.tagQuery.trim().toLowerCase();
    if (!q) return searchableChannels;
    return searchableChannels.filter(c => (c.name || '').toLowerCase().includes(q));
  }

  /** Clears all search-related state */
  clearSearch(): void {
    this.searchQuery = '';
    this.showSearchResults = false;
    this.showTagDropdown = false;
    this.tagListType = null;
    this.tagQuery = '';
  }

  /** Updates tag dropdown state based on search input */
  private updateTagState(value: string): void {
    const match = value.trim().match(/^([@#])([^\s]*)$/);
    if (!match) {
      this.showTagDropdown = false;
      this.tagListType = null;
      this.tagQuery = '';
      return;
    }
    this.tagListType = match[1] === '@' ? 'user' : 'channel';
    this.showTagDropdown = true;
    this.tagQuery = match[2] || '';
  }

  /** Updates the visibility of search results dropdown */
  private updateSearchResultsVisibility(): void {
    this.showSearchResults = !!this.normalizedSearchQuery && !this.showTagDropdown;
  }

  /** Tracking function for channel list in ngFor */
  trackByChannelId(index: number, channel: Channel): string {
    return channel.id || `${index}`;
  }

  /** Tracking function for search message list in ngFor */
  trackBySearchMessage(index: number, message: SearchMessageResult): string {
    return message.messageId || `${message.type}-${message.timestamp.getTime()}-${index}`;
  }
}
