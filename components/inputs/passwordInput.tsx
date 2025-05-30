'use client'

import React from 'react'
import { Input } from '@nextui-org/react'

import { EyeFilledIcon } from './icons/EyeFilledIcon'
import { EyeSlashFilledIcon } from './icons/EyeSlashFilledIcon'

export default function PasswordInput() {
    const [isVisible, setIsVisible] = React.useState(false)

    const toggleVisibility = () => setIsVisible(!isVisible)

    return (
        <Input
            className="sm:w-1/2  m-2"
            endContent={
                <button
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
            id="password"
            label="Password"
            name="password"
            type={isVisible ? 'text' : 'password'}
        />
    )
}
