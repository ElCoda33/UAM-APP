'use client'

import MovementsList from '@/components/movementsList/movementsList'

const AssetAddPage = ({
    searchParams,
}: {
    params: { slug: string }
    searchParams: { [key: string]: string | string[] | undefined }
}) => {
    return (
        <>
            <MovementsList nroSerie={searchParams.q} />
        </>
    )
}

export default AssetAddPage
