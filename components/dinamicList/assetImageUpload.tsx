// app/dashboard/assets/components/AssetImageUpload.tsx
"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Avatar as HeroUIAvatar, Button, Progress } from "@heroui/react"; // Using HeroUI Avatar
import { toast } from "react-hot-toast";
import { EditIcon } from "@/components/icons/EditIcon"; // Re-use existing icon

interface AssetImageUploadProps {
  assetId: string; // ID of the asset
  currentImageUrl: string | null | undefined;
  onUploadSuccess: (newImageUrl: string) => void;
}

export default function AssetImageUpload({ assetId, currentImageUrl, onUploadSuccess }: AssetImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de archivo no permitido. Solo JPG, PNG, WEBP, GIF.');
        event.target.value = ""; // Reset file input
        return;
      }
      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB for asset images, adjust as needed
      if (file.size > maxSizeInBytes) {
        toast.error(`El archivo es demasiado grande. Máximo: ${maxSizeInBytes / (1024 * 1024)}MB.`);
        event.target.value = ""; // Reset file input
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(currentImageUrl || null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Por favor, selecciona una imagen primero.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading("Subiendo imagen del activo...");

    const formData = new FormData();
    formData.append("assetImage", selectedFile); // Changed 'avatar' to 'assetImage'

    // Simulate progress for demo
    let progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const response = await fetch(`/api/assets/${assetId}/image`, { // New API endpoint
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (!response.ok) {
        setUploadProgress(0);
        toast.error(data.message || "Error al subir la imagen del activo.", { id: toastId });
        throw new Error(data.message || "Error en la subida de imagen");
      }

      setUploadProgress(100);
      toast.dismiss(toastId);
      // No toast.success here; let parent component (edit page) handle it after form save.

      onUploadSuccess(data.imageUrl); // Notify parent component
      setSelectedFile(null); // Clear selection after successful temp upload

    } catch (error: any) {
      console.error("Error uploading asset image:", error);
      if (toastId) toast.dismiss(toastId);
      toast.error(error.message || "Ocurrió un error inesperado al subir la imagen.");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div
        className="relative group cursor-pointer w-40 h-40 md:w-48 md:h-48 flex items-center justify-center border-2 border-dashed border-default-300 group-hover:border-primary rounded-md overflow-hidden"
        onClick={triggerFileInput}
        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerFileInput(); }}
        role="button"
        tabIndex={0}
        aria-label="Cambiar imagen del activo"
        title="Haz clic para cambiar la imagen del activo"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Vista previa del activo" className="w-full h-full object-contain" />
        ) : (
          <span className="text-default-500 text-sm">Subir Imagen</span>
        )}
        {!isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 ease-in-out pointer-events-none">
            <EditIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-75 transition-opacity duration-300 ease-in-out" />
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
        id={`asset-image-upload-input-${assetId}`}
        disabled={isUploading}
      />

      {selectedFile && !isUploading && (
        <div className="text-center w-full max-w-xs">
          <p className="text-sm text-default-500 truncate mb-2">
            Archivo: {selectedFile.name}
          </p>
          <Button
            color="success"
            onPress={handleUpload}
            fullWidth
            className="bg-gradient-to-tr from-green-500 to-blue-500 text-white shadow-lg hover:opacity-90"
          >
            Confirmar Imagen
          </Button>
        </div>
      )}

      {isUploading && (
        <div className="w-full max-w-xs px-1">
          <Progress
            aria-label="Subiendo imagen..."
            size="sm"
            value={uploadProgress}
            color={uploadProgress < 100 ? "primary" : "success"}
            showValueLabel={true}
            className="max-w-full"
          />
          <p className="text-sm text-center text-default-500 mt-1">
            {uploadProgress < 100 ? "Subiendo..." : "Completado"}
          </p>
        </div>
      )}
    </div>
  );
}