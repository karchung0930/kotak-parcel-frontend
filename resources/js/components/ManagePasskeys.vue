<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { KeyRound } from '@lucide/vue';
import { nextTick, ref, useTemplateRef } from 'vue';
import type { Passkey } from '@/types/auth';
import FormSection from '@/components/admin/FormSection.vue';
import PasskeyItem from '@/components/PasskeyItem.vue';
import PasskeyRegister from '@/components/PasskeyRegister.vue';
import { Button } from '@/components/ui/button';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

withDefaults(defineProps<Props>(), {
    canManagePasskeys: false,
    passkeys: () => [],
});

const handleDelete = (id: number, onError: () => void) => {
    router.delete(destroy.url(id), {
        preserveScroll: true,
        onError,
    });
};

const handleRegisterSuccess = () => {
    router.reload();
};

// Add passkey sits in the card's header like the other cards' buttons;
// the name form opens in the body and takes the focus (v-focus). Closed
// again, the focus goes back to the button.
const adding = ref(false);
const addButton = useTemplateRef<InstanceType<typeof Button>>('addButton');
const supported =
    typeof window !== 'undefined' && 'PublicKeyCredential' in window;

function closed(open: boolean): void {
    adding.value = open;

    if (!open) {
        nextTick(() =>
            (addButton.value?.$el as HTMLElement | undefined)?.focus(),
        );
    }
}
</script>

<template>
    <!-- A card like the others: Add passkey at the top right; its small
         name form opens at the top of the body. -->
    <FormSection
        v-if="canManagePasskeys"
        plain
        title="Passkeys"
        description="Log in with your fingerprint, face or screen lock instead of a password."
    >
        <template v-if="supported" #actions>
            <Button
                ref="addButton"
                type="button"
                variant="outline"
                class="h-11 rounded-lg px-5 text-[15px] font-bold"
                :disabled="adding"
                @click="adding = true"
            >
                Add passkey
            </Button>
        </template>
        <div class="grid gap-5">
            <PasskeyRegister
                v-if="adding || !supported"
                :open="adding"
                @update:open="closed"
                @success="handleRegisterSuccess"
            />
            <div class="overflow-hidden rounded-lg border border-border">
                <template v-if="passkeys.length">
                    <PasskeyItem
                        v-for="passkey in passkeys"
                        :key="passkey.id"
                        :passkey="passkey"
                        @remove="handleDelete"
                    />
                </template>

                <div v-else class="p-6 text-center">
                    <div
                        class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"
                    >
                        <KeyRound class="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p class="font-bold text-ink">No passkeys yet</p>
                    <p class="mt-1 text-sm text-pretty text-muted-foreground">
                        Add one to log in without typing your password.
                    </p>
                </div>
            </div>
        </div>
    </FormSection>
</template>
