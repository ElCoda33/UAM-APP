'use client'

import { Input } from "@heroui/input"
import { Autocomplete, AutocompleteItem, Button } from "@heroui/react"
import { useRef, useState, useEffect } from 'react'
import { useSnackbar } from 'notistack'

import { Ubicacion } from '@/types'
import { placesAdd, placesUpdate } from '@/lib/actions/post/places'
import { fetchSecciones } from '@/lib/data/sections/get'

export default function PlacesAddForm({
    item,
    setItems,
    onClose,
}: {
    onClose: any
    update: boolean
    item: Ubicacion | undefined
    setItems: any
}) {
    const [places, setSections] = useState<Ubicacion[]>([])
    const [place, setSection] = useState<any>(item)
    const { enqueueSnackbar } = useSnackbar()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        fetchSecciones().then((res: any) => setSections(res))
    }, [])

    const handleAction = async (formData: FormData) => {
        const result = await placesAdd(formData)

        if (Array.isArray(result)) {
            enqueueSnackbar(`La sección ${result} fue creada exitosamente`, {
                variant: 'success',
            })
            formRef.current?.reset()
        } else {
            enqueueSnackbar(result, { variant: 'error' })
        }
    }

    const handleUpdate = async (formData: FormData) => {
        const result: any = await placesUpdate(formData, item?.nombre)

        if (Array.isArray(result)) {
            setItems(result)
            enqueueSnackbar(
                `La ubicación física fue actualizada exitosamente`,
                {
                    variant: 'success',
                }
            )
            formRef.current?.reset()
            setSection({})
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
                defaultValue={place?.nombre}
                label="Ubicación física"
                name="nombre"
                placeholder="Ingrese el nombre del lugar físico"
            />
            <Autocomplete
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultItems={places}
                defaultSelectedKey={place?.dependencia}
                label="Dependencia"
                name="dependencia"
                placeholder="Ingrese la unidad de la que depende"
            >
                {(item) => (
                    <AutocompleteItem key={item.nombre}>
                        {item.nombre}
                    </AutocompleteItem>
                )}
            </Autocomplete>
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
