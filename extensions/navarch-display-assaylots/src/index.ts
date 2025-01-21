import { defineDisplay } from '@directus/extensions-sdk';
import DisplayComponent from './display.vue';

export default defineDisplay({
	id: 'navarch-display-assaylots',
	name: 'Navarch Display Assay Lots',
	icon: 'box',
	description: 'This is for displaying aggregate assay lot values in the Parcel home page.',
	component: DisplayComponent,
	options: null,
	types: ['string'],
});
