'use server'

import dbquery from '../../models/conection'

export async function fetchSecciones() {
    try {
        const [results] = await dbquery('SELECT * FROM secciones')

        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}
