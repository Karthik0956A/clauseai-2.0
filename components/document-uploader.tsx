"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface DocumentUploaderProps {
  onUploadComplete?: (file: { uri: string; mimeType: string; name: string }) => void
}

interface UploadedDocument {
  id: string
  name: string
  uploadedAt: string
  type: string
  status: "uploading" | "completed" | "error"
}

export default function DocumentUploader({ onUploadComplete }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files) {
      processFiles(files)
    }
  }

  const processFiles = async (files: FileList) => {
    setIsUploading(true)
    const fileArray = Array.from(files);

    // Add to UI immediately
    const newDocs = fileArray.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      uploadedAt: new Date().toLocaleTimeString(),
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'text',
      status: "uploading" as const,
    }));

    setUploadedDocs((prev) => [...prev, ...newDocs])

    const formData = new FormData();
    fileArray.forEach(file => {
      formData.append("files", file);
    });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.file) {
        setUploadedDocs((prev) => prev.map((doc) => (newDocs.find(d => d.name === doc.name) ? { ...doc, status: "completed" } : doc)))
        if (onUploadComplete) {
          onUploadComplete(data.file);
        }
      } else {
        setUploadedDocs((prev) => prev.map((doc) => (newDocs.find(d => d.name === doc.name) ? { ...doc, status: "error" } : doc)))
        console.error("Upload failed", data.error);
      }

    } catch (error) {
      setUploadedDocs((prev) => prev.map((doc) => (newDocs.find(d => d.name === doc.name) ? { ...doc, status: "error" } : doc)))
      console.error("Upload error", error);
    }

    setIsUploading(false)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-white tracking-tight">Upload Document</h2>
        <p className="text-neutral-400">Drag and drop your legal documents, or click to browse from your device.</p>
      </div>

      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-gradient-to-br from-neutral-800/30 to-neutral-900/30 border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${isDragging
            ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
            : "border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5"
          }`}
      >
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-2xl font-bold text-white mb-2">Upload Your Document</h3>
        <p className="text-neutral-400 mb-8">PDF, Image, or Text • Maximum 50MB</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          onChange={(e) => {
            if (e.target.files) {
              processFiles(e.target.files)
            }
          }}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Choose File"}
        </Button>
      </Card>

      {/* Document categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-neutral-800/30 border-neutral-700/50 p-6 hover:border-cyan-500/50 transition-all">
          <div className="text-3xl mb-3">📋</div>
          <h4 className="font-semibold text-white mb-2">Contracts & Agreements</h4>
          <p className="text-sm text-neutral-400">Employment, NDAs, service agreements</p>
        </Card>

        <Card className="bg-neutral-800/30 border-neutral-700/50 p-6 hover:border-cyan-500/50 transition-all">
          <div className="text-3xl mb-3">⚖️</div>
          <h4 className="font-semibold text-white mb-2">Legal Policies</h4>
          <p className="text-sm text-neutral-400">Terms of service, privacy policies</p>
        </Card>

        <Card className="bg-neutral-800/30 border-neutral-700/50 p-6 hover:border-cyan-500/50 transition-all">
          <div className="text-3xl mb-3">📜</div>
          <h4 className="font-semibold text-white mb-2">Financial Docs</h4>
          <p className="text-sm text-neutral-400">Loans, insurance, investment terms</p>
        </Card>
      </div>

      {/* Uploaded documents list */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Uploaded Documents</h3>
          <div className="grid grid-cols-1 gap-3">
            {uploadedDocs.map((doc) => (
              <Card
                key={doc.id}
                className="bg-neutral-800/30 border-neutral-700/50 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-3xl">{doc.type === "pdf" ? "📕" : doc.type === "image" ? "🖼️" : "📝"}</div>
                  <div className="flex-1">
                    <p className="text-white font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-neutral-400">{doc.uploadedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.status === "uploading" && (
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                      <div
                        className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  )}
                  {doc.status === "completed" && <span className="text-green-400 text-sm font-medium">Ready</span>}
                  {doc.status === "error" && <span className="text-red-400 text-sm font-medium">Failed</span>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
