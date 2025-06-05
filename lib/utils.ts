import { Revenue } from './definitions'

export const formatCurrency = (amount: number) => {
    return (amount / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    })
}

export const formatDateToLocal = (
    dateStr: string,
    locale: string = 'en-US'
) => {
    const date = new Date(dateStr)
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }
    const formatter = new Intl.DateTimeFormat(locale, options)

    return formatter.format(date)




}


// --- NUEVA FUNCIÓN ---
export interface CustomDateOptions extends Intl.DateTimeFormatOptions {
    locale?: string;
}

/**
 * Formatea una cadena de fecha a un formato personalizado.
 * @param dateStr - La cadena de fecha a formatear (puede ser YYYY-MM-DD o un timestamp ISO).
 * @param options - Opciones de Intl.DateTimeFormatOptions, incluyendo 'locale'.
 * @returns La fecha formateada como string, o "N/A" / "Fecha Inválida" / "Error Fecha".
 */
export const formatCustomDate = (
    dateStr: string | null | undefined,
    options?: CustomDateOptions
): string => {
    if (!dateStr) {
        return "N/A";
    }

    try {
        // Las fechas de la BBDD pueden venir como 'YYYY-MM-DD'.
        // Si no es un timestamp ISO completo, new Date() puede interpretarlo en la zona horaria local del servidor.
        // Para asegurar consistencia, si es solo fecha, la tratamos como UTC.
        const date = new Date(dateStr.includes('T') || dateStr.includes('Z') ? dateStr : `${dateStr}T00:00:00Z`);

        if (isNaN(date.getTime())) {
            // console.warn(`formatCustomDate: Cadena de fecha inválida recibida: ${dateStr}`);
            return "Fecha Inválida";
        }

        const defaultOptions: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC', // Es importante especificar timeZone para evitar inconsistencias.
            // Si tus fechas de BBDD son 'YYYY-MM-DD' sin hora, 'UTC' las trata como tal.
            // Si son timestamps completos con zona horaria, esta opción podría necesitar ajuste
            // o ser omitida para usar la zona horaria del timestamp.
            ...options, // Las opciones del usuario sobreescriben las por defecto.
        };

        const locale = options?.locale || 'es-UY'; // Por defecto a español de Uruguay.

        return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
    } catch (e) {
        // console.error(`formatCustomDate: Error formateando la fecha "${dateStr}":`, e);
        return "Error Fecha";
    }
};




export const generateYAxis = (revenue: Revenue[]) => {
    // Calculate what labels we need to display on the y-axis
    // based on highest record and in 1000s
    const yAxisLabels = []
    const highestRecord = Math.max(...revenue.map((month) => month.revenue))
    const topLabel = Math.ceil(highestRecord / 1000) * 1000

    for (let i = topLabel; i >= 0; i -= 1000) {
        yAxisLabels.push(`$${i / 1000}K`)
    }

    return { yAxisLabels, topLabel }
}

export const generatePagination = (currentPage: number, totalPages: number) => {
    // If the total number of pages is 7 or less,
    // display all pages without any ellipsis.
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // If the current page is among the first 3 pages,
    // show the first 3, an ellipsis, and the last 2 pages.
    if (currentPage <= 3) {
        return [1, 2, 3, '...', totalPages - 1, totalPages]
    }

    // If the current page is among the last 3 pages,
    // show the first 2, an ellipsis, and the last 3 pages.
    if (currentPage >= totalPages - 2) {
        return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages]
    }

    // If the current page is somewhere in the middle,
    // show the first page, an ellipsis, the current page and its neighbors,
    // another ellipsis, and the last page.
    return [
        1,
        '...',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        '...',
        totalPages,
    ]
}
