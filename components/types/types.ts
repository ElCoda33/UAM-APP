export type User = {
    id: string
    ci: Number
    nombre: string
    apellido: string
    rol: string
    seccion: string
    estado: string
    edad: Number
    avatar: string
    email: string
    fecha_nacimiento: Date
}

export type Company = {
    nombre_fantasia: string
    rut: number
    tel: string
    email: string
    razon_social: string
}

export type Rol = {
    id: number
    nombre: string
    descripcion: string
}
