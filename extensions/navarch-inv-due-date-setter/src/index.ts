import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-inv-due-date-setter',
	name: 'Navarch Invoice Due Date Setter',
	icon: 'date_range',
	description: 'For setting invoice due dates for each type of invoice.',
	component: InterfaceComponent,
	options: null,
	types: ['json'],
	group: 'standard',
});
