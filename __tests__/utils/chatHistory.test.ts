import { CHAT_LIMIT, CHAT_TITLE_MAX, addToChat, chatTitle, readChats, saveChat, type ChatMessage } from '@/utils/chatHistory';

const q = (id: string, text = 'When do I apply fertilizer?'): ChatMessage => ({ id, role: 'user', text, time: '09:00 AM' });
const a = (id: string, text = 'About 10 days after transplanting.'): ChatMessage => ({ id, role: 'ai', text, time: '09:00 AM' });

describe('chatTitle', () => {
  it("is the farmer's first question, on one line", () => {
    expect(chatTitle([q('1', 'When do I\n  apply fertilizer?'), a('2')])).toBe('When do I apply fertilizer?');
  });

  it('is cut short when the question is long', () => {
    const title = chatTitle([q('1', 'x'.repeat(200))]);
    expect(title.length).toBe(CHAT_TITLE_MAX);
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('saveChat', () => {
  it('does not save a chat with no question yet', () => {
    expect(saveChat([], 'c1', [])).toEqual([]);
  });

  it('saves a new chat on top and updates it as the chat goes on', () => {
    let chats = saveChat([], 'c1', [q('1')], 100);
    chats = saveChat(chats, 'c2', [q('3', 'How much water?')], 200);
    expect(chats.map(c => c.id)).toEqual(['c2', 'c1']);
    chats = saveChat(chats, 'c1', [q('1'), a('2')], 300);
    expect(chats.map(c => c.id)).toEqual(['c1', 'c2']);
    expect(chats[0].messages).toHaveLength(2);
    expect(chats[0].updatedAt).toBe(300);
  });

  it('leaves the list alone when an old chat is only opened', () => {
    const chats = saveChat(saveChat([], 'c1', [q('1'), a('2')], 100), 'c2', [q('3')], 200);
    expect(saveChat(chats, 'c1', chats[1].messages, 999)).toBe(chats);
  });

  it('keeps only the newest chats', () => {
    let chats = saveChat([], 'c0', [q('0')]);
    for (let i = 1; i <= CHAT_LIMIT + 2; i++) chats = saveChat(chats, `c${i}`, [q(String(i))]);
    expect(chats).toHaveLength(CHAT_LIMIT);
    expect(chats[0].id).toBe(`c${CHAT_LIMIT + 2}`);
    expect(chats.some(c => c.id === 'c0')).toBe(false);
  });
});

describe('addToChat', () => {
  it('puts a late answer in the chat that asked, not the one on screen', () => {
    const chats = saveChat(saveChat([], 'c1', [q('1')], 100), 'c2', [q('3')], 200);
    const next = addToChat(chats, 'c1', a('2'), 300);
    expect(next.find(c => c.id === 'c1')?.messages.map(m => m.id)).toEqual(['1', '2']);
    expect(next.find(c => c.id === 'c2')?.messages).toHaveLength(1);
  });

  it('does nothing for a chat that is not saved', () => {
    expect(addToChat([], 'gone', a('2'))).toEqual([]);
  });
});

describe('readChats', () => {
  it('reads saved chats and skips anything that is not one', () => {
    const good = { id: 'c1', title: 'Hi', updatedAt: 5, messages: [q('1')] };
    expect(readChats([good, null, { id: 'c2', messages: [] }, 'junk'])).toEqual([good]);
    expect(readChats(null)).toEqual([]);
    expect(readChats({})).toEqual([]);
  });
});
