
export interface Message {
  id?: string;
  channelId: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: Date;
  parentMessageId?: string;
  replies?: string[];         
}
