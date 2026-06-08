"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accept?: string;
  maxSizeLabel?: string;
}

export function FileUpload({
  onFileSelect,
  disabled = false,
  accept = "image/*",
  maxSizeLabel = "máx. 800KB",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ${
        isDragging
          ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-2 p-6 text-center">
        <div className={`rounded-full p-3 transition-colors ${isDragging ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-400"}`}>
          <Upload className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-200">
            {isDragging ? "Solte a imagem aqui" : "Clique ou arraste a imagem para upload"}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            {maxSizeLabel} • formatos aceitos: {accept.replace(/image\//g, "").replace(/\*/g, "todos")}
          </p>
        </div>
      </div>
    </div>
  );
}
