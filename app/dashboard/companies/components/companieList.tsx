// app/dashboard/companies/components/companieList.tsx
"use client";

import React, { useEffect, useState, Key, useCallback } from "react";
import { Chip, Tooltip, Button, SortDescriptor } from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";

import { CompanyRecord } from "@/app/api/companies/route";
import GenericTable from "../../components/GenericTable";

const columns = [
    { uid: 'id', name: 'ID', sortable: true, filterable: false },
    { uid: 'legal_name', name: 'Razón Social', sortable: true, filterable: true },
    { uid: 'trade_name', name: 'Nombre Fantasía', sortable: true, filterable: true },
    { uid: 'tax_id', name: 'RUT', sortable: true, filterable: true },
    { uid: 'email', name: 'Email', sortable: true, filterable: true },
    { uid: 'phone_number', name: 'Teléfono', sortable: true, filterable: true },
    { uid: 'created_at', name: 'Fecha Creación', sortable: true, filterable: false },
    { uid: 'actions', name: 'Acciones', sortable: false, filterable: false },
];

const INITIAL_VISIBLE_COLUMNS = ['legal_name', 'trade_name', 'tax_id', 'email', 'phone_number', 'actions'];

export default function CompanieList() {
    const router = useRouter();
    const [companies, setCompanies] = useState<CompanyRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCompanies = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/companies');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Error al cargar empresas");
            }
            const data: CompanyRecord[] = await response.json();
            setCompanies(data);
        } catch (err: any) {
            toast.error(err.message || "No se pudieron cargar las empresas.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const handleDeleteCompany = async (companyId: number, companyName: string) => {
        const confirmDelete = window.confirm(`¿Estás seguro de eliminar la empresa "${companyName}" (ID: ${companyId})? Los activos asociados tendrán su proveedor puesto a NULO.`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Eliminando empresa...");
        try {
            const response = await fetch(`/api/companies/${companyId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Error al eliminar empresa");
            toast.success(result.message || "Empresa eliminada.", { id: toastId });
            fetchCompanies();
        } catch (err: any) {
            toast.error(err.message || "No se pudo eliminar la empresa.", { id: toastId });
        }
    };

    const renderCell = useCallback((company: CompanyRecord, columnKey: Key): React.ReactNode => {
        const cellValue = company[columnKey as keyof CompanyRecord];

        switch (columnKey) {
            case "legal_name":
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{company.legal_name}</span>
                        {company.trade_name && company.trade_name !== company.legal_name && (
                            <span className="text-xs text-default-500">{company.trade_name}</span>
                        )}
                    </div>
                );
            case "tax_id":
                return <span className="font-mono text-sm">{company.tax_id}</span>;
            case "email":
                return <span className="text-sm">{company.email || 'N/A'}</span>;
            case "phone_number":
                return <span className="text-sm">{company.phone_number || 'N/A'}</span>;
            case "created_at":
                return <span className="text-sm">{cellValue ? new Date(cellValue as string).toLocaleDateString('es-UY') : 'N/A'}</span>;
            case "actions":
                return (
                    <div className="relative flex items-center justify-end gap-1">
                        <Tooltip content="Ver Detalles">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/companies/${company.id}`)}>
                                <EyeIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Editar Empresa">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/companies/${company.id}/edit`)}>
                                <EditIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip color="danger" content="Eliminar Empresa">
                            <Button isIconOnly size="sm" variant="light" onPress={() => handleDeleteCompany(company.id, company.legal_name)}>
                                <DeleteIcon className="text-lg text-danger" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return cellValue !== null && cellValue !== undefined ? String(cellValue) : <span className="text-default-400">N/A</span>;
        }
    }, [router, fetchCompanies]);

    const getFilterValue = useCallback((company: CompanyRecord, columnKey: Key): string => {
        switch (columnKey) {
            case "legal_name": return company.legal_name || "";
            case "trade_name": return company.trade_name || "";
            case "tax_id": return company.tax_id || "";
            case "email": return company.email || "";
            case "phone_number": return company.phone_number || "";
            default: return String(company[columnKey as keyof CompanyRecord] || "");
        }
    }, []);

    const handleExport = async (format: 'csv' | 'pdf', filters: any, sort: SortDescriptor, columns: any[]) => {
        const toastId = toast.loading(`Generando exportación ${format.toUpperCase()}...`);
        try {
            const apiFilters: any = {
                searchText: filters.searchText,
                searchAttribute: filters.searchAttribute,
            };

            const payload = {
                filters: apiFilters,
                sort: {
                    column: sort.column,
                    direction: sort.direction
                },
                columns: columns.map(c => ({ uid: c.uid, name: c.name }))
            };

            const response = await fetch(`/api/companies/export/${format}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const resJson = await response.json().catch(() => ({}));
                throw new Error(resJson.message || `Error al exportar a ${format.toUpperCase()}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `empresas_exportadas.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Exportación ${format.toUpperCase()} completada`, { id: toastId });

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al exportar", { id: toastId });
        }
    };

    return (
        <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Empresas</h1>
            <GenericTable<CompanyRecord>
                data={companies}
                columns={columns}
                renderCell={renderCell}
                isLoading={isLoading}
                initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
                entityName="Empresas"
                onAdd={() => router.push('/dashboard/companies/add')}
                onExport={handleExport}
                getFilterValue={getFilterValue}
                emptyContent={companies.length === 0 && !isLoading ? "No hay empresas registradas." : "Ninguna empresa coincide con los filtros."}
            />
        </div>
    );
}