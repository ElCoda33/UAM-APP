// app/dashboard/profile/components/avatarUpload.tsx
"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Avatar as NextUIAvatar, Button, Progress } from "@heroui/react";
import { toast } from "react-hot-toast"; // Sigue siendo necesario para toast.error y toast.loading
import { useSession } from "next-auth/react";
import { EditIcon } from "@/components/icons/EditIcon";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null | undefined;
  onUploadSuccess: (newAvatarUrl: string) => void;
}

export default function AvatarUpload({ userId, currentAvatarUrl, onUploadSuccess }: AvatarUploadProps) {
  const { data: session, update: updateSession } = useSession();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentAvatarUrl || null);
  }, [currentAvatarUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de archivo no permitido. Solo JPG, PNG, WEBP, GIF.');
        event.target.value = "";
        return;
      }
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeInBytes) {
        toast.error(`El archivo es demasiado grande. Máximo: ${maxSizeInBytes / (1024 * 1024)}MB.`);
        event.target.value = "";
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
      setPreviewUrl(currentAvatarUrl || null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Por favor, selecciona una imagen primero.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading("Subiendo imagen...");

    const formData = new FormData();
    formData.append("avatar", selectedFile);

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
      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (!response.ok) {
        setUploadProgress(0);
        toast.error(data.message || "Error al subir el avatar.", { id: toastId });
        throw new Error(data.message || "Error en la subida");
      }

      setUploadProgress(100);
      // --- SE ELIMINA EL TOAST.SUCCESS DE AQUÍ ---
      // toast.success(data.message || "Avatar procesado correctamente.", { id: toastId }); 
      toast.dismiss(toastId); // Quitar el toast de "Subiendo imagen..."

      if (session?.user?.id === userId) {
        console.log("AVATAR_UPLOAD: Coincide el ID de usuario. Llamando a updateSession con:", { image: data.avatarUrl });
        await updateSession({ image: data.avatarUrl });
      } else {
        console.log("AVATAR_UPLOAD: IDs de usuario no coinciden. No se llama a updateSession.",
          `Session User ID: ${session?.user?.id}, Target User ID: ${userId}`);
      }

      onUploadSuccess(data.avatarUrl); // Notificar al padre
      setSelectedFile(null);

    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      if (toastId) toast.dismiss(toastId); // Asegurarse de quitar el loading toast en caso de error
      toast.error(error.message || "Ocurrió un error inesperado al subir el avatar.");
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
        className="relative group cursor-pointer"
        onClick={triggerFileInput}
        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerFileInput(); }}
        role="button"
        tabIndex={0}
        aria-label="Cambiar foto de perfil"
        title="Haz clic para cambiar la foto de perfil"
      >
        <NextUIAvatar
          src={previewUrl || undefined}
          name={session?.user?.id === userId
            ? (session?.user?.name?.charAt(0) || session?.user?.firstName?.charAt(0) || 'P')
            : 'U' // Podrías pasar el nombre del usuario editado como prop para una mejor inicial
          }
          className="w-32 h-32 md:w-40 md:h-40 text-large border-2 border-primary group-hover:border-secondary transition-colors"
          isBordered
          color="primary"
        />
        {!isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 ease-in-out rounded-full pointer-events-none">
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
        id={`avatar-upload-input-${userId}`}
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
            Confirmar y Subir Imagen
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