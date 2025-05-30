export default function BasicPopover() {
    const handleClick = async (e: any) => {
        'use server'

        e.preventDefault()
    }

    return (
        <div>
            <form>
                <button onClick={handleClick}>enviar</button>
            </form>
        </div>
    )
}
