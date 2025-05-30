const columns = [
    { name: 'PRODUCTO', uid: 'producto', sortable: true },
    { name: 'DESCRIPCIÓN', uid: 'descripcion', sortable: true },
    { name: 'NÚMERO DE SERIE', uid: 'nro_serie', sortable: true },
    { name: 'SECCIÓN ACTUAL', uid: 'seccion', sortable: true },
    { name: 'FECHA DE VENTA', uid: 'fecha_venta', sortable: true },
    { name: 'RUT DE LA EMPRESA', uid: 'rut_empresa', sortable: true },
    { name: 'NÚMERO DE FACTURA', uid: 'nro_factura', sortable: true },
    { name: 'FECHA DE GARANTÍA', uid: 'fecha_garantia', sortable: true },
    { name: 'CÓDIGO DE INVENTARIO', uid: 'codigo_inventario', sortable: true },
    {
        name: 'PROCEDIMIENTO DE ADQUISICIÓN',
        uid: 'procedimiento_adquisicion',
        sortable: true,
    },
    { name: 'ESTADO', uid: 'estado', sortable: true },
    { name: 'ACTIONS', uid: 'actions' },
]

const statusOptions = [
    { name: 'en uso', uid: 'enUso' },
    { name: 'Dado de baja', uid: 'baja' },
    { name: 'En deposito', uid: 'deposito' },
]

const users = [
    {
        id: 'dsfsdf',
        ci: '53215654',
        nombre: 'german',
        apellido: 'Coordinator',
        rol: 'administrador',
        seccion: 'Operations',
        estado: 'active',
        edad: '26',
        avatar: 'https://i.pravatar.cc/150?img=45',
        email: 'mia.robinson@example.com',
        fecha_nacimiento: '2004-25-25',
    },
]

export { columns, users, statusOptions }
