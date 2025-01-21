import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'assay_result_table',
	name: 'Assay Result Table',
	icon: 'box',
	description: 'Custom interface for assay result',
	component: InterfaceComponent,
	options: null,
	types: ['string'],
	group: 'standard',
});
