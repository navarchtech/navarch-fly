import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-docgen-assay-exchange-v2',
	name: 'Navarch Assay Exchange Cert Generator Button (V2)',
	icon: 'receipt_long',
	description: 'This is a version 2 custom interface for Navarch\'s Assay Exchange Cert Generator Button.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
