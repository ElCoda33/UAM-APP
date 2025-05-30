import PlacesList from '@/components/placesList/placesList'

const PlacesPage = () => {
    return (
        <>
            <div className="h-full w-full flex flex-col md:flex-row">
                <PlacesList />
            </div>
        </>
    )
}

export default PlacesPage
