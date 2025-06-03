// app/dashboard/softwareLicenses/components/softwareLicenseList/utils.ts

export function capitalize(str: string): string {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatDate(dateString: string | null | undefined, includeTime: boolean = false): string {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Fecha Inválida";
        
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'UTC', // Asumir que las fechas de DB son UTC o sin zona horaria específica
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return date.toLocaleDateString('es-UY', options); // Ajustar locale si es necesario
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "Error Fecha";
    }
}

export function formatLicenseType(typeKey: string): string {
    if (!typeKey) return "N/A";
    return typeKey.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Podrías añadir más helpers aquí, como para determinar el estado de la licencia (Activa, Expirada, etc.)
export function getLicenseChipStatus(license: { expiry_date: string | null, deleted_at: string | null }): { label: string, color: "success" | "warning" | "danger" | "default" | "secondary" | "primary" } {
    if (license.deleted_at) {
        return { label: "Eliminada", color: "default" };
    }
    if (!license.expiry_date) {
        return { label: "Perpetua", color: "success" };
    }
    const आज = new Date();
    const expiry = new Date(license.expiry_date);
    // Ajustar fechas a medianoche UTC para comparación de solo fecha
    आज.setUTCHours(0, 0, 0, 0);
    expiry.setUTCHours(0, 0, 0, 0);

    if (expiry < आज) {
        return { label: "Expirada", color: "danger" };
    }
    const thirtyDaysFromNow = new Date(आज);
    thirtyDaysFromNow.setUTCDate(thirtyDaysFromNow.getUTCDate() + 30);
    if (expiry <= thirtyDaysFromNow) {
        return { label: "Expira Pronto", color: "warning" };
    }
    return { label: "Activa", color: "success" };
}