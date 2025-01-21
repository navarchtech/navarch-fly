<template>
	<div>{{finalAssaysByCommodity ?? '-'}}</div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

import { 
	PARCEL_COLLECTION_NAME,
	PARCEL_CONTRACT_FIELD_NAME,
	COMMODITY_IN_CONTRACT_COLLECTION_NAME,
	COMM_IN_CONTRACT_CONTRACT_FIELD_NAME,
	COMM_IN_PRIMARY_COMMODITY_FIELD_NAME,
	COMM_IN_CONTRACT_IS_PENALTY_FIELD_NAME,
	COMM_IN_CONTRACT_COMMODITY_FIELD_NAME,

	COMMODITY_COLLECTION_NAME,
	COMMODITY_CODE_FIELD_NAME,
	
	ASSAY_LOT_COLLECTION_NAME,
	FOREIGN_KEY_FIELD_NAME,

	ID_FIELD_NAME,
	LOT_NUMBER_FIELD_NAME,
	METHOD_FIELD_NAME,
	WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
	ASSAY_LOT_FINAL_ASSAY_FIELD_NAME,
	ASSAY_LOT_ASSAY_UOM_FIELD_NAME,
	ASSAY_LOT_COMMODITY_FIELD_NAME,
} from '../../shared/common/constants';
import {
	convertMethodDisplayTypeToMethodRanked,
	roundNumber,
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
		const finalAssaysByCommodity: Ref<string | null> = ref(null);
		const api = useApi();
		const ASSAY_RESULTS_FIELD_NAME = "assay_results";
		try {
			main();
		} catch (error) {
			console.error(error);
			finalAssaysByCommodity.value = 'Error occured';
		}
		// api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}`, {
		// 	params: {
		// 		filter: {
		// 			[FOREIGN_KEY_FIELD_NAME]: { '_eq': props.value },
		// 		},
		// 		fields: [
		// 			LOT_NUMBER_FIELD_NAME,
		// 			METHOD_FIELD_NAME,

		// 			WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
		// 			ASSAY_LOT_FINAL_ASSAY_FIELD_NAME,
		// 			ASSAY_LOT_ASSAY_UOM_FIELD_NAME,
		// 			ASSAY_LOT_COMMODITY_FIELD_NAME,
		// 		]
		// 	},
		// }).then((response: any) => {
		// 	const items = response.data.data;
		// 	// go through all the items and find the latest method in order of Planned, Estimated, Inturn, Inturn Final, Outturn
		// 	const listOfMethods = items.map((lot: any) => lot[METHOD_FIELD_NAME]).sort((a: string, b: string) => {
		// 		return convertMethodDisplayTypeToMethodRanked(b) - convertMethodDisplayTypeToMethodRanked(a);
		// 	});

		// 	if (listOfMethods.length === 0) {
		// 		return;
		// 	}

		// 	const latestMethod = listOfMethods[0];
		// 	const latestAssayLots = items.filter((lot: any) => lot[METHOD_FIELD_NAME] === latestMethod);

		// 	// get the weighted average final assay of the latest assay lots
		// 	// group the assay lots by commodity
		// 	const assayLotsByCommodity: { [key: string]: any[] } = latestAssayLots.reduce((acc: any, assayLot: any) => {
		// 		const commodity = assayLot[ASSAY_LOT_COMMODITY_FIELD_NAME];
		// 		if (!acc[commodity]) {
		// 			acc[commodity] = [];
		// 		}
		// 		acc[commodity].push(assayLot);
		// 		return acc;
		// 	}, {});

		// 	const finalAssaysByCommodityList: string[] = [];
		// 	// be sure to consider that composite assays still exist if assay lots exist, and the composites should be excluded from the calculation
		// 	for (const commodityAssays of Object.values(assayLotsByCommodity)) {
		// 		if (commodityAssays.length < 1) {
		// 			// this should not happen, but skip if it does
		// 			continue;
		// 		} else if (commodityAssays.length === 1) {
		// 			// it's a composite assay
		// 			finalAssaysByCommodityList.push(`${commodityAssays[0][ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]} ${commodityAssays[0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME]} (${commodityAssays[0][ASSAY_LOT_COMMODITY_FIELD_NAME]})`);
		// 		} else if (commodityAssays.length > 1) {
		// 			// it's a group of assay lots, filter out the composite assay and calculate the weighted average of the final assay
		// 			const assayLots = commodityAssays.filter((assayLot: any) => assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME] !== null);
		// 			let totalDryWeight = 0;
		// 			let totalMultipliedFinalAssay = 0;
		// 			for (const assayLot of assayLots) {
		// 				totalDryWeight += parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]);
		// 				totalMultipliedFinalAssay += roundNumber(parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) * parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]), 4) ?? 0; // the multiplication sometimes results can be off a few decimal places, this is to round it to the right number if it occurs
		// 			}
		// 			// const reducedAssayLotValue = assayLots.reduce((acc: any, assayLot: any) => {
		// 			// 	console.debug('assay lot: ' + JSON.stringify(assayLot) + '; acc: ' + JSON.stringify(acc));
		// 			// 	console.debug('dry weight: ' + parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]) + '; final assay: ' + parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) + '; assay times weight: ' + (parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) * parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME])));
		// 			// 	console.debug('total weight: ' + acc.dry_weight + '; assay times weight: ' + acc.final_assay);
		// 			// 	console.debug('new total weight: ' + (acc.dry_weight + parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME])) + '; new assay times weight: ' + (acc.final_assay + parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) * parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME])));
		// 			// 	acc.dry_weight += parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]);
		// 			// 	acc.final_assay += parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) * parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]);
		// 			// }, { dry_weight: 0, final_assay: 0 });
		// 			const weightedAverage = roundNumber(totalMultipliedFinalAssay / totalDryWeight, 4) ?? 0;
		// 			finalAssaysByCommodityList.push(`${formatNumber(weightedAverage, 4)}${assayLots[0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME]} (${assayLots[0][ASSAY_LOT_COMMODITY_FIELD_NAME]})`);
		// 		}
		// 	}
		// 	// get the final assay uom for each commodity
		// 	finalAssaysByCommodity.value = finalAssaysByCommodityList.join(' | ');
		// }). catch((error: any) => {
		// 	console.error(error);
		// 	finalAssaysByCommodity.value = 'Error occured';
		// });
		return {
			finalAssaysByCommodity,
		};

		async function main() {
			const finalAssayByCommoditiesRecord = await getFinalAssayLotsGroupedByCommodity();
			const sortedFinalAssayList = await sortFinalAssayList(finalAssayByCommoditiesRecord);
			finalAssaysByCommodity.value = sortedFinalAssayList.join(' | ');
		}

		async function getFinalAssayLotsGroupedByCommodity() {
			const response = await api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}`, {
				params: {
					filter: {
						[FOREIGN_KEY_FIELD_NAME]: { '_eq': props.value },
					},
					fields: [
						LOT_NUMBER_FIELD_NAME,
						METHOD_FIELD_NAME,

						WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
						ASSAY_LOT_FINAL_ASSAY_FIELD_NAME,
						ASSAY_LOT_ASSAY_UOM_FIELD_NAME,
						ASSAY_LOT_COMMODITY_FIELD_NAME,
					]
				},
			});

			const items = response.data.data;
			// go through all the items and find the latest method in order of Planned, Estimated, Inturn, Inturn Final, Outturn
			const listOfMethods = items.map((lot: any) => lot[METHOD_FIELD_NAME]).sort((a: string, b: string) => {
				return convertMethodDisplayTypeToMethodRanked(b) - convertMethodDisplayTypeToMethodRanked(a);
			});

			if (listOfMethods.length === 0) {
				return {};
			}

			const latestMethod = listOfMethods[0];
			const latestAssayLots = items.filter((lot: any) => lot[METHOD_FIELD_NAME] === latestMethod);

			// get the weighted average final assay of the latest assay lots
			// group the assay lots by commodity
			const assayLotsByCommodity: { [key: string]: any[] } = latestAssayLots.reduce((acc: any, assayLot: any) => {
				const commodity = assayLot[ASSAY_LOT_COMMODITY_FIELD_NAME];
				if (!acc[commodity]) {
					acc[commodity] = [];
				}
				acc[commodity].push(assayLot);
				return acc;
			}, {});

			const finalAssayByCommodityRecord: { [key: string]: string } = {};
			// be sure to consider that composite assays still exist if assay lots exist, and the composites should be excluded from the calculation
			for (const commodityAssays of Object.values(assayLotsByCommodity)) {
				if (commodityAssays.length < 1) {
					// this should not happen, but skip if it does
					continue;
				} else if (commodityAssays.length === 1) {
					// it's a composite assay
					finalAssayByCommodityRecord[commodityAssays[0][ASSAY_LOT_COMMODITY_FIELD_NAME]] = `${commodityAssays[0][ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]} ${commodityAssays[0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME]} (${commodityAssays[0][ASSAY_LOT_COMMODITY_FIELD_NAME]})`;
				} else if (commodityAssays.length > 1) {
					// it's a group of assay lots, filter out the composite assay and calculate the weighted average of the final assay
					const assayLots = commodityAssays.filter((assayLot: any) => assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME] !== null);
					let totalDryWeight = 0;
					let totalMultipliedFinalAssay = 0;
					for (const assayLot of assayLots) {
						totalDryWeight += parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]);
						totalMultipliedFinalAssay += roundNumber(parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) * parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]), 4) ?? 0; // the multiplication sometimes results can be off a few decimal places, this is to round it to the right number if it occurs
					}
					// const reducedAssayLotValue = assayLots.reduce((acc: any, assayLot: any) => {
					// 	console.debug('assay lot: ' + JSON.stringify(assayLot) + '; acc: ' + JSON.stringify(acc));
					// 	console.debug('dry weight: ' + parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]) + '; final assay: ' + parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) + '; assay times weight: ' + (parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) * parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME])));
					// 	console.debug('total weight: ' + acc.dry_weight + '; assay times weight: ' + acc.final_assay);
					// 	console.debug('new total weight: ' + (acc.dry_weight + parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME])) + '; new assay times weight: ' + (acc.final_assay + parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) * parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME])));
					// 	acc.dry_weight += parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]);
					// 	acc.final_assay += parseFloat(assayLot[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME]) * parseFloat(assayLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]);
					// }, { dry_weight: 0, final_assay: 0 });
					const weightedAverage = roundNumber(totalMultipliedFinalAssay / totalDryWeight, 4) ?? 0;
					finalAssayByCommodityRecord[commodityAssays[0][ASSAY_LOT_COMMODITY_FIELD_NAME]] = `${formatNumber(weightedAverage, 4)}${assayLots[0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME]} (${assayLots[0][ASSAY_LOT_COMMODITY_FIELD_NAME]})`;
				}
			}

			return finalAssayByCommodityRecord;
		};

		async function sortFinalAssayList(finalAssayRecord: { [key: string]: string }) {
			if (!finalAssayRecord) {
				return [];
			}
			const parcelResponse = await api.get(`/items/${PARCEL_COLLECTION_NAME}`, {
				params: {
					filter: {
						[ASSAY_RESULTS_FIELD_NAME]: { '_eq': props.value },
					},
					fields: [
						PARCEL_CONTRACT_FIELD_NAME,
					]
				},
			});

			const contractId = parcelResponse.data.data.length > 0 ? parcelResponse.data.data[0][PARCEL_CONTRACT_FIELD_NAME] : null;
			if (!contractId) {
				return Object.values(finalAssayRecord).sort();
			}

			const contractCommoditiesResponse = await api.get(`/items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}`, {
				params: {
					filter: {
						[COMM_IN_CONTRACT_CONTRACT_FIELD_NAME]: { '_eq': contractId },
					},
					fields: [
						COMM_IN_CONTRACT_COMMODITY_FIELD_NAME,
						COMM_IN_PRIMARY_COMMODITY_FIELD_NAME,
						COMM_IN_CONTRACT_IS_PENALTY_FIELD_NAME,
					]
				},
			});

			if(!contractCommoditiesResponse.data.data || contractCommoditiesResponse.data.data.length < 1) {
				return Object.values(finalAssayRecord);;
			}

			const commodityList = await api.get(`/items/${COMMODITY_COLLECTION_NAME}`, {
				params: {
					filter: {
						[ID_FIELD_NAME]: { '_in': contractCommoditiesResponse.data.data.map((commodity: any) => commodity[COMM_IN_CONTRACT_COMMODITY_FIELD_NAME]) },
					},
					fields: [
						ID_FIELD_NAME,
						COMMODITY_CODE_FIELD_NAME,
					]
				},
			});

			if (!commodityList.data.data || commodityList.data.data.length < 1) {
				return Object.values(finalAssayRecord);
			}

			// create a map of the commodity id to the commodity code
			const commodityCodeMap = commodityList.data.data.reduce((acc: any, commodity: any) => {
				acc[commodity[ID_FIELD_NAME]] = commodity[COMMODITY_CODE_FIELD_NAME];
				return acc;
			}, {});

			const sortMap = contractCommoditiesResponse.data.data.reduce((acc: any, commodity: any) => {
				// could possibly be undefined
				const commodityCode = commodityCodeMap[commodity[COMM_IN_CONTRACT_COMMODITY_FIELD_NAME]];
				if (!!commodity[COMM_IN_PRIMARY_COMMODITY_FIELD_NAME] && !!commodityCode) {
					acc[commodityCode] = 1;
				} else if (!!commodity[COMM_IN_CONTRACT_IS_PENALTY_FIELD_NAME] && !!commodityCode) {
					acc[commodityCode] = 3;
				} else {
					// for anything else, put it between penalty and primary elements
					acc[commodityCode] = 2;
				}
				return acc;
			}, {});
			console.log('sort map: ' + JSON.stringify(sortMap) + ' for contract=' + contractId);
			return Object.entries(finalAssayRecord).sort((a: [string, string], b: [string, string]) => {
				return sortMap[a[0]] - sortMap[b[0]];
			}).map((entry: [string, string]) => entry[1]);
		};
	},
});
</script>
