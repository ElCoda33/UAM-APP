const columns = [
    { name: 'NOMBRE', uid: 'nombre', sortable: true },
    { name: 'NIVEL DE CONDUCCIÓN', uid: 'nivel_conduccion', sortable: true },
    { name: 'DEPENDENCIA', uid: 'dependencia', sortable: true },
    { name: 'EMAIL', uid: 'email', sortable: true },
    { name: 'ACTIONS', uid: 'actions' },
]

const statusOptions = [
    { name: 'Activo', uid: 'active' },
    { name: 'Desactivado', uid: 'disabled' },
]

export { columns, statusOptions }
