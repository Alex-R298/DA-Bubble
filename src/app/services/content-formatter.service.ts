import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class ContentFormatterService {
  private sanitizer = inject(DomSanitizer);

  /**
   * Escapes HTML special characters to prevent XSS
   */
  escapeHtml(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Formats content with @mentions and #channels as HTML spans for display
   */
  formatContent(content: string): SafeHtml {
    if (!content) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    let formatted = this.escapeHtml(content);

    // Format @[Name] mentions
    formatted = formatted.replace(/@\[([^\]]+)\]/g, (match, name) => {
      const trimmedName = name.trim();
      return `<span class="mention-tag" data-name="${trimmedName}">@${trimmedName}</span>`;
    });

    // Format #channel tags
    formatted = formatted.replace(/#(\S+)/g, '<span class="channel-tag" data-name="$1">#$1</span>');

    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  /**
   * Formats content for editable textarea with edit-specific classes
   */
  formatContentForEdit(content: string): string {
    if (!content) return '';

    let formatted = this.escapeHtml(content);

    // Format @[Name] mentions with edit-specific class
    formatted = formatted.replace(/@\[([^\]]+)\]/g, (match, name) => {
      const trimmedName = name.trim();
      return `<span class="edit-mention-tag" data-name="${trimmedName}" contenteditable="false">@${trimmedName}</span>`;
    });

    // Format #channel tags
    formatted = formatted.replace(/#(\S+)/g, '<span class="edit-channel-tag" contenteditable="false" data-name="$1">#$1</span>');

    return formatted;
  }

  /**
   * Extracts raw content from HTML element, converting mention/channel tags back to text format
   */
  extractRawContent(element: HTMLElement): string {
    let result = '';
    element.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.classList.contains('edit-mention-tag')) {
          const name = el.getAttribute('data-name');
          result += `@[${name}]`;
        } else if (el.classList.contains('edit-channel-tag') || el.classList.contains('channel-tag')) {
          const name = el.getAttribute('data-name');
          result += `#${name}`;
        } else {
          result += el.textContent;
        }
      }
    });
    return result;
  }

  /**
   * Creates HTML for a user mention tag
   */
  createUserTagHtml(userName: string, uid: string): string {
    return `<span class="edit-mention-tag" contenteditable="false" data-name="${userName}" data-uid="${uid}">@${userName}</span>&nbsp;`;
  }

  /**
   * Creates HTML for a channel tag
   */
  createChannelTagHtml(channelName: string): string {
    return `<span class="edit-channel-tag" contenteditable="false" data-name="${channelName}">#${channelName}</span>&nbsp;`;
  }

  /**
   * Checks the character before cursor to determine if tag dropdown should show
   * Returns 'user' for @, 'channel' for #, or null
   */
  getTagTriggerType(): 'user' | 'channel' | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
    const lastChar = textBeforeCursor[textBeforeCursor.length - 1];

    if (lastChar === '@') return 'user';
    if (lastChar === '#') return 'channel';
    return null;
  }
}
