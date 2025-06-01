'use client'
import React from 'react'
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    getKeyValue,
    Spinner,
} from "@heroui/react"

import { fetchSecciones } from '@/lib/data/sections/get'

const columns = [
    {
        key: 'nombre',
        label: 'Sección',
    },
]

const datas = [
    {
        nombre: '',
    },
]

export default function SectionsTable() {
    const [data, setData] = React.useState(datas)
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        ; (async () => {
            setLoading(true)
            const datos: any = await fetchSecciones()

            setData(datos)
            setLoading(false)
        })()
    }, [])

    return (
        <>
            <Table aria-label="Example table with dynamic content">
                <TableHeader columns={columns}>
                    {(column) => (
                        <TableColumn key={column.key}>
                            {column.label}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody items={data}>
                    {(item) => (
                        <TableRow key={item.nombre}>
                            {(columnKey) => (
                                <TableCell>
                                    {getKeyValue(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            {loading && <Spinner className="" size="lg" />}
        </>
    )
}
