import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-qp-select',
	name: 'Navarch QP Select',
	icon: 'format_list_numbered_rtl',
	description: 'For QP selection in the Parcel form',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
});
