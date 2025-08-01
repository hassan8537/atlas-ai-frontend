// src/components/Dashboard.jsx - Updated with dark theme
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import apiService from "../services/apiService";
import DocumentUpload from "./DocumentUpload";
import DocumentList from "./DocumentList";
import ChatInterface from "./ChatInterface";
import HealthMonitor from "./HealthMonitor";
import ThemeToggle from "./ThemeToggle";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("documents");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [chatStats, documents] = await Promise.all([
        apiService.getChatStats(),
        apiService.getDocuments(),
      ]);

      setStats({
        totalChats: chatStats.data.totalChats,
        totalMessages: chatStats.data.totalMessages,
        totalDocuments: documents.data.count,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const tabs = [
    { id: "documents", name: "Documents", icon: "📄" },
    { id: "chat", name: "Chat", icon: "🤖" },
    { id: "health", name: "System Health", icon: "🏥" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="text-2xl mr-3">🤖</div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Atlas AI
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Welcome, {user?.firstName || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-gray-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-indigo-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border dark:border-gray-700">
                <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
                  {stats.totalDocuments}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Documents Processed
                </p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border dark:border-gray-700">
                <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {stats.totalChats}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI Conversations
                </p>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg p-4 border dark:border-gray-700">
                <p className="text-2xl font-semibold text-violet-600 dark:text-violet-400">
                  {stats.totalMessages}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Messages Exchanged
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === "documents" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <DocumentUpload onUploadComplete={loadStats} />
              </div>
              <div className="lg:col-span-2">
                <DocumentList />
              </div>
            </div>
          )}

          {activeTab === "chat" && <ChatInterface />}
          {activeTab === "health" && <HealthMonitor />}
        </div>
      </div>
    </div>
  );
}
