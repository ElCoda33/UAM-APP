"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Avatar as NextUIAvatar, Button, Progress, Card, CardBody, CardHeader } from "@nextui-org/react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react"; // Para actualizar la sesión del cliente

interface AvatarUploadProps {
  userId: string; // ID del usuario cuyo avatar se está cambiando
  currentAvatarUrl: string | null | undefined;
  onUploadSuccess: (newAvatarUrl: string) => void; // Callback para notificar al padre
}

export default function AvatarUpload({ userId, currentAvatarUrl, onUploadSuccess }: AvatarUploadProps) {
  const { data: session, update: updateSession } = useSession(); // Hook de NextAuth para actualizar la sesión

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Actualizar la preview si el currentAvatarUrl cambia desde el padre
    // (por ejemplo, si la sesión se actualiza por otro medio)
    setPreviewUrl(currentAvatarUrl || null);
  }, [currentAvatarUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de archivo no permitido. Solo JPG, PNG, WEBP, GIF.');
        event.target.value = ""; // Resetear el input
        return;
      }
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeInBytes) {
        toast.error(`El archivo es demasiado grande. Máximo: ${maxSizeInBytes / (1024 * 1024)}MB.`);
        event.target.value = ""; // Resetear el input
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
    toast.loading("Subiendo imagen...", { id: "avatarUploadToast" });

    const formData = new FormData();
    formData.append("avatar", selectedFile);

    // Simulación de progreso (fetch no tiene progreso nativo para subidas)
    // Para un progreso real, necesitarías XHR o librerías de terceros.
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
      const response = await fetch(`/api/users/${userId}/avatar`, { // Llama a tu API
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (!response.ok) {
        setUploadProgress(0);
        toast.error(data.message || "Error al subir el avatar.", { id: "avatarUploadToast" });
        throw new Error(data.message || "Error en la subida");
      }

      setUploadProgress(100);
      toast.success(data.message || "Avatar actualizado correctamente.", { id: "avatarUploadToast" });

      // Actualizar la sesión de NextAuth para reflejar el nuevo avatar inmediatamente
      // Esto es importante para que otros componentes que usen `useSession` (ej. Navbar) se actualicen.
      if (session) {
        console.log("AVATAR_UPLOAD: Llamando a updateSession con:", { image: data.avatarUrl });
        console.log(data.avatarUrl, "DATA NUEVA")
        const updatedSessionResponse = await updateSession({ image: data.avatarUrl });
        console.log("AVATAR_UPLOAD: Respuesta de updateSession:", updatedSessionResponse);
      }

      // Llamar al callback onUploadSuccess para notificar a la página contenedora (ProfilePage)
      // y que esta pueda actualizar su propio estado local para la imagen si es necesario.
      onUploadSuccess(data.avatarUrl);

      setSelectedFile(null); // Limpiar selección después de subir
      // La previewUrl ya se habrá actualizado a través de onUploadSuccess -> setCurrentUserAvatar -> useEffect

    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Ocurrió un error inesperado al subir el avatar.", { id: "avatarUploadToast" });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      // No reseteamos previewUrl aquí, se actualiza a través del prop currentAvatarUrl y onUploadSuccess
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <h3 className="text-lg font-semibold">Actualizar Foto de Perfil</h3>
      </CardHeader>
      <CardBody className="items-center space-y-4 p-6">
        <NextUIAvatar
          src={previewUrl || undefined}
          name={session?.user?.name?.charAt(0) || session?.user?.firstName?.charAt(0) || 'U'}
          className="w-32 h-32 md:w-40 md:h-40 text-large border-2"
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp, image/gif"
          className="hidden"
          id={`avatar-upload-input-${userId}`} // ID único si hay múltiples instancias
        />

        <Button
          onPress={() => fileInputRef.current?.click()}
          variant="flat"
          color="primary"
          isDisabled={isUploading}
          fullWidth
        >
          {selectedFile ? "Cambiar Imagen Seleccionada" : "Seleccionar Nueva Imagen"}
        </Button>

        {selectedFile && !isUploading && (
          <div className="text-center w-full">
            <p className="text-sm text-default-500 truncate">Archivo: {selectedFile.name}</p>
            <Button color="success" onPress={handleUpload} className="mt-2" fullWidth>
              Subir y Guardar Imagen
            </Button>
          </div>
        )}

        {isUploading && (
          <div className="w-full px-1">
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
      </CardBody>
    </Card>
  );
}