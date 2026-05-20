/**
 * conversationStore - localStorage + entity persistence for chat history
 * Saves conversations automatically and loads them on mount
 */

import { base44 } from "@/api/base44Client";

const STORAGE_KEY = "ushoe_conversations";
const MAX_LOCAL_CONVERSATIONS = 20;

export function getStoredConversations() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveConversation(conversation) {
  try {
    const conversations = getStoredConversations();
    const existing = conversations.find(c => c.id === conversation.id);
    
    if (existing) {
      Object.assign(existing, conversation);
    } else {
      conversations.unshift(conversation);
      if (conversations.length > MAX_LOCAL_CONVERSATIONS) {
        conversations.splice(MAX_LOCAL_CONVERSATIONS);
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error("Failed to save conversation:", error);
  }
}

export function deleteConversation(conversationId) {
  try {
    const conversations = getStoredConversations();
    const filtered = conversations.filter(c => c.id !== conversationId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete conversation:", error);
  }
}

export function getActiveConversation() {
  const conversations = getStoredConversations();
  return conversations.find(c => c.is_active) || null;
}

export function setActiveConversation(conversationId) {
  const conversations = getStoredConversations();
  conversations.forEach(c => {
    c.is_active = c.id === conversationId;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  return conversations.find(c => c.id === conversationId);
}

export function createNewConversation() {
  const newConv = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: "New Conversation",
    messages: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true,
  };
  
  // Deactivate others
  const conversations = getStoredConversations();
  conversations.forEach(c => c.is_active = false);
  conversations.unshift(newConv);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  
  return newConv;
}

export async function syncConversationToEntity(conversation) {
  try {
    // Check if conversation exists in entity
    const existing = await base44.entities.Conversation.filter({ 
      conversation_id: conversation.id 
    });
    
    if (existing.length > 0) {
      await base44.entities.Conversation.update(existing[0].id, {
        title: conversation.title || "Untitled Conversation",
        messages: conversation.messages || [],
        description: (conversation.messages?.[conversation.messages.length - 1]?.content || "").slice(0, 1000),
        updated_at: conversation.updated_at || new Date().toISOString(),
      });
    } else {
      await base44.entities.Conversation.create({
        conversation_id: conversation.id,
        title: conversation.title || "Untitled Conversation",
        messages: conversation.messages || [],
        description: (conversation.messages?.[0]?.content || "").slice(0, 1000),
        created_at: conversation.created_at || new Date().toISOString(),
        updated_at: conversation.updated_at || new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Failed to sync conversation:", error);
  }
}

// Auto-save with debounce to prevent excessive API calls
let saveTimeout = null;
export function autoSyncConversation(conversation) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    syncConversationToEntity(conversation);
  }, 1000); // Save 1 second after last message
}

export async function loadConversationsFromEntity() {
  try {
    const conversations = await base44.entities.Conversation.list("-updated_at", 50);
    return conversations.map(c => ({
      id: c.conversation_id,
      title: c.title,
      messages: c.messages || [],
      created_at: c.created_at,
      updated_at: c.updated_at,
      is_active: false,
    }));
  } catch {
    return [];
  }
}