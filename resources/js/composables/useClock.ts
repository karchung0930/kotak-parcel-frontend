import { onBeforeUnmount, onMounted, shallowRef } from 'vue';
import type { ShallowRef } from 'vue';

/**
 * The current time, refreshed every minute, for labels such as "Open now".
 *
 * It stays null until the page is mounted in the browser, so the server
 * render and the first browser render match (no hydration mismatch). Show
 * a time-free fallback while it is null.
 */
export function useClock(intervalMs = 60_000): ShallowRef<Date | null> {
    const now = shallowRef<Date | null>(null);
    let timer: ReturnType<typeof setInterval> | undefined;

    onMounted(() => {
        now.value = new Date();
        timer = setInterval(() => (now.value = new Date()), intervalMs);
    });

    onBeforeUnmount(() => clearInterval(timer));

    return now;
}
