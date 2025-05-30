import React from 'react'
import { Input } from '@nextui-org/react'

import { SearchIcon } from '../icons'

export default function SearchInput() {
    return (
        <Input
            isClearable
            className="sm:w-1/2  m-2"
            label="Search"
            placeholder="Type to search..."
            radius="lg"
            startContent={
                <SearchIcon className="text-black/50 mb-0.5 dark:text-white/90 text-slate-400 pointer-events-none flex-shrink-0" />
            }
        />
    )
}
