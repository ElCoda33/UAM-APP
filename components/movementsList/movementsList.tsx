'use client'

import React from 'react'
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Input,
    Button,
    DropdownTrigger,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    Chip,
    User,
    Pagination,
    Selection,
    ChipProps,
    Spinner,
    useDisclosure,
} from '@nextui-org/react'
import { useRouter } from 'next/navigation'
import MoveUpRoundedIcon from '@mui/icons-material/MoveUpRounded'
import BorderColorRoundedIcon from '@mui/icons-material/BorderColorRounded'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'

import { ChevronDownIcon } from '../icons/ChevronDownlcon'
import { VerticalDotsIcon } from '../icons/VerticalDotsIcon'
import { SearchIcon } from '../icons/SearchIcon'

import { capitalize } from './utils'
import { columns, statusOptions } from './data'

import getDate from '@/config/functions'
import { Movimiento } from '@/types'
import { getAMovements } from '@/lib/actions/get/movements'

const statusColorMap: Record<string, ChipProps['color']> = {
    enUso: 'success',
    baja: 'danger',
    deposito: 'warning',
}

const INITIAL_VISIBLE_COLUMNS = [
    'id',
    'persona_recibe',
    'lugar_destino',
    'seccion_transfiere',
    'ubicacion',
    'sector',
    'fecha_recibido',
    'lpersona_recibe',
    'dependencia',
    'fecha_movimiento',
    'ci_usuario',
    'nro_serie_bien',
    'actions',
]

const movementss = [
    {
        producto: '',
        descripcion: '',
        nro_serie: '',
        seccion: '',
        fecha_venta: '',
        rut_empresa: '',
        nro_factura: '',
        fecha_garantia: '',
        codigo_inventario: '',
        procedimiento_adquisicion: '',
        estado: '',
        avatar: '',
    },
]

type Asset = (typeof movementss)[0]

export default function MovementsList({ nroSerie }: { nroSerie: any }) {
    const [movements, setMovements] = React.useState<Movimiento[]>([])
    const [filterValue, setFilterValue] = React.useState('')
    const [selectedKeys, setSelectedKeys] = React.useState<Selection>(
        new Set([])
    )
    const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
        new Set(INITIAL_VISIBLE_COLUMNS)
    )
    const [statusFilter] = React.useState<Selection>('all')
    const [rowsPerPage, setRowsPerPage] = React.useState(5)
    const [sortDescriptor, setSortDescriptor] = React.useState<any>({
        column: 'nro_serie',
        direction: 'ascending',
    })
    const [page, setPage] = React.useState(1)
    const [isLoading, setIsLoading] = React.useState(true)
    const router = useRouter()
    const { onOpen } = useDisclosure()

    React.useEffect(() => {
        getAMovements(nroSerie)
            .then((res: any) => {
                res.map((el: any) => {
                    el.fecha_recibido = getDate(el.fecha_recibido)
                    el.fecha_movimiento = getDate(el.fecha_movimiento)
                })
                setMovements(res)
                setIsLoading(false)
            })
            .catch()
    }, [])

    const hasSearchFilter = Boolean(filterValue)

    const headerColumns = React.useMemo(() => {
        if (visibleColumns === 'all') return columns

        return columns.filter((column) =>
            Array.from(visibleColumns).includes(column.uid)
        )
    }, [visibleColumns])

    const filteredItems = React.useMemo(() => {
        let filteredAssets = [...movements]

        if (hasSearchFilter) {
            filteredAssets = filteredAssets.filter((movements) =>
                movements.nro_serie_bien
                    .toLowerCase()
                    .includes(filterValue.toLowerCase())
            )
        }
        if (
            statusFilter !== 'all' &&
            Array.from(statusFilter).length !== statusOptions.length
        ) {
            filteredAssets = filteredAssets.filter((movements: any) =>
                Array.from(statusFilter).includes(movements.sector)
            )
        }

        return filteredAssets
    }, [movements, filterValue, statusFilter])

    const pages = Math.ceil(filteredItems.length / rowsPerPage)

    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage
        const end = start + rowsPerPage

        return filteredItems.slice(start, end)
    }, [page, filteredItems, rowsPerPage])

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a: Movimiento, b: Movimiento) => {
            const first: any = a[sortDescriptor.column as keyof Movimiento]
            const second: any = b[sortDescriptor.column as keyof Movimiento]
            const cmp = first < second ? -1 : first > second ? 1 : 0

            return sortDescriptor.direction === 'descending' ? -cmp : cmp
        })
    }, [sortDescriptor, items])

    const renderCell = React.useCallback(
        (movement: Asset, columnKey: React.Key) => {
            const cellValue = movement[columnKey as keyof Asset]

            const handleMove = () => {
                onOpen()
            }

            const handleMovements = () => {
                router.push(`movements/movements?q=${movement.nro_serie}`)
            }
            const handleUpdate = () => {
                onOpen()
            }

            switch (columnKey) {
                case 'producto':
                    return (
                        <User
                            avatarProps={{ radius: 'lg', src: movement.avatar }}
                            description={movement.nro_serie}
                            name={cellValue}
                        >
                            {movement.producto}
                        </User>
                    )
                // case "role":
                //   return (
                //     <div className="flex flex-col">
                //       <p className="text-bold text-small capitalize">{cellValue}</p>
                //       <p className="text-bold text-tiny capitalize text-default-400">
                //         {movements.rol}
                //       </p>
                //     </div>
                //   );
                case 'estado':
                    return (
                        <Chip
                            className="capitalize"
                            color={statusColorMap[movement.estado]}
                            size="sm"
                            variant="flat"
                        >
                            {cellValue}
                        </Chip>
                    )
                case 'actions':
                    return (
                        <div className="relative flex justify-end items-center gap-2">
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                    >
                                        <VerticalDotsIcon className="text-default-300" />
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu>
                                    <DropdownItem
                                        startContent={
                                            <BorderColorRoundedIcon fontSize="small" />
                                        }
                                        onClick={handleUpdate}
                                    >
                                        Editar
                                    </DropdownItem>
                                    <DropdownItem
                                        startContent={
                                            <MoveUpRoundedIcon fontSize="small" />
                                        }
                                        onClick={handleMove}
                                    >
                                        Mover
                                    </DropdownItem>
                                    <DropdownItem
                                        startContent={
                                            <FormatListBulletedIcon fontSize="small" />
                                        }
                                        onClick={handleMovements}
                                    >
                                        Movimientos
                                    </DropdownItem>
                                    {/* <DropdownItem onClick={handleDisabled}>
                  {user.estado === "active" ? "Desabilitar" : "Habilitar"}
                </DropdownItem> */}
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    )
                default:
                    return cellValue
            }
        },
        []
    )

    const onNextPage = React.useCallback(() => {
        if (page < pages) {
            setPage(page + 1)
        }
    }, [page, pages])

    const onPreviousPage = React.useCallback(() => {
        if (page > 1) {
            setPage(page - 1)
        }
    }, [page])

    const onRowsPerPageChange = React.useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            setRowsPerPage(Number(e.target.value))
            setPage(1)
        },
        []
    )

    const onSearchChange = React.useCallback((value?: string) => {
        if (value) {
            setFilterValue(value)
            setPage(1)
        } else {
            setFilterValue('')
        }
    }, [])

    const onClear = React.useCallback(() => {
        setFilterValue('')
        setPage(1)
    }, [])

    const topContent = React.useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex sm:flex-row flex-col justify-between gap-3 items-start  ">
                    <Input
                        isClearable
                        className="w-full sm:max-w-[44%]"
                        placeholder="Buscar por número de serie..."
                        startContent={<SearchIcon />}
                        value={filterValue}
                        onClear={() => onClear()}
                        onValueChange={onSearchChange}
                    />
                    <div className="flex gap-3">
                        {/* <Dropdown>
              <DropdownTrigger className=" sm:flex">
                <Button
                  endContent={<ChevronDownIcon className="text-small" />}
                  variant="flat"
                >
                  Estado
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Table Columns"
                closeOnSelect={false}
                selectedKeys={statusFilter}
                selectionMode="multiple"
                onSelectionChange={setStatusFilter}
              >
                {statusOptions.map((status) => (
                  <DropdownItem key={status.uid} className="capitalize">
                    {capitalize(status.name)}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown> */}
                        {/* <Autocomplete
              onSelectionChange={setStatusFilter}
              endContent={<ChevronDownIcon className="text-small" />}
              defaultItems={secciones}
              placeholder="Sección a la que pertence"
              label="Sección"
              name="seccion"
              id="seccion"
              className="sm:w-1/2 m-2 min-w-80"

            >
              {(seccion) => <AutocompleteItem key={seccion.nombre}>{seccion.nombre}</AutocompleteItem>}
            </Autocomplete> */}
                        <Dropdown>
                            <DropdownTrigger className="sm:flex">
                                <Button
                                    endContent={
                                        <ChevronDownIcon className="text-small" />
                                    }
                                    variant="flat"
                                >
                                    Columnas
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection
                                aria-label="Table Columns"
                                closeOnSelect={false}
                                selectedKeys={visibleColumns}
                                selectionMode="multiple"
                                onSelectionChange={setVisibleColumns}
                            >
                                {columns.map((column) => (
                                    <DropdownItem
                                        key={column.uid}
                                        className="capitalize"
                                    >
                                        {capitalize(column.name)}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-default-400 text-small">
                        Total {movements.length} usuarios
                    </span>
                    <label className="flex items-center text-default-400 text-small">
                        Filas por página:
                        <select
                            className="bg-transparent outline-none text-default-400 text-small"
                            onChange={onRowsPerPageChange}
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="15">15</option>
                        </select>
                    </label>
                </div>
            </div>
        )
    }, [
        filterValue,
        statusFilter,
        visibleColumns,
        onSearchChange,
        onRowsPerPageChange,
        movements.length,
        hasSearchFilter,
    ])

    const bottomContent = React.useMemo(() => {
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <span className="w-[30%] text-small text-default-400">
                    {selectedKeys === 'all'
                        ? 'All items selected'
                        : `${selectedKeys.size} de ${filteredItems.length} seleccionadas`}
                </span>
                <Pagination
                    isCompact
                    showControls
                    showShadow
                    color="primary"
                    page={page}
                    total={pages}
                    onChange={setPage}
                />
                <div className="hidden sm:flex w-[30%] justify-end gap-2">
                    <Button
                        isDisabled={pages === 1}
                        size="sm"
                        variant="flat"
                        onPress={onPreviousPage}
                    >
                        Anterior
                    </Button>
                    <Button
                        isDisabled={pages === 1}
                        size="sm"
                        variant="flat"
                        onPress={onNextPage}
                    >
                        Siguiente
                    </Button>
                </div>
            </div>
        )
    }, [selectedKeys, items.length, page, pages, hasSearchFilter])

    return (
        <>
            <Table
                isHeaderSticky
                aria-label="Example table with custom cells, pagination and sorting"
                bottomContent={bottomContent}
                bottomContentPlacement="outside"
                classNames={{
                    wrapper: 'max-h-[382px]',
                }}
                selectedKeys={selectedKeys}
                sortDescriptor={sortDescriptor}
                topContent={topContent}
                topContentPlacement="outside"
                onSelectionChange={setSelectedKeys}
                onSortChange={setSortDescriptor}
            >
                <TableHeader columns={headerColumns}>
                    {(column) => (
                        <TableColumn
                            key={column.uid}
                            align={
                                column.uid === 'actions' ? 'center' : 'start'
                            }
                            allowsSorting={column.sortable}
                        >
                            {column.name}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody
                    emptyContent={'No movements found'}
                    isLoading={isLoading}
                    items={sortedItems}
                    loadingContent={<Spinner label="Loading..." />}
                >
                    {(item: any) => (
                        <TableRow key={item.nro_serie_bien}>
                            {(columnKey) => (
                                <TableCell>
                                    {renderCell(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </>
    )
}
