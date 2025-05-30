import { SVGProps } from 'react'

export type IconSvgProps = SVGProps<SVGSVGElement> & {
    size?: number
}

export interface Usuario {
    ci: number
    nombre: string
    apellido: string
    rol: string
    seccion: string
    estado?: 'active' | 'disabled' | 'vacation'
    avatar?: string
    edad?: number
    fecha_nacimiento: Date
    email?: string
}

export interface UsuarioRol {
    id_usuario_rol: number
    ci: number
    id_rol: number
}

export interface Empresa {
    rut: string
    tel?: string
    nombre_fantasia?: string
    razon_social?: string
    email?: string
}

export interface Ubicacion {
    nombre: string
}

export interface Mueve {
    ci_usuario: number
    nro_serie_bien: string
    fecha: Date
    firma?: string
}

export interface Movimiento {
    id: number
    lugar_destino?: string
    ubicacion?: string
    sector?: string
    fecha_recibido?: Date
    persona_recibe?: string
    dependencia?: string
    tipo_ubicacion?: string
    fecha_movimiento?: Date
    firma_movimiento?: string
    ci_usuario: number
    nro_serie_bien: string
}

export interface Asset {
    nro_serie: string
    codigo_inventario: string
    descripcion: string
    producto: string
    fecha_garantia?: Date
    seccion: string
    rut_empresa?: string
    fecha_venta?: Date
    nro_factura?: string
    procedimiento_adquisicion?: string
    estado?: string
    avatar?: string
}

export interface Seccion {
    nombre: string
    nivel_conduccion: number
    email?: string
    dependencia?: string
}

export interface Rol {
    id: number
    nombre: string
    descripcion?: string
}

export interface Ubicacion {
    nombre: string
    dependencia: string
}
