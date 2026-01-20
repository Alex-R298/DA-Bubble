import { Injectable } from '@angular/core';
import { User } from './user.service';
import { Channel } from './channel.service';

@Injectable({
    providedIn: 'root'
})
export class SearchService {
    normalizeText(value: string): string {
        return value
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    messageMatchesQuery(message: { content: string; senderName?: string }, q: string): boolean {
        const content = this.normalizeText(message.content || '');
        const sender = (message.senderName || '').toLowerCase();
        return content.includes(q) || sender.includes(q);
    }

    getSearchableChannels(memberChannels: Channel[], allChannels: Channel[]): Channel[] {
        return memberChannels.length ? memberChannels : allChannels;
    }

    getSearchUsersSource(allUsers: User[], currentUserProfile: User | null): User[] {
        const base = [...allUsers];
        if (currentUserProfile && !base.some(u => u.uid === currentUserProfile?.uid)) {
            base.unshift(currentUserProfile);
        }
        return base;
    }

    getChannelNameById(channelId: string, searchableChannels: Channel[]): string {
        return searchableChannels.find(c => c.id === channelId)?.name || 'Channel';
    }

    isCurrentUserInConversation(conversationId?: string, currentUserId?: string): boolean {
        if (!conversationId || !currentUserId) return false;
        return conversationId.split('_').includes(currentUserId);
    }

    getOtherUserIdFromConversation(conversationId?: string, currentUserId?: string): string | null {
        if (!conversationId || !currentUserId) return null;
        const ids = conversationId.split('_');
        return ids.find(id => id !== currentUserId) || null;
    }

    getUserNameById(users: User[], currentUserProfile: User | null, uid: string, fallback: string = 'User'): string {
        const user = users.find(u => u.uid === uid);
        return user?.name || user?.email || currentUserProfile?.name || fallback;
    }

    formatMessagePreview(content: string): string {
        const trimmed = (content || '').trim();
        if (trimmed.length <= 120) return trimmed;
        return `${trimmed.slice(0, 117)}...`;
    }

    replaceLastTag(value: string, trigger: '@' | '#', name: string): string {
        const pattern = trigger === '@' ? /@[^\s]*$/ : /#[^\s]*$/;
        return value.replace(pattern, `${trigger}${name}`);
    }
}
