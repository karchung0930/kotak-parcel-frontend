import { computed, ref, shallowRef, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import { distanceKm, formatDistance } from '@/lib/branches';
import type { Coordinates } from '@/lib/branches';
import type { Branch } from '@/types';

/**
 * "Use my location": sorts branches by distance from the visitor.
 *
 * The browser asks for permission and works out the distances itself. The
 * position is kept in memory on this page only and is never sent to the
 * server. A refusal or a failure leaves the list in its usual order and
 * `message` says why, for an aria-live note.
 */

export type LocateStatus =
    | 'idle'
    | 'locating'
    | 'located'
    | 'denied'
    | 'failed'
    | 'unsupported';

export type BranchWithDistance = {
    branch: Branch;
    /** Kilometres from the visitor, or null until they share a location. */
    distanceKm: number | null;
};

export type NearestBranches = {
    status: Ref<LocateStatus>;
    locate: () => void;
    clear: () => void;
    /** Nearest first once located; otherwise in the order given. */
    branches: ComputedRef<BranchWithDistance[]>;
    nearest: ComputedRef<BranchWithDistance | null>;
    /** A sentence describing the current state, for an aria-live note. */
    message: ComputedRef<string>;
};

export function useNearestBranches(
    source: MaybeRefOrGetter<Branch[]>,
): NearestBranches {
    const status = ref<LocateStatus>('idle');
    const origin = shallowRef<Coordinates | null>(null);

    function locate(): void {
        if (status.value === 'locating') {
            return;
        }

        if (!('geolocation' in navigator)) {
            status.value = 'unsupported';

            return;
        }

        status.value = 'locating';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                origin.value = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };
                status.value = 'located';
            },
            (error) => {
                origin.value = null;
                status.value =
                    error.code === error.PERMISSION_DENIED
                        ? 'denied'
                        : 'failed';
            },
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
        );
    }

    function clear(): void {
        origin.value = null;
        status.value = 'idle';
    }

    const branches = computed<BranchWithDistance[]>(() => {
        const list = toValue(source);
        const from = origin.value;

        if (!from) {
            return list.map((branch) => ({ branch, distanceKm: null }));
        }

        return list
            .map((branch) => ({ branch, distanceKm: distanceKm(from, branch) }))
            .sort((a, b) => a.distanceKm - b.distanceKm);
    });

    const nearest = computed(() =>
        origin.value ? (branches.value[0] ?? null) : null,
    );

    const message = computed(() => {
        switch (status.value) {
            case 'locating':
                return 'Finding your location…';
            case 'located':
                return nearest.value && nearest.value.distanceKm !== null
                    ? `Sorted by distance. Nearest: ${nearest.value.branch.name}, ${formatDistance(nearest.value.distanceKm)} away.`
                    : 'Sorted by distance from you.';
            case 'denied':
                return 'Location access is turned off, so the list is in its usual order. To sort by distance, allow location for this site in your browser and try again.';
            case 'failed':
                return 'We could not get your location. Check that location services are on, then try again.';
            case 'unsupported':
                return 'This browser cannot share a location. Choose a branch from the list instead.';
            default:
                return '';
        }
    });

    return { status, locate, clear, branches, nearest, message };
}
