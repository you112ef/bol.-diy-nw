import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // For extended matchers like .toBeVisible()
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatHistory from './ChatHistory';
import type { IChatHistoryEntry } from '~/lib/persistence/db';
import * as useChatHistoryModule from '~/lib/persistence/useChatHistory';

// Mock the useChatHistory hook
const mockLoadChatHistory = vi.fn();
vi.mock('~/lib/persistence/useChatHistory', () => ({
  useChatHistory: () => ({
    loadChatHistory: mockLoadChatHistory,
    // Add other functions/properties returned by the hook if ChatHistory uses them
  }),
}));

// Mock webcontainer as it might be indirectly pulled in by other UI components if not careful
// Although ChatHistory itself is simple, this is a defensive measure.
vi.mock('~/lib/webcontainer/index', () => ({
  webcontainer: Promise.resolve({
    fs: { readFile: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn(), rm: vi.fn() },
    on: vi.fn(() => () => {}),
    spawn: vi.fn(),
  }),
  webcontainerContext: { loaded: false, fs: {} },
}));


describe('ChatHistory Component', () => {
  const mockOnClose = vi.fn();
  const initialProps = {
    chatId: 'chat123',
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test
  });

  it('should render nothing if isOpen is false', () => {
    render(<ChatHistory {...initialProps} isOpen={false} />);
    expect(screen.queryByText('Interaction History')).not.toBeInTheDocument();
  });

  it('should display loading state initially', async () => {
    mockLoadChatHistory.mockReturnValue(new Promise(() => {})); // Promise that never resolves for loading state
    render(<ChatHistory {...initialProps} />);
    expect(screen.getByText('Loading history...')).toBeInTheDocument();
  });

  it('should display "No history available" if no entries are returned', async () => {
    mockLoadChatHistory.mockResolvedValue([]);
    render(<ChatHistory {...initialProps} />);
    await waitFor(() => {
      expect(screen.getByText('No history available for this chat.')).toBeInTheDocument();
    });
  });

  it('should display "No chat selected" if chatId is undefined', async () => {
    mockLoadChatHistory.mockResolvedValue([]); // Should not be called if no chatId
    render(<ChatHistory {...initialProps} chatId={undefined} />);
    await waitFor(() => {
      expect(screen.getByText('No chat selected.')).toBeInTheDocument();
    });
    expect(mockLoadChatHistory).not.toHaveBeenCalled();
  });

  it('should render history entries correctly', async () => {
    const entries: IChatHistoryEntry[] = [
      { prompt: 'Prompt 1', result: 'Result 1', model: 'Model A' },
      { prompt: 'Prompt 2', result: 'Result 2', model: 'Model B' },
    ];
    mockLoadChatHistory.mockResolvedValue(entries);
    render(<ChatHistory {...initialProps} />);

    await waitFor(() => {
      expect(screen.getByText('Prompt 1')).toBeInTheDocument();
      expect(screen.getByText('Result 1')).toBeInTheDocument();
      expect(screen.getByText('Model A')).toBeInTheDocument();
      expect(screen.getByText('Prompt 2')).toBeInTheDocument();
      expect(screen.getByText('Result 2')).toBeInTheDocument();
      expect(screen.getByText('Model B')).toBeInTheDocument();
    });
  });

  it('should call onClose when the close button is clicked', async () => {
    mockLoadChatHistory.mockResolvedValue([]);
    render(<ChatHistory {...initialProps} />);
    await waitFor(() => screen.getByLabelText('Close history')); // Ensure panel is rendered

    fireEvent.click(screen.getByLabelText('Close history'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should fetch history when component becomes visible (isOpen changes to true)', async () => {
    mockLoadChatHistory.mockResolvedValue([]);
    const { rerender } = render(<ChatHistory {...initialProps} isOpen={false} />);
    expect(mockLoadChatHistory).not.toHaveBeenCalled();

    rerender(<ChatHistory {...initialProps} isOpen={true} />);
    await waitFor(() => {
      expect(mockLoadChatHistory).toHaveBeenCalledWith('chat123');
    });
  });

  it('should re-fetch history when chatId changes and component is open', async () => {
    mockLoadChatHistory.mockResolvedValue([]);
    const { rerender } = render(<ChatHistory {...initialProps} chatId="chat1" />);
    await waitFor(() => expect(mockLoadChatHistory).toHaveBeenCalledWith('chat1'));

    mockLoadChatHistory.mockClear(); // Clear previous calls

    rerender(<ChatHistory {...initialProps} chatId="chat2" />);
    await waitFor(() => {
      expect(mockLoadChatHistory).toHaveBeenCalledWith('chat2');
    });
  });

  it('should display error message if fetching history fails', async () => {
    mockLoadChatHistory.mockRejectedValue(new Error('Failed to fetch'));
    render(<ChatHistory {...initialProps} />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load history.')).toBeInTheDocument();
    });
  });

  it('should clear history entries when panel is closed', async () => {
    const entries: IChatHistoryEntry[] = [{ prompt: 'P1', result: 'R1', model: 'M1' }];
    mockLoadChatHistory.mockResolvedValue(entries);
    const { rerender } = render(<ChatHistory {...initialProps} isOpen={true} />);

    await waitFor(() => expect(screen.getByText('P1')).toBeInTheDocument());

    mockLoadChatHistory.mockClear();
    act(() => {
      rerender(<ChatHistory {...initialProps} isOpen={false} />);
    });

    // When re-opened, it should fetch again, not show stale data then load.
    // For this test, just confirm it's not showing P1 when closed.
    // (The component returns null when isOpen is false, so queryByText is appropriate)
    expect(screen.queryByText('P1')).not.toBeInTheDocument();

    // Optional: check if it fetches again on re-open
    rerender(<ChatHistory {...initialProps} isOpen={true} />);
    await waitFor(() => expect(mockLoadChatHistory).toHaveBeenCalledWith('chat123'));
  });

});
