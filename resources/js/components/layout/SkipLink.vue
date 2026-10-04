<template>
    <!-- Moves focus to the page's content, so it has the white outline
         look (there is no black button), with the buttons' focus ring and
         a shadow to lift it off the header behind it. not-sr-only takes
         the padding away, so it is set again on focus. -->
    <a
        href="#main"
        class="sr-only z-[100] rounded-md border border-line-strong bg-white text-sm font-bold text-ink shadow-md outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:px-4 focus:py-3 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
        Skip to main content
    </a>
</template>
