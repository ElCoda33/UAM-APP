'use client'
import { Input, Textarea } from '@nextui-org/input'
import {
    Autocomplete,
    AutocompleteItem,
    Button,
    DatePicker,
    Select,
    SelectItem,
    Tooltip,
} from '@nextui-org/react'
import QuestionMarkIcon from '@mui/icons-material/QuestionMark'
import React, { useRef, useState } from 'react'
import { enqueueSnackbar } from 'notistack'
import { parseAbsoluteToLocal } from '@internationalized/date'

import { assetsAdd, assetUpdate } from '@/lib/actions/post/assets'
import { fetchCompanies } from '@/lib/data/companies/get'
import { Company } from '@/lib/types/companies'
import { Section } from '@/lib/types/sections'
import { fetchSecciones } from '@/lib/data/sections/get'
import getDate, { transDate } from '@/config/functions'

export default function AssetsAddForm({
    item,
    setItems,
    onClose,
}: {
    onClose: any
    update: boolean
    item: any | undefined
    setItems: any
}) {
    const [companies, setCompanies] = useState<Company[]>([])
    const [asset, setAsset] = useState<any>(item && item)
    const [secciones, setSecciones] = useState<Section[]>([])

    const formRef = useRef<HTMLFormElement>(null)
    const estados = [
        { label: 'En uso' },
        { label: 'En depósito' },
        { label: 'Dado de baja' },
    ]

    React.useEffect(() => {
        fetchCompanies().then((data: any) => setCompanies(data))
        fetchSecciones().then((data: any) => setSecciones(data))
    }, [])

    const handleAction = async (formData: FormData) => {
        const result = await assetsAdd(formData)

        if (Array.isArray(result)) {
            enqueueSnackbar(`La producto ${[result]} fue creado exitosamente`, {
                variant: 'success',
            })

            // formRef.current?.reset()
        } else {
            enqueueSnackbar(result, { variant: 'error' })
        }
    }
    const handleUpdate = async (formData: FormData) => {
        const result: any = await assetUpdate(formData, item?.nro_serie)

        if (Array.isArray(result)) {
            result.map((el: any) => {
                el.fecha_venta = getDate(el.fecha_venta)
                el.fecha_garantia = getDate(el.fecha_garantia)
            })
            setItems(result)
            enqueueSnackbar(`El usuario fue actualizado exitosamente`, {
                variant: 'success',
            })
            formRef.current?.reset()
            setAsset({})
            onClose()
        } else {
            enqueueSnackbar(`Error al actualizar: ${result}`, {
                variant: 'error',
            })
        }
    }

    return (
        <form
            ref={formRef}
            action={!item ? handleAction : handleUpdate}
            className="flex flex-col items-center w-full"
        >
            {!item && <h3 className="text-2xl m-5">Ingresar articulo</h3>}
            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={asset?.nro_serie}
                label="Número de serie"
                name="nro_serie"
                placeholder="Ingrese el número de serie"
            />

            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={asset?.producto}
                endContent={
                    <Tooltip content="help string">
                        <QuestionMarkIcon fontSize="small" />
                    </Tooltip>
                }
                label="Producto"
                name="producto"
                placeholder="Ingrese el producto"
                type="text"
            />
            <Textarea
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={asset?.descripcion}
                label="Desctipción"
                name="descripcion"
                placeholder="Ingrese la descripción"
            />

            <Autocomplete
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultSelectedKey={asset?.seccion}
                id="seccion"
                label="Sección"
                name="seccion"
                placeholder="Sección a la que pertence"
            >
                {secciones.map((seccion) => (
                    <AutocompleteItem key={seccion.nombre}>
                        {seccion.nombre}
                    </AutocompleteItem>
                ))}
            </Autocomplete>

            <Autocomplete
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultSelectedKey={asset?.rut_empresa}
                id="rut"
                label="Empresa"
                name="rut_empresa"
                placeholder="Ingrese la empresa que vende el item"
            >
                {companies.map((company) => (
                    <AutocompleteItem
                        key={company.rut}
                        startContent={`${company.razon_social} RUT:`}
                    >
                        {company.rut}
                    </AutocompleteItem>
                ))}
            </Autocomplete>
            <Input
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={asset?.nro_factura}
                label="Número de factura"
                name="nro_factura"
                placeholder="Ingrese el número de la factura"
                type="text"
            />
            <Input
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={asset?.procedimiento_adquisicion}
                label="Procedimiento de adquisición"
                name="procedimiento_adquisicion"
                placeholder="Ingrese el procedimiento de adquisición"
                type="text"
            />
            <Input
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={asset?.codigo_inventario}
                label="Codigo de inventario"
                name="codigo_inventario"
                placeholder="Ingrese el codigo de inventario UDELAR"
                type="text"
            />
            <DatePicker
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={
                    asset?.fecha_garantia &&
                    parseAbsoluteToLocal(
                        new Date(transDate(asset?.fecha_garantia)).toISOString()
                    )
                }
                granularity="day"
                label="Fecha de garantía"
                name="fecha_garantia"
            />
            <Select
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultSelectedKeys={[asset?.estado]}
                items={estados}
                label="Estado"
                name="estado"
                placeholder="Seleccione el estado del item"
            >
                {(estado) => (
                    <SelectItem key={estado.label}>{estado.label}</SelectItem>
                )}
            </Select>
            <DatePicker
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={
                    asset?.fecha_venta &&
                    parseAbsoluteToLocal(
                        new Date(transDate(asset?.fecha_venta)).toISOString()
                    )
                }
                granularity="day"
                label="Fecha de facturación"
                name="fecha_venta"
            />
            {!item ? (
                <Button className="w-full sm:w-1/2 m-2 min-w-80" type="submit">
                    Agregar
                </Button>
            ) : (
                <Button className="w-full sm:w-1/2 m-2 min-w-80" type="submit">
                    Actualizar
                </Button>
            )}
            <div className="w-full sm:w-1/2 m-1 flex justify-between" />
        </form>
    )
}
