// app/components/journal/JournalImageUploader.tsx

import * as React from 'react';
import {
  useJournalFileUpload,
  type FileWithPreview,
} from '#/hooks/use-journal-file-upload';
import { cn } from '#/lib/utils';
import { Button } from '#/components/ui/button';
import { AlertCircleIcon, FileImage, UploadCloud, XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface JournalImageUploaderProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function JournalImageUploader({
  onFilesChange,
  maxFiles = 6,
  maxSizeMB = 5,
}: JournalImageUploaderProps) {
  const {
    files,
    errors,
    isDragging,
    removeFile,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog,
    getInputProps,
  } = useJournalFileUpload({
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
  });

  // Call the callback whenever the internal files state changes
  React.useEffect(() => {
    onFilesChange(files.map((fwb) => fwb.file));
  }, [files, onFilesChange]);

  return (
    <div className="flex flex-col gap-2">
      {/* --- Drop Area --- */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-transparent dark:bg-input/30 p-4 text-center transition-colors duration-200',
          { 'border-primary bg-primary/10': isDragging },
          'data-[has-files=true]:min-h-0 data-[has-files=true]:p-4'
        )}
        data-has-files={files.length > 0}
      >
        <input {...getInputProps()} />

        {files.length > 0 ? (
          // --- Grid View ---
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Uploaded Charts ({files.length} / {maxFiles})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFileDialog}
                disabled={files.length >= maxFiles}
              >
                <UploadCloud className="mr-2 h-4 w-4" /> Add More
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="relative aspect-video rounded-md overflow-hidden group border"
                  >
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="h-full w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                      className="absolute top-1 right-1 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // --- Empty State ---
          <div
            className="flex cursor-pointer flex-col items-center"
            onClick={openFileDialog}
          >
            <FileImage className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 font-semibold">
              Drag & drop charts here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Up to {maxFiles} images
            </p>
          </div>
        )}
      </div>

      {/* --- Error Display --- */}
      {errors.length > 0 && (
        <div
          className="text-destructive flex items-center gap-1.5 text-sm"
          role="alert"
        >
          <AlertCircleIcon className="h-4 w-4 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  );
}
