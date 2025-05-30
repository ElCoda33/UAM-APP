'use server'
import dbquery from './models/conection'

// import { db } from "./conection"

// const CreateInvoiceSchema = z.object({
// email: z.string(),
// password: z.string()
// })
// const CreateInvoiceFormSchema = CreateInvoiceSchema.omit({
// id: true,
// date: true
// })

export async function sectionsAdd(formData: FormData) {
    // const  {email,password} = CreateInvoiceFormSchema.parse({
    // email: formData.get('email'),
    // password: formData.get('password')
    // })
    const nombre = formData.get('nombre')

    // const [date] = new Date().toISOString().split("T")
    await dbquery(`insert into secciones(nombre) values('${nombre}')`)

    // revalidatePath("/dashboard/invoices")
    // redirect("/dashboard/invoices")
}
