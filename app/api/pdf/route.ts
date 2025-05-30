import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(req: NextRequest) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Definir el contenido HTML con estilos CSS
    const htmlContent =
        `<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Movimiento de Bienes de Activo Fijo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .a4 {
            width: 210mm;
            height: 297mm;
            padding: 20mm;
            margin: auto;
            border: 1px solid #000;
            background: #fff;
        }

        h1 {
            text-align: center;
            font-size: 18px;
            margin-bottom: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th,
        td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
        }

        th,tr,tbody,thead {
            width: fit-content;
        }
    </style>
</head>

<body>
    <div class="a4">
        <h1>MOVIMIENTO DE BIENES DE ACTIVO FIJO</h1>
        <table>
            <tr>
                <th>Sección que transfiere</th>
                <td>Sistemas</td>
            </tr>
            <tr>
                <th>Departamento</th>
                <td></td>
            </tr>
            <tr>
                <th>Persona que entrega el Bien</th>
                <td>Lucas Pérez</td>
            </tr>
            <tr>
                <th>Firma</th>
                <td>Lucas Pérez</td>
            </tr>
        </table>
        <table>
            <tr>
                <th>Fecha del movimiento</th>
                <td>12/12/1999</td>
            </tr>
        </table>
        <table>
            <tr>
                <th>Cód. Inventario</th>
                <th>Descripción</th>
                <th>Producto</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Garantía</th>
                <th>Nº Serie</th>
                <th>Estado</th>
            </tr>
            <tr>
                <td>00123</td>
                <td>PC de Escritorio</td>
                <td>HP Pro SFF 400 G9</td>
                <td>HP</td>
                <td>Pro SFF 400</td>
                <td>1 año</td>
                <td>4CE313CCDY</td>
                <td>Nuevo</td>
            </tr>
            <tr>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        </table>
        <table>
            <tr>
                <th>Empresa Adjudicada</th>
                <td></td>
            </tr>
            <tr>
                <th>teléfono</th>
                <td></td>
            </tr>
            <tr>
                <th>Correo electrónico</th>
                <td></td>
            </tr>
            <tr>
                <th>Nº factura de compra</th>
                <td></td>
            </tr>
        </table>

        <table>
            <tr>
                <th>Procedimiento por el cual se adquirió</th>
                <td></td>
            </tr>
        </table>

        <table>
            <tr>
                <th>INDICAR DESTINO</th>
                <td>(marcar con una X)</td>
            </tr>
        </table>
        <table>
            <tr>
                <th>Tipo de ubicación </th>
                <td>INTERNA
                </td>
                <td>
                </td>
                <td>EXTERNA
                </td>
                <td>
                </td>
                <td>DAR DE BAJA (1)
                </td>
                <td>
                </td>
            </tr>
            <tr>
                <th>Ubicación </th>
                <td></td>
            </tr>
            <tr>
                <th>Sector </th>
                <td></td>
            </tr>
            <tr>
                <th>Lugar Físico </th>
                <td>
            </tr>
        </table>
        <table>
            <tr>
                <th>Fecha de recibido por el usuario final </th>
                <td></td>
            </tr>
            <tr>
                <th>Persona que recepcionó el bien</th>
                <td></td>
            </tr>
            <tr>
                <th>Depedencia a la que pertenece</th>
                <td>
            </tr>
            <tr>
                <th>Firma</th>
                <td>
            </tr>
            <tr>
                <th>Hedy Montenegro</br>Directora de División</th>
                <td>
            </tr>
        </table>

        <table>
            <tr>
                <th>(1) En caso de señalar esta opción deberá enviarse el formulario a conocimiento y firma de la
                    Directora de División</br>
                    (*)Se recomienda anular los espacios no utilizados
                </th>
            </tr>
        </table>
    </div>
</body>

</html>
    `;

    await page.setContent(htmlContent);
    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();

    return new NextResponse(pdf, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=example.pdf',
        },
    });
}
