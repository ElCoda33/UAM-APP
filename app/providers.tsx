'use client'

import * as React from 'react'
import { NextUIProvider } from '@nextui-org/system'
import { useRouter } from 'next/navigation'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ThemeProviderProps } from 'next-themes/dist/types'
import { SnackbarProvider } from 'notistack'
import { createContext } from 'react'
import NextAuthProvider from "./providers/nextAuthProvider";

import { userData } from '../lib/session/tokenCookies'
import { logout } from '../lib/session/logout'

export interface ProvidersProps {
    children: React.ReactNode
    themeProps?: ThemeProviderProps
}

export const UserContext = createContext(null)

export function Providers({ children, themeProps }: ProvidersProps) {
    const [user, setUser] = React.useState(null)
    const router = useRouter()

    React.useEffect(() => {
        userData()
            .then((res: any) => {
                if (res.ci) {
                    setUser(res)
                }
            })
            .catch(() => {
                logout()
                setUser(null)
            })
    }, [])

    return (


        <NextUIProvider navigate={router.push}>
            <SnackbarProvider maxSnack={3}>
                <NextThemesProvider {...themeProps}>
                    <UserContext.Provider value={user}>
                        <NextAuthProvider>

                            {children}

                        </NextAuthProvider>
                    </UserContext.Provider>
                </NextThemesProvider>
            </SnackbarProvider>
        </NextUIProvider>
    )
}
