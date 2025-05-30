'use server'

import dbquery from '../../models/conection'

export async function assetsAdd(formData: FormData) {
    const nro_serie = formData.get('nro_serie')
    const codigo_inventario = formData.get('codigo_inventario')
    const descripcion = formData.get('descripcion')
    const producto = formData.get('producto')
    const fecha_garantia = formData.get('fecha_garantia')
    const seccion = formData.get('seccion')
    const rut_empresa = formData.get('rut_empresa')
    const fecha_venta = formData.get('fecha_venta')
    const nro_factura = formData.get('nro_factura')
    const procedimiento_adquisicion = formData.get('procedimiento_adquisicion')
    const estado = formData.get('estado')

    if (
        nro_serie &&
        seccion &&
        producto &&
        rut_empresa &&
        estado
    ) {
        try {
            await dbquery(
                `INSERT INTO bienes (nro_serie, codigo_inventario, descripcion, producto, fecha_garantia, seccion, rut_empresa, fecha_venta, nro_factura, procedimiento_adquisicion, estado)
         VALUES ('${nro_serie}','${codigo_inventario}','${descripcion}','${producto}',${fecha_garantia?.length == 0 ? null : `'${fecha_garantia}'`},'${seccion}','${rut_empresa}',${fecha_venta?.length == 0 ? null : `'${fecha_venta}'`},'${nro_factura}','${procedimiento_adquisicion}','${estado}');`
            )

            return [producto]
        } catch (err: any) {
            if (err.errno === 1062) {
                return 'Un item igual ya existe'
            }
        }
    } else {
        return 'No es posible ya que hay campos obligatorios incompletos'
    }
}

export const assetUpdate = async (
    formData: FormData,
    oldName: string | undefined | number
) => {
    const nro_serie = formData.get('nro_serie')
    const codigo_inventario = formData.get('codigo_inventario')
    const descripcion = formData.get('descripcion')
    const producto = formData.get('producto')
    const fecha_garantia = (formData.get('fecha_garantia') as string)?.split(
        'T'
    )[0]
    const seccion = formData.get('seccion')
    const rut_empresa = formData.get('rut_empresa')
    const fecha_venta = (formData.get('fecha_venta') as string)?.split('T')[0]
    const nro_factura = formData.get('nro_factura')
    const procedimiento_adquisicion = formData.get('procedimiento_adquisicion')
    const estado = formData.get('estado')

    if (
        nro_serie &&
        seccion &&
        producto &&
        rut_empresa &&
        nro_factura &&
        estado
    ) {
        try {
            const updateQuery = ` UPDATE  bienes
        SET  nro_serie='${nro_serie}',codigo_inventario='${codigo_inventario}',
        descripcion='${descripcion}',producto='${producto}',
        fecha_garantia='${fecha_garantia}',seccion='${seccion}',
        rut_empresa='${rut_empresa}',fecha_venta='${fecha_venta}',
        nro_factura='${nro_factura}',procedimiento_adquisicion='${procedimiento_adquisicion}',
        estado='${estado}' WHERE nro_serie='${oldName}'`

            await dbquery(updateQuery)

            const [result] = await dbquery(`SELECT * FROM bienes;`)

            return result
        } catch (err: any) {
            if (err.errno === 1062) {
                return 'Un item igual ya existe'
            }

            return 'Error al actualizar el usuario'
        }
    } else {
        return 'No es posible ya que hay campos obligatorios incompletos'
    }
}
