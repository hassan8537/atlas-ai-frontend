// src/components/ChatInterface.jsx - Mobile Responsive with Collapsible Sidebar
import React, { useState, useEffect, useRef, useCallback } from "react";
import apiService from "../services/apiService";

// Simple markdown parser for rich text
const parseMarkdown = text => {
  if (!text) return text;

  // Convert markdown to HTML
  let html = text
    // Headers
    .replace(
      /^### (.*$)/gim,
      '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>'
    )
    .replace(
      /^## (.*$)/gim,
      '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>'
    )
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')

    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')

    // Italic
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')

    // Code blocks
    .replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md my-2 overflow-x-auto"><code class="text-sm">$1</code></pre>'
    )

    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>'
    )

    // Unordered lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4">• $1</li>')
    .replace(/(<li.*<\/li>)/s, '<ul class="my-2">$1</ul>')

    // Ordered lists
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')

    // Links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank">$1</a>'
    )

    // Line breaks
    .replace(/\n/g, "<br/>");

  return html;
};

// Message component with frontend streaming simulation
const MessageContent = ({ content, isStreaming = false, onStreamComplete }) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const streamingRef = useRef(false);

  useEffect(() => {
    if (isStreaming && content && !streamingRef.current) {
      streamingRef.current = true;
      setDisplayedContent("");

      let index = 0;
      const streamText = () => {
        if (index < content.length) {
          // Add 1-3 characters at a time for more natural streaming
          const chunkSize =
            Math.random() > 0.7 ? 3 : Math.random() > 0.4 ? 2 : 1;
          const nextChunk = content.slice(index, index + chunkSize);
          setDisplayedContent(prev => prev + nextChunk);
          index += chunkSize;

          // Variable delay to simulate real AI thinking/generation
          const delay = Math.random() * 50 + 20; // 20-70ms delay
          setTimeout(streamText, delay);
        } else {
          streamingRef.current = false;
          onStreamComplete?.();
        }
      };

      // Start streaming after a brief delay
      setTimeout(streamText, 100);
    } else if (!isStreaming) {
      setDisplayedContent(content);
      streamingRef.current = false;
    }
  }, [content, isStreaming, onStreamComplete]);

  const htmlContent = parseMarkdown(displayedContent);

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className="whitespace-pre-wrap"
      />
      {isStreaming && streamingRef.current && (
        <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1">
          |
        </span>
      )}
    </div>
  );
};

export default function ChatInterface() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [newChatTitle, setNewChatTitle] = useState("");
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = event => {
      if (sidebarOpen && window.innerWidth < 768) {
        const sidebar = document.getElementById("chat-sidebar");
        const toggleButton = document.getElementById("sidebar-toggle");
        if (
          sidebar &&
          !sidebar.contains(event.target) &&
          !toggleButton.contains(event.target)
        ) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when selecting a chat on mobile
  const handleChatSelect = chatId => {
    loadChatMessages(chatId);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const loadChats = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiService.getChats();
      console.log("Load chats response:", response);

      if (response && response.success && response.data) {
        const chatData = response.data.chats || response.data || [];
        setChats(Array.isArray(chatData) ? chatData : []);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error("Error loading chats:", error);
      setError("Failed to load chats: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async chatId => {
    try {
      setError("");
      console.log("Loading chat messages for ID:", chatId);

      const response = await apiService.getChat(chatId, true);
      console.log("Load chat messages response:", response);

      if (response && response.success && response.data) {
        const chatData = {
          ...response.data,
          id: chatId,
        };

        setMessages(response.data.messages || []);
        setActiveChat(chatData);
        console.log("Set active chat:", chatData);
      } else {
        setMessages([]);
        console.warn("Invalid chat response:", response);
      }
    } catch (error) {
      console.error("Error loading chat messages:", error);
      setError("Failed to load chat messages: " + error.message);
    }
  };

  const createNewChat = async () => {
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      setError("");

      const userQuery = newMessage.trim();
      const chatTitle =
        newChatTitle.trim() || `Chat ${new Date().toLocaleString()}`;

      console.log(
        "Creating new chat with query:",
        userQuery,
        "Title:",
        chatTitle
      );

      // Create user message immediately
      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userQuery,
        createdAt: new Date().toISOString(),
      };

      // Create placeholder assistant message for streaming
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        fullContent: "", // Store the complete response
      };

      // Create chat object
      const tempChatId = `temp-${Date.now()}`;
      const newChatObject = {
        id: tempChatId,
        title: chatTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update UI immediately
      setChats(prev => [newChatObject, ...prev]);
      setActiveChat(newChatObject);
      setMessages([userMessage, assistantMessage]);
      setNewMessage("");
      setNewChatTitle("");
      setShowNewChatForm(false);
      setStreamingMessageId(assistantMessageId);

      // Close sidebar on mobile after creating chat
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }

      // Get response from API
      const response = await apiService.createChat(userQuery, chatTitle);

      if (response && response.success && response.data) {
        const { chatId, query, answer, messageId } = response.data;

        // Update with real chat ID
        const updatedChat = { ...newChatObject, id: chatId };
        setChats(prev =>
          prev.map(chat => (chat.id === tempChatId ? updatedChat : chat))
        );
        setActiveChat(updatedChat);

        // Start frontend streaming simulation
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  id: messageId,
                  fullContent: answer,
                  content: "", // Start with empty content for streaming
                }
              : msg
          )
        );

        console.log("New chat created successfully");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      setError("Failed to create chat: " + error.message);
      // Remove the placeholder message on error
      setMessages(prev => prev.slice(0, -1));
      setStreamingMessageId(null);
    } finally {
      setSendingMessage(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;

    const userQuery = newMessage.trim();

    try {
      setSendingMessage(true);
      setError("");

      console.log(
        "Sending message to chat:",
        activeChat.id,
        "Query:",
        userQuery
      );

      // Create user message immediately
      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userQuery,
        createdAt: new Date().toISOString(),
      };

      // Create placeholder assistant message for streaming
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        fullContent: "", // Store the complete response
      };

      // Add messages to UI
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setNewMessage("");
      setStreamingMessageId(assistantMessageId);

      // Send to API
      const response = await apiService.sendMessage(activeChat.id, userQuery);
      console.log("Send message API response:", response);

      if (response && response.success && response.data) {
        const { answer, messageId } = response.data;

        // Start frontend streaming simulation
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  id: messageId,
                  fullContent: answer,
                  content: "", // Start with empty content for streaming
                }
              : msg
          )
        );

        console.log("Message sent successfully");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message: " + error.message);

      // Remove failed messages
      setMessages(prev => prev.slice(0, -2));
      setNewMessage(userQuery);
      setStreamingMessageId(null);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStreamComplete = useCallback(messageId => {
    setStreamingMessageId(null);
    console.log("Streaming completed for message:", messageId);
  }, []);

  const handleKeyPress = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showNewChatForm) {
        createNewChat();
      } else if (activeChat) {
        sendMessage();
      } else {
        startNewChat();
      }
    }
  };

  const deleteChat = async chatId => {
    if (!window.confirm("Are you sure you want to delete this chat?")) return;

    try {
      await apiService.deleteChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      setError("Failed to delete chat: " + error.message);
    }
  };

  const startNewChat = () => {
    setActiveChat(null);
    setMessages([]);
    setNewMessage("");
    setNewChatTitle("");
    setError("");
    setShowNewChatForm(true);
    // Close sidebar on mobile when starting new chat
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const cancelNewChat = () => {
    setShowNewChatForm(false);
    setNewMessage("");
    setNewChatTitle("");
  };

  const handleNewChatKeyPress = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      createNewChat();
    }
  };

  return (
    <div className="h-screen max-h-[100vh] md:max-h-[70vh] flex bg-white dark:bg-gray-800 rounded-none md:rounded-lg shadow overflow-hidden border-0 md:border dark:border-gray-700 relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat Sidebar */}
      <div
        id="chat-sidebar"
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-50 md:z-auto w-80 md:w-1/3 h-full border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Chats
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadChats}
                disabled={loading}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50"
                title="Refresh chats"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400"></div>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
              </button>
              {/* Close button for mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                title="Close sidebar"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={startNewChat}
            className="w-full px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 text-sm font-medium"
          >
            + New Chat
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/50 border-b border-red-200 dark:border-red-700">
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError("")}
              className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {Array.isArray(chats) && chats.length > 0 ? (
            chats.map(chat => {
              if (!chat || !chat.id) return null;

              return (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    activeChat?.id === chat.id
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {chat.title || "Untitled Chat"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {chat.createdAt
                          ? new Date(chat.createdAt).toLocaleString()
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className="ml-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete chat"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 dark:border-gray-500 mr-2"></div>
                  <span>Loading chats...</span>
                </div>
              ) : (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="mt-2 text-sm">No chats yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Start a conversation below
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with mobile menu button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              id="sidebar-toggle"
              onClick={toggleSidebar}
              className="md:hidden p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              title="Toggle chat list"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                {activeChat ? activeChat.title || "Chat" : "New Chat"}
              </h3>
              {activeChat && (
                <p className="text-xs text-gray-500 dark:text-gray-400 md:text-sm">
                  Chat ID: {activeChat.id}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
          {showNewChatForm ? (
            <div className="max-w-md mx-auto mt-8">
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border-2 border-indigo-200 dark:border-indigo-600">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Start New Chat
                </h3>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="chatTitle"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Chat Title (Optional)
                    </label>
                    <input
                      id="chatTitle"
                      type="text"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Enter a title for your chat..."
                      value={newChatTitle}
                      onChange={e => setNewChatTitle(e.target.value)}
                      disabled={sendingMessage}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Leave blank to auto-generate a title
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="firstMessage"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Your First Message
                    </label>
                    <textarea
                      id="firstMessage"
                      className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows="3"
                      placeholder="Ask your first question..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyPress={handleNewChatKeyPress}
                      disabled={sendingMessage}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={createNewChat}
                      disabled={!newMessage.trim() || sendingMessage}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                        !newMessage.trim() || sendingMessage
                          ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                          : "bg-indigo-600 dark:bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-700"
                      }`}
                    >
                      {sendingMessage ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        "Create Chat"
                      )}
                    </button>

                    <button
                      onClick={cancelNewChat}
                      disabled={sendingMessage}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : messages.length === 0 && !activeChat ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                Welcome to Atlas AI Chat
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Ask questions about your uploaded documents
              </p>
              <button
                onClick={startNewChat}
                className="mt-4 px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              >
                Start Your First Chat
              </button>
            </div>
          ) : (
            Array.isArray(messages) &&
            messages.map((message, index) => {
              if (!message || !message.content) return null;

              const isStreaming = message.id === streamingMessageId;

              return (
                <div
                  key={message.id || index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-indigo-600 dark:bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    }`}
                  >
                    {message.role === "user" ? (
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : (
                      <MessageContent
                        content={message.fullContent || message.content}
                        isStreaming={isStreaming}
                        onStreamComplete={() =>
                          handleStreamComplete(message.id)
                        }
                      />
                    )}
                    <p
                      className={`text-xs mt-2 ${
                        message.role === "user"
                          ? "text-indigo-200 dark:text-indigo-300"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {message.createdAt
                        ? new Date(message.createdAt).toLocaleTimeString()
                        : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {sendingMessage &&
            !showNewChatForm &&
            streamingMessageId === null && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {!showNewChatForm && (
          <div className="p-3 md:p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <textarea
                className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows="2"
                placeholder={
                  activeChat
                    ? "Continue the conversation..."
                    : "Click 'New Chat' to start a conversation..."
                }
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sendingMessage || !activeChat}
              />
              <button
                onClick={activeChat ? sendMessage : startNewChat}
                disabled={(!newMessage.trim() && activeChat) || sendingMessage}
                className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  (!newMessage.trim() && activeChat) || sendingMessage
                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 dark:bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                }`}
              >
                {sendingMessage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : activeChat ? (
                  <span className="hidden sm:inline">Send</span>
                ) : (
                  <span className="hidden sm:inline">New Chat</span>
                )}
                {/* Mobile icons */}
                {!sendingMessage && (
                  <>
                    {activeChat ? (
                      <svg
                        className="h-4 w-4 sm:hidden"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 sm:hidden"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    )}
                  </>
                )}
              </button>
            </div>

            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {activeChat ? (
                <span className="truncate">
                  💬 Chatting in: {activeChat.title}
                </span>
              ) : (
                <span>✨ Click "New Chat" to start a conversation</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
