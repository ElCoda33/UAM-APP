'use server'

import dbquery from '../../models/conection'

export async function fetchCompanies() {
    try {
        const [results] = await dbquery('SELECT * FROM empresas')

        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}
