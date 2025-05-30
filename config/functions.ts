const getDate = (date: Date) => {
    try {
        const year = date.getUTCFullYear()
        const month = date.getUTCMonth() + 1 // Los meses van de 1 a 12
        const day = date.getUTCDate()

        return `${day}/${month}/${year}`
    } catch (err) {}
}

export const transDate = (date: string) => {
    let date2 = date.split('/').reverse().join('-')

    return date2
}

export default getDate
