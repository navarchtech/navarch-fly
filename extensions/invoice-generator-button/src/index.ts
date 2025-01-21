import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'invoice_generator_button',
	name: 'Generate Invoice Button',
	icon: 'receipt_long',
	description: 'This is a custom interface for Navarch\'s Invoice Generator Button.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
