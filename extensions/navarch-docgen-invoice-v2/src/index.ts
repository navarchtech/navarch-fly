import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-docgen-invoice-v2',
	name: 'Generate Invoice Button (V2)',
	icon: 'receipt_long',
	description: 'This is a version 2 custom interface for Navarch\'s Invoice Generator Button (v2).',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
