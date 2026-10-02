import type { Pricing } from '@/types';

/**
 * Live price estimates, mirroring App\Support\PriceCalculator exactly
 * (integer grams and sen). The branch confirms the final price when it
 * weighs the parcel, so always label these as estimates.
 *
 * Example: 4.2 kg in a 40 × 30 × 25 cm box is 6.0 kg volumetric, charged as
 * 6 kg: RM 8.00 for the first kg + 5 × RM 2.00 = RM 18.00.
 */

export type ParcelSize = {
    weightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
};

export type PriceEstimate = {
    actualG: number;
    volumetricG: number;
    chargeableG: number;
    /** Every started kg counts: 5.1 kg is charged as 6 kg. */
    chargedKg: number;
    /** Kilograms charged at the per-kg rate (chargedKg - 1, never below 0). */
    extraKg: number;
    priceSen: number;
    /** True when the volumetric weight is the one charged. */
    byVolume: boolean;
};

/** L × W × H ÷ divisor, in grams rounded up to the next gram. */
export function volumetricWeightGrams(
    pricing: Pricing,
    lengthCm: number,
    widthCm: number,
    heightCm: number,
): number {
    return Math.ceil((lengthCm * widthCm * heightCm * 1000) / pricing.divisor);
}

/** Price in sen for a chargeable weight in grams. */
export function priceForWeight(pricing: Pricing, chargeableG: number): number {
    const chargedKg = Math.ceil(chargeableG / 1000);

    return pricing.base + Math.max(0, chargedKg - 1) * pricing.perKg;
}

/**
 * The full breakdown, or null while any input is missing or not a positive
 * number (for example while the customer is still typing).
 */
export function estimatePrice(
    pricing: Pricing,
    size: Partial<ParcelSize>,
): PriceEstimate | null {
    const values = [size.weightG, size.lengthCm, size.widthCm, size.heightCm];

    if (!values.every((value) => Number.isFinite(value) && Number(value) > 0)) {
        return null;
    }

    const actualG = Math.round(size.weightG as number);
    const volumetricG = volumetricWeightGrams(
        pricing,
        Math.round(size.lengthCm as number),
        Math.round(size.widthCm as number),
        Math.round(size.heightCm as number),
    );
    const chargeableG = Math.max(actualG, volumetricG);
    const chargedKg = Math.ceil(chargeableG / 1000);

    return {
        actualG,
        volumetricG,
        chargeableG,
        chargedKg,
        extraKg: Math.max(0, chargedKg - 1),
        priceSen: priceForWeight(pricing, chargeableG),
        byVolume: volumetricG > actualG,
    };
}

/** Kilograms typed by a person ("4.2") → whole grams (4200), or NaN. */
export function kgToGrams(kg: string | number | null | undefined): number {
    const value = typeof kg === 'string' ? Number(kg.replace(',', '.')) : kg;

    return value === null || value === undefined || !Number.isFinite(value)
        ? Number.NaN
        : Math.round(value * 1000);
}
