import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '@/config/environment';

export interface ChatMessage {
  id: string;
  text: string;
  user: { 
    id: string;
    name: string; 
  };
  timestamp: Date;
  sessionId: string;
  callId: string;
}

export interface ChatSession {
  sessionId: string;
  callId: string;
  messages: ChatMessage[];
  participants: string[];
  createdAt: Date;
  lastMessageAt: Date;
}

const STORAGE_KEYS = {
  CHAT_SESSIONS: 'chat_sessions',
  SESSION_PREFIX: 'chat_session_',
} as const;

export class ChatService {
  private static instance: ChatService;

  private constructor() {}

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Save a chat message to persistent storage
   */
  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      const sessionKey = `${STORAGE_KEYS.SESSION_PREFIX}${message.sessionId}`;
      
      // Get existing chat session
      let chatSession = await this.getChatSession(message.sessionId);
      
      if (!chatSession) {
        // Create new chat session
        chatSession = {
          sessionId: message.sessionId,
          callId: message.callId,
          messages: [],
          participants: [message.user.id],
          createdAt: new Date(),
          lastMessageAt: new Date(),
        };
      }

      // Add message to session
      chatSession.messages.push(message);
      chatSession.lastMessageAt = new Date();
      
      // Add participant if not already in list
      if (!chatSession.participants.includes(message.user.id)) {
        chatSession.participants.push(message.user.id);
      }

      // Save updated session
      await AsyncStorage.setItem(sessionKey, JSON.stringify(chatSession));
      
      // Update sessions index
      await this.updateSessionsIndex(message.sessionId);
      
      log.info('Chat message saved:', { sessionId: message.sessionId, messageId: message.id });
    } catch (error) {
      log.error('Failed to save chat message:', error);
      throw error;
    }
  }

  /**
   * Get all messages for a chat session
   */
  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const sessionKey = `${STORAGE_KEYS.SESSION_PREFIX}${sessionId}`;
      const sessionData = await AsyncStorage.getItem(sessionKey);
      
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData);
      
      // Convert date strings back to Date objects
      session.createdAt = new Date(session.createdAt);
      session.lastMessageAt = new Date(session.lastMessageAt);
      session.messages = session.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      return session;
    } catch (error) {
      log.error('Failed to get chat session:', error);
      return null;
    }
  }

  /**
   * Get all chat messages for a session
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const chatSession = await this.getChatSession(sessionId);
      return chatSession?.messages || [];
    } catch (error) {
      log.error('Failed to get chat messages:', error);
      return [];
    }
  }

  /**
   * Get all chat sessions (for displaying chat history)
   */
  async getAllChatSessions(): Promise<ChatSession[]> {
    try {
      const indexData = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      if (!indexData) {
        return [];
      }

      const sessionIds: string[] = JSON.parse(indexData);
      const sessions: ChatSession[] = [];

      for (const sessionId of sessionIds) {
        const session = await this.getChatSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      // Sort by last message time (most recent first)
      return sessions.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    } catch (error) {
      log.error('Failed to get all chat sessions:', error);
      return [];
    }
  }

  /**
   * Delete all messages for a session
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      const sessionKey = `${STORAGE_KEYS.SESSION_PREFIX}${sessionId}`;
      await AsyncStorage.removeItem(sessionKey);
      
      // Remove from sessions index
      await this.removeFromSessionsIndex(sessionId);
      
      log.info('Chat session deleted:', sessionId);
    } catch (error) {
      log.error('Failed to delete chat session:', error);
      throw error;
    }
  }

  /**
   * Clear all chat data
   */
  async clearAllChats(): Promise<void> {
    try {
      const sessions = await this.getAllChatSessions();
      
      // Delete all session data
      for (const session of sessions) {
        const sessionKey = `${STORAGE_KEYS.SESSION_PREFIX}${session.sessionId}`;
        await AsyncStorage.removeItem(sessionKey);
      }
      
      // Clear sessions index
      await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_SESSIONS);
      
      log.info('All chat data cleared');
    } catch (error) {
      log.error('Failed to clear all chat data:', error);
      throw error;
    }
  }

  /**
   * Search messages across all sessions
   */
  async searchMessages(query: string): Promise<ChatMessage[]> {
    try {
      const sessions = await this.getAllChatSessions();
      const results: ChatMessage[] = [];
      
      const lowerQuery = query.toLowerCase();
      
      for (const session of sessions) {
        for (const message of session.messages) {
          if (message.text.toLowerCase().includes(lowerQuery) ||
              message.user.name.toLowerCase().includes(lowerQuery)) {
            results.push(message);
          }
        }
      }
      
      // Sort by timestamp (most recent first)
      return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      log.error('Failed to search messages:', error);
      return [];
    }
  }

  /**
   * Update the sessions index to include a new session
   */
  private async updateSessionsIndex(sessionId: string): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      let sessionIds: string[] = indexData ? JSON.parse(indexData) : [];
      
      if (!sessionIds.includes(sessionId)) {
        sessionIds.push(sessionId);
        await AsyncStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(sessionIds));
      }
    } catch (error) {
      log.error('Failed to update sessions index:', error);
    }
  }

  /**
   * Remove a session from the sessions index
   */
  private async removeFromSessionsIndex(sessionId: string): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      if (!indexData) return;
      
      let sessionIds: string[] = JSON.parse(indexData);
      sessionIds = sessionIds.filter(id => id !== sessionId);
      
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(sessionIds));
    } catch (error) {
      log.error('Failed to remove from sessions index:', error);
    }
  }

  /**
   * Get recent messages across all sessions (for notifications/previews)
   */
  async getRecentMessages(limit: number = 10): Promise<ChatMessage[]> {
    try {
      const sessions = await this.getAllChatSessions();
      const allMessages: ChatMessage[] = [];
      
      for (const session of sessions) {
        allMessages.push(...session.messages);
      }
      
      // Sort by timestamp (most recent first) and limit
      return allMessages
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      log.error('Failed to get recent messages:', error);
      return [];
    }
  }

  /**
   * Export chat session as text (for sharing/backup)
   */
  async exportChatSession(sessionId: string): Promise<string> {
    try {
      const session = await this.getChatSession(sessionId);
      if (!session) {
        throw new Error('Chat session not found');
      }

      let exportText = `Chat Session: ${sessionId}\n`;
      exportText += `Participants: ${session.participants.join(', ')}\n`;
      exportText += `Created: ${session.createdAt.toLocaleString()}\n`;
      exportText += `Last Message: ${session.lastMessageAt.toLocaleString()}\n\n`;
      exportText += '--- Messages ---\n\n';

      for (const message of session.messages) {
        exportText += `[${message.timestamp.toLocaleTimeString()}] ${message.user.name}: ${message.text}\n`;
      }

      return exportText;
    } catch (error) {
      log.error('Failed to export chat session:', error);
      throw error;
    }
  }
}

export const chatService = ChatService.getInstance();