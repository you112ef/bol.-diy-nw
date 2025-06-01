import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatHistory, chatId as globalChatIdStore } from './useChatHistory';
import type { IChatHistoryEntry } from './db';
import { logStore } from '~/lib/stores/logs';

// Mock webcontainer first
vi.mock('~/lib/webcontainer/index', () => ({
  webcontainer: Promise.resolve({
    fs: {
      readFile: vi.fn().mockResolvedValue(''),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      rm: vi.fn().mockResolvedValue(undefined),
    },
    on: vi.fn((event, callback) => { if (event === 'server-ready') { /* callback(1234, 'http://localhost:1234'); */ } return () => {}; }),
    spawn: vi.fn(),
  }),
  webcontainerContext: {
    loaded: false,
    fs: {},
  },
}));

// Mock the entire db module.
vi.mock('./db', () => {
  const mockDbInstance = {
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
        getAllKeys: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(undefined),
        openCursor: vi.fn(() => ({ onsuccess: () => {}, onerror: () => {} })),
        index: vi.fn(() => ({ get: vi.fn().mockResolvedValue(undefined) })),
      })),
      oncomplete: vi.fn(),
      onerror: vi.fn(),
      onabort: vi.fn(),
    })),
    close: vi.fn(),
  };

  return {
    openDatabase: vi.fn(() => Promise.resolve(mockDbInstance as unknown as IDBDatabase)),
    getAll: vi.fn(),
    setMessages: vi.fn(),
    getMessages: vi.fn(),
    getMessagesByUrlId: vi.fn(),
    getMessagesById: vi.fn(),
    deleteById: vi.fn(),
    getNextId: vi.fn(),
    getUrlId: vi.fn(),
    forkChat: vi.fn(),
    duplicateChat: vi.fn(),
    createChatFromMessages: vi.fn(),
    updateChatDescription: vi.fn(),
    updateChatMetadata: vi.fn(),
    getSnapshot: vi.fn(),
    setSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
    getChatHistory: vi.fn(),
    setChatHistoryEntries: vi.fn(),
  };
});

import {
  getChatHistory as mockedGetChatHistory,
  setChatHistoryEntries as mockedSetChatHistoryEntries,
  setMessages as mockedSetMessages,
  setSnapshot as mockedSetSnapshot,
  getNextId as mockedGetNextId,
  getUrlId as mockedGetUrlId,
  getMessages as mockedGetMessages,
  getSnapshot as mockedGetSnapshot,
  openDatabase as mockedOpenDatabase
} from './db';


vi.mock('nanostores', () => ({
  atom: vi.fn((initialValue) => {
    let value = initialValue;
    const listeners: Function[] = [];
    return {
      get: () => value,
      set: (newValue: any) => { value = newValue; listeners.forEach(l => l(value)); },
      listen: (listener: Function) => { listeners.push(listener); return () => { const index = listeners.indexOf(listener); if (index > -1) listeners.splice(index, 1); }; },
      subscribe: (listener: Function) => { listeners.push(listener); listener(value); return () => { const index = listeners.indexOf(listener); if (index > -1) listeners.splice(index, 1); }; }
    };
  }),
}));

vi.mock('~/lib/stores/workbench', () => ({
  workbenchStore: {
    files: { get: vi.fn().mockReturnValue({}) },
    firstArtifact: null,
    setReloadedMessages: vi.fn(),
    alert: { get: vi.fn(), set: vi.fn() },
    deployAlert: { get: vi.fn(), set: vi.fn() },
    supabaseAlert: { get: vi.fn(), set: vi.fn() },
  },
}));

vi.mock('~/lib/stores/logs', () => ({
  logStore: { logError: vi.fn(), logProvider: vi.fn() }
}));

vi.mock('@remix-run/react', async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>;
  return { ...original, useLoaderData: vi.fn().mockReturnValue({ id: undefined }), useNavigate: vi.fn(() => () => {}), useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]), };
});


describe('useChatHistory Hook', () => {
  beforeEach(async () => {
    vi.mocked(mockedGetChatHistory).mockReset();
    vi.mocked(mockedSetChatHistoryEntries).mockReset();
    vi.mocked(mockedSetMessages).mockReset();
    vi.mocked(mockedSetSnapshot).mockReset();
    vi.mocked(mockedGetNextId).mockReset();
    vi.mocked(mockedGetUrlId).mockReset();
    vi.mocked(mockedGetMessages).mockReset();
    vi.mocked(mockedGetSnapshot).mockReset();
    vi.mocked(mockedOpenDatabase).mockReset();
    vi.mocked(logStore.logError).mockReset();

    const dbInstanceFromFactory = {
        transaction: vi.fn(() => ({ objectStore: vi.fn(() => ({ get: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), getAll: vi.fn().mockResolvedValue([]), delete: vi.fn().mockResolvedValue(undefined), index: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(undefined)}), getAllKeys: vi.fn().mockResolvedValue([]) })) })),
        close: vi.fn(),
      };
    vi.mocked(mockedOpenDatabase).mockResolvedValue(dbInstanceFromFactory as unknown as IDBDatabase);
    vi.mocked(mockedGetMessages).mockResolvedValue(null);
    vi.mocked(mockedGetSnapshot).mockResolvedValue(null);
    vi.mocked(mockedGetNextId).mockResolvedValue("1");
    vi.mocked(mockedGetUrlId).mockResolvedValue("1_url");
    vi.mocked(mockedGetChatHistory).mockResolvedValue([]);
    vi.mocked(mockedSetChatHistoryEntries).mockResolvedValue(undefined);
    vi.mocked(mockedSetMessages).mockResolvedValue(undefined);
    vi.mocked(mockedSetSnapshot).mockResolvedValue(undefined);

    act(() => { globalChatIdStore.set(undefined); });
  });


  describe('loadChatHistory function', () => {
    it('should call getChatHistory from db with the correct chatId and return its result', async () => {
      const testChatId = 'chat123';
      const expectedHistory: IChatHistoryEntry[] = [ { prompt: 'p1', result: 'r1', model: 'm1' }, ];
      vi.mocked(mockedGetChatHistory).mockResolvedValue(expectedHistory);

      const { result } = renderHook(() => useChatHistory());
      await act(async () => { await Promise.resolve(); });

      let actualHistory: IChatHistoryEntry[] = [];
      await act(async () => { actualHistory = await result.current.loadChatHistory(testChatId); });

      expect(mockedGetChatHistory).toHaveBeenCalledWith(expect.objectContaining({ transaction: expect.any(Function) }), testChatId);
      expect(actualHistory).toEqual(expectedHistory);
    });

    it('should return an empty array and log error if getChatHistory fails', async () => {
      const testChatId = 'chat456';
      vi.mocked(mockedGetChatHistory).mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useChatHistory());
      await act(async () => { await Promise.resolve(); });
      let actualHistory: IChatHistoryEntry[] = [];
      await act(async () => { actualHistory = await result.current.loadChatHistory(testChatId); });

      expect(mockedGetChatHistory).toHaveBeenCalledWith(expect.objectContaining({ transaction: expect.any(Function) }), testChatId);
      expect(actualHistory).toEqual([]);
      expect(vi.mocked(logStore).logError).toHaveBeenCalled();
    });
  });

  describe('storeMessageHistory function (history saving logic)', () => {
    it('should process messages and call setChatHistoryEntries with correct parameters', async () => {
      const testChatId = 'chat789';
      act(() => { globalChatIdStore.set(testChatId); });

      const messagesToStore = [ { id: 'm1', role: 'user', content: 'User prompt 1' }, { id: 'm2', role: 'assistant', content: 'Assistant response 1' }, { id: 'm3', role: 'user', content: 'User prompt 2 (no reply yet)' }, ];
      const modelName = 'gpt-test';
      const expectedHistoryEntries: IChatHistoryEntry[] = [ { prompt: 'User prompt 1', result: 'Assistant response 1', model: modelName }, ];

      const { result } = renderHook(() => useChatHistory());
      await act(async () => { await Promise.resolve(); });
      await act(async () => { await result.current.storeMessageHistory(messagesToStore, modelName); });

      expect(mockedSetMessages).toHaveBeenCalled();
      expect(mockedSetSnapshot).toHaveBeenCalled();
      expect(mockedSetChatHistoryEntries).toHaveBeenCalledWith( expect.objectContaining({ transaction: expect.any(Function) }), testChatId, expectedHistoryEntries );
    });

    it('should handle messages with no-store annotations correctly for history generation', async () => {
      const testChatId = 'chat-no-store';
      act(() => { globalChatIdStore.set(testChatId); });
      const modelName = 'model-filter';

      // u2 (user) and a3 (assistant) have 'no-store' annotations
      const messagesToStore = [
        { id: 'u1', role: 'user', content: 'User 1' },
        { id: 'a1', role: 'assistant', content: 'Assistant 1' },
        { id: 'u2', role: 'user', content: 'User 2 (no-store)', annotations: ['no-store'] },
        { id: 'a2', role: 'assistant', content: 'Assistant 2 (follows filtered user)' },
        { id: 'u3', role: 'user', content: 'User 3' },
        { id: 'a3', role: 'assistant', content: 'Assistant 3 (no-store annotation)' , annotations: ['no-store']},
      ];
      // Based on corrected understanding:
      // messages in storeMessageHistory becomes [u1, a1, a2, u3] after filtering u2 and a3.
      // History pairs: (u1,a1). u3 has no following assistant.
      const expectedHistoryEntries: IChatHistoryEntry[] = [
        { prompt: 'User 1', result: 'Assistant 1', model: modelName },
      ];

      const { result } = renderHook(() => useChatHistory());
      await act(async () => { await Promise.resolve(); });
      await act(async () => { await result.current.storeMessageHistory(messagesToStore, modelName); });

      expect(mockedSetChatHistoryEntries).toHaveBeenCalledWith( expect.objectContaining({ transaction: expect.any(Function) }), testChatId, expectedHistoryEntries );
    });

    it('should not call functions if db is unavailable to storeMessageHistory', async () => {
      vi.mocked(mockedOpenDatabase).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useChatHistory());
      await act(async () => { await Promise.resolve(); });

      await act(async () => {
        await result.current.storeMessageHistory([], 'test-model');
      });

      expect(mockedSetChatHistoryEntries).not.toHaveBeenCalled();
      expect(mockedSetMessages).not.toHaveBeenCalled();
      expect(mockedSetSnapshot).not.toHaveBeenCalled();
    });
  });
});
