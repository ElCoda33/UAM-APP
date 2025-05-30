'use client'
export function setCookie(name: any, value: any, days: any) {
    let expires = ''

    if (days) {
        const date = new Date()

        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
        expires = '; expires=' + date.toUTCString()
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/'
}

export function getCookie(name: string) {
    const value = `; ${document.cookie}`
    const parts: any = value.split(`; ${name}=`)

    if (parts.length === 2) {
        return parts.pop().split(';').shift()
    }
}
