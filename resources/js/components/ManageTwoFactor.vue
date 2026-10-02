<script setup lang="ts">
import { Form } from '@inertiajs/vue3';
import { ShieldCheck } from '@lucide/vue';
import { onUnmounted, ref } from 'vue';
import Heading from '@/components/Heading.vue';
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
const outlineClass = 'h-11 px-6 font-bold';
</script>

<template>
    <div v-if="canManageTwoFactor" class="space-y-6">
        <Heading
            variant="small"
            title="Two-factor authentication"
            description="Keep your account safe even if someone learns your password."
        />

        <div
            v-if="!twoFactorEnabled"
            class="flex flex-col items-start justify-start space-y-4"
        >
            <p class="text-sm text-pretty text-muted-foreground">
                When it is on, you also enter a 6-digit code from an
                authenticator app each time you log in.
            </p>

            <div>
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
            </div>
        </div>

        <div v-else class="flex flex-col items-start justify-start space-y-4">
            <p class="text-sm text-pretty text-muted-foreground">
                It is on. Each time you log in, you also enter a 6-digit code
                from your authenticator app.
            </p>

            <div class="relative inline">
                <Form v-bind="disable.form()" #default="{ processing }">
                    <Button
                        variant="outline"
                        type="submit"
                        :class="outlineClass"
                        :disabled="processing"
                    >
                        Disable 2FA
                    </Button>
                </Form>
            </div>

            <TwoFactorRecoveryCodes />
        </div>

        <TwoFactorSetupModal
            v-model:isOpen="showSetupModal"
            :requiresConfirmation="requiresConfirmation"
            :twoFactorEnabled="twoFactorEnabled"
        />
    </div>
</template>
