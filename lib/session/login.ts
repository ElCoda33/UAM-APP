'use server'
import { sign } from 'jsonwebtoken'
import bcrypt from 'bcrypt'

import { fetchUsers } from '../data/data'

import { setTokenCookie } from './tokenCookies'

export async function login(formData: FormData) {
    const ci: any = formData.get('ci')
    const password: any = formData.get('password')

    const users: any = await fetchUsers()

    const user = users.find((user: any) => user.ci == ci)

    if (user && bcrypt.compareSync(password, user.password)) {
        delete user.password
        const token = sign(user, process.env.JWT_SECRET!, { expiresIn: '7d' })

        setTokenCookie(token)

        return { message: 'token creado correctamente' }
    } else {
        return { error: { error: 'Usuario y/o contraseña incorrectos' } }
    }
}
