import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Search, Send, MessageSquare, Loader2, Circle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  searchUsers,
} from '../lib/api';

export const ChatPage = () => {
  const { user } = useUser();
  const { socket, onlineUsers } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const res = await getMessages(conversationId);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    loadMessages(conv._id);
    setSearchQuery('');
    setSearchResults([]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (activeConversation && (msg.conversationId === activeConversation._id || msg.conversation === activeConversation._id)) {
        setMessages((prev) => [...prev, msg]);
      }
      fetchConversations();
    };

    const handleTyping = ({ conversationId }) => {
      if (activeConversation && conversationId === activeConversation._id) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ conversationId }) => {
      if (activeConversation && conversationId === activeConversation._id) {
        setIsTyping(false);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, activeConversation, fetchConversations]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchUsers(searchQuery);
        setSearchResults(res.data.data || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartConversation = async (targetUserId) => {
    try {
      const res = await createConversation(targetUserId);
      const newConv = res.data.data;
      await fetchConversations();
      handleSelectConversation(newConv);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConversation) return;

    const content = newMessageText.trim();
    setNewMessageText('');

    if (socket && activeConversation) {
      socket.emit('stopTyping', { conversationId: activeConversation._id });
    }

    try {
      const res = await sendMessage(activeConversation._id, content);
      setMessages((prev) => [...prev, res.data.data]);
      fetchConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleInputChange = (e) => {
    setNewMessageText(e.target.value);

    if (!socket || !activeConversation) return;

    socket.emit('typing', { conversationId: activeConversation._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { conversationId: activeConversation._id });
    }, 2000);
  };

  const getOtherParticipant = (conv) => {
    if (!conv?.participants) return null;
    return conv.participants.find((p) => p.clerkId !== user?.id) || conv.participants[0];
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">
              T
            </div>
            <span className="font-semibold text-lg text-white">Talkora</span>
          </div>
          <UserButton />
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Conversation / Search Results List */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.trim() ? (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                Search Results
              </div>
              {isSearching ? (
                <div className="p-4 text-center text-slate-400 text-sm">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">No users found</div>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => handleStartConversation(u._id)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-800/60 transition text-left"
                  >
                    <img
                      src={u.imageUrl || 'https://via.placeholder.com/40'}
                      alt={u.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{u.fullName || u.username}</p>
                      <p className="text-xs text-slate-400">@{u.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                Chats
              </div>
              {loadingConversations ? (
                <div className="p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" /> Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">No chats yet</div>
              ) : (
                conversations.map((conv) => {
                  const partner = getOtherParticipant(conv);
                  const isOnline = partner && onlineUsers.includes(partner.clerkId || partner._id);
                  const isActive = activeConversation?._id === conv._id;

                  return (
                    <button
                      key={conv._id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full p-3 flex items-center gap-3 border-b border-slate-800/40 transition text-left ${
                        isActive ? 'bg-indigo-900/30 border-l-4 border-l-indigo-500' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={partner?.imageUrl || 'https://via.placeholder.com/40'}
                          alt={partner?.username || 'User'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {isOnline && (
                          <Circle className="w-3 h-3 text-green-500 fill-green-500 absolute bottom-0 right-0 border-2 border-slate-900 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {partner?.fullName || partner?.username || 'Chat'}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {conv.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat View */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {activeConversation ? (
          <>
            {/* Header */}
            {(() => {
              const partner = getOtherParticipant(activeConversation);
              const isOnline = partner && onlineUsers.includes(partner.clerkId || partner._id);

              return (
                <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={partner?.imageUrl || 'https://via.placeholder.com/40'}
                      alt={partner?.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="text-sm font-semibold text-white">
                        {partner?.fullName || partner?.username}
                      </h2>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        {isOnline ? (
                          <span className="text-green-400">Online</span>
                        ) : (
                          <span className="text-slate-500">Offline</span>
                        )}
                        {isTyping && <span className="text-indigo-400 italic font-medium">â€” typing...</span>}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  Say hello to start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender?.clerkId === user?.id || msg.sender === user?.id;

                  return (
                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl text-sm ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span className="text-[10px] opacity-70 block text-right mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-lg transition flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <MessageSquare className="h-12 w-12 mb-3 text-slate-600" />
            <p className="text-lg font-medium text-slate-300">Welcome to Talkora</p>
            <p className="text-sm max-w-sm mt-1">Select a conversation from the sidebar or search for users to start chatting in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
};