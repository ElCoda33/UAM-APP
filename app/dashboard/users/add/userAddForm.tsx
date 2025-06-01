'use client'
import { Input } from "@heroui/input"
import {
    Autocomplete,
    AutocompleteItem,
    Button,
    DatePicker,
    Tooltip,
} from "@heroui/react"
import { useEffect, useRef, useState } from 'react'
import { useSnackbar } from 'notistack'
import { parseAbsoluteToLocal } from '@internationalized/date'
import { QuestionMark } from '@mui/icons-material'

import { fetchRoles } from '@/lib/data/data'
import { fetchSecciones } from '@/lib/data/sections/get'
import { userAdd, usersUpdate } from '@/lib/actions/post/users'
import { Rol } from '@/components/types/types'
import { Section } from '@/lib/types/sections'
import getDate, { transDate } from '@/config/functions'
import { EyeSlashFilledIcon } from '@/app/EyeSlashFilledlcon'
import { EyeFilledIcon } from '@/components/inputs/icons/EyeFilledIcon'

export default function UserAddForm({
    item,
    setItems,
    onClose,
}: {
    onClose: any
    update: boolean
    item: any | undefined
    setItems: any
}) {
    const [secciones, setSecciones] = useState<Section[]>([])
    const [user, setUser] = useState<any>(item)
    const [roles, setRoles] = useState<Rol[]>([])
    const formRef = useRef<HTMLFormElement>(null)
    const { enqueueSnackbar } = useSnackbar()
    const [isVisible, setIsVisible] = useState(false)

    const toggleVisibility = () => setIsVisible(!isVisible)

    const estados = [
        { nombre: 'active' },
        { nombre: 'vacation' },
        { nombre: 'disabled' },
    ]

    useEffect(() => {
        fetchSecciones().then((res: any) => setSecciones(res))
        fetchRoles().then((res: any) => setRoles(res))
    }, [])

    const handleAction = async (formData: FormData) => {
        const result = await userAdd(formData)

        if (Array.isArray(result)) {
            enqueueSnackbar(`El usuario ${[result]} fue creado exitosamente`, {
                variant: 'success',
            })
            formRef.current?.reset()
        } else {
            enqueueSnackbar(result, { variant: 'error' })
        }
    }

    const handleUpdate = async (formData: FormData) => {
        formData.set('ci', item?.ci)

        const result: any = await usersUpdate(formData, item?.ci)

        if (Array.isArray(result)) {
            result.map((el: any) => {
                el.fecha_nacimiento = getDate(el.fecha_nacimiento)
            })
            setItems(result)
            enqueueSnackbar(`El usuario fue actualizado exitosamente`, {
                variant: 'success',
            })
            formRef.current?.reset()
            setUser({})
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
            className="flex flex-col items-center justify-center w-full"
        >
            {!item && <h3 className="text-2xl m-5">Ingresar articulo</h3>}

            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={user?.ci}
                endContent={
                    user?.ci && (
                        <Tooltip content="La cédula no es editable">
                            <QuestionMark fontSize="small" />
                        </Tooltip>
                    )
                }
                id="ci"
                isDisabled={user?.ci && true}
                label="Cédula"
                name="ci"
                placeholder="Ingrese el número de cédula"
                readOnly={user?.ci && true}
                type="text"
            />

            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={user?.nombre}
                id="nombre"
                label="Nombre"
                name="nombre"
                placeholder="Ingrese el nombre"
                type="text"
            />
            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={user?.apellido}
                id="apellido"
                label="Apellido"
                name="apellido"
                placeholder="Ingrese el apellido"
                type="text"
            />

            <DatePicker
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={
                    user?.fecha_nacimiento &&
                    parseAbsoluteToLocal(
                        new Date(
                            transDate(user?.fecha_nacimiento)
                        ).toISOString()
                    )
                }
                granularity="day"
                id="fecha_nacimiento"
                label="Fecha de nacimiento"
                name="fecha_nacimiento"
            />
            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={user?.email}
                id="email"
                label="Correo electrónico"
                name="email"
                placeholder="Ingrese la dirección de correo"
            />
            <Autocomplete
                className="sm:w-1/2 m-2 min-w-80"
                defaultItems={secciones}
                defaultSelectedKey={user?.seccion}
                id="seccion"
                label="Sección"
                name="seccion"
                placeholder="Sección a la que pertence"
            >
                {(seccion) => (
                    <AutocompleteItem key={seccion.nombre}>
                        {seccion.nombre}
                    </AutocompleteItem>
                )}
            </Autocomplete>
            <Autocomplete
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultItems={roles}
                defaultSelectedKey={user?.rol}
                id="rol"
                label="Rol"
                name="rol"
                placeholder="Rol que tendrá el usuario"
            >
                {(item) => (
                    <AutocompleteItem key={item.nombre}>
                        {item.nombre}
                    </AutocompleteItem>
                )}
            </Autocomplete>
            <Autocomplete
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultItems={estados}
                defaultSelectedKey={user?.estado}
                id="estado"
                label="Estado"
                name="estado"
                placeholder="Estado con el que ingresa"
            >
                {(item) => (
                    <AutocompleteItem key={item.nombre}>
                        {item.nombre}
                    </AutocompleteItem>
                )}
            </Autocomplete>
            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                endContent={
                    <button
                        aria-label="toggle password visibility"
                        className="focus:outline-none"
                        type="button"
                        onClick={toggleVisibility}
                    >
                        {isVisible ? (
                            <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                        ) : (
                            <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                        )}
                    </button>
                }
                id="password"
                label="Contraseña"
                name="password"
                placeholder="Ingrese la contraseña del usuario"
                type={isVisible ? 'text' : 'password'}
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
