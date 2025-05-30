'use server'

import dbquery from '../../models/conection'

export async function moveAsset(formData: FormData) {
    const lugar_destino = formData.get('lugar_destino')
    const persona_recibe = formData.get('persona_recibe')
    const tipo_ubicacion = formData.get('tipo_ubicacion')
    const ci_usuario = formData.get('ci_usuario')
    const fecha_movimiento: any = formData.get('fecha_movimiento')
    const nro_serie_bien = formData.get('nro_serie_bien')
    const seccion_transfiere = formData.get('seccion_transfiere')
    const fecha_recibido: any = formData.get('fecha_recibido')
    const dependencia = formData.get('dependencia')

    if (lugar_destino && persona_recibe && tipo_ubicacion) {
        try {
            await dbquery(
                `INSERT INTO mueve (ci_usuario, nro_serie_bien, fecha) VALUES (${ci_usuario},'${nro_serie_bien}','${fecha_movimiento.split('T')[0]}');`
            )
            await dbquery(
                `UPDATE  bienes
         SET seccion = '${dependencia}'
         WHERE nro_serie = '${nro_serie_bien}'`
            )
            await dbquery(
                `INSERT INTO movimientos 
         (seccion_transfiere,lugar_destino, sector, fecha_recibido, persona_recibe, dependencia, tipo_ubicacion, fecha_movimiento, ci_usuario, nro_serie_bien) 
         VALUES 
         ('${seccion_transfiere}','${lugar_destino}','${dependencia}','${fecha_recibido.split('T')[0]}','${persona_recibe}','${dependencia}','${tipo_ubicacion}','${fecha_movimiento.split('T')[0]}',${ci_usuario},'${nro_serie_bien}')`
            )

            return ['Movimiento realizado correctamente']
        } catch (err: any) {
            if (err.errno === 1062) {
                return 'Un item igual ya existe'
            }
        }
    } else {
        return 'No es posible ya que hay campos obligatorios incompletos'
    }
}
