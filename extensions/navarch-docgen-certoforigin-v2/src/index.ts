import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-docgen-certoforigin',
	name: 'Navarch Cert of Origin Generator Button V2',
	icon: 'receipt_long',
	description: 'This is the version 2 custom interface for Navarch\'s Cert of Origin Generator Button.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
