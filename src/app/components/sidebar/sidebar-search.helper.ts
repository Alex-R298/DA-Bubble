import { User } from '../../services/user.service';
import { Channel } from '../../services/channel.service';
import { Message } from '../../services/message.service';
import { DirectMessage } from '../../services/direct-message.service';
import { SearchService } from '../../services/search.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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

/** 
 * Helper class for handling search functionality in the sidebar component
 * Includes debouncing and result caching to prevent excessive filtering operations
 */
export class SidebarSearchHelper {
  searchQuery = '';
  showSearchResults = false;
  showTagDropdown = false;
  tagListType: 'user' | 'channel' | null = null;
  tagQuery = '';
  private readonly searchResultLimit = 6;
  private readonly DEBOUNCE_MS = 300;
  
  private searchSubject = new Subject<string>();
  private debouncedQuery = '';
  private isInitialized = false;
  private cachedChannels: Channel[] = [];
  private cachedUsers: User[] = [];
  private cachedMessages: SearchMessageResult[] = [];
  private cachedMentionUsers: User[] = [];
  private cachedMentionChannels: Channel[] = [];
  private onDebouncedSearch: (() => void) | null = null;

  constructor() {
    this.initDebounce();
  }

  /** Set callback to be called when debounced search should trigger recalculation */
  setSearchCallback(callback: () => void): void {
    this.onDebouncedSearch = callback;
  }

  private initDebounce(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    this.searchSubject.pipe(
      debounceTime(this.DEBOUNCE_MS),
      distinctUntilChanged()
    ).subscribe(query => {
      this.debouncedQuery = query;
      this.updateSearchResultsVisibility();
      // Trigger recalculation via callback
      if (this.onDebouncedSearch) {
        this.onDebouncedSearch();
      }
    });
  }

  /** Gets the normalized search query in lowercase (uses debounced value) */
  get normalizedSearchQuery(): string {
    return this.debouncedQuery.trim().toLowerCase();
  }

  /** Handles search input changes with debouncing */
  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.updateTagState(value);
    if (!value.trim()) {
      this.debouncedQuery = '';
      this.showSearchResults = false;
      this.clearCachedResults();
    } else {
      this.searchSubject.next(value);
    }
  }

  /** Clear all cached results */
  private clearCachedResults(): void {
    this.cachedChannels = [];
    this.cachedUsers = [];
    this.cachedMessages = [];
  }

  /** Recalculate and cache all search results - call this from the component when debounce triggers */
  updateSearchResults(
    searchableChannels: Channel[],
    allUsers: User[],
    currentUserProfile: User | null,
    allChannelMessages: Message[],
    allDirectMessages: DirectMessage[],
    currentUserId: string,
    searchService: SearchService
  ): void {
    const q = this.normalizedSearchQuery;
    
    // Update cached channels
    if (!q) {
      this.cachedChannels = [];
    } else {
      this.cachedChannels = searchableChannels
        .filter(c => (c.name || '').toLowerCase().includes(q))
        .slice(0, this.searchResultLimit);
    }
    if (!q || searchService.isEmailQuery(this.searchQuery)) {
      this.cachedMessages = [];
    } else {
      const channelIds = new Set(searchableChannels.map(c => c.id).filter(Boolean) as string[]);

      const channelMessages = allChannelMessages
        .filter(m => channelIds.has(m.channelId))
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

      this.cachedMessages = [...channelMessages, ...directMessages]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.searchResultLimit);
    }
    if (!q) {
      this.cachedUsers = [];
    } else {
      const isEmail = searchService.isEmailQuery(this.searchQuery);
      if (!isEmail && q.length < 3) {
        this.cachedUsers = [];
      } else if (!isEmail && this.cachedMessages.length > 0) {
        this.cachedUsers = [];
      } else {
        const sourceUsers = searchService.getSearchUsersSource(allUsers, currentUserProfile);
        if (isEmail) {
          this.cachedUsers = sourceUsers
            .filter(u => (u.email || '').toLowerCase().includes(q))
            .slice(0, this.searchResultLimit);
        } else {
          this.cachedUsers = sourceUsers
            .filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
            .slice(0, this.searchResultLimit);
        }
      }
    }
  }

  /** Update mention dropdowns - called immediately without debounce */
  updateMentionResults(allUsers: User[], searchableChannels: Channel[]): void {
    if (!this.showTagDropdown || this.tagListType !== 'user') {
      this.cachedMentionUsers = [];
    } else {
      const q = this.tagQuery.trim().toLowerCase();
      if (!q) {
        this.cachedMentionUsers = allUsers;
      } else {
        this.cachedMentionUsers = allUsers.filter(u =>
          (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
        );
      }
    }
    if (!this.showTagDropdown || this.tagListType !== 'channel') {
      this.cachedMentionChannels = [];
    } else {
      const q = this.tagQuery.trim().toLowerCase();
      if (!q) {
        this.cachedMentionChannels = searchableChannels;
      } else {
        this.cachedMentionChannels = searchableChannels.filter(c => (c.name || '').toLowerCase().includes(q));
      }
    }
  }
  
  getFilteredSearchChannels(_searchableChannels: Channel[]): Channel[] {
    return this.cachedChannels;
  }

  getFilteredSearchUsers(
    _allUsers: User[],
    _currentUserProfile: User | null,
    _searchService: SearchService,
    _hasMessages: boolean
  ): User[] {
    return this.cachedUsers;
  }

  getFilteredSearchMessages(
    _allChannelMessages: Message[],
    _allDirectMessages: DirectMessage[],
    _searchableChannels: Channel[],
    _currentUserId: string,
    _allUsers: User[],
    _currentUserProfile: User | null,
    _searchService: SearchService
  ): SearchMessageResult[] {
    return this.cachedMessages;
  }

  getFilteredMentionUsers(_allUsers: User[]): User[] {
    return this.cachedMentionUsers;
  }

  getFilteredMentionChannels(_searchableChannels: Channel[]): Channel[] {
    return this.cachedMentionChannels;
  }

  /** Clears all search-related state */
  clearSearch(): void {
    this.searchQuery = '';
    this.debouncedQuery = '';
    this.showSearchResults = false;
    this.showTagDropdown = false;
    this.tagListType = null;
    this.tagQuery = '';
    this.clearCachedResults();
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
