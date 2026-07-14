import { useState, useEffect, useRef } from 'react';
import { Eye, Trash2, Paperclip, Plus, FileText } from 'lucide-react';
import heic2any from 'heic2any';
import { authFetch } from '../api/client';

export interface TicketImage {
  id: number;
  ticket_id: number;
  position: number;
  created_at: string;
  mime_type?: string | null;
  original_filename?: string | null;
}

function isImageType(mimeType: string | null | undefined): boolean {
  return !!(mimeType && mimeType.toLowerCase().startsWith('image/'));
}

function FileTypeIcon({ mimeType, filename }: { mimeType?: string | null; filename?: string | null }) {
  const mt = (mimeType || '').toLowerCase();
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  const isPdf = mt.includes('pdf') || ext === 'pdf';
  const isExcel = mt.includes('spreadsheet') || mt.includes('excel') || ext === 'xls' || ext === 'xlsx';
  const isWord = mt.includes('word') || mt.includes('document') || ext === 'doc' || ext === 'docx';
  const label = isPdf ? 'PDF' : isExcel ? 'Excel' : isWord ? 'Word' : 'File';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted bg-gradient-to-br from-surface-elevated to-bg p-4">
      <FileText className="w-10 h-10 shrink-0 text-primary/70" aria-hidden />
      <span className="text-xs font-medium mt-2 text-center truncate w-full px-2">{label}</span>
    </div>
  );
}

interface AttachmentGalleryProps {
  ticketId: number;
  images: TicketImage[];
  apiBase: string;
  maxImages?: number;
  onImagesChange: (images: TicketImage[]) => void;
  onError?: (message: string) => void;
}

const AttachmentGallery = ({
  ticketId,
  images,
  apiBase,
  maxImages = 10,
  onImagesChange,
  onError,
}: AttachmentGalleryProps) => {
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [addingImage, setAddingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [viewingImageId, setViewingImageId] = useState<number | null>(null);
  const imageUrlsCreatedRef = useRef<string[]>([]);

  const ticketsApi = `${apiBase}/api/app/tickets`;

  useEffect(() => {
    if (!images.length) {
      setImageUrls({});
      imageUrlsCreatedRef.current = [];
      return () => {};
    }
    let cancelled = false;
    images.forEach((img) => {
      authFetch(`${ticketsApi}/${ticketId}/images/${img.id}`)
        .then((res) => (res.ok ? res.blob() : null))
        .then(async (blob) => {
          if (cancelled || !blob) return;
          const mt = (blob.type || img.mime_type || '').toLowerCase();
          const isHeic = mt.includes('heic') || mt.includes('heif');
          let displayBlob = blob;
          if (isHeic) {
            try {
              const converted = await heic2any({ blob, toType: 'image/jpeg' });
              displayBlob = Array.isArray(converted) ? converted[0] : converted;
            } catch {
              /* use original */
            }
          }
          if (cancelled) return;
          const url = URL.createObjectURL(displayBlob);
          imageUrlsCreatedRef.current.push(url);
          setImageUrls((prev) => ({ ...prev, [img.id]: url }));
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      imageUrlsCreatedRef.current.forEach(URL.revokeObjectURL);
      imageUrlsCreatedRef.current = [];
    };
  }, [ticketId, images, ticketsApi]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleViewAttachment = (imageId: number) => {
    const img = images.find((i) => i.id === imageId);
    if (img && isImageType(img.mime_type)) {
      setViewingImageId(imageId);
    } else {
      const url = imageUrls[imageId];
      if (url) window.open(url, '_blank');
    }
  };

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (images.length >= maxImages) {
      onError?.(`Maximum ${maxImages} attachments per ticket`);
      return;
    }
    setAddingImage(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await authFetch(`${ticketsApi}/${ticketId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: base64,
          encoding: 'base64',
          mime_type: file.type || 'application/octet-stream',
          original_filename: file.name,
        }),
      });
      if (!res.ok) throw new Error('Failed to add attachment');
      const added = await res.json();
      onImagesChange([...images, added].sort((a, b) => a.position - b.position));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to add attachment');
    } finally {
      setAddingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm('Remove this attachment?')) return;
    setDeletingImageId(imageId);
    try {
      const res = await authFetch(`${ticketsApi}/${ticketId}/images/${imageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete image');
      if (imageUrls[imageId]) {
        URL.revokeObjectURL(imageUrls[imageId]);
        setImageUrls((prev) => {
          const next = { ...prev };
          delete next[imageId];
          return next;
        });
      }
      onImagesChange(images.filter((i) => i.id !== imageId));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setDeletingImageId(null);
    }
  };

  const viewingUrl = viewingImageId != null ? imageUrls[viewingImageId] : null;
  const viewingImage = viewingImageId != null ? images.find((i) => i.id === viewingImageId) : null;

  return (
    <>
      {viewingImageId != null && viewingUrl && viewingImage && (
        <div className="modal-overlay safe-area-pb" onClick={() => setViewingImageId(null)}>
          <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={viewingUrl}
              alt={viewingImage.original_filename || 'Attachment'}
              className="max-h-[80vh] w-full object-contain rounded-lg"
            />
            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setViewingImageId(null)} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="attachment-grid">
        {images.map((img, idx) => {
          const isImage = isImageType(img.mime_type);
          const url = imageUrls[img.id];
          const filename = img.original_filename || `Attachment ${idx + 1}`;
          return (
            <div key={img.id} className="attachment-tile group">
              {isImage ? (
                url ? (
                  <img
                    src={url}
                    alt={filename}
                    className="attachment-tile-preview"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm bg-surface-elevated">
                    Loading…
                  </div>
                )
              ) : (
                <FileTypeIcon mimeType={img.mime_type} filename={img.original_filename} />
              )}

              <div className="attachment-tile-overlay">
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => url && handleViewAttachment(img.id)}
                    disabled={!url}
                    className="p-2 rounded-full bg-white/90 text-text hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                    aria-label={`View ${filename}`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    disabled={deletingImageId === img.id}
                    className="p-2 rounded-full bg-white/90 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                    aria-label={`Delete ${filename}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-white text-xs truncate font-medium drop-shadow-sm" title={filename}>
                  {filename}
                </p>
              </div>
            </div>
          );
        })}

        {images.length < maxImages && (
          <label className="attachment-add-tile">
            <input type="file" className="sr-only" onChange={handleAddImage} disabled={addingImage} />
            {addingImage ? (
              <>
                <Paperclip className="w-6 h-6 animate-pulse" aria-hidden />
                <span className="text-sm font-medium">Adding…</span>
              </>
            ) : (
              <>
                <Plus className="w-7 h-7" aria-hidden />
                <span className="text-sm font-medium">Add file</span>
              </>
            )}
          </label>
        )}
      </div>

      {images.length === 0 && !addingImage && (
        <p className="text-text-muted text-sm mt-3">No attachments yet.</p>
      )}
    </>
  );
};

export default AttachmentGallery;
