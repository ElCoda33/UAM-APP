// File: app/api/assets/reports/movements-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import puppeteer from 'puppeteer'; // Asegúrate que puppeteer esté en tus dependencias
import { RowDataPacket } from 'mysql2/promise';
import type { AssetMovementRecord } from '@/app/api/assets/[id]/movements/route'; // Ajusta esta ruta si la interfaz está en otro lugar o defínela localmente

// Interfaz para el cuerpo de la solicitud del reporte
interface ReportFilters {
  transferDateFrom?: string | null; // YYYY-MM-DD
  transferDateTo?: string | null;   // YYYY-MM-DD
  receivedDateFrom?: string | null; // YYYY-MM-DD
  receivedDateTo?: string | null;   // YYYY-MM-DD
  from_section_name?: string;
  from_location_name?: string;
  to_section_name?: string;
  to_location_name?: string;
  authorized_by_user_name?: string;
  received_by_user_name?: string;
  notes?: string;
}

interface ReportRequestBody {
  assetId: number;
  assetName?: string;
  filters: ReportFilters;
}

// Interfaz para obtener el nombre del activo
interface AssetNameResult extends RowDataPacket {
  product_name: string | null;
  serial_number: string | null;
  inventory_code: string | null;
}

// La función debe llamarse POST y ser exportada
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  let connection: any; // Declara fuera para el bloque finally

  try {
    connection = await pool.getConnection();
    const body: ReportRequestBody = await request.json();
    const { assetId, filters, assetName: clientAssetName } = body;

    if (!assetId) {
      return NextResponse.json({ message: 'ID de activo es requerido.' }, { status: 400 });
    }

    let actualAssetName = clientAssetName;
    if (!actualAssetName) {
      const [assetNameRows] = await connection.query<AssetNameResult[]>(
        "SELECT product_name, serial_number, inventory_code FROM assets WHERE id = ?",
        [assetId]
      );
      if (assetNameRows.length > 0) {
        actualAssetName = assetNameRows[0].product_name || assetNameRows[0].serial_number || assetNameRows[0].inventory_code || `ID ${assetId}`;
      } else {
        actualAssetName = `ID ${assetId}`; // Fallback si el activo no se encuentra, aunque la query principal fallaría después
      }
    }

    let sqlQuery = `
        SELECT
            at.id AS transfer_id, at.transfer_date,
            s_from.name AS from_section_name, l_from.name AS from_location_name,
            s_to.name AS to_section_name, l_to.name AS to_location_name,
            CONCAT(COALESCE(u_auth.first_name, ''), ' ', COALESCE(u_auth.last_name, '')) AS authorized_by_user_name,
            CONCAT(COALESCE(u_rec.first_name, ''), ' ', COALESCE(u_rec.last_name, '')) AS received_by_user_name,
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

    if (filters) {
      if (filters.transferDateFrom) { sqlQuery += ` AND DATE(at.transfer_date) >= ?`; queryParams.push(filters.transferDateFrom); }
      if (filters.transferDateTo) { sqlQuery += ` AND DATE(at.transfer_date) <= ?`; queryParams.push(filters.transferDateTo); }
      if (filters.receivedDateFrom) { sqlQuery += ` AND DATE(at.received_date) >= ?`; queryParams.push(filters.receivedDateFrom); }
      if (filters.receivedDateTo) { sqlQuery += ` AND DATE(at.received_date) <= ?`; queryParams.push(filters.receivedDateTo); }
      if (filters.from_section_name) { sqlQuery += ` AND s_from.name LIKE ?`; queryParams.push(`%${filters.from_section_name}%`); }
      if (filters.from_location_name) { sqlQuery += ` AND l_from.name LIKE ?`; queryParams.push(`%${filters.from_location_name}%`); }
      if (filters.to_section_name) { sqlQuery += ` AND s_to.name LIKE ?`; queryParams.push(`%${filters.to_section_name}%`); }
      if (filters.to_location_name) { sqlQuery += ` AND l_to.name LIKE ?`; queryParams.push(`%${filters.to_location_name}%`); }
      if (filters.authorized_by_user_name) { sqlQuery += ` AND CONCAT(COALESCE(u_auth.first_name, ''), ' ', COALESCE(u_auth.last_name, '')) LIKE ?`; queryParams.push(`%${filters.authorized_by_user_name}%`); }
      if (filters.received_by_user_name) { sqlQuery += ` AND CONCAT(COALESCE(u_rec.first_name, ''), ' ', COALESCE(u_rec.last_name, '')) LIKE ?`; queryParams.push(`%${filters.received_by_user_name}%`); }
      if (filters.notes) { sqlQuery += ` AND at.notes LIKE ?`; queryParams.push(`%${filters.notes}%`); }
    }
    sqlQuery += " ORDER BY at.transfer_date DESC";

    const [movements] = await connection.query<AssetMovementRecord[]>(sqlQuery, queryParams);

    let htmlContent = `
      <html><head><title>Historial de Movimientos - Activo ${actualAssetName}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 30px; font-size: 9pt; color: #333; }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 5px; color: #1a237e; }
        h2 { text-align: center; font-size: 11pt; margin-bottom: 20px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; word-wrap: break-word; }
        th { background-color: #e8eaf6; font-weight: bold; font-size: 9.5pt;}
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style></head><body>
      <h1>Reporte de Historial de Movimientos</h1>
      <h2>Activo: ${actualAssetName} (ID: ${assetId})</h2>
      <table><thead><tr>
        <th>Fecha Transf.</th><th>Tipo/Notas</th><th>Desde Sección</th><th>Desde Lugar</th>
        <th>Hacia Sección</th><th>Hacia Lugar</th><th>Autorizado Por</th><th>Recibido Por</th><th>Fecha Recep.</th>
      </tr></thead><tbody>`;

    if (movements.length === 0) {
      htmlContent += `<tr><td colspan="9" style="text-align:center; padding: 20px;">No hay movimientos que coincidan con los filtros aplicados.</td></tr>`;
    } else {
      movements.forEach(mov => {
        const transferDate = mov.transfer_date ? new Date(mov.transfer_date).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' }) : 'N/A';
        const receivedDate = mov.received_date ? new Date(mov.received_date).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' }) : 'N/A';
        const notes = (mov.notes || 'N/A').replace(/Tipo de movimiento: /g, '');
        htmlContent += `
            <tr>
              <td>${transferDate}</td> <td>${notes}</td>
              <td>${mov.from_section_name || 'N/A'}</td> <td>${mov.from_location_name || 'N/A'}</td>
              <td>${mov.to_section_name || 'N/A'}</td> <td>${mov.to_location_name || 'N/A'}</td>
              <td>${(mov.authorized_by_user_name || 'N/A').trim()}</td> <td>${(mov.received_by_user_name || 'N/A').trim()}</td>
              <td>${receivedDate}</td>
            </tr>`;
      });
    }
    htmlContent += `</tbody></table></body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4', landscape: true, printBackground: true,
      margin: { top: '20mm', right: '10mm', bottom: '20mm', left: '10mm' },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">UAM - Historial de Movimientos</div>`,
      footerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`
    });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="historial_movimientos_activo_${assetId}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("API Error POST /api/assets/reports/movements-pdf:", error);
    return NextResponse.json({ message: error.message || 'Error al generar el reporte PDF.' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.release(); } catch (e) { console.error("Error releasing PDF connection", e); }
    }
  }
}