<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { FileSearch } from '@lucide/vue';
import { useId } from 'vue';
import FormField from '@/components/admin/FormField.vue';
import FormSection from '@/components/admin/FormSection.vue';
import NativeSelect from '@/components/NativeSelect.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { sheet } from '@/routes/admin/rates/imports';
import type { RateImport } from '@/types';

/**
 * Read another sheet of an uploaded workbook, when the prices are not on
 * the one that was read (or it was empty). The file is read again, so the
 * columns are suggested afresh. A white button: it switches what is read.
 */
const props = defineProps<{
    rateImport: RateImport;
}>();

const id = `sheet-${useId()}`;

const form = useForm({ sheet: props.rateImport.sheet ?? '' });

function submit(): void {
    form.submit(sheet(props.rateImport.id), { preserveScroll: true });
}
</script>

<template>
    <form novalidate @submit.prevent="submit">
        <FormSection
            title="Sheet"
            description="The workbook has more than one sheet. Read another one if the prices are there."
        >
            <template #actions>
                <Button
                    type="submit"
                    variant="outline"
                    :disabled="
                        form.processing || form.sheet === rateImport.sheet
                    "
                    class="h-11 rounded-lg px-4 font-bold"
                >
                    <Spinner v-if="form.processing" />
                    <FileSearch v-else aria-hidden="true" />
                    Read this sheet
                </Button>
            </template>
            <FormField
                :id="id"
                label="Sheet to read"
                :error="form.errors.sheet"
            >
                <template #default="{ describedby, invalid }">
                    <NativeSelect
                        :id="id"
                        v-model="form.sheet"
                        :aria-describedby="describedby"
                        :aria-invalid="invalid"
                    >
                        <option
                            v-for="name in rateImport.preview?.sheets ?? []"
                            :key="name"
                            :value="name"
                        >
                            {{ name }}
                        </option>
                    </NativeSelect>
                </template>
            </FormField>
        </FormSection>
    </form>
</template>
