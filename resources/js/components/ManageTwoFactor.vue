<script setup lang="ts">
import { Form } from '@inertiajs/vue3';
import { ShieldCheck } from '@lucide/vue';
import { onUnmounted, ref } from 'vue';
import FormSection from '@/components/admin/FormSection.vue';
import TwoFactorRecoveryCodes from '@/components/TwoFactorRecoveryCodes.vue';
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal.vue';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/composables/useTwoFactorAuth';
import { disable, enable } from '@/routes/two-factor';

export type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

withDefaults(defineProps<Props>(), {
    canManageTwoFactor: false,
    requiresConfirmation: false,
    twoFactorEnabled: false,
});

const { hasSetupData, clearTwoFactorAuthData } = useTwoFactorAuth();
const showSetupModal = ref<boolean>(false);

onUnmounted(() => clearTwoFactorAuthData());

// The same size as the other buttons on the Security page. Turning 2FA on
// or off is a switch that can be turned back, so both are outline buttons
// like "Add passkey" (red is for the next step, yellow for a step that
// cannot be undone).
// The card's one button; it takes the full width on phones.
const outlineClass = 'h-11 w-full rounded-lg px-5 text-[15px] font-bold';
</script>

<template>
    <!-- A card like the others: turning it on or off is the card's button,
         at the top right; what it means (and the recovery codes) below. -->
    <FormSection
        v-if="canManageTwoFactor"
        title="Two-factor authentication"
        description="Keep your account safe even if someone learns your password."
    >
        <template #actions>
            <template v-if="!twoFactorEnabled">
                <Button
                    v-if="hasSetupData"
                    variant="outline"
                    :class="outlineClass"
                    @click="showSetupModal = true"
                >
                    <ShieldCheck />Continue setup
                </Button>
                <Form
                    v-else
                    v-bind="enable.form()"
                    @success="showSetupModal = true"
                    #default="{ processing }"
                >
                    <Button
                        type="submit"
                        variant="outline"
                        :class="outlineClass"
                        :disabled="processing"
                    >
                        Enable 2FA
                    </Button>
                </Form>
            </template>
            <Form v-else v-bind="disable.form()" #default="{ processing }">
                <Button
                    variant="outline"
                    type="submit"
                    :class="outlineClass"
                    :disabled="processing"
                >
                    Disable 2FA
                </Button>
            </Form>
        </template>

        <p
            v-if="!twoFactorEnabled"
            class="text-sm text-pretty text-muted-foreground"
        >
            When it is on, you also enter a 6-digit code from an authenticator
            app each time you log in.
        </p>
        <div v-else class="grid gap-4">
            <p class="text-sm text-pretty text-muted-foreground">
                It is on. Each time you log in, you also enter a 6-digit code
                from your authenticator app.
            </p>
            <TwoFactorRecoveryCodes />
        </div>

        <TwoFactorSetupModal
            v-model:isOpen="showSetupModal"
            :requiresConfirmation="requiresConfirmation"
            :twoFactorEnabled="twoFactorEnabled"
        />
    </FormSection>
</template>
