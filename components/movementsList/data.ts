const columns = [
    { name: 'ID', uid: 'id', sortable: true },
    { name: 'LUGAR DE DESTINO', uid: 'lugar_destino', sortable: true },
    { name: 'SECTOR', uid: 'sector', sortable: true },
    { name: 'FECHA DE RECEPCIÓN', uid: 'fecha_recibido', sortable: true },
    { name: 'PERSONA QUE RECEPCIONÓ', uid: 'persona_recibe', sortable: true },
    { name: 'TIPO DE MOVIMIENTO', uid: 'tipo_ubicacion', sortable: true },
    { name: 'DEPENDENCIA', uid: 'dependencia', sortable: true },
    { name: 'FECHA DE MOVIMIENTO', uid: 'fecha_movimiento', sortable: true },
    { name: 'FIRMA DEL MOVIMIENTO', uid: 'firma_movimiento', sortable: true },
    {
        name: 'CI DE USUARIO QUE REALIZÓ EL MOVIMIENTO',
        uid: 'ci_usuario',
        sortable: true,
    },
    { name: 'NÚMERO DE SERIE DEL BIEN', uid: 'nro_serie_bien', sortable: true },
    {
        name: 'SECCIÓN QUE TRANSFIERIÓ',
        uid: 'seccion_transfiere',
        sortable: true,
    },
    { name: 'ACCIONES', uid: 'actions' },
]

const statusOptions = [
    { name: 'en uso', uid: 'enUso' },
    { name: 'Dado de baja', uid: 'baja' },
    { name: 'En deposito', uid: 'deposito' },
]

export { columns, statusOptions }
