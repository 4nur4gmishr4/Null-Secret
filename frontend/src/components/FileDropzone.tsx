import React, { useCallback } from 'react';

interface FileDropzoneProps {
  files: File[];
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  isDragging,
  setIsDragging,
  onFilesAdded,
  onFileRemoved,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesAdded(Array.from(e.target.files));
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
  }, [setIsDragging]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    onFilesAdded(Array.from(e.dataTransfer.files));
  }, [setIsDragging, onFilesAdded]);

  return (
    <div className="space-y-2">
      <label htmlFor="file-upload" className="label block">Attach files (up to 6 MB combined)</label>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative p-3 transition-colors"
        style={{
          background: isDragging ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
          border: `1px ${isDragging ? 'dashed' : 'solid'} ${isDragging ? 'var(--accent)' : 'var(--border-default)'}`,
        }}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileChange}
          className="w-full text-xs font-medium focus:outline-none cursor-pointer"
          style={{ background: 'transparent', border: 'none' }}
        />
        <p className="text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
          {isDragging ? 'Release to attach the files.' : 'Or drag files anywhere onto this box.'}
        </p>
      </div>
      {files.length > 0 && (
        <ul className="space-y-1 pt-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
              <span className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{(f.size / 1024).toFixed(1)} KB</span>
              <button
                type="button"
                onClick={() => onFileRemoved(i)}
                className="text-[10px] font-bold uppercase underline flex-shrink-0"
                style={{ color: 'var(--text-danger)' }}
                aria-label={`Remove ${f.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
