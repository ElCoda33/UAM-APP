// app/login/page.tsx
"use client";

import { useState, FormEvent, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button, Card, CardHeader, CardBody, CardFooter, Link as NextUILink, Divider, CircularProgress } from "@heroui/react";
import { toast } from "react-hot-toast";
import { EyeFilledIcon } from "@/components/inputs/icons/EyeSlashFilledIcon";
import { EyeSlashFilledIcon } from "@/components/EyeSlashFilledlcon";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Renombrado para claridad (estado de envío del formulario)
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession(); // Renombrado para claridad (estado de la sesión)
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/users";

  // 1. Efecto para redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.push(callbackUrl);
    }
  }, [sessionStatus, router, callbackUrl]);

  // 2. Efecto para mostrar errores de NextAuth que vienen en la URL
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      let errorMessage = "Error de autenticación.";
      if (error === "CredentialsSignin") {
        errorMessage = "Email o contraseña incorrectos. Inténtalo de nuevo.";
      } else if (error === "Callback") {
        errorMessage = "Error en el proveedor OAuth. Inténtalo de nuevo.";
      }
      toast.error(errorMessage, { id: 'authError' });
      router.replace('/login', { scroll: false }); // Limpiar error de URL sin recargar scroll
    }
  }, [searchParams, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    toast.dismiss('authError');

    if (!email || !password) {
      toast.error("Por favor, ingresa email y contraseña.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        let errorMessage = "Error al iniciar sesión.";
        if (result.error === "CredentialsSignin") {
          errorMessage = "Email o contraseña incorrectos.";
        } else {
          errorMessage = `Error: ${result.error}`;
          console.error("SignIn Error Details:", result);
        }
        toast.error(errorMessage);
      } else if (result?.ok) {
        toast.success("¡Inicio de sesión exitoso!");
        // La redirección la manejará el useEffect cuando sessionStatus cambie a "authenticated"
        router.refresh(); // Importante para actualizar el estado del servidor
      } else {
        toast.error("Respuesta inesperada del servidor de autenticación.");
      }
    } catch (err) {
      console.error("Error en handleSubmit signIn:", err);
      toast.error("No se pudo conectar con el servidor. Inténtalo más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Renderizado condicional basado en el estado de la sesión

  // Si la sesión se está cargando inicialmente
  if (sessionStatus === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
        <CircularProgress label="Cargando sesión..." aria-label="Cargando sesión" />
      </div>
    );
  }

  // Si el usuario ya está autenticado (el useEffect intentará redirigir, esto es un fallback o para el instante antes del redirect)
  if (sessionStatus === "authenticated") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
        <CircularProgress label="Redirigiendo..." aria-label="Redirigiendo" />
      </div>
    );
  }

  // Si no está autenticado (sessionStatus === "unauthenticated"), muestra el formulario
  // (Este es el único caso restante donde se debe mostrar el formulario)
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="flex flex-col items-center pt-6">
          <h1 className="text-3xl font-bold text-primary">Bienvenido</h1>
          <p className="text-sm text-default-500">Inicia sesión para acceder a UAM App</p>
        </CardHeader>
        <CardBody className="space-y-6 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              isRequired
              isClearable
              label="Email"
              type="email"
              value={email}
              onValueChange={setEmail}
              placeholder="tu@email.com"
              variant="bordered"
              onClear={() => setEmail("")}
              autoComplete="email"
              isDisabled={isSubmitting}
            />
            <Input
              isRequired
              label="Contraseña"
              value={password}
              onValueChange={setPassword}
              placeholder="Tu contraseña"
              variant="bordered"
              autoComplete="current-password"
              isDisabled={isSubmitting}
              type={isVisible ? "text" : "password"} endContent={
                <button
                  aria-label="toggle password visibility"
                  className="focus:outline-none"
                  type="button"
                  onClick={toggleVisibility}
                >
                  {isVisible ? (
                    <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                  ) : (
                    <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                  )}
                </button>
              }
            />
            <Button
              type="submit"
              color="primary"
              fullWidth
              isLoading={isSubmitting} // Usar el estado de envío del formulario aquí
              size="lg"
            >
              {isSubmitting ? "Iniciando Sesión..." : "Entrar"}
            </Button>
          </form>
        </CardBody>
        <Divider />
        <CardFooter className="flex-col items-center pb-6">
          <p className="text-xs text-default-500 mt-4">
            © {new Date().getFullYear()} UAM App. Todos los derechos reservados.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}