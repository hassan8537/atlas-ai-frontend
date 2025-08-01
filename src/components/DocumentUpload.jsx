// src/components/DocumentUpload.jsx - Enhanced with multiple file upload and proper S3 flow
import React, { useState, useCallback } from "react";
import apiService from "../services/apiService";

export default function DocumentUpload({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [globalStatus, setGlobalStatus] = useState("");

  const MAX_FILES = 100;
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFile = file => {
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 50MB";
    }
    return null;
  };

  const handleFileSelect = useCallback(
    selectedFiles => {
      const fileArray = Array.from(selectedFiles);
      const validFiles = [];
      const errors = [];

      // Check total file limit
      if (files.length + fileArray.length > MAX_FILES) {
        setGlobalStatus(
          `Cannot upload more than ${MAX_FILES} files. Currently have ${files.length} files.`
        );
        return;
      }

      fileArray.forEach((file, index) => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          // Check for duplicates
          const isDuplicate = files.some(
            existingFile =>
              existingFile.name === file.name && existingFile.size === file.size
          );
          if (!isDuplicate) {
            // Create a proper file object that preserves the original File properties
            const fileObj = {
              // Copy all File properties
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              // Add our tracking properties
              id: Date.now() + index,
              status: "ready",
              progress: 0,
              error: null,
              // Keep reference to original File object for upload
              file: file,
            };
            validFiles.push(fileObj);
          } else {
            errors.push(`${file.name}: Duplicate file`);
          }
        }
      });

      if (errors.length > 0) {
        setGlobalStatus(`Some files were rejected: ${errors.join(", ")}`);
      } else {
        setGlobalStatus("");
      }

      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }
    },
    [files]
  );

  const handleFileInputChange = useCallback(
    e => {
      handleFileSelect(e.target.files);
      // Reset input
      e.target.value = "";
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    e => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback(e => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = useCallback(fileId => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const updateFileStatus = useCallback(
    (fileId, status, progress = 0, error = null) => {
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId ? { ...file, status, progress, error } : file
        )
      );
    },
    []
  );

  // Enhanced S3 upload function
  const uploadToS3 = async (presignedUrl, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", e => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload was aborted"));
      });

      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  const uploadSingleFile = async file => {
    try {
      console.log("Starting upload for file:", file);

      // Validate file object
      if (!file || !file.name) {
        throw new Error("Invalid file object - missing name");
      }

      if (!file.type) {
        throw new Error("Invalid file object - missing type");
      }

      updateFileStatus(file.id, "getting-url", 0);

      // Get presigned URL with correct JSON body structure
      console.log("Requesting upload URL for:", {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      // Make sure we're sending the right structure to the API
      const uploadResponse = await apiService.getUploadUrl(
        file.name,
        file.type
      );
      console.log("Upload URL response:", uploadResponse);

      if (
        !uploadResponse.data ||
        !uploadResponse.data.uploadUrl ||
        !uploadResponse.data.key
      ) {
        throw new Error("Invalid upload URL response from server");
      }

      const { uploadUrl, key } = uploadResponse.data;

      updateFileStatus(file.id, "uploading", 0);

      // Upload to S3 using presigned URL (use original File object)
      await uploadToS3(uploadUrl, file.file || file, progress => {
        updateFileStatus(file.id, "uploading", progress);
      });

      updateFileStatus(file.id, "processing", 100);

      // Process document
      const processResponse = await apiService.processDocument(
        key,
        file.name,
        file.type,
        file.size
      );

      updateFileStatus(file.id, "completed", 100);
      return { success: true, file: file.name };
    } catch (error) {
      console.error(`Upload error for ${file?.name || "unknown file"}:`, error);
      updateFileStatus(file.id, "failed", 0, error.message);
      return {
        success: false,
        file: file?.name || "unknown file",
        error: error.message,
      };
    }
  };

  const handleUploadAll = useCallback(async () => {
    if (files.length === 0) return;

    const filesToUpload = files.filter(
      f => f.status === "ready" || f.status === "failed"
    );
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setGlobalStatus(`Uploading ${filesToUpload.length} files...`);

    const results = [];

    // Upload files concurrently (max 3 at a time to avoid overwhelming the server)
    const batchSize = 3;
    for (let i = 0; i < filesToUpload.length; i += batchSize) {
      const batch = filesToUpload.slice(i, i + batchSize);
      const batchPromises = batch.map(file => uploadSingleFile(file));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0 && failed.length === 0) {
      setGlobalStatus(`Successfully uploaded ${successful.length} files!`);
    } else if (successful.length > 0 && failed.length > 0) {
      setGlobalStatus(
        `Uploaded ${successful.length} files. ${failed.length} failed.`
      );
    } else {
      setGlobalStatus(`All uploads failed.`);
    }

    setUploading(false);
    onUploadComplete?.();
  }, [files, onUploadComplete]);

  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== "completed"));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setGlobalStatus("");
  }, []);

  const getStatusColor = status => {
    switch (status) {
      case "ready":
        return "text-gray-600 dark:text-gray-400";
      case "getting-url":
        return "text-blue-600 dark:text-blue-400";
      case "uploading":
        return "text-blue-600 dark:text-blue-400";
      case "processing":
        return "text-yellow-600 dark:text-yellow-400";
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusText = file => {
    switch (file.status) {
      case "ready":
        return "Ready to upload";
      case "getting-url":
        return "Getting upload URL...";
      case "uploading":
        return `Uploading... ${Math.round(file.progress)}%`;
      case "processing":
        return "Processing document...";
      case "completed":
        return "Completed";
      case "failed":
        return `Failed: ${file.error}`;
      default:
        return "Unknown status";
    }
  };

  const pendingFiles = files.filter(
    f => f.status === "ready" || f.status === "failed"
  );
  const activeFiles = files.filter(f =>
    ["getting-url", "uploading", "processing"].includes(f.status)
  );
  const completedFiles = files.filter(f => f.status === "completed");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Upload Documents
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {files.length}/{MAX_FILES} files
        </div>
      </div>

      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
            >
              <span>Upload files</span>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept=".pdf"
                multiple
                onChange={handleFileInputChange}
                disabled={uploading || files.length >= MAX_FILES}
              />
            </label>
            <span> or drag and drop</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PDF files up to 50MB each • Maximum {MAX_FILES} files
          </p>
        </div>
      </div>

      {/* Global Status */}
      {globalStatus && (
        <div
          className={`mt-4 p-3 rounded-md ${
            globalStatus.includes("failed") || globalStatus.includes("rejected")
              ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
              : globalStatus.includes("Success")
              ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
              : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
          }`}
        >
          {globalStatus}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Selected Files ({files.length})
            </h4>
            <div className="flex space-x-2">
              {completedFiles.length > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Clear Completed
                </button>
              )}
              <button
                onClick={clearAll}
                disabled={uploading}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 border dark:border-gray-600 rounded-md p-3">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <span className={`text-xs ${getStatusColor(file.status)}`}>
                      {getStatusText(file)}
                    </span>
                  </div>

                  {/* Progress bar for uploading files */}
                  {file.status === "uploading" && (
                    <div className="mt-2">
                      <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Remove button */}
                {!uploading &&
                  !["uploading", "getting-url", "processing"].includes(
                    file.status
                  ) && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="ml-3 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="mt-4 flex space-x-3">
          <button
            onClick={handleUploadAll}
            disabled={pendingFiles.length === 0 || uploading}
            className={`flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
              pendingFiles.length === 0 || uploading
                ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                : "bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            }`}
          >
            {uploading && (
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            {uploading
              ? `Uploading... (${activeFiles.length} active)`
              : `Upload ${pendingFiles.length} Files`}
          </button>
        </div>
      )}
    </div>
  );
}
