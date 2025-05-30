export const dictionary = (languaje: String) => {
    const spanish = {}

    const english = {}

    if (languaje === 'en') {
        return english
    } else return spanish
}
