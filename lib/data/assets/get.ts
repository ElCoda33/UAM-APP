'use server'

import dbquery from '../../models/conection'

export async function fetchAssets() {
    try {
        const [results] = await dbquery('SELECT * FROM bienes')

        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}
