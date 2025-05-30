'use server'

import dbquery from '../../models/conection'

export async function getMovements() {
    try {
        const [results] = await dbquery('SELECT * FROM movimientos')

        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}

export async function getAMovements(nro_serie: any) {
    try {
        const [results] = await dbquery(
            `SELECT * FROM movimientos WHERE nro_serie_bien='${nro_serie}'`
        )

        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}
