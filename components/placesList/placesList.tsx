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
    User,
    Pagination,
    Selection,
    Spinner,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    useDisclosure,
} from "@heroui/react"
import { useRouter } from 'next/navigation'

import { PlusIcon } from '../icons/PlusIcon'
import { SearchIcon } from '../icons/SearchIcon'
import { ChevronDownIcon } from '../icons/ChevronDownlcon'
import { EditIcon } from '../icons/EditIcon'
import { VerticalDotsIcon } from '../icons/VerticalDotsIcon'

import { capitalize } from './utils'
import { columns, statusOptions } from './data'

import PlacesAddForm from '@/app/dashboard/places/add/placesAddForm'
import { getPlaces } from '@/lib/actions/get/places'

const INITIAL_VISIBLE_COLUMNS = ['nombre', 'dependencia', 'actions']

type Section = {
    nombre: string
    nivel_conduccion: number
    dependencia: string
    email: string
}

export default function PlacesList() {
    const [places, setSections] = React.useState<Section[]>([])
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
        column: 'age',
        direction: 'ascending',
    })
    const [page, setPage] = React.useState(1)
    const [isLoading, setIsLoading] = React.useState(true)
    const router = useRouter()
    const [placeToUpdate, setPlaceToUpdate] = React.useState<Section>()
    const { isOpen, onOpen, onOpenChange } = useDisclosure()

    React.useEffect(() => {
        try {
            getPlaces().then((res: any) => {
                setSections(res)
                setIsLoading(false)
            })
        } catch (err) { }
    }, [])

    const hasSearchFilter = Boolean(filterValue)

    const headerColumns = React.useMemo(() => {
        if (visibleColumns === 'all') return columns

        return columns.filter((column) =>
            Array.from(visibleColumns).includes(column.uid)
        )
    }, [visibleColumns])

    const filteredItems = React.useMemo(() => {
        let filteredUsers = [...places]

        if (hasSearchFilter) {
            filteredUsers = filteredUsers.filter((place) =>
                place.nombre.toLowerCase().includes(filterValue.toLowerCase())
            )
        }
        if (
            statusFilter !== 'all' &&
            Array.from(statusFilter).length !== statusOptions.length
        ) {
            filteredUsers = filteredUsers.filter((place) =>
                Array.from(statusFilter).includes(place.nombre)
            )
        }

        return filteredUsers
    }, [places, filterValue, statusFilter])

    const pages = Math.ceil(filteredItems.length / rowsPerPage)

    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage
        const end = start + rowsPerPage

        return filteredItems.slice(start, end)
    }, [page, filteredItems, rowsPerPage])

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a: Section, b: Section) => {
            const first = a[sortDescriptor.column as keyof Section] as number
            const second = b[sortDescriptor.column as keyof Section] as number
            const cmp = first < second ? -1 : first > second ? 1 : 0

            return sortDescriptor.direction === 'descending' ? -cmp : cmp
        })
    }, [sortDescriptor, items])

    const renderCell = React.useCallback(
        (place: Section, columnKey: React.Key) => {
            const cellValue = place[columnKey as keyof Section]

            const handleUpdate = async () => {
                setPlaceToUpdate(place)
                onOpen()
            }

            switch (columnKey) {
                case 'nombre':
                    return (
                        <User
                            avatarProps={{ radius: 'lg', src: '' }}
                            description={place.email}
                            name={cellValue}
                        >
                            {place.nombre}
                        </User>
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
                                        startContent={<EditIcon />}
                                        onClick={handleUpdate}
                                    >
                                        {' '}
                                        Editar
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
                        placeholder="Buscar por nombre..."
                        startContent={<SearchIcon />}
                        value={filterValue}
                        onClear={() => onClear()}
                        onValueChange={onSearchChange}
                    />
                    <div className="flex gap-3">
                        <Dropdown>
                            <DropdownTrigger className="sm:flex">
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
                            onClick={() => router.push('places/add')}
                        >
                            Agregar
                        </Button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-default-400 text-small">
                        Total {places.length} Secciones
                    </span>
                    <label className="flex items-center text-default-400 text-small">
                        Filas por página:
                        <select
                            className="bg-transparent outline-none text-default-400 text-small"
                            onChange={onRowsPerPageChange}
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value={places.length}>
                                {places.length}
                            </option>
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
        places.length,
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
                selectionMode="multiple"
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
                    emptyContent={'No places found'}
                    isLoading={isLoading}
                    items={sortedItems}
                    loadingContent={<Spinner label="Loading..." />}
                >
                    {(item) => (
                        <TableRow key={item.nombre}>
                            {(columnKey) => (
                                <TableCell>
                                    {renderCell(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <Modal
                backdrop="blur"
                isOpen={isOpen}
                placement="top-center"
                onOpenChange={onOpenChange}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col">
                                Actualizar
                            </ModalHeader>
                            <ModalBody>
                                <PlacesAddForm
                                    item={placeToUpdate}
                                    setItems={setSections}
                                    update={true}
                                    onClose={onClose}
                                />
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    )
}
