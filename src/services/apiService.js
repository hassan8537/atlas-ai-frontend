// src/services/apiService.js - CORRECTED VERSION
import Cookies from "js-cookie";
import { API_ENDPOINTS } from "../config/api";

class ApiService {
  constructor() {
    this.baseURL = API_ENDPOINTS;
  }

  getAuthHeaders() {
    const token = Cookies.get("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async request(url, options = {}) {
    const config = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuth();
          window.location.href = "/signin";
          throw new Error("Session expired. Please sign in again.");
        }
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error("API Request Error:", error);
      throw error;
    }
  }

  clearAuth() {
    Cookies.remove("token");
    Cookies.remove("user");
  }

  // Auth Methods
  async signIn(email, password) {
    return this.request(API_ENDPOINTS.SIGNIN, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async signOut() {
    return this.request(API_ENDPOINTS.SIGNOUT, {
      method: "POST",
    });
  }

  async getProfile() {
    return this.request(API_ENDPOINTS.PROFILE);
  }

  // S3 File Methods
  async getUploadUrl(fileName, contentType) {
    return this.request(API_ENDPOINTS.S3_UPLOAD_URL, {
      method: "POST",
      body: JSON.stringify({ fileName, contentType }),
    });
  }

  async uploadFile(uploadUrl, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", e => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress?.(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  }

  async deleteFile(fileKey) {
    return this.request(`${API_ENDPOINTS.S3_FILE}/${fileKey}`, {
      method: "DELETE",
    });
  }

  async getFileUrl(fileKey) {
    return this.request(`${API_ENDPOINTS.S3_FILE_URL}/${fileKey}`);
  }

  async getDownloadUrl(fileKey) {
    return this.request(`${API_ENDPOINTS.S3_DOWNLOAD_URL}/${fileKey}`);
  }

  // Document Methods
  async processDocument(s3Key, fileName, contentType, fileSize) {
    return this.request(API_ENDPOINTS.DOCUMENTS_PROCESS, {
      method: "POST",
      body: JSON.stringify({ s3Key, fileName, contentType, fileSize }),
    });
  }

  async getDocuments() {
    return this.request(API_ENDPOINTS.DOCUMENTS);
  }

  async getDocument(id) {
    return this.request(`${API_ENDPOINTS.DOCUMENTS}/${id}`);
  }

  async getDocumentStatus(id) {
    return this.request(`${API_ENDPOINTS.DOCUMENTS}/${id}/status`);
  }

  async deleteDocument(id) {
    return this.request(`${API_ENDPOINTS.DOCUMENTS}/${id}`, {
      method: "DELETE",
    });
  }

  // Chat Methods - CORRECTED TO MATCH POSTMAN COLLECTION

  /**
   * Create new chat with initial query
   * POST /api/chats
   * Body: { query, title }
   * Returns: { success, data: { chat, message } }
   */
  async createChat(query, title) {
    return this.request(API_ENDPOINTS.CHATS, {
      method: "POST",
      body: JSON.stringify({ query, title }),
    });
  }

  /**
   * Send message to existing chat
   * POST /api/chats/{chatId}/query
   * Body: { query }
   * Returns: { success, data: { userMessage, assistantMessage, context } }
   */
  async sendMessage(chatId, query) {
    return this.request(`${API_ENDPOINTS.CHATS}/${chatId}/query`, {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  /**
   * Get all chats for user
   * GET /api/chats?includeMessages=true
   */
  async getChats(includeMessages = false) {
    const url = includeMessages
      ? `${API_ENDPOINTS.CHATS}?includeMessages=true`
      : API_ENDPOINTS.CHATS;
    return this.request(url);
  }

  /**
   * Get specific chat with messages
   * GET /api/chats/{id}?includeMessages=true
   */
  async getChat(id, includeMessages = true) {
    const url = includeMessages
      ? `${API_ENDPOINTS.CHATS}/${id}?includeMessages=true`
      : `${API_ENDPOINTS.CHATS}/${id}`;
    return this.request(url);
  }

  /**
   * Update chat (title, description)
   * PUT /api/chats/{id}
   */
  async updateChat(id, data) {
    return this.request(`${API_ENDPOINTS.CHATS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete chat
   * DELETE /api/chats/{id}
   */
  async deleteChat(id) {
    return this.request(`${API_ENDPOINTS.CHATS}/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Get chat statistics
   * GET /api/chats/stats
   */
  async getChatStats() {
    return this.request(`${API_ENDPOINTS.CHATS}/stats`);
  }

  // Health Methods
  async getHealthStatus() {
    return this.request(API_ENDPOINTS.HEALTH_STATUS);
  }
}

export default new ApiService();
