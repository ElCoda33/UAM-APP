'use client'

import { Input } from '@nextui-org/input'
import {
    Autocomplete,
    AutocompleteItem,
    Button,
    Select,
    SelectItem,
    Tooltip,
} from '@nextui-org/react'
import QuestionMarkIcon from '@mui/icons-material/QuestionMark'
import { useRef, useState, useEffect } from 'react'
import { useSnackbar } from 'notistack'

import { fetchSecciones } from '@/lib/data/sections/get'
import { Section } from '@/lib/types/sections'
import { sectionAdd, sectionUpdate } from '@/lib/actions/post/secciones'

const nivelesConductivos = [1, 2, 3]

export default function SectionsAddForm({
    item,
    setItems,
    onClose,
}: {
    onClose: any
    update: boolean
    item: Section | undefined
    setItems: any
}) {
    const [sections, setSections] = useState<Section[]>([])
    const [section, setSection] = useState<any>(item)
    const { enqueueSnackbar } = useSnackbar()
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        fetchSecciones().then((res: any) => setSections(res))
    }, [])

    const handleAction = async (formData: FormData) => {
        const result = await sectionAdd(formData)

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
        const result: any = await sectionUpdate(formData, item?.nombre)

        if (Array.isArray(result)) {
            setItems(result)
            enqueueSnackbar(`La sección fue actualizada exitosamente`, {
                variant: 'success',
            })
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
                defaultValue={section?.nombre}
                label="Sección"
                name="nombre"
                placeholder="Ingrese el nombre de la sección"
            />
            <Input
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultValue={section?.email}
                label="Correo electrónico"
                name="email"
                placeholder="Ingrese la casilla de correo"
            />
            <Select
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultSelectedKeys={`${section?.nivel_conduccion}`}
                endContent={
                    <Tooltip content="El nivel de inducción al que pertenece en el organigrama administrativo">
                        <QuestionMarkIcon fontSize="small" />
                    </Tooltip>
                }
                label="Nivel de inducción"
                name="nivel_conduccion"
                placeholder="Ingrese el nivel de conducción"
            >
                {nivelesConductivos.map((nivel) => (
                    <SelectItem key={nivel}>{nivel.toString()}</SelectItem>
                ))}
            </Select>
            <Autocomplete
                isRequired
                className="sm:w-1/2 m-2 min-w-80"
                defaultItems={sections}
                defaultSelectedKey={section?.dependencia}
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
