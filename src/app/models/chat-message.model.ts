export interface ChatMessage {
  id?: string;
  issueId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  content: string;
  timestamp?: Date;
  attachments?: string[]; // 添付ファイルのURL配列（将来の機能拡張用）
} 