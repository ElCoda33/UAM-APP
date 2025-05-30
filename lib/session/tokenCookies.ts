'use server'

import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function setTokenCookie(data: any) {
    cookies().set({
        name: 'authToken',
        value: data,
        httpOnly: true,
        path: '/',
    })
}
export async function getTokenCookie() {
    const cookieStore = cookies()
    const authToken = cookieStore.get('authToken')

    return authToken
}

// export async function getDataToken(token:any) {
//   console.log("Data TOKEN",jwt.verify(token,process.env.JWT_SECRET!))
// //   jwt.verify(token, process.env.JWT_SECRET!, function(err:any, decoded:any) {
// //   console.log(decoded.foo) // bar
// // });

//   if(token) return jwt.verify(token,process.env.JWT_SECRET!)
//     else return "Is not exist token"

// }

export async function userData() {
    const cookieStore = cookies()
    const authToken: any = cookieStore.get('authToken')

    if (authToken) {
        let decoded = jwt.verify(authToken.value, process.env.JWT_SECRET!)

        return decoded
    } else return false
}
