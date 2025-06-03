import NavBar from '@/components/AppNavbar'

export default async function Layout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
                {children}
            </main>
        </>
    )
}
