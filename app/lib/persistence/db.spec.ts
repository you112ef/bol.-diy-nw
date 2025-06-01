import 'fake-indexeddb/auto'; // Must be imported first
import { openDatabase, setChatHistoryEntries, getChatHistory, deleteById, setMessages, IChatHistoryEntry, IChatMetadata } from './db'; // Adjust path as necessary

// Helper to initialize and open the database
async function getDb() {
  const db = await openDatabase();
  if (!db) {
    throw new Error('Failed to open database');
  }
  return db;
}

describe('IndexedDB Chat History Functions', () => {
  let db: IDBDatabase;

  beforeEach(async () => {
    // Ensures a fresh DB for each test by clearing previous ones.
    // fake-indexeddb automatically clears between tests if jest.resetModules() or similar is used,
    // but explicit open/close and clear can be more robust.
    indexedDB.deleteDatabase('boltHistory'); // Ensure clean slate
    db = await getDb();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    // Consider indexedDB.deleteDatabase('boltHistory') here again if tests interfere.
  });

  describe('setChatHistoryEntries and getChatHistory', () => {
    it('should return an empty array for a chatId with no history', async () => {
      const history = await getChatHistory(db, 'chat1');
      expect(history).toEqual([]);
    });

    it('should save and retrieve chat history entries', async () => {
      const chatId = 'chat2';
      const entries: IChatHistoryEntry[] = [
        { prompt: 'Hello', result: 'Hi there!', model: 'model-1' },
        { prompt: 'How are you?', result: 'Fine, thanks!', model: 'model-1' },
      ];

      await setChatHistoryEntries(db, chatId, entries);
      const retrievedHistory = await getChatHistory(db, chatId);
      expect(retrievedHistory).toEqual(entries);
    });

    it('should overwrite existing history when saving new entries for the same chatId', async () => {
      const chatId = 'chat3';
      const initialEntries: IChatHistoryEntry[] = [
        { prompt: 'Initial prompt', result: 'Initial result', model: 'model-init' },
      ];
      await setChatHistoryEntries(db, chatId, initialEntries);

      const newEntries: IChatHistoryEntry[] = [
        { prompt: 'New prompt', result: 'New result', model: 'model-new' },
      ];
      await setChatHistoryEntries(db, chatId, newEntries);

      const retrievedHistory = await getChatHistory(db, chatId);
      expect(retrievedHistory).toEqual(newEntries);
    });

     it('should retrieve history correctly after multiple saves to different chatIds', async () => {
      const chatId1 = 'chatMulti1';
      const entries1: IChatHistoryEntry[] = [{ prompt: 'p1', result: 'r1', model: 'm1'}];
      await setChatHistoryEntries(db, chatId1, entries1);

      const chatId2 = 'chatMulti2';
      const entries2: IChatHistoryEntry[] = [{ prompt: 'p2', result: 'r2', model: 'm2'}];
      await setChatHistoryEntries(db, chatId2, entries2);

      const retrievedHistory1 = await getChatHistory(db, chatId1);
      expect(retrievedHistory1).toEqual(entries1);

      const retrievedHistory2 = await getChatHistory(db, chatId2);
      expect(retrievedHistory2).toEqual(entries2);
    });
  });

  describe('deleteById', () => {
    it('should delete chat messages, snapshots (if any), and chat history', async () => {
      const chatId = 'chatToDelete';
      const messages = [{ id: 'msg1', role: 'user', content: 'Hello' }];
      const historyEntries: IChatHistoryEntry[] = [
        { prompt: 'Hello', result: 'Hi', model: 'test-model' },
      ];
      const metadata: IChatMetadata = { gitUrl: "test" };

      // Populate chats and chatHistory stores
      // Note: setMessages also creates a chat entry. We don't have setSnapshot in this test directly.
      // We need to ensure `chats` store is also populated for deleteById to proceed.
      await setMessages(db, chatId, messages, chatId + '_url', 'Test Chat', new Date().toISOString(), metadata);
      await setChatHistoryEntries(db, chatId, historyEntries);

      // Verify data exists before deletion
      const chatBeforeDelete = await new Promise((resolve, reject) => {
        const tx = db.transaction('chats', 'readonly');
        const req = tx.objectStore('chats').get(chatId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      expect(chatBeforeDelete).toBeDefined();

      const historyBeforeDelete = await getChatHistory(db, chatId);
      expect(historyBeforeDelete.length).toBeGreaterThan(0);

      // Perform deletion
      await deleteById(db, chatId);

      // Verify chat entry is deleted
       const chatAfterDelete = await new Promise((resolve, reject) => {
        const tx = db.transaction('chats', 'readonly');
        const req = tx.objectStore('chats').get(chatId);
        req.onsuccess = () => resolve(req.result); // Should be undefined
        req.onerror = () => reject(req.error);
      });
      expect(chatAfterDelete).toBeUndefined();

      // Verify history is deleted
      const retrievedHistory = await getChatHistory(db, chatId);
      expect(retrievedHistory).toEqual([]);
    });

    it('should not fail if deleting a non-existent chat or history', async () => {
      await expect(deleteById(db, 'nonExistentChat')).resolves.not.toThrow();
    });
  });
});
