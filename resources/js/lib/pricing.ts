import type {
    MalaysianStateValue,
    PriceList,
    PriceRoute,
    PriceZone,
} from '@/types';

/**
 * Live price estimates from a rate card, mirroring App\Support\PriceCalculator
 * exactly (integer grams and sen). The branch confirms the final price when
 * it weighs the parcel, so always label these as estimates.
 *
 * A parcel is charged on the greater of its actual and volumetric weight
 * (L × W × H in cm ÷ the card's divisor). The route runs from the zone of
 * the drop-off branch's state to the zone of the delivery state. The price
 * is that of the route's lightest band that covers the weight; above the
 * highest band, each started kg costs the route's extra-kg price on top.
 *
 * Example: 4.2 kg in a 40 × 30 × 25 cm box is 6.0 kg volumetric. With one
 * band up to 1 kg at RM 8.00 and RM 2.00 per extra kg, it costs
 * RM 8.00 + 5 × RM 2.00 = RM 18.00.
 *
 * tests/js/pricing.check.ts runs the cases in tests/js/fixtures, which the
 * backend's PriceCalculatorTest runs too.
 */

export type ParcelSize = {
    weightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
};

/** Where a parcel goes: from the drop-off branch's state to the delivery state. */
export type ParcelRoute = {
    origin: MalaysianStateValue | null | undefined;
    destination: MalaysianStateValue | null | undefined;
};

/**
 * The same fields as App\Support\PriceQuote::toArray(). Public pages get
 * the card without its id, so their quotes have none.
 */
export type PriceQuote = {
    rateCardId: number | null;
    originZone: string;
    destinationZone: string;
    actualG: number;
    volumetricG: number;
    chargeableG: number;
    /** The band that priced the parcel (the highest band when it is heavier). */
    bandMaxG: number;
    bandPriceSen: number;
    /** Started kg above the highest band, each at extraKgSen. */
    extraKg: number;
    extraKgSen: number;
    priceSen: number;
};

/** The zone a state belongs to. */
export function zoneFor(
    card: PriceList,
    state: MalaysianStateValue,
): PriceZone | null {
    return card.zones.find((zone) => zone.states.includes(state)) ?? null;
}

/**
 * The zone most of the given branch states are in (the first such zone on
 * a tie): where most parcels start. Without branches, the first zone that
 * has states.
 */
export function homeZone(
    card: PriceList,
    branchStates: MalaysianStateValue[],
): PriceZone | null {
    const counts = new Map<string, number>();

    for (const state of branchStates) {
        const zone = zoneFor(card, state);

        if (zone) {
            counts.set(zone.code, (counts.get(zone.code) ?? 0) + 1);
        }
    }

    let home: PriceZone | null = null;
    let most = 0;

    for (const zone of card.zones) {
        const count = counts.get(zone.code) ?? 0;

        if (count > most) {
            home = zone;
            most = count;
        }
    }

    return home ?? card.zones.find((zone) => zone.states.length > 0) ?? null;
}

/** The route from one zone to another. */
export function routeBetween(
    card: PriceList,
    from: PriceZone,
    to: PriceZone,
): PriceRoute | null {
    return (
        card.routes.find(
            (route) => route.from === from.code && route.to === to.code,
        ) ?? null
    );
}

/**
 * A route's name from its zones' names: "Within Sarawak" or "Peninsular
 * Malaysia → Sarawak". Zone names on a card differ, so equal names mean
 * one zone; pass `within` where they may not yet (the draft editor).
 */
export function routeName(
    origin: string,
    destination: string,
    within: boolean = origin === destination,
): string {
    return within ? `Within ${origin}` : `${origin} → ${destination}`;
}

/** routeName() for two zones of a card. */
export function routeLabel(from: PriceZone, to: PriceZone): string {
    return routeName(from.name, to.name, from.code === to.code);
}

/** L × W × H ÷ divisor, in grams rounded up to the next gram. */
export function volumetricWeightGrams(
    divisor: number,
    lengthCm: number,
    widthCm: number,
    heightCm: number,
): number {
    // Integer ceiling, as PHP's intdiv() does it.
    return Math.floor(
        (lengthCm * widthCm * heightCm * 1000 + divisor - 1) / divisor,
    );
}

/**
 * Price a parcel between two states, or null when the card has no zone or
 * route for them (a published card always has).
 */
export function quote(
    card: PriceList,
    origin: MalaysianStateValue,
    destination: MalaysianStateValue,
    actualG: number,
    lengthCm: number,
    widthCm: number,
    heightCm: number,
): PriceQuote | null {
    const from = zoneFor(card, origin);
    const to = zoneFor(card, destination);
    const route = from && to ? routeBetween(card, from, to) : null;

    if (!from || !to || !route || route.bands.length === 0) {
        return null;
    }

    const volumetricG = volumetricWeightGrams(
        card.divisor,
        lengthCm,
        widthCm,
        heightCm,
    );
    const chargeableG = Math.max(actualG, volumetricG);
    const covering = route.bands.find((band) => band.maxWeightG >= chargeableG);
    const band = covering ?? route.bands[route.bands.length - 1];
    const extraKg = covering
        ? 0
        : Math.floor((chargeableG - band.maxWeightG + 999) / 1000);

    return {
        rateCardId: card.id ?? null,
        originZone: from.name,
        destinationZone: to.name,
        actualG,
        volumetricG,
        chargeableG,
        bandMaxG: band.maxWeightG,
        bandPriceSen: band.priceSen,
        extraKg,
        extraKgSen: route.extraKgSen,
        priceSen: band.priceSen + extraKg * route.extraKgSen,
    };
}

/**
 * The quote for what someone typed, or null while the route or any size
 * is missing or not a positive number (for example while still typing).
 */
export function estimatePrice(
    card: PriceList,
    route: ParcelRoute,
    size: Partial<ParcelSize>,
): PriceQuote | null {
    const values = [size.weightG, size.lengthCm, size.widthCm, size.heightCm];

    if (
        !route.origin ||
        !route.destination ||
        !values.every((value) => Number.isFinite(value) && Number(value) > 0)
    ) {
        return null;
    }

    return quote(
        card,
        route.origin,
        route.destination,
        Math.round(size.weightG as number),
        Math.round(size.lengthCm as number),
        Math.round(size.widthCm as number),
        Math.round(size.heightCm as number),
    );
}

/** The weight the price stands for: the band, plus any extra kg (4.2 kg → 5 kg). */
export function billedWeightGrams(priced: PriceQuote): number {
    return priced.bandMaxG + priced.extraKg * 1000;
}

/** True when the volumetric weight is the one charged. */
export function chargedByVolume(priced: PriceQuote): boolean {
    return priced.volumetricG > priced.actualG;
}

/**
 * The cheapest first band, from one zone (by code) or on any route: the
 * "from" price shown before a parcel is priced.
 */
export function lowestPriceSen(card: PriceList, fromZone?: string): number {
    const prices = card.routes
        .filter((route) => !fromZone || route.from === fromZone)
        .flatMap((route) => route.bands.slice(0, 1))
        .map((band) => band.priceSen);

    return prices.length > 0 ? Math.min(...prices) : 0;
}

/** The cheapest price per extra kg on any route. */
export function lowestExtraKgSen(card: PriceList): number {
    const prices = card.routes.map((route) => route.extraKgSen);

    return prices.length > 0 ? Math.min(...prices) : 0;
}

/** Kilograms typed by a person ("4.2") → whole grams (4200), or NaN. */
export function kgToGrams(kg: string | number | null | undefined): number {
    const value = typeof kg === 'string' ? Number(kg.replace(',', '.')) : kg;

    return value === null || value === undefined || !Number.isFinite(value)
        ? Number.NaN
        : Math.round(value * 1000);
}

/** Ringgit typed by a person ("8.5" or "RM 8.50") → whole sen (850), or NaN. */
export function ringgitToSen(ringgit: string): number {
    const text = ringgit
        .trim()
        .replace(/^RM\s*/i, '')
        .replace(',', '.');

    return /^\d+(\.\d{1,2})?$/.test(text)
        ? Math.round(Number(text) * 100)
        : Number.NaN;
}

/** Sen → ringgit as an editable value: 850 → "8.50". */
export function senToRinggit(sen: number | null | undefined): string {
    return sen === null || sen === undefined ? '' : (sen / 100).toFixed(2);
}
