import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-loadport-disport-generator',
	name: 'Loadport-Disport Comparison Doc Generator',
	icon: 'receipt_long',
	description: 'This is a custom interface for Navarch\'s Loadport-Disport Comparison Document Generator Button.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
