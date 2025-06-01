'use client'
import React from 'react'
import { Select, SelectItem } from "@heroui/react"

export default function SelectInput({
    name,
    id,
    placeholder,
    label,
    data,
}: any) {
    return (
        <Select
            className="sm:w-1/2  m-2"
            id={id}
            label={label}
            name={name}
            placeholder={placeholder}
        >
            {data.map((element: any) => (
                <SelectItem key={element.nombre}>{element.nombre}</SelectItem>
            ))}
        </Select>
    )
}
