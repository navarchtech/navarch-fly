import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'navarch-bracket-description',
	name: 'Navarch Bracket Description',
	icon: 'data_info_alert',
	description: 'To describe bracket for Penalty, Refining Charge, Treatment Charge, & Payable Rates',
	component: InterfaceComponent,
	options: () => {
		return [
			{
				field: 'formType',
				name: 'Form Type',
				type: 'string',
				meta: {
					interface: 'select-dropdown',
					options: {
						allowNone: false,
						choices: [
							{ text: 'Payable Assay Rate', value: 'assay' },
							{ text: 'Treatment/Refining Charge', value: 'charge' },
							{ text: 'Penalty Rate', value: 'penalty' },
						],
					},
				},
			}
		]
	},
	types: ['string'],
});
