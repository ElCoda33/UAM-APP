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
} from '@nextui-org/react'
import { useRouter } from 'next/navigation'

import { PlusIcon } from '../icons/PlusIcon'
import { SearchIcon } from '../icons/SearchIcon'
import { ChevronDownIcon } from '../icons/ChevronDownlcon'
import { EditIcon } from '../icons/EditIcon'
import { Company } from '../types/types'
import { VerticalDotsIcon } from '../icons/VerticalDotsIcon'

import { capitalize } from './utils'
import { columns, statusOptions } from './data'

import CompaniesAddForm from '@/app/dashboard/companies/add/companiesAddForm'
import { fetchCompanies } from '@/lib/data/companies/get'

const INITIAL_VISIBLE_COLUMNS = [
    'razon_social',
    'rut',
    'nombre_fantasia',
    'tel',
    'email',
    'actions',
]

export default function CompaniesList() {
    const [companies, setCompanies] = React.useState<Company[]>([])
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
        column: 'rut',
        direction: 'ascending',
    })
    const [page, setPage] = React.useState(1)
    const [isLoading, setIsLoading] = React.useState(true)
    const { isOpen, onOpen, onOpenChange } = useDisclosure()
    const [itemToUpdate, setItemToUpdate] = React.useState<any>({})

    const router = useRouter()

    React.useEffect(() => {
        fetchCompanies()
            .then((res: any) => {
                setCompanies(res)
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
        let filteredUsers = [...companies]

        if (hasSearchFilter) {
            filteredUsers = filteredUsers.filter((company) =>
                company.nombre_fantasia
                    .toLowerCase()
                    .includes(filterValue.toLowerCase())
            )
        }
        if (
            statusFilter !== 'all' &&
            Array.from(statusFilter).length !== statusOptions.length
        ) {
            filteredUsers = filteredUsers.filter((company) =>
                Array.from(statusFilter).includes(company.nombre_fantasia)
            )
        }

        return filteredUsers
    }, [companies, filterValue, statusFilter])

    const pages = Math.ceil(filteredItems.length / rowsPerPage)

    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage
        const end = start + rowsPerPage

        return filteredItems.slice(start, end)
    }, [page, filteredItems, rowsPerPage])

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a: Company, b: Company) => {
            const first = a[sortDescriptor.column as keyof Company] as number
            const second = b[sortDescriptor.column as keyof Company] as number
            const cmp = first < second ? -1 : first > second ? 1 : 0

            return sortDescriptor.direction === 'descending' ? -cmp : cmp
        })
    }, [sortDescriptor, items])

    const renderCell = React.useCallback(
        (company: Company, columnKey: React.Key) => {
            const cellValue = company[columnKey as keyof Company]

            const handleUpdate = () => {
                setItemToUpdate(company)
                onOpen()
            }

            switch (columnKey) {
                case 'nombre_fantasia':
                    return (
                        <User
                            avatarProps={{ radius: 'lg', src: '' }}
                            description={company.email}
                            name={cellValue}
                        >
                            {company.nombre_fantasia}
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
                        placeholder="Buscar por razón social..."
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
                            onClick={() => router.push('companies/add')}
                        >
                            Agregar
                        </Button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-default-400 text-small">
                        Total {companies.length} Secciones
                    </span>
                    <label className="flex items-center text-default-400 text-small">
                        Filas por página:
                        <select
                            className="bg-transparent outline-none text-default-400 text-small"
                            onChange={onRowsPerPageChange}
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value={companies.length}>
                                {companies.length}
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
        companies.length,
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
                    emptyContent={'No companies found'}
                    isLoading={isLoading}
                    items={sortedItems}
                    loadingContent={<Spinner label="Loading..." />}
                >
                    {(item) => (
                        <TableRow key={item.nombre_fantasia}>
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
                                <CompaniesAddForm
                                    item={itemToUpdate}
                                    setItems={setCompanies}
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
