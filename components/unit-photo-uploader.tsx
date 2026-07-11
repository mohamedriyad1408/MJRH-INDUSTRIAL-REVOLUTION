import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, Image as ImageIcon } from "lucide-react";
import imageCompression from "browser-image-compression";

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
      // Client-side compression — zero-cost, free lib
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });

      const ext = compressed.name.split(".").pop() || "jpg";
      const path = `${serviceUnitId}/${type}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("unit-media").upload(path, compressed, {
        cacheControl: "3600",
        upsert: true,
        contentType: compressed.type,
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
