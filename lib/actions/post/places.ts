'use server'

import dbquery from '../../models/conection'

export const placesUpdate = async (
    formData: FormData,
    oldName: string | undefined
) => {
    const nombre = formData.get('nombre')
    const dependencia = formData.get('dependencia')

    if (nombre && dependencia) {
        try {
            await dbquery(
                `UPDATE ubicaciones
               SET nombre='${nombre}', dependencia='${dependencia}'
               WHERE nombre='${oldName}';`
            )
            const [result] = await dbquery(`SELECT * FROM ubicaciones;`)

            return result
        } catch (err: any) {
            if (err.errno === 1062) {
                return 'Un item igual ya existe'
            }
        }
    } else {
        return 'No es posible ya que hay campos obligatorios incompletos'
    }
}

export const placesAdd = async (formData: FormData) => {
    const nombre = formData.get('nombre')
    const dependencia = formData.get('dependencia')

    if (nombre && dependencia) {
        try {
            await dbquery(
                `insert into ubicaciones(nombre,dependencia) values('${nombre}','${dependencia}')`
            )

            return [nombre]
        } catch (err: any) {
            if (err.errno === 1062) {
                return 'Un item igual ya existe'
            }
        }
    } else {
        return 'No es posible ya que hay campos obligatorios incompletos'
    }
}

export const getSection = async (nombre: string) => {
    try {
        const [data] = await dbquery(`SELECT *
        FROM secciones
        WHERE nombre='${nombre}'`)

        return data
    } catch (err) {}
}

export async function places() {
    const [results] = await dbquery('select * from ubicaciones')

    return results
}
