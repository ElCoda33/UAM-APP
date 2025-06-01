import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    getKeyValue,
} from "@heroui/react"

const columns = [
    {
        key: 'lugar_destino',
        label: 'LUGAR DE DESTINO',
    },
    {
        key: 'ubicacion',
        label: 'UBICACIÓN',
    },
    {
        key: 'sector',
        label: 'SECTOR',
    },
    {
        key: 'fecha_recibido',
        label: 'FECHA DE RECEPCIÓN',
    },
    {
        key: 'persona_recibe',
        label: 'PERSONA QUE RECIBE',
    },
    {
        key: 'dependencia',
        label: 'DEPENDENCIA ACTUAL',
    },
    {
        key: 'tipo_ubicacion',
        label: 'TIPO DE UBICACIÓN',
    },
    {
        key: 'fecha_movimiento',
        label: 'FECHA DE MOVIMIENTO',
    },
    {
        key: 'ci_usuario',
        label: 'CI DEL QUE MUEVE',
    },
    {
        key: 'nro_serie_bien',
        label: 'NRO DE SERIE DEL BIEN',
    },
    {
        key: 'seccion_transfiere',
        label: 'SECCIÓN QUE TRANSFIRIÓ',
    },
    {
        key: 'persona_recibe',
        label: 'CI DE PERSONA QUE RECIBIÓ',
    },
    {
        key: 'actions',
        label: 'ACTIONS',
    },
]

export default function MovementsList({ movements }: { movements: any }) {
    return (
        <Table aria-label="Example table with dynamic content">
            <TableHeader columns={columns}>
                {(column) => (
                    <TableColumn key={column.key}>{column.label}</TableColumn>
                )}
            </TableHeader>
            <TableBody items={movements}>
                {(item: any) => (
                    <TableRow key={item.id}>
                        {(columnKey) => (
                            <TableCell>
                                {getKeyValue(item, columnKey)}
                            </TableCell>
                        )}
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}
