// app/dashboard/users/components/userList/utils.ts

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
            timeZone: 'UTC', // Asumir UTC o la zona horaria de tus datos de DB
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            // options.timeZoneName = 'short'; // Opcional
        }
        return date.toLocaleDateString('es-UY', options); // Ajustar locale
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "Error Fecha";
    }
}

export function formatUserRoles(rolesString: string | null | undefined): string[] {
    if (!rolesString) return [];
    return rolesString.split(',').map(r => r.trim()).filter(r => r);
}

export function formatUserStatus(statusKey: string | null | undefined): string {
    if (!statusKey) return "Desconocido";
    return statusKey.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
}