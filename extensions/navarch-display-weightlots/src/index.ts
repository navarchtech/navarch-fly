import { defineDisplay } from '@directus/extensions-sdk';
import DisplayComponent from './display.vue';

export default defineDisplay({
	id: 'navarch-display-weightlots',
	name: 'Navarch Display Weight Lots',
	icon: 'box',
	description: 'This is for displaying aggregate weight lot values in the Parcel home page.',
	component: DisplayComponent,
	options: null,
	types: ['string'],
});
