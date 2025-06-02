// app/api/reports/asset-movements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import puppeteer from 'puppeteer'; //
import type { AssetMovementRecord } from '@/app/api/assets/[id]/movements/route'; // Ajusta la ruta si es necesario

interface ReportRequestBody {
  assetId: number;
  filters: { // Mismos filtros que usa el frontend
    transferDateRange?: { from: string | null; to: string | null }; // Fechas como string YYYY-MM-DD
    receivedDateRange?: { from: string | null; to: string | null };
    from_section_name?: string;
    // ...otros filtros
    notes?: string;
  };
  // Opcionalmente, podrías enviar el dataset ya filtrado del cliente:
  // filteredData?: AssetMovementRecord[];
}

// Helper para convertir DateValue (del cliente) a string YYYY-MM-DD para la API
// function dateValueToString(dateValue: DateValue | null): string | null { ... }

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const body: ReportRequestBody = await request.json();
    const { assetId, filters } = body;

    const pool = getPool();
    const connection = await pool.getConnection();

    // Construir la query SQL con los filtros (similar a GET /api/assets/[id]/movements, pero con más WHERE)
    let sqlQuery = `
        SELECT
            at.id AS transfer_id, at.transfer_date,
            s_from.name AS from_section_name, l_from.name AS from_location_name,
            s_to.name AS to_section_name, l_to.name AS to_location_name,
            CONCAT(u_auth.first_name, ' ', u_auth.last_name) AS authorized_by_user_name,
            CONCAT(u_rec.first_name, ' ', u_rec.last_name) AS received_by_user_name,
            at.received_date, at.notes
        FROM asset_transfers at
        LEFT JOIN sections s_from ON at.from_section_id = s_from.id
        LEFT JOIN locations l_from ON at.from_location_id = l_from.id
        LEFT JOIN sections s_to ON at.to_section_id = s_to.id
        LEFT JOIN locations l_to ON at.to_location_id = l_to.id
        LEFT JOIN users u_auth ON at.authorized_by_user_id = u_auth.id
        LEFT JOIN users u_rec ON at.received_by_user_id = u_rec.id
        WHERE at.asset_id = ?`;
    const queryParams: any[] = [assetId];

    // Aplicar filtros a la query (ejemplo para notes)
    if (filters.notes) {
      sqlQuery += ` AND at.notes LIKE ?`;
      queryParams.push(`%${filters.notes}%`);
    }
    // ... aplicar otros filtros ...
    // Para fechas: AND at.transfer_date >= ? AND at.transfer_date < ? (ajustar para incluir el día 'to')


    sqlQuery += " ORDER BY at.transfer_date DESC";

    const [movements] = await connection.query<AssetMovementRecord[]>(sqlQuery, queryParams);
    await connection.release();

    // Generar HTML para el PDF
    let htmlContent = `<html><head><title>Historial de Movimientos</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; }
        h1 { text-align: center; font-size: 16px; }
        /* ... más estilos ... */
    </style></head><body>`;
    // Podrías añadir información del activo aquí
    htmlContent += `<h1>Historial de Movimientos del Activo ID: ${assetId}</h1>`;
    htmlContent += `<table><thead><tr>
        <th>Fecha Transf.</th><th>Tipo/Notas</th><th>Desde Sección</th><th>Desde Lugar</th>
        <th>Hacia Sección</th><th>Hacia Lugar</th><th>Autorizado Por</th><th>Recibido Por</th><th>Fecha Recep.</th>
    </tr></thead><tbody>`;

    movements.forEach(mov => {
      htmlContent += `<tr>
        <td>${mov.transfer_date ? new Date(mov.transfer_date).toLocaleDateString('es-UY') : 'N/A'}</td>
        <td>${mov.notes || 'N/A'}</td>
        <td>${mov.from_section_name || 'N/A'}</td>
        <td>${mov.from_location_name || 'N/A'}</td>
        <td>${mov.to_section_name || 'N/A'}</td>
        <td>${mov.to_location_name || 'N/A'}</td>
        <td>${mov.authorized_by_user_name || 'N/A'}</td>
        <td>${mov.received_by_user_name || 'N/A'}</td>
        <td>${mov.received_date ? new Date(mov.received_date).toLocaleDateString('es-UY') : 'N/A'}</td>
      </tr>`;
    });
    htmlContent += `</tbody></table></body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '10mm', bottom: '20mm', left: '10mm' } });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="historial_movimientos_activo_${assetId}.pdf"`,
      },
    });

  } catch (error) {
    console.error("API Error POST /api/reports/asset-movements:", error);
    return NextResponse.json({ message: 'Error al generar el reporte PDF.' }, { status: 500 });
  }
}