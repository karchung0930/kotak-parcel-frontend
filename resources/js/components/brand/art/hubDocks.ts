/**
 * The hub's loading docks, near to far, in hubPerspective's metres: each
 * door is 3.2 m wide with 1.4 m of wall between shelters. Open docks show
 * the lit hall; WarehouseScene backs vans onto some of them.
 */
export interface HubDock {
    index: number;
    /** Two-digit number on the plate over the door. */
    label: string;
    /** Near and far edges of the door opening, and its middle. */
    z0: number;
    z1: number;
    zc: number;
    open: boolean;
}

const FIRST = 9.4;
const PITCH = 4.6;
const WIDTH = 3.2;
const OPEN = new Set([0, 2, 4, 6, 8, 11]);

export const DOCKS: HubDock[] = Array.from({ length: 16 }, (_, index) => {
    const z0 = FIRST + index * PITCH;

    return {
        index,
        label: String(index + 1).padStart(2, '0'),
        z0,
        z1: z0 + WIDTH,
        zc: z0 + WIDTH / 2,
        open: OPEN.has(index),
    };
});
