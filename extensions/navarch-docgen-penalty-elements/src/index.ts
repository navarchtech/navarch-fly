import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-penalty-elements-generator',
	name: 'Penalty Elements Doc Generator',
	icon: 'receipt_long',
	description: 'This is a custom interface for Navarch\'s Penalty Elements Document Generator Button.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
