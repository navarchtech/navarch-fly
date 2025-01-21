import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-shipment-latest-generator',
	name: 'Shipment Latest Doc Generator',
	icon: 'receipt_long',
	description: 'This is a custom interface for Navarch\'s Shipment Latest Document Generator Button.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
