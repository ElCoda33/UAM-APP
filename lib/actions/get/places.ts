'use server'

import dbquery from '../../models/conection'

export async function getPlaces() {
    try {
        const [results] = await dbquery('SELECT * FROM ubicaciones')

        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}

export async function getSomePlaces(name: any) {
    try {
        const [results] = await dbquery(
            `SELECT * FROM ubicaciones WHERE dependencia = '${name}'`
        )

        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}
