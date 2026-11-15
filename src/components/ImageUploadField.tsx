import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { ResilientImage } from '@/src/components/BrandIcons';
import { processImageUpload, type ImageUploadPreset } from '@/src/lib/imageUpload';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  preset: ImageUploadPreset;
  disabled?: boolean;
  emptyHint?: string;
  previewAspect?: 'square' | 'wide' | 'icon';
  onChange: (nextDataUrl: string) => void;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  preset,
  disabled = false,
  emptyHint = 'PNG, JPG, WebP, or GIF',
  previewAspect = 'square',
  onChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setError('');
    setProcessing(true);
    try {
      const optimized = await processImageUpload(file, preset);
      onChange(optimized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process image.');
    } finally {
      setProcessing(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const previewBoxClass =
    previewAspect === 'wide'
      ? 'h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-white/12 bg-[#0D0F15]'
      : previewAspect === 'icon'
        ? 'h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/12 bg-[#0D0F15]'
        : 'h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/12 bg-[#0D0F15]';

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-300">{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
        disabled={disabled || processing}
        onChange={(e) => void handleFile(e.target.files?.[0])}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`mt-1.5 flex items-center justify-between gap-3 rounded-lg border p-2.5 transition-colors ${
          dragOver
            ? 'border-white/50 bg-white/[0.06]'
            : 'border-white/15 bg-[#07080A]'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {value ? (
            <div className={previewBoxClass}>
              <ResilientImage
                src={value}
                alt={label}
                className="h-full w-full object-cover"
                fallbackLabel={label}
              />
            </div>
          ) : (
            <div
              className={`${previewBoxClass} flex items-center justify-center text-zinc-500`}
            >
              <ImagePlus size={18} />
            </div>
          )}

          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-zinc-200">
              {processing
                ? 'Optimizing image...'
                : value
                  ? 'Custom image ready'
                  : 'No image selected'}
            </div>
            <div className="truncate text-[11px] text-zinc-500">{emptyHint}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={disabled || processing}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white hover:border-white/30 hover:bg-white/10 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {processing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            {value ? 'Replace' : 'Upload'}
          </button>

          {value && (
            <button
              type="button"
              disabled={disabled || processing}
              onClick={() => {
                setError('');
                onChange('');
              }}
              aria-label={`Remove ${label}`}
              title={`Remove ${label}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
};
