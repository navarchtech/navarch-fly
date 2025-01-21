import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-docgen-certoforigin',
	name: 'Navarch Cert of Origin Generator Button',
	icon: 'receipt_long',
	description: 'This is a custom interface for Navarch\'s Cert of Origin Generator Button.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
