// app/api/asset-transfers/[transferId]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import puppeteer from 'puppeteer';
import { RowDataPacket } from 'mysql2/promise';

interface Params {
  transferId: string;
}

// Interfaz de datos (sin cambios)
interface SingleMovementData extends RowDataPacket {
  transfer_id: number;
  asset_id: number;
  transfer_date: string;
  from_section_name: string | null;
  authorized_by_user_name: string | null;
  authorized_by_user_ci: string | null;
  to_section_name: string | null;
  to_location_name: string | null;
  received_by_user_name: string | null;
  received_by_user_ci: string | null;
  received_by_user_section_name: string | null;
  received_date: string | null;
  notes: string | null;
  asset_product_name: string | null;
  asset_serial_number: string | null;
  asset_inventory_code: string | null;
  asset_description: string | null;
  asset_warranty_expiry_date_formatted: string | null;
  asset_invoice_number: string | null;
  asset_acquisition_procedure: string | null;
  supplier_name: string | null;
  supplier_phone_number: string | null;
  supplier_email: string | null;
  asset_purchase_date_formatted: string | null;
}


export async function GET(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const transferId = parseInt(context.params.transferId, 10);
  if (isNaN(transferId)) {
    return NextResponse.json({ message: 'ID de transferencia inválido.' }, { status: 400 });
  }

  const pool = getPool();
  let connection: any;

  try {
    connection = await pool.getConnection();
    // La query SQL es la misma
    const query = `
      SELECT
        at.id AS transfer_id, at.asset_id, at.transfer_date,
        s_from.name AS from_section_name,
        CONCAT(COALESCE(u_auth.first_name, ''), ' ', COALESCE(u_auth.last_name, '')) AS authorized_by_user_name,
        u_auth.national_id AS authorized_by_user_ci,
        s_to.name AS to_section_name, l_to.name AS to_location_name,
        CONCAT(COALESCE(u_rec.first_name, ''), ' ', COALESCE(u_rec.last_name, '')) AS received_by_user_name,
        u_rec.national_id AS received_by_user_ci,
        s_rec.name AS received_by_user_section_name,
        at.received_date, at.notes,
        a.product_name AS asset_product_name, a.serial_number AS asset_serial_number,
        a.inventory_code AS asset_inventory_code, a.description AS asset_description,
        DATE_FORMAT(a.warranty_expiry_date, '%d/%m/%Y') AS asset_warranty_expiry_date_formatted,
        a.invoice_number AS asset_invoice_number, 
        a.acquisition_procedure AS asset_acquisition_procedure,
        COALESCE(c.trade_name, c.legal_name) AS supplier_name,
        c.phone_number AS supplier_phone_number, c.email AS supplier_email,
        DATE_FORMAT(a.purchase_date, '%d/%m/%Y') AS asset_purchase_date_formatted 
      FROM asset_transfers at
      JOIN assets a ON at.asset_id = a.id
      LEFT JOIN sections s_from ON at.from_section_id = s_from.id
      LEFT JOIN users u_auth ON at.authorized_by_user_id = u_auth.id
      LEFT JOIN sections s_to ON at.to_section_id = s_to.id
      LEFT JOIN locations l_to ON at.to_location_id = l_to.id
      LEFT JOIN users u_rec ON at.received_by_user_id = u_rec.id
      LEFT JOIN sections s_rec ON u_rec.section_id = s_rec.id
      LEFT JOIN companies c ON a.supplier_company_id = c.id
      WHERE at.id = ?;
    `;

    const [rows] = await connection.query<SingleMovementData[]>(query, [transferId]);

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Movimiento no encontrado.' }, { status: 404 });
    }
    const mov = rows[0];

    let tipoUbicacionParsed = { interna: "&nbsp;", externa: "&nbsp;", darDeBaja: "&nbsp;" };
    const matchTipo = mov.notes?.match(/Tipo de movimiento: (.*)/i);
    if (matchTipo && matchTipo[1]) {
      const tipo = matchTipo[1].toLowerCase();
      if (tipo.includes('interna')) tipoUbicacionParsed.interna = "X";
      else if (tipo.includes('externa')) tipoUbicacionParsed.externa = "X";
      else if (tipo.includes('dar de baja')) tipoUbicacionParsed.darDeBaja = "X";
    }

    const formatDate = (dateString: string | null) =>
      dateString ? new Date(dateString).toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Montevideo' }) : '&nbsp;';

    const transferDateFormatted = formatDate(mov.transfer_date);
    const receivedDateFormatted = formatDate(mov.received_date);
    const warrantyDateFormatted = mov.asset_warranty_expiry_date_formatted || '&nbsp;';
    const purchaseDateFormatted = mov.asset_purchase_date_formatted || '&nbsp;'; // Aunque no esté en el PDF de detalle del bien, lo tenemos

    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Movimiento de Bien N° ${mov.transfer_id}</title>
          <style>
            @page { 
                size: A4;
                margin: 12mm 10mm 12mm 10mm; /* Ajusta márgenes generales de la página */
            }
            body { 
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                margin: 0; 
                padding: 0; 
                font-size: 8.5pt; 
                line-height: 1.3; 
                color: #111; 
                background-color: #fff; 
                -webkit-print-color-adjust: exact; 
            }
            .page-container { width: 100%; height:100%; }
            
            .header-fceya { font-size: 9pt; margin-bottom: 1px; text-align:left; font-weight: bold; }
            .header-udelar { font-size: 8pt; text-align:right; margin-top: -12px; margin-bottom:10mm; }
            
            .main-title { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 7mm; text-decoration: underline; }
            
            .section { margin-bottom: 4mm; /* Espaciado entre secciones ligeramente reducido */ }
            .section-title { font-weight: bold; font-size: 9pt; margin-bottom: 1.5mm; border-bottom: 0.5px solid #bbb; padding-bottom: 1mm;}
            
            table { width: 100%; border-collapse: collapse; font-size: 8pt; page-break-inside: avoid; }
            th, td { border: 0.5px solid #333; padding: 1.5mm; /* Padding reducido */ text-align: left; vertical-align: top; word-wrap: break-word; }
            th { background-color: #E9E9E9; font-weight: bold; }
            
            .label-col { width: 30%; /* Ancho para columnas de etiquetas */ font-weight: bold; }
            .value-col { width: 70%; }
            .value-col.small-text { font-size: 7.5pt; }

            .table-bienes th, .table-bienes td { text-align: center; }
            .table-bienes td { height: 2.3em; } 
            .table-bienes tbody tr:nth-child(2) td { height: 1em; } 
            
            /* Estilos para la sección INDICAR DESTINO */
            .destination-table th.label-col { width: 30%; } /* Para las etiquetas Ubicación, Sector, Lugar Físico */
            .destination-table td.value-col { width: 70%; }
            .checkbox-row th { width: 30%; vertical-align: middle; } /* Etiqueta "Tipo de ubicación" */
            .checkbox-cell { 
                /* width: auto; */ /* Dejar que flex distribuya el espacio restante */
                padding: 1.5mm; 
                display: -webkit-flex; display: flex; 
                align-items: center; 
                font-size: 8pt;
            }
            .checkbox { 
                display: inline-block; 
                width: 10px; 
                height: 10px; 
                border: 0.5px solid black; 
                margin-right: 2.5mm; 
                text-align: center; 
                line-height: 10px; /* Ajustar para centrar la X */
                font-weight: bold; 
                font-size: 7pt; 
                color: #111;
            }
            
            .signature-block-container { margin-top: 7mm; }
            .signature-block { display: inline-block; width: 48%; text-align: center; vertical-align: top; margin-top: 5mm; }
            .signature-line { border-bottom: 0.5px solid #333; height: 15px; margin-top: 8mm; margin-bottom: 1.5mm; }
            .signature-label { font-size: 7.5pt; }
            
            .footer-notes { font-size: 7pt; margin-top: auto; /* Empuja al final si hay espacio */ line-height: 1.3; border-top: 0.5px solid #ccc; padding-top: 2mm;}
            .footer-notes p { margin: 0.5mm 0; }
            td { min-height: 1.3em; }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header-fceya">FACULTAD DE CIENCIAS ECONÓMICAS Y DE ADMINISTRACIÓN</div>
            <div class="header-udelar">UNIVERSIDAD DE LA REPÚBLICA<br/>URUGUAY</div>
            
            <div class="main-title">MOVIMIENTO DE BIENES DE ACTIVO FIJO</div>

            <div class="section">
              <table>
                <tr><th class="label-col">Sección que transfiere:</th><td class="value-col">${mov.from_section_name || '&nbsp;'}</td></tr>
                <tr><th class="label-col">Persona que entrega el Bien:</th><td class="value-col">${(mov.authorized_by_user_name || '').trim() || '&nbsp;'}</td></tr>
                <tr><th class="label-col">Firma:</th><td class="value-col signature-line">&nbsp;</td></tr>
                <tr><th class="label-col">Fecha del Movimiento:</th><td class="value-col">${transferDateFormatted}</td></tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">DETALLE DEL BIEN</div>
              <table class="table-bienes">
                <thead><tr><th>Cód. Inventario</th><th>Descripción</th><th>Producto</th><th>Garantía (Vence)</th><th>Nº Serie</th></tr></thead>
                <tbody>
                  <tr>
                    <td>${mov.asset_inventory_code || '&nbsp;'}</td>
                    <td>${mov.asset_description || '&nbsp;'}</td>
                    <td>${mov.asset_product_name || '&nbsp;'}</td>
                    <td>${warrantyDateFormatted}</td>
                    <td>${mov.asset_serial_number || '&nbsp;'}</td>
                  </tr>
                  <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
                </tbody>
              </table>
            </div>
            
            <div class="section">
              <table class="small-value-col">
                <tr><th class="label-col">Empresa Adjudicada (Proveedor):</th><td class="value-col">${mov.supplier_name || '&nbsp;'}</td></tr>
                <tr><th class="label-col">Teléfono:</th><td class="value-col">${mov.supplier_phone_number || '&nbsp;'}</td></tr>
                <tr><th class="label-col">Correo electrónico:</th><td class="value-col">${mov.supplier_email || '&nbsp;'}</td></tr>
                <tr><th class="label-col">Nº factura de compra:</th><td class="value-col">${mov.asset_invoice_number || '&nbsp;'}</td></tr>
              </table>
            </div>

            <div class="section">
              <table>
                <tr><th class="label-col">Procedimiento por el cual se adquirió:</th><td class="value-col">${mov.asset_acquisition_procedure || '&nbsp;'}</td></tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">INDICAR DESTINO <span style="font-weight:normal; font-size:7.5pt;">(marcar con una X)</span></div>
              <table class="destination-table">
                <tr>
                  <th class="label-col" style="vertical-align: middle;">Tipo de ubicación:</th>
                  <td class="checkbox-cell">
                    <span class="checkbox">${tipoUbicacionParsed.interna}</span>INTERNA
                  </td>
                  <td class="checkbox-cell">
                    <span class="checkbox">${tipoUbicacionParsed.externa}</span>EXTERNA
                  </td>
                  <td class="checkbox-cell">
                    <span class="checkbox">${tipoUbicacionParsed.darDeBaja}</span>DAR DE BAJA (1)
                  </td>
                </tr>
                <tr>
                  <th class="label-col">Ubicación:</th>
                  <td class="value-col" colspan="3">${mov.to_location_name || '&nbsp;'}</td> 
                </tr>
                <tr>
                  <th class="label-col">Sector:</th>
                  <td class="value-col" colspan="3">${mov.to_section_name || '&nbsp;'}</td>
                </tr>
                <tr>
                  <th class="label-col">Lugar Físico:</th>
                  <td class="value-col" colspan="3">${mov.to_location_name || '&nbsp;'}</td> 
                </tr>
              </table>
            </div>
            <div class="section">
              <table>
                <tr><th class="label-col">Fecha de recibido por el usuario final:</th><td class="value-col">${receivedDateFormatted}</td></tr>
                <tr><th class="label-col">Persona que recepcionó el bien:</th><td class="value-col">${(mov.received_by_user_name || '').trim() || '&nbsp;'}</td></tr>
                <tr><th class="label-col">Dependencia a la que pertenece:</th><td class="value-col">${mov.received_by_user_section_name || '&nbsp;'}</td></tr>
                <tr><th class="label-col">Firma:</th><td class="value-col signature-line">&nbsp;</td></tr>
              </table>
            </div>
            
            <div class="signature-block-container">
                <div style="text-align: right;">
                    <div class="signature-block">
                        <div class="signature-line">&nbsp;</div>
                        <div class="signature-label"><br/>Director/a de División</div>
                    </div>
                </div>
            </div>
            
            <div class="footer-notes">
              <p>(1) En caso de señalar esta opción deberá enviarse el formulario a conocimiento y firma de la Directora de División.</p>
              <p>(*) Se recomienda anular los espacios no utilizados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // 'networkidle0' es más robusto
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }, // Márgenes ajustados
      // Quitando header/footer templates para que el HTML controle todo el contenido
      // displayHeaderFooter: true, 
      // headerTemplate: `<span></span>`, // Vacío para que no interfiera con el header HTML
      // footerTemplate: `<span></span>`  // Vacío para que no interfiera con el footer HTML
    });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Movimiento_Bien_FCEYA_Transferencia_${transferId}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error(`API Error GET /api/asset-transfers/${transferId}/pdf:`, error);
    return NextResponse.json({ message: error.message || 'Error al generar el PDF del movimiento.' }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.release(); } catch (e) { console.error("Error releasing PDF connection for single movement", e); }
    }
  }
}