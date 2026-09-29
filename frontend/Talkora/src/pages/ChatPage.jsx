git add -A
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import {
  Search,
  Send,
  MessageSquare,
  Loader2,
  Circle,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  searchUsers,
} from '../lib/api';

const API_PLACEHOLDER = 'https://via.placeholder.com/40';

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

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const getUserId = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
      return value;
    }

    return (
      value.clerkId ||
      value._id ||
      value.id ||
      value.userId?.clerkId ||
      value.userId?._id ||
      value.userId?.id ||
      null
    );
  };

  const getOtherParticipant = useCallback(
    (conversation) => {
      if (!conversation?.participants?.length) {
        return null;
      }

      const currentClerkId = user?.id;

      const other = conversation.participants.find((participant) => {
        const participantUser =
          participant?.userId && typeof participant.userId === 'object'
            ? participant.userId
            : participant;

        const participantClerkId =
          participant?.clerkId ||
          participantUser?.clerkId ||
          participantUser?.id;

        return String(participantClerkId) !== String(currentClerkId);
      });

      return other || conversation.participants[0];
    },
    [user?.id]
  );

  const getParticipantData = (participant) => {
    if (!participant) return null;

    if (participant.userId && typeof participant.userId === 'object') {
      return participant.userId;
    }

    return participant;
  };

  const getMessageSenderId = (message) => {
    if (!message) return null;

    const sender = message.sender;

    if (!sender) return null;

    if (typeof sender === 'string') {
      return sender;
    }

    return (
      sender.clerkId ||
      sender._id ||
      sender.id ||
      sender.userId?.clerkId ||
      sender.userId?._id ||
      sender.userId?.id ||
      null
    );
  };

  const getMessageText = (message) => {
    if (!message) return '';

    return message.text || message.content || '';
  };

  const normalizeMessages = (response) => {
    const data = response?.data;

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    if (Array.isArray(data?.messages)) {
      return data.messages;
    }

    return [];
  };

  // --------------------------------------------------
  // Scroll
  // --------------------------------------------------

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // --------------------------------------------------
  // Conversations
  // --------------------------------------------------

  const fetchConversations = useCallback(async () => {
    try {
      const response = await getConversations();

      const data = response?.data;

      if (Array.isArray(data)) {
        setConversations(data);
      } else if (Array.isArray(data?.data)) {
        setConversations(data.data);
      } else if (Array.isArray(data?.conversations)) {
        setConversations(data.conversations);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // --------------------------------------------------
  // Load messages
  // --------------------------------------------------

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;

    setLoadingMessages(true);

    try {
      const response = await getMessages(conversationId);
      const loadedMessages = normalizeMessages(response);

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // --------------------------------------------------
  // Select conversation
  // --------------------------------------------------

  const handleSelectConversation = useCallback(
    async (conversation) => {
      if (!conversation?._id) return;

      setActiveConversation(conversation);
      setSearchQuery('');
      setSearchResults([]);
      setIsTyping(false);
      setMessages([]);

      // Join socket conversation room if supported by backend.
      if (socket) {
        socket.emit('conversation:join', {
          conversationId: conversation._id,
        });
      }

      await loadMessages(conversation._id);
    },
    [loadMessages, socket]
  );

  // --------------------------------------------------
  // User search
  // --------------------------------------------------

  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await searchUsers(query);

        if (Array.isArray(response?.data)) {
          setSearchResults(response.data);
        } else if (Array.isArray(response?.data?.data)) {
          setSearchResults(response.data.data);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --------------------------------------------------
  // Start conversation
  // --------------------------------------------------

  const handleStartConversation = async (targetUserId) => {
    if (!targetUserId) return;

    try {
      const response = await createConversation(targetUserId);

      const conversation =
        response?.data?.data ||
        response?.data?.conversation ||
        response?.data;

      await fetchConversations();

      if (conversation?._id) {
        await handleSelectConversation(conversation);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);

      const status = error?.response?.status;

      if (status === 401) {
        console.error('Authentication failed. Clerk token may be missing.');
      } else if (status === 404) {
        console.error('Target user or conversation endpoint was not found.');
      }
    }
  };

  // --------------------------------------------------
  // Socket events
  // --------------------------------------------------

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (!message) return;

      const messageConversationId =
        message.conversationId?._id ||
        message.conversationId ||
        message.conversation?._id ||
        message.conversation;

      if (
        activeConversation &&
        String(messageConversationId) === String(activeConversation._id)
      ) {
        setMessages((previousMessages) => {
          if (
            message._id &&
            previousMessages.some(
              (existingMessage) =>
                String(existingMessage._id) === String(message._id)
            )
          ) {
            return previousMessages;
          }

          return [...previousMessages, message];
        });

        scrollToBottom();
      }

      fetchConversations();
    };

    const handleTyping = (payload) => {
      if (!payload) return;

      const conversationId =
        payload.conversationId ||
        payload.conversation?._id ||
        payload.conversation;

      if (
        activeConversation &&
        String(conversationId) === String(activeConversation._id)
      ) {
        setIsTyping(
          Boolean(payload.isTyping ?? payload.typing ?? payload.value)
        );
      }
    };

    const handleMessageUpdated = (message) => {
      if (!message?._id) return;

      setMessages((previousMessages) =>
        previousMessages.map((existingMessage) =>
          String(existingMessage._id) === String(message._id)
            ? message
            : existingMessage
        )
      );

      fetchConversations();
    };

    const handleMessageDeleted = (message) => {
      if (!message) return;

      const deletedId =
        message._id ||
        message.messageId ||
        message.id ||
        message;

      setMessages((previousMessages) =>
        previousMessages.filter(
          (existingMessage) =>
            String(existingMessage._id) !== String(deletedId)
        )
      );

      fetchConversations();
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleMessageUpdated);
    socket.on('message:edit', handleMessageUpdated);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:delete', handleMessageDeleted);

    socket.on('typing:update', handleTyping);
    socket.on('typing:start', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleMessageUpdated);
      socket.off('message:edit', handleMessageUpdated);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:delete', handleMessageDeleted);

      socket.off('typing:update', handleTyping);
      socket.off('typing:start', handleTyping);
    };
  }, [
    socket,
    activeConversation,
    fetchConversations,
    scrollToBottom,
  ]);

  // --------------------------------------------------
  // Send message
  // --------------------------------------------------

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!activeConversation?._id) return;

    const text = newMessageText.trim();

    if (!text) return;

    setNewMessageText('');
    setIsTyping(false);

    if (socket) {
      socket.emit('typing:stop', {
        conversationId: activeConversation._id,
      });
    }

    try {
      const response = await sendMessage(
        activeConversation._id,
        text
      );

      const message =
        response?.data?.data ||
        response?.data?.message ||
        response?.data;

      if (message?._id) {
        setMessages((previousMessages) => {
          if (
            previousMessages.some(
              (existingMessage) =>
                String(existingMessage._id) === String(message._id)
            )
          ) {
            return previousMessages;
          }

          return [...previousMessages, message];
        });
      }

      await fetchConversations();
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);

      // Restore text if sending failed.
      setNewMessageText(text);
    }
  };

  // --------------------------------------------------
  // Typing
  // --------------------------------------------------

  const handleInputChange = (event) => {
    const value = event.target.value;

    setNewMessageText(value);

    if (!socket || !activeConversation?._id) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      socket.emit('typing:start', {
        conversationId: activeConversation._id,
      });
    } else {
      socket.emit('typing:stop', {
        conversationId: activeConversation._id,
      });

      return;
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', {
        conversationId: activeConversation._id,
      });
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // --------------------------------------------------
  // Online status
  // --------------------------------------------------

  const isUserOnline = (participant) => {
    const data = getParticipantData(participant);

    const ids = [
      data?.clerkId,
      data?.id,
      data?._id,
      participant?.clerkId,
      participant?.userId?.clerkId,
      participant?.userId?._id,
    ].filter(Boolean);

    if (!Array.isArray(onlineUsers)) {
      return false;
    }

    return ids.some((id) =>
      onlineUsers.some(
        (onlineId) => String(onlineId) === String(id)
      )
    );
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  const activePartner = getOtherParticipant(activeConversation);

  const activePartnerData =
    getParticipantData(activePartner);

  const activePartnerName =
    activePartnerData?.fullname ||
    activePartnerData?.fullName ||
    activePartnerData?.name ||
    activePartner?.fullname ||
    'User';

  const activePartnerImage =
    activePartnerData?.profilePic ||
    activePartnerData?.imageUrl ||
    activePartner?.profilePic ||
    API_PLACEHOLDER;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">
              T
            </div>

            <span className="font-semibold text-lg text-white">
              Talkora
            </span>
          </div>

          <UserButton afterSignOutUrl="/" />
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Sidebar content */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.trim() ? (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                Search Results
              </div>

              {isSearching ? (
                <div className="p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  No users found
                </div>
              ) : (
                searchResults.map((searchUser) => (
                  <button
                    key={searchUser._id}
                    onClick={() =>
                      handleStartConversation(searchUser._id)
                    }
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-800/60 transition text-left"
                  >
                    <img
                      src={
                        searchUser.profilePic ||
                        API_PLACEHOLDER
                      }
                      alt={
                        searchUser.fullname || 'User'
                      }
                      className="w-10 h-10 rounded-full object-cover"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {searchUser.fullname || 'User'}
                      </p>

                      <p className="text-xs text-slate-400 truncate">
                        {searchUser.email || ''}
                      </p>
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
                  <Loader2 className="animate-spin h-4 w-4" />
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  No chats yet
                </div>
              ) : (
                conversations.map((conversation) => {
                  const partner =
                    getOtherParticipant(conversation);

                  const partnerData =
                    getParticipantData(partner);

                  const partnerName =
                    partnerData?.fullname ||
                    partnerData?.fullName ||
                    partnerData?.name ||
                    partner?.fullname ||
                    'Chat';

                  const partnerImage =
                    partnerData?.profilePic ||
                    partnerData?.imageUrl ||
                    partner?.profilePic ||
                    API_PLACEHOLDER;

                  const online =
                    isUserOnline(partner);

                  const isActive =
                    String(activeConversation?._id) ===
                    String(conversation._id);

                  return (
                    <button
                      key={conversation._id}
                      onClick={() =>
                        handleSelectConversation(
                          conversation
                        )
                      }
                      className={`w-full p-3 flex items-center gap-3 border-b border-slate-800/40 transition text-left ${
                        isActive
                          ? 'bg-indigo-900/30 border-l-4 border-l-indigo-500'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={partnerImage}
                          alt={partnerName}
                          className="w-10 h-10 rounded-full object-cover"
                        />

                        {online && (
                          <Circle className="w-3 h-3 text-green-500 fill-green-500 absolute bottom-0 right-0 border-2 border-slate-900 rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {partnerName}
                        </p>

                        <p className="text-xs text-slate-400 truncate">
                          {conversation.lastMessage?.text ||
                            conversation.lastMessage?.content ||
                            'No messages yet'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col bg-slate-950 min-w-0">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={activePartnerImage}
                    alt={activePartnerName}
                    className="w-10 h-10 rounded-full object-cover"
                  />

                  {isUserOnline(activePartner) && (
                    <Circle className="w-3 h-3 text-green-500 fill-green-500 absolute bottom-0 right-0 border-2 border-slate-900 rounded-full" />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">
                    {activePartnerName}
                  </h2>

                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    {isUserOnline(activePartner) ? (
                      <span className="text-green-400">
                        Online
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Offline
                      </span>
                    )}

                    {isTyping && (
                      <span className="text-indigo-400 italic font-medium">
                        — typing...
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <Loader2 className="animate-spin h-6 w-6 mr-2" />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 mb-3 text-slate-600" />

                  <p className="text-lg font-medium text-slate-300">
                    Start a conversation
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Send your first message to{' '}
                    {activePartnerName}.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const senderId =
                    getMessageSenderId(message);

                  const isMe =
                    String(senderId) ===
                    String(user?.id);

                  const messageText =
                    getMessageText(message);

                  return (
                    <div
                      key={
                        message._id ||
                        `${senderId}-${message.createdAt}-${messageText}`
                      }
                      className={`flex ${
                        isMe
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl text-sm ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                        }`}
                      >
                        {messageText && (
                          <p className="whitespace-pre-wrap break-words">
                            {messageText}
                          </p>
                        )}

                        {message.createdAt && (
                          <span className="text-[10px] opacity-70 block text-right mt-1">
                            {new Date(
                              message.createdAt
                            ).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2"
            >
              <input
                type="text"
                value={newMessageText}
                onChange={handleInputChange}
                placeholder="Type a message..."
                autoComplete="off"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />

              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <MessageSquare className="h-12 w-12 mb-3 text-slate-600" />

            <p className="text-lg font-medium text-slate-300">
              Welcome to Talkora
            </p>

            <p className="text-sm max-w-sm mt-1">
              Search for a user to start a conversation,
              or select an existing chat.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatPage;