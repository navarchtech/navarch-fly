import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'weight_table',
	name: 'Weight Table',
	icon: 'box',
	description: 'Custom interface for weights',
	component: InterfaceComponent,
	options: null,
	types: ['string'],
	group: 'standard',
});
