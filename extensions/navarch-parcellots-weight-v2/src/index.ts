import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-parcellots-weight-v2',
	name: 'Navarch Weight Lots Table v2',
	icon: 'box',
	description: 'Navarch Weight Lots Table Interface for Parcel Form',
	component: InterfaceComponent,
	options: null,
	types: ['alias'],
	group: 'relational',
	localTypes: ['m2o'],
	relational: true,
});
