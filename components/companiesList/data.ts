const columns = [
    { name: 'NOMBRE DE FANTASIA', uid: 'nombre_fantasia', sortable: true },
    { name: 'RAZÓN SOCIAL', uid: 'razon_social', sortable: true },
    { name: 'RUT', uid: 'rut', sortable: true },
    { name: 'EMAIL', uid: 'email', sortable: true },
    { name: 'TELÉFONO', uid: 'tel', sortable: true },
    { name: 'ACTIONS', uid: 'actions' },
]

const statusOptions = [
    { name: 'Active', uid: 'active' },
    { name: 'Disabled', uid: 'disabled' },
    { name: 'Vacation', uid: 'vacation' },
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
