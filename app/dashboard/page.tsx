import { redirect } from 'next/navigation'

const Dashpage = async () => {
    redirect('dashboard/users')

    return <></>
}

export default Dashpage
