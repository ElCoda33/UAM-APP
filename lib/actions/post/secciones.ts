'use server'

import dbquery from '../../models/conection'

export const sectionUpdate = async (
    formData: FormData,
    oldName: string | undefined
) => {
    const nombre = formData.get('nombre')
    const nivel_conduccion = formData.get('nivel_conduccion')
    const dependencia = formData.get('dependencia')
    const email = formData.get('email')

    if (nombre && nivel_conduccion && dependencia) {
        try {
            await dbquery(
                `UPDATE secciones
               SET nombre='${nombre}', nivel_conduccion='${nivel_conduccion}', dependencia='${dependencia}', email='${email}'
               WHERE nombre='${oldName}';`
            )
            const [result] = await dbquery(`SELECT * FROM secciones;`)

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

export const sectionAdd = async (formData: FormData) => {
    const nombre = formData.get('nombre')
    const nivel_conduccion = formData.get('nivel_conduccion')
    const dependencia = formData.get('dependencia')

    if (nombre && nivel_conduccion && dependencia) {
        try {
            await dbquery(
                `insert into secciones(nombre,nivel_conduccion,dependencia) values('${nombre}',${nivel_conduccion},'${dependencia}')`
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

export async function sections() {
    const [results] = await dbquery('select * from secciones')

    return results
}
