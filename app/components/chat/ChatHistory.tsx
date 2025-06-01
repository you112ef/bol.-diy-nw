import React, { useEffect, useState } from 'react';
import { useChatHistory } from '~/lib/persistence/useChatHistory';
import type { IChatHistoryEntry } from '~/lib/persistence/db';

interface ChatHistoryProps {
  chatId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ chatId, isOpen, onClose }) => {
  const { loadChatHistory } = useChatHistory();
  const [historyEntries, setHistoryEntries] = useState<IChatHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && chatId) {
      setIsLoading(true);
      setError(null);
      loadChatHistory(chatId)
        .then((entries) => {
          setHistoryEntries(entries);
        })
        .catch((err) => {
          console.error('Failed to load chat history:', err);
          setError('Failed to load history.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!isOpen) {
      // Clear history when panel is closed or no chatId
      setHistoryEntries([]);
      setError(null);
    }
  }, [isOpen, chatId, loadChatHistory]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="chat-history-panel" style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>Interaction History</h3>
        <button onClick={onClose} style={styles.closeButton} aria-label="Close history">
          &times;
        </button>
      </div>
      <div style={styles.content}>
        {isLoading && <p>Loading history...</p>}
        {error && <p style={styles.errorText}>{error}</p>}
        {!isLoading && !error && historyEntries.length === 0 && chatId && (
          <p>No history available for this chat.</p>
        )}
        {!isLoading && !error && !chatId && (
          <p>No chat selected.</p>
        )}
        {!isLoading && !error && historyEntries.length > 0 && (
          <ul>
            {historyEntries.map((entry, index) => (
              <li key={index} className="history-entry" style={styles.entry}>
                <div className="history-prompt">
                  <strong style={styles.label}>Prompt:</strong>
                  <p style={styles.text}>{entry.prompt}</p>
                </div>
                <div className="history-result">
                  <strong style={styles.label}>Result:</strong>
                  <p style={styles.text}>{entry.result}</p>
                </div>
                <div className="history-model">
                  <strong style={styles.label}>Model:</strong>
                  <span style={styles.modelName}>{entry.model}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Basic inline styles for better initial visibility.
// These should ideally be moved to a CSS file or a styling solution.
const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    position: 'fixed',
    top: '50px', // Adjust as needed
    right: '20px',
    width: '350px',
    maxHeight: 'calc(100vh - 70px)', // Adjust as needed
    backgroundColor: '#f9f9f9',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    borderBottom: '1px solid #eee',
  },
  title: {
    margin: 0,
    fontSize: '1.1em',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5em',
    cursor: 'pointer',
    padding: '0 5px',
  },
  content: {
    padding: '15px',
    overflowY: 'auto',
    flexGrow: 1,
  },
  entry: {
    marginBottom: '20px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    listStyleType: 'none',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    color: '#333',
    fontSize: '0.9em',
  },
  text: {
    margin: '0 0 10px 0',
    whiteSpace: 'pre-wrap', // Preserve whitespace and newlines
    wordWrap: 'break-word',
  },
  modelName: {
    fontFamily: 'monospace',
    fontSize: '0.9em',
    color: '#555',
  },
  errorText: {
    color: 'red',
  },
};

export default ChatHistory;
