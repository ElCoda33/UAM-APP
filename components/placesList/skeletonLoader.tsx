import React from 'react'
import { Skeleton } from "@heroui/react"

export default function SkeletonLoader() {
    return (
        <div className="w-full h-full flex-col justify-evenly content-evenly">
            <Skeleton className="w-3/5 rounded-lg">
                <div className="h-3 w-3/5 rounded-lg bg-default-200" />
            </Skeleton>
            <Skeleton className="w-3/5 rounded-lg">
                <div className="h-3 w-3/5 rounded-lg bg-default-200" />
            </Skeleton>
            <Skeleton className="w-3/5 rounded-lg">
                <div className="h-3 w-3/5 rounded-lg bg-default-200" />
            </Skeleton>
        </div>
    )
}
