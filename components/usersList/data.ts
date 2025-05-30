const columns = [
    { name: 'NOMBRE', uid: 'nombre', sortable: true },
    { name: 'APELLIDO', uid: 'apellido', sortable: true },
    { name: 'CI', uid: 'ci', sortable: true },
    { name: 'EDAD', uid: 'edad', sortable: true },
    { name: 'ROL', uid: 'rol', sortable: true },
    { name: 'SECCIÓN', uid: 'seccion', sortable: true },
    { name: 'EMAIL', uid: 'email', sortable: true },
    { name: 'ESTADO', uid: 'estado', sortable: true },
    { name: 'NACIMIENTO', uid: 'fecha_nacimiento', sortable: true },
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
