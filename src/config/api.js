// src/config/api.js
const BASE_URL =
  "http://svc-atlas-ai-prod-alb-974046057.us-east-1.elb.amazonaws.com";

export const API_ENDPOINTS = {
  // Auth
  SIGNIN: `${BASE_URL}/api/auth/signin`,
  SIGNOUT: `${BASE_URL}/api/auth/signout`,
  PROFILE: `${BASE_URL}/api/auth/profile`,

  // Users
  USERS: `${BASE_URL}/api/users`,

  // S3 File Management
  S3_UPLOAD_URL: `${BASE_URL}/api/s3/upload-url`,
  S3_FILE: `${BASE_URL}/api/s3/file`,
  S3_FILE_URL: `${BASE_URL}/api/s3/file-url`,
  S3_DOWNLOAD_URL: `${BASE_URL}/api/s3/download-url`,

  // Documents
  DOCUMENTS: `${BASE_URL}/api/documents`,
  DOCUMENTS_PROCESS: `${BASE_URL}/api/documents/process`,

  // Chats
  CHATS: `${BASE_URL}/api/chats`,

  // Health
  HEALTH: `${BASE_URL}/health`,
  HEALTH_STATUS: `${BASE_URL}/api/health/status`,
};

export default BASE_URL;
