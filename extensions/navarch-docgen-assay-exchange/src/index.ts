import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-docgen-assay-exchange',
	name: 'Navarch Assay Exchange Cert Generator Button',
	icon: 'receipt_long',
	description: 'This is a custom interface for Navarch\'s Assay Exchange Cert Generator Button.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
