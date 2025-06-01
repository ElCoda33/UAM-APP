'use client'
import { LockOpenOutlined } from '@mui/icons-material'
import { Input } from "@heroui/input"
import { Button, Checkbox } from "@heroui/react"
import { useState } from 'react'
import { redirect } from 'next/navigation'
import { enqueueSnackbar } from 'notistack'

import { EyeSlashFilledIcon } from '../EyeSlashFilledlcon'
import { EyeFilledIcon } from '../EyeFilledlcon'
import { login } from '../../lib/session/login'

export default function LoginForm() {
    const [isVisible, setIsVisible] = useState(false)
    const [error, setError] = useState<any>()

    const toggleVisibility = () => setIsVisible(!isVisible)

    const handleLogin = async (formData: FormData) => {
        const isToken = await login(formData)

        if (!isToken.error) {
            setError('')
            redirect('dashboard')
        } else {
            setError(isToken.error)
            enqueueSnackbar('Usuario y/o contraseña incorrecto', {
                variant: 'error',
            })
        }
    }

    return (
        <form
            action={handleLogin}
            className="flex flex-col items-center justify-center w-full"
        >
            <LockOpenOutlined fontSize="large" />
            <h3 className="text-2xl m-5">Ingresar</h3>
            <Input
                className="sm:w-1/2  m-2 "
                color={error && 'danger'}
                id="ci"
                label="Cédula de indentidad"
                name="ci"
                type="ci"
            />

            <Input
                className="sm:w-1/2  m-2"
                color={error && 'danger'}
                endContent={
                    <button
                        aria-label="toggle password visibility"
                        className="focus:outline-none"
                        type="button"
                        onClick={toggleVisibility}
                    >
                        {isVisible ? (
                            <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                        ) : (
                            <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                        )}
                    </button>
                }
                label="Contraseña"
                name="password"
                type={isVisible ? 'text' : 'password'}
            />
            <div className="sm:w-1/2  m-2  w-full">
                <Checkbox
                    defaultSelected
                    id="record"
                    name="record"
                    size="md"
                    value="true"
                >
                    Recuerdame
                </Checkbox>
            </div>

            <Button className=" w-full sm:w-1/2  m-2" type="submit">
                Entrar
            </Button>
            <div className="w-full sm:w-1/2 m-1 flex justify-between">
                {/* <Link href={"/mailRecover"}>¿Olvidaste tu contraseña?</Link>
        <Link href={"/signUp"}>¿No tienes cuenta? Registrate</Link> */}
            </div>
        </form>
    )
}
