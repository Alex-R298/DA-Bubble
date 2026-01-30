import { Injectable } from '@angular/core';
import { User } from './user.service';
import { Channel } from './channel.service';

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    /**
     * Checks if the query string appears to be an email address.
     * @param query - The search query to check.
     * @returns True if the query matches an email pattern.
     */
    isEmailQuery(query: string): boolean {
        const trimmed = (query || '').trim().toLowerCase();
        return /^[^\s@]+@[^\s@]+/.test(trimmed);
    }

    /**
     * Normalizes text by removing HTML tags, non-alphanumeric characters, and extra whitespace.
     * @param value - The text to normalize.
     * @returns The normalized lowercase text.
     */
    normalizeText(value: string): string {
        return value
            .replace(/<[^>]+>/g, ' ')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    /**
     * Checks if a message matches the search query.
     * @param message - The message object containing content and sender name.
     * @param q - The search query.
     * @returns True if the message content or sender name matches the query.
     */
    messageMatchesQuery(message: { content: string; senderName?: string }, q: string): boolean {
        const normalizedQ = this.normalizeText(q);
        const content = this.normalizeText(message.content || '');
        const sender = (message.senderName || '').toLowerCase();
        return content.includes(normalizedQ) || sender.includes(normalizedQ);
    }

    /**
     * Returns the channels available for searching.
     * @param memberChannels - Channels the user is a member of.
     * @param allChannels - All available channels.
     * @returns Member channels if available, otherwise all channels.
     */
    getSearchableChannels(memberChannels: Channel[], allChannels: Channel[]): Channel[] {
        return memberChannels.length ? memberChannels : allChannels;
    }

    /**
     * Returns the list of users available for searching.
     * @param allUsers - All users in the system.
     * @param currentUserProfile - The current user's profile.
     * @returns The user list including the current user if not already present.
     */
    getSearchUsersSource(allUsers: User[], currentUserProfile: User | null): User[] {
        const base = [...allUsers];
        if (currentUserProfile && !base.some(u => u.uid === currentUserProfile?.uid)) {
            base.unshift(currentUserProfile);
        }
        return base;
    }

    /**
     * Gets the channel name by its ID.
     * @param channelId - The ID of the channel.
     * @param searchableChannels - The list of channels to search in.
     * @returns The channel name or 'Channel' as fallback.
     */
    getChannelNameById(channelId: string, searchableChannels: Channel[]): string {
        return searchableChannels.find(c => c.id === channelId)?.name || 'Channel';
    }

    /**
     * Checks if the current user is part of a conversation.
     * @param conversationId - The conversation ID (format: 'userId1_userId2').
     * @param currentUserId - The current user's ID.
     * @returns True if the current user is in the conversation.
     */
    isCurrentUserInConversation(conversationId?: string, currentUserId?: string): boolean {
        if (!conversationId || !currentUserId) return false;
        return conversationId.split('_').includes(currentUserId);
    }

    /**
     * Extracts the other user's ID from a conversation ID.
     * @param conversationId - The conversation ID (format: 'userId1_userId2').
     * @param currentUserId - The current user's ID.
     * @returns The other user's ID or null if not found.
     */
    getOtherUserIdFromConversation(conversationId?: string, currentUserId?: string): string | null {
        if (!conversationId || !currentUserId) return null;
        const ids = conversationId.split('_');
        return ids.find(id => id !== currentUserId) || null;
    }

    /**
     * Gets a user's display name by their ID.
     * @param users - The list of users to search in.
     * @param currentUserProfile - The current user's profile.
     * @param uid - The user ID to look up.
     * @param fallback - The fallback name if not found.
     * @returns The user's name, email, or fallback value.
     */
    getUserNameById(users: User[], currentUserProfile: User | null, uid: string, fallback: string = 'User'): string {
        const user = users.find(u => u.uid === uid);
        return user?.name || user?.email || currentUserProfile?.name || fallback;
    }

    /**
     * Formats a message content for preview display.
     * @param content - The message content to format.
     * @returns The truncated content (max 120 chars) with ellipsis if needed.
     */
    formatMessagePreview(content: string): string {
        const trimmed = (content || '').trim();
        if (trimmed.length <= 120) return trimmed;
        return `${trimmed.slice(0, 117)}...`;
    }

    /**
     * Replaces the last mention or channel tag in a string with the selected name.
     * @param value - The input string containing the tag.
     * @param trigger - The trigger character ('@' for users, '#' for channels).
     * @param name - The name to replace the tag with.
     * @returns The string with the last tag replaced.
     */
    replaceLastTag(value: string, trigger: '@' | '#', name: string): string {
        const pattern = trigger === '@' ? /@[^\s]*$/ : /#[^\s]*$/;
        return value.replace(pattern, `${trigger}${name}`);
    }
}
