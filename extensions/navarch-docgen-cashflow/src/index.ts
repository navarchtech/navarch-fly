import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-docgen-cashflow',
	name: 'Navarch Cashflow Generator Button',
	icon: 'receipt_long',
	description: 'This is my custom interface for Navarch\'s Cashflow Doc!',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
