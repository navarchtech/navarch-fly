<template>
	<div>{{totalWeight ?? '-'}}</div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

import { 
	WEIGHT_LOT_COLLECTION_NAME,
	FOREIGN_KEY_FIELD_NAME,

	METHOD_FIELD_NAME,
	WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
	WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME,

} from '../../shared/common/constants';
import {
	convertMethodDisplayTypeToMethodRanked,
	evaluateSumOfNumericalProperty,
	extractPropertyOfFirstItem,
	formatNumber,
} from '../../shared/common/utils';

export default defineComponent({
	props: {
		value: {
			type: String,
			default: null,
		},
	},
	setup(props: any) {
		const totalWeight: Ref<string | null> = ref(null); 
		const api = useApi();
		// TODO: have one 'master' weight lot that stores the aggregate of all the weight lots so I don't need to keep calculating
		api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}`, {
			params: {
				filter: {
					[FOREIGN_KEY_FIELD_NAME]: { '_eq': props.value },
				},
				fields: [
					METHOD_FIELD_NAME,

					WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
					WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME,
				]
			},
		}).then((response: any) => {
			const items = response.data.data;
			// go through all the items and find the latest method in order of Planned, Estimated, Inturn, Inturn Final, Outturn
			const listOfMethods = items.map((lot: any) => lot[METHOD_FIELD_NAME]).sort((a: string, b: string) => {
				return convertMethodDisplayTypeToMethodRanked(b) - convertMethodDisplayTypeToMethodRanked(a);
			});

			if (listOfMethods.length === 0) {
				return;
			}

			const latestMethod = listOfMethods[0];
			const latestWeightLots = items.filter((lot: any) => lot[METHOD_FIELD_NAME] === latestMethod);


			const dryWeight = evaluateSumOfNumericalProperty(latestWeightLots, WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME);
			const dryWeightUOM = extractPropertyOfFirstItem(latestWeightLots, WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME);
			totalWeight.value = `${formatNumber(dryWeight, 4)}${dryWeightUOM}`;
		}).catch((error: any) => {
			console.error(error);
			totalWeight.value = 'Error occured';
		});
		return {
			totalWeight,
		};
	},
});
</script>
