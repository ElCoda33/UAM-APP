import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from '@nextui-org/dropdown'
import { Button } from '@nextui-org/button'

export default function Mydropdown() {
    return (
        <Dropdown>
            <DropdownTrigger>
                <Button variant="bordered">Open Menu</Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Static Actions">
                <DropdownItem key="new">New file</DropdownItem>
                <DropdownItem key="copy">Copy link</DropdownItem>
                <DropdownItem key="edit">Edit file</DropdownItem>
                <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                >
                    Delete file
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    )
}
