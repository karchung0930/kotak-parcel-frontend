/**
 * The one-point perspective that WarehouseScene and its art pieces share,
 * so the hub, the vans at its docks and the yard all line up.
 *
 * World units are metres: x runs right, y up from the ground, z away from
 * the viewer. The viewer stands in the yard with eyes EYE metres up,
 * looking straight down the hub's dock face, which is the plane
 * x = FACADE_X (the building lies to its left). Everything that is
 * parallel to the picture (a van's side, a sign facing us) is drawn flat
 * at the scale of its depth, FOCAL / z.
 */
export const VANISH_X = 960;
export const HORIZON_Y = 350;
export const FOCAL = 700;
export const EYE = 6;
export const FACADE_X = -9.9;

/** Screen units per metre at depth z. */
export function scaleAt(z: number): number {
    return FOCAL / z;
}

export function screenX(x: number, z: number): number {
    return VANISH_X + (FOCAL * x) / z;
}

export function screenY(y: number, z: number): number {
    return HORIZON_Y + (FOCAL * (EYE - y)) / z;
}

function point(x: number, y: number, z: number): string {
    return `${screenX(x, z).toFixed(1)} ${screenY(y, z).toFixed(1)}`;
}

/**
 * A closed path through world points [x, y, z]. For flat shapes on the
 * dock face, see facadeQuad.
 */
export function worldPath(points: [number, number, number][]): string {
    return `M${points.map(([x, y, z]) => point(x, y, z)).join('L')}Z`;
}

/**
 * A rectangle on a plane parallel to the dock face (x fixed): from depth
 * z0 to z1 and height y0 to y1.
 */
export function facadeQuad(
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    x = FACADE_X,
): string {
    return worldPath([
        [x, y0, z0],
        [x, y1, z0],
        [x, y1, z1],
        [x, y0, z1],
    ]);
}

/** A rectangle on the ground (y 0) from x0 to x1 and depth z0 to z1. */
export function groundQuad(
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    y = 0,
): string {
    return worldPath([
        [x0, y, z0],
        [x1, y, z0],
        [x1, y, z1],
        [x0, y, z1],
    ]);
}

/**
 * An SVG matrix that lays flat artwork onto the dock face: local (0, 0)
 * lands on [x, y, z], local x runs along the face (away from the viewer,
 * `metres` per local unit) and local y runs down. Exact at the anchor and
 * close enough across a sign or a number plate.
 */
export function facadeMatrix(
    y: number,
    z: number,
    metres: number,
    x = FACADE_X,
): string {
    const ox = screenX(x, z);
    const oy = screenY(y, z);
    const step = 0.05;
    const ax = (screenX(x, z + step) - ox) / step;
    const ay = (screenY(y, z + step) - oy) / step;
    const down = scaleAt(z);

    return `matrix(${(ax * metres).toFixed(4)} ${(ay * metres).toFixed(4)} 0 ${(down * metres).toFixed(4)} ${ox.toFixed(2)} ${oy.toFixed(2)})`;
}

/**
 * An SVG transform that stands flat artwork parallel to the picture at
 * depth z: local (0, 0) lands on [x, y, z], `metres` per local unit.
 */
export function flatTransform(
    x: number,
    y: number,
    z: number,
    metres: number,
): string {
    const k = scaleAt(z) * metres;

    return `translate(${screenX(x, z).toFixed(2)} ${screenY(y, z).toFixed(2)}) scale(${k.toFixed(4)})`;
}

export function range(from: number, to: number, step: number): number[] {
    const values: number[] = [];

    for (let value = from; value <= to + 1e-9; value += step) {
        values.push(Number(value.toFixed(4)));
    }

    return values;
}

/** The faces of a box that the viewer can see, as paths. */
export interface BoxFaces {
    front: string;
    /** Null when the top is at or above eye level. */
    top: string | null;
    /** The side that faces the viewer: right of a box left of the eye. */
    side: string | null;
}

/**
 * A box from x0 to x1 (across), y0 to y1 (up) and z0 to z1 (away): its
 * front face is flat to the picture, its top and one side recede.
 */
export function boxFaces(
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
): BoxFaces {
    const front = worldPath([
        [x0, y0, z0],
        [x0, y1, z0],
        [x1, y1, z0],
        [x1, y0, z0],
    ]);
    const top =
        y1 < EYE
            ? worldPath([
                  [x0, y1, z0],
                  [x0, y1, z1],
                  [x1, y1, z1],
                  [x1, y1, z0],
              ])
            : null;
    const sideX = x1 < 0 ? x1 : x0 > 0 ? x0 : null;
    const side =
        sideX === null
            ? null
            : worldPath([
                  [sideX, y0, z0],
                  [sideX, y1, z0],
                  [sideX, y1, z1],
                  [sideX, y0, z1],
              ]);

    return { front, top, side };
}
