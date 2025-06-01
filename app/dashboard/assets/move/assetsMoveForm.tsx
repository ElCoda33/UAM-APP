'use client'
import {
    Autocomplete,
    AutocompleteItem,
    Button,
    Input,
    Select,
    SelectItem,
} from "@heroui/react"
import React, { useContext, useRef, useState } from 'react'
import { enqueueSnackbar } from 'notistack'

import { Section } from '@/lib/types/sections'
import { getSomePlaces } from '@/lib/actions/get/places'
import { moveAsset } from '@/lib/actions/post/movements'
import { UserContext } from '@/app/providers'
import { fetchSecciones } from '@/lib/data/sections/get'

const tipoDeUbicaciones = ['Interna', 'Externa', 'Dar de baja']

export default function AssetsMoveForm({
    item,
    onClose,
}: {
    onClose: any
    update: boolean
    item: any | undefined
    setItems: any
}) {
    const [places, setPlaces] = useState<Section[]>([])
    const [sections, setSections] = useState<Section[]>([])
    const [dependence, setDependence] = useState<any>(null)
    const UserLogin = useContext<any>(UserContext)
    const formRef = useRef<HTMLFormElement>(null)

    React.useEffect(() => {
        fetchSecciones().then((data: any) => setSections(data))
    }, [])

    const handleMove = async (formData: FormData) => {
        let ciUserToMove: any = formData.get('persona_recibe')
        let destino: any = formData.get('lugar_destino')
        let tipoMov: any = formData.get('tipo_ubicacion')

        const date = new Date().toISOString()

        if (ciUserToMove && destino && tipoMov) {
            formData.set('ci_usuario', UserLogin.ci)
            formData.set('fecha_movimiento', `${date}`)
            formData.set('nro_serie_bien', item.nro_serie)
            formData.set('seccion_transfiere', UserLogin.seccion)
            formData.set('fecha_recibido', `${date}`)
            formData.set('fecha_recibido', `${date}`)
            formData.set('dependencia', dependence)

            const result: any = await moveAsset(formData)

            if (Array.isArray(result)) {
                enqueueSnackbar(`El bien se ha movido exitosamente`, {
                    variant: 'success',
                })
                formRef.current?.reset()
                onClose()
            } else {
                enqueueSnackbar(`Error al actualizar: ${result}`, {
                    variant: 'error',
                })
            }
        } else
            enqueueSnackbar('Algún campo obligatorio está vacio', {
                variant: 'error',
            })
    }

    const handleDependence = (e: any) => {
        setDependence(e)
        getSomePlaces(e).then((data: any) => setPlaces(data))
    }

    return (
        <form
            ref={formRef}
            action={handleMove}
            className="flex flex-col items-center w-full"
        >
            <Autocomplete
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                id="dependencia"
                label="Dependencia"
                name="dependencia"
                placeholder="Ingrese dependencia"
                onSelectionChange={handleDependence}
            >
                {sections.map((ubicacion) => (
                    <AutocompleteItem key={ubicacion.nombre}>
                        {ubicacion.nombre}
                    </AutocompleteItem>
                ))}
            </Autocomplete>

            {dependence && (
                <Autocomplete
                    isRequired
                    className="sm:w-1/2 m-2 min-w-80"
                    id="destino"
                    label="Destino físico"
                    name="lugar_destino"
                    placeholder="Ingrese ubicación física de destino"
                >
                    {places.map((ubicacion) => (
                        <AutocompleteItem key={ubicacion.nombre}>
                            {ubicacion.nombre}
                        </AutocompleteItem>
                    ))}
                </Autocomplete>
            )}

            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                id="persona_recibe"
                label="Persona a recibir el bien"
                name="persona_recibe"
                placeholder="Ingrese la perona que recibirá el bien"
            />
            {/* <Autocomplete
        isRequired
        name="persona_recibe"
        placeholder="Ingrese la perona que recibirá el bien"
        className="sm:w-1/2 m-2 min-w-80"
        label="Persona a recibir el bien"
        id="persona_recibe"
      >
        {users.map((user) => (
          <AutocompleteItem startContent={`${user.nombre} ${user.apellido} CI:`} key={`${user.ci}`}>{`${user.ci}`}</AutocompleteItem>
        ))}
      </Autocomplete> */}
            <Select
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                label="Tipo de ubicación"
                name="tipo_ubicacion"
                placeholder="Ingrese el tipo de ubicación"
            >
                {tipoDeUbicaciones.map((key) => (
                    <SelectItem key={key}>{key}</SelectItem>
                ))}
            </Select>
            <Button className="w-full sm:w-1/2 m-2 min-w-80" type="submit">
                Mover
            </Button>

            <div className="w-full sm:w-1/2 m-1 flex justify-between" />
        </form>
    )
}
