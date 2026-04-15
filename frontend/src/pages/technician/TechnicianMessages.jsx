import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { fetchMessages } from '../../api/api';
import { FiSend, FiRefreshCw, FiWifiOff, FiWifi } from 'react-icons/fi';

export default function TechnicianMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const ws = useRef(null);
  const reconnectAttempt = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize WebSocket connection
  useEffect(() => {
    loadInitialMessages();
    connectWebSocket();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Load initial messages via REST API
  const loadInitialMessages = async () => {
    setLoading(true);
    try {
      const data = await fetchMessages('technician', user?.username);
      setMessages(data);
      setError('');
    } catch (loadError) {
      setMessages([]);
      setError(loadError.message || 'Unable to load messages.');
    } finally {
      setLoading(false);
    }
  };

  // Connect to WebSocket server
  const connectWebSocket = () => {
    if (reconnectAttempt.current >= maxReconnectAttempts) {
      setError('Failed to establish real-time connection after multiple attempts');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/messages/`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError('');
        reconnectAttempt.current = 0; // Reset reconnect counter
        setStatusMessage('✅ Connected to real-time messaging');
        setTimeout(() => setStatusMessage(''), 3000);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setError('Connection error occurred');
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after a delay
        if (reconnectAttempt.current < maxReconnectAttempts) {
          reconnectAttempt.current += 1;
          setTimeout(() => connectWebSocket(), 3000 * reconnectAttempt.current);
        }
      };
    } catch (e) {
      console.error('Error creating WebSocket:', e);
      setError('Failed to connect to messaging service');
    }
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data) => {
    if (data.type === 'message') {
      // Add new message from WebSocket
      const newMsg = data.data;
      setMessages((prev) => {
        // Check if message already exists (avoid duplicates)
        if (!prev.find((m) => m.id === newMsg.id)) {
          return [...prev, newMsg];
        }
        return prev;
      });
    } else if (data.type === 'typing') {
      // Handle typing indicator
      const typingData = data.data;
      if (typingData.sender_id !== user?.id) {
        setTypingUsers((prev) => new Set([...prev, typingData.sender_id]));
        
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => {
            const updated = new Set(prev);
            updated.delete(typingData.sender_id);
            return updated;
          });
        }, 3000);
      }
    } else if (data.type === 'error') {
      setError(data.message);
    }
  };

  // Send message via WebSocket
  const handleSend = async () => {
    if (!newMessage.trim()) {
      return;
    }

    const replyTarget = getReplyTarget();
    if (!replyTarget?.receiverId || !replyTarget?.ticketId) {
      setError('A linked supervisor conversation is required before you can reply here.');
      return;
    }

    if (!isConnected || !ws.current) {
      setError('Not connected to messaging service. Please wait...');
      return;
    }

    try {
      setSending(true);
      
      // Send message via WebSocket
      ws.current.send(JSON.stringify({
        type: 'send_message',
        ticket_id: replyTarget.ticketId,
        receiver_id: replyTarget.receiverId,
        message_text: newMessage,
      }));

      setNewMessage('');
      setError('');
      setStatusMessage(`Message sent to ${replyTarget.name}.`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (sendError) {
      setError(sendError.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  // Send typing indicator
  const handleTyping = () => {
    const replyTarget = getReplyTarget();
    if (isConnected && ws.current && replyTarget?.receiverId) {
      ws.current.send(JSON.stringify({
        type: 'typing',
        receiver_id: replyTarget.receiverId,
        ticket_id: replyTarget.ticketId,
      }));
    }
  };

  // Get reply target from latest message
  const getReplyTarget = () => {
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const latestMessage = sortedMessages[sortedMessages.length - 1];
    if (!latestMessage) return null;

    return {
      receiverId:
        latestMessage.senderId === user?.id ? latestMessage.receiverId : latestMessage.senderId,
      name:
        latestMessage.senderId === user?.id ? latestMessage.receiverName : latestMessage.senderName,
      ticketId: latestMessage.ticketId,
      ticketAddress: latestMessage.ticketAddress,
    };
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">Messages ({messages.length})</h2>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {isConnected ? (
              <>
                <FiWifi size={12} />
                Live
              </>
            ) : (
              <>
                <FiWifiOff size={12} />
                Offline
              </>
            )}
          </div>
          <button
            onClick={loadInitialMessages}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-50 rounded-lg hover:bg-slate-100"
          >
            <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {statusMessage}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 font-medium">
        {getReplyTarget() ? (
          <>
            💬 Chatting with <span className="font-semibold text-blue-950">{getReplyTarget().name}</span> • Ticket #{getReplyTarget().ticketId}
          </>
        ) : (
          '📌 Replies available once a ticket conversation is linked'
        )}
      </div>

      <div className="flex flex-col h-[65vh] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2 bg-gradient-to-b from-slate-50 to-white">
          {(() => {
            const sortedMessages = [...messages].sort(
              (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
            );
            
            return (
              <>
                {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block p-3 rounded-full bg-slate-100 mb-3">
                  <FiRefreshCw className="animate-spin text-slate-500" size={24} />
                </div>
                <p className="text-slate-500 font-medium">Loading messages...</p>
              </div>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                  <span className="text-3xl">💬</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">No messages yet</h3>
                <p className="text-sm text-slate-500">Start a conversation with your supervisor</p>
              </div>
            </div>
          ) : (
            sortedMessages.map((message, index) => {
              const sentByCurrentUser = message.senderId === user?.id;
              const previousMessage = index > 0 ? sortedMessages[index - 1] : null;
              const showTimestamp = !previousMessage || 
                (new Date(message.timestamp) - new Date(previousMessage.timestamp)) > 5 * 60 * 1000; // 5+ min gap
              
              const messageTime = new Date(message.timestamp);
              const timeString = messageTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
              });

              return (
                <div key={message.id}>
                  {showTimestamp && (
                    <div className="flex items-center justify-center my-4">
                      <div className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                        {messageTime.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })} • {timeString}
                      </div>
                    </div>
                  )}
                  <div className={`flex gap-2 mb-3 ${sentByCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    {!sentByCurrentUser && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                        {message.senderName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className={`flex flex-col ${sentByCurrentUser ? 'items-end' : 'items-start'} max-w-xs`}>
                      {!sentByCurrentUser && (
                        <span className="text-xs font-semibold text-slate-600 mb-1 ml-3">{message.senderName}</span>
                      )}
                      <div className={`relative ${sentByCurrentUser ? 'mr-0' : 'ml-0'}`}>
                        <div
                          className={`px-4 py-2.5 rounded-3xl shadow-sm transition-all hover:shadow-md ${
                            sentByCurrentUser
                              ? 'bg-blue-500 text-white rounded-tr-none'
                              : 'bg-slate-200 text-slate-900 rounded-tl-none'
                          }`}
                        >
                          <p className="text-sm leading-relaxed break-words">{message.text}</p>
                        </div>
                        {/* Bubble Tail */}
                        <div
                          className={`absolute top-0 w-0 h-0 ${
                            sentByCurrentUser
                              ? 'right-0 mr-[-8px]'
                              : 'left-0 ml-[-8px]'
                          }`}
                          style={{
                            borderStyle: 'solid',
                            borderWidth: sentByCurrentUser ? '0 0 8px 8px' : '0 8px 8px 0',
                            borderColor: sentByCurrentUser 
                              ? 'transparent transparent rgb(59, 130, 246) transparent'
                              : 'transparent rgb(203, 213, 225) transparent transparent',
                          }}
                        />
                      </div>
                      <span className={`text-xs text-slate-400 mt-1 ${sentByCurrentUser ? 'mr-3' : 'ml-3'}`}>
                        {timeString}
                      </span>
                    </div>
                    {sentByCurrentUser && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                        U
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <div className="flex gap-2 mb-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center">
                <span className="text-xs">...</span>
              </div>
              <div className="text-xs text-slate-500 italic">Someone is typing...</div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
              </>
            );
          })()}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(event) => {
                  setNewMessage(event.target.value);
                  handleTyping();
                }}
                placeholder="Type a message..."
                rows={1}
                disabled={!isConnected}
                className="w-full resize-none rounded-full border border-slate-300 px-5 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 p-3 text-white transition-all hover:shadow-lg disabled:cursor-not-allowed shadow-md"
            >
              <FiSend size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </Layout>
  );
}
