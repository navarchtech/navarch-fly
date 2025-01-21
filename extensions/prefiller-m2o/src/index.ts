import { defineInterface } from '@directus/shared/utils';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-prefilling-select-dropdown-m2o',
	name: ' Navarch Prefilling M2O Extension',
	description: 'Functions like the default Directus M2O interface but can be prefilled with a default value in response to another field in the same collection',
	icon: 'arrow_right_alt',
	component: InterfaceComponent,
	types: ['uuid', 'string', 'text', 'integer', 'bigInteger'],
	relational: true,
	localTypes: ['m2o'],
	group: 'relational',
	options: ({ relations, collection }) => {
		const relatedCollection = relations.m2o?.related_collection;

		return [
			{
				field: 'template',
				name: '$t:interfaces.select-dropdown-m2o.display_template',
				meta: {
					interface: 'system-display-template',
					options: {
						collectionName: relatedCollection,
					},
				},
			},
			{
				field: 'listenedField',
				name: 'Field to Watch',
				meta: {
					interface: 'system-fields',
					options: {
						collectionName: collection,
					},
				},
			},
			{
				field: 'currentCollection',
				name: 'Current Collection Name',
				meta: {
					interface: 'input',
				},
			},
			{
				field: 'filter',
				name: '$t:filter',
				type: 'json',
				meta: {
					interface: 'system-filter',
					options: {
						collectionName: relatedCollection,
					},
				},
			},
		];
	},
	recommendedDisplays: ['related-values'],
});