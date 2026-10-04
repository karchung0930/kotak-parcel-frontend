<script setup lang="ts">
import { ChevronDown, Download, FileSpreadsheet, FileText } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { download } from '@/routes/admin/rates';

/**
 * "Download": a version of the rates as an Excel workbook (Rates, Matrix
 * and Zones sheets) or a CSV file of a row per band. Both import back as
 * the same prices. A white button, as it opens a menu and changes nothing.
 * The links are plain downloads, not page visits.
 */
defineProps<{
    rateCardId: number;
}>();
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button variant="outline" class="h-11 rounded-lg px-4 font-bold">
                <Download aria-hidden="true" />
                Download
                <ChevronDown aria-hidden="true" class="-mr-1 text-ink-2" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-60">
            <DropdownMenuItem as-child>
                <a :href="download([rateCardId, 'xlsx']).url" download>
                    <FileSpreadsheet aria-hidden="true" />
                    Excel workbook (.xlsx)
                </a>
            </DropdownMenuItem>
            <DropdownMenuItem as-child>
                <a :href="download([rateCardId, 'csv']).url" download>
                    <FileText aria-hidden="true" />
                    CSV file (.csv)
                </a>
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
