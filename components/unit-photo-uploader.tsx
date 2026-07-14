import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, Image as ImageIcon } from "lucide-react";

// Zero-cost client-side compression using Canvas (no paid lib, no external API)
async function compressImage(file: File, maxWidth = 1024, quality = 0.6): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        } else {
          width = (width * maxWidth) / height;
          height = maxWidth;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compression failed"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
}

type Props = {
  serviceUnitId: string;
  type: "intake" | "delivery";
  existingUrl?: string | null;
  onUploaded?: (url: string) => void;
};

export function UnitPhotoUploader({ serviceUnitId, type, existingUrl, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let blob: Blob = file;
      // Compress if > 300KB
      if (file.size > 300 * 1024) {
        try {
          blob = await compressImage(file, 1024, 0.65);
        } catch {
          // fallback to original if compression fails
          blob = file;
        }
      }

      const ext = "jpg";
      const path = `${serviceUnitId}/${type}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("unit-media").upload(path, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/jpeg",
      });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("unit-media").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const field = type === "intake" ? "intake_photo_url" : "delivery_photo_url";
      const { error: dbErr } = await supabase.from("service_units").update({ [field]: publicUrl } as any).eq("id", serviceUnitId);
      if (dbErr) throw dbErr;

      setPreview(publicUrl);
      onUploaded?.(publicUrl);
      toast.success(type === "intake" ? "تم رفع صورة الاستلام" : "تم رفع صورة التسليم");
    } catch (err: any) {
      toast.error(err.message || "فشل الرفع");
    } finally {
      setUploading(false);
      // reset input
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} disabled={uploading} />
          <Button variant="outline" size="sm" disabled={uploading} asChild>
            <span>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Camera className="w-4 h-4 me-2" />}
              {type === "intake" ? "رفع صورة الاستلام" : "رفع صورة التسليم"}
            </span>
          </Button>
        </label>
        {preview && (
          <a href={preview} target="_blank" rel="noreferrer" className="text-xs text-teal-700 hover:underline flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> عرض
          </a>
        )}
      </div>
      {preview && (
        <img src={preview} alt={`${type} photo`} className="w-24 h-24 object-cover rounded-lg border" />
      )}
    </div>
  );
}
