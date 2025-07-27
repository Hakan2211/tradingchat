// app/hooks/use-journal-file-upload.ts

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
} from 'react';

export type FileWithPreview = {
  file: File;
  id: string;
  preview: string;
};

export type FileUploadOptions = {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export function useJournalFileUpload(options: FileUploadOptions = {}) {
  const {
    maxFiles = 6,
    maxSize = 5 * 1024 * 1024,
    accept = 'image/*',
    multiple = true,
  } = options;

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `File "${file.name}" exceeds max size of ${formatBytes(
          maxSize
        )}.`;
      }

      if (!file.type.match(accept.replace('*', '.*'))) {
        return `File type not supported for "${file.name}".`;
      }
      return null;
    },
    [accept, maxSize]
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const currentErrors: string[] = [];
      const filesToAdd: FileWithPreview[] = [];

      if (multiple && files.length + newFiles.length > maxFiles) {
        currentErrors.push(`Cannot upload more than ${maxFiles} files.`);
      } else {
        newFiles.forEach((file) => {
          const validationError = validateFile(file);
          const isDuplicate = files.some(
            (f) => f.file.name === file.name && f.file.size === file.size
          );

          if (isDuplicate) return;

          if (validationError) {
            currentErrors.push(validationError);
          } else {
            filesToAdd.push({
              file,
              id: `${file.name}-${file.size}-${Date.now()}`,
              preview: URL.createObjectURL(file),
            });
          }
        });
      }

      if (currentErrors.length > 0) {
        setErrors(currentErrors);
      } else {
        setFiles((prev) => (multiple ? [...prev, ...filesToAdd] : filesToAdd));
        setErrors([]);
      }

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [files, maxFiles, multiple, validateFile]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
    setErrors([]);
  }, []);

  // --- Drag and Drop Handlers ---
  const handleDragEnter = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  const handleDragOver = (e: DragEvent<HTMLElement>) => e.preventDefault();
  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const openFileDialog = () => inputRef.current?.click();

  const getInputProps = () => ({
    type: 'file',
    ref: inputRef,
    onChange: handleFileChange,
    accept,
    multiple,
    style: { display: 'none' },
  });

  return {
    files,
    errors,
    isDragging,
    addFiles,
    removeFile,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog,
    getInputProps,
  };
}
