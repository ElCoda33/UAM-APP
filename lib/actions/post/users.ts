'use server'
import bcrypt from 'bcrypt'

import dbquery from '../../models/conection'

export const cUser = async () => {
    return {
        getUser: async (ci: number | string) => {
            return dbquery(`SELECT *
                    FROM usuarios
                    WHERE ci = ${ci}`)
        },
    }
}

export async function userAdd(formData: FormData) {
    const ci = formData.get('ci')
    const nombre = formData.get('nombre')
    const apellido = formData.get('apellido')
    const fecha_nacimiento = formData.get('fecha_nacimiento')
    const email = formData.get('email')
    const seccion = formData.get('seccion')
    const rol = formData.get('rol')
    const estado = formData.get('estado')
    const myPlaintextPassword: any = formData.get('password')

    if (
        ci &&
        seccion &&
        nombre &&
        apellido &&
        email &&
        rol &&
        myPlaintextPassword
    ) {
        try {
            bcrypt.hash(myPlaintextPassword, 10, function (err, hash) {
                dbquery(
                    `INSERT INTO usuarios(ci,password, nombre,apellido,fecha_nacimiento,email,seccion,rol,estado) VALUES(${ci},'${hash}','${nombre}','${apellido}','${fecha_nacimiento}','${email}','${seccion}','${rol}','${estado}')`
                )
            })

            return [ci]
        } catch (err: any) {
            if (err.errno === 1062) {
                return 'Un item igual ya existe'
            }
        }
    } else {
        return 'No es posible ya que hay campos obligatorios incompletos'
    }
}

export async function userDisabled(ci: any) {
    try {
        await dbquery(
            `UPDATE usuarios SET estado = 'disabled' WHERE ci = '${ci}';`
        )
        const [results] = await dbquery('SELECT * FROM usuarios')

        return results
    } catch (error) {
        return `'${error}'`
    }
}

export async function userActive(ci: any) {
    try {
        await dbquery(
            `UPDATE usuarios SET estado = 'active' WHERE ci = '${ci}';`
        )
        const [results] = await dbquery('SELECT * FROM usuarios')

        return results
    } catch (error) {
        return `'${error}'`
    }
}

export const usersUpdate = async (
    formData: FormData,
    oldName: string | undefined | number
) => {
    const ci = formData.get('ci')
    const nombre = formData.get('nombre')
    const apellido = formData.get('apellido')
    const fecha_nacimiento = (
        formData.get('fecha_nacimiento') as string
    )?.split('T')[0]
    const email = formData.get('email')
    const seccion = formData.get('seccion')
    const rol = formData.get('rol')
    const estado = formData.get('estado')
    const myPlaintextPassword: any = formData.get('password')

    if (myPlaintextPassword) {
        try {
            bcrypt.hash(myPlaintextPassword, 10, function (err, hash) {
                dbquery(
                    ` UPDATE usuarios
            SET seccion = '${seccion}', estado = '${estado}', fecha_nacimiento = '${fecha_nacimiento}', 
            apellido = '${apellido}', nombre = '${nombre}', ci = '${ci}', rol = '${rol}', email = '${email}', password = '${hash}'
            WHERE ci = '${oldName}';`
                )
            })
            const [result] = await dbquery(`SELECT * FROM usuarios;`)

            return result
        } catch (err: any) {
            if (err.errno === 1062) {
                return 'Un item igual ya existe'
            }
        }
    } else {
        if (ci && seccion && nombre && apellido && email && rol) {
            try {
                const updateQuery = `
        UPDATE usuarios
        SET seccion = '${seccion}', estado = '${estado}', fecha_nacimiento = '${fecha_nacimiento}', 
            apellido = '${apellido}', nombre = '${nombre}', ci = '${ci}', rol = '${rol}', email = '${email}'
        WHERE ci = '${oldName}';
      `

                await dbquery(updateQuery)

                const [result] = await dbquery(`SELECT * FROM usuarios;`)

                return result
            } catch (err: any) {
                if (err.errno === 1062) {
                    return 'Un item igual ya existe'
                }

                return 'Error al actualizar el usuario'
            }
        } else {
            return 'No es posible ya que hay campos obligatorios incompletos'
        }
    }
}
