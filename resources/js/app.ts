import { createInertiaApp } from '@inertiajs/vue3';
import AccountLayout from '@/layouts/AccountLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import ConsoleLayout from '@/layouts/ConsoleLayout.vue';
import CustomerLayout from '@/layouts/CustomerLayout.vue';
import PublicLayout from '@/layouts/PublicLayout.vue';
import SettingsLayout from '@/layouts/SettingsLayout.vue';
import { initializeFlashToast } from '@/lib/flashToast';

const appName = import.meta.env.VITE_APP_NAME || 'Kotak';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    // Every page gets its layout from its name; pages never import one.
    layout: (name) => {
        switch (true) {
            // The branded error page draws its own minimal frame.
            case name === 'Error':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            // Customers' orders.
            case name.startsWith('orders/'):
                return CustomerLayout;
            // Shared by every role: CustomerLayout or ConsoleLayout by role.
            case name.startsWith('settings/'):
                return [AccountLayout, SettingsLayout];
            // Branch staff, admins and drivers.
            case name.startsWith('staff/'):
            case name.startsWith('admin/'):
            case name.startsWith('driver/'):
                return ConsoleLayout;
            // Welcome, track/, branches/, pricing/ and anything new.
            default:
                return PublicLayout;
        }
    },
    withApp: (app) => {
        app.directive('focus', {
            mounted: (el: HTMLElement, shouldFocus) => {
                if (shouldFocus.value !== false) {
                    el.focus();
                }
            },
        });
    },
    progress: {
        color: '#D0161E',
    },
});

// This will listen for flash toast data from the server...
initializeFlashToast();
