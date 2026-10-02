import { onBeforeUnmount, onMounted, readonly, shallowRef } from 'vue';
import type { Ref } from 'vue';

/**
 * Whether an element fits on screen under its sticky offset, for turning
 * position: sticky on only when the whole element stays in view. A sticky
 * element taller than the space left would keep its end hidden until the
 * page scrolls past its column.
 *
 * The space it needs is its own height, its `top` (read from its CSS, so
 * the offset lives in one place) and `gapBelow` pixels kept free under it.
 * It stays false until the page is mounted in the browser, so the server
 * render and the first browser render match.
 */
export function useFitsViewport(
    target: Readonly<Ref<HTMLElement | null | undefined>>,
    gapBelow = 24,
): Readonly<Ref<boolean>> {
    const fits = shallowRef(false);
    let observer: ResizeObserver | undefined;

    function measure(): void {
        const element = target.value;

        if (!element) {
            return;
        }

        // A length when the class sets one, "auto" (NaN) when it does not.
        const top = Number.parseFloat(getComputedStyle(element).top) || 0;

        fits.value =
            element.offsetHeight + top + gapBelow <= window.innerHeight;
    }

    onMounted(() => {
        measure();
        window.addEventListener('resize', measure, { passive: true });

        if (typeof ResizeObserver !== 'undefined' && target.value) {
            observer = new ResizeObserver(measure);
            observer.observe(target.value);
        }
    });

    onBeforeUnmount(() => {
        window.removeEventListener('resize', measure);
        observer?.disconnect();
    });

    return readonly(fits);
}
