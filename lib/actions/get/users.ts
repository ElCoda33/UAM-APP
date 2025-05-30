'use server'

import dbquery from '../../models/conection'

export const getAUser = async (ci: number | string) => {
    try {
        const [results] = await dbquery(`SELECT * FROM usuarios WHERE ci=${ci}`)

        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}
