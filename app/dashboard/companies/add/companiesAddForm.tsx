'use client'
import { Input } from '@nextui-org/input'
import { Button, Tooltip } from '@nextui-org/react'
import QuestionMarkIcon from '@mui/icons-material/QuestionMark'
import { useRef } from 'react'
import { enqueueSnackbar } from 'notistack'

import { companiesAdd, companyUpdate } from '@/lib/actions/post/companies'

export default function CompaniesAddForm({
    item,
    setItems,
    onClose,
}: {
    onClose: any
    update: boolean
    item: any | undefined
    setItems: any
}) {
    const formRef = useRef<HTMLFormElement>(null)

    const handleAction = async (formData: FormData) => {
        const result = await companiesAdd(formData)

        if (Array.isArray(result)) {
            enqueueSnackbar(`La empresa ${[result]} fue creada exitosamente`, {
                variant: 'success',
            })
            formRef.current?.reset()
        } else {
            enqueueSnackbar(result, { variant: 'error' })
        }
    }
    const handleUpdate = async (formData: FormData) => {
        const result: any = await companyUpdate(formData, item?.rut)

        if (Array.isArray(result)) {
            setItems(result)
            enqueueSnackbar(`El usuario fue actualizado exitosamente`, {
                variant: 'success',
            })
            formRef.current?.reset()
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
            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={item?.rut}
                label="RUT"
                name="rut"
                placeholder="Ingrese el RUT de la empresa"
            />

            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={item?.razon_social}
                endContent={
                    <Tooltip content="Ej: Empresa S.A">
                        <QuestionMarkIcon fontSize="small" />
                    </Tooltip>
                }
                label="Razón social"
                name="razon_social"
                placeholder="Ingrese la razón social"
                type="text"
            />
            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={item?.nombre_fantasia}
                label="Nombre de fantasia"
                name="nombre_fantasia"
                placeholder="Ingrese el nombre de fantasia"
            />
            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={item?.email}
                label="Email"
                name="email"
                placeholder="Ingrese el email de contacto"
                type="email"
            />
            <Input
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={item?.tel}
                label="Teléfono"
                name="tel"
                placeholder="Ingrese el número telefónico"
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
