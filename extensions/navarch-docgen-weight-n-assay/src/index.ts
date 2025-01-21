import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-weight-n-assay-generator',
	name: 'Weight & Assay Cert Generator',
	icon: 'receipt_long',
	description: 'This is a custom interface for Navarch\'s Weight & Assay Certificate Generator Button.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
