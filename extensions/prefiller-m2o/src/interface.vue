<template>
	<div>
		<component :is="DropdownM2OComponent" v-bind="attrs" v-bind:value="value" @input="handleChange"/>
		<!-- <div>Contract: {{values['contract']}}</div>
		<div>CounterpartyV2: {{values['counterparty_v2']}}</div>
		<div>Counterparty: {{values['counterparty']}}</div>
		<div>Estimated Arrival Date: {{values['estimate_arrival_date']}}</div>
		<div>Assay Lots Foreign Key: {{values['assay_results']}}</div>
		<div>Weight Lots Foreign Key: {{values['weight_result']}}</div> -->
	</div>
</template>

<script lang="ts">
import { useExtensions } from "@directus/extensions-sdk";
import { defineComponent, ref, inject, watch, toRef } from "vue";
import { useStores, useApi } from '@directus/extensions-sdk';


export default defineComponent({
	props: {
		value: {
			type: String,
			default: null,
		},
		currentCollection: {
			type: String,
			default: null
		},
		listenedField: {
			type: [String],
			default: null,
		},
	},
	emits: ['input'],
	setup(props, {attrs, emit}) {
		const values = inject('values', ref<Record<string, any>>({}));

		const { listenedField, currentCollection } = props;

		const value = toRef(props, "value");
		console.log(`prefiller::current collection: ${currentCollection}`)
		console.log(`prefiller::listened field: ${listenedField}`);

		// "listenedField" prop value should be in the format of <NAME_OF_RELATIONAL_FIELD_IN_THE_FORM>.<NAME_OF_THE_FIELD_FROM_THE_RELATED_COLLECTION_TO_GET_VALUE_OF>
		// ex. contract.default_origin
		const fields = listenedField[0].split('.');
		let nameOfFieldToWatch = '';
		let nameOfFieldToFetchFrom = '';
		if (fields.length >= 2) {
			// "fields" must have a length of exactly 2 but we can ignore the rest if the length is greater, this component will not work properly if it is less than 2
			nameOfFieldToWatch = fields[0];
			nameOfFieldToFetchFrom = fields[1];
		}

		// console.log("field in current form to watch: " + nameOfFieldToWatch);
		// console.log("field to fetch value from in related collection: " + nameOfFieldToFetchFrom);

		// Getting the related collection of the field being listened to
		const api = useApi();
		const { useRelationsStore } = useStores();
		const relationsStore = useRelationsStore();
		const relationInfo = relationsStore.getRelationForField(currentCollection, nameOfFieldToWatch);
		const relatedCollection = relationInfo.related_collection;

		// console.log("related collection: " + relatedCollection);
		// console.log("injected values: " + values);
		// console.log("injected values value: " + JSON.stringify(values.value));
		watch(() => values.value[nameOfFieldToWatch], async watchedValue => {
			// "watchedValue" here should be the item id because nameOfFieldToWatch should be the name of the relational field which should store the id value of the selected item
			console.log("prefiller::id watchedValue: " + watchedValue)

			if (watchedValue != null && value.value == null) {
				console.log(`prefiller::fetching ${nameOfFieldToFetchFrom} from ${relatedCollection}`);
				getItems([nameOfFieldToFetchFrom], relatedCollection, watchedValue)
				.then(async (relatedCollectionItem) => {
					// console.log("related collection item: " + JSON.stringify(relatedCollectionItem));
					let updateValue = relatedCollectionItem[nameOfFieldToFetchFrom];
					// console.log("update value: " + updateValue);

					// Set the "value" prop for this component to "updateValue"
					if (updateValue !== null && updateValue !== undefined && updateValue !== value.value) {
						emit('input', updateValue);
					}
					// console.log("new values: " + JSON.stringify(values.value));
				});
			}
		});

		// console.log("values: " + JSON.stringify(values.value));

		// Retrieve Directus component for "select-dropdown-m2o"
		const { interfaces } = useExtensions();
		const { component: DropdownM2OComponent } = interfaces.value.find(
			(i) => i.id === "select-dropdown-m2o"
		);
		return {
			values,
			attrs,
			DropdownM2OComponent,
			handleChange
		};

		// Function to fetch data from the selected item (in our case, the selected contract)
		async function getItems(fieldsToFetch: string[], relatedCollection: string, relatedItemId: string) {
			console.log(`prefiller::fetching ${JSON.stringify(fieldsToFetch)} from ${relatedCollection} in getItems with id ${relatedItemId}`);
			// let response = await api.get(`/items/${relatedCollection}/${relatedItemId}`, {params: {
			// 	fields: fieldsToFetch,
			// }});
			let response = await api.get(`/items/${relatedCollection}/${relatedItemId}?${fieldsToFetch.map((field) => `fields[]=${field}`).join('&')}`);
			return response.data.data;
		}

		// Function to set the "value" for this component with the "value" from the extended interface ("select-dropdown-m2o" interface in this case) if manually selected
		function handleChange(valueString: string): void {
			// value.value = valueString;
			emit('input', valueString);
		}
	},
});
</script>
