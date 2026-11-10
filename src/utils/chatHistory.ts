/**
 * GeoRice AI chats the farmer can open again. They are kept on the phone only (never sent
 * to the server as a history), and cleared on logout like the rest of the farmer's data.
 * Pure, so it can be tested without a phone.
 */
export interface ChatMessage {
  id:       string;
  role:     'user' | 'ai';
  text:     string;
  time:     string;
  sources?: any[];
}

export interface SavedChat {
  id:        string;
  title:     string;
  updatedAt: number;
  messages:  ChatMessage[];
}

/** A new chat's id. */
export const newChatId = () => `c_${Date.now()}`;

// The newest chats are kept; an older one drops off the end of the list
export const CHAT_LIMIT = 20;
export const CHAT_TITLE_MAX = 60;

/** A chat's name in the list: the farmer's first question, on one line. */
export function chatTitle(messages: ChatMessage[]): string {
  const first = messages.find(m => m.role === 'user')?.text ?? '';
  const line = first.replace(/\s+/g, ' ').trim();
  return line.length > CHAT_TITLE_MAX ? `${line.slice(0, CHAT_TITLE_MAX - 1).trimEnd()}…` : line;
}

/**
 * The list with this chat saved on top. A chat with no question yet is not saved, and a
 * chat that has not changed keeps its place (opening an old chat does not move it up).
 */
export function saveChat(chats: SavedChat[], id: string, messages: ChatMessage[], now = Date.now()): SavedChat[] {
  if (!messages.some(m => m.role === 'user')) return chats;
  const old = chats.find(c => c.id === id);
  if (old && old.messages.length === messages.length
      && old.messages[old.messages.length - 1]?.id === messages[messages.length - 1]?.id) {
    return chats;
  }
  const chat: SavedChat = { id, title: chatTitle(messages), updatedAt: now, messages };
  return [chat, ...chats.filter(c => c.id !== id)].slice(0, CHAT_LIMIT);
}

/** Adds a message to a saved chat that is not on the screen (its answer came after the farmer left it). */
export function addToChat(chats: SavedChat[], id: string, message: ChatMessage, now = Date.now()): SavedChat[] {
  const old = chats.find(c => c.id === id);
  return old ? saveChat(chats, id, [...old.messages, message], now) : chats;
}

/** What was read from the phone, with anything that is not a chat left out. */
export function readChats(stored: unknown): SavedChat[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages) && c.messages.length > 0)
    .map(c => ({ id: c.id, title: String(c.title ?? ''), updatedAt: Number(c.updatedAt) || 0, messages: c.messages }))
    .slice(0, CHAT_LIMIT);
}
