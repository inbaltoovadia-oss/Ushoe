import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Lock, X, Upload, ImageOff } from "lucide-react";

export default function ImagePicker({ shoe, onSaved, onClose }) {
  const [preview, setPreview] = useState(shoe.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedUrl(file_url);
    setUploading(false);
  };

  const save = async () => {
    if (!uploadedUrl) return;
    setSaving(true);
    await base44.entities.Shoe.update(shoe.id, {
      image_url: uploadedUrl,
      image_locked: true,
    });
    setSaving(false);
    onSaved({ ...shoe, image_url: uploadedUrl, image_locked: true });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="font-heading font-bold text-lg">{shoe.name}</h2>
            <p className="text-sm text-muted-foreground">{shoe.brand} · {shoe.category}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Upload Area */}
        <div className="px-6 py-6 space-y-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border hover:border-primary/60 rounded-2xl transition-colors aspect-square flex flex-col items-center justify-center gap-3 bg-secondary/30 hover:bg-primary/5 overflow-hidden relative"
          >
            {preview ? (
              <>
                <img src={preview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-semibold flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Change Photo
                  </span>
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Click to upload a photo</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WebP</p>
              </>
            )}
          </button>

          {uploadedUrl && !uploading && (
            <p className="text-xs text-green-600 dark:text-green-400 text-center">
              ✓ Photo uploaded — ready to save
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!uploadedUrl || uploading || saving}
            className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {saving ? "Saving…" : "Save & Lock"}
          </button>
        </div>
      </div>
    </div>
  );
}