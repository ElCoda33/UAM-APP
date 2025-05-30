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
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    useDisclosure,
    Autocomplete,
    AutocompleteItem,
} from '@nextui-org/react'
import { useRouter } from 'next/navigation'
import MoveUpRoundedIcon from '@mui/icons-material/MoveUpRounded'
import BorderColorRoundedIcon from '@mui/icons-material/BorderColorRounded'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'

import { PlusIcon } from '../icons/PlusIcon'
import { VerticalDotsIcon } from '../icons/VerticalDotsIcon'
import { SearchIcon } from '../icons/SearchIcon'
import { ChevronDownIcon } from '../icons/ChevronDownlcon'

import { columns, statusOptions } from './data'
import { capitalize } from './utils'

import AssetsMoveForm from '@/app/dashboard/assets/move/assetsMoveForm'
import AssetsAddForm from '@/app/dashboard/assets/add/assetsAddForm'
import { fetchAssets } from '@/lib/data/assets/get'
import getDate from '@/config/functions'

const statusColorMap: Record<string, ChipProps['color']> = {
    enUso: 'success',
    baja: 'danger',
    deposito: 'warning',
}

const INITIAL_VISIBLE_COLUMNS = [
    'producto',
    'descripcion',
    'seccion',
    'seccion',
    'estado',
    'actions',
]

const assetss = [
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

type Asset = (typeof assetss)[0]

export default function AssetList() {
    const [assets, setAssets] = React.useState<Asset[]>([])
    const [filterValue, setFilterValue] = React.useState('')
    const [selectedKeys, setSelectedKeys] = React.useState<Selection>(
        new Set([])
    )
    const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
        new Set(INITIAL_VISIBLE_COLUMNS)
    )
    const [statusFilter, setStatusFilter] = React.useState<Selection>('all')
    const [rowsPerPage, setRowsPerPage] = React.useState(5)
    const [sortDescriptor, setSortDescriptor] = React.useState<any>({
        column: 'nro_serie',
        direction: 'ascending',
    })
    const [page, setPage] = React.useState(1)
    const [isLoading, setIsLoading] = React.useState(true)
    const router = useRouter()
    const [itemToUpdate, setItemToUpdate] = React.useState<any>()
    const [itemToMove, setItemToMove] = React.useState<any>()
    const { isOpen, onOpen, onOpenChange } = useDisclosure()

    React.useEffect(() => {
        ; (async () => {
            try {
                const info: any = await fetchAssets()

                info.map((el: any) => {
                    el.fecha_garantia = getDate(el.fecha_garantia)
                    el.fecha_venta = getDate(el.fecha_venta)
                })
                setAssets(info)
                setIsLoading(false)
            } catch (err) { }
        })()
    }, [])

    const hasSearchFilter = Boolean(filterValue)

    const headerColumns = React.useMemo(() => {
        if (visibleColumns === 'all') return columns

        return columns.filter((column) =>
            Array.from(visibleColumns).includes(column.uid)
        )
    }, [visibleColumns])

    const filteredItems = React.useMemo(() => {
        let filteredAssets = [...assets]

        if (hasSearchFilter) {
            filteredAssets = filteredAssets.filter((assets) =>
                sortDescriptor.column
                    .toLowerCase()
                    .includes(filterValue.toLowerCase())
            )
        }
        if (
            statusFilter !== 'all' &&
            Array.from(statusFilter).length !== statusOptions.length
        ) {
            filteredAssets = filteredAssets.filter((assets) =>
                Array.from(statusFilter).includes(assets.estado)
            )
        }

        return filteredAssets
    }, [assets, filterValue, statusFilter])

    const pages = Math.ceil(filteredItems.length / rowsPerPage)

    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage
        const end = start + rowsPerPage

        return filteredItems.slice(start, end)
    }, [page, filteredItems, rowsPerPage])

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a: Asset, b: Asset) => {
            const first = a[sortDescriptor.column as keyof Asset]
            const second = b[sortDescriptor.column as keyof Asset]
            const cmp = first < second ? -1 : first > second ? 1 : 0

            return sortDescriptor.direction === 'descending' ? -cmp : cmp
        })
    }, [sortDescriptor, items])

    const renderCell = React.useCallback(
        (asset: Asset, columnKey: React.Key) => {
            const cellValue = asset[columnKey as keyof Asset]

            const handleMove = () => {
                onOpen()
                setItemToUpdate(undefined)
                setItemToMove(asset)
            }

            const handleMovements = () => {
                router.push(`assets/movements?q=${asset.nro_serie}`)
            }
            const handleUpdate = () => {
                setItemToMove(undefined)
                setItemToUpdate(asset)
                onOpen()
            }

            switch (columnKey) {
                case 'producto':
                    return (
                        <User
                            avatarProps={{ radius: 'lg', src: asset.avatar }}
                            description={asset.nro_serie}
                            name={cellValue}
                        >
                            {asset.producto}
                        </User>
                    )
                // case "role":
                //   return (
                //     <div className="flex flex-col">
                //       <p className="text-bold text-small capitalize">{cellValue}</p>
                //       <p className="text-bold text-tiny capitalize text-default-400">
                //         {assets.rol}
                //       </p>
                //     </div>
                //   );
                case 'estado':
                    return (
                        <Chip
                            className="capitalize"
                            color={statusColorMap[asset.estado]}
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

    const onSearchChange = ((value?: string) => {
        if (value) {
            setFilterValue(value)
            setPage(1)
        } else {
            setFilterValue('')
        }
    })

    const onClear = React.useCallback(() => {
        setFilterValue('')
        setPage(1)
    }, [])

    const nameFilter = (e: any) => {
        const filter = e
        console.log("local", e)
        setSortDescriptor({ ...sortDescriptor, column: filter })
        console.log(sortDescriptor)
    }

    const topContent = React.useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex sm:flex-row flex-col justify-between gap-3 items-start  ">
                    {/* <Input
                        isClearable
                        className="w-full sm:max-w-[44%]"
                        placeholder={`Buscar por ${sortDescriptor.column}...`}
                        startContent={<SearchIcon />}
                        value={filterValue}
                        onClear={() => onClear()}
                        onValueChange={onSearchChange}
                    />
                    <Autocomplete
                        className="w-full sm:max-w-[44%]"
                        defaultItems={columns}
                        placeholder="Buscar por columna"
                        name='filter'
                        onSelectionChange={(e) => nameFilter(e)}
                    >
                        {(column) => <AutocompleteItem key={column.uid}>{column.uid}</AutocompleteItem>}
                    </Autocomplete> */}

                    <div className="flex gap-3">
                        <Dropdown>
                            <DropdownTrigger className=" sm:flex">
                                <Button
                                    endContent={
                                        <ChevronDownIcon className="text-small" />
                                    }
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
                                    <DropdownItem
                                        key={status.uid}
                                        className="capitalize"
                                    >
                                        {capitalize(status.name)}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
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
                        <Button
                            color="primary"
                            endContent={<PlusIcon />}
                            onClick={() => router.push('assets/add')}
                        >
                            Agregar
                        </Button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-default-400 text-small">
                        Total {assets.length} usuarios
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
        assets.length,
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
                    emptyContent={'No assets found'}
                    isLoading={isLoading}
                    items={sortedItems}
                    loadingContent={<Spinner label="Loading..." />}
                >
                    {(item) => (
                        <TableRow key={item.nro_serie}>
                            {(columnKey) => (
                                <TableCell>
                                    {renderCell(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            {itemToUpdate && (
                <Modal
                    backdrop="blur"
                    isOpen={isOpen}
                    placement="top-center"
                    scrollBehavior="outside"
                    onOpenChange={onOpenChange}
                >
                    <ModalContent>
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col">
                                    Actualizar
                                </ModalHeader>
                                <ModalBody>
                                    <AssetsAddForm
                                        item={itemToUpdate}
                                        setItems={setAssets}
                                        update={true}
                                        onClose={onClose}
                                    />
                                </ModalBody>
                            </>
                        )}
                    </ModalContent>
                </Modal>
            )}
            {itemToMove && (
                <Modal
                    backdrop="blur"
                    isOpen={isOpen}
                    placement="top-center"
                    scrollBehavior="outside"
                    onOpenChange={onOpenChange}
                >
                    <ModalContent>
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col">
                                    Mover bien
                                </ModalHeader>
                                <ModalBody>
                                    <AssetsMoveForm
                                        item={itemToMove}
                                        setItems={setAssets}
                                        update={true}
                                        onClose={onClose}
                                    />
                                </ModalBody>
                            </>
                        )}
                    </ModalContent>
                </Modal>
            )}
        </>
    )
}
