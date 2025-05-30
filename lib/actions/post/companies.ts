'use server'

import dbquery from '../../models/conection'

export async function companies() {
    const [results] = await dbquery('select * from secciones')

    return results
}

export async function companiesAdd(formData: FormData) {
    const nombre_fantasia = formData.get('nombre_fantasia')
    const razon_social = formData.get('razon_social')
    const email = formData.get('email')
    const tel = formData.get('tel')
    const rut = formData.get('rut')

    if (nombre_fantasia && razon_social && email && rut) {
        try {
            await dbquery(
                `insert into empresas(rut,razon_social,nombre_fantasia,email,tel) values('${rut}','${razon_social}','${nombre_fantasia}','${email}','${tel}')`
            )

            return [razon_social]
        } catch (err: any) {
            if (err.errno === 1062) {
                return 'Un item igual ya existe'
            }
        }
    } else {
        return 'No es posible ya que hay campos obligatorios incompletos'
    }
}

export const companyUpdate = async (
    formData: FormData,
    oldName: string | undefined | number
) => {
    const nombre_fantasia = formData.get('nombre_fantasia')
    const razon_social = formData.get('razon_social')
    const email = formData.get('email')
    const tel = formData.get('tel')
    const rut = formData.get('rut')

    if (nombre_fantasia && razon_social && email && rut) {
        try {
            const updateQuery = ` UPDATE  empresas
        SET  rut='${rut}',razon_social='${razon_social}',nombre_fantasia='${nombre_fantasia}',email='${email}',tel='${tel}'
        WHERE rut='${oldName}'`

            await dbquery(updateQuery)

            const [result] = await dbquery(`SELECT * FROM empresas;`)

            return result
        } catch (err: any) {
            if (err.errno === 1062) {
                return 'Un item igual ya existe'
            }

            return 'Error al actualizar la empresa'
        }
    } else {
        return 'No es posible ya que hay campos obligatorios incompletos'
    }
}
