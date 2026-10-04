import { router } from '@inertiajs/vue3';
import { markRaw } from 'vue';
import { toast } from 'vue-sonner';
import KeepTogether from '@/components/KeepTogether.vue';
import type { FlashToast } from '@/types/ui';

// The message is shown through KeepTogether, so a tracking number, date or
// amount in it ("KT-7Q4M92XD is scheduled with Ravi on 6 Oct 2026.") never
// breaks across lines.
const message = markRaw(KeepTogether);

export function initializeFlashToast(): void {
    router.on('flash', (event) => {
        const flash = (event as CustomEvent).detail?.flash;
        const data = flash?.toast as FlashToast | undefined;

        if (!data) {
            return;
        }

        toast[data.type](message, { componentProps: { text: data.message } });
    });
}
