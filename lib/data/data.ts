'use server'
import dbquery from '../models/conection'

export async function fetchUsers() {
    try {
        const [results] = await dbquery('SELECT * FROM usuarios')
        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}

export async function fetchRoles() {
    try {
        const [results] = await dbquery('SELECT * FROM roles')
        return results
    } catch (error) {
        throw new Error('Failed to fetch revenue data.')
    }
}
