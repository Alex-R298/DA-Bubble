/**
 * Interface for basic reaction data
 */
export interface BasicReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}


/**
 * Interface for reaction data with user names
 */
export interface ReactionWithUsers extends BasicReaction {
  userNames: string[];
  users: string[];
}


/**
 * Helper class for handling message reactions
 * Provides methods for parsing, caching, and displaying reactions
 */
export class MessageItemReactionsHelper {
  private cachedReactions: ReactionWithUsers[] = [];
  private lastReactionsHash: string = '';
  reactionsExpanded: boolean = false;


  /**
   * Updates the cached reactions when reactions change
   * @param message - The message object containing reactions
   * @param currentUserId - The current user's ID
   */
  updateCachedReactions(message: any, currentUserId: string): void {
    const reactionsHash = JSON.stringify(message?.reactions || {});
    if (reactionsHash !== this.lastReactionsHash) {
      this.lastReactionsHash = reactionsHash;
      this.cachedReactions = this.computeReactionsWithUsers(message, currentUserId);
    }
  }


  /**
   * Gets basic reaction data without user names
   * @param message - The message object containing reactions
   * @param currentUserId - The current user's ID
   * @returns Array of reactions with emoji, count, and user reaction status
   */
  getReactions(message: any, currentUserId: string): BasicReaction[] {
    const reactions = message?.reactions;
    if (!reactions) return [];

    if (Array.isArray(reactions)) {
      return this.getReactionsFromArray(reactions, currentUserId);
    }
    return this.getReactionsFromObject(reactions, currentUserId);
  }


  /**
   * Extracts reactions from array format
   * @private
   * @param reactions - Reactions in array format
   * @param currentUserId - The current user's ID
   * @returns Array of processed reactions
   */
  private getReactionsFromArray(reactions: any[], currentUserId: string): BasicReaction[] {
    return reactions
      .map((r: any) => this.toBasicReaction(r?.emoji, r?.users, currentUserId, r?.count))
      .filter((r: any) => r.emoji && r.count > 0);
  }


  /**
   * Extracts reactions from object format
   * @private
   * @param reactions - Reactions in object format
   * @param currentUserId - The current user's ID
   * @returns Array of processed reactions
   */
  private getReactionsFromObject(reactions: any, currentUserId: string): BasicReaction[] {
    return Object.entries(reactions)
      .map(([emoji, value]: [string, any]) => {
        if (Array.isArray(value)) return this.toBasicReaction(emoji, value, currentUserId);
        if (value && typeof value === 'object') return this.toBasicReaction(emoji, value.users, currentUserId, value.count);
        return this.toBasicReaction(emoji, [], currentUserId);
      })
      .filter(r => r.emoji && r.count > 0);
  }


  /**
   * Converts raw reaction data to basic reaction object
   * @private
   * @param emoji - The emoji string
   * @param users - Array of user IDs who reacted
   * @param currentUserId - The current user's ID
   * @param count - Optional count override
   * @returns Basic reaction object
   */
  private toBasicReaction(emoji: string, users: string[] | undefined, currentUserId: string, count?: number): BasicReaction {
    const safeUsers = Array.isArray(users) ? users : [];
    const safeCount = typeof count === 'number' ? count : safeUsers.length;
    return {
      emoji,
      count: safeCount,
      hasReacted: currentUserId ? safeUsers.includes(currentUserId) : false
    };
  }


  /**
   * Gets reaction data including user names with caching
   * @param message - The message object containing reactions
   * @param currentUserId - The current user's ID
   * @returns Array of reactions with emoji, count, user reaction status, and user names
   */
  getReactionsWithUsers(message: any, currentUserId: string): ReactionWithUsers[] {
    const reactionsHash = JSON.stringify(message?.reactions || {});
    if (reactionsHash !== this.lastReactionsHash) {
      this.updateCachedReactions(message, currentUserId);
    }
    return this.cachedReactions;
  }


  /**
   * Computes reaction data with user names from message reactions
   * @private
   * @param message - The message object containing reactions
   * @param currentUserId - The current user's ID
   * @returns Array of reactions with emoji, count, user reaction status, and user names
   */
  private computeReactionsWithUsers(message: any, currentUserId: string): ReactionWithUsers[] {
    const reactions = message?.reactions;
    if (!reactions) return [];

    if (Array.isArray(reactions)) {
      return this.computeReactionsWithUsersArray(reactions, currentUserId);
    }
    return this.computeReactionsWithUsersObject(reactions, currentUserId);
  }


  /**
   * Computes reactions with user names from array format
   * @private
   * @param reactions - Reactions in array format
   * @param currentUserId - The current user's ID
   * @returns Array of reactions with user names
   */
  private computeReactionsWithUsersArray(reactions: any[], currentUserId: string): ReactionWithUsers[] {
    return reactions
      .map((r: any) => this.toReactionWithUsers(r?.emoji, r?.users, currentUserId, r?.userNames, r?.count))
      .filter((r: any) => r.emoji && r.count > 0);
  }


  /**
   * Computes reactions with user names from object format
   * @private
   * @param reactions - Reactions in object format
   * @param currentUserId - The current user's ID
   * @returns Array of reactions with user names
   */
  private computeReactionsWithUsersObject(reactions: any, currentUserId: string): ReactionWithUsers[] {
    return Object.entries(reactions)
      .map(([emoji, value]: [string, any]) => {
        if (Array.isArray(value)) return this.toReactionWithUsers(emoji, value, currentUserId, []);
        if (value && typeof value === 'object') return this.toReactionWithUsers(emoji, value.users, currentUserId, value.userNames, value.count);
        return this.toReactionWithUsers(emoji, [], currentUserId, []);
      })
      .filter(r => r.emoji && r.count > 0);
  }


  /**
   * Converts raw reaction data to reaction object with user names
   * @private
   * @param emoji - The emoji string
   * @param users - Array of user IDs who reacted
   * @param currentUserId - The current user's ID
   * @param userNames - Array of user names who reacted
   * @param count - Optional count override
   * @returns Reaction object with user names
   */
  private toReactionWithUsers(emoji: string, users: string[] | undefined, currentUserId: string, userNames?: string[], count?: number): ReactionWithUsers {
    const safeUsers = Array.isArray(users) ? users : [];
    const safeUserNames = Array.isArray(userNames) ? userNames : [];
    const safeCount = typeof count === 'number' ? count : safeUsers.length;
    return {
      emoji,
      count: safeCount,
      hasReacted: currentUserId ? safeUsers.includes(currentUserId) : false,
      userNames: safeUserNames,
      users: safeUsers
    };
  }


  /**
   * Tracking function for ngFor to improve performance
   * @param index - The index of the item
   * @param reaction - The reaction object
   * @returns The emoji as unique identifier
   */
  trackByEmoji(index: number, reaction: { emoji: string }): string {
    return reaction.emoji;
  }


  /**
   * Calculates maximum number of visible reactions based on screen size and context
   * @param showThreadButton - Whether thread button is shown
   * @returns Maximum number of reactions to display
   */
  getMaxVisibleReactions(showThreadButton: boolean): number {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
    const isThread = !showThreadButton;
    return (isMobile || isThread) ? 7 : 20;
  }


  /**
   * Gets the reactions that should be visible based on expansion state
   * @param message - The message object containing reactions
   * @param currentUserId - The current user's ID
   * @param showThreadButton - Whether thread button is shown
   * @returns Array of visible reactions with user information
   */
  getVisibleReactions(message: any, currentUserId: string, showThreadButton: boolean): ReactionWithUsers[] {
    const allReactions = this.getReactionsWithUsers(message, currentUserId);
    if (this.reactionsExpanded) {
      return allReactions;
    }
    const maxVisible = this.getMaxVisibleReactions(showThreadButton);
    return allReactions.slice(0, maxVisible);
  }


  /**
   * Calculates the number of hidden reactions
   * @param message - The message object containing reactions
   * @param currentUserId - The current user's ID
   * @param showThreadButton - Whether thread button is shown
   * @returns Count of reactions not currently visible
   */
  getHiddenReactionsCount(message: any, currentUserId: string, showThreadButton: boolean): number {
    const allReactions = this.getReactionsWithUsers(message, currentUserId);
    const maxVisible = this.getMaxVisibleReactions(showThreadButton);
    return Math.max(0, allReactions.length - maxVisible);
  }


  /**
   * Checks if there are hidden reactions
   * @param message - The message object containing reactions
   * @param currentUserId - The current user's ID
   * @param showThreadButton - Whether thread button is shown
   * @returns True if reactions are hidden
   */
  hasHiddenReactions(message: any, currentUserId: string, showThreadButton: boolean): boolean {
    return this.getHiddenReactionsCount(message, currentUserId, showThreadButton) > 0;
  }


  /**
   * Toggles the expanded state of reactions
   */
  toggleReactionsExpanded(): void {
    this.reactionsExpanded = !this.reactionsExpanded;
  }


  /**
   * Gets all user names to display for a reaction
   * @param reaction - The reaction object with user information
   * @returns Formatted string with all user names
   */
  getReactionUserName(reaction: ReactionWithUsers): string {
    if (!reaction.userNames || reaction.userNames.length === 0) {
      return 'Jemand';
    }
    return reaction.userNames.join(', ');
  }


  /**
   * Determines if 'Du' suffix should be shown for a reaction
   * @param reaction - The reaction object
   * @returns True if Du suffix should be displayed
   */
  showDuSuffix(reaction: ReactionWithUsers): boolean {
    return reaction.hasReacted;
  }


  /**
   * Generates tooltip text for a reaction showing all users who reacted
   * @param reaction - The reaction object with user information
   * @param senderName - The sender's name from the message
   * @returns Formatted tooltip text
   */
  getReactionTooltipText(reaction: ReactionWithUsers, senderName?: string): string {
    const names = [...reaction.userNames];
    if (reaction.hasReacted) {
      const currentUserIndex = names.findIndex(name =>
        name === senderName || name === 'Du'
      );
      if (currentUserIndex === -1) {
        names.unshift('Du');
      } else {
        names[currentUserIndex] = 'Du';
        names.splice(currentUserIndex, 1);
        names.unshift('Du');
      }
    }

    return this.formatReactionNames(names, reaction.hasReacted);
  }


  /**
   * Formats reaction names into a readable German text
   * @private
   * @param names - Array of user names
   * @param hasReacted - Whether current user has reacted
   * @returns Formatted text string
   */
  private formatReactionNames(names: string[], hasReacted: boolean): string {
    if (names.length === 0) {
      return hasReacted ? 'Du hast reagiert' : 'hat reagiert';
    }
    if (names.length === 1) {
      return `${names[0]} hat reagiert`;
    }
    if (names.length === 2) {
      return `${names[0]} und ${names[1]} haben reagiert`;
    }
    return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]} haben reagiert`;
  }
}
