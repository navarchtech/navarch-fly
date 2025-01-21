<template>
	<!-- <input :value="value" @input="handleChange($event.target.value)" /> -->
	<!-- create a button only interface for Directus-->
	<div v-if="!value">
		<v-button
			@click="() => generateInvoice()"
			:loading="isGeneraingDoc"
		>Generate Invoice</v-button>
		<v-notice v-if="!!failureReason">
			{{ failureReason }}
		</v-notice>
	</div>
	<div v-else>
			<v-button
				@click="() => downloadPdf()"
			>Download Invoice
		</v-button>
	</div>
	<v-button
		class="margin-top-16px"
		@click="() => copy()"
		:loading="isCopying"
		:disabled="isLastDocType"
		v-tooltip.bottom="isLastDocType ? 'Invoice cannot be revised beyond the current document type' : 'Duplicating an invoice will create a new revision'"
	>Copy</v-button>
	
</template>

<script lang="ts">
import { defineComponent, ref, Ref, inject, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { Buffer } from 'buffer/';
import {
	BracketType,
	PayableAssayBracket,
	ChargeBracket,
	PenaltyBracket,
	BracketForEvaluation,
	RateType,
	PaymentReceived,
	Gst,
	ImageData,
	ImageType,
	INVOICE_TYPE_ORDER,
	INVOICE_DOCUMENT_TYPE_ORDER,
	WeightLot, 
	Weight, 
	SharedLotPropertyFields, 
	AggregatableWeightLotFields, 
	InvoiceRequestBody,
	QuotationalPeriod,
	QpCommodity,
	PricingDates,
	AveragePriceWithinPeriod,
	AssayLotsOrCompositeForInvoice,
	PayableMetalUnitConversionData,
	ConversionValue,
} from './components/types';

export default defineComponent({
	props: {
		value: {
			type: Object,
			default: null,
		},
	},
	emits: ['input'],
	setup(props, { emit }) {

		const failureReason: Ref<string> = ref('');
		const isGeneraingDoc: Ref<boolean> = ref(false);
		const isCopying: Ref<boolean> = ref(false);
		
		const api = useApi();
		const formValues = inject('values', ref<Record<string, any>>({}));
		console.log('[main] formValues=', formValues);

		function evaluateWeights(lots: WeightLot[]): Weight[] {
			console.log('[evaluateWeights]');
			const weightData = {};
			for(const lot of lots) {
				if (!weightData[lot.method]) {
					console.log(`adding method ${lot.method} to weightData object`)
					weightData[lot.method] = [];
				}
				// the property names in 'weightData' match the string values of corresponding MethodEnum enums
				console.log(`adding lot ${lot.id} to weightData.${lot.method} array`)
				weightData[lot.method.toString()].push(lot);
			}
			const weights: Weight[] = [];
			// for(const method in weightData) {
			for(const method of Object.keys(weightData)) {
				if (!weightData[method]) {
					console.log(`method=${method} does not exist in weightData object`)
					// only push weight lots to 'weights' if there exists lots for a given method
					continue;
				}
				console.log(`adding lots and other values to weights for method=${method}`)
				const weight = evaluateWeightData(weightData[method]);

				if (!!weight) {
					weights.push(weight);
				}
			}

			return weights;
		}

		function evaluateWeightData(weightLots: WeightLot[]): Weight | undefined {
			console.log('[evaluateWeightData]');
			if (weightLots.length === 0) {
				return undefined;
			}
			const dryWeight = evaluateAggregateValue(weightLots, AggregatableWeightLotFields.DRY_WEIGHT);
			const wetWeight = evaluateAggregateValue(weightLots, AggregatableWeightLotFields.WET_WEIGHT);
			return {
				method: getFirstValueAsSharedValue(weightLots, SharedLotPropertyFields.METHOD),
				lots: weightLots,
				dry_weight_uom: getFirstValueAsSharedValue(weightLots, SharedLotPropertyFields.DRY_WEIGHT_UOM),
				wet_weight_uom: getFirstValueAsSharedValue(weightLots, SharedLotPropertyFields.WET_WEIGHT_UOM),
				dry_weight: dryWeight,
				wet_weight: wetWeight,
				moisture: (wetWeight - dryWeight) / wetWeight * 100,
			} as Weight
		}

		function getFirstValueAsSharedValue(lots: WeightLot[], field: SharedLotPropertyFields) {
			console.log('[getFirstValueAsSharedValue]');
			if (lots.length === 0) {
				return undefined;
			}
			console.log(`lots[0][${field.toString()}]=${lots[0][field.toString()]}`);
			// the string values of SharedLotPropertyFields match the corresponding property names in WeightLot
			return lots[0][field.toString()];
		}

		function evaluateAggregateValue(lots: WeightLot[], field: AggregatableWeightLotFields): number {
			console.log('[evaluateAggregateValue]');
			return lots.reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue[field.toString()] ?? '0'), 0);
		}
		function evaluateAnalyticalAssay(assayLotsOrComposites: AssayLotsOrCompositeForInvoice[]) {
			console.log('[evaluateAnalyticalAssay]');
			// probably use INTURN or INTURN_FINAL only, confirm with Taylor
			const group = {};
			for(const assayLotOrComposite of assayLotsOrComposites) {
				if (!group[assayLotOrComposite.method]) {
					group[assayLotOrComposite.method] = {};
				}
				if (!group[assayLotOrComposite.method][assayLotOrComposite.commodity]) {
					group[assayLotOrComposite.method][assayLotOrComposite.commodity] = [];
				}
				if (assayLotOrComposite.lot_number !== null) {
					if (
						(group[assayLotOrComposite.method][assayLotOrComposite.commodity] as Array<AssayLotsOrCompositeForInvoice>).length === 1 &&
						group[assayLotOrComposite.method][assayLotOrComposite.commodity][0].lot_number === null
					) {
						// assay for this commodity-method combination is assay lot, remove composite assay if present
						group[assayLotOrComposite.method][assayLotOrComposite.commodity] = [];
					}
					// only push assay lots to group if they have a lot number
					group[assayLotOrComposite.method][assayLotOrComposite.commodity].push(assayLotOrComposite);
				} else if (
					assayLotOrComposite.lot_number === null && 
					(group[assayLotOrComposite.method][assayLotOrComposite.commodity] as Array<AssayLotsOrCompositeForInvoice>).length === 0
				) {
					// a composite assay for commodity-method combination, only add it in if it is the first and no other composite assay exists for this combination. There should only be one composite assay per commodity-method combination in a parcel
					group[assayLotOrComposite.method][assayLotOrComposite.commodity].push(assayLotOrComposite);
				}
			}
			console.log(`[evaluateAnalyticalAssay] group: ${JSON.stringify(group)}}`);
			const analyticalAssay = {};
			for(const methodKey in group) {
				console.log(`[evaluateAnalyticalAssay] methodKey: ${methodKey}, group[methodKey]: ${JSON.stringify(group[methodKey])}`);
				for(const commodityKey in group[methodKey]) {
					console.log(`[evaluateAnalyticalAssay] commodityKey: ${commodityKey}, group[methodKey][commodityKey]: ${JSON.stringify(group[methodKey][commodityKey])}`);
					// calculate average of final_assay value for each commodity and assign the calculated value to the same path in analyticalAssay
					analyticalAssay[methodKey] = analyticalAssay[methodKey] ?? {};
					analyticalAssay[methodKey][commodityKey] = {};
					const totalDryWeight = group[methodKey][commodityKey].reduce((accumulator, currentValue: AssayLotsOrCompositeForInvoice) => accumulator + parseFloat(currentValue.dry_weight), 0);
					console.log(`[evaluateAnalyticalAssay] totalDryWeight: ${totalDryWeight} from ${JSON.stringify(group[methodKey][commodityKey])}`)
					if (totalDryWeight === 0 || isNaN(totalDryWeight)) {
						failureReason.value = `Please provide dry weight for ${commodityKey} commodity in ${methodKey} method, total dry weight cannot be ${totalDryWeight}`;
						throw new Error(`[evaluateAnalyticalAssay] totalDryWeight is 0`);
					}
					console.log(`[evaluateAnalyticalAssay] totalDryWeight: ${totalDryWeight}`)
					
					analyticalAssay[methodKey][commodityKey]['analytical_assay'] = group[methodKey][commodityKey].reduce((accumulator: number, currentValue: AssayLotsOrCompositeForInvoice) => {
						const assayValue = parseFloat(currentValue.final_assay ?? (currentValue.seller_assay ?? currentValue.buyer_assay));
						if (assayValue === null || assayValue === undefined) {
							failureReason.value = `Please provide Final, Seller or Buyer assay value for ${commodityKey} commodity in ${methodKey} method`;
							throw new Error(`[evaluateAnalyticalAssay] assay value is not defined for assay lot`);
						}

						// NOTE: probably don't need to do conversion since we're just trying to get the weighted average here, conversion will be done later with the calculated analytical assay

						// const unitSymbolResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_DRY_SYMBOL_FIELD_NAME}]=${currentValue.dry_weight_uom}`, {
						// 	params: { fields: [ UNIT_SYMBOL_FIELD_NAME ] }
						// });
						// if (unitSymbolResponse.data.data.length === 0 || unitSymbolResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME] === null || unitSymbolResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME] === undefined) {
						// 	throw new Error(`[evaluateAnalyticalAssay] failed to get unit symbol for dry weight unit ${currentValue.dry_weight_uom}`);
						// }
						// const unitSymbol = unitSymbolResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME];
						// // requires the weight unit symbol, not the dry weight unit symbol
						// const conversionFactor = await getConversionValueForWeightWithWeightAndAssayUom(
						// 	unitSymbol, 
						// 	currentValue.dry_weight_uom, 
						// 	currentValue.assay_uom,
						// );
						// console.log(`[evaluateAnalyticalAssay] assay value: ${assayValue}; dry weight: ${currentValue.dry_weight}; conversionFactor: ${conversionFactor}; accumulator: ${accumulator}`);
						// const analyticalAssay = accumulator + (assayValue*currentValue.dry_weight*conversionFactor);
						// console.log(`[evaluateAnalyticalAssay] evaluated analytical assay: ${analyticalAssay}`);
						// return analyticalAssay;

						const analyticalAssay = accumulator + (assayValue * parseFloat(currentValue.dry_weight ?? '0'));
						console.log(`[evaluateAnalyticalAssay] evaluated analytical assay: ${analyticalAssay} for method=${methodKey}, commodity=${commodityKey}; with values accumulator=${accumulator}, assayValue=${assayValue}, dryWeight=${currentValue.dry_weight}`);
						return analyticalAssay;
					}, 0) / totalDryWeight;
					console.log(`[evaluateAnalyticalAssay] analytical assay: ${analyticalAssay[methodKey][commodityKey]['analytical_assay']}`)
					if (group[methodKey][commodityKey].length > 0) {
						analyticalAssay[methodKey][commodityKey][ASSAY_LOT_ASSAY_UOM_FIELD_NAME] = group[methodKey][commodityKey][0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME];
					}
				}
			}
			console.log(`[evaluateAnalyticalAssay] analyticalAssay: ${JSON.stringify(analyticalAssay)}`);
			return analyticalAssay;
		}

		function isNullOrUndefined(value: any) {
			return value === null || value === undefined;
		}

		function formatNumber(number: any, decimalPlaces: number = 2, showZero: boolean = true) {
			console.log('[formatNumber]');
			if (isNaN(number) || number === null) {
				return '-';
			}
			// round off number to decimalPlaces decimal places
			const roundedNumber = Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);

			// convert number to string and split into array of integer and decimal parts
			const [integerPart, decimalPart] = roundedNumber.toString().split('.');
			// convert integer part to string with digit group separator
			const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
			if (!decimalPart && !showZero) {
				// if there is no decimal part, return formatted integer part
				return formattedIntegerPart;
			}

			// fill with zeroes to the right of decimal point to specified number of decimal places, if decimal part is not defined, let it start with an empty string and be padded
			const formattedDecimalPart = (decimalPart ?? '').padEnd(decimalPlaces, '0');

			// return formatted number
			return `${formattedIntegerPart}.${formattedDecimalPart}`;
		}

		function roundNumber(num: any, decimalPlaces: number = 2, roundLikePositiveIfNegative: boolean = false): number | null {
			if (isNullOrUndefined(num) || isNaN(num)) {
				return null;
			}
			const isNegativeAndRoundAsIfPositive = roundLikePositiveIfNegative && num < 0;
			if (isNegativeAndRoundAsIfPositive) {
				num = num * -1;
			}
			// round off number to decimalPlaces decimal places
			return Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces) * (isNegativeAndRoundAsIfPositive ? -1 : 1);
		}
		
		// function formatNumbersBracketIfNegative(number: any, decimalPlaces: number = 2, showZero: boolean = true) {
		// 	console.log('[formatNumbersBracketIfNegative]');
		// 	if (isNaN(number) || number === null) {
		// 		return '-';
		// 	}
		// 	if (number < 0) {
		// 		return `(${formatNumber(Math.abs(number), decimalPlaces, showZero)})`;
		// 	}
		// 	return formatNumber(number, decimalPlaces, showZero);
		// }

		// function parseNumberWithBracketsIfNegative(number: any) {
		// 	console.log('[parseNumberWithBracketsIfNegative]');
		// 	if (!number) {
		// 		return 0;
		// 	}
		// 	// remove anything from 'number' that is not a round bracket, digit or a decimal point
		// 	const partiallyCleanedUpNumberString = number.replace(/[^\d.()]/g, '');
		// 	let cleanedUpNumberString;
		// 	if (partiallyCleanedUpNumberString.includes('(') && partiallyCleanedUpNumberString.includes(')')) {
		// 		// remove the brackets and replace the negative sign with a minus sign
		// 		cleanedUpNumberString = partiallyCleanedUpNumberString.replace(/\(/g, '-').replace(/\)/g, '');
		// 	} else {
		// 		cleanedUpNumberString = partiallyCleanedUpNumberString;
		// 	}
		// 	const parsedNumber = parseFloat(cleanedUpNumberString);
		// 	console.log(`[parseNumberWithBracketsIfNegative] number: ${number} to ${parsedNumber}`);
		// 	return parsedNumber;
		// }

		// // function that takes a stringed number, removes the commas and parseFloats it, returns number as is if it is already a number
		// function parseNumber(number: string | number) {
		// 	console.log('[parseNumber]');
		// 	if (typeof number === 'number') {
		// 		return number;
		// 	}
		// 	if (!number || number === '-') {
		// 		return 0;
		// 	}
		// 	// remove anything from 'number' that is not a -, digit or a decimal point
		// 	const parsedNumber = parseFloat(number.replace(/[^\d.-]/g, ''));
		// 	console.log(`[parseNumber] number: ${number} to ${parsedNumber}`);
		// 	return parsedNumber;
		// }

		type FindBracketContext = {
			commodityCode: string,
			type: 'Payable Assay' | 'Treatment Charge' | 'Refining Charge' | 'Penalty',
		}

		function findBracket<T extends PayableAssayBracket | ChargeBracket | PenaltyBracket>(brackets: T[], value: number): T | undefined {
			console.log('[findBracket]');
			// find the bracket that the value falls into
			return brackets.find((bracket: T) => {
				// if the value is greater than or equal to the lower limit and less than or equal to the upper limit, return true
				const matchingBracket = (value > (bracket.lower_threshold ?? 0) && (isNullOrUndefined(bracket.upper_threshold) || value < bracket.upper_threshold)) ||
					(bracket.lower_threshold_inclusive && value === (bracket.lower_threshold ?? 0)) ||
					(bracket.upper_threshold_inclusive && value === bracket.upper_threshold);
				console.log(`[findBracket] value=${value} for bracket: ${JSON.stringify(bracket)}? match=${!!matchingBracket}`);
				return matchingBracket;
			});
		}

		function evaluateFinalValueByBracket(
			value: number,
			// bracketConversion: BracketConversions,
			bracket: BracketForEvaluation,
		) {
			console.log('[evaluateFinalValueFromBrackets]');
			// calculate potential value
			const potentialValue = (value - (bracket.initial_adjustment ?? 0)*(bracket.initial_adjustment_conversion_by_multiplication ? (bracket.initial_adjustment_conversion_factor ?? 1) : 1/(bracket.initial_adjustment_conversion_factor ?? 1))) * (bracket.rate ?? 0) * (bracket.rate_type === RateType.PERCENTAGE ? 0.01 : 1) + (bracket.final_adjustment ?? 0)*(bracket.final_adjustment_conversion_factor ? (bracket.final_adjustment_conversion_factor ?? 1) : 1/(bracket.final_adjustment_conversion_factor ?? 1));
			switch(bracket.bracket_type) {
				case BracketType.MIN_DEDUCTION:
					if (bracket.comparator === null || bracket.comparator === undefined) {
						throw new Error(`Minimum deduction not found`);
					}
					const minDeduction = bracket.comparator * (bracket.comparator_conversion_by_multiplication ? (bracket.comparator_conversion_factor ?? 1) : 1/(bracket.comparator_conversion_factor ?? 1));
					if (value - potentialValue < minDeduction) {
						return roundNumber(value - minDeduction, 4);
					}
					return roundNumber(potentialValue, 4);
				case BracketType.MAX_CAP:
					if (bracket.comparator === null || bracket.comparator === undefined) {
						throw new Error(`Maximum cap not found`);
					}
					const maxCap = bracket.comparator * (bracket.comparator_conversion_by_multiplication ? (bracket.comparator_conversion_factor ?? 1) : 1/(bracket.comparator_conversion_factor ?? 1));
					if (potentialValue > maxCap) {
						return roundNumber(maxCap, 4);
					}
					return roundNumber(potentialValue, 4);
				case BracketType.BRACKET:
					return roundNumber(potentialValue, 4);
				default:
					throw new Error(`bracket type ${bracket.bracket_type} is not supported`);
			}
		}

		async function evaluatePayableAssay(value: number, defaultUom: string, brackets: PayableAssayBracket[], commodityCode: string) {
			// TODO: the brackets for payable assay may be unique, convert it. Same for TC and penalty
			// this function is async because we may need to fetch conversion factors for different units from the database
			console.log('[evaluatePayableAssay]');
			if (!brackets || brackets.length === 0) {
				// return undefined values if no brackets
				return {};
			}
			// find bracket
			const bracket = findBracket(brackets, value);
			// check if bracket not found
			if (!bracket) {
				throw new Error(`Unable to find the range for analytical assay value of ${value}, please ensure the payable assay rates for the commodity ${commodityCode} are defined in the contract cover all range of possible values`);
			}
			// build BracketForEvaluation from it, handle conversion for initial_adjustment and comparator if required
			let initialAdjustmentConversionFactor = 1;
			let initialAdjustmentConversionUom;
			let initialAdjustmentConversionByMultiplication = true;
			if (bracket.initial_adjustment_uom && bracket.initial_adjustment_uom !== undefined && bracket.initial_adjustment_uom !== null && bracket.initial_adjustment_uom !== defaultUom) {
				// get conversion factor
				const conversionValue = await getAssayUnitConversionValue(bracket.initial_adjustment_uom, defaultUom);
				initialAdjustmentConversionFactor = conversionValue.value;
				initialAdjustmentConversionUom = getConversionUnit(bracket.initial_adjustment_uom, defaultUom, conversionValue.isConvertByMultiplication);
				initialAdjustmentConversionByMultiplication = conversionValue.isConvertByMultiplication;
			}

			let comparator;
			let comparatorConversionFactor = 1;
			let comparatorConversionUom;
			let comparatorConversionByMultiplication = true;
			if (bracket.bracket_type === BracketType.MAX_CAP) {
				comparator = bracket.maximum_cap ?? 0;
				if (bracket.maximum_cap_uom !== undefined && bracket.maximum_cap_uom !== null && bracket.maximum_cap_uom !== defaultUom) {
					// get conversion factor
					const conversionValue = await getAssayUnitConversionValue(bracket.maximum_cap_uom, defaultUom);
					comparatorConversionFactor = conversionValue.value;
					comparatorConversionUom = getConversionUnit(bracket.maximum_cap_uom, defaultUom, conversionValue.isConvertByMultiplication);
					comparatorConversionByMultiplication = conversionValue.isConvertByMultiplication;
				}
			} else if (bracket.bracket_type === BracketType.MIN_DEDUCTION) {
				comparator = bracket.minimum_deduction ?? 0;
				if (bracket.minimum_deduction_uom !== undefined && bracket.minimum_deduction_uom !== null && bracket.minimum_deduction_uom !== defaultUom) {
					// get conversion factor
					const conversionValue = await getAssayUnitConversionValue(bracket.minimum_deduction_uom, defaultUom);
					comparatorConversionFactor = conversionValue.value;
					comparatorConversionUom = getConversionUnit(bracket.minimum_deduction_uom, defaultUom, conversionValue.isConvertByMultiplication);
					comparatorConversionByMultiplication = conversionValue.isConvertByMultiplication;
				}
			}
			const bracketForEvaluation: BracketForEvaluation = {
				bracket_type: bracket.bracket_type,
				rate: bracket.rate ?? 1,
				rate_type: bracket.rate_type ?? RateType.FRACTIONAL,
				initial_adjustment: bracket.initial_adjustment ?? 0,
				initial_adjustment_conversion_factor: initialAdjustmentConversionFactor,
				initial_adjustment_conversion_by_multiplication: initialAdjustmentConversionByMultiplication,
				comparator,
				comparator_conversion_factor: comparatorConversionFactor,
				comparator_conversion_by_multiplication: comparatorConversionByMultiplication,
			}

			console.log(`[evaluatePayableAssay] bracketForEvaluation: ${JSON.stringify(bracketForEvaluation)}`);

			// get conversion units if required
			// get final value and build expresssion
			const finalValue = evaluateFinalValueByBracket(value, bracketForEvaluation);

			let expression = '';
			const INITIAL_ADJUSMENT_EXISTS = bracket.initial_adjustment !== undefined && bracket.initial_adjustment !== null;
			if (bracket.bracket_type === BracketType.BRACKET) {	
				expression = `${INITIAL_ADJUSMENT_EXISTS ? '(' : ''}${formatNumber(value, 4)}${defaultUom ?? ''}${INITIAL_ADJUSMENT_EXISTS ? ` - ${formatNumber(bracket.initial_adjustment, 4)}${bracket.initial_adjustment_uom ?? `${defaultUom ?? ''}`}` : ''}${INITIAL_ADJUSMENT_EXISTS && (initialAdjustmentConversionFactor !== 1) ? ` ${initialAdjustmentConversionByMultiplication ? '*' : '/'} ${formatNumber(initialAdjustmentConversionFactor, 4)}${initialAdjustmentConversionUom}` : ''}${INITIAL_ADJUSMENT_EXISTS ? ')' : ''} * ${formatNumber(bracket.rate, 4)}${bracket.rate_type === RateType.PERCENTAGE ? '/100' : `/${formatNumber(1, 4)}`}`;
			} else if (bracket.bracket_type === BracketType.MIN_DEDUCTION) {
				const PAYABLE_ASSAY_EQUALS_COMPARATOR = (finalValue === (value - comparator * comparatorConversionFactor));
				expression = PAYABLE_ASSAY_EQUALS_COMPARATOR ?
					`${formatNumber(value, 4)}${defaultUom ?? ''} - ${formatNumber(comparator, 4)}${defaultUom ?? ''}${(comparatorConversionFactor !== 1) ? ` ${comparatorConversionByMultiplication ? '*' : '/'} ${formatNumber(comparatorConversionFactor, 4)}${comparatorConversionUom}` : ''}` : 
					`${INITIAL_ADJUSMENT_EXISTS ? '(' : ''}${formatNumber(value, 4)}${defaultUom ?? ''}${INITIAL_ADJUSMENT_EXISTS ? ` - ${formatNumber(bracket.initial_adjustment, 4)}${bracket.initial_adjustment_uom ?? `${defaultUom ?? ''}`}` : ''}${INITIAL_ADJUSMENT_EXISTS && (initialAdjustmentConversionFactor !== 1) ? ` ${initialAdjustmentConversionByMultiplication ? '*' : '/'} ${formatNumber(initialAdjustmentConversionFactor, 4)}${initialAdjustmentConversionUom}` : ''}${INITIAL_ADJUSMENT_EXISTS ? ')' : ''} * ${formatNumber(bracket.rate, 4)}${bracket.rate_type === RateType.PERCENTAGE ? '/100' : `/${formatNumber(1, 4)}`}`;
			} else if (bracket.bracket_type === BracketType.MAX_CAP) {
				const PAYABLE_ASSAY_EQUALS_COMPARATOR = finalValue === comparator * comparatorConversionFactor;
				expression = PAYABLE_ASSAY_EQUALS_COMPARATOR ? 
					`${formatNumber(comparator, 4)}${defaultUom ?? ''}${(comparatorConversionFactor !== 1) ? ` ${comparatorConversionByMultiplication ? '*' : '/'} ${formatNumber(comparatorConversionFactor, 4)}${comparatorConversionUom}` : ''}` :
					`${INITIAL_ADJUSMENT_EXISTS ? '(' : ''}${formatNumber(value, 4)}${defaultUom ?? ''}${INITIAL_ADJUSMENT_EXISTS ? ` - ${formatNumber(bracket.initial_adjustment, 4)}${bracket.initial_adjustment_uom ?? `${defaultUom ?? ''}`}` : ''}${INITIAL_ADJUSMENT_EXISTS && (initialAdjustmentConversionFactor !== 1) ? ` ${initialAdjustmentConversionByMultiplication ? '*' : '/'} ${formatNumber(initialAdjustmentConversionFactor, 4)}${initialAdjustmentConversionUom}` : ''}${INITIAL_ADJUSMENT_EXISTS ? ')' : ''} * ${formatNumber(bracket.rate, 4)}${bracket.rate_type === RateType.PERCENTAGE ? '/100' : `/${formatNumber(1, 4)}`}`;
			} else {
				throw new Error(`[buildPayableAssayExpression] unknown bracket method: ${bracket.bracket_type}`);
			}
			return {
				payableAssay: finalValue,
				expression,
			}
		}

		// TODO: do i need to handle unit conversion for this?
		const ABOVE_LT_AND_PLUS = 'above the lower threshold, plus';
		const BELOW_UT_AND_MINUS = 'below the upper threshold, minus';
		function evaluateCharge(value: number, defaultUom: string, brackets: ChargeBracket[], commodityCode: string, context: 'treatment charge' | 'refining charge') {
			console.log('[evaluateCharge]');
			// find bracket
			if (!brackets || !brackets.length) {
				return undefined;
			}
			const bracket = findBracket(brackets, value);
			// check if bracket not found
			if (!bracket) {
				throw new Error(`Unable to find the range for the price rate value of ${value}, please ensure the ${context} rates for commodity ${commodityCode} are defined in the contract cover all range of possible values`);
			}
			// build BracketForEvaluation from it
			let initialAdjustment = 0;
			let rate = 1;
			const escalatorReference = bracket.escalator_reference ?? 1;
			if (bracket.use_btc) {
				rate = 0;
				initialAdjustment = 0;
			} else {
				rate = (bracket.rate ?? 1)/escalatorReference;
				if (bracket.for_every_unit === ABOVE_LT_AND_PLUS) {
					initialAdjustment = bracket.lower_threshold ?? 0;
				} else if (bracket.for_every_unit === BELOW_UT_AND_MINUS) {
					initialAdjustment = bracket.upper_threshold ?? 0;
				} else {
					throw new Error(`[evaluateCharge] unknown for_every_unit: ${bracket.for_every_unit}`);
				}
			}
			const bracketForEvaluation: BracketForEvaluation = {
				bracket_type: BracketType.BRACKET,
				rate: rate,
				rate_type: RateType.FRACTIONAL,
				initial_adjustment: initialAdjustment,
				final_adjustment: (bracket.base_treatment_charge ?? 0) + (bracket.base_charge_adjustment ?? 0),
			}
			console.log(`[evaluateCharge] bracketForEvaluation: ${JSON.stringify(bracketForEvaluation)}`);
			// get final value from it
			return {
				finalValue: evaluateFinalValueByBracket(value, bracketForEvaluation),
				baseTreatmentCharge: bracket.base_treatment_charge + (bracket.base_charge_adjustment ?? 0),
			};
		}

		// TODO: do i need to handle unit conversion for this?
		function evaluatePenalty(value: number, brackets: PenaltyBracket[], currency: string, ratePerUom: string, commodityCode: string) {
			console.log('[evaluatePenalty]');
			if (!brackets || !brackets.length) {
				return {};
			}
			// find bracket
			const bracket = findBracket(brackets, value);
			// check if bracket not found
			if (!bracket) {
				throw new Error(`Unable to find the range for the analytical assay value of ${value}, please ensure the penalty rates for commodity ${commodityCode} are defined in the contract cover all range of possible values`);
			}
			// build BracketForEvaluation from it
			let initialAdjustment = 0;
			let rate = 1;
			const escalatorReference = bracket.escalator_reference ?? 1;
			if (bracket.no_penalty) {
				rate = 0;
				initialAdjustment = 0;
			} else {
				rate = (bracket.rate ?? 1)/escalatorReference;
				if (bracket.for_every_unit === ABOVE_LT_AND_PLUS) {
					initialAdjustment = bracket.lower_threshold ?? 0;
				} else if (bracket.for_every_unit === BELOW_UT_AND_MINUS) {
					// Penalty should not be using this but good to have it here in case. There is no base penalty rate like in treatment/refining charge, only a lower threshold to increase the penalty rate for any amount over it
					initialAdjustment = bracket.upper_threshold ?? 0;
				} else {
					throw new Error(`[evaluatePenalty] unknown for_every_unit: ${bracket.for_every_unit}`);
				}
			}
			const bracketForEvaluation: BracketForEvaluation = {
				bracket_type: BracketType.BRACKET,
				rate: rate,
				rate_type: RateType.FRACTIONAL,
				initial_adjustment: initialAdjustment,
				final_adjustment: 0,
			}
			console.log(`[evaluatePenalty] bracketForEvaluation: ${JSON.stringify(bracketForEvaluation)}`);
			// get final value and build expresssion
			const finalValue = evaluateFinalValueByBracket(value, bracketForEvaluation);
			const INITIAL_ADJUSMENT_EXISTS = bracketForEvaluation.initial_adjustment !== undefined && bracketForEvaluation.initial_adjustment !== null;
			let expression = '';
			if (!bracket.rate || bracket.rate === 0) {
				expression = 'No penalty';
			} else {
				expression = `${INITIAL_ADJUSMENT_EXISTS ? '(' : ''}${formatNumber(value, 4)}${INITIAL_ADJUSMENT_EXISTS ? ` - ${formatNumber(initialAdjustment, 4)})` : ''} / ${formatNumber(escalatorReference, 4)} * ${currency ?? ''} ${formatNumber(rate, 4)}/${ratePerUom ?? ''}`;
			}

			return {
				penalty: finalValue,
				expression,
				bracket
			}
		}

		// function capitalise the first letter of every word in a string input
		function capitaliseFirstLetter(input: string) {
			return input.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
		}

		// function to convert a Date object into DD MMM YYYY format
		function formatDate(date: Date) {
			const monthNames = [
				"Jan", "Feb", "Mar",
				"Apr", "May", "Jun", "Jul",
				"Aug", "Sep", "Oct",
				"Nov", "Dec"
			];
			const day = date.getDate();
			const monthIndex = date.getMonth();
			const year = date.getFullYear();
			return `${day} ${monthNames[monthIndex]} ${year}`;
		}

		// function to convert a Date object into YYYY-MM-DD format
		function formatDateYYYYMMDD(date: Date, withDashSeparator: boolean = true) {
			const month = date.getMonth() + 1;
			const day = date.getDate();
			const year = date.getFullYear();
			return `${year}${withDashSeparator ? '-' : ' '}${month < 10 ? '0' : ''}${month}${withDashSeparator ? '-' : ' '}${day < 10 ? '0' : ''}${day}`;
		}

		function minusBusinessDays(date: Date, days: number, inclusive: boolean = false) {
			const newDate = new Date(date.valueOf());
			let businessDaysLeft = days - (inclusive ? 1 : 0);
			let minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = true;
			while(isNonTradingDay(newDate)) {
				// if the reference date is a non-trading day
				newDate.setDate(newDate.getDate() - 1);
				if (minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay) {
					businessDaysLeft -= 1;
					minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = false
				}
			}

			while (businessDaysLeft > 0) {
				// minus one business day at a time
				newDate.setDate(newDate.getDate() - 1);
				if (!isNonTradingDay(newDate)) {
					businessDaysLeft -= 1;
				}
			}
			
			if (newDate.getHours() >= 12) {
				// round up depending on hours due to daylight savings (Dates may be based on locale)
				newDate.setDate(newDate.getDate() + 1);
			}

			while (isNonTradingDay(newDate)) {
				// for when the start date is a non-trading day
				newDate.setDate(newDate.getDate() - 1);
			}
			
			return newDate;
		}

		function isNonTradingDay(date: Date) {
			return date.getDay() === 0 || date.getDay() === 6;
		}

		function addBusinesDays(date: Date, days: number, inclusive: boolean = false) {
			const newDate = new Date(date.valueOf());
			let businessDaysLeft = days - (inclusive ? 1 : 0);
			let minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = true;
			while(isNonTradingDay(newDate)) {
				// if the reference date is a non-trading day
				newDate.setDate(newDate.getDate() + 1);
				if (minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay) {
					businessDaysLeft -= 1;
					minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = false
				}
			}

			while (businessDaysLeft > 0) {
				// minus one business day at a time
				newDate.setDate(newDate.getDate() + 1);
				if (!isNonTradingDay(newDate)) {
					businessDaysLeft -= 1;
				}
			}
			
			if (newDate.getHours() >= 12) {
				// round up depending on hours due to daylight savings (Dates may be based on locale)
				newDate.setDate(newDate.getDate() + 1);
			}

			while (isNonTradingDay(newDate)) {
				// for when the end date is a non-trading day
				newDate.setDate(newDate.getDate() + 1);
			}
			
			return newDate;
		}

		// function to get the first date of the month of a given date plus a number of months
		function getFirstDateOfMonthPlusMonths(date: Date, months: number) {
			const newDate = new Date(date.valueOf());
			newDate.setMonth(newDate.getMonth() + months, 1);
			return newDate;
		}

		// function to get the last date of the month of a given date plus a number of months
		function getLastDateOfMonthPlusMonths(date: Date, months: number) {
			const newDate = new Date(date.valueOf());
			// gets the '0th day' of the month after the target month to get the last day of the target month
			newDate.setMonth(newDate.getMonth() + months + 1, 0);
			return newDate;
		}

		async function getWeightUnitConversionValue(sourceWeightUnitSymbol: string, targetWeightUnitSymbol: string): Promise<ConversionValue> {
			if (sourceWeightUnitSymbol === targetWeightUnitSymbol) {
				return {
					value: 1,
					isConvertByMultiplication: true,
				};
			}
			const sourceWeightUnitToGrams = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_SYMBOL_FIELD_NAME}]=${sourceWeightUnitSymbol}`, {
				params: { fields: [ UNIT_CONVERSION_TO_GRAM_FIELD_NAME ] }
			});

			if (sourceWeightUnitToGrams.data.data.length === 0 || sourceWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME] === null || sourceWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME] === undefined) {
				throw new Error(`[getWeightUnitConversionValue] failed to get conversion value for source weight unit ${sourceWeightUnitSymbol}. Ensure that the symbol is correct and is a weight unit symbol`);
			}

			const targetWeightUnitToGrams = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_SYMBOL_FIELD_NAME}]=${targetWeightUnitSymbol}`, {
				params: { fields: [ UNIT_CONVERSION_TO_GRAM_FIELD_NAME ] }
			});

			if (targetWeightUnitToGrams.data.data.length === 0 || targetWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME] === null || targetWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME] === undefined) {
				throw new Error(`[getWeightUnitConversionValue] failed to get conversion value for the target weight unit ${targetWeightUnitSymbol}. Ensure that the symbol is correct and is a weight unit symbol`);
			}

			const sourceUnitConversion = parseFloat(sourceWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME]);
			if (isNaN(sourceUnitConversion)) {
				throw new Error(`[getWeightUnitConversionValue] source weight unit ${sourceWeightUnitSymbol} conversion value=${sourceUnitConversion} is not a number`);
			}

			const targetUnitConversion = parseFloat(targetWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME]);
			if (isNaN(targetUnitConversion)) {
				throw new Error(`[getWeightUnitConversionValue] target weight unit ${targetWeightUnitSymbol} conversion value=${targetUnitConversion} is not a number`);
			}
			
			return sourceUnitConversion < targetUnitConversion ? {
				value: roundNumber(targetUnitConversion / sourceUnitConversion, 4) ?? 1,
				isConvertByMultiplication: false
			} : {
				value: roundNumber(sourceUnitConversion / targetUnitConversion, 4) ?? 1,
				isConvertByMultiplication: true
			};
		}

		async function getAssayUnitConversionValue(sourceAssayUnitSymbol: string | undefined, targetAssayUnitSymbol: string | undefined): Promise<ConversionValue> {
			if (
				sourceAssayUnitSymbol === null || 
				sourceAssayUnitSymbol === undefined || 
				targetAssayUnitSymbol === null || 
				targetAssayUnitSymbol === undefined
			) {
				return {
					value: 1,
					isConvertByMultiplication: true,
				};
			}
			if (sourceAssayUnitSymbol === targetAssayUnitSymbol) {
				return {
					value: 1,
					isConvertByMultiplication: true,
				};
			}
			const sourceaAssayUnitToPpb = await api.get(`/items/${ASSAY_UNIT_COLLECTION_NAME}?filter[${ASSAY_UNIT_UNIT_FIELD_NAME}]=${sourceAssayUnitSymbol}`, {
				params: { fields: [ ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME ] }
			});

			if (sourceaAssayUnitToPpb.data.data.length === 0 || sourceaAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME] === undefined || sourceaAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME] === null) {
				throw new Error(`[getAssayUnitConversionValue] failed to get conversion value for source weight unit ${sourceAssayUnitSymbol}. Ensure that the symbol is correct and is a weight unit symbol`);
			}

			const targetAssayUnitToPpb = await api.get(`/items/${ASSAY_UNIT_COLLECTION_NAME}?filter[${ASSAY_UNIT_UNIT_FIELD_NAME}]=${targetAssayUnitSymbol}`, {
				params: { fields: [ ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME ] }
			});

			if (targetAssayUnitToPpb.data.data.length === 0 || targetAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME] === undefined || targetAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME] === null) {
				throw new Error(`[getAssayUnitConversionValue] failed to get conversion value for the target weight unit ${targetAssayUnitSymbol}. Ensure that the symbol is correct and is a weight unit symbol`);
			}

			const sourceUnitConversion = parseFloat(sourceaAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME]);
			if (isNaN(sourceUnitConversion)) {
				throw new Error(`[getAssayUnitConversionValue] source weight unit ${sourceAssayUnitSymbol} conversion value=${sourceUnitConversion} is not a number`);
			}

			console.log(`[getAssayUnitConversionValue] source unit conversion value=${sourceUnitConversion}`);

			const targetUnitConversion = parseFloat(targetAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME]);
			if (isNaN(targetUnitConversion)) {
				throw new Error(`[getAssayUnitConversionValue] target weight unit ${sourceAssayUnitSymbol} conversion value=${targetUnitConversion} is not a number`);
			}

			console.log(`[getAssayUnitConversionValue] target unit conversion value=${targetUnitConversion}`);


			// the data fetched via the api is to factor to convert the source unit to ppb by multiplication, then to the target unit by division
			console.log(`[getAssayUnitConversionValue] returning ${sourceUnitConversion / targetUnitConversion}`)
			return sourceUnitConversion < targetUnitConversion ? {
				value: roundNumber(targetUnitConversion / sourceUnitConversion, 4) ?? 1,
				isConvertByMultiplication: false
			} : {
				value: roundNumber(sourceUnitConversion / targetUnitConversion, 4) ?? 1,
				isConvertByMultiplication: true
			};
		}

		// a function that takes two measurement units and creates the unit conversion
		// for example, if the source unit is 'g/t' and the target unit is 'oz/t', it will return 'oz/g'
		function getConversionUnit(sourceUnit: string | undefined, targetUnit: string | undefined, isConvertByMultiplication: boolean): string | undefined {
			if (sourceUnit === undefined || targetUnit === undefined || sourceUnit === null || targetUnit === null) {
				return undefined;
			}
			const sourceUnitParts = sourceUnit.split('/');
			const targetUnitParts = targetUnit.split('/');

			if (sourceUnitParts.length > 2 || targetUnitParts.length > 2) {
				throw new Error(`[getConversionUnit] sourceUnit=${sourceUnit} and targetUnit=${targetUnit} must be in the format of 'unit1/unit2', an extra '/' was found`);
			}
			
			if (sourceUnitParts.length === 1 && targetUnitParts.length === 1) {
				return isConvertByMultiplication ? `${targetUnitParts[0]}/${sourceUnitParts[0]}` : `${sourceUnitParts[0]}/${targetUnitParts[0]}`;
			} else if (sourceUnitParts.length === 1) {
				const numerator = targetUnitParts[0] === sourceUnitParts[0] ? '' : `${targetUnitParts[1]}(${sourceUnitParts[1]})`;
				const denominator = targetUnitParts[1];
				return denominator === '' ? 
					(isConvertByMultiplication ? numerator : `/${numerator}`) : 
					(isConvertByMultiplication ? `${numerator}/${denominator}` : `${denominator}/${numerator}`);
			} else if (targetUnitParts.length === 1) {
				const numerator = sourceUnitParts[1]
				const denominator = sourceUnitParts[0] === targetUnitParts[0] ? '' : `${sourceUnitParts[1]}(${targetUnitParts[0]})`;
				return denominator === '' ? 
					(isConvertByMultiplication ? numerator : `/${numerator}`) : 
					(isConvertByMultiplication ? `${numerator}/${denominator}` : `${denominator}/${numerator}`);
			} else {
				// when both source and target units have a numerator and denominator
				const targetNumeratorEqualsSourceNumerator = sourceUnitParts[0] === targetUnitParts[0];
				const targetDenominatorEqualsSourceDenominator = sourceUnitParts[1] === targetUnitParts[1];

				const hideSourceNumerator = targetNumeratorEqualsSourceNumerator || sourceUnitParts[0] === '';
				const hideTargetNumerator = targetNumeratorEqualsSourceNumerator || targetUnitParts[0] === '';
				const hideSourceDenominator = targetDenominatorEqualsSourceDenominator || sourceUnitParts[1] === '';
				const hideTargetDenominator = targetDenominatorEqualsSourceDenominator || targetUnitParts[1] === '';

				const requireBracketsForNumerator = !hideSourceDenominator && !hideTargetNumerator;
				const requireBracketsForDenominator = !hideSourceNumerator && !hideTargetDenominator;

				const numerator = `${hideSourceDenominator ? '' : sourceUnitParts[1]}${requireBracketsForNumerator ? '(' : ''}${hideTargetNumerator ? '' : `${targetUnitParts[0]}`}${requireBracketsForNumerator ? ')' : ''}`;
				const denominator = `${hideSourceNumerator ? '' : sourceUnitParts[0]}${requireBracketsForDenominator ? '(' : ''}${hideTargetDenominator ? '' : `${targetUnitParts[1]}`}${requireBracketsForDenominator ? ')' : ''}`;

				return denominator === '' ? 
					(isConvertByMultiplication ? numerator : `/${numerator}`) : 
					(isConvertByMultiplication ? `${numerator}/${denominator}`: `${denominator}/${numerator}`);
			}
		}

		async function getAssayUnitComposition(assayUnit: string): Promise<string> {
			const assayUnitCompositionResponse = await api.get(`/items/${ASSAY_UNIT_COLLECTION_NAME}`, {
				params: { 
					fields: [ ASSAY_UNIT_UNIT_FIELD_NAME, ASSAY_UNIT_COMPOSITION_FIELD_NAME ],
					filter: {
						[ASSAY_UNIT_COMPOSITION_FIELD_NAME]: { 
							"_nnull": true,
						},
						[ASSAY_UNIT_UNIT_FIELD_NAME]: {
							"_eq": assayUnit,
						}
					} 
				}
			});

			if (assayUnitCompositionResponse.status !== 200 || !assayUnitCompositionResponse.data || assayUnitCompositionResponse.data.data.length === 0) {
				throw new Error(`[getAssayUnitComposition] no assay units found with composition`);
			}

			return assayUnitCompositionResponse.data.data[0][ASSAY_UNIT_COMPOSITION_FIELD_NAME];
		}

		async function getConversionValuesAndUnitsForPayableMetalCalculation(
			targetWeightUnit: string, 
			dryWeightUnit: string, 
			assayUnit: string
		): Promise<PayableMetalUnitConversionData> {
			const dryWeightUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_DRY_SYMBOL_FIELD_NAME}]=${dryWeightUnit}`, {
				params: { fields: [ UNIT_SYMBOL_FIELD_NAME ] }
			});
			if (!dryWeightUomResponse.data.data || !dryWeightUomResponse.data.data[0] || !dryWeightUomResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME]) {
				throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] Dry weight uom not found for symbol ${dryWeightUnit}`);
			}
			const originalWeightUnit = dryWeightUomResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME];
			if (assayUnit === '%') {
				// percentage assay unit is a special case where we directly convert the dry weight unit to the target weight unit
				if (originalWeightUnit === targetWeightUnit) {
					// if target unit and dry weight unit are the same, no conversion is needed
					return {} as PayableMetalUnitConversionData;
				}
				const conversionValue = await getWeightUnitConversionValue(originalWeightUnit, targetWeightUnit);
				const conversionUnit = getConversionUnit(originalWeightUnit, targetWeightUnit, conversionValue.isConvertByMultiplication);
				if (!conversionUnit) {
					throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] no conversion unit found for dry weight unit ${originalWeightUnit} and target weight unit ${targetWeightUnit}`);
				}
				return {
					finalConversion: {
						conversionFactor: conversionValue.value,
						conversionUom: conversionUnit,
						isConvertByMultiplication: conversionValue.isConvertByMultiplication
					}
				} as PayableMetalUnitConversionData;
			}
			let splitAssayUnit = assayUnit.split('/');

			if (splitAssayUnit.length == 1)  {
				const assayUnitCompResponse = await getAssayUnitComposition(assayUnit);
				if (!assayUnitCompResponse) {
					throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] assay unit ${assayUnit} does not have a composition`);
				}
				splitAssayUnit = assayUnitCompResponse.split('/');
			}

			if (splitAssayUnit.length > 2 || splitAssayUnit.length === 0) {
				throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] assay unit ${assayUnit} is not in the format of 'unit1/unit2'`);
			}

			const assayUnitNumerator = splitAssayUnit[0];
			const assayUnitDenominator = splitAssayUnit[1];

			const payableMetalUnitConversionData: PayableMetalUnitConversionData = {};

			if (assayUnitDenominator !== originalWeightUnit) {
				const conversionValue = await getWeightUnitConversionValue(originalWeightUnit, assayUnitDenominator);
				const conversionUnit = getConversionUnit(originalWeightUnit, assayUnitDenominator, conversionValue.isConvertByMultiplication);
				if (!conversionUnit) {
					throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] no conversion unit found for dry weight unit ${originalWeightUnit} and assay unit denominator unit ${assayUnitDenominator}`);
				}
				payableMetalUnitConversionData.initialConversion = {
					conversionFactor:conversionValue.value,
					conversionUom: conversionUnit,
					isConvertByMultiplication: conversionValue.isConvertByMultiplication
				}
			}

			if (assayUnitNumerator !== targetWeightUnit) {
				const conversionValue = await getWeightUnitConversionValue(assayUnitNumerator, targetWeightUnit);
				const conversionUnit = getConversionUnit(assayUnitNumerator, targetWeightUnit, conversionValue.isConvertByMultiplication);
				if (!conversionUnit) {
					throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] no conversion unit found for target weight unit ${targetWeightUnit} and assay unit numerator unit ${assayUnitNumerator}`);
				}
				payableMetalUnitConversionData.finalConversion = {
					conversionFactor: conversionValue.value,
					conversionUom: conversionUnit,
					isConvertByMultiplication: conversionValue.isConvertByMultiplication
				}
			}

			return payableMetalUnitConversionData;
		}

		async function getConversionValueForWeightWithWeightAndAssayUom(
			targetWeightUnit: string, 
			dryWeightUnit: string, 
			assayUnit: string
		): Promise<number> {
			const conversionData = await getConversionValuesAndUnitsForPayableMetalCalculation(targetWeightUnit, dryWeightUnit, assayUnit);
			console.log(`[getConversionValueForWeightWithWeightAndAssayUom] conversionData: ${JSON.stringify(conversionData)}`);
			return (conversionData.initialConversion?.conversionFactor ?? 1)*(conversionData.finalConversion?.conversionFactor ?? 1);
		}

		const ID_FIELD_NAME = 'id';
		const FOREIGN_KEY_FIELD_NAME ="foreign_key";
		const LOT_NUMBER_FIELD_NAME = 'lot_number';
		const METHOD_FIELD_NAME = 'method';

		const PARCEL_COLLECTION_NAME = 'navarch_parcel';
		const PARCEL_CONTRACT_FIELD_NAME = 'contract';
		const PARCEL_COUNTERPARTY_FIELD_NAME = 'counterparty';
		const PARCEL_ASSAY_RESULTS_FIELD_NAME = 'assay_results';
		const PARCEL_WEIGHT_RESULTS_FIELD_NAME = 'weight_result';
		const PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME = 'estimate_arrival_date';
		const PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME = 'actual_arrival_date';
		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		// const PARCEL_INVOICE_DATE_FIELD_NAME = 'invoice_date';
		const PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME = 'estimated_shipment_date';
		// const PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME = 'actual_shipment_date';
		const PARCEL_QP_SELECTION_FIELD_NAME = 'qp_selection';
		const PARCEL_VESSEL_FIELD_NAME = 'vessel';
		const PARCEL_ORIGIN_FIELD_NAME = 'origin';
		const PARCEL_DESTINATION_FIELD_NAME = 'destination';
		const PARCEL_SHIPMENT_CODE_FIELD_NAME = 'shipment_code';
		const PARCEL_INVOICE_DUE_DATE_FIELD_NAME = 'invoice_due_date';
		const PARCEL_ADJUSTMENTS_FIELD_NAME = 'adjustments';
		// TODO: add a checker to ensure parcel is finalised before a user can attempt to create an invoice with Final as the invoice type
		const PARCEL_PARCEL_FINALISED_FIELD_NAME = 'parcel_finalised';
		const PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME = 'parcel_finalisation_date';

		const ASSAY_LOT_COLLECTION_NAME = 'navarch_assay_lot';
		const ASSAY_LOT_COMMODITY_FIELD_NAME = 'commodity';
		const ASSAY_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const ASSAY_LOT_DRY_WEIGHT_UOM_FIELD_NAME = 'dry_weight_uom';
		const ASSAY_LOT_BUYER_ASSAY_FIELD_NAME = 'buyer_assay';
		const ASSAY_LOT_SELLER_ASSAY_FIELD_NAME = 'seller_assay';
		const ASSAY_LOT_FINAL_ASSAY_FIELD_NAME = 'final_assay';
		const ASSAY_LOT_ASSAY_UOM_FIELD_NAME = 'assay_uom';
		const ASSAY_LOT_LOT_NUMBER_FIELD_NAME = 'lot_number';

		const WEIGHT_LOT_COLLECTION_NAME = 'navarch_weight_lot';
		const WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const WEIGHT_LOT_WET_WEIGHT_FIELD_NAME = 'wet_weight';
		const WEIGHT_LOT_MOISTURE_FIELD_NAME = 'moisture';
		const WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME = 'wet_weight_uom';
		const WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME = 'dry_weight_uom';

		const CONTRACT_COLLECTION_NAME = 'navarch_contract';
		const CONTRACT_CURRENCY_FIELD_NAME = 'contract_currency';
		const CONTRACT_GST_APPLICABLE_FIELD_NAME = 'gst_applicable';
		const CONTRACT_GST_RATE_FIELD_NAME = 'gst_rate';
		const CONTRACT_GST_LOCAL_CURRENCY_FIELD_NAME = 'local_currency';

		const INVOICE_TYPE_COLLECTION_NAME = 'navarch_contract_payment_information';
		const INVOICE_TYPE_RELATED_CONTRACT_FIELD_NAME = 'related_contract';
		const INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME = 'invoice_type';
		const INVOICE_TYPE_PAY_PERCENT_FIELD_NAME = 'pay_percent';
		const INVOICE_TYPE_PAYMENT_ADVICE_DAYS_FIELD_NAME = 'pa_days';
		const INVOICE_TYPE_PAYMENT_ADVICE_DAY_TYPE_FIELD_NAME = 'pa_day_type';
		const INVOICE_TYPE_PAYMENT_ADVICE_REF_DAY_FIELD_NAME = 'pa_ref_day';
		// const INVOICE_TYPE_PAYMENT_ADVICE_FINAL_INV_REF_DAY_FIELD_NAME = 'pa_final_inv_ref_day';
		const INVOICE_TYPE_PROVISIONAL_PRICING_DAYS_FIELD_NAME = 'pp_days';
		const INVOICE_TYPE_PROVISIONAL_PRICING_DAY_TYPE_FIELD_NAME = 'pp_day_type';
		const INVOICE_TYPE_PROVISIONAL_PRICING_REF_DAY_FIELD_NAME = 'pp_ref_day';

		const COMMODITY_IN_CONTRACT_COLLECTION_NAME = 'navarch_commodity_in_contract';
		const COMM_IN_CONTRACT_ID_FIELD_NAME = 'id';
		const COMM_IN_CONTRACT_CONTRACT_FIELD_NAME = 'contract';
		const COMM_IN_CONTRACT_COMMODITY_FIELD_NAME = 'commodity';
		const COMM_IN_PRIMARY_COMMODITY_FIELD_NAME = 'primary_commodity';
		const COMM_IN_CONTRACT_PAYABLE_COMMODITY_FIELD_NAME = 'payable_commodity';
		const COMM_IN_CONTRACT_PRICE_METHOD_FIELD_NAME = 'price_method'; // price method is now an integer value that represents and id from navarch_price_method
		const COMM_IN_CONTRACT_PRICE_FIX_TO_USE_FIELD_NAME = 'price_fix_to_use';
		const COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME = 'price_per_uom';
		const COMM_IN_CONTRACT_TREATMENT_CHARGE_PER_UOM_FIELD_NAME = 'treatment_charge_per_uom';
		const COMM_IN_CONTRACT_REFINING_CHARGE_PER_UOM_FIELD_NAME = 'refining_charge_rate_uom';
		const COMM_IN_CONTRACT_QUOTATIONAL_PERIODS_FIELD_NAME = 'quotational_periods';
		const COMM_IN_CONTRACT_PAYABLE_ASSAY_RATES_FIELD_NAME = 'payable_assay_rates';
		const COMM_IN_CONTRACT_PENALTY_RATES_FIELD_NAME = 'penalty_rates';
		const COMM_IN_CONTRACT_PENALTY_PER_UOM_FIELD_NAME = 'penalty_per_uom';

		const PAYABLE_ASSAY_BRACKET_COLLECTION_NAME = 'navarch_payable_assay_bracket';
		const PAYABLE_ASSAY_INITIAL_ADJUSTMENT_FIELD_NAME = 'initial_adjustment';
		const PAYABLE_ASSAY_INITIAL_ADJUSTMENT_UOM_FIELD_NAME = 'initial_adjustment_uom';
		const PAYABLE_ASSAY_MINIMUM_DEDUCTION_FIELD_NAME = 'minimum_deduction';
		const PAYABLE_ASSAY_MINIMUM_DEDUCTION_UOM_FIELD_NAME = 'minimum_deduction_uom';
		const PAYABLE_ASSAY_MAXIMUM_CAP_FIELD_NAME = 'maximum_cap';
		const PAYABLE_ASSAY_MAXIMUM_CAP_UOM_FIELD_NAME = 'maximum_cap_uom';

		const GENERIC_BRACKET_RELATED_COMMODITY_IN_CONTRACT_FIELD_NAME = 'related_commodity_in_contract';
		const GENERIC_BRACKET_BRACKET_TYPE_FIELD_NAME = 'bracket_type';
		const GENERIC_BRACKET_LOWER_THRESHOLD_FIELD_NAME = 'lower_threshold';
		const GENERIC_BRACKET_LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME = 'lower_threshold_inclusive';
		const GENERIC_BRACKET_UPPER_THRESHOLD_FIELD_NAME = 'upper_threshold';
		const GENERIC_BRACKET_UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME = 'upper_threshold_inclusive';
		const GENERIC_BRACKET_RATE_FIELD_NAME = 'rate';
		const GENERIC_BRACKET_RATE_TYPE_FIELD_NAME = 'rate_type';

		const CHARGE_BRACKET_COLLECTION_NAME = 'navarch_treatment_charge_bracket';
		const CHARGE_BASE_TREATEMENT_CHARGE_FIELD_NAME = 'base_treatment_charge';
		const CHARGE_BASE_CHARGE_ADJUSTMENT_FIELD_NAME = 'base_charge_adjustment';
		const CHARGE_USE_BTC_FIELD_NAME = 'use_btc';
		const CHARGE_ESCALATOR_REFERENCE_FIELD_NAME = 'escalator_reference';
		const CHARGE_FOR_EVERY_UNIT_FIELD_NAME = 'for_every_unit';
		const CHARGE_RELATED_CONTRACTCOMM_TC = 'related_contract_commodity_tc';
		const CHARGE_RELATED_CONTRACTCOMM_RC = 'related_contract_commodity_rc';

		const PENALTY_BRACKET_COLLECTION_NAME = 'navarch_penalty_bracket';
		const PENALTY_NO_PENALTY_FIELD_NAME = 'no_penalty';
		const PENALTY_ESCALATOR_REFERENCE_FIELD_NAME = 'escalator_reference';
		const PENALTY_FOR_EVERY_UNIT_FIELD_NAME = 'for_every_unit';

		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name';
		const COMMODITY_CODE_FIELD_NAME = 'code';

		const CURRENCY_COLLECTION_NAME = 'navarch_currency';
		const CURRENCY_CODE_FIELD_NAME = 'code';

		const UNIT_COLLECTION_NAME = 'navarch_unit';
		const UNIT_SYMBOL_FIELD_NAME = 'symbol';
		const UNIT_DRY_SYMBOL_FIELD_NAME = 'dry_symbol';
		const UNIT_WET_SYMBOL_FIELD_NAME = 'wet_symbol';
		const UNIT_UNIT_FIELD_NAME = 'unit';
		const UNIT_DRY_UNIT_FIELD_NAME = 'dry_unit';
		const UNIT_WET_UNIT_FIELD_NAME = 'wet_unit';
		const UNIT_CONVERSION_TO_GRAM_FIELD_NAME = 'conversionToGram';

		const ASSAY_UNIT_COLLECTION_NAME = 'navarch_assay_unit';
		const ASSAY_UNIT_UNIT_FIELD_NAME = 'unit';
		const ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME = 'conversion_to_ppb';
		const ASSAY_UNIT_COMPOSITION_FIELD_NAME = 'composition';

		const COUNTERPARTY_COLLECTION_NAME = 'navarch_counterparty';
		const COUNTERPARTY_NAME_FIELD_NAME = 'name';
		const COUNTERPARTY_ADDRESS_COLLECTION_NAME = 'navarch_counterparty_navarch_address';
		const COUNTERPARTY_ADDRESS_COUNTERPARTY_FIELD_NAME = 'navarch_counterparty_id';
		const COUNTERPARTY_ADDRESS_ADDRESS_FIELD_NAME = 'navarch_address_id';
		const COUNTERPARTY_BUSINESS_NUMBER_FIELD_NAME = 'business_number';

		const COMPANY_COLLECTION_NAME = 'navarch_company';
		const COMPANY_NAME_FIELD_NAME = 'name';
		const COMPANY_LOGO_FIELD_NAME = 'logo';
		const COMPANY_LINE_1_FIELD_NAME = 'line_1';
		const COMPANY_LINE_2_FIELD_NAME = 'line_2';
		const COMPANY_CITY_FIELD_NAME = 'city';
		const COMPANY_STATE_FIELD_NAME = 'state';
		const COMPANY_COUNTRY_FIELD_NAME = 'country';
		const COMPANY_ZIP_FIELD_NAME = 'zip';
		const COMPANY_PHONE_CODE_FIELD_NAME = 'phone_code';
		const COMPANY_PHONE_NUMBER_FIELD_NAME = 'phone_number';
		const COMPANY_SIGNATORY_NAME_FIELD_NAME = 'signatory_name';
		const COMPANY_SIGNATORY_TITLE_FIELD_NAME = 'signatory_title';
		const COMPANY_REMITTANCE_DETAILS_FIELD_NAME = 'remittance_details';
		const COMPANY_BUSINESS_NUMBER_FIELD_NAME = 'business_number';
		const COMPANY_SIGNATURE_FIELD_NAME = 'signature';

		const COUNTRY_COLLECTION_NAME = 'navarch_country';
		const COUNTRY_NAME_FIELD_NAME = 'name';
		const COUNTRY_PHONE_CODE_FIELD_NAME = 'phone_code';

		const ADDRESS_COLLECTION_NAME = 'navarch_address';
		const ADDRESS_LINE1_FIELD_NAME = 'line_1';
		const ADDRESS_LINE2_FIELD_NAME = 'line_2';
		const ADDRESS_CITY_FIELD_NAME = 'city';
		const ADDRESS_STATE_FIELD_NAME = 'state';
		const ADDRESS_COUNTRY_FIELD_NAME = 'country';
		const ADDRESS_ZIP_FIELD_NAME = 'zip';

		const VESSEL_COLLECTION_NAME = 'navarch_vessel';
		const VESSEL_NAME_FIELD_NAME = 'name';

		const PORT_COLLECTION_NAME = 'navarch_world_port';
		const PORT_NAME_FIELD_NAME = 'port_name';
		const PORT_COUNTRY_FIELD_NAME = 'country';

		const COMM_PRICE_COLLECTION_NAME = 'navarch_commodity_price';
		const COMM_PRICE_PRICE_METHOD_FIELD_NAME = 'price_method';
		const COMM_PRICE_PRICE_AM_FIELD_NAME = 'price_am';
		const COMM_PRICE_PRICE_PM_FIELD_NAME = 'price_pm';
		const COMM_PRICE_AVG_PRICE_FIELD_NAME = 'average_price';
		const COMM_PRICE_DATE_FIELD_NAME = 'date';

		const PRICE_METHOD_COLLECTION_NAME = 'navarch_price_method';
		const PRICE_METHOD_NAME_FIELD_NAME = 'name';

		const INVOICE_COLLECTION_NAME = 'navarch_invoices';
		const INVOICE_PARCEL_FIELD_NAME = 'parcel';
		const INVOICE_ID_FIELD_NAME = 'id';
		const INVOICE_INVOICE_FIELD_NAME = 'invoice'; // the field that stores the path to the invoice pdf (a link to cloud stored pdf in production)
		const INVOICE_DOCUMENT_TYPE_FIELD_NAME = 'document_type';
		const INVOICE_REVISION_INVOICE_FIELD_NAME = 'revision_invoice';
		const INVOICE_INV_TYPE_FIELD_NAME = 'invoice_type';
		const INVOICE_INV_DATE_FIELD_NAME = 'invoice_date';
		const INVOICE_AMOUNT_PAID_FIELD_NAME = 'amount_paid';
		const INVOICE_GST_PAID_LOCAL_CURR_FIELD_NAME = 'gst_paid_in_local_currency';
		const INVOICE_WEIGHT_METHOD_FIELD_NAME = 'weight_method';
		const INVOICE_ASSAY_METHOD_FIELD_NAME = 'assay_method';
		const INVOICE_CONVERSION_TO_USD_FIELD_NAME = 'currency_conversion_to_usd';

		// const INVOICE_GENERATOR_PATH = '/invoice/generate';
		const INVOICE_GENERATOR_PATH = '/generate/invoice';

		const NUMBER_OF_DAYS_TO_FETCH_MORE_OF = 10;

		const HIGHEST_REVISED_DOCUMENT_TYPE = Object.keys(INVOICE_DOCUMENT_TYPE_ORDER)[Object.keys(INVOICE_DOCUMENT_TYPE_ORDER).length - 1];
		const isLastDocType: Ref<boolean> = ref(formValues.value[INVOICE_DOCUMENT_TYPE_FIELD_NAME] == HIGHEST_REVISED_DOCUMENT_TYPE);
		watch(() => formValues.value[INVOICE_DOCUMENT_TYPE_FIELD_NAME], (newDocType) => {
			console.log(`[watch] new document type=${newDocType} equals the last document type=${HIGHEST_REVISED_DOCUMENT_TYPE}?`);
			isLastDocType.value = newDocType == HIGHEST_REVISED_DOCUMENT_TYPE;
		});

		let qpMonthForEachCommodity: string | null = null; // ad hoc variable for each Commodity's Qp Month (formmatted as 'MMM YYYY') for the Summary section (to be updated for each Commodity and saved into the commodity object as it cycles through all of them) if it is still in the future and provisional pricing is used for getting the avg price, TODO: need to clean this up to be better

		async function generateInvoice() {
			failureReason.value = '';

			try {
				isGeneraingDoc.value = true;
				console.log('[generateInvoice] formValues=', formValues);
				if (isNullOrUndefined(formValues.value[INVOICE_DOCUMENT_TYPE_FIELD_NAME])) {
					failureReason.value = 'Document type not selected for invoice document generation';
					isGeneraingDoc.value = false;
					return;
				}
				if (isNullOrUndefined(formValues.value[INVOICE_INV_TYPE_FIELD_NAME])) {
					failureReason.value = 'Invoice type not selected for invoice document generation';
					isGeneraingDoc.value = false;
					return;
				}
				const parcelId = formValues.value[INVOICE_PARCEL_FIELD_NAME];
				if (!parcelId) {
					failureReason.value = 'Parcel not selected for invoice document generation';
					isGeneraingDoc.value = false;
					return;
				}
				const INVOICE_DATE = !!formValues.value[INVOICE_INV_DATE_FIELD_NAME] ? new Date(formValues.value[INVOICE_INV_DATE_FIELD_NAME]) : new Date(); // get current date according to locale if no date is provided
				const INVOICE_TYPE = formValues.value[INVOICE_INV_TYPE_FIELD_NAME]; // there must be a field alongside this button interface named 'invoice_type' and its values must be convertible
				const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}/${parcelId}`, {
					params: {
						fields: [
							PARCEL_ASSAY_RESULTS_FIELD_NAME, 
							PARCEL_WEIGHT_RESULTS_FIELD_NAME, 
							PARCEL_CONTRACT_FIELD_NAME, 
							PARCEL_COUNTERPARTY_FIELD_NAME,
							PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME, 
							// PARCEL_INVOICE_DATE_FIELD_NAME, 
							PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME,
							PARCEL_QP_SELECTION_FIELD_NAME,
							// PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME,
							PARCEL_VESSEL_FIELD_NAME,
							PARCEL_ORIGIN_FIELD_NAME,
							PARCEL_DESTINATION_FIELD_NAME,
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							PARCEL_INVOICE_DUE_DATE_FIELD_NAME,
							PARCEL_ADJUSTMENTS_FIELD_NAME
						]
					}
				});

				console.log(`parcelResponce.data.data=${JSON.stringify(parcelResponce.data.data)}`);
				validateParcelData(parcelResponce.data.data);

				const assayForeignKey = parcelResponce.data.data[PARCEL_ASSAY_RESULTS_FIELD_NAME];
				const weightForeignKey = parcelResponce.data.data[PARCEL_WEIGHT_RESULTS_FIELD_NAME];
				const contractId = parcelResponce.data.data[PARCEL_CONTRACT_FIELD_NAME];
				const qpSelection = parcelResponce.data.data[PARCEL_QP_SELECTION_FIELD_NAME];

				const invoiceTypeResponse = await api.get(`/items/${INVOICE_TYPE_COLLECTION_NAME}?filter[${INVOICE_TYPE_RELATED_CONTRACT_FIELD_NAME}]=${contractId}`, {params: {
					fields: [
						INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME,
						INVOICE_TYPE_PAY_PERCENT_FIELD_NAME,

						INVOICE_TYPE_PAYMENT_ADVICE_DAYS_FIELD_NAME,
						INVOICE_TYPE_PAYMENT_ADVICE_DAY_TYPE_FIELD_NAME,
						INVOICE_TYPE_PAYMENT_ADVICE_REF_DAY_FIELD_NAME,
						// INVOICE_TYPE_PAYMENT_ADVICE_FINAL_INV_REF_DAY_FIELD_NAME,

						INVOICE_TYPE_PROVISIONAL_PRICING_DAYS_FIELD_NAME,
						INVOICE_TYPE_PROVISIONAL_PRICING_DAY_TYPE_FIELD_NAME,
						INVOICE_TYPE_PROVISIONAL_PRICING_REF_DAY_FIELD_NAME
					],
				}});

				if (!!invoiceTypeResponse.data.data && invoiceTypeResponse.data.data.length === 0) {
					failureReason.value = 'No invoice type found for the contract';
					isGeneraingDoc.value = false;
					return;
				}
				const paymentInformation = invoiceTypeResponse.data.data.find(invType => invType[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]===INVOICE_TYPE);
				if (!paymentInformation) {
					failureReason.value = `Cannot find payment information for ${INVOICE_TYPE} in the contract, please ensure that data for it has been entered and saved`;
					isGeneraingDoc.value = false;
					return;
				}

				const weightLotResponse = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${weightForeignKey}&sort[]=${LOT_NUMBER_FIELD_NAME}`, {params: {
					fields: [
						ID_FIELD_NAME, 
						WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME, 
						WEIGHT_LOT_WET_WEIGHT_FIELD_NAME, 
						METHOD_FIELD_NAME, 
						WEIGHT_LOT_MOISTURE_FIELD_NAME, 
						WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME, 
						WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME
					],
				}});
				console.log(`weightLotResponse.data.data=${JSON.stringify(weightLotResponse.data.data)}`);
				validateWeightLots(weightLotResponse.data.data);
				// do some calculations for weight lot response based on method, or filter by method beforehand so just add
				const weights = evaluateWeights(weightLotResponse.data.data as WeightLot[]);

				const WEIGHT_METHOD = formValues.value[INVOICE_WEIGHT_METHOD_FIELD_NAME]; // there must be a field alongside this button interface named 'weight_method' and its values must be convertible
				// if WEIGHT_METHOD is not defined, then find weight by the method field with the values Outturn, Inturn Final, Inturn, Estimated, Planned in this order
				let WEIGHT = weights.find(weight => weight.method === WEIGHT_METHOD);
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Outturn');
				}
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Inturn Final');
				}
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Inturn');
				}
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Estimated');
				}
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Planned');
				}
				if (!WEIGHT) {
					throw new Error(`No weight lot data found for all weight methods. Please ensure weight lot data has been entered in the selected parcel.`);
				}
				if (
					WEIGHT.dry_weight === undefined || WEIGHT.dry_weight === null || 
					WEIGHT.wet_weight === undefined || WEIGHT.wet_weight === null || 
					WEIGHT.moisture === undefined || WEIGHT.moisture === null || 
					WEIGHT.dry_weight_uom === undefined || WEIGHT.dry_weight_uom === null || 
					WEIGHT.wet_weight_uom === undefined || WEIGHT.wet_weight_uom === null || 
					WEIGHT.method === undefined || WEIGHT.method === null) {
					throw new Error(`One of the fields for weight lots is undefined`);
				}

				const dryWeightUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_DRY_SYMBOL_FIELD_NAME}]=${WEIGHT.dry_weight_uom}`, {
					params: { fields: [ UNIT_DRY_UNIT_FIELD_NAME ] }
				});
				const wetWeightUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_WET_SYMBOL_FIELD_NAME}]=${WEIGHT.wet_weight_uom}`, {
					params: { fields: [ UNIT_WET_UNIT_FIELD_NAME ] }
				});

				if (!dryWeightUomResponse.data.data || !dryWeightUomResponse.data.data[0] || !dryWeightUomResponse.data.data[0][UNIT_DRY_UNIT_FIELD_NAME]) {
					throw new Error(`Dry weight uom not found for symbol ${WEIGHT.dry_weight_uom}`);
				}

				if (!wetWeightUomResponse.data.data || !wetWeightUomResponse.data.data[0] || !wetWeightUomResponse.data.data[0][UNIT_WET_UNIT_FIELD_NAME]) {
					throw new Error(`Wet weight uom not found for symbol ${WEIGHT.wet_weight_uom}`);
				}

				const dryWeightUomName = dryWeightUomResponse.data.data[0][UNIT_DRY_UNIT_FIELD_NAME];
				// append 'dry as a prefix if it is not already there'
				const DRY_WEIGHT_UOM_NAME = dryWeightUomName.indexOf('dry') === 0 ? dryWeightUomName : `dry ${dryWeightUomName}`;
				const wetWeightUomName = wetWeightUomResponse.data.data[0][UNIT_WET_UNIT_FIELD_NAME];
				// append 'wet as a prefix if it is not already there'
				const WET_WEIGHT_UOM_NAME = wetWeightUomName.indexOf('wet') === 0 ? wetWeightUomName : `wet ${wetWeightUomName}`;

				const assayLotResponse = await api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${assayForeignKey}&sort[]=${LOT_NUMBER_FIELD_NAME}`, {
					params: {
						fields: [
							ID_FIELD_NAME, 
							ASSAY_LOT_COMMODITY_FIELD_NAME, 
							METHOD_FIELD_NAME, 
							ASSAY_LOT_DRY_WEIGHT_FIELD_NAME,
							ASSAY_LOT_DRY_WEIGHT_UOM_FIELD_NAME,
							ASSAY_LOT_BUYER_ASSAY_FIELD_NAME,
							ASSAY_LOT_SELLER_ASSAY_FIELD_NAME,
							ASSAY_LOT_FINAL_ASSAY_FIELD_NAME, 
							ASSAY_LOT_LOT_NUMBER_FIELD_NAME,
							ASSAY_LOT_ASSAY_UOM_FIELD_NAME
						],
					}
				})
				console.log(`assayLotResponse.data.data=${JSON.stringify(assayLotResponse.data.data)}`);
				validateAssayLots(assayLotResponse.data.data);
				const assays = evaluateAnalyticalAssay(assayLotResponse.data.data as AssayLotsOrCompositeForInvoice[]);
				const ASSAY_METHOD = formValues.value[INVOICE_ASSAY_METHOD_FIELD_NAME]; // there must be a field alongside this button interface named 'assay_method' and its values must be convertible
				let ASSAYS; 
				if (!!ASSAY_METHOD) {
					ASSAYS = assays[ASSAY_METHOD.toString()];
				}
				if (!ASSAYS) {
					ASSAYS = assays['Outturn'];
				}
				if (!ASSAYS) {
					ASSAYS = assays['Inturn Final'];
				}
				if (!ASSAYS) {
					ASSAYS = assays['Inturn'];
				}
				if (!ASSAYS) {
					ASSAYS = assays['Estimated'];
				}
				if (!ASSAYS) {
					ASSAYS = assays['Planned'];
				}
				if (!ASSAYS) {
					throw new Error(`No assay lot data found for all assay methods. Please ensure assay lot data has been entered in the selected parcel.`);
				}

				console.log(`WEIGHT: ${JSON.stringify(WEIGHT)}`);
				console.log(`ASSAYS: ${JSON.stringify(ASSAYS)}`);

				const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${contractId}`, {params: {
					fields: [ 
						CONTRACT_CURRENCY_FIELD_NAME,
						CONTRACT_GST_APPLICABLE_FIELD_NAME,
						CONTRACT_GST_RATE_FIELD_NAME,
						CONTRACT_GST_LOCAL_CURRENCY_FIELD_NAME,
					],
				}});
				validateContractResponse(contractResponse.data.data);

				const currencyResponse = await api.get(`/items/${CURRENCY_COLLECTION_NAME}/${contractResponse.data.data.contract_currency}`, {params: {
					fields: [CURRENCY_CODE_FIELD_NAME],
				}});
				validateCurrencyData(currencyResponse.data.data, 'selected currency for the contract');

				const currencyCode = currencyResponse.data.data.code;

				// validateContractResponse(contractResponse.data.data);
				// do something with contract data

				// Getting commodity specific data based for contract commidities
				const commodityInContractResponse = await api.get(`/items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}?filter[${COMM_IN_CONTRACT_CONTRACT_FIELD_NAME}]=${contractId}`, {params: {
					fields: [
						COMM_IN_CONTRACT_ID_FIELD_NAME,
						COMM_IN_CONTRACT_COMMODITY_FIELD_NAME, 
						COMM_IN_PRIMARY_COMMODITY_FIELD_NAME, 
						COMM_IN_CONTRACT_PAYABLE_COMMODITY_FIELD_NAME,
						COMM_IN_CONTRACT_PRICE_METHOD_FIELD_NAME, 
						COMM_IN_CONTRACT_PRICE_FIX_TO_USE_FIELD_NAME,
						COMM_IN_CONTRACT_QUOTATIONAL_PERIODS_FIELD_NAME, 
						COMM_IN_CONTRACT_PAYABLE_ASSAY_RATES_FIELD_NAME, 
						COMM_IN_CONTRACT_PENALTY_RATES_FIELD_NAME, 
						COMM_IN_CONTRACT_PENALTY_PER_UOM_FIELD_NAME,
						COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME,
						// COMM_IN_CONTRACT_PAYABLE_METAL_UOM_FIELD_NAME,
						COMM_IN_CONTRACT_TREATMENT_CHARGE_PER_UOM_FIELD_NAME,
						COMM_IN_CONTRACT_REFINING_CHARGE_PER_UOM_FIELD_NAME,
					],
				}});
				// do something with commodity in contract data
				validateCommoditiesInContract(commodityInContractResponse.data.data);
				console.log(`	commodityInContractResponse: ${JSON.stringify(commodityInContractResponse.data.data)}`);
				// console.log(`	commodityInContractResponse payable assay rates1: ${JSON.stringify(commodityInContractResponse.data.data[0].payable_assay_rates)}`);
				// console.log(`	commodityInContractResponse payable assay rates2: ${commodityInContractResponse.data.data[0].payable_assay_rates}`);
				
				const COMMODITIES: any[] = [];
				const PENALTIES: any[] = [];
				let PRIMARY_COMMODITY: string = '';
				let LATEST_QP_MONTH_END_DATES: Date[] = []; // for due date evaluation of the Final invoice
				for (const {
					id: commInContractId,
					commodity, 
					primary_commodity,
					payable_commodity,
					price_method, 
					price_fix_to_use,
					quotational_periods,
					// payable_assay_rates,
					// payable_metal_uom,
					price_per_uom,
					// penalty_rates,
					penalty_per_uom,
					// treatment_charge_rates,
					treatment_charge_per_uom,
					refining_charge_rate_uom,
				} of commodityInContractResponse.data.data) {
					const commodityResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}/${commodity}`, {params: {
						fields: [COMMODITY_NAME_FIELD_NAME, COMMODITY_CODE_FIELD_NAME],
					}}); // response.data.data is an object response

					validateCommodityData(commodityResponse.data.data, commodity);

					if (!ASSAYS[commodityResponse.data.data.code]) {
						console.log(`[generateInvoice] no analytical assay for commodity ${commodityResponse.data.data.code} found, skipping...`);
						continue;
					}

					if (primary_commodity) {
						PRIMARY_COMMODITY = commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME];
					}

					/**
					 * START: Payable amount and TC by commodity
					 */
					// should probably also check other stuffs like Payable Assay Rates exist for this commodity and other stuffs
					if (quotational_periods !== null) {
						const quotationalPeriods: QuotationalPeriod[] = quotational_periods;
						console.log(`	quotationalPeriods: ${JSON.stringify(quotationalPeriods)}`);
						// validateQuotationalPeriods(quotationalPeriods); // check that there is only one default and no fields are missing
						const defaultQuotationalPeriod = Array.isArray(quotationalPeriods) ? quotationalPeriods.find(quotationalPeriod => quotationalPeriod.default) : null; // declared as a const outside of the if block because it's needed later on too
						if (!defaultQuotationalPeriod) {
							throw new Error(`No default quotational period found for commodity ${commodityResponse.data.data.code}`);
						}
						
						let qpDeclaredForThisCommodity = false;
						let quotationalPeriodString;
						const commodityQpSelection = !!qpSelection ? (qpSelection[commodityResponse.data.data[COMMODITY_CODE_FIELD_NAME]] as QpCommodity | undefined) : undefined;
						if (commodityQpSelection === undefined || !commodityQpSelection?.declared) {
							// If no QP Selection is made for this commodity code in the Parcel form
							// pop it quotationalPeriod with default true from the array

							const nonDefaultQuotationPeriodsString = quotationalPeriods
								.filter(quotationalPeriod => !quotationalPeriod.default)
								.map(quotationalPeriod => `${quotationalPeriod.qp_period} ${quotationalPeriod.qp_code}`);

							quotationalPeriodString = [`${defaultQuotationalPeriod.qp_period} ${defaultQuotationalPeriod.qp_code}`, ...nonDefaultQuotationPeriodsString].join(', ');
						} else {
							// If a QP Selection is made for this commodity code in the Parcel form
							qpDeclaredForThisCommodity = commodityQpSelection.declared;
							quotationalPeriodString = commodityQpSelection.qp_selected;
						}

						console.log(`[generateInvoice] evaluate payable assay for ${commodityResponse.data.data.code} with an analytical assay=${ASSAYS[commodityResponse.data.data.code]?.analytical_assay}`)
						const payableAssayRates = await api.get(`/items/${PAYABLE_ASSAY_BRACKET_COLLECTION_NAME}?filter[${GENERIC_BRACKET_RELATED_COMMODITY_IN_CONTRACT_FIELD_NAME}]=${commInContractId}`, {params: {
							fields: [
								GENERIC_BRACKET_BRACKET_TYPE_FIELD_NAME,
								GENERIC_BRACKET_LOWER_THRESHOLD_FIELD_NAME,
								GENERIC_BRACKET_LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME,
								GENERIC_BRACKET_UPPER_THRESHOLD_FIELD_NAME,
								GENERIC_BRACKET_UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME,
								GENERIC_BRACKET_RATE_FIELD_NAME,
								GENERIC_BRACKET_RATE_TYPE_FIELD_NAME,
								PAYABLE_ASSAY_INITIAL_ADJUSTMENT_FIELD_NAME,
								PAYABLE_ASSAY_INITIAL_ADJUSTMENT_UOM_FIELD_NAME,
								PAYABLE_ASSAY_MINIMUM_DEDUCTION_FIELD_NAME,
								PAYABLE_ASSAY_MINIMUM_DEDUCTION_UOM_FIELD_NAME,
								PAYABLE_ASSAY_MAXIMUM_CAP_FIELD_NAME,
								PAYABLE_ASSAY_MAXIMUM_CAP_UOM_FIELD_NAME,
							],
						}});
						const {
							payableAssay,
							expression: payableAssayExpression,
						} = await evaluatePayableAssay(
							ASSAYS[commodityResponse.data.data.code]?.analytical_assay,
							ASSAYS[commodityResponse.data.data.code]?.assay_uom,
							payableAssayRates.data.data as PayableAssayBracket[],
							commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]
						);

						// to upper case a string and replace space with underscore
						let provisionalPricingStartDate: Date | null = null;
						let provisionalPricingEndDate: Date | null = null;
						let numberOfBusinessDaysForProvisionalPricing: number | null = null;
						if (INVOICE_TYPE !== 'Final') {
							// get the reference date based on the selected QP code, and get the month based on the QP number; get the start and end date of the month fetched
							// if the selected QP does not have price data for it yet, then use provisional pricing data from the Contract
							const pricingDates = await setPricingDates(
								commodityResponse.data.data.code as string,
								parcelResponce.data.data,
								INVOICE_DATE,
								price_method, 
								async () => setPricingDatesWithProvisionalPricing(
									paymentInformation,
									parcelResponce.data.data,
									INVOICE_DATE,
									INVOICE_TYPE
								)
							)
							if (pricingDates === null) {
								throw new Error(`[generateInvoice] Provisional pricing dates not found for commodity ${commodityResponse.data.data.code}`);
							}
							if (
								pricingDates.provisionalPricingStartDate === null 
								|| !(pricingDates.provisionalPricingStartDate instanceof Date)
							) {
								throw new Error(`[generateInvoice] Invalid provisional pricing start date for commodity ${commodityResponse.data.data.code} of invoice type ${INVOICE_TYPE}`);
							}
							provisionalPricingStartDate = pricingDates.provisionalPricingStartDate;

							if (
								pricingDates.provisionalPricingEndDate === null 
								|| !(pricingDates.provisionalPricingEndDate instanceof Date)
							) {
								throw new Error(`[generateInvoice] Invalid provisional pricing end date for commodity ${commodityResponse.data.data.code} of invoice type ${INVOICE_TYPE}`);
							}
							provisionalPricingEndDate = pricingDates.provisionalPricingEndDate;
							numberOfBusinessDaysForProvisionalPricing = pricingDates.expectedNoOfBusinessDays;
						} else {
							// get the reference date based on the selected QP code, and get the month based on the QP number; get the start and end date of the month fetched
							// if the selected QP does not have price data for it yet, then use default QP data from the Contract for the given commodity
							const pricingDates = await setPricingDates(
								commodityResponse.data.data.code as string,
								parcelResponce.data.data,
								INVOICE_DATE,
								price_method, 
								async () => setPricingDatesWithDefaultQp(
									defaultQuotationalPeriod,
									parcelResponce.data.data,
									INVOICE_DATE
								),
								true
							)
							if (pricingDates === null) {
								throw new Error(`[generateInvoice] Provisional pricing dates not found for commodity ${commodityResponse.data.data.code}`);
							}
							if (
								pricingDates.provisionalPricingStartDate === null 
								|| !(pricingDates.provisionalPricingStartDate instanceof Date)
							) {
								throw new Error(`[generateInvoice] Invalid provisional pricing start date for commodity ${commodityResponse.data.data.code} of invoice type ${INVOICE_TYPE}`);
							}
							provisionalPricingStartDate = pricingDates.provisionalPricingStartDate;

							if (
								pricingDates.provisionalPricingEndDate === null 
								|| !(pricingDates.provisionalPricingEndDate instanceof Date)
							) {
								throw new Error(`[generateInvoice] Invalid provisional pricing end date for commodity ${commodityResponse.data.data.code} of invoice type ${INVOICE_TYPE}`);
							}
							provisionalPricingEndDate = pricingDates.provisionalPricingEndDate;
							LATEST_QP_MONTH_END_DATES.push(provisionalPricingEndDate); // for evaluating the due date of the Final invoice later on, need to get the last day of the latest QP Month of all commodities
							console.log(`[generateInvoice] Provisional pricing start date=${provisionalPricingStartDate.toString()} and end date=${provisionalPricingEndDate.toString()}`);
						}
						console.log(`[generateInvoice] provisional pricing date range: ${provisionalPricingStartDate.toString()} - ${provisionalPricingEndDate.toString()}`);

						const averagePriceWithinPeriod = await getCommodityAvgPrice(
							commodityResponse.data.data.code, 
							price_method, 
							provisionalPricingStartDate, 
							provisionalPricingEndDate,
							numberOfBusinessDaysForProvisionalPricing,
							price_fix_to_use
						);

						const priceRate = averagePriceWithinPeriod.averagePrice;
						provisionalPricingStartDate = averagePriceWithinPeriod.startDate;
						provisionalPricingEndDate = averagePriceWithinPeriod.endDate;

						console.log(`[generateInvoice] average price within period: ${priceRate} with start date=${provisionalPricingStartDate} and end date=${provisionalPricingEndDate}`);

						/**
						 * START: Treatment Charge Calculation
						 */
						let treatmentCharge: any = undefined;
						const treatmentChargeRates = await api.get(`/items/${CHARGE_BRACKET_COLLECTION_NAME}?filter[${CHARGE_RELATED_CONTRACTCOMM_TC}]=${commInContractId}`, {params: {
							fields: [
								GENERIC_BRACKET_LOWER_THRESHOLD_FIELD_NAME,
								GENERIC_BRACKET_LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME,
								GENERIC_BRACKET_UPPER_THRESHOLD_FIELD_NAME,
								GENERIC_BRACKET_UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME,
								CHARGE_BASE_TREATEMENT_CHARGE_FIELD_NAME,
								CHARGE_BASE_CHARGE_ADJUSTMENT_FIELD_NAME,
								CHARGE_USE_BTC_FIELD_NAME,
								CHARGE_ESCALATOR_REFERENCE_FIELD_NAME,
								CHARGE_FOR_EVERY_UNIT_FIELD_NAME,
								GENERIC_BRACKET_RATE_FIELD_NAME,
							],
						}});
						if (treatmentChargeRates.data.data !== undefined && treatmentChargeRates.data.data !== null && treatmentChargeRates.data.data.length > 0) {
							treatmentCharge = await evaluateCharge(
								priceRate, 
								ASSAYS[commodityResponse.data.data.code]?.assay_uom,
								treatmentChargeRates.data.data as ChargeBracket[],
								commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME],
								'treatment charge'
							);
						}

						let treatmentChargePerUom: string | undefined = undefined;
						if (!!treatmentCharge) {
							if (!treatment_charge_per_uom) {
								throw new Error(`Treatment Charge Rate UOM is not defined for commodity ${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}`);
							}
							const treatmentChargePerUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}/${treatment_charge_per_uom}`, {params: {
								fields: [UNIT_SYMBOL_FIELD_NAME],
							}});
							validateChargePerUom(treatmentChargePerUomResponse.data.data, commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]);
							treatmentChargePerUom = treatmentChargePerUomResponse.data.data[UNIT_SYMBOL_FIELD_NAME];
						}
						/**
						 * END: Treatment Charge Calculation
						 */

						/**
						 * START: Refining Charge Calculation
						 */
						let refiningCharge: any = undefined;
						const refiningChargeRates = await api.get(`/items/${CHARGE_BRACKET_COLLECTION_NAME}?filter[${CHARGE_RELATED_CONTRACTCOMM_RC}]=${commInContractId}`, {params: {
							fields: [
								GENERIC_BRACKET_LOWER_THRESHOLD_FIELD_NAME,
								GENERIC_BRACKET_LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME,
								GENERIC_BRACKET_UPPER_THRESHOLD_FIELD_NAME,
								GENERIC_BRACKET_UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME,
								CHARGE_BASE_TREATEMENT_CHARGE_FIELD_NAME,
								CHARGE_BASE_CHARGE_ADJUSTMENT_FIELD_NAME,
								CHARGE_USE_BTC_FIELD_NAME,
								CHARGE_ESCALATOR_REFERENCE_FIELD_NAME,
								CHARGE_FOR_EVERY_UNIT_FIELD_NAME,
								GENERIC_BRACKET_RATE_FIELD_NAME,
							],
						}});
						if (refiningChargeRates.data.data !== undefined && refiningChargeRates.data.data !== null && refiningChargeRates.data.data.length > 0) {
							refiningCharge = await evaluateCharge(
								priceRate, 
								ASSAYS[commodityResponse.data.data.code]?.assay_uom,
								refiningChargeRates.data.data as ChargeBracket[],
								commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME],
								'refining charge'
							);
						}

						let refiningChargePerUom: string | undefined = undefined;
						if (!!refiningCharge) {
							if (!refining_charge_rate_uom) {
								throw new Error(`Refining Charge Rate UOM is not defined for commodity ${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}`);
							}
							const refiningChargePerUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}/${refining_charge_rate_uom}`, {params: {
								fields: [UNIT_SYMBOL_FIELD_NAME],
							}});
							validateChargePerUom(refiningChargePerUomResponse.data.data, commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]);
							refiningChargePerUom = refiningChargePerUomResponse.data.data[UNIT_SYMBOL_FIELD_NAME];
						}
						/**
						 * END: Refining Charge Calculation
						 */

						// price_per_uom should be validated to be defined for all commodities in the contract by validateCommoditiesInContract()
						const pricePerUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}/${price_per_uom}`, {params: {
							fields: [UNIT_SYMBOL_FIELD_NAME],
						}});
						validatePricePerUom(pricePerUomResponse.data.data, commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]);
						const pricePerUom = pricePerUomResponse.data.data[UNIT_SYMBOL_FIELD_NAME];

						const payableMetalConversion = await getConversionValuesAndUnitsForPayableMetalCalculation(pricePerUom, WEIGHT.dry_weight_uom, ASSAYS[commodityResponse.data.data.code]?.assay_uom);
						console.log(`[generateInvoice] payableMetalConversion for commodity ${commodityResponse.data.data.name}: ${JSON.stringify(payableMetalConversion)}`);
						// if the conversion factor is 1, then we don't need to show it
						payableMetalConversion.initialConversion = payableMetalConversion.initialConversion?.conversionFactor === 1 ? undefined : payableMetalConversion.initialConversion;
						payableMetalConversion.finalConversion = payableMetalConversion.finalConversion?.conversionFactor === 1 ? undefined : payableMetalConversion.finalConversion;

						const priceMethodResponse = await api.get(`/items/${PRICE_METHOD_COLLECTION_NAME}/${price_method}`, {params: {
							fields: [PRICE_METHOD_NAME_FIELD_NAME],
						}});

						validatePriceMethod(priceMethodResponse.data.data, price_method, commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]);

						const payableMetalInitialConversionFactor =  !!payableMetalConversion.initialConversion?.isConvertByMultiplication ? (payableMetalConversion.initialConversion?.conversionFactor ?? 1) : 1 / (payableMetalConversion.initialConversion?.conversionFactor ?? 1);
						const payableMetalFinalConversionFactor =  !!payableMetalConversion.finalConversion?.isConvertByMultiplication ? (payableMetalConversion.finalConversion?.conversionFactor ?? 1) : 1 / (payableMetalConversion.finalConversion?.conversionFactor ?? 1);
						const PAYABLE_METAL = roundNumber(WEIGHT.dry_weight * payableMetalInitialConversionFactor * (payableAssay ?? 1) * payableMetalFinalConversionFactor * (ASSAYS[commodityResponse.data.data.code]?.assay_uom !== '%' ? 1 : 0.01), 4) ?? 1;
						console.log(`[generateInvoice] PAYABLE_METAL for commodity ${commodityResponse.data.data.name}: ${PAYABLE_METAL}`);

						const PRICE = PAYABLE_METAL * priceRate;

						COMMODITIES.push({
							commodity: commodityResponse.data.data.name,

							analytical_assay: roundNumber(ASSAYS[commodityResponse.data.data.code]?.analytical_assay, 4),
							deduction_expression: payableAssayExpression, // construct this in evaluateFinalValueByRate and change its return type to an object that returns both this and the final value
							payable_assay: roundNumber(payableAssay, 4),
							assay_uom: ASSAYS[commodityResponse.data.data.code]?.assay_uom,

							payable_metal: PAYABLE_METAL, // dry weight * conversion (optional) * payable assay * conversion (optional) // TODO: REFACTOR, USED IN 'price'
							payable_metal_expression: `${formatNumber(WEIGHT.dry_weight, 4)}${WEIGHT.dry_weight_uom}${!!payableMetalConversion.initialConversion ? ` ${payableMetalConversion.initialConversion.isConvertByMultiplication ? '*' : '/'} ${formatNumber(payableMetalConversion.initialConversion.conversionFactor, 4)}${payableMetalConversion.initialConversion.conversionUom}` : ''} * ${formatNumber(payableAssay ?? 1, 4)}${ASSAYS[commodityResponse.data.data.code]?.assay_uom !== '%' ? `${ASSAYS[commodityResponse.data.data.code]?.assay_uom}` : ' / 100'}${!!payableMetalConversion.finalConversion ? ` ${payableMetalConversion.finalConversion.isConvertByMultiplication ? '*' : '/'} ${formatNumber(payableMetalConversion.finalConversion.conversionFactor, 4)}${payableMetalConversion.finalConversion.conversionUom}` : ''}`, // dry weight * conversion (optional) * payable assay * conversion (optional)
							// payable_metal_uom: payableMetalUom,
							payable_metal_uom: pricePerUom, // using price per uom as the payable metal uom since it would need to be this when we calculate the payable amount
							qp: quotationalPeriodString,
							qp_declared: qpDeclaredForThisCommodity,

							// Will show either qp_month or "qp_start_date - qp_end_date" in the summary section for the commodity
							qp_month: qpMonthForEachCommodity,
							qp_start_date: formatDate(provisionalPricingStartDate),
							qp_end_date: formatDate(provisionalPricingEndDate),

							price_method: priceMethodResponse.data.data[PRICE_METHOD_NAME_FIELD_NAME], // use free data for testing, will get subscription later on once commercialised
							// https://www.lbma.org.uk/prices-and-data/precious-metal-prices#/table
							// https://www.westmetall.com/en/markdaten.php?action=averages&field=LME_Zn_cash
							// https://metalpriceapi.com/
							price_rate: roundNumber(priceRate, 4), // how to calculate this again?
							price_per_uom: pricePerUom,
							price: roundNumber(PRICE), // dry weight * price rate // TODO: refactor, used in 'final_total'
							treatment_charge: !!treatmentCharge ? {
								rate: roundNumber(treatmentCharge.baseTreatmentCharge, 4),
								// with treatment charge, the 'final_adjusment' in the rate is treated as the base value to add/subtract from
								discount: roundNumber((treatmentCharge.baseTreatmentCharge ?? 0) - (treatmentCharge.finalValue ?? 0), 4),
								final_rate: roundNumber(treatmentCharge.finalValue, 4),
								per_uom: treatmentChargePerUom, // TODO: currently doesn't handle unit conversion, assumed to be the same as the dry weight unit
								final_amount: roundNumber(WEIGHT.dry_weight * (treatmentCharge.finalValue ?? 1) * -1, 2, true), // use payable metal weight for calculating the final charge cost
							} : undefined,
							refining_charge: !!refiningCharge ? {
								rate: roundNumber(refiningCharge.baseTreatmentCharge, 4),
								// with refining charge, the 'final_adjusment' in the rate is treated as the base value to add/subtract from
								discount: roundNumber((refiningCharge.baseTreatmentCharge ?? 0) - (refiningCharge.finalValue ?? 0), 4),
								final_rate: roundNumber(refiningCharge.finalValue, 4),
								per_uom: refiningChargePerUom, // TODO: currently doesn't handle unit conversion, assumed to be the same as the payable metal weight unit
								final_amount: roundNumber(PAYABLE_METAL * (refiningCharge.finalValue ?? 1) * -1, 2, true), // use payable metal weight for calculating the final charge cost
							} : undefined,

							final_total: roundNumber(PRICE - (!!treatmentCharge ? 1 : 0) * (roundNumber(WEIGHT.dry_weight * (treatmentCharge?.finalValue ?? 1), 2) ?? 1) - (!!refiningCharge ? 1 : 0) * (roundNumber(WEIGHT.dry_weight * (refiningCharge?.finalValue ?? 1), 2) ?? 1))
							
						});
					// do something with commodity data
					} else if (!!primary_commodity) {
						throw new Error(`No QP set in the contract for the primary commodity ${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}`);
					} else if (!!payable_commodity) {
						throw new Error(`No QP set in the contract for the payable commodity ${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}`);
					}
					/**
					 * END: Payable amount and TC by commodity
					 */

					/**
					 * START: Penalty rates by commodity
					 */
					const penaltyRates = await api.get(`/items/${PENALTY_BRACKET_COLLECTION_NAME}?filter[${GENERIC_BRACKET_RELATED_COMMODITY_IN_CONTRACT_FIELD_NAME}]=${commInContractId}`, {params: {
						fields: [
							GENERIC_BRACKET_LOWER_THRESHOLD_FIELD_NAME,
							GENERIC_BRACKET_LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME,
							GENERIC_BRACKET_UPPER_THRESHOLD_FIELD_NAME,
							GENERIC_BRACKET_UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME,
							PENALTY_NO_PENALTY_FIELD_NAME,
							PENALTY_ESCALATOR_REFERENCE_FIELD_NAME,
							PENALTY_FOR_EVERY_UNIT_FIELD_NAME,
							GENERIC_BRACKET_RATE_FIELD_NAME,
						],
					}});
					if (penaltyRates.data.data.length > 0) {
						if (penalty_per_uom === null) {
							throw new Error(`Please fill in the field for Penalty Per UOM in the contract for commodity ${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}`);
						}

						const penaltyPerUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}/${penalty_per_uom}`, {params: {
							fields: [UNIT_SYMBOL_FIELD_NAME],
						}});
						validatePenaltyPerUom(penaltyPerUomResponse.data.data, commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]);
						const penaltyPerUom = penaltyPerUomResponse.data.data[UNIT_SYMBOL_FIELD_NAME];

						const {
							penalty: finalPenaltyRate,
							expression: penaltyExpression,
							bracket: penaltyBracket,
						} = await evaluatePenalty(
							ASSAYS[commodityResponse.data.data.code]?.analytical_assay,
							penaltyRates.data.data as PenaltyBracket[],
							currencyCode,
							penaltyPerUom,
							commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]
						)
						
						console.log(`[generateInvoice] evaluate penalty for ${commodityResponse.data.data.code} with an analytical assay=${ASSAYS[commodityResponse.data.data.code]?.analytical_assay}, penaltyRate=${penaltyBracket?.rate}, finalPenaltyRate=${finalPenaltyRate}, expression='${penaltyExpression}'`);
						PENALTIES.push({
							commodity: commodityResponse.data.data.name,
							analytical_assay: roundNumber(ASSAYS[commodityResponse.data.data.code]?.analytical_assay, 4),
							// deductible_amount: formatNumber(finalPenaltyRate ? (ASSAYS[commodityResponse.data.data.code]?.analytical_assay - finalPenaltyRate) : 0, 4),
							deduction_expression: penaltyExpression,
							assay_uom: ASSAYS[commodityResponse.data.data.code]?.assay_uom,

							penalty_rate: roundNumber(penaltyBracket?.rate, 4),
							penalty_per_uom: penaltyPerUom,
							final_penalty_rate: roundNumber(finalPenaltyRate, 4),
							final_penalty: roundNumber((finalPenaltyRate ?? 1) * WEIGHT.dry_weight * -1, 2, true),
						});
					}
					/**
					 * END: Penalty rates by commodity
					 */
				}
				console.log(`[generateInvoice] COMMODITIES: ${JSON.stringify(COMMODITIES)}`);
				console.log(`[generateInvoice] PENALTIES: ${JSON.stringify(PENALTIES)}`);

				const TOTAL_REVENUE = COMMODITIES.reduce((acc, commodity) => acc + (commodity?.price ?? 0), 0);
				// negative number because final_amount should be negative and rounded to 4 decimal places as if it was a positive number
				const TOTAL_TREATMENT_CHARGE = COMMODITIES.reduce((acc, commodity) => acc + (commodity.treatment_charge?.final_amount ?? 0), 0);
				// negative number because final_amount should be negative and rounded to 4 decimal places as if it was a positive number
				const TOTAL_REFINING_CHARGE = COMMODITIES.reduce((acc, commodity) => acc + (commodity.refining_charge?.final_amount ?? 0), 0);
				const TOTAL_PENALTIES = PENALTIES.reduce((acc, curr) => acc + (curr?.final_penalty ?? 0), 0);
				console.log(`[generateInvoice] TOTAL_REVENUE=${TOTAL_REVENUE}, TOTAL_TREATMENT_CHARGE=${TOTAL_TREATMENT_CHARGE}, TOTAL_REFINING_CHARGE=${TOTAL_REFINING_CHARGE}, TOTAL_PENALTIES=${TOTAL_PENALTIES}`);

				let TOTAL_ADJUSTMENTS: number = 0;
				let ADJUSTMENTS: any
				const ADJUSTMENTS_EXIST: boolean = !!parcelResponce.data.data[PARCEL_ADJUSTMENTS_FIELD_NAME]
				if (ADJUSTMENTS_EXIST) {
					TOTAL_ADJUSTMENTS = parcelResponce.data.data[PARCEL_ADJUSTMENTS_FIELD_NAME].reduce((acc, adjustment) => acc + adjustment.amount, 0);
					ADJUSTMENTS = {
						adjustments: parcelResponce.data.data[PARCEL_ADJUSTMENTS_FIELD_NAME]
							.map((adjustment) => {
								return {
									"description": adjustment.description,
									"amount": roundNumber(adjustment.amount)
								}
							}),

						total_adjustments: roundNumber(TOTAL_ADJUSTMENTS)
					};
				}

				const PAYABLE_PERCENTAGE: number | undefined = paymentInformation[INVOICE_TYPE_PAY_PERCENT_FIELD_NAME];
				const INVOICE_VALUE: number = TOTAL_REVENUE + TOTAL_TREATMENT_CHARGE + TOTAL_REFINING_CHARGE + TOTAL_PENALTIES + TOTAL_ADJUSTMENTS;

				const PAYABLE_AMOUNT: number | undefined = PAYABLE_PERCENTAGE != undefined ? INVOICE_VALUE * PAYABLE_PERCENTAGE/100 : undefined;

				/**
				 * START: Buyer company name
				 */
				const counterpartyResponse = await api.get(`/items/${COUNTERPARTY_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_COUNTERPARTY_FIELD_NAME]}`, {params: {
					fields: [
						COUNTERPARTY_NAME_FIELD_NAME,
						COUNTERPARTY_BUSINESS_NUMBER_FIELD_NAME,
					],
				}});
				validateCounterparty(counterpartyResponse.data.data);
				const counterpartyAddressResponse = await api.get(`/items/${COUNTERPARTY_ADDRESS_COLLECTION_NAME}?filter[${COUNTERPARTY_ADDRESS_COUNTERPARTY_FIELD_NAME}]=${parcelResponce.data.data[PARCEL_COUNTERPARTY_FIELD_NAME]}`, {params: {
					fields: [COUNTERPARTY_ADDRESS_ADDRESS_FIELD_NAME],
				}});
				validateCounterpartyAddress(counterpartyAddressResponse.data.data);
				// confirmed to be defined in validateCounterpartyAddress()
				const buyerAddressId = counterpartyAddressResponse.data.data[0][COUNTERPARTY_ADDRESS_ADDRESS_FIELD_NAME]
				const buyerAddressResponse = await api.get(`/items/${ADDRESS_COLLECTION_NAME}/${buyerAddressId}`, {params: {
					fields: [
						ADDRESS_LINE1_FIELD_NAME,
						ADDRESS_LINE2_FIELD_NAME,
						ADDRESS_CITY_FIELD_NAME,
						ADDRESS_STATE_FIELD_NAME,
						ADDRESS_COUNTRY_FIELD_NAME,
						ADDRESS_ZIP_FIELD_NAME
					],
				}});
				validateBuyerAddress(buyerAddressResponse.data.data);

				const buyerAddressLine1 = buyerAddressResponse.data.data[ADDRESS_LINE1_FIELD_NAME];
				const buyerAddressLine2 = !!buyerAddressResponse.data.data[ADDRESS_LINE2_FIELD_NAME] ? `,\n${buyerAddressResponse.data.data[ADDRESS_LINE2_FIELD_NAME]}` : '';
				const buyerAddressCity = !!buyerAddressResponse.data.data[ADDRESS_CITY_FIELD_NAME] ? `,\n${buyerAddressResponse.data.data[ADDRESS_CITY_FIELD_NAME]}` : '';
				const buyerAddressState = !!buyerAddressResponse.data.data[ADDRESS_STATE_FIELD_NAME] ? `,\n${buyerAddressResponse.data.data[ADDRESS_STATE_FIELD_NAME]}` : '';

				// buyer address country field confirmed to exist in buyerAddressResponse by validateBuyerAddress() if it reaches this point
				const buyerAddressCountryResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${buyerAddressResponse.data.data[ADDRESS_COUNTRY_FIELD_NAME]}`, {params: {
					fields: [COUNTRY_NAME_FIELD_NAME],
				}});
				validateBuyerCountry(buyerAddressCountryResponse.data.data);

				const buyerAddressCountry = !!buyerAddressCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME] ? `, ${buyerAddressCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME]}` : '';
				const buyerAddressZip = !!buyerAddressResponse.data.data[ADDRESS_ZIP_FIELD_NAME] ? ` ${buyerAddressResponse.data.data[ADDRESS_ZIP_FIELD_NAME]}` : '';
				const BUYER_ADDRESS = `${buyerAddressLine1}${buyerAddressLine2}${buyerAddressCity}${buyerAddressZip}${buyerAddressState}${buyerAddressCountry}`;
				/**
				 * END: Buyer company name
				 */

				/**
				 * START: Vessel name
				 */
				const vesselId = parcelResponce.data.data[PARCEL_VESSEL_FIELD_NAME];
				let vesselResponse;
				if (!!vesselId) {
					vesselResponse = await api.get(`/items/${VESSEL_COLLECTION_NAME}/${vesselId}`, {params: {
						fields: [VESSEL_NAME_FIELD_NAME],
					}});
					validateVessel(vesselResponse.data.data);
				}
				/**
				 * END: Vessel name
				 */

				/**
				 * START: Seller company data
				 */
				const companyDataResponse = await api.get(`/items/${COMPANY_COLLECTION_NAME}`, { params: {
					fields: [
						COMPANY_NAME_FIELD_NAME,
						COMPANY_LOGO_FIELD_NAME,
						COMPANY_LINE_1_FIELD_NAME,
						COMPANY_LINE_2_FIELD_NAME,
						COMPANY_CITY_FIELD_NAME,
						COMPANY_STATE_FIELD_NAME,
						COMPANY_ZIP_FIELD_NAME,
						COMPANY_COUNTRY_FIELD_NAME,
						COMPANY_PHONE_CODE_FIELD_NAME,
						COMPANY_PHONE_NUMBER_FIELD_NAME,
						// COMPANY_EMAIL_FIELD_NAME,
						COMPANY_SIGNATORY_NAME_FIELD_NAME,
						COMPANY_SIGNATORY_TITLE_FIELD_NAME,
						COMPANY_REMITTANCE_DETAILS_FIELD_NAME,
						COMPANY_SIGNATURE_FIELD_NAME,
						COMPANY_BUSINESS_NUMBER_FIELD_NAME,
					]
				}});

				const companyData = companyDataResponse.data.data;
				let companyLogoData: ImageData | null = null;
				if (!!companyData[COMPANY_LOGO_FIELD_NAME]) {
					const companyLogoId = companyData[COMPANY_LOGO_FIELD_NAME];
					const companyLogoFile = await api.get(`/assets/${companyLogoId}`, { responseType: 'arraybuffer' });
					// Convert the response data to a Buffer
					const imageBuffer = Buffer.from(companyLogoFile.data, 'binary');
					// Determine the image type
					const imageType = companyLogoFile.headers['content-type'] as ImageType;
					if (Object.values(ImageType).includes(imageType)) {
						companyLogoData = {
							// Convert the buffer to a base64 string
							imageData: imageBuffer.toString('base64'),
							imageType
						};
					}
				}

				const signatureId = companyData[COMPANY_SIGNATURE_FIELD_NAME];
				let signatureImageData: ImageData | null = null;
				if (!!signatureId) {
					const signatureFile = await api.get(`/assets/${signatureId}`, { responseType: 'arraybuffer' });
					// Convert the response data to a Buffer
					const imageBuffer = Buffer.from(signatureFile.data, 'binary');
					// Determine the image type
					const imageType = signatureFile.headers['content-type'] as ImageType;
					if (Object.values(ImageType).includes(imageType)) {
						signatureImageData = {
							// Convert the buffer to a base64 string
							imageData: imageBuffer.toString('base64'),
							imageType
						};
					}
				}
				validateCompanyData(companyData);
				const companyName = companyData[COMPANY_NAME_FIELD_NAME];
				// const companyEmail = companyData[COMPANY_EMAIL_FIELD_NAME];
				let companyPhoneCode;
				let companyPhoneNumber;
				if (!!companyData[COMPANY_PHONE_CODE_FIELD_NAME]) {
					const companyPhoneCodeResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${companyData[COMPANY_PHONE_CODE_FIELD_NAME]}`, {params: {
						fields: [COUNTRY_PHONE_CODE_FIELD_NAME],
					}});
					validateCompanyPhoneCode(companyPhoneCodeResponse.data.data);
					companyPhoneCode = companyPhoneCodeResponse.data.data[COUNTRY_PHONE_CODE_FIELD_NAME];
					companyPhoneNumber = companyData[COMPANY_PHONE_NUMBER_FIELD_NAME];
				}

				const companyAddressLine1 = companyData[COMPANY_LINE_1_FIELD_NAME];
				const companyAddressLine2 = !!companyData[COMPANY_LINE_2_FIELD_NAME] ? `,\n${companyData[COMPANY_LINE_2_FIELD_NAME]}` : '';
				const companyAddressCity = !!companyData[COMPANY_CITY_FIELD_NAME] ? `,\n${companyData[COMPANY_CITY_FIELD_NAME]}` : '';
				const companyAddressState = !!companyData[COMPANY_STATE_FIELD_NAME] ? `,\n${companyData[COMPANY_STATE_FIELD_NAME]}` : '';

				const companyBaseCountryResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${companyData[COMPANY_COUNTRY_FIELD_NAME]}`, {params: {
					fields: [COUNTRY_NAME_FIELD_NAME],
				}});
				validateCompanyCountry(companyBaseCountryResponse.data.data);
				const companyAddressCountry = !!companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME] ? `, ${companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME]}` : '';
				const companyZipcode = !!companyData[COMPANY_ZIP_FIELD_NAME] ? ` ${companyData[COMPANY_ZIP_FIELD_NAME]}` : '';
				const COMPANY_ADDRESS = `${companyAddressLine1}${companyAddressLine2}${companyAddressCity}${companyZipcode}${companyAddressState}${companyAddressCountry}`;
				/**
				 * END: Seller company data
				 */

				/**
				 * START: Origin and destination port
				 */
				const originPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_ORIGIN_FIELD_NAME]}`, {params: {
					fields: [
						PORT_NAME_FIELD_NAME,
						PORT_COUNTRY_FIELD_NAME,
					],
				}});
				validatePortOfOrigin(originPortResponse.data.data);

				const destinationPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_DESTINATION_FIELD_NAME]}`, {params: {
					fields: [
						PORT_NAME_FIELD_NAME,
						PORT_COUNTRY_FIELD_NAME,
					],
				}});
				validatePortOfDestination(destinationPortResponse.data.data);
				/**
				 * END: Origin and destination port
				 */

				const invoiceResponse = await api.get(`/items/${INVOICE_COLLECTION_NAME}?filter[${INVOICE_PARCEL_FIELD_NAME}]=${parcelId}`, {params: {
					fields: [
						INVOICE_ID_FIELD_NAME,
						INVOICE_INVOICE_FIELD_NAME
					],
				}});

				// TODO: can filter for non-null Invoice field response and simply do .length for invoiceResponse
				// counts the number of invoices that have already been generated for this parcel (indicated by whether the 'invoice' field is populated) and adds one to it for a new invoice number
				let invoiceNum = invoiceResponse.data.data.reduce((acc, curr) => acc + (!!curr[INVOICE_INVOICE_FIELD_NAME] ? 1 : 0), 0) + 1;
				// using parcelId for now since its an integer
				let parcelNum = parcelId;

				// convert INVOICE_NUMBER to string and pad with 0 prefix till the string is a length of 2
				const invoiceNumber = invoiceNum.toString().padStart(2, '0');
				const INVOICE_ID = `${parcelResponce.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME]} (#${invoiceNumber})`;

				// same for PARCEL_NUMBER but pad to three
				const PARCEL_NUMBER = parcelNum.toString().padStart(2, '0');

				/**
				 * START: Due Date
				 */
				const invoiceDueDates = parcelResponce.data.data[PARCEL_INVOICE_DUE_DATE_FIELD_NAME];

				let dueDate: Date | null = null;
				if (!!invoiceDueDates) {
					const dueDateString = invoiceDueDates[INVOICE_TYPE]?.due_date;
					if (!isNullOrUndefined(dueDateString)) {
						dueDate = new Date(dueDateString);
					}
				}
				
				if (isNullOrUndefined(dueDate)) {
					const paymentAdvice = {
						invoice_type: INVOICE_TYPE,
						days: paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_DAYS_FIELD_NAME],
						day_type: paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_DAY_TYPE_FIELD_NAME],
						ref_day: INVOICE_TYPE === 'Final' ? undefined : paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_REF_DAY_FIELD_NAME],
					}
					if (!paymentAdvice) {
						throw new Error(`Contract does not have a payment advice for invoice type ${INVOICE_TYPE}`);
					}
					let readablePaymentAdviceRefDayType = '';
					let refDayAsString;
					if (INVOICE_TYPE !== 'Final') {
						switch (paymentAdvice['ref_day']) {
							case 'Arrival Date':
								readablePaymentAdviceRefDayType = 'Actual/Estimated Arrival Date from the Parcel form';
								refDayAsString = parcelResponce.data.data[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? parcelResponce.data.data[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
								break;
							case 'B/L Date':
								readablePaymentAdviceRefDayType = 'B/L Date (or Estimated Shipment Date) from the Parcel form';
								refDayAsString = parcelResponce.data.data[PARCEL_BL_DATE_FIELD_NAME] ?? parcelResponce.data.data[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
								break;
							case 'Invoice Date':
								readablePaymentAdviceRefDayType = 'Invoice Date from the Invoice form';
								refDayAsString = formValues.value[INVOICE_INV_DATE_FIELD_NAME];
								break;
							// case 'Actual Shipment Date':
							// 	paymentAdviceRefDayType = PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME;
							// 	readablePaymentAdviceRefDayType = 'Actual Shipment Date';
							// 	break;
							case 'Estimated Shipment Date':
								readablePaymentAdviceRefDayType = 'Estimated Shipment Date from the Parcel form';
								refDayAsString = parcelResponce.data.data[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
								break;
							case 'Parcel Finalisation':
								if (parcelResponce.data.data[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME] === undefined || parcelResponce.data.data[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME] === null) {
									throw new Error(`[generateInvoice] Parcel has not been finalised, please fill in the the parcel finalisation date in the parcel form.`);
								}
								readablePaymentAdviceRefDayType = 'Parcel Finalisation Date from the Parcel form';
								refDayAsString = parcelResponce.data.data[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME];
								break;
							default:
								throw new Error(`Invalid reference day for payment advice: ${paymentAdvice['ref_day']}; please contact Navarch for support`);
						}
					} else {
						readablePaymentAdviceRefDayType = 'Last day of the last QP Month';
					}
					if (INVOICE_TYPE !== 'Final' && isNullOrUndefined(refDayAsString)) {
						// only Final invoice can have no set refDayAsString since it will use the latest QP Month end date later on when getting the redDate
						throw new Error(`Reference day for payment advice ${readablePaymentAdviceRefDayType} is empty in parcel`);
					}
					const refDate: Date = INVOICE_TYPE === 'Final' ? 
						getLatestDateFromDateList(LATEST_QP_MONTH_END_DATES, 'No QP Month end dates found when evaluating due date for Final invoice')
						: new Date(refDayAsString);

					const dayRange = parseInt(paymentAdvice['days']);
					const dayType = paymentAdvice['day_type'];
					switch (dayType) {
						case 'Business Day(s)':
							dueDate = addBusinesDays(refDate, dayRange);
							break;
						case 'Calendar Day(s)':
							dueDate = new Date(refDate.valueOf());
							// round up or down depending on the hours of due date to account for daylight savings (date may be based on locale)
							if (dueDate.getHours() >= 12) {
								dueDate.setDate(dueDate.getDate() + dayRange + 1);
							} else {
								dueDate.setDate(dueDate.getDate() + dayRange);
							}
							break;
						default:
							throw new Error(`[generateInvoice] Invalid day_type for payment advice ${dayType}`);
					}
				}
				if (!dueDate) {
					// using negative operator instead of isNullOrUndefined function so TypeScript doesn't complain about the type of dueDate
					throw new Error(`Due date could not be calculated for invoice type ${INVOICE_TYPE}`);
				}
				console.log(`[generateInvoice] payment advice due date: ${dueDate.toString()}`);
				
				const DUE_DATE = formatDate(dueDate);
				/**
				 * END: Due Date
				 */

				
				/**
				 * START: Payments Received & GST if applicable
				 */
				const PAYMENTS_RECEIVED: PaymentReceived[] = [];
				const GST: { [key: string ]: Gst } = {};
				let GST_RATE = 0;
				let balanceOfGstPayableInLocalCurrency = 0;
				// for the /generate API invoice generator to identify which GST is for the current invoice and which are for previous invoices
				const CURRENT_INVOICE_GST_IDENTIFIER = 'current';
				let localCurrencyCode;
				let conversionRateToUsd;
				if (isGstApplicable(contractResponse.data.data)) {
					if (isNaN(contractResponse.data.data[CONTRACT_GST_RATE_FIELD_NAME])) {
						// Should already be checked by validateContractResponse() but doing it again just in case
						throw new Error(`GST Rate from the contract is not a valid number`);
					}
					GST_RATE = contractResponse.data.data[CONTRACT_GST_RATE_FIELD_NAME]/100
					const localCurrencyResponse = await api.get(`/items/${CURRENCY_COLLECTION_NAME}/${contractResponse.data.data[CONTRACT_GST_LOCAL_CURRENCY_FIELD_NAME]}`, {params: {
						fields: [CURRENCY_CODE_FIELD_NAME],
					}});
					validateCurrencyData(localCurrencyResponse.data.data, 'local currency for GST in the contract');

					localCurrencyCode = localCurrencyResponse.data.data[CURRENCY_CODE_FIELD_NAME];
					if (isNullOrUndefined(formValues.value[INVOICE_CONVERSION_TO_USD_FIELD_NAME])) {
						throw new Error(`Local currency for GST to USD exchange rate is not provided in the current invoice form, field mandatory when GST is applicable`);
					}
					if (isNaN(formValues.value[INVOICE_CONVERSION_TO_USD_FIELD_NAME])) {
						throw new Error(`Local currency for GST to USD exchange rate provided in the current invoice form is not a number`);
					}
					const gstInUsd = INVOICE_VALUE * GST_RATE;
					conversionRateToUsd = roundNumber(formValues.value[INVOICE_CONVERSION_TO_USD_FIELD_NAME], 4);
					if (conversionRateToUsd === 0 || conversionRateToUsd === null) {
						throw new Error(`Invalid conversion rate to USD of ${conversionRateToUsd} provided in the Invoice form for GST calculation`);
					}
					const gstInLocalCurrency = gstInUsd / conversionRateToUsd;
					GST[CURRENT_INVOICE_GST_IDENTIFIER] = {
						gst_in_usd: roundNumber(gstInUsd),
						gst_in_local_currency: roundNumber(gstInLocalCurrency),
						conversion_rate_to_usd: conversionRateToUsd,
						local_currency: localCurrencyCode,
					}
					balanceOfGstPayableInLocalCurrency = gstInLocalCurrency;
				}
				let REVISION_INV_NUMBER: string | undefined = undefined;
				let REVISION_TOTAL_PAYMENT: number | undefined = undefined;
				let REVISION_INVOICE_TYPE: string | undefined = undefined;
				let REVISION_INV_DOCUMENT_TYPE: string | undefined = undefined;
				if (!!formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]){
					const revisionParcelResponse = await api.get(`/items/${INVOICE_COLLECTION_NAME}/${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`, {params: {
						fields: [
							INVOICE_PARCEL_FIELD_NAME,
							INVOICE_INVOICE_FIELD_NAME,
							INVOICE_INV_TYPE_FIELD_NAME,
							INVOICE_DOCUMENT_TYPE_FIELD_NAME,
						],
					}});

					console.log(`[generateInvoice] revisionParcelResponse: ${JSON.stringify(revisionParcelResponse.data)}`);

					if (revisionParcelResponse.status !== 200 || !revisionParcelResponse.data.data) {
						throw new Error(`[generateInvoice] Failed to get invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`);
					}

					if (revisionParcelResponse.data.data[INVOICE_PARCEL_FIELD_NAME] !== parcelId) {
						throw new Error(`[generateInvoice] Parcel ID mismatch between this invoice with parcel ${parcelId}, and the revision invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]} with parcel id ${revisionParcelResponse.data.data[INVOICE_PARCEL_FIELD_NAME]}`);
					}

					if (!revisionParcelResponse.data.data[INVOICE_INVOICE_FIELD_NAME]) {
						throw new Error(`[generateInvoice] No invoice pdf has been generated yet for invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`);
					}

					if (!revisionParcelResponse.data.data[INVOICE_INV_TYPE_FIELD_NAME]) {
						throw new Error(`[generateInvoice] No invoice type found for the revision invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`);
					}

					REVISION_INVOICE_TYPE = revisionParcelResponse.data.data[INVOICE_INV_TYPE_FIELD_NAME];
					REVISION_INV_DOCUMENT_TYPE = revisionParcelResponse.data.data[INVOICE_DOCUMENT_TYPE_FIELD_NAME];

					// // remove INVOICE_LOCAL_FOLDER_NAME from the string value
					// const revisionInvoiceData = revisionParcelResponse.data.data[INVOICE_INVOICE_FIELD_NAME].split(INVOICE_DATA_SEPARATOR);
					// console.log(`[generateInvoice] revisionInvoiceData: ${JSON.stringify(revisionInvoiceData)}`);
					// const revisionInvNumberKeyValue = revisionInvoiceData.find((data: string) => data.startsWith(INVOICE_DATA_INV_NUMBER_KEY + '='));

					// if (!revisionInvNumberKeyValue) {
					// 	throw new Error(`[generateInvoice] Failed to find invoice number in revision invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`);
					// }

					// REVISION_INV_NUMBER = revisionInvNumberKeyValue.split('=')[1];

					// if (!REVISION_INV_NUMBER || REVISION_INV_NUMBER === '') {
					// 	throw new Error(`[generateInvoice] Could not find invoice number in revision invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`);
					// }

					// const revisionTotalPaymentKeyValue = revisionInvoiceData.find(data => data.startsWith(INVOICE_DATA_TOTAL_PAYMENT_KEY + '='));

					// if (!revisionTotalPaymentKeyValue) {
					// 	throw new Error(`[generateInvoice] Failed to find total payment in revision invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`);
					// }

					// const revisionTotalPaymentString: string = revisionTotalPaymentKeyValue.split('=')[1];
					// REVISION_TOTAL_PAYMENT = parseFloat(revisionTotalPaymentString);

					// if (!REVISION_TOTAL_PAYMENT || isNaN(REVISION_TOTAL_PAYMENT)) {
					// 	throw new Error(`[generateInvoice] Total payment=${revisionTotalPaymentString} found is not convertible to monetary amount for revision invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`);
					// }

					const revisionInvoiceData = revisionParcelResponse.data.data[INVOICE_INVOICE_FIELD_NAME];
					validateRevisionInvoiceData(revisionInvoiceData);
					console.log(`[generateInvoice] revisionInvoiceData: ${JSON.stringify(revisionInvoiceData)}`);
					REVISION_INV_NUMBER = revisionInvoiceData['invoice_number'];

					if (!REVISION_INV_NUMBER || REVISION_INV_NUMBER === '') {
						throw new Error(`[generateInvoice] Could not find invoice number in revision invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`);
					}

					// TODO: replace with parseNumber() if behaviour is the same
					const reformatedTotalPaymentFromRevisionInvoice = (revisionInvoiceData['balance_in_sellers_favor'] as string).replace(/,/g, '');
					REVISION_TOTAL_PAYMENT = parseFloat(reformatedTotalPaymentFromRevisionInvoice);

					if (!REVISION_TOTAL_PAYMENT || isNaN(REVISION_TOTAL_PAYMENT)) {
						throw new Error(`[generateInvoice] Total payment=${revisionInvoiceData['balance_in_sellers_favor']} found is not convertible to monetary amount for revision invoice ${formValues.value[INVOICE_REVISION_INVOICE_FIELD_NAME]}`);
					}
				}

				const invTypeList = invoiceTypeResponse.data.data.map(invTypeData => invTypeData[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]);
				const currentInvoiceTypeIndex = INVOICE_TYPE_ORDER[INVOICE_TYPE];
				if (currentInvoiceTypeIndex === undefined) {
					throw new Error(`'${INVOICE_TYPE}' is not a valid Invoice Type`);
				}
				const invoicesBeforeCurrentInvoiceList = invTypeList.filter(invType => INVOICE_TYPE_ORDER[invType] < currentInvoiceTypeIndex);

				const invoiceWithPaymentsReceivedResponse = await api.get(`/items/${INVOICE_COLLECTION_NAME}`, {params: {
					filter: {
						[INVOICE_PARCEL_FIELD_NAME]: { "_eq": parcelId },
						[INVOICE_INV_TYPE_FIELD_NAME]: { "_in": invoicesBeforeCurrentInvoiceList },
						[INVOICE_INVOICE_FIELD_NAME]: { "_nnull": true },
						// [INVOICE_AMOUNT_PAID_FIELD_NAME]: { "_nnull": true }, // don't filter by this so it can be checked and notify the user later that this is null
						// [INVOICE_GST_PAID_LOCAL_CURR_FIELD_NAME]: { "_nnull": true }, // don't filter by this so it can be checked and notify the user later that this is null
					},
					fields: [
						INVOICE_INVOICE_FIELD_NAME,
						INVOICE_AMOUNT_PAID_FIELD_NAME,
						INVOICE_INV_TYPE_FIELD_NAME,
						INVOICE_DOCUMENT_TYPE_FIELD_NAME,
						INVOICE_GST_PAID_LOCAL_CURR_FIELD_NAME,
					],
				}});

				let totalPaymentsReceived: number = 0;
				invoiceWithPaymentsReceivedResponse.data.data.forEach((invoiceData: any) => {
					const INV_DOC_TYPE = invoiceData[INVOICE_DOCUMENT_TYPE_FIELD_NAME];
					const INV_TYPE = invoiceData[INVOICE_INV_TYPE_FIELD_NAME];
					const AMOUNT_PAID = parseFloat(invoiceData[INVOICE_AMOUNT_PAID_FIELD_NAME]);
					const GST_PAID_IN_LOCAL_CURRENCY = parseFloat(invoiceData[INVOICE_GST_PAID_LOCAL_CURR_FIELD_NAME]);

					if (isNullOrUndefined(INV_TYPE)) {
						// This should not happen, but just in case
						throw new Error(`One of the previous invoices has no invoice type`);
					}
					if (isNullOrUndefined(INV_DOC_TYPE)) {
						// This should not happen, but just in case
						throw new Error(`Previous ${INV_TYPE} invoice has no document type`);
					}

					// INV_DOC_TYPE checked above to not be null or undefined, so is the selected document type for this Invoice form at the start of the function
					if (
						INV_TYPE === INVOICE_TYPE 
						&& (INVOICE_DOCUMENT_TYPE_ORDER[INV_DOC_TYPE] >= INVOICE_DOCUMENT_TYPE_ORDER[formValues.value[INVOICE_DOCUMENT_TYPE_FIELD_NAME]])
					) {
						// Ignores any invoices of the same Invoice Type but of equal or higher Document Type in the payments received section
						console.warn(`[generateInvoice] Skipping invoice of type ${INV_TYPE} and document type ${INV_DOC_TYPE} as it is of the same or higher order Document Type than the current invoice`);
						return;
					}

					if (isNullOrUndefined(invoiceData[INVOICE_INVOICE_FIELD_NAME])) {
						throw new Error(`No generated invoice data found for invoice of type ${INV_TYPE} with document type ${INV_DOC_TYPE}`);
					}
					const INV_NUMBER = invoiceData[INVOICE_INVOICE_FIELD_NAME]['invoice_number'];
					if (isNullOrUndefined(INV_NUMBER)) {
						throw new Error(`No invoice number found for the generated invoice of type ${INV_TYPE} and document type ${INV_DOC_TYPE}`);
					}

					if (isNullOrUndefined(AMOUNT_PAID) || isNaN(AMOUNT_PAID)) {
						throw new Error(`Invalid amount paid for the generated invoice of type ${INV_TYPE} and document type ${INV_DOC_TYPE}`);
					}

					if (!!INV_NUMBER && !!AMOUNT_PAID && !!INV_DOC_TYPE) {
						totalPaymentsReceived += AMOUNT_PAID;
						const paymentReceivedSource = `${INV_TYPE}.${INV_DOC_TYPE}.${INV_NUMBER}`;
						PAYMENTS_RECEIVED.push({
							"invoice_type": INV_TYPE,
							"document_type": INV_DOC_TYPE,
							"payment_received_source": paymentReceivedSource,
							"payment_received": roundNumber(AMOUNT_PAID * -1),
						});

						// get the then current GST data for the 'payment received' invoice
						if (isGstApplicable(contractResponse.data.data)) {
							// if (
							// 	isNullOrUndefined(invoiceData[INVOICE_INVOICE_FIELD_NAME]['balance_of_gst_payable'])
							// 	|| isNullOrUndefined(invoiceData[INVOICE_INVOICE_FIELD_NAME]['balance_of_gst_payable'].gst_in_local_currency)
							// ) {
							// 	throw new Error(`Invoice ${paymentReceivedSource} does not have Balance of GST Payable data for local currency in its generated invoice`);
							// }
							// const gstInLocalCurrency = invoiceData[INVOICE_INVOICE_FIELD_NAME]['balance_of_gst_payable'].gst_in_local_currency;

							if (isNullOrUndefined(GST_PAID_IN_LOCAL_CURRENCY) || isNaN(GST_PAID_IN_LOCAL_CURRENCY)) {
								throw new Error(`Invalid GST paid in local currency for the generated invoice of type ${INV_TYPE} and document type ${INV_DOC_TYPE}`);
							}
							const gstInLocalCurrency = GST_PAID_IN_LOCAL_CURRENCY;

							// const gstInLocalCurrencyOfPaymentReceivedInvoice = invoiceData[INVOICE_INVOICE_FIELD_NAME]['balance_of_gst_payable'].gst_in_local_currency;
							// const gstInLocalCurrencyAsNumber = parseNumber(gstInLocalCurrencyOfPaymentReceivedInvoice);
							const gstInUsd = roundNumber(gstInLocalCurrency * conversionRateToUsd);
							GST[paymentReceivedSource] = {
								gst_in_usd: !!gstInUsd ? gstInUsd * -1 : null,
								gst_in_local_currency: gstInLocalCurrency, // should already be formatted and prefixed with the local currency code
								local_currency: localCurrencyCode,
							}
							balanceOfGstPayableInLocalCurrency -= gstInLocalCurrency;
						}
					}
				});

				let BALANCE_OF_GST_PAYABLE: Gst | undefined = undefined;
				if (isGstApplicable(contractResponse.data.data)) {
					BALANCE_OF_GST_PAYABLE = {
						gst_in_usd: roundNumber(balanceOfGstPayableInLocalCurrency * conversionRateToUsd),
						gst_in_local_currency: roundNumber(balanceOfGstPayableInLocalCurrency),
						local_currency: localCurrencyCode,
					};
				}

				

				// in-place sort PAYMENTS_RECEIVED by invoice type order
				// order by Document Type if there are multiple invoices of the same type
				PAYMENTS_RECEIVED.sort((a, b) => {
					const invTypeDiff = INVOICE_TYPE_ORDER[a.invoice_type] - INVOICE_TYPE_ORDER[b.invoice_type];
					if (invTypeDiff !== 0) {
						return invTypeDiff;
					}
					return INVOICE_DOCUMENT_TYPE_ORDER[a.document_type] - INVOICE_DOCUMENT_TYPE_ORDER[b.document_type];
				});
				/**
				 * END: Payments Received
				 */

				const PAYMENT_OUTSTANDING = PAYABLE_AMOUNT != undefined ? PAYABLE_AMOUNT - totalPaymentsReceived : undefined;

				const SIGNATORY = {
					signatoryName: companyData[COMPANY_SIGNATORY_NAME_FIELD_NAME] as string,
					signatoryTitle: companyData[COMPANY_SIGNATORY_TITLE_FIELD_NAME] as string,
					signature: signatureImageData ?? null,
					company: companyName as string,
				}

				const requestBody: InvoiceRequestBody = {
					"folder_id": await getFolderID(),
					"company_logo": companyLogoData ?? null,
					"seller": companyName,
					"seller_address": COMPANY_ADDRESS,
					"seller_phone_number": (!!companyPhoneCode && !!companyPhoneNumber) ? `+${companyPhoneCode} ${companyPhoneNumber}` : null,
					"seller_business_number": companyData[COMPANY_BUSINESS_NUMBER_FIELD_NAME] as string,
					"signatory": SIGNATORY,
					"remittance": companyData[COMPANY_REMITTANCE_DETAILS_FIELD_NAME] as string,

					"buyer": counterpartyResponse.data.data[COUNTERPARTY_NAME_FIELD_NAME],
					"buyer_address": BUYER_ADDRESS,
					"buyer_business_number": counterpartyResponse.data.data[COUNTERPARTY_BUSINESS_NUMBER_FIELD_NAME],
					"shipment_code": parcelResponce.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME],
					"vessel": !!vesselResponse ? vesselResponse.data.data[VESSEL_NAME_FIELD_NAME] : 'N/A',
					"bl_date": !!parcelResponce.data.data[PARCEL_BL_DATE_FIELD_NAME] ? formatDate(new Date(parcelResponce.data.data[PARCEL_BL_DATE_FIELD_NAME])) : 'N/A',

					"invoice_type": INVOICE_TYPE,
					"invoice_date": formatDate(INVOICE_DATE),
					"revision": (!!REVISION_INV_NUMBER && !!REVISION_TOTAL_PAYMENT) ? REVISION_INV_DOCUMENT_TYPE : undefined,
					"invoice_number": INVOICE_ID, //"CZ-100-GLS (#02)",
					"parcel": `${parcelResponce.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME]} (#${PARCEL_NUMBER})`, //"CZ-100-GLS (#149)",

					"port_of_loading": `${originPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`, //"Gold Coast, Australia",
					"port_of_discharge": `${destinationPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${destinationPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`, //"CIF FO, Huangpu New Port, China",
					"primary_commodity": `${PRIMARY_COMMODITY} Concentrates`,

					"due_date": DUE_DATE, // "3-Sept-2022",


					"wet_weight": roundNumber(WEIGHT.wet_weight, 4), //"10,069.0000",
					"wet_weight_uom": WEIGHT.wet_weight_uom, //"wmt",
					"wet_weight_uom_name": capitaliseFirstLetter(WET_WEIGHT_UOM_NAME),
					"moisture": roundNumber(WEIGHT.moisture, 4), //"10.5000",
					"moisture_uom": "%",
					"dry_weight": roundNumber(WEIGHT.dry_weight, 4), //"9,011.7550", // for which method again?
					"dry_weight_uom": WEIGHT.dry_weight_uom, // "dmt",
					"dry_weight_uom_name": capitaliseFirstLetter(DRY_WEIGHT_UOM_NAME),

					"total_revenue": roundNumber(TOTAL_REVENUE), // "9,643,265.49",
					// "total_deductions": "2,649,455.98",
					"total_deductions": roundNumber(TOTAL_PENALTIES + TOTAL_TREATMENT_CHARGE + TOTAL_REFINING_CHARGE, 2, true),

					"currency": currencyCode,

					"commodities": COMMODITIES,

					"penalties": {
						"penalties": PENALTIES,
						"total_penalties": roundNumber(TOTAL_PENALTIES),
					},

					"adjustments": ADJUSTMENTS_EXIST ? ADJUSTMENTS : undefined,

					"invoice_value": roundNumber(INVOICE_VALUE), // contract
					// using INVOICE_TYPE.toLowerCase() is dependent on the value for INVOICE_TYPE being an exact uppercase match for the field name in the contract for payable percentage of the invoice type
					"payable_percentage": roundNumber(PAYABLE_PERCENTAGE),
					"payable_amount": roundNumber(PAYABLE_AMOUNT), // appears to be similar to 'invoice_value'

					"payments_received": PAYMENTS_RECEIVED,
					"gst": Object.keys(GST).length > 0 ? GST : undefined,
					"balance_of_gst_payable": BALANCE_OF_GST_PAYABLE,
					// // To be replaced with 'payments_received' field, the Revision invoice data will be integrated in (TODO)
					// "payment_received_source": (!!REVISION_INV_NUMBER && !!REVISION_TOTAL_PAYMENT && !!REVISION_INV_DOCUMENT_TYPE) ? `${REVISION_INVOICE_TYPE}.${REVISION_INV_DOCUMENT_TYPE}.${REVISION_INV_NUMBER}` : undefined,
					// "payment_received": (!!REVISION_INV_NUMBER && !!REVISION_TOTAL_PAYMENT) ? formatNumber(REVISION_TOTAL_PAYMENT) : undefined,
					"balance_in_sellers_favor": roundNumber(PAYMENT_OUTSTANDING)
				}
				
				// window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

				// // response will be the url path to the invoice and possible any authentication token if needed
				let response: any;
				try {
					response = await api.post(INVOICE_GENERATOR_PATH, requestBody)
				// // assign the invoice url as the value for this field
				} catch (error) {
					console.error(`[generateInvoice] error: ${error}`);
					throw new Error(JSON.stringify(error.response.data));
				}

				if (response.status !== 200) {
					console.log(`[generateInvoice] invoice response status: ${response.status}`);
					failureReason.value = response.data;
					isGeneraingDoc.value = false;
					return;
				}

				const docID = await uploadGeneratedDoc(response.data);

				// Clear the company logo and signature images and pass in doc id
				requestBody['doc_name'] = docID;
				requestBody['company_logo'] = undefined;
				if (!!requestBody['signatory']) {
					requestBody['signatory']['signature'] = undefined;
				}

				emit('input', requestBody);
				console.log(`[generateInvoice] invoice response: ${JSON.stringify(formValues.value)}`);
				isGeneraingDoc.value = false;
				// viewPdf(docID);
				downloadPdf(docID);
				// // open the invoice in a new tab
				// window.open(`file:///${response.data}`);
			} catch (error) {
				isGeneraingDoc.value = false;
				console.log(`generating invoice went wrong due to: ${error}`);
				failureReason.value = error;
				return;
			}
		}

		function isGstApplicable(contractData) {
			// check that contractData is object and has the field for GST Applicable
			// created so that the multiple if-blocks that perform logic to evaluate GST at different points in the function can be replaced with a single call to this function
			return !!contractData
				&& typeof contractData === 'object'
				&& !!contractData[CONTRACT_GST_APPLICABLE_FIELD_NAME];
		}

		async function getFolderID() {
			const folderResponse = await api.get(`/folders?filter[name][_eq]=${encodeURI('Invoices')}`);

			if (folderResponse.status === 200 && !!folderResponse.data && !!folderResponse.data.data) {
				if (folderResponse.data.data.length === 0) {
					return await createFolderIfNotExist();
				}
				return folderResponse.data.data[0].id;
			}
			return null;
		}

		async function createFolderIfNotExist() {
			const response = await api.post('/folders', {
				name: 'Invoices',
			});

			return response.data.data.id;
		}

		async function uploadGeneratedDoc(fileData: any) {
			if (!fileData) {
				console.error(`[uploadGeneratedDoc] fileData is empty`);
				throw new Error('A failure occured while trying to upload the generated document, no file data found. Please try again.');
			}
			const formData = convertJsonToFormData(fileData);

			const uploadedFileData = await api.post('/files', formData, {
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			});

			if (uploadedFileData.status !== 200) {
				console.error(`[uploadGeneratedDoc] uploadedFileData status: ${uploadedFileData.status}`);
				throw new Error('A failure occured while trying to upload the generated document. Please try again.');
			}

			return uploadedFileData.data.data['id'];
		}

		function base64ToBlob(base64, mimeType) {
			// Decode base64 string
			const byteCharacters = atob(base64); // TODO: this is deprecated, find an alternative for this, can't use Buffer.from in a Vue component

			// Create an ArrayBuffer of the correct length
			const arrayBuffer = new ArrayBuffer(byteCharacters.length);

			// Create a view of the ArrayBuffer
			const uint8Array = new Uint8Array(arrayBuffer);

			// Fill the Uint8Array with the decoded data
			for (let i = 0; i < byteCharacters.length; i++) {
				uint8Array[i] = byteCharacters.charCodeAt(i);
			}

			// Create a Blob from the Uint8Array
			const blob = new Blob([uint8Array], {type: mimeType});

			return blob;
		}

		function convertJsonToFormData(json) {
			console.log('[convertJsonToFormData] json=', JSON.stringify(json))
			const formData = new FormData();
			for (let key in json) {
				if (key !== 'file') {
					formData.append(key, json[key]);
				}
			}

			// for some reason, the 'file' field must come last or any other fields that come after it will be sent but not processed by the server
			const base64String = json['file'];
			const mimeType = 'application/pdf';
			const blob = base64ToBlob(base64String, mimeType);
			formData.append('file', blob, json['filename_download']);
			return formData;
		}

		async function downloadPdf(docID?: string): Promise<void> {
			// open the invoice in a new tab
			const documentID = docID ?? props.value['doc_name'];
			console.log(`[downloadPdf] doc ID: ${documentID}`);
			if (!documentID) {
				throw new Error('No document ID found, please ensure the document has been generated');
			}

			try {
				const filenameDownloadResponse = await api.get(`/files/${documentID}`);
				const filenameDownload = filenameDownloadResponse.data.data['filename_download'];
				const response = await api.get(`/assets/${documentID}`, {
					responseType: 'arraybuffer' // this is required or the downloaded pdf will be blank
				});

				// Convert response.data to Blob
				const blob = new Blob([response.data], { type: 'application/pdf' });

				// Create a URL for the Blob
				const url = URL.createObjectURL(blob);

				// Create a link element
				const link = document.createElement('a');
				link.href = url;
				link.download = filenameDownload ?? 'invoice.pdf';

				// Append the link to the document
				document.body.appendChild(link);

				// Trigger the download
				link.click();

				// Remove the link from the document
				document.body.removeChild(link);

				// Revoke the object URL
				URL.revokeObjectURL(url);
			} catch (error) {
				console.error(`[downloadPdf] error: ${error}`);
				throw new Error('Failed to fetch the document, please try again');
			}
		}

		function viewPdf(docID?: string): void {
			// open the invoice in a new tab
			const documentID = docID ?? props.value['doc_name'];
			console.log(`[viewPdf] doc ID: ${documentID}`);
			
			// The access token must be the token of the current logged in user, else using another user's token will result in a 403 error
			window.open(`/assets/${documentID}?access_token=9TKZlOUjs29Svyop45nyyyN02lYPlX_x`);

			// // open the invoice in a new tab
			// const docName = documentName ?? props.value['doc_name'];
			// console.log(`[viewPdf] doc name: ${docName}`);
			// // console.log(`[viewPdf] doc path: ${process.env.STORAGE_LOCAL_ROOT}/${docName}.pdf`);
			// // const encodedValue = encodeURIComponent(`${process.env.STORAGE_LOCAL_ROOT}/${docName}.pdf`);
			// const encodedValue = encodeURIComponent(`${docName}.pdf`);
			// const url = `/display-doc?docname=${encodedValue}`;
			// window.open(url);
		}

		return { 
			isGeneraingDoc,
			invoiceUrl: formValues.value, 
			isLastDocType,
			generateInvoice, 
			viewPdf, 
			downloadPdf,
			isCopying,
			copy,
			failureReason 
		};

		function getNextDocumentType(documentType: string): string | null {
			const documentTypeIndex = INVOICE_DOCUMENT_TYPE_ORDER[documentType];
			if (documentTypeIndex === undefined) {
				throw new Error(`'${documentType}' is not a valid Document Type`);
			}
			let nextDocumentTypeIndex = documentTypeIndex + 1;
			const noOfDocTypes = Object.keys(INVOICE_DOCUMENT_TYPE_ORDER).length;
			if (nextDocumentTypeIndex >= noOfDocTypes) {
				// return null if the next available type does not exist
				return null;
				// // Will default to the highest Document Type if the next available type does not exist
				// nextDocumentTypeIndex = noOfDocTypes - 1;
			}
			const nextDocumentType = Object.keys(INVOICE_DOCUMENT_TYPE_ORDER)[nextDocumentTypeIndex];
			if (nextDocumentType === undefined) {
				throw new Error(`Could not find the next Document Type after '${documentType}'`);
			}
			return nextDocumentType;
		}

		async function copy() {
			isCopying.value = true;
			const { id, user_created, date_created, user_updated, date_updated, invoice, document_type, ...requestBody } = formValues.value;
			console.log(`[invoice::copy] requestBody=${JSON.stringify(requestBody)}`);
			const newDocType = getNextDocumentType(document_type);
			if (newDocType === null) {
				console.log(`[invoice::copy] no more document types to copy to`);
				failureReason.value = `Duplication failed, cannot create a new revision invoice after ${document_type}`;
				isLastDocType.value = true;
				isCopying.value = false;
				return;
			}
			const copyResponse = await api.post('/items/navarch_invoices', {
				...requestBody,
				document_type: newDocType,
			});

			if (copyResponse.status !== 200) {
				console.log(`[invoice::copy] copy response status: ${copyResponse.status}`);
				failureReason.value = `Failed to duplicate invoice with status ${copyResponse.status}`;
				return;
			}
			isCopying.value = false;

			window.open(`/admin/content/navarch_invoices/${copyResponse.data.data.id}`);
		}

		async function setPricingDates(commodityCode: string, parcelData: any, invoiceDate: Date, priceMethod: any, backup: () => Promise<PricingDates | null>, isDeclaredMandatory: boolean = false): Promise<PricingDates | null> {
			if (isNullOrUndefined(parcelData[PARCEL_QP_SELECTION_FIELD_NAME]) || isNullOrUndefined(parcelData[PARCEL_QP_SELECTION_FIELD_NAME][commodityCode])) {
				// check if the parcel has QP Selection, if null or if not set for the specific commodity, then fetch with the backup option
				return await backup();
			}
			const pricingDates = await setPricingDatesWithQpSelection(parcelData[PARCEL_QP_SELECTION_FIELD_NAME][commodityCode] as QpCommodity, parcelData, invoiceDate, priceMethod, isDeclaredMandatory);
			if (!pricingDates) {
				return await backup();
			}
			return pricingDates;
		}

		async function setPricingDatesWithQpSelection(qpCommodity: QpCommodity, parcelData, invoiceDate: Date, priceMethod, isDeclaredMandatory: boolean): Promise<PricingDates | null> {
			if (isDeclaredMandatory && !qpCommodity.declared) {
				return null;
			}
			const qpSelectionString = qpCommodity?.qp_selected;
			if (!qpSelectionString) {
				return null;
			}

			const qpSelectionParsed = qpSelectionString.split(' ');
			const qpSelection = {
				qp_period: parseInt(qpSelectionParsed[0]),
				qp_code: qpSelectionParsed[1]
			}

			let refDayStringFromParcel: string;
			let readableRefDayType: string;
			let provisionalPricingStartDate: Date;
			let provisionalPricingEndDate: Date;
			switch(qpSelection.qp_code) {
				case 'MAMA':
					refDayStringFromParcel = parcelData[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? parcelData[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
					readableRefDayType = 'Actual/Estimated Arrival Date';
					break;
				case 'MOSS':
					refDayStringFromParcel = parcelData[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
					readableRefDayType = 'Estimated Shipment Date';
					break;
				case 'MOS':
				case 'MOAS':
					refDayStringFromParcel = parcelData[PARCEL_BL_DATE_FIELD_NAME] ?? parcelData[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
					readableRefDayType = 'B/L Date (or Estimated Shipment Date)';
					break;
				default:
					throw new Error(`Unsupported QP code ${qpSelection.qp_code} in the contract commodities, please ensure all commodity QP codes are MAMA, MOS, MOSS, or MOAS`);
			}
			if (isNullOrUndefined(refDayStringFromParcel)) {
				// Getting the ref day string value from the parcel form first and checking for null because new Date(null) will give a date from 1970
				throw new Error(`Please fill in a date for the field '${readableRefDayType}' for the Parcel form, for QP: ${qpSelectionString}`);
			}
			const refDay = new Date(refDayStringFromParcel);
			provisionalPricingStartDate = getFirstDateOfMonthPlusMonths(refDay, qpSelection.qp_period);
			qpMonthForEachCommodity = formatMonthYear(provisionalPricingStartDate);
			if (provisionalPricingStartDate.valueOf() > invoiceDate.valueOf()) {
				// start date has not occured yet, no price data will be available anyway (end date will also be skipped if this is true), so fetch with provisional pricing data
				return null;
			}
			provisionalPricingEndDate = getLastDateOfMonthPlusMonths(refDay, qpSelection.qp_period);
			if (provisionalPricingEndDate.valueOf() > invoiceDate.valueOf()) {
				// end date has not occured yet, no price data will be available anyway, so fetch with provisional pricing data
				return null;
			// } else if (provisionalPricingEndDate.valueOf() <= invoiceDate.valueOf()) {
				// // if the end date has occured, then check if there is commodity price data up to this date
				// const commodityPriceResponse = await api.get(`/items/${COMM_PRICE_COLLECTION_NAME}`, {
				// 	params: {
				// 		filter: {
				// 			_and: [{
				// 				date: {
				// 					_eq: formatDateYYYYMMDD(provisionalPricingEndDate)
				// 				},
				// 			}, {
				// 				price_method: {
				// 					_eq: priceMethod
				// 				}
				// 			}]
				// 		},
				// 		fields: [
				// 			COMM_PRICE_PRICE_PM_FIELD_NAME,
				// 			COMM_PRICE_AVG_PRICE_FIELD_NAME,
				// 		],
				// 	}
				// });
				// if (!commodityPriceResponse.data.data || commodityPriceResponse.data.data.length === 0) {
				// 	// No commodity price data up to this date, so fetch with provisional pricing data
				// 	return null;
				// }

				// return null;
			}

			qpMonthForEachCommodity = null; // set this back to null if a QP period is provided
			return {
				provisionalPricingStartDate,
				provisionalPricingEndDate,
				expectedNoOfBusinessDays: null,
			}
		}

		function formatMonthYear(date: Date): string {
			// generate a string with the Month and Year in the format 'MMM YYYY'
			return date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
		}

		async function setPricingDatesWithProvisionalPricing(paymentInformation: any, parcelData: any, invoiceDate: Date, invoiceType: string): Promise<PricingDates | null> {
			let readableRefDayType: string;
			let provisionalPricingStartDate: Date;
			let provisionalPricingEndDate: Date;


			const provisionalPricing = {
				invoice_type: invoiceType,
				days: paymentInformation[INVOICE_TYPE_PROVISIONAL_PRICING_DAYS_FIELD_NAME],
				day_type: paymentInformation[INVOICE_TYPE_PROVISIONAL_PRICING_DAY_TYPE_FIELD_NAME],
				ref_day: paymentInformation[INVOICE_TYPE_PROVISIONAL_PRICING_REF_DAY_FIELD_NAME],
			}

			if (!provisionalPricing) {
				throw new Error(`[generateInvoice] No provisional pricing found for invoice type ${invoiceType}`);
			}

			let refDayAsString: string;
			switch (provisionalPricing['ref_day']) {
				case 'Arrival Date':
					refDayAsString = parcelData[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? parcelData[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
					readableRefDayType = 'Actual/Estimated Arrival Date from the Parcel form';
					break;
				case 'B/L Date':
					refDayAsString = parcelData[PARCEL_BL_DATE_FIELD_NAME] ?? parcelData[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
					readableRefDayType = 'B/L Date (or Estimated Shipment Date) from the Parcel form';
					break;
				case 'Invoice Date':
					refDayAsString = formValues.value[INVOICE_INV_DATE_FIELD_NAME];
					readableRefDayType = 'Invoice Date from the Invoice form';
					break;
				// case 'Actual Shipment Date':
				// 	refDayType = PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME;
				// 	readableRefDayType = 'Actual Shipment Date';
				// 	break;
				case 'Estimated Shipment Date':
					refDayAsString = parcelData[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
					readableRefDayType = 'Estimated Shipment Date from the Parcel form';
					break;
				default:
					throw new Error(`Invalid reference day for invoice pricing: ${provisionalPricing['ref_day']}; please contact Navarch for support`);
			}
			// TODO: for Final invoice, will need to get start and end date based on the QP terms
			if (refDayAsString == undefined) {
				throw new Error(`Reference day for invoice pricing ${readableRefDayType} is empty`);
			}
			provisionalPricingEndDate = new Date(refDayAsString);
			provisionalPricingEndDate.setDate(provisionalPricingEndDate.getDate() - 1); // set to the day before the reference day

			const dayRange = parseInt(provisionalPricing['days']);
			const dayType = provisionalPricing['day_type'];

			let expectedNoOfBusinessDays: number | null = null;
			switch (dayType) {
				case 'Business Day(s)':
					// this will be used to fetch more commodity price data and get the right number of business days' worth of price data, use null if there's no need to fetch more data
					expectedNoOfBusinessDays = dayRange;
					provisionalPricingStartDate = minusBusinessDays(provisionalPricingEndDate, dayRange);
					// check if provisionalPricingEndDate is a business day, and if not, find the last business day before
					if (provisionalPricingEndDate.getDay() === 0) {
						provisionalPricingEndDate = minusBusinessDays(provisionalPricingEndDate, 1, true); // by minusing 1BD and setting the 'inclusive' parameter to true, the function will return the same date if it is a business day, but if it's a weekend, it will return the previous business day
					} else if (provisionalPricingEndDate.getDay() === 6) {
						provisionalPricingEndDate = minusBusinessDays(provisionalPricingEndDate, 1, true); // by minusing 1BD and setting the 'inclusive' parameter to true, the function will return the same date if it is a business day, but if it's a weekend, it will return the previous business day
					}
					break;
				case 'Calendar Day(s)':
					provisionalPricingStartDate = new Date(provisionalPricingEndDate.valueOf());
					provisionalPricingStartDate.setDate(provisionalPricingStartDate.getDate() - dayRange);
					break;
				default:
					throw new Error(`Invalid day type ${dayType} for ${invoiceType} Invoice in the contract, please ensure it is either Calendar Day(s) or Business Day(s)`);
			}
			if (provisionalPricingStartDate.valueOf() > invoiceDate.valueOf()) {
				throw new Error(`Start date for provisional pricing ${provisionalPricingStartDate} (${readableRefDayType}) for ${invoiceType} Invoice has not occurred yet`);
			}
			if (provisionalPricingEndDate.valueOf() > invoiceDate.valueOf()) {
				throw new Error(`End date for provisional pricing ${provisionalPricingEndDate} (${readableRefDayType}) for ${invoiceType} Invoice has not occurred yet`);
			}

			return {
				provisionalPricingStartDate,
				provisionalPricingEndDate,
				expectedNoOfBusinessDays,
			}
		}

		async function setPricingDatesWithDefaultQp(defaultQuotationalPeriod: QuotationalPeriod, parcelData: any, invoiceDate: Date): Promise<PricingDates | null> {
			let readableRefDayType: string;
			let provisionalPricingStartDate: Date;
			let provisionalPricingEndDate: Date;
			
			let refDayStringFromParcel: string;
			switch(defaultQuotationalPeriod.qp_code) {
				case 'MAMA':
					refDayStringFromParcel = parcelData[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? parcelData[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
					readableRefDayType = 'Actual/Estimated Arrival Date';
					break;
				case 'MOSS':
					refDayStringFromParcel = parcelData[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
					readableRefDayType = 'Estimated Shipment Date';
					break;
				case 'MOS':
				case 'MOAS':
					refDayStringFromParcel = parcelData[PARCEL_BL_DATE_FIELD_NAME] ?? parcelData[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
					readableRefDayType = 'B/L Date (or Estimated Shipment Date)';
					break;
				default:
					throw new Error(`Unsupported QP code ${defaultQuotationalPeriod.qp_code} in the contract commodities, please ensure all commodity QP codes are MAMA, MOS, MOSS, or MOAS`);
			}
			if (isNullOrUndefined(refDayStringFromParcel)) {
				throw new Error(`Please fill in a date for the field '${readableRefDayType}' for the Parcel form, for QP:${defaultQuotationalPeriod.qp_period} ${defaultQuotationalPeriod.qp_code}`);
			}
			const refDay = new Date(refDayStringFromParcel);
			provisionalPricingStartDate = getFirstDateOfMonthPlusMonths(refDay, defaultQuotationalPeriod.qp_period);
			qpMonthForEachCommodity = formatMonthYear(provisionalPricingStartDate);
			if (provisionalPricingStartDate.valueOf() > invoiceDate.valueOf()) {
				throw new Error(`Start date for provisional pricing ${provisionalPricingStartDate} (${readableRefDayType}) based on default QP has not occurred yet`);
			}
			provisionalPricingEndDate = getLastDateOfMonthPlusMonths(refDay, defaultQuotationalPeriod.qp_period);
			if (provisionalPricingEndDate.valueOf() > invoiceDate.valueOf()) {
				throw new Error(`End date for provisional pricing ${provisionalPricingEndDate} (${readableRefDayType}) based on default QP has not occurred yet`);
			}

			qpMonthForEachCommodity = null; // set this back to null if a QP period is provided
			return {
				provisionalPricingStartDate,
				provisionalPricingEndDate,
				expectedNoOfBusinessDays: null,
			}
		}

		function getLatestDateFromDateList(dateList: Date[], throwMessageIfNoDateFound: string): Date {
			if (dateList.length === 0) {
				throw new Error(throwMessageIfNoDateFound);
			}
			return dateList.reduce((acc: Date, curr: Date) => {
				if (isNullOrUndefined(curr) && curr.valueOf() > acc.valueOf()) {
					return curr;
				}
				return acc;
			}, dateList[0]);
		}
		async function getCommodityAvgPrice(
			commodity: string, 
			source: number, 
			startDate: Date, 
			endDate: Date, 
			expectedNoOfBusinessDays: number | null, 
			priceFixToUse: 'Average' | 'PM' | 'AM' | null = null, 
			currency: number = 1
		): Promise<AveragePriceWithinPeriod> {
			if (isNullOrUndefined(commodity)) {
				throw new Error(`Commodity is not defined for price calcualtion`);
			}
			if (isNullOrUndefined(source)) {
				throw new Error(`Price method for commodity ${commodity} is not defined for price calcualtion`);
			}
			if (isNullOrUndefined(startDate)) {
				throw new Error(`Start date is not defined for price calcualtion with ${source} has not been properly defined, please ensure that contract QP is properly defined`);
			}
			if (isNullOrUndefined(endDate)) {
				throw new Error(`End date is not defined for price calcualtion with ${source} has not been properly defined, please ensure that contract QP is properly defined`);
			}

			const adjustedStartDate = new Date(startDate.valueOf());
			if (expectedNoOfBusinessDays !== null && !isNaN(expectedNoOfBusinessDays)) {
				adjustedStartDate.setDate(adjustedStartDate.getDate() - NUMBER_OF_DAYS_TO_FETCH_MORE_OF);
			}

			// /items/navarch_commodity_price?limit=100&filter[_and][0][price_method][_eq]=6&filter[_and][1][date][_between][0]=2023-10-02&filter[_and][1][date][_between][1]=2023-11-30&fields[]=id&fields[]=user_created&fields[]=date_created&fields[]=user_updated&fields[]=date_updated&fields[]=date&fields[]=price_method&fields[]=currency&fields[]=price_am&fields[]=price_pm&fields[]=average_price&fields[]=unit&fields[]=period&sort=id&aggregate[countDistinct][0]=id
			const commodityPrices = await api.get(`/items/${COMM_PRICE_COLLECTION_NAME}?filter[_and][0][price_method][_eq]=${source}&filter[_and][0][currency][_eq]=${currency}&filter[_and][1][date][_between][0]=${formatDateYYYYMMDD(adjustedStartDate)}&filter[_and][1][date][_between][1]=${formatDateYYYYMMDD(endDate)}&sort[]=-${COMM_PRICE_DATE_FIELD_NAME}`, {params: {
				fields: [
					COMM_PRICE_PRICE_AM_FIELD_NAME,
					COMM_PRICE_PRICE_PM_FIELD_NAME,
					COMM_PRICE_AVG_PRICE_FIELD_NAME,
					COMM_PRICE_DATE_FIELD_NAME,
					COMM_PRICE_PRICE_METHOD_FIELD_NAME
				],
			}}); // with '&sort[]=-date', the latest date will be the first element in the array

			if (!commodityPrices || !commodityPrices.data || !commodityPrices.data.data) {
				throw new Error(`Failed to get commodity prices for commodity ${commodity} between ${formatDateYYYYMMDD(startDate)} and ${formatDateYYYYMMDD(endDate)}`);
			}

			if (commodityPrices.data.data.length === 0) {
				throw new Error(`No commodity prices found for commodity ${commodity} between ${formatDateYYYYMMDD(startDate)} and ${formatDateYYYYMMDD(endDate)}`);
			}
			if (expectedNoOfBusinessDays != null && commodityPrices.data.data.length < expectedNoOfBusinessDays) {
				throw new Error(`Not enough commodity prices found for commodity ${commodity} between ${formatDateYYYYMMDD(startDate)} and ${formatDateYYYYMMDD(endDate)}, please contact Navarch for support`);
			}

			const dailyPriceData: any[] = expectedNoOfBusinessDays !== null && !isNaN(expectedNoOfBusinessDays) ? commodityPrices.data.data.slice(0, expectedNoOfBusinessDays) : commodityPrices.data.data;

			// get average of average_price, use price_pm if average_price is empty
			const averagePrice = dailyPriceData.reduce((acc: number, curr: any) => {
				if (!curr[COMM_PRICE_AVG_PRICE_FIELD_NAME] && !curr[COMM_PRICE_PRICE_PM_FIELD_NAME] && !curr[COMM_PRICE_PRICE_AM_FIELD_NAME]) {
					throw new Error(`Commodity for ${source} on the date of ${curr[COMM_PRICE_DATE_FIELD_NAME]} does not have a price, please contact Navarch for assistance`)
				}
				let price: number | undefined = undefined;

				if (priceFixToUse === 'PM') {
					if (curr[COMM_PRICE_PRICE_PM_FIELD_NAME] === null) {
						throw new Error(`The price data for the commodity ${commodity} does not have a Closing Price (PM) for the date of ${curr[COMM_PRICE_DATE_FIELD_NAME]}, please choose another price fix or provide a Price PM for this date`);
					}
					price = Number(curr[COMM_PRICE_PRICE_PM_FIELD_NAME]);
				}  else if (priceFixToUse === 'AM') {
					if (curr[COMM_PRICE_PRICE_AM_FIELD_NAME] === null) {
						throw new Error(`The price data for the commodity ${commodity} does not have an Opening Price (AM) for the date of ${curr[COMM_PRICE_DATE_FIELD_NAME]}, please choose another price fix or provide a Price AM for this date`);
					}
					price = Number(curr[COMM_PRICE_PRICE_AM_FIELD_NAME]);
				} else if (priceFixToUse === 'Average') {
					if (curr[COMM_PRICE_AVG_PRICE_FIELD_NAME] === null) {
						throw new Error(`The price data for the commodity ${commodity} does not have an Average Price for the date of ${curr[COMM_PRICE_DATE_FIELD_NAME]}, please choose another price fix or provide an Average Price for this date`);
					}
					price = Number(curr[COMM_PRICE_AVG_PRICE_FIELD_NAME]);
				} else {
					// default behaviour of priceFixToUse is null
					if (curr[COMM_PRICE_AVG_PRICE_FIELD_NAME] !== null) {
						price = Number(curr[COMM_PRICE_AVG_PRICE_FIELD_NAME]);
					} else if (curr[COMM_PRICE_PRICE_PM_FIELD_NAME] !== null) {
						price = Number(curr[COMM_PRICE_PRICE_PM_FIELD_NAME]);
					} else if (curr[COMM_PRICE_PRICE_AM_FIELD_NAME] !== null) {
						price = Number(curr[COMM_PRICE_PRICE_AM_FIELD_NAME]);
					} else {
						throw new Error(`The commodity price for the commodity ${commodity} for the date of ${curr[COMM_PRICE_DATE_FIELD_NAME]} is not a valid number, please contact Navarch for assistance`)
					}
				}
				return acc + price;
			}, 0) / dailyPriceData.length;
			return {
				averagePrice,
				startDate: new Date(dailyPriceData[dailyPriceData.length - 1][COMM_PRICE_DATE_FIELD_NAME]),
				endDate: new Date(dailyPriceData[0][COMM_PRICE_DATE_FIELD_NAME]),
			};
		}

		function validateParcelData(parcel) {
			if (!parcel) {
				throw new Error(`Parcel data not found, please ensure the selected parcel still exists`);
			}
			if (!parcel[PARCEL_CONTRACT_FIELD_NAME]) {
				throw new Error(`The selected parcel does not have a contract, please ensure that the contract field for the parcel is not empty`);
			}
			if (!parcel[PARCEL_COUNTERPARTY_FIELD_NAME]) {
				throw new Error(`The selected parcel does not have a counterparty, please ensure that the counterparty field for the parcel is not empty`);
			}
			if (!parcel[PARCEL_ASSAY_RESULTS_FIELD_NAME]) {
				throw new Error(`The selected parcel does not have assay results`);
			}
			if (!parcel[PARCEL_WEIGHT_RESULTS_FIELD_NAME]) {
				throw new Error(`The selected parcel does not have weight results`);
			}
			if (!parcel[PARCEL_ORIGIN_FIELD_NAME]) {
				throw new Error(`The selected parcel does not have an origin port`);
			}
			if (!parcel[PARCEL_DESTINATION_FIELD_NAME]) {
				throw new Error(`The selected parcel does not have a destination port`);
			}
			if (!parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]) {
				throw new Error(`The selected parcel does not have a shipment code`);
			}
		}

		function validateAssayLots(assayLots) {
			if (!assayLots || assayLots.length === 0) {
				throw new Error(`No assay lots found for the selected parcel`);
			}
		}

		function validateWeightLots(weightLots) {
			if (!weightLots || weightLots.length === 0) {
				throw new Error(`No weight lots found for the selected parcel`);
			}
		}

		function validateContractResponse(contract) {
			if (!contract) {
				throw new Error(`Contract data not found, please ensure the selected contract still exists`);
			}

			if (!contract[CONTRACT_CURRENCY_FIELD_NAME]) {
				throw new Error(`The selected contract does not have a set currency, please ensure that the currency field for the contract is not empty`);
			}


			if (!!contract[CONTRACT_GST_APPLICABLE_FIELD_NAME]) {
				if (isNaN(contract[CONTRACT_GST_RATE_FIELD_NAME])) {
						// Should already be checked by validateContractResponse() but doing it again just in case
						throw new Error(`GST Rate from the contract is not a valid number`);
				}

				if (contract[CONTRACT_GST_RATE_FIELD_NAME] < 0 || contract[CONTRACT_GST_RATE_FIELD_NAME] > 100) {
					throw new Error(`GST Rate from the contract is not a valid percentage`);
				}

				if (isNullOrUndefined(contract[CONTRACT_GST_LOCAL_CURRENCY_FIELD_NAME])) {
					throw new Error(`Currency for the country of the GST rate in the contract is not selected`);
				}

				if (isNaN(contract[CONTRACT_GST_LOCAL_CURRENCY_FIELD_NAME])) {
					// should never reach here, Directus' field type should prevent this
					throw new Error(`Currency for the country of the GST rate in the contract is invalid`);
				}
			}
		}

		function validateCurrencyData(currency, currencyTypeForFailureMessage: string) {
			if (!currency) {
				throw new Error(`Currency data not found, please ensure the ${currencyTypeForFailureMessage} still exists`);
			}
			if (!currency[CURRENCY_CODE_FIELD_NAME]) {
				throw new Error(`The ${currencyTypeForFailureMessage} is not valid`);
			}
		}

		function validateCommoditiesInContract(commInCont) {
			if (!commInCont || commInCont.length === 0) {
				throw new Error(`No commodity data found in selected contract for parcel`);
			}

			// check if all elements in array commInCont has a defined 'commodity' field
			if (!commInCont.every(comm => comm[COMM_IN_CONTRACT_COMMODITY_FIELD_NAME])) {
				throw new Error(`The selected contract has an undefined commodity, please ensure that the 'Commodity' field for all commodites in the contract is not empty`);
			}

			// check if all elements have a defined 'price_per_uom' field if they are a payable commodity
			if (!commInCont.every(comm => (!comm[COMM_IN_CONTRACT_PAYABLE_COMMODITY_FIELD_NAME] || comm[COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME]))) {
				throw new Error(`The selected contract has an undefined base price Uom for commodity, please ensure that the 'Base Price Uom' field for all commodites in the contract is not empty`);
			}
		}
		
		function validateCommodityData(commodityData: any, commodity) {
			console.log('[validateCommodityData]');
			if (!commodityData) {
				throw new Error(`commodity data response is null`);
			}

			if (!commodityData[COMMODITY_NAME_FIELD_NAME]) {
				throw new Error(`Commodity name for commodity ${commodityData[COMMODITY_CODE_FIELD_NAME] ?? commodity} is undefined, please contact Navarch for assistance`);
			}

			if (!commodityData[COMMODITY_CODE_FIELD_NAME]) {
				throw new Error(`Commodity code for commodity ${commodityData[COMMODITY_NAME_FIELD_NAME] ?? commodity} is not defined, please contact Navarch for assistance`);
			}
		}

		function validatePricePerUom(pricePerUom: number, commodityName: string) {
			if (!pricePerUom ) {
				throw new Error(`Price per UOM for commodity ${commodityName} is not a valid`);
			}

			if (!pricePerUom[UNIT_SYMBOL_FIELD_NAME]) {
				throw new Error(`Price per UOM for commodity ${commodityName} does not have a valid unit symbol, please contact Navarch for assistance`);
			}
		}

		function validateChargePerUom(chargePerUom, commodityName: string) {
			if (!chargePerUom) {
				throw new Error(`Charge per UOM for commodity ${commodityName} is not a valid`);
			}

			if (!chargePerUom[UNIT_SYMBOL_FIELD_NAME]) {
				throw new Error(`Charge per UOM for commodity ${commodityName} does not have a valid unit symbol, please contact Navarch for assistance`);
			}
		}

		function validatePenaltyPerUom(penaltyPerUom, commodityName: string) {
			if (!penaltyPerUom) {
				throw new Error(`Penalty per UOM for commodity ${commodityName} is not a valid`);
			}

			if (!penaltyPerUom[UNIT_SYMBOL_FIELD_NAME]) {
				throw new Error(`Penalty per UOM for commodity ${commodityName} does not have a valid unit symbol, please contact Navarch for assistance`);
			}
		}

		function validatePriceMethod(priceMethod, id: number, commodity: string) {
			if (!priceMethod) {
				throw new Error(`Price method ${id} for commodity ${commodity} is not defined, please contact Navarch for assistance`);
			}

			if (!priceMethod[PRICE_METHOD_NAME_FIELD_NAME]) {
				throw new Error(`Price method ${id} for commodity ${commodity} has no name, please contact Navarch for assistance`);
			}
		}

		function validateCounterparty(counterparty: any) {
			console.log('[validateCounterparty]');
			if (!counterparty) {
				throw new Error(`Counterparty for parcel not found`);
			}

			if (!counterparty[COUNTERPARTY_NAME_FIELD_NAME]) {
				throw new Error(`No name defined for counterparty of the selected parcel`);
			}
		}

		function validateCounterpartyAddress(counterpartyAddress) {
			console.log('[validateCounterpartyAddress]');
			if (!counterpartyAddress || counterpartyAddress.length === 0) {
				throw new Error(`Counterparty address for parcel not found`);
			}

			if (!counterpartyAddress[0][COUNTERPARTY_ADDRESS_ADDRESS_FIELD_NAME]) {
				throw new Error(`No address defined for counterparty of the selected parcel`);
			}
		}

		function validateBuyerAddress(buyerAddress) {
			if (!buyerAddress) {
				throw new Error(`Buyer address for parcel not found`);
			}

			if (!buyerAddress[ADDRESS_LINE1_FIELD_NAME]) {
				throw new Error(`No address line 1 defined for buyer address of the selected parcel`);
			}

			if (!buyerAddress[ADDRESS_COUNTRY_FIELD_NAME]) {
				throw new Error(`No country defined for buyer address of the selected parcel`);
			}
		}

		function validateBuyerCountry(buyerCountry) {
			if (!buyerCountry) {
				throw new Error(`Something went wrong when getting the buyer's based country`);
			}
		}

		function validatePortOfOrigin(originPort) {
			if (!originPort) {
				throw new Error(`Origin port for parcel not found`);
			}

			if (!originPort[PORT_NAME_FIELD_NAME]) {
				throw new Error(`No name defined for origin port of the selected parcel`);
			}

			if (!originPort[PORT_COUNTRY_FIELD_NAME]) {
				throw new Error(`No country defined for origin port of the selected parcel`);
			}
		}

		function validatePortOfDestination(destinationPort) {
			if (!destinationPort) {
				throw new Error(`Destination port for parcel not found`);
			}

			if (!destinationPort[PORT_NAME_FIELD_NAME]) {
				throw new Error(`No name defined for destination port of the selected parcel`);
			}

			if (!destinationPort[PORT_COUNTRY_FIELD_NAME]) {
				throw new Error(`No country defined for destination port of the selected parcel`);
			}
		}

		function validateVessel(vessel) {
			console.log('[validateVessel]');
			if (!vessel) {
				throw new Error(`Vessel for parcel not found`);
			}

			if (!vessel[VESSEL_NAME_FIELD_NAME]) {
				throw new Error(`No name defined for vessel of the selected parcel`);
			}
		}

		function validateCompanyData(company) {
			console.log('[validateCompanyData]');
			if (!company) {
				throw new Error(`Company data not found`);
			}

			if (!company[COMPANY_NAME_FIELD_NAME]) {
				throw new Error(`Please set company name in Directories > Company`);
			}

			// if (!company[COMPANY_PHONE_CODE_FIELD_NAME]) {
			// 	throw new Error(`Please set company phone code in Directories > Company`);
			// }

			if (!company[COMPANY_LINE_1_FIELD_NAME]) {
				throw new Error(`Please set company address line 1 in Directories > Company`);
			}

			if (!company[COMPANY_COUNTRY_FIELD_NAME]) {
				throw new Error(`Please set the country the company is based in Directories > Company`);
			}

			// if (!company[COMPANY_PHONE_NUMBER_FIELD_NAME]) {
			// 	throw new Error(`Please set the company phone number in Directories > Company`);
			// }

			if (!company[COMPANY_SIGNATORY_NAME_FIELD_NAME]) {
				throw new Error(`Please set the company signatory name in Directories > Company`);
			}

			if (!company[COMPANY_SIGNATORY_TITLE_FIELD_NAME]) {
				throw new Error(`Please set the company signatory title in Directories > Company`);
			}

			if (!company[COMPANY_REMITTANCE_DETAILS_FIELD_NAME]) {
				throw new Error(`Please set the company remittance details in Directories > Company`);
			}

			if (!company[COMPANY_SIGNATURE_FIELD_NAME]) {
				throw new Error(`Please set the company signature in Directories > Company`);
			}
		}

		function validateCompanyPhoneCode(code) {
			if (!code) {
				throw new Error(`Company phone code not found, please ensure phone code selected for Directories > Company is valid`);
			}
			if (!code[COUNTRY_PHONE_CODE_FIELD_NAME]) {
				throw new Error(`Company country phone code not found, please contact Navarch support for assistance`);
			}
		}

		function validateCompanyCountry(country) {
			if (!country) {
				throw new Error(`Country not found, please ensure country selected for Directories > Company is valid`);
			}
			if (!country[COUNTRY_NAME_FIELD_NAME]) {
				throw new Error(`Country name not found, please contact Navarch support for assistance`);
			}
		}

		function validateRevisionInvoiceData(revisionInvoiceData) {
			if (!revisionInvoiceData) {
				throw new Error(`Revision invoice data not found`);
			}

			if (!revisionInvoiceData['invoice_number']) {
				throw new Error(`Revision invoice data does not have an invoice number in generated document`);
			}

			if (!revisionInvoiceData['balance_in_sellers_favor']) {
				throw new Error(`Revision invoice data does not have a valid 'Balance in Sellers Favor' in generated document`);
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.margin-top-16px {
	margin-top: 16px;
}
</style>
