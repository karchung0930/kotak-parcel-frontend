import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { canSendParcels } from '@/lib/navigation';
import type { User } from '@/types';

/**
 * Whether to offer "Send a parcel" links on public pages: true for guests
 * and customers, false for signed-in staff, drivers and admins.
 */
export function useCanSendParcels(): ComputedRef<boolean> {
    const page = usePage();

    // Guests have no user, whatever the shared Auth type says.
    return computed(() => canSendParcels(page.props.auth.user as User | null));
}
