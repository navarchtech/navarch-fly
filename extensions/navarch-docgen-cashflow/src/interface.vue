<template>
	<!-- <input :value="value" @input="handleChange($event.target.value)" /> -->
	<!-- create a button only interface for Directus-->
	<div v-if="!value">
		<v-button
			@click="() => generateCashflow()"
			:loading="isGeneraingDoc"
		>Generate Cashflow</v-button>
		<v-notice v-if="!!failureReason">
			{{ failureReason }}
		</v-notice>
	</div>
	<div v-else>
		<v-button
			@click="() => downloadDoc()"
		>Download Cashflow
		</v-button>
	</div>
	<v-button
		class="margin-top-16px"
		@click="() => copy()"
		:loading="isCopying"
	>Copy</v-button>
	
</template>

<script lang="ts">
import { defineComponent, ref, Ref, inject } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import {
	Bracket,
	GenericBracket,
	BracketConversions,
	BracketType,
	PayableAssayBracket,
	ChargeBracket,
	PenaltyBracket,
	BracketForEvaluation,
	RateType,
	ExpressionUnits,
	FinalValueAndExpression,
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
	UnitConversion,
	PayableMetalUnitConversionData,
	InvoiceParam,
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
					const totalDryWeight = group[methodKey][commodityKey].reduce((accumulator: number, currentValue: AssayLotsOrCompositeForInvoice) => accumulator + parseFloat(currentValue.dry_weight), 0);
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

		// function that takes a stringed number, removes the commas and parseFloats it, returns number as is if it is already a number
		function parseNumber(number: string | number) {
			console.log('[parseNumber]');
			if (typeof number === 'number') {
				return number;
			}
			if (!number || number === '-') {
				return 0;
			}
			// remove anything from 'number' that is not a -, digit or a decimal point
			const parsedNumber = parseFloat(number.replace(/[^\d.-]/g, ''));
			console.log(`[parseNumber] number: ${number} to ${parsedNumber}`);
			return parsedNumber;
		}

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
					return potentialValue;
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
			if (bracket.use_btc) {
				rate = 0;
				initialAdjustment = 0;
			} else {
				const escalatorReference = bracket.escalator_reference ?? 1;
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
			if (bracket.no_penalty) {
				rate = 0;
				initialAdjustment = 0;
			} else {
				const escalatorReference = bracket.escalator_reference ?? 1;
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
				expression = `${INITIAL_ADJUSMENT_EXISTS ? '(' : ''}${formatNumber(value, 4)}${INITIAL_ADJUSMENT_EXISTS ? ` - ${formatNumber(initialAdjustment, 4)})` : ''} / ${formatNumber(1, 4)} * ${currency ?? ''} ${formatNumber(rate, 4)}/${ratePerUom ?? ''}`;
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

		const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

		const ID_FIELD_NAME = 'id';
		const FOREIGN_KEY_FIELD_NAME ="foreign_key";
		const LOT_NUMBER_FIELD_NAME = 'lot_number';
		const METHOD_FIELD_NAME = 'method';

		const CASHFLOW_COLLECTION_NAME = 'navarch_cashflow';
		const CASHFLOW_FIELD_NAME = 'cashflow';

		const PARCEL_COLLECTION_NAME = 'navarch_parcel';
		const PARCEL_CONTRACT_FIELD_NAME = 'contract';
		const PARCEL_COUNTERPARTY_FIELD_NAME = 'counterparty';
		const PARCEL_ASSAY_RESULTS_FIELD_NAME = 'assay_results';
		const PARCEL_WEIGHT_RESULTS_FIELD_NAME = 'weight_result';
		const PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME = 'actual_arrival_date';
		const PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME = 'estimate_arrival_date';
		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		const PARCEL_INVOICE_DUE_DATE_FIELD_NAME = 'invoice_due_date';
		// const PARCEL_INVOICE_DATE_FIELD_NAME = 'invoice_date';
		const PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME = 'estimated_shipment_date';
		// const PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME = 'actual_shipment_date';
		const PARCEL_QP_SELECTION_FIELD_NAME = 'qp_selection';
		const PARCEL_VESSEL_FIELD_NAME = 'vessel';
		const PARCEL_ORIGIN_FIELD_NAME = 'origin';
		const PARCEL_DESTINATION_FIELD_NAME = 'destination';
		const PARCEL_SHIPMENT_CODE_FIELD_NAME = 'shipment_code';
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
		const CONTRACT_INVOICE_TYPE_FIELD_NAME = 'invoice_type';
		const CONTRACT_NAME_FIELD_NAME = 'name';
		const CONTRACT_GST_APPLICABLE_FIELD_NAME = 'gst_applicable';
		const CONTRACT_GST_RATE_FIELD_NAME = 'gst_rate';

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
		const COMM_IN_CONTRACT_PAYABLE_METAL_UOM_FIELD_NAME = 'payable_metal_uom';
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
		const COUNTERPARTY_CODENAME_FIELD_NAME = 'codename';
		const COUNTERPARTY_NAME_FIELD_NAME = 'name';
		// const COUNTERPARTY_ADDRESS_COLLECTION_NAME = 'navarch_counterparty_navarch_address';
		// const COUNTERPARTY_ADDRESS_COUNTERPARTY_FIELD_NAME = 'navarch_counterparty_id';
		// const COUNTERPARTY_ADDRESS_ADDRESS_FIELD_NAME = 'navarch_address_id';

		const COMPANY_COLLECTION_NAME = 'navarch_company';
		const COMPANY_NAME_FIELD_NAME = 'name';
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

		const INVOICE_COLLECTION_NAME = 'navarch_invoices';
		const INVOICE_PARCEL_FIELD_NAME = 'parcel';
		const INVOICE_ID_FIELD_NAME = 'id';
		const INVOICE_INVOICE_FIELD_NAME = 'invoice'; // the field that stores the path to the invoice pdf (a link to cloud stored pdf in production)
		const INVOICE_INVOICE_DATE_FIELD_NAME = 'invoice_date';
		const INVOICE_DOCUMENT_TYPE_FIELD_NAME = 'document_type';
		// const INVOICE_REVISION_INVOICE_FIELD_NAME = 'revision_invoice';
		const INVOICE_AMOUNT_PAID_FIELD_NAME = 'amount_paid';
		const INVOICE_INV_TYPE_FIELD_NAME = 'invoice_type';
		const INVOICE_WEIGHT_METHOD_FIELD_NAME = 'weight_method';
		const INVOICE_ASSAY_METHOD_FIELD_NAME = 'assay_method';

		const CASHFLOW_END_DATE_FIELD_NAME = 'end_date';
		const CASHFLOW_START_DATE_FIELD_NAME = 'start_date';
		
		const FORECAST_COLLECTION_NAME = 'navarch_forecast_price';
		const FORECAST_COMMODITY_FIELD_NAME = 'commodity';
		const FORECAST_PRICE_FIELD_NAME = 'price';
		const FORECAST_START_DATE_FIELD_NAME = 'start_date';
		const FORECAST_END_DATE_FIELD_NAME = 'end_date';
		const FORECAST_CASHFLOW_ID_FIELD_NAME = 'cashflow_forecast_id';

		const NUMBER_OF_DAYS_TO_FETCH_MORE_OF = 10;

		// This is a date set so far back in the past so it will be excluded when the final cashflow is filtered to only have invoices with due dates in the cashflow search range. This is for invoices whose Due Amount needs to be taken into consideration for other invoices but they themselves should not be in the cashflow
		const DATE_FOR_INVOICES_TO_BE_EXCLUDED_FROM_THE_CASHFLOW = new Date('0000');

		type INVOICE_TYPES = 'Advance' | 'Second Advance' | 'Third Advance' | 'Fourth Advance' | 'Provisional' | 'Second Provisional' | 'Third Provisional' | 'Fourth Provisional' | 'Final';
		const INVOICE_TYPE_RANKING = {
			'Advance': 0,
			'Second Advance': 1,
			'Third Advance': 2,
			'Fourth Advance': 3,
			'Provisional': 4,
			'Second Provisional': 5,
			'Third Provisional': 6,
			'Fourth Provisional': 7,
			'Final': 8
		}
		
		type ApplicableParcelData = {
			parcelIds: string[]
			parcelData: Record<string, any>,
			contractNameByParcelId: Record<string, string>,
			invoiceTypeParcel: { invoiceType: string, dueDate: Date, parcelId: string }[],
		}

		async function getApplicableParcelsData(): Promise<ApplicableParcelData> {
			const startDate = new Date(formValues.value[CASHFLOW_START_DATE_FIELD_NAME]);
			if (startDate.toString() === 'Invalid Date') {
				failureReason.value = 'Start date is invalid';
				throw new Error('Start date is invalid');
			}
			const endDate = new Date(formValues.value[CASHFLOW_END_DATE_FIELD_NAME]);
			if (endDate.toString() === 'Invalid Date') {
				failureReason.value = 'End date is invalid';
				throw new Error('End date is invalid');
			}

			// get all contracts, then get all payment advice data, and all related parcels to the contract
			const allContracts = await api.get(`/items/${CONTRACT_COLLECTION_NAME}`, {
				params: {
					fields: [
						CONTRACT_NAME_FIELD_NAME,
						ID_FIELD_NAME,
						CONTRACT_INVOICE_TYPE_FIELD_NAME
					]
				}
			});

			// console.log(`[getApplicableParcelsData] allContracts.data.data=${JSON.stringify(allContracts.data.data)}`);

			const INVOICE_TYPES_BY_PARCEL_ID: { [parcelId: string]: { invoiceType: string, dueDate: Date, parcelId: string, contractName: string, sortedListOfInvTypesFromContract: INVOICE_TYPES[] }[] } = {};

			for (const contract of allContracts.data.data) {
			// allContracts.data.data.forEach(async (contract: any) => {
			// await Promise.all(allContracts.data.data.map(async contract => {
				// console.log(`[getApplicableParcelsData] contract=${JSON.stringify(contract)}`);
				const allPaymentInformation = await api.get(`/items/${INVOICE_TYPE_COLLECTION_NAME}`, {
					params: {
						filter: {
							[INVOICE_TYPE_RELATED_CONTRACT_FIELD_NAME]: {
								"_eq": contract[ID_FIELD_NAME]
							}
						},
						fields: [
							INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME,
							INVOICE_TYPE_PAYMENT_ADVICE_DAYS_FIELD_NAME,
							INVOICE_TYPE_PAYMENT_ADVICE_DAY_TYPE_FIELD_NAME,
							INVOICE_TYPE_PAYMENT_ADVICE_REF_DAY_FIELD_NAME,
							// INVOICE_TYPE_PAYMENT_ADVICE_FINAL_INV_REF_DAY_FIELD_NAME
						]
					}
				});

				console.log(`[getApplicableParcelsData] allPaymentInformation.data.data=${JSON.stringify(allPaymentInformation.data.data)}::${contract[CONTRACT_NAME_FIELD_NAME]}`);

				// Fetching dates for all parcels related to the contract, and then filtering out the ones that are applicable
				const parcels = await api.get(`/items/${PARCEL_COLLECTION_NAME}`, {
					params: {
						filter: {
							[PARCEL_CONTRACT_FIELD_NAME]: {
								"_eq": contract[ID_FIELD_NAME]
							}
						},
						fields: [
							ID_FIELD_NAME,
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME,
							PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME,
							PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME,
							PARCEL_INVOICE_DUE_DATE_FIELD_NAME,
						]
					}
				});

				// console.log(`[getApplicableParcelsData] parcels.data.data=${JSON.stringify(parcels.data.data)}::${contract[CONTRACT_NAME_FIELD_NAME]}`);

				// This is a sorte list of the invoice types all parcels related to this contract will have. It is used to determine if the earliest invoice that will be displayed in the cashflow has an earlier invoice that won't be displayed, if so, then its due total needs to be fetched/evaluated to calcualte the Due Total of the first invoice for display in cashflow
				const sortedListOfPossibleInvTypes: INVOICE_TYPES[] = allPaymentInformation.data.data
					.map((paymentInformation: any) => paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME] as INVOICE_TYPES)
					.sort((a: INVOICE_TYPES, b: INVOICE_TYPES) => {
						return INVOICE_TYPE_RANKING[a] - INVOICE_TYPE_RANKING[b];
					});
				console.log(`[getApplicableParcelsData] 1-sortedListOfPossibleInvTypes=${JSON.stringify(sortedListOfPossibleInvTypes)}::${contract[CONTRACT_NAME_FIELD_NAME]}`);
				for (const paymentInformation of allPaymentInformation.data.data) {
					/**
					 * START: Due Date
					 */
					const paymentAdvice = {
						days: paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_DAYS_FIELD_NAME],
						day_type: paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_DAY_TYPE_FIELD_NAME],
						ref_day: paymentInformation[INVOICE_INV_TYPE_FIELD_NAME] === 'Final' ? 'QP Month + n days' : paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_REF_DAY_FIELD_NAME],
					}
					// console.log(`[getApplicableParcelsData] ref day: ${paymentAdvice['ref_day']}; days: ${paymentAdvice['days']}; day_type: ${paymentAdvice['day_type']}`);
					if (!paymentAdvice) {
						throw new Error(`Contract ${contract[CONTRACT_NAME_FIELD_NAME]} does not have a payment advice for invoice type ${paymentInformation[INVOICE_INV_TYPE_FIELD_NAME]}`);
					}
					let readablePaymentAdviceRefDayType = '';
					let refDayAsString;

					for (const parcel of parcels.data.data) {
						// -------------------------------------------------------------------------------------------------------------------------------------------------
						// This generates a list of parcels that are to be shown in the cashflow because their due dates fall within the Cashflow's search range
						// -------------------------------------------------------------------------------------------------------------------------------------------------
						// console.log(`[getApplicableParcelsData] parcel=${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::${contract[CONTRACT_NAME_FIELD_NAME]}:${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}:${paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]}`);


						// First check if the parcel already has an existing invoice
						const invoiceIfItExists = await api.get(`/items/${INVOICE_COLLECTION_NAME}`, {
							params: {
								filter: {
									[INVOICE_PARCEL_FIELD_NAME]: {
										"_eq": parcel[ID_FIELD_NAME]
									},
									[INVOICE_INV_TYPE_FIELD_NAME]: {
										"_eq": paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]
									},
									[INVOICE_INVOICE_FIELD_NAME]: {
										"_nnull": true
									},

									// // No need to bother whether its been paid or not, just get it here and filter it out later
									// [INVOICE_AMOUNT_PAID_FIELD_NAME]: {
									// 	"_null": true
									// }
								},
								fields: [
									INVOICE_INVOICE_FIELD_NAME // just need to fetch the due_date from here
								]
							}
						});

						let dueDate: Date;
						if (invoiceIfItExists.data?.data?.length > 0 && !!invoiceIfItExists.data?.data[0][INVOICE_INVOICE_FIELD_NAME]) {
							dueDate = new Date(invoiceIfItExists.data.data[0][INVOICE_INVOICE_FIELD_NAME]['due_date']);
							console.log(`[getApplicableParcelsData] exsiting invoice found with due date=${dueDate}::${contract[CONTRACT_NAME_FIELD_NAME]}:${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}:${paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]}`);
							// if dueDate is not between start date and end date, then mark its due date as such to be filtered out later, only keeping this here in case invoices for this parcel that come after this fall within the cashflow range and need the values here
							if (dueDate < startDate && dueDate > endDate) {
								dueDate = DATE_FOR_INVOICES_TO_BE_EXCLUDED_FROM_THE_CASHFLOW;
							}

							// add parcel to list of parcels to generate invoices for
							if (!INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]]) {
								INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]] = [];
							}
							INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]].push({ 
								invoiceType: paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME], 
								dueDate, 
								parcelId: parcel[ID_FIELD_NAME],
								contractName: contract[CONTRACT_NAME_FIELD_NAME],
								sortedListOfInvTypesFromContract: sortedListOfPossibleInvTypes // TODO: this is a focking mess and waste of memory to have to store the same sorted list of invoice types for each object, it's going to be the same one for each Parcel in this object anyway, clean this up in v2 of this generator
							});

							// If there already is an existing invoice, then no need to figure out the due date anymore, continue to the next parcel
							continue;
						}


						switch (paymentAdvice['ref_day']) {
							case 'Arrival Date':
								readablePaymentAdviceRefDayType = 'Actual Arrival Date from the Parcel form';
								refDayAsString = parcel[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? parcel[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
								break;
							case 'B/L Date':
								readablePaymentAdviceRefDayType = 'B/L Date (or Estimated Shipment Date) from the Parcel form';
								refDayAsString = parcel[PARCEL_BL_DATE_FIELD_NAME] ?? parcel[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
								break;
							case 'Invoice Date':
								readablePaymentAdviceRefDayType = 'Invoice Date (using the B/L Date or Estimated Shipment Date from the Parcel form)';
								refDayAsString = parcel[PARCEL_BL_DATE_FIELD_NAME] ?? parcel[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
								break;
							case 'Estimated Shipment Date':
								readablePaymentAdviceRefDayType = 'Estimated Shipment Date from the Parcel form';
								refDayAsString = parcel[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
								break;
							case 'QP Month + n days':
								const payableCommodities = await api.get(`items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}`, {
									params: {
										filter: {
											[COMM_IN_CONTRACT_CONTRACT_FIELD_NAME]: {
												"_eq": contract[ID_FIELD_NAME]
											},
											[COMM_IN_CONTRACT_PAYABLE_COMMODITY_FIELD_NAME]: {
												"_eq": true
											}
										},
										fields: [
											COMM_IN_CONTRACT_QUOTATIONAL_PERIODS_FIELD_NAME
										]
									}
								});

								// console.log(`[getApplicableParcelsData] payableCommodities=${JSON.stringify(payableCommodities)}::${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}:${paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]}`);

								if (!Array.isArray(payableCommodities.data.data) || payableCommodities.data.data.length === 0) {
									throw new Error(`Contract ${contract[CONTRACT_NAME_FIELD_NAME]} does not have any payable commodities`);
								}

								const listOfDefaultQpsForPayableCommodities = payableCommodities.data.data.map(comm => comm[COMM_IN_CONTRACT_QUOTATIONAL_PERIODS_FIELD_NAME].find(qp => !!qp.default));
								// console.log(`[getApplicableParcelsData] listOfDefaultQpsForPayableCommodities=${JSON.stringify(listOfDefaultQpsForPayableCommodities)}::${contract[CONTRACT_NAME_FIELD_NAME]}:${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}:${paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]}`);
								// find from list of default qps the one that has the highest integer value for qp_period field
								const defaultQpWithHighestQpPeriod = listOfDefaultQpsForPayableCommodities.reduce((acc, qp) => {
									if (qp.qp_period > acc.qp_period) {
										return qp;
									}
									return acc;
								}, listOfDefaultQpsForPayableCommodities[0]);

								// console.log(`[getApplicableParcelsData] defaultQpWithHighestQpPeriod=${JSON.stringify(defaultQpWithHighestQpPeriod)}::${contract[CONTRACT_NAME_FIELD_NAME]}:${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}:${paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]}`);

								let refDayForQp;
								switch (defaultQpWithHighestQpPeriod['qp_code']) {
									case 'MAMA':
										readablePaymentAdviceRefDayType = 'Actual Arrival Date (or Estimated Arrival Date) from the Parcel form';
										refDayForQp = parcel[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? parcel[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
										break;
									case 'MOSS':
									case 'MOS':
									case 'MOAS':
										readablePaymentAdviceRefDayType = 'B/L Date (or Estimated Shipment Date) from the Parcel form';
										refDayForQp = parcel[PARCEL_BL_DATE_FIELD_NAME] ?? parcel[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
										break;
									default:
										throw new Error(`Unsupported QP code ${defaultQpWithHighestQpPeriod['qp_code']}, currently only supports MAMA, MOS, MOSS, and MOAS`);
								}
								if (isNullOrUndefined(refDayForQp)) {
									throw new Error(`Invalid reference date, please ensure the ${readablePaymentAdviceRefDayType} field(s) in parcel ${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]} are filled in`);
								}
								const lastDateOfQpMonth = getLastDateOfMonthPlusMonths(new Date(refDayForQp), defaultQpWithHighestQpPeriod.qp_period);
								refDayAsString = lastDateOfQpMonth.toISOString();
								break;
							default:
								throw new Error(`Invalid reference day for payment advice: ${paymentAdvice['ref_day']}; please contact Navarch for support`);
						}
						if (refDayAsString === undefined || refDayAsString === null) {
							throw new Error(`Reference day for payment advice ${readablePaymentAdviceRefDayType} is empty in parcel ${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
						}
						// console.log(`[getApplicableParcelsData] refDayAsString=${refDayAsString}::${contract[CONTRACT_NAME_FIELD_NAME]}:${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}:${paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]}`);
						const refDate: Date = new Date(refDayAsString);

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
								throw new Error(`Please provide a valid Day Type (Cashflow) for ${contract[CONTRACT_NAME_FIELD_NAME]}:Final Invoice Type`);
						}
						console.log(`[getApplicableParcels] payment advice ref date: ${refDate.toString()} plus ${dayRange} ${dayType} equals due date: ${dueDate.toString()}::${contract[CONTRACT_NAME_FIELD_NAME]}:${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}:${paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]}`);
						
						// if dueDate is between start date and end date
						if (dueDate >= startDate && dueDate <= endDate) {
							// add parcel to list of parcels to generate invoices for
							if (!INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]]) {
								INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]] = [];
							}
							INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]].push({ 
								invoiceType: paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME], 
								dueDate, 
								parcelId: parcel[ID_FIELD_NAME],
								contractName: contract[CONTRACT_NAME_FIELD_NAME],
								sortedListOfInvTypesFromContract: sortedListOfPossibleInvTypes // TODO: this is a focking mess and waste of memory to have to store the same sorted list of invoice types for each object, it's going to be the same one for each Parcel in this object anyway, clean this up in v2 of this generator
							});
						}
						// console.log(`[getApplicableParcels] INVOICE_TYPES_BY_PARCEL_ID=${JSON.stringify(INVOICE_TYPES_BY_PARCEL_ID)}::${contract[CONTRACT_NAME_FIELD_NAME]}:${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]}:${paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]}`);
						/**
						 * END: Due Date
						 */

						// Override the original calculated value from payment information if instead there is Invoice Due Date
						if (!!parcel[PARCEL_INVOICE_DUE_DATE_FIELD_NAME]) {
							const invoiceDueDates = parcel[PARCEL_INVOICE_DUE_DATE_FIELD_NAME] as Record<string, { due_date: string | undefined | null, locked: boolean, inv_type: string }>;
							const invoiceDueDate = invoiceDueDates[paymentInformation[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME] as INVOICE_TYPES];
							// Since we're going through each invoice type as the top most for loop, just check for this inv type only for now
							/**
							 * Invoice Due Date in Parcel example
							 * "invoice_due_date": {
									"Advance": {
										"due_date": "2024-09-19",
										"locked": true,
										"inv_type": "Advance"
									},
									"Provisional": {
										"locked": false,
										"inv_type": "Provisional"
									},
									"Final": {
										"locked": false,
										"inv_type": "Final"
									}
								},
							*/

							// If due date is provided, then replace the estimated due date and check if it falls within the cashflow range, do nothing if due_date is not provided and go with whatever the estimated due date is (either it will be in here if in cashflow date range, or won't be in here if out of range)
							if (!!invoiceDueDate && !!invoiceDueDate.due_date) {
								const invoiceType = invoiceDueDate.inv_type;
								const dueDate = new Date(invoiceDueDate.due_date);
								if (dueDate.toString() === 'Invalid Date') {
									throw new Error(`Invoice Due Date field in the parcel ${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]} has an invalid due date for invoice type ${invoiceType}`);
								}
								if (dueDate >= startDate && dueDate <= endDate) {
									// if the due date is within the date range, find and replace the existing object evaluated from the contract payment info if it exists; the only change should be the due date if different from the estimated one based on contract payment info
									if (!INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]]) {
										// Will go in here if all the estimated due dates based on contract payment info don't fall within this range, create the list here
										INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]] = [];
									}
									const replacementInvoice = {
										invoiceType,
										dueDate,
										parcelId: parcel[ID_FIELD_NAME],
										contractName: contract[CONTRACT_NAME_FIELD_NAME],
										sortedListOfInvTypesFromContract: sortedListOfPossibleInvTypes
									};

									// find the index of the invoice type in the array of invoice types for the parcel, and replace with replacementInvoice
									const index = INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]].findIndex(invoice => invoice.invoiceType === invoiceType);
									if (index !== -1) {
										// if originally, the estimated due date falls in the cashflow range, then replace it with the Invoice Due Date's due date for this invoice type
										INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]][index] = replacementInvoice;
									} else {
										// will go in here when the estimated due date based on contract payment info does not fall within the cashflow range for this Invoice Type, but other invoice types for this parcel do fall in range
										INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]].push(replacementInvoice);
									}
								} else if (!!INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]]) {
									// this is technically an else condition if the due date from the Invoice Due Date field is not in the cashflow range. The else-if condition for this block is to check that there is something to remove at all (whether the estimated due date based on contract payment info is in the range or not) and only remove if there is something that may need removing
									// if the Invoice Due Date for this invoice type is set for this parcel, but the due date is not in range,
									
									// find the index of the invoice type in the array of invoice types for the parcel, and remove it
									const index = INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]].findIndex(invoice => invoice.invoiceType === invoiceType);
									if (index !== -1) {
										// if originally, the estimated due date falls in the cashflow range but the Invoice Due Date does not, then remove it
										INVOICE_TYPES_BY_PARCEL_ID[parcel[ID_FIELD_NAME]].splice(index, 1);
									} // else, if the estimated due date does not fall in the cashflow range, then it won't be in the list to begin with, so do nothing
								}
							}
						}
					}
				}

			};
			
			// -------------------------------------------------------------------------------------------------------------------------------------------------
			// This is to add in the invoice types that come before the invoices to display. For example, if only the Final invoice of a parcel falls within the Cashflow search range, then need to include the invoice of a type right before Final for that parcel so the Due Total can be appropriately calculated. Be sure to remove this invoice from the list later on before generating the cashflow doc
			// At this point, all processing should be done and only the existing/valuation invoices that have due dates within the cashflow search range should be in the list, so we can now add in the invoices that come before the earliest one for each parcel (if there is one) in the list
			// -------------------------------------------------------------------------------------------------------------------------------------------------
			console.log(`[getApplicableParcels] invoice types by parcel id: ${JSON.stringify(INVOICE_TYPES_BY_PARCEL_ID)}`);
			// iterate through every value in INVOICE_TYPES_BY_PARCEL_ID and add in the invoice types that come before the earliest invoice in the list
			Object.values(INVOICE_TYPES_BY_PARCEL_ID).forEach(invTypeListPerParcel => {
				if (!invTypeListPerParcel || invTypeListPerParcel.length === 0) {
					// if undefined OR if no invoices for this parcel to show in cashflow, so do nothing and move onto the next parcel
					return;
				}
				// go through the list of invoice types for each parcel and find the earliest one by invoice type
				const earliestInvoiceType = invTypeListPerParcel.reduce((acc, invType) => {
					if (!!acc && INVOICE_TYPE_RANKING[invType.invoiceType as INVOICE_TYPES] < INVOICE_TYPE_RANKING[acc.invoiceType as INVOICE_TYPES]) {
						return invType;
					}
					return acc;
				}, invTypeListPerParcel[0]);
				console.log(`[getApplicableParcels] earliestInvoiceType=${JSON.stringify(earliestInvoiceType)}`);
				if (!earliestInvoiceType) {
					// this should never happen, but just in case
					throw new Error(`Could not find the earliest invoice type for parcel with ID: ${invTypeListPerParcel[0]?.parcelId}`);
				}
				if (new Date(earliestInvoiceType.dueDate) < startDate) {
					// It should not go in here, all the invoices needed for cashflow should be within the date range before an earlier one is added in, but just in case
					return;
				}
				console.log(`[getApplicableParcelsData] sorted list of possible inv types=${JSON.stringify(earliestInvoiceType.sortedListOfInvTypesFromContract)}`);
				const index = earliestInvoiceType.sortedListOfInvTypesFromContract.findIndex(invType => invType === earliestInvoiceType.invoiceType as INVOICE_TYPES);
				if (index === -1) {
					// this should never happen, but just in case
					throw new Error(`Could not find the invoice type ${earliestInvoiceType.invoiceType} in the list of Contract Payment Information (${earliestInvoiceType.sortedListOfInvTypesFromContract.join(', ')}) for parcel with ID: ${earliestInvoiceType.parcelId}`);
				}
				if (index > 0) {
					// if the earliest invoice type is not the first one in the list, then add the invoice type that comes before it to the list

					if (!INVOICE_TYPES_BY_PARCEL_ID[earliestInvoiceType.parcelId]) {
						// this should never happen, but just in case
						throw new Error(`No invoice data recorded for parcel with ID: ${earliestInvoiceType.parcelId} when evaluating due dates for each invoice type`);
					}
					INVOICE_TYPES_BY_PARCEL_ID[earliestInvoiceType.parcelId].push({
						invoiceType: earliestInvoiceType.sortedListOfInvTypesFromContract[index - 1] as INVOICE_TYPES,
						dueDate: DATE_FOR_INVOICES_TO_BE_EXCLUDED_FROM_THE_CASHFLOW, // set it as the date for the year 0, this field wasn't originally designed to take null value, so I don't want to change that, no one should be trying to calculate cashflow for this date
						parcelId: earliestInvoiceType.parcelId,
						contractName: earliestInvoiceType.contractName,
						sortedListOfInvTypesFromContract: earliestInvoiceType.sortedListOfInvTypesFromContract
					});
				}
			})

			// console.log(`[getApplicableParcels] INVOICE_TYPES_BY_PARCEL_ID=${JSON.stringify(INVOICE_TYPES_BY_PARCEL_ID)}`);

			// calculate the due date for each parcel's invoices based on the payment advice data and save them if they are within the date range

			// save list of invoice types by parcel id

			// get parcel ids
			const parcelIds = Object.keys(INVOICE_TYPES_BY_PARCEL_ID);

			// get valid parcel data
			let validParcelData;

			// split parcelIds into chunks of 15 to avoid hitting the max url length, call the api for each chunk and merge the results into validParcelData
			for (let i = 0; i < parcelIds.length; i += 15) {
				const chunk = parcelIds.slice(i, i + 15);
				const chunkParcelData = await api.get(`/items/${PARCEL_COLLECTION_NAME}`, {
					params: {
						filter: {
							[ID_FIELD_NAME]: {
								"_in": chunk
							}
						},
						fields: [
							ID_FIELD_NAME,
							PARCEL_CONTRACT_FIELD_NAME,
							PARCEL_COUNTERPARTY_FIELD_NAME,
							PARCEL_ASSAY_RESULTS_FIELD_NAME,
							PARCEL_WEIGHT_RESULTS_FIELD_NAME,
							PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME,
							PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME,
							PARCEL_QP_SELECTION_FIELD_NAME,
							PARCEL_VESSEL_FIELD_NAME,
							PARCEL_ORIGIN_FIELD_NAME,
							PARCEL_DESTINATION_FIELD_NAME,
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							PARCEL_ADJUSTMENTS_FIELD_NAME,
							PARCEL_PARCEL_FINALISED_FIELD_NAME,
							PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME,
							PARCEL_ASSAY_RESULTS_FIELD_NAME
						]
					}
				});
				if (!validParcelData) {
					validParcelData = chunkParcelData;
				} else {
					validParcelData.data.data = validParcelData.data.data.concat(chunkParcelData.data.data);
				}
			}
			// const validParcelData = await api.get(`/items/${PARCEL_COLLECTION_NAME}`, {
			// 	params: {
			// 		filter: {
			// 			[ID_FIELD_NAME]: {
			// 				"_in": parcelIds
			// 			}
			// 		},
			// 		fields: [
			// 			ID_FIELD_NAME,
			// 			PARCEL_CONTRACT_FIELD_NAME,
			// 			PARCEL_COUNTERPARTY_FIELD_NAME,
			// 			PARCEL_ASSAY_RESULTS_FIELD_NAME,
			// 			PARCEL_WEIGHT_RESULTS_FIELD_NAME,
			// 			PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
			// 			PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME,
			// 			PARCEL_BL_DATE_FIELD_NAME,
			// 			PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME,
			// 			PARCEL_QP_SELECTION_FIELD_NAME,
			// 			PARCEL_VESSEL_FIELD_NAME,
			// 			PARCEL_ORIGIN_FIELD_NAME,
			// 			PARCEL_DESTINATION_FIELD_NAME,
			// 			PARCEL_SHIPMENT_CODE_FIELD_NAME,
			// 			PARCEL_ADJUSTMENTS_FIELD_NAME,
			// 			PARCEL_PARCEL_FINALISED_FIELD_NAME,
			// 			PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME,
			// 			PARCEL_ASSAY_RESULTS_FIELD_NAME
			// 		]
			// 	}
			// });

			// console.log(`[getApplicableParcels] validParcelData=${JSON.stringify(validParcelData)}`);

			if (!validParcelData.data.data || validParcelData.data.data.length !== parcelIds.length) {
				throw new Error(`Experiencing some network issues, please try again. If the issue persists, contact Navarch for support`);
			}


			const returnObject = {
				// make an object of parcel data by parcel id
				parcelData: validParcelData.data.data.reduce((acc: { [parcelId: string]: any }, parcel: any) => {
					acc[parcel[ID_FIELD_NAME]] = parcel;
					return acc;
				}, {}),
				contractNameByParcelId: parcelIds.reduce((acc, parcelId) => {
					acc[parcelId] = INVOICE_TYPES_BY_PARCEL_ID[parcelId][0].contractName;
					return acc;
				}, {}),
				// flat map the invoice types by parcel id values
				invoiceTypeParcel: parcelIds.flatMap(parcelId => INVOICE_TYPES_BY_PARCEL_ID[parcelId]),
				parcelIds
			}; // list of valid parcel and the required data

			console.log(`[getApplicableParcels] returnObject=${JSON.stringify(returnObject)}`);

			return returnObject;
		}

		type InvoiceParam = {
			parcelId: string,
			invoiceType: string,
			dueDate: Date,
			contractName: string,
			parcelData?: Record<string, any>,
			invoiceData?: Record<string, any>
		}

		async function generateInvoiceParamForParcel(data: ApplicableParcelData): Promise<InvoiceParam[]> {
			// generate invoice params based on parcel data
			/**
			 * INVOICE_PARCEL_FIELD_NAME
			 * INVOICE_INV_TYPE_FIELD_NAME
			 * 
			 * INVOICE_INVOICE_DATE_FIELD_NAME?
			 */

			const invoiceParams: InvoiceParam[] = [];
			let existingInvoices;

			// split parcelIds into chunks of 15 to avoid hitting the max url length, call the api for each chunk and merge the results into existingInvoices
			for (let i = 0; i < data.parcelIds.length; i += 15) {
				const chunk = data.parcelIds.slice(i, i + 15);
				const chunkExistingInvoices = await api.get(`/items/${INVOICE_COLLECTION_NAME}`, {
					params: {
						filter: {
							[INVOICE_PARCEL_FIELD_NAME]: {
								"_in": chunk
							},
							[INVOICE_INVOICE_FIELD_NAME]: {
								"_nnull": true
							}
						},
						fields: [
							INVOICE_PARCEL_FIELD_NAME,
							INVOICE_INV_TYPE_FIELD_NAME,
							INVOICE_INVOICE_FIELD_NAME,
							INVOICE_INVOICE_DATE_FIELD_NAME,
							INVOICE_AMOUNT_PAID_FIELD_NAME
						]
					}
				});
				if (!existingInvoices) {
					existingInvoices = chunkExistingInvoices;
				} else {
					existingInvoices.data.data = existingInvoices.data.data.concat(chunkExistingInvoices.data.data);
				}
			}
			// const existingInvoices = await api.get(`/items/${INVOICE_COLLECTION_NAME}`, {
			// 	params: {
			// 		filter: {
			// 			[INVOICE_PARCEL_FIELD_NAME]: {
			// 				"_in": data.parcelIds
			// 			},
			// 			[INVOICE_INVOICE_FIELD_NAME]: {
			// 				"_nnull": true
			// 			}
			// 		},
			// 		fields: [
			// 			INVOICE_PARCEL_FIELD_NAME,
			// 			INVOICE_INV_TYPE_FIELD_NAME,
			// 			INVOICE_INVOICE_FIELD_NAME,
			// 			INVOICE_INVOICE_DATE_FIELD_NAME,
			// 			INVOICE_AMOUNT_PAID_FIELD_NAME
			// 		]
			// 	}
			// });

			// TODO: how to handle existing revision invoices? Below is my solution, to be confirmed with Taylor
			// sort existing invoice data by invoice type and invoice date as a tie breaker between similar invoice types so the latest one is always first to be found
			existingInvoices.data.data.sort((a, b) => {
				const invoiceTypeComparison = INVOICE_TYPE_RANKING[a[INVOICE_INV_TYPE_FIELD_NAME]] - INVOICE_TYPE_RANKING[b[INVOICE_INV_TYPE_FIELD_NAME]];
				if (invoiceTypeComparison === 0) {
					return new Date(b[INVOICE_INVOICE_DATE_FIELD_NAME]).valueOf() - new Date(a[INVOICE_INVOICE_DATE_FIELD_NAME]).valueOf();
				}
				return invoiceTypeComparison;
			});

			for(const invTypeParcel of data.invoiceTypeParcel)	{
				const existingInvoiceForParcel = existingInvoices.data.data.find(inv => inv[INVOICE_PARCEL_FIELD_NAME] === invTypeParcel.parcelId && inv[INVOICE_INV_TYPE_FIELD_NAME] === invTypeParcel.invoiceType);
				if (!!existingInvoiceForParcel) {
					invoiceParams.push({
						parcelId: invTypeParcel.parcelId,
						invoiceType: invTypeParcel.invoiceType,
						contractName: data.contractNameByParcelId[invTypeParcel.parcelId],
						dueDate: !!existingInvoiceForParcel[INVOICE_AMOUNT_PAID_FIELD_NAME] ? DATE_FOR_INVOICES_TO_BE_EXCLUDED_FROM_THE_CASHFLOW  : invTypeParcel.dueDate, // exclude invoices that have been paid from the cashflow, even if their due dates fall within the cashflow range
						invoiceData: {...existingInvoiceForParcel[INVOICE_INVOICE_FIELD_NAME], amount_paid: existingInvoiceForParcel[INVOICE_AMOUNT_PAID_FIELD_NAME]}
					});
					// if there is an existing invoice for the parcel and invoice type, skip it
					continue;
				}
				invoiceParams.push({
					parcelId: invTypeParcel.parcelId,
					invoiceType: invTypeParcel.invoiceType,
					contractName: data.contractNameByParcelId[invTypeParcel.parcelId],
					dueDate: invTypeParcel.dueDate,
					parcelData: data.parcelData[invTypeParcel.parcelId]
				});
			}

			console.log(`[generateInvoiceParamForParcel] invoiceParams=${JSON.stringify(invoiceParams)}`);

			// if there is a real invocie, use that one's Invoice Date
			return invoiceParams;
		}

		function convertJSONToCSV(jsonList) {
			// Gather all unique keys from the objects
			const headers = [...new Set(jsonList.flatMap(obj => Object.keys(obj)))] as string[];

			// Move all these columns in order to the end of the CSV
			const endColumns = ['Total Penalties USD', 'Total Adjustments USD', 'Total Revenues USD', 'Parcel Value USD', 'Parcel Payable Value USD', 'Payments USD', 'GST Payable USD', 'Due Total'];
			for (const column of endColumns) {
				const index = headers.indexOf(column);
				if (index !== -1) {
					headers.splice(index, 1);
					headers.push(column);
				}
			}

			// Map the JSON data to CSV data
			const data = jsonList.map(obj => headers.map(header => {
				const value = obj[header] || '';
				// If value is a string and contains a comma, wrap it in double quotes
				return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
			}).join(','));

			// Combine the headers and data into a single CSV string
			const csv = [headers.join(','), ...data].join('\n');

			return csv;
		}

		function downloadCSV(csvData) {
			// Create a Blob from the CSV data
			const blob = new Blob([csvData], { type: 'text/csv' });

			// Create a URL from the Blob
			const url = URL.createObjectURL(blob);

			// Create a temporary anchor element
			const a = document.createElement('a');

			// Set the href of the anchor to the URL
			a.href = url;

			// Set the download attribute of the anchor to the desired file name
			a.download = `Cashflow-[${getCurrentDateTime()}]-Valuation_Period-(${formatDateYYYYMMDD(new Date(formValues.value['start_date']), false)}~${formatDateYYYYMMDD(new Date(formValues.value['end_date']), false)}).csv`

			// Append the anchor to the body
			document.body.appendChild(a);

			// Click the anchor to open the URL in a new tab
			a.click();

			// Remove the anchor from the body
			document.body.removeChild(a);
		}

		function getCurrentDateTime() {
			const date = new Date();
			// return local date time in ISO format
			const offsetMs = date.getTimezoneOffset() * 60 * 1000;
			const msLocal =  date.getTime() - offsetMs;
			const dateLocal = new Date(msLocal);
			const iso = dateLocal.toISOString();
			const isoLocal = iso.slice(0, 19);
			// Get local timezone GMT offset in hours
			const offsetHours = (date.getTimezoneOffset() / 60)*(-1);

			// replace : with '' and add GMT offset
			return `${isoLocal}GMT${offsetHours > 0 ? '+' : ''}${offsetHours}`.replace(/:/g, '');
		}

		async function generateCashflow() {
			failureReason.value = '';
			try {
				isGeneraingDoc.value = true;

				const data = await getApplicableParcelsData();


				const allInvoiceParams = await generateInvoiceParamForParcel(data);

				console.log(`[generateCashflow] form values=${JSON.stringify(formValues.value)}`);
				// asynchronously call for generateInvoice as a list
				const cashflow = await Promise.all(allInvoiceParams.map(async invoiceParam => {
					console.log(`[generateCashflow] invoiceParam=${JSON.stringify(invoiceParam)}`);
					return await generateInvoice(invoiceParam);
				}));

				const filteredCashflow = cashflow.filter(cashflow => !!cashflow);
				const cashflowWithDueTotalAndMetadata = evaluateDuePaymentsAndGstForCashflow(filteredCashflow);
				const cashflowWithDueTotal = cashflowWithDueTotalAndMetadata.map(cashflow => {
					delete cashflow['metadata'];
					return cashflow;
				});
				const startDate = new Date(formValues.value[CASHFLOW_START_DATE_FIELD_NAME]);
				const endDate = new Date(formValues.value[CASHFLOW_END_DATE_FIELD_NAME]);

				// any invoices that don't have their due dates fall in the cashflow date range but were added in so the Due Total of the invoices that do fall in the range can be calculated, remove them
				const cashflowWithOnlyInvoicesInTheSetDateRange = cashflowWithDueTotal.filter(cashflow => new Date(cashflow['Invoice Due Date']) >= startDate && new Date(cashflow['Invoice Due Date']) <= endDate);

				emit('input', cashflowWithOnlyInvoicesInTheSetDateRange);
				console.log(`[generateCashflow] cashflow response: ${JSON.stringify(cashflowWithOnlyInvoicesInTheSetDateRange)}`);

				// convert json list cashflow to csv
				const cashflowAsCsv = convertJSONToCSV(cashflowWithOnlyInvoicesInTheSetDateRange);
				console.log(`[generateCashflow] cashflow as csv: ${cashflowAsCsv}`);
				isGeneraingDoc.value = false;
				downloadDoc(cashflowAsCsv);
			} catch (error) {
				failureReason.value = error.message;
			} finally {
				isGeneraingDoc.value = false;
			}
			

			
			// 	// // open the invoice in a new tab
			// 	// window.open(`file:///${response.data}`);
			// } catch (error) {
			// 	isGeneraingDoc.value = false;
			// 	console.log(`generating invoice went wrong due to: ${error}`);
			// 	failureReason.value = error;
			// 	return;
			// }
		}

		function evaluateDuePaymentsAndGstForCashflow(cashflowAsJson: any[]) {
			// every item in cashflowAsJson has a 'Parcel' field, group by that field
			const cashflowByParcel = cashflowAsJson.reduce((acc, cashflow) => {
				if (!acc[cashflow['Parcel']]) {
					acc[cashflow['Parcel']] = [];
				}
				acc[cashflow['Parcel']].push(cashflow);
				return acc;
			}, {});

			// for each array in cashflowByParcel, sort by 'Invoice Due Date' field
			Object.keys(cashflowByParcel).forEach(parcel => {
				cashflowByParcel[parcel].sort((a, b) => {
					if (a['metadata']['invoiceTypeRanking'] < b['metadata']['invoiceTypeRanking']) {
						return -1;
					}
					if (a['metadata']['invoiceTypeRanking'] > b['metadata']['invoiceTypeRanking']) {
						return 1;
					}
					return 0;
				});
			});

			console.log(`[evaluateDuePaymentsForCashflow] cashflowByParcel=${JSON.stringify(cashflowByParcel)}`);

			// for each element in each array in cashflowByParcel, calculate the due payment as 'Parcel Payable Value(Below Line) USD' of the current element minus the 'Parcel Payable Value(Below Line) USD' of the element before, use 0 for the first element
			Object.keys(cashflowByParcel).forEach(parcel => {
				cashflowByParcel[parcel].forEach((cashflow, index) => {
					if (!cashflow['Parcel Payable Value USD'] || cashflow['Parcel Payable Value USD'] === '-') {
						throw new Error(`Parcel ${parcel} for invoice ${cashflow['Invoice']} does not have a Parcel Payable Value USD`);
					}
					const curr = parseNumber(cashflow['Parcel Payable Value USD']);
					if (isNaN(curr)) {
						throw new Error(`Parcel ${parcel} for invoice ${cashflow['Invoice']} has an invalid Parcel Payable Value USD of ${cashflow['Parcel Payable Value USD']}`);
					}

					if (index === 0) {
						cashflow['Payments USD'] = (!!cashflow['Payments USD'] && cashflow['Payments USD'] !== '-') ? cashflow['Payments USD'] : '0.00';
						const paidAmount = parseNumber(cashflow['Payments USD']);
						cashflow['Due Total'] = formatNumber(curr - paidAmount);
					} else {
						if (!cashflowByParcel[parcel][index - 1]['Parcel Payable Value USD'] || cashflowByParcel[parcel][index - 1]['Parcel Payable Value USD'] === '-') {
							throw new Error(`Parcel ${parcel} for invoice ${cashflow['Invoice']} does not have a Parcel Payable Value USD for the previous invoice`);
						}
						const prev = parseNumber(cashflowByParcel[parcel][index - 1]['Parcel Payable Value USD']);
						if (isNaN(prev)) {
							throw new Error(`Parcel ${parcel} for invoice ${cashflow['Invoice']} has an invalid Parcel Payable Value USD of ${cashflowByParcel[parcel][index - 1]['Parcel Payable Value USD']} for the previous invoice`);
						}

						cashflow['Due Total'] = formatNumber(curr - prev);

						if (!cashflow['Payments USD'] || cashflow['Payments USD'] === '-') {
							// assign it the value from the previous cashflow if the current one does not have a Payments USD value
							cashflow['Payments USD'] = cashflowByParcel[parcel][index - 1]['Payments USD'];


							// calculate GST here if applicable. Process what GST payable would be for valuation invoice, but for existing invoices, take their values as is (use Payments USD field as an indicator that it's an existing invoice)
							if (!!cashflow['GST Payable USD'] && cashflow['GST Payable USD'] !== '-') {
								// if the GST Payable USD field has a valid value, then GST is applicable, and because Payments USD field is originally not present, then it should be a valuation invoice
								cashflow['GST Payable USD'] = formatNumber(parseNumber(cashflow['GST Payable USD']) - parseNumber(cashflowByParcel[parcel][index - 1]['GST Payable USD']));
							}
						}
					}
				});
			});

			console.log(`[evaluateDuePaymentsForCashflow] cashflowByParcel=${JSON.stringify(cashflowByParcel)}`);

			// flat map the arrays in cashflowByParcel
			const cashflowAsJsonWithDueTotal = Object.keys(cashflowByParcel).flatMap(parcel => cashflowByParcel[parcel]);
			console.log(`[evaluateDuePaymentsForCashflow] cashflowAsJsonWithDueTotal=${JSON.stringify(cashflowAsJsonWithDueTotal)}`);
			return cashflowAsJsonWithDueTotal;
		}

		class NonFatalError extends Error {
			constructor(message: string) {
				super(message);
				this.name = 'NonFatalError';
				Object.setPrototypeOf(this, NonFatalError.prototype);
			}
		}

		async function generateInvoice(invoiceParam: InvoiceParam) {
			failureReason.value = '';
			isGeneraingDoc.value = true;
			try {
				if (!!invoiceParam.invoiceData) {
					console.log(`[generateInvoice][invoice=${JSON.stringify(invoiceParam.invoiceData['invoice_number'])}::parcel=${invoiceParam.invoiceData['parcel']}] using existing invoice=${JSON.stringify(invoiceParam.invoiceData)}`);
					const invData = invoiceParam.invoiceData;
					const counterpartyData = await api.get(`/items/${COUNTERPARTY_COLLECTION_NAME}`, {
						params: {
							filter: {
								[COUNTERPARTY_NAME_FIELD_NAME]: {
									"_eq": invData['buyer']
								}
							},
							fields: [
								COUNTERPARTY_CODENAME_FIELD_NAME
							]
						}
					});
					validateCounterparty(counterpartyData.data.data[0]);

					const parcelDataWithArrivalDateAndBLDate = await api.get(`/items/${PARCEL_COLLECTION_NAME}`, {
						params: {
							filter: {
								[ID_FIELD_NAME]: {
									"_eq": invoiceParam.parcelId
								}
							},
							fields: [
								PARCEL_BL_DATE_FIELD_NAME,
								PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
								PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME
							]
						}
					});

					console.log(`[generateInvoice][invoice=${JSON.stringify(invoiceParam.invoiceData['invoice_number'])}::parcel=${invoiceParam.invoiceData['parcel']}] parcel date data=${JSON.stringify(parcelDataWithArrivalDateAndBLDate.data.data)}`);

					const arrivalDateData = parcelDataWithArrivalDateAndBLDate.data.data[0];

					return {
						"Parcel": invData['parcel'],
						"Counterparty": counterpartyData.data.data[0][COUNTERPARTY_CODENAME_FIELD_NAME],
						// "buyer_address": BUYER_ADDRESS,
						// "shipment_code": parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME],
						"Vessel": invData['vessel'] === 'N/A' ? 'Vessel TBA' : invData['vessel'],
						"Shipment Date": invData['bl_date'],
						"Arrival Date": !!arrivalDateData[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ? formatDate(new Date(arrivalDateData[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME])) : (!!arrivalDateData[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME] ? formatDate(new Date(arrivalDateData[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME])) : 'N/A'),

						"Status": !!parcelDataWithArrivalDateAndBLDate[PARCEL_BL_DATE_FIELD_NAME] ? 'Unfinalised' : 'Planned',
						"Revision": "Original",

						"Invoice": `${invData['invoice_type']}:Original`,
						// "invoice_date": formatDate(INVOICE_DATE),
						// "revision": (!!REVISION_INV_NUMBER && !!REVISION_TOTAL_PAYMENT) ? REVISION_INV_DOCUMENT_TYPE : undefined,
						// "invoice_number": INVOICE_ID, //"CZ-100-GLS (#02)",

						// "port_of_loading": `${originPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`, //"Gold Coast, Australia",
						// "port_of_discharge": `${destinationPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${destinationPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`, //"CIF FO, Huangpu New Port, China",
						// "primary_commodity": `${PRIMARY_COMMODITY} Concentrates`,

						"Invoice Due Date": formatDate(invoiceParam.dueDate), // "3-Sept-2022",


						// "wet_weight": formatNumber(WEIGHT.wet_weight, 4), //"10,069.0000",
						// "wet_weight_uom": WEIGHT.wet_weight_uom, //"wmt",
						// "wet_weight_uom_name": capitaliseFirstLetter(WET_WEIGHT_UOM_NAME),
						// "moisture": formatNumber(WEIGHT.moisture, 4), //"10.5000",
						// "moisture_uom": "%",
						"Dry Weight": `${formatNumber(invData['dry_weight'], 2)}`,
						"Dry Weight UOM": invData['dry_weight_uom'],
						// "dry_weight_uom": WEIGHT.dry_weight_uom, // "dmt",
						// "dry_weight_uom_name": capitaliseFirstLetter(DRY_WEIGHT_UOM_NAME),

						// "total_deductions": "2,649,455.98",

						// "currency": currencyCode,

						// "commodities": COMMODITIES,
						...(await mapOutCommoditiesForCashflow(invData['commodities'], {
							dryWeight: invData['dry_weight'],
							dryWeightUom: invData['dry_weight_uom'],
						})),

						// "penalties": {
						// 	"penalties": PENALTIES,
						// 	"total_penalties": formatNumber(TOTAL_PENALTIES),
						// },

						// using INVOICE_TYPE.toLowerCase() is dependent on the value for INVOICE_TYPE being an exact uppercase match for the field name in the contract for payable percentage of the invoice type
						// "payable_percentage": formatNumber(PAYABLE_PERCENTAGE),
						// "payment_received_source": (!!REVISION_INV_NUMBER && !!REVISION_TOTAL_PAYMENT && !!REVISION_INV_DOCUMENT_TYPE) ? `${REVISION_INVOICE_TYPE}.${REVISION_INV_DOCUMENT_TYPE}.${REVISION_INV_NUMBER}` : undefined,
						// "payment_received": (!!REVISION_INV_NUMBER && !!REVISION_TOTAL_PAYMENT) ? formatNumber(REVISION_TOTAL_PAYMENT) : undefined, // (Cashflow::Payments USD)
						"Total Penalties USD": formatNumber(invData['total_deductions']),
						"Total Adjustments USD": !!invData['adjustments'] ? formatNumber(invData['adjustments']['total_adjustments']) : '0.00',
						"Total Revenues USD": formatNumber(invData['total_revenue']),

						"Parcel Value USD": formatNumber(invData['invoice_value']),
						"Parcel Payable Value USD": formatNumber(invData['payable_amount']), // (Cashflow::Parcel Payable Value (Below Line) USD)
						"Payments USD": invData['amount_paid'], // (Cashflow::Payments USD)
						"GST Payable USD": formatNumber(invData.balance_of_gst_payable?.gst_in_usd),
						// "balance_in_sellers_favor": formatNumber(PAYMENT_OUTSTANDING) // (Cashflow::Due Total)
						"Due Total": formatNumber(invData['balance_in_sellers_favor']), // (Cashflow::Due Total)
						metadata: {
							invoiceTypeRanking: INVOICE_TYPE_RANKING[invData['invoice_type']]
						}
					}
				}

				if (invoiceParam.parcelData === undefined) {
					throw new NonFatalError(`Something went wrong, no parcel or invoice data for Invoice of parcel id ${invoiceParam.parcelId.substring(0,5)} and invoice type ${invoiceParam.invoiceType}`);
				}
				
				const parcelId = invoiceParam.parcelId;
				if (!parcelId) {
					// failureReason.value = 'Parcel not selected for invoice document generation';
					// isGeneraingDoc.value = false;
					// Not severe enough to halt the cashflow generation, just log error, but it should never reach here
					console.error(`[generateInvoice] A parcel id is not defined for invoice type ${invoiceParam.invoiceType}`);
					return;
				}
				const INVOICE_TYPE = invoiceParam.invoiceType; // there must be a field alongside this button interface named 'invoice_type' and its values must be convertible
				const parcelDataForInvoice = invoiceParam.parcelData;
				const contractName = invoiceParam.contractName;

				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] parcel data=${JSON.stringify(parcelDataForInvoice)}`);
				validateParcelData(parcelDataForInvoice);

				const assayForeignKey = parcelDataForInvoice[PARCEL_ASSAY_RESULTS_FIELD_NAME];
				const weightForeignKey = parcelDataForInvoice[PARCEL_WEIGHT_RESULTS_FIELD_NAME];
				const contractId = parcelDataForInvoice[PARCEL_CONTRACT_FIELD_NAME];

				if (!contractId) {
					throw new Error(`Contract not found for parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
				}

				const invoiceTypeResponse = await api.get(`/items/${INVOICE_TYPE_COLLECTION_NAME}`, {params: {
					filter: {
						[INVOICE_TYPE_RELATED_CONTRACT_FIELD_NAME]: {
							"_eq": contractId
						},
						[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]: {
							"_eq": INVOICE_TYPE
						}
					},
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
					// failureReason.value = 'No invoice type found for the contract';
					// isGeneraingDoc.value = false;
					// return;
					throw new Error(`No invoice type found for the contract ${contractName}`);
				}
				const provisionalPricingInfo = invoiceTypeResponse.data.data.find(invType => invType[INVOICE_TYPE_INVOICE_TYPE_FIELD_NAME]===INVOICE_TYPE);
				if (!provisionalPricingInfo) {
					// failureReason.value = `Cannot find payment information for ${INVOICE_TYPE} in the contract, please ensure that data for it has been entered and saved`;
					// isGeneraingDoc.value = false;
					// return;
					throw new Error(`Cannot find payment information for ${INVOICE_TYPE} in the contract ${contractName}, please ensure that data for it has been entered and saved`);
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
				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] weight lots data=${JSON.stringify(weightLotResponse.data.data)}`);
				validateWeightLots(weightLotResponse.data.data);
				// do some calculations for weight lot response based on method, or filter by method beforehand so just add
				const weights = evaluateWeights(weightLotResponse.data.data as WeightLot[]);

				// const WEIGHT_METHOD = invoiceParam[INVOICE_WEIGHT_METHOD_FIELD_NAME]; // there must be a field alongside this button interface named 'weight_method' and its values must be convertible
				// if WEIGHT_METHOD is not defined, then find weight by the method field with the values Outturn, Inturn Final, Inturn, Estimated, Planned in this order
				let WEIGHT: Weight | undefined = undefined; //weights.find(weight => weight.method === WEIGHT_METHOD);
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
					throw new Error(`No weight lots with valid method found for parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
				}
				if (
					WEIGHT.dry_weight === undefined || WEIGHT.dry_weight === null || 
					WEIGHT.wet_weight === undefined || WEIGHT.wet_weight === null || 
					WEIGHT.moisture === undefined || WEIGHT.moisture === null || 
					WEIGHT.dry_weight_uom === undefined || WEIGHT.dry_weight_uom === null || 
					WEIGHT.wet_weight_uom === undefined || WEIGHT.wet_weight_uom === null || 
					WEIGHT.method === undefined || WEIGHT.method === null) {
					throw new Error(`One of the fields for the latest weight lots data is undefined for parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
				}

				const dryWeightUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_DRY_SYMBOL_FIELD_NAME}]=${WEIGHT.dry_weight_uom}`, {
					params: { fields: [ UNIT_DRY_UNIT_FIELD_NAME ] }
				});
				const wetWeightUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_WET_SYMBOL_FIELD_NAME}]=${WEIGHT.wet_weight_uom}`, {
					params: { fields: [ UNIT_WET_UNIT_FIELD_NAME ] }
				});

				if (!dryWeightUomResponse.data.data || !dryWeightUomResponse.data.data[0] || !dryWeightUomResponse.data.data[0][UNIT_DRY_UNIT_FIELD_NAME]) {
					throw new Error(`Dry weight uom not found for symbol ${WEIGHT.dry_weight_uom} for parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
				}

				if (!wetWeightUomResponse.data.data || !wetWeightUomResponse.data.data[0] || !wetWeightUomResponse.data.data[0][UNIT_WET_UNIT_FIELD_NAME]) {
					throw new Error(`Wet weight uom not found for symbol ${WEIGHT.wet_weight_uom} for parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
				}

				// const dryWeightUomName = dryWeightUomResponse.data.data[0][UNIT_DRY_UNIT_FIELD_NAME];
				// // append 'dry as a prefix if it is not already there'
				// const DRY_WEIGHT_UOM_NAME = dryWeightUomName.indexOf('dry') === 0 ? dryWeightUomName : `dry ${dryWeightUomName}`;
				// const wetWeightUomName = wetWeightUomResponse.data.data[0][UNIT_WET_UNIT_FIELD_NAME];
				// // append 'wet as a prefix if it is not already there'
				// const WET_WEIGHT_UOM_NAME = wetWeightUomName.indexOf('wet') === 0 ? wetWeightUomName : `wet ${wetWeightUomName}`;

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
				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] assay lots data=${JSON.stringify(assayLotResponse.data.data)}`);
				validateAssayLots(assayLotResponse.data.data);
				const assays = evaluateAnalyticalAssay(assayLotResponse.data.data as AssayLotsOrCompositeForInvoice[]);
				// const ASSAY_METHOD = invoiceParam[INVOICE_ASSAY_METHOD_FIELD_NAME]; // there must be a field alongside this button interface named 'assay_method' and its values must be convertible
				let ASSAYS: any = undefined; 
				// if (!!ASSAY_METHOD) {
				// 	ASSAYS = assays[ASSAY_METHOD.toString()];
				// }
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
					throw new Error(`No assay lot data with a valid method found for parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
				}

				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] weight lots for invoice evaluation=${JSON.stringify(WEIGHT)}`);
				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] assay lots for invoice evaluation=${JSON.stringify(ASSAYS)}`);

				const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${contractId}`, {params: {
					fields: [ 
						CONTRACT_NAME_FIELD_NAME,
						CONTRACT_CURRENCY_FIELD_NAME,
						CONTRACT_GST_APPLICABLE_FIELD_NAME,
						CONTRACT_GST_RATE_FIELD_NAME,
					],
				}});
				validateContractResponse(contractResponse.data.data);

				const currencyResponse = await api.get(`/items/${CURRENCY_COLLECTION_NAME}/${contractResponse.data.data.contract_currency}`, {params: {
					fields: [CURRENCY_CODE_FIELD_NAME],
				}});
				validateCurrencyData(currencyResponse.data.data);

				const currencyCode = currencyResponse.data.data.code;

				// validateContractData(contractResponse.data.data);
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
				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] contract commodity data=${JSON.stringify(commodityInContractResponse.data.data)}`);
				// console.log(`	commodityInContractResponse payable assay rates1: ${JSON.stringify(commodityInContractResponse.data.data[0].payable_assay_rates)}`);
				// console.log(`	commodityInContractResponse payable assay rates2: ${commodityInContractResponse.data.data[0].payable_assay_rates}`);
				
				const COMMODITIES: any[] = [];
				const PENALTIES: any[] = [];
				let PRIMARY_COMMODITY: string = '';
				for (const {
					id: commInContractId,
					commodity, 
					primary_commodity, 
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
						fields: [COMMODITY_NAME_FIELD_NAME, COMMODITY_CODE_FIELD_NAME, ID_FIELD_NAME],
					}}); // response.data.data is an object response

					validateCommodityData(commodityResponse.data.data, commodity);

					if (!ASSAYS[commodityResponse.data.data.code]) {
						console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}::comm=${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}] no analytical assay for commodity ${commodityResponse.data.data.code} found, skipping...`);
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
						console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}::comm=${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}] qp=${JSON.stringify(quotationalPeriods)}`);
						// validateQuotationalPeriods(quotationalPeriods); // check that there is only one default and no fields are missing
						
						// pop it quotationalPeriod with default true from the array
						const defaultQuotationalPeriod = Array.isArray(quotationalPeriods) ? quotationalPeriods.find(quotationalPeriod => quotationalPeriod.default) : null;
						if (!defaultQuotationalPeriod) {
							throw new Error(`No default quotational period found for commodity ${commodityResponse.data.data.code}`);
						}

						const nonDefaultQuotationPeriodsString = quotationalPeriods
							.filter(quotationalPeriod => !quotationalPeriod.default)
							.map(quotationalPeriod => `${quotationalPeriod.qp_period} ${quotationalPeriod.qp_code}`);

						const quotationalPeriodString = [`${defaultQuotationalPeriod.qp_period} ${defaultQuotationalPeriod.qp_code}`, ...nonDefaultQuotationPeriodsString].join(', ');

						console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}::comm=${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}] evaluate payable assay for ${commodityResponse.data.data.code} with an analytical assay=${ASSAYS[commodityResponse.data.data.code]?.analytical_assay}`)
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
						let readableRefDayType = '';
						if (INVOICE_TYPE !== 'Final') {


							// get the reference date based on the selected QP code, and get the month based on the QP number; get the start and end date of the month fetched
							// if the selected QP does not have price data for it yet, then use provisional pricing data from the Contract
							const pricingDates = await setPricingDates(
								commodityResponse.data.data.code as string,
								commodityResponse.data.data.name as string,
								parcelDataForInvoice,
								price_method, 
								// use the default QP as backup for all invoice types in cashflow, should assume all QP months are completed with the forecast prices provided
								async () => setPricingDatesWithDefaultQp(
									defaultQuotationalPeriod,
									parcelDataForInvoice,
									contractName,
									commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]
								),
								// async () => setPricingDatesWithProvisionalPricing(
								// 	provisionalPricingInfo,
								// 	parcelDataForInvoice,
								// 	INVOICE_TYPE,
								// 	contractName
								// )
							)
							if (pricingDates === null) {
								throw new Error(`Pricing dates not found for commodity ${commodityResponse.data.data.code} for parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
							}
							if (
								pricingDates.provisionalPricingStartDate === null 
								|| !(pricingDates.provisionalPricingStartDate instanceof Date)
							) {
								throw new Error(`Invalid provisional pricing start date for commodity ${commodityResponse.data.data.code} of invoice type ${INVOICE_TYPE} in parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
							}
							provisionalPricingStartDate = pricingDates.provisionalPricingStartDate;

							if (
								pricingDates.provisionalPricingEndDate === null 
								|| !(pricingDates.provisionalPricingEndDate instanceof Date)
							) {
								throw new Error(`Invalid provisional pricing end date for commodity ${commodityResponse.data.data.code} of invoice type ${INVOICE_TYPE} in parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
							}
							provisionalPricingEndDate = pricingDates.provisionalPricingEndDate;
							numberOfBusinessDaysForProvisionalPricing = pricingDates.expectedNoOfBusinessDays;
						} else {
							// get the reference date based on the selected QP code, and get the month based on the QP number; get the start and end date of the month fetched
							// if the selected QP does not have price data for it yet, then use default QP data from the Contract for the given commodity
							const pricingDates = await setPricingDates(
								commodityResponse.data.data.code as string,
								commodityResponse.data.data.name as string,
								parcelDataForInvoice,
								price_method, 
								// use the default QP as backup for all invoice types
								async () => setPricingDatesWithDefaultQp(
									defaultQuotationalPeriod,
									parcelDataForInvoice,
									contractName,
									commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]
								),
								// true
							)
							if (pricingDates === null) {
								throw new Error(`Pricing dates not found for commodity ${commodityResponse.data.data.code} for parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
							}
							if (
								pricingDates.provisionalPricingStartDate === null 
								|| !(pricingDates.provisionalPricingStartDate instanceof Date)
							) {
								throw new Error(`Invalid provisional pricing start date for commodity ${commodityResponse.data.data.code} of invoice type ${INVOICE_TYPE} in parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
							}
							provisionalPricingStartDate = pricingDates.provisionalPricingStartDate;

							if (
								pricingDates.provisionalPricingEndDate === null 
								|| !(pricingDates.provisionalPricingEndDate instanceof Date)
							) {
								throw new Error(`Invalid provisional pricing end date for commodity ${commodityResponse.data.data.code} of invoice type ${INVOICE_TYPE} in parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
							}
							provisionalPricingEndDate = pricingDates.provisionalPricingEndDate;

							// get the reference date based on the QP code, and get the month based on the QP number
							// get the start and end date of the month fetched
						}
						console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}::comm=${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}] provisional pricing date range: ${provisionalPricingStartDate.toString()} - ${provisionalPricingEndDate.toString()}`);

						const averagePriceWithinPeriod = await getCommodityAvgPrice(
							commodityResponse.data.data.code, 
							commodityResponse.data.data[ID_FIELD_NAME],
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
						console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}::comm=${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}] payableMetalConversion for commodity ${commodityResponse.data.data.name}: ${JSON.stringify(payableMetalConversion)}`);
						// if the conversion factor is 1, then we don't need to show it
						payableMetalConversion.initialConversion = payableMetalConversion.initialConversion?.conversionFactor === 1 ? undefined : payableMetalConversion.initialConversion;
						payableMetalConversion.finalConversion = payableMetalConversion.finalConversion?.conversionFactor === 1 ? undefined : payableMetalConversion.finalConversion;

						const payableMetalInitialConversionFactor =  !!payableMetalConversion.initialConversion?.isConvertByMultiplication ? (payableMetalConversion.initialConversion?.conversionFactor ?? 1) : 1 / (payableMetalConversion.initialConversion?.conversionFactor ?? 1);
						const payableMetalFinalConversionFactor =  !!payableMetalConversion.finalConversion?.isConvertByMultiplication ? (payableMetalConversion.finalConversion?.conversionFactor ?? 1) : 1 / (payableMetalConversion.finalConversion?.conversionFactor ?? 1);
						const PAYABLE_METAL = roundNumber(WEIGHT.dry_weight * payableMetalInitialConversionFactor * (payableAssay ?? 1) * payableMetalFinalConversionFactor * (ASSAYS[commodityResponse.data.data.code]?.assay_uom !== '%' ? 1 : 0.01), 4) ?? 1;
						console.log(`[generateInvoice] PAYABLE_METAL for commodity ${commodityResponse.data.data.name}: ${PAYABLE_METAL}`);

						const PRICE = PAYABLE_METAL * priceRate;

						COMMODITIES.push({
							commodity: commodityResponse.data.data.name,

							analytical_assay: formatNumber(ASSAYS[commodityResponse.data.data.code]?.analytical_assay, 4),
							deduction_expression: payableAssayExpression, // construct this in evaluateFinalValueByRate and change its return type to an object that returns both this and the final value
							payable_assay: formatNumber(payableAssay, 4),
							assay_uom: ASSAYS[commodityResponse.data.data.code]?.assay_uom,

							payable_metal: formatNumber(PAYABLE_METAL, 4), // dry weight * conversion (optional) * payable assay * conversion (optional) // TODO: REFACTOR, USED IN 'price'
							payable_metal_expression: `${formatNumber(WEIGHT.dry_weight, 4)}${WEIGHT.dry_weight_uom}${!!payableMetalConversion.initialConversion ? ` ${payableMetalConversion.initialConversion.isConvertByMultiplication ? '*' : '/'} ${formatNumber(payableMetalConversion.initialConversion.conversionFactor, 4)}${payableMetalConversion.initialConversion.conversionUom}` : ''} * ${formatNumber(payableAssay ?? 1, 4)}${ASSAYS[commodityResponse.data.data.code]?.assay_uom !== '%' ? `${ASSAYS[commodityResponse.data.data.code]?.assay_uom}` : ' / 100'}${!!payableMetalConversion.finalConversion ? ` ${payableMetalConversion.finalConversion.isConvertByMultiplication ? '*' : '/'} ${formatNumber(payableMetalConversion.finalConversion.conversionFactor, 4)}${payableMetalConversion.finalConversion.conversionUom}` : ''}`, // dry weight * conversion (optional) * payable assay * conversion (optional)
							// payable_metal_uom: payableMetalUom,
							payable_metal_uom: pricePerUom, // using price per uom as the payable metal uom since it would need to be this when we calculate the payable amount
							qp: quotationalPeriodString,
							qp_start_date: formatDate(provisionalPricingStartDate),
							qp_end_date: formatDate(provisionalPricingEndDate),
							price_method: price_method, // use free data for testing, will get subscription later on once commercialised
							// https://www.lbma.org.uk/prices-and-data/precious-metal-prices#/table
							// https://www.westmetall.com/en/markdaten.php?action=averages&field=LME_Zn_cash
							// https://metalpriceapi.com/
							price_rate: formatNumber(priceRate, 4), // how to calculate this again?
							price_per_uom: pricePerUom,
							price: formatNumber(PRICE), // dry weight * price rate // TODO: refactor, used in 'final_total'
							treatment_charge: !!treatmentCharge ? {
								rate: formatNumber(treatmentCharge.baseTreatmentCharge, 4),
								// with treatment charge, the 'final_adjusment' in the rate is treated as the base value to add/subtract from
								discount: formatNumber((treatmentCharge.baseTreatmentCharge ?? 0) - (treatmentCharge.finalValue ?? 0), 4),
								final_rate: formatNumber(treatmentCharge.finalValue, 4),
								per_uom: treatmentChargePerUom, // TODO: currently doesn't handle unit conversion, assumed to be the same as the dry weight unit
								final_amount: formatNumber(roundNumber(WEIGHT.dry_weight * (treatmentCharge.finalValue ?? 1) * -1, 2, true)), // use payable metal weight for calculating the final charge cost
							} : undefined,
							refining_charge: !!refiningCharge ? {
								rate: formatNumber(refiningCharge.baseTreatmentCharge, 4),
								// with refining charge, the 'final_adjusment' in the rate is treated as the base value to add/subtract from
								discount: formatNumber((refiningCharge.baseTreatmentCharge ?? 0) - (refiningCharge.finalValue ?? 0), 4),
								final_rate: formatNumber(refiningCharge.finalValue, 4),
								per_uom: refiningChargePerUom, // TODO: currently doesn't handle unit conversion, assumed to be the same as the payable metal weight unit
								final_amount: formatNumber(roundNumber(PAYABLE_METAL * (refiningCharge.finalValue ?? 1) * -1, 2, true)), // use payable metal weight for calculating the final charge cost
							} : undefined,

							final_total: roundNumber(PRICE - (!!treatmentCharge ? 1 : 0) * (roundNumber(WEIGHT.dry_weight * (treatmentCharge?.finalValue ?? 1), 2) ?? 1) - (!!refiningCharge ? 1 : 0) * (roundNumber(WEIGHT.dry_weight * (refiningCharge?.finalValue ?? 1), 2) ?? 1))
							
						});
					// do something with commodity data
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
							throw new Error(`Please fill in the field for Penalty Per UOM in contract ${contractName} for commodity ${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}`);
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
						
						console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}::comm=${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]}] evaluated penalty with an analytical assay=${ASSAYS[commodityResponse.data.data.code]?.analytical_assay}, penaltyRate=${penaltyBracket?.rate}, finalPenaltyRate=${finalPenaltyRate}, expression='${penaltyExpression}'`);
						PENALTIES.push({
							commodity: commodityResponse.data.data.name,
							analytical_assay: formatNumber(ASSAYS[commodityResponse.data.data.code]?.analytical_assay, 4),
							// deductible_amount: formatNumber(finalPenaltyRate ? (ASSAYS[commodityResponse.data.data.code]?.analytical_assay - finalPenaltyRate) : 0, 4),
							deduction_expression: penaltyExpression,
							assay_uom: ASSAYS[commodityResponse.data.data.code]?.assay_uom,

							penalty_rate: formatNumber(penaltyBracket?.rate, 4),
							penalty_per_uom: penaltyPerUom,
							final_penalty_rate: formatNumber(finalPenaltyRate, 4),
							final_penalty: formatNumber((finalPenaltyRate ?? 1) * WEIGHT.dry_weight),
						});
					}
					/**
					 * END: Penalty rates by commodity
					 */
				}
				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] evaluated commodities=${JSON.stringify(COMMODITIES)}`);
				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] evaluated penalties${JSON.stringify(PENALTIES)}`);

				const TOTAL_REVENUE = COMMODITIES.reduce((acc, commodity) => acc + parseNumber(commodity.price), 0);
				const TOTAL_TREATMENT_CHARGE = COMMODITIES.reduce((acc, commodity) => acc + parseNumber(commodity.treatment_charge?.final_amount), 0);
				const TOTAL_REFINING_CHARGE = COMMODITIES.reduce((acc, commodity) => acc + parseNumber(commodity.refining_charge?.final_amount), 0);
				const TOTAL_PENALTIES = PENALTIES.reduce((acc, curr) => acc + parseNumber(curr.final_penalty), 0);
				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] TOTAL_REVENUE=${TOTAL_REVENUE}, TOTAL_TREATMENT_CHARGE=${TOTAL_TREATMENT_CHARGE}, TOTAL_REFINING_CHARGE=${TOTAL_REFINING_CHARGE}, TOTAL_PENALTIES=${TOTAL_PENALTIES}`);

				let TOTAL_ADJUSTMENTS: number = 0;
				let ADJUSTMENTS: any
				const ADJUSTMENTS_EXIST: boolean = !!parcelDataForInvoice[PARCEL_ADJUSTMENTS_FIELD_NAME]
				if (ADJUSTMENTS_EXIST) {
					TOTAL_ADJUSTMENTS = parcelDataForInvoice[PARCEL_ADJUSTMENTS_FIELD_NAME].reduce((acc, adjustment) => acc + adjustment.amount, 0);
					ADJUSTMENTS = {
						adjustments: parcelDataForInvoice[PARCEL_ADJUSTMENTS_FIELD_NAME]
							.map((adjustment) => {
								return {
									"description": adjustment.description,
									"amount": formatNumber(adjustment.amount)
								}
							}),

						total_adjustments: formatNumber(TOTAL_ADJUSTMENTS)
					};
				}

				const PAYABLE_PERCENTAGE: number | undefined = provisionalPricingInfo[INVOICE_TYPE_PAY_PERCENT_FIELD_NAME];
				const INVOICE_VALUE: number = TOTAL_REVENUE + TOTAL_TREATMENT_CHARGE + TOTAL_REFINING_CHARGE + TOTAL_PENALTIES + TOTAL_ADJUSTMENTS;

				const PAYABLE_AMOUNT: number | undefined = PAYABLE_PERCENTAGE != undefined ? INVOICE_VALUE * PAYABLE_PERCENTAGE/100 : undefined;

				// GST calculation if it applies
				let GST_RATE: number = 0;
				let gstInUsd: number | undefined;
				if (isGstApplicable(contractResponse.data.data)) {
					GST_RATE = contractResponse.data.data[CONTRACT_GST_RATE_FIELD_NAME]/100;
					gstInUsd = INVOICE_VALUE * GST_RATE;
				}

				/**
				 * START: Buyer company name
				 */
				const counterpartyResponse = await api.get(`/items/${COUNTERPARTY_COLLECTION_NAME}/${parcelDataForInvoice[PARCEL_COUNTERPARTY_FIELD_NAME]}`, {params: {
					fields: [COUNTERPARTY_CODENAME_FIELD_NAME],
				}});
				validateCounterparty(counterpartyResponse.data.data);
				// const counterpartyAddressResponse = await api.get(`/items/${COUNTERPARTY_ADDRESS_COLLECTION_NAME}?filter[${COUNTERPARTY_ADDRESS_COUNTERPARTY_FIELD_NAME}]=${parcelDataForInvoice[PARCEL_COUNTERPARTY_FIELD_NAME]}`, {params: {
				// 	fields: [COUNTERPARTY_ADDRESS_ADDRESS_FIELD_NAME],
				// }});
				// validateCounterpartyAddress(counterpartyAddressResponse.data.data);
				// confirmed to be defined in validateCounterpartyAddress()
				// const buyerAddressId = counterpartyAddressResponse.data.data[0][COUNTERPARTY_ADDRESS_ADDRESS_FIELD_NAME]
				// const buyerAddressResponse = await api.get(`/items/${ADDRESS_COLLECTION_NAME}/${buyerAddressId}`, {params: {
				// 	fields: [
				// 		ADDRESS_LINE1_FIELD_NAME,
				// 		ADDRESS_LINE2_FIELD_NAME,
				// 		ADDRESS_CITY_FIELD_NAME,
				// 		ADDRESS_STATE_FIELD_NAME,
				// 		ADDRESS_COUNTRY_FIELD_NAME,
				// 		ADDRESS_ZIP_FIELD_NAME
				// 	],
				// }});
				// validateBuyerAddress(buyerAddressResponse.data.data);

				// const buyerAddressLine1 = buyerAddressResponse.data.data[ADDRESS_LINE1_FIELD_NAME];
				// const buyerAddressLine2 = !!buyerAddressResponse.data.data[ADDRESS_LINE2_FIELD_NAME] ? `,\n${buyerAddressResponse.data.data[ADDRESS_LINE2_FIELD_NAME]}` : '';
				// const buyerAddressCity = !!buyerAddressResponse.data.data[ADDRESS_CITY_FIELD_NAME] ? `,\n${buyerAddressResponse.data.data[ADDRESS_CITY_FIELD_NAME]}` : '';
				// const buyerAddressState = !!buyerAddressResponse.data.data[ADDRESS_STATE_FIELD_NAME] ? `,\n${buyerAddressResponse.data.data[ADDRESS_STATE_FIELD_NAME]}` : '';

				// // buyer address country field confirmed to exist in buyerAddressResponse by validateBuyerAddress() if it reaches this point
				// const buyerAddressCountryResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${buyerAddressResponse.data.data[ADDRESS_COUNTRY_FIELD_NAME]}`, {params: {
				// 	fields: [COUNTRY_NAME_FIELD_NAME],
				// }});
				// validateBuyerCountry(buyerAddressCountryResponse.data.data);

				// const buyerAddressCountry = !!buyerAddressCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME] ? `, ${buyerAddressCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME]}` : '';
				// const buyerAddressZip = !!buyerAddressResponse.data.data[ADDRESS_ZIP_FIELD_NAME] ? ` ${buyerAddressResponse.data.data[ADDRESS_ZIP_FIELD_NAME]}` : '';
				// const BUYER_ADDRESS = `${buyerAddressLine1}${buyerAddressLine2}${buyerAddressCity}${buyerAddressZip}${buyerAddressState}${buyerAddressCountry}`;
				/**
				 * END: Buyer company name
				 */

				/**
				 * START: Vessel name
				 */
				const vesselId = parcelDataForInvoice[PARCEL_VESSEL_FIELD_NAME];
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
				// const companyDataResponse = await api.get(`/items/${COMPANY_COLLECTION_NAME}`, { params: {
				// 	fields: [
				// 		COMPANY_NAME_FIELD_NAME,
				// 		COMPANY_LINE_1_FIELD_NAME,
				// 		COMPANY_LINE_2_FIELD_NAME,
				// 		COMPANY_CITY_FIELD_NAME,
				// 		COMPANY_STATE_FIELD_NAME,
				// 		COMPANY_ZIP_FIELD_NAME,
				// 		COMPANY_COUNTRY_FIELD_NAME,
				// 		COMPANY_PHONE_CODE_FIELD_NAME,
				// 		COMPANY_PHONE_NUMBER_FIELD_NAME,
				// 		// COMPANY_EMAIL_FIELD_NAME,
				// 		COMPANY_SIGNATORY_NAME_FIELD_NAME,
				// 		COMPANY_SIGNATORY_TITLE_FIELD_NAME,
				// 		COMPANY_REMITTANCE_DETAILS_FIELD_NAME
				// 	]
				// }});

				// const companyData = companyDataResponse.data.data;
				// validateCompanyData(companyData);
				// const companyName = companyData[COMPANY_NAME_FIELD_NAME];
				// // const companyEmail = companyData[COMPANY_EMAIL_FIELD_NAME];
				// const companyPhoneCodeResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${companyData[COMPANY_PHONE_CODE_FIELD_NAME]}`, {params: {
				// 	fields: [COUNTRY_PHONE_CODE_FIELD_NAME],
				// }});
				// validateCompanyPhoneCode(companyPhoneCodeResponse.data.data);
				// const companyPhoneCode = companyPhoneCodeResponse.data.data[COUNTRY_PHONE_CODE_FIELD_NAME];
				// const companyPhoneNumber = companyData[COMPANY_PHONE_NUMBER_FIELD_NAME];

				// const companyAddressLine1 = companyData[COMPANY_LINE_1_FIELD_NAME];
				// const companyAddressLine2 = !!companyData[COMPANY_LINE_2_FIELD_NAME] ? `,\n${companyData[COMPANY_LINE_2_FIELD_NAME]}` : '';
				// const companyAddressCity = !!companyData[COMPANY_CITY_FIELD_NAME] ? `,\n${companyData[COMPANY_CITY_FIELD_NAME]}` : '';
				// const companyAddressState = !!companyData[COMPANY_STATE_FIELD_NAME] ? `,\n${companyData[COMPANY_STATE_FIELD_NAME]}` : '';

				// const companyBaseCountryResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${companyData[COMPANY_COUNTRY_FIELD_NAME]}`, {params: {
				// 	fields: [COUNTRY_NAME_FIELD_NAME],
				// }});
				// validateCompanyCountry(companyBaseCountryResponse.data.data);
				// const companyAddressCountry = !!companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME] ? `, ${companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME]}` : '';
				// const companyZipcode = !!companyData[COMPANY_ZIP_FIELD_NAME] ? ` ${companyData[COMPANY_ZIP_FIELD_NAME]}` : '';
				// const COMPANY_ADDRESS = `${companyAddressLine1}${companyAddressLine2}${companyAddressCity}${companyZipcode}${companyAddressState}${companyAddressCountry}`;
				/**
				 * END: Seller company data
				 */

				/**
				 * START: Origin and destination port
				 */
				// const originPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcelDataForInvoice[PARCEL_ORIGIN_FIELD_NAME]}`, {params: {
				// 	fields: [
				// 		PORT_NAME_FIELD_NAME,
				// 		PORT_COUNTRY_FIELD_NAME,
				// 	],
				// }});
				// validatePortOfOrigin(originPortResponse.data.data);

				// const destinationPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcelDataForInvoice[PARCEL_DESTINATION_FIELD_NAME]}`, {params: {
				// 	fields: [
				// 		PORT_NAME_FIELD_NAME,
				// 		PORT_COUNTRY_FIELD_NAME,
				// 	],
				// }});
				// validatePortOfDestination(destinationPortResponse.data.data);
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
				const INVOICE_ID = `${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]} (#${invoiceNumber})`;

				// same for PARCEL_NUMBER but pad to three
				const PARCEL_NUMBER = parcelNum.toString().padStart(2, '0');

				/**
				 * START: Due Date
				 */
				// const paymentAdvice = {
				// 	invoice_type: INVOICE_TYPE,
				// 	days: paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_DAYS_FIELD_NAME],
				// 	day_type: paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_DAY_TYPE_FIELD_NAME],
				// 	ref_day: INVOICE_TYPE === 'Final' ? paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_FINAL_INV_REF_DAY_FIELD_NAME] : paymentInformation[INVOICE_TYPE_PAYMENT_ADVICE_REF_DAY_FIELD_NAME],
				// }
				// if (!paymentAdvice) {
				// 	throw new Error(`Contract does not have a payment advice for invoice type ${INVOICE_TYPE}`);
				// }
				// let readablePaymentAdviceRefDayType = '';
				// let refDayAsString;
				// switch (paymentAdvice['ref_day']) {
				// 	case 'Arrival Date':
				// 		readablePaymentAdviceRefDayType = 'Actual Arrival Date from the Parcel form';
				// 		refDayAsString = parcelDataForInvoice[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME];
				// 		break;
				// 	case 'B/L Date':
				// 		readablePaymentAdviceRefDayType = 'B/L Date from the Parcel form';
				// 		refDayAsString = parcelDataForInvoice[PARCEL_BL_DATE_FIELD_NAME];
				// 		break;
				// 	case 'Invoice Date':
				// 		readablePaymentAdviceRefDayType = 'Invoice Date from the Invoice form';
				// 		refDayAsString = invoiceParam[INVOICE_TYPE_INVOICE_DATE_FIELD_NAME];
				// 		break;
				// 	// case 'Actual Shipment Date':
				// 	// 	paymentAdviceRefDayType = PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME;
				// 	// 	readablePaymentAdviceRefDayType = 'Actual Shipment Date';
				// 	// 	break;
				// 	case 'Estimated Shipment Date':
				// 		readablePaymentAdviceRefDayType = 'Estimated Shipment Date from the Parcel form';
				// 		refDayAsString = parcelDataForInvoice[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
				// 		break;
				// 	case 'Parcel Finalisation':
				// 		if (parcelDataForInvoice[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME] === undefined || parcelDataForInvoice[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME] === null) {
				// 			throw new Error(`[generateInvoice] Parcel has not been finalised, please fill in the the parcel finalisation date in the parcel form.`);
				// 		}
				// 		readablePaymentAdviceRefDayType = 'Parcel Finalisation Date from the Parcel form';
				// 		refDayAsString = parcelDataForInvoice[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME];
				// 		break;
				// 	default:
				// 		throw new Error(`Invalid reference day for payment advice: ${paymentAdvice['ref_day']}; please contact Navarch for support`);
				// }
				// if (refDayAsString === undefined || refDayAsString === null) {
				// 	throw new Error(`Reference day for payment advice ${readablePaymentAdviceRefDayType} is empty in parcel`);
				// }
				// const refDate: Date = new Date(refDayAsString);

				// const dayRange = parseInt(paymentAdvice['days']);
				// const dayType = paymentAdvice['day_type'];

				// let dueDate: Date;
				// switch (dayType) {
				// 	case 'Business Day(s)':
				// 		dueDate = addBusinesDays(refDate, dayRange, true);
				// 		break;
				// 	case 'Calendar Day(s)':
				// 		dueDate = new Date(refDate.valueOf());
				// 		dueDate.setDate(dueDate.getDate() + dayRange);
				// 		break;
				// 	default:
				// 		throw new Error(`[generateInvoice] Invalid day_type for payment advice ${dayType}`);
				// }
				// console.log(`[generateInvoice] payment advice due date: ${dueDate.toString()}`);
				
				// const DUE_DATE = formatDate(dueDate);
				/**
				 * END: Due Date
				 */

				// payment outstanding will be due total
				// I goddamn hope payable amount will not be undefined
				const PAYMENT_OUTSTANDING = (PAYABLE_AMOUNT ?? 0) + TOTAL_ADJUSTMENTS;

				// const SIGNATORY = {
				// 	signatoryName: companyData[COMPANY_SIGNATORY_NAME_FIELD_NAME] as string,
				// 	signatoryTitle: companyData[COMPANY_SIGNATORY_TITLE_FIELD_NAME] as string,
				// 	company: companyName as string
				// }

				const valuationInvoice = {
					// "seller": companyName,
					// "seller_address": COMPANY_ADDRESS,
					// "seller_phone_number": `+${companyPhoneCode} ${companyPhoneNumber}`,
					// "signatory": SIGNATORY,
					// "remittance": companyData[COMPANY_REMITTANCE_DETAILS_FIELD_NAME] as string,

					"Parcel": `${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]} (#${PARCEL_NUMBER})`, //"CZ-100-GLS (#149)",
					"Counterparty": counterpartyResponse.data.data[COUNTERPARTY_CODENAME_FIELD_NAME],
					// "buyer_address": BUYER_ADDRESS,
					// "shipment_code": parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME],
					"Vessel": !!vesselResponse ? vesselResponse.data.data[VESSEL_NAME_FIELD_NAME] : 'Vessel TBA',
					"Shipment Date": !!parcelDataForInvoice[PARCEL_BL_DATE_FIELD_NAME] ? formatDate(new Date(parcelDataForInvoice[PARCEL_BL_DATE_FIELD_NAME])) : (!!parcelDataForInvoice[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME] ? formatDate(new Date(parcelDataForInvoice[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME])) : 'N/A'),
					"Arrival Date": !!parcelDataForInvoice[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ? formatDate(new Date(parcelDataForInvoice[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME])) : (!!parcelDataForInvoice[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME] ? formatDate(new Date(parcelDataForInvoice[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME])) : 'N/A'),

					"Status": !!parcelDataForInvoice[PARCEL_BL_DATE_FIELD_NAME] ? 'Unfinalised' : 'Planned',
					"Revision": "Valuation",

					"Invoice": `${INVOICE_TYPE}:Valuation`,
					// "invoice_date": formatDate(INVOICE_DATE),
					// "revision": (!!REVISION_INV_NUMBER && !!REVISION_TOTAL_PAYMENT) ? REVISION_INV_DOCUMENT_TYPE : undefined,
					// "invoice_number": INVOICE_ID, //"CZ-100-GLS (#02)",

					// "port_of_loading": `${originPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`, //"Gold Coast, Australia",
					// "port_of_discharge": `${destinationPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${destinationPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`, //"CIF FO, Huangpu New Port, China",
					// "primary_commodity": `${PRIMARY_COMMODITY} Concentrates`,

					"Invoice Due Date": formatDate(invoiceParam.dueDate), // "3-Sept-2022",


					// "wet_weight": formatNumber(WEIGHT.wet_weight, 4), //"10,069.0000",
					// "wet_weight_uom": WEIGHT.wet_weight_uom, //"wmt",
					// "wet_weight_uom_name": capitaliseFirstLetter(WET_WEIGHT_UOM_NAME),
					// "moisture": formatNumber(WEIGHT.moisture, 4), //"10.5000",
					// "moisture_uom": "%",
					"Dry Weight": `${formatNumber(WEIGHT.dry_weight, 2)}`, //"9,011.7550", // for which method again? // no weight uom, and just up to 2 decimal places
					"Dry Weight UOM": WEIGHT.dry_weight_uom, // "dmt",
					// "dry_weight_uom": WEIGHT.dry_weight_uom, // "dmt",
					// "dry_weight_uom_name": capitaliseFirstLetter(DRY_WEIGHT_UOM_NAME),
					// "total_deductions": "2,649,455.98",

					// "currency": currencyCode,

					// "commodities": COMMODITIES,
					...(await mapOutCommoditiesForCashflow(COMMODITIES, {
						dryWeight: WEIGHT.dry_weight,
						dryWeightUom: WEIGHT.dry_weight_uom,
					})),

					// "penalties": {
					// 	"penalties": PENALTIES,
					// 	"total_penalties": formatNumber(TOTAL_PENALTIES),
					// },

					// using INVOICE_TYPE.toLowerCase() is dependent on the value for INVOICE_TYPE being an exact uppercase match for the field name in the contract for payable percentage of the invoice type
					// "payable_percentage": formatNumber(PAYABLE_PERCENTAGE),
					// "payment_received_source": (!!REVISION_INV_NUMBER && !!REVISION_TOTAL_PAYMENT && !!REVISION_INV_DOCUMENT_TYPE) ? `${REVISION_INVOICE_TYPE}.${REVISION_INV_DOCUMENT_TYPE}.${REVISION_INV_NUMBER}` : undefined,
					// "payment_received": (!!REVISION_INV_NUMBER && !!REVISION_TOTAL_PAYMENT) ? formatNumber(REVISION_TOTAL_PAYMENT) : undefined, // (Cashflow::Payments USD)
					"Total Revenues USD": formatNumber(TOTAL_REVENUE), // "9,643,265.49",
					"Total Penalties USD": formatNumber(TOTAL_PENALTIES + TOTAL_TREATMENT_CHARGE + TOTAL_REFINING_CHARGE),
					"Total Adjustments USD": ADJUSTMENTS_EXIST ? ADJUSTMENTS.total_adjustments : '0.00',
					"Parcel Value USD": formatNumber(INVOICE_VALUE), // (Cashflow::Parcel Value USD)
					"Parcel Payable Value USD": formatNumber(PAYABLE_AMOUNT), // (Cashflow::Parcel Payable Value (Below Line) USD)
					"Payments USD": '-',
					"GST Payable USD": formatNumber(gstInUsd), // for valuation invoices, this still needs further processing to account for previous invoice GST Payable amounts
					// "balance_in_sellers_favor": formatNumber(PAYMENT_OUTSTANDING) // (Cashflow::Due Total)
					"Due Total": '-',
					metadata: {
						invoiceTypeRanking: INVOICE_TYPE_RANKING[INVOICE_TYPE]
					}
				}

				console.log(`[generateInvoice][parcel=${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}::invoice type=${INVOICE_TYPE}] generated forecast invoice=${JSON.stringify(valuationInvoice)}`);
				
				// window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

				// // // response will be the url path to the invoice and possible any authentication token if needed
				// const response = await api.post(INVOICE_GENERATOR_PATH, valuationInvoice)
				// // // assign the invoice url as the value for this field

				// if (response.status !== 200) {
				// 	console.log(`[generateInvoice] invoice response status: ${response.status}`);
				// 	failureReason.value = response.data;
				// 	isGeneraingDoc.value = false;
				// 	return;
				// }

				return valuationInvoice;
			} catch (error) {
				if (error instanceof NonFatalError) {
					console.error(`[generateInvoice][parcel=${invoiceParam.parcelId}::invoice type=${invoiceParam.invoiceType}]Non-fatal error: ${error.message}`);
					return;
				}
				throw new Error(error.message + ` (parcel ${invoiceParam.parcelId}, invoice type ${invoiceParam.invoiceType})`);
			} 
		}

		return { 
			isGeneraingDoc,
			invoiceUrl: formValues.value, 
			generateCashflow, 
			downloadDoc, 
			copy,
			isCopying,
			failureReason 
		};

		async function copy() {
			isCopying.value = true;
			const { id, user_created, date_created, user_updated, date_updated, cashflow, forecast_price, ...requestBody } = formValues.value;
			
			const forecastPrice = await api.get(`/items/${FORECAST_COLLECTION_NAME}`, {params: {
				// TODO: if it is possible for forecast price to have more than 20 items, then this will need to be fetched in chunks
				filter: {
					[ID_FIELD_NAME]: { "_in": forecast_price }
				},
				fields: [
					FORECAST_COMMODITY_FIELD_NAME,
					FORECAST_START_DATE_FIELD_NAME,
					FORECAST_END_DATE_FIELD_NAME,
					FORECAST_PRICE_FIELD_NAME,
				]
			}});

			const duplicatedForecastPrices = await api.post(`items/${FORECAST_COLLECTION_NAME}`, forecastPrice.data.data);

			if (duplicatedForecastPrices.status !== 200) {
				console.log(`[cashflow::copy] duplicate forecast prices response status: ${duplicatedForecastPrices.status}`);
				failureReason.value = `Failed to duplicate forecast prices with status ${duplicatedForecastPrices.status}`;
				return;
			}

			const duplicatedForecastPricesId = duplicatedForecastPrices.data.data.map(forecastPrice => forecastPrice.id);

			console.log(`[cashflow::copy] duplicated forecast prices id=${JSON.stringify(duplicatedForecastPricesId)}`);
			
			console.log(`[cashflow::copy] requestBody=${JSON.stringify(requestBody)}`);
			const copyResponse = await api.post('/items/' + CASHFLOW_COLLECTION_NAME, {
				forecast_price: duplicatedForecastPricesId,
				...requestBody
			});

			if (copyResponse.status !== 200) {
				console.log(`[cashflow::copy] copy response status: ${copyResponse.status}`);
				failureReason.value = `Failed to duplicate cashflow with status ${copyResponse.status}`;
				return;
			}
			isCopying.value = false;

			window.open(`/admin/content/${CASHFLOW_COLLECTION_NAME}/${copyResponse.data.data.id}`);
		}

		function downloadDoc(csvInputData?: string) {
			let csvData;
			if (isNullOrUndefined(csvInputData)) {
				csvData = convertJSONToCSV(formValues.value[CASHFLOW_FIELD_NAME]);
			} else {
				csvData = csvInputData;
			}
			console.log(`[downloadDoc] csvData=${csvData}`);
			downloadCSV(csvData);
		}

		async function setPricingDates(
			commodityCode: string,
			commodityName: string, 
			parcelData: any, 
			priceMethod: any, 
			backup: () => Promise<PricingDates | null> | null,
			isDeclaredMandatory: boolean = false
		): Promise<PricingDates | null> {
			if (backup === null && (isNullOrUndefined(parcelData[PARCEL_QP_SELECTION_FIELD_NAME]) || isNullOrUndefined(parcelData[PARCEL_QP_SELECTION_FIELD_NAME][commodityCode]))) {
				// check if the parcel has QP Selection, if null or if not set for the specific commodity, then fetch with the backup option
				// return await backup();
				throw new Error(`QP Selection is not set for commodity ${commodityName} in the parcel ${parcelData[PARCEL_SHIPMENT_CODE_FIELD_NAME]}, please ensure all contract commodities have a QP selection`);
			} else if (isNullOrUndefined(parcelData[PARCEL_QP_SELECTION_FIELD_NAME]) || isNullOrUndefined(parcelData[PARCEL_QP_SELECTION_FIELD_NAME][commodityCode])) {
				return await backup();
			}
			const pricingDates = await setPricingDatesWithQpSelection(parcelData[PARCEL_QP_SELECTION_FIELD_NAME][commodityCode] as QpCommodity, parcelData, priceMethod, isDeclaredMandatory);
			if (!pricingDates) {
				return await backup();
			}
			return pricingDates;
		}

		async function setPricingDatesWithQpSelection(qpCommodity: QpCommodity, parcelData, priceMethod, isDeclaredMandatory: boolean): Promise<PricingDates | null> {
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

			// This is the cashflow, it doesn't matter that the start date hasn't happened yet, there are estimated prices for the future
			
			// if (provisionalPricingStartDate.valueOf() > Date.now()) {
			// 	// start date has not occured yet, no price data will be available anyway (end date will also be skipped if this is true), so fetch with provisional pricing data
			// 	return null;
			// }
			provisionalPricingEndDate = getLastDateOfMonthPlusMonths(refDay, qpSelection.qp_period);

			// This is the Cashflow doc generator, it doesn't matter if the date hasn't happened yet, there should be estimated prices for the future
			
			// if (provisionalPricingEndDate.valueOf() > Date.now()) {
			// 	// end date has not occured yet, no price data will be available anyway, so fetch with provisional pricing data
			// 	return null;
			// } else if (provisionalPricingEndDate.valueOf() <= Date.now()) {
			// 	// if the end date has occured, then check if there is commodity price data up to this date
			// 	const commodityPriceResponse = await api.get(`/items/${COMM_PRICE_COLLECTION_NAME}`, {
			// 		params: {
			// 			filter: {
			// 				_and: [{
			// 					date: {
			// 						_eq: formatDateYYYYMMDD(provisionalPricingEndDate)
			// 					},
			// 				}, {
			// 					price_method: {
			// 						_eq: priceMethod
			// 					}
			// 				}]
			// 			},
			// 			fields: [
			// 				COMM_PRICE_PRICE_PM_FIELD_NAME,
			// 				COMM_PRICE_AVG_PRICE_FIELD_NAME,
			// 			],
			// 		}
			// 	});
			// 	if (!commodityPriceResponse.data.data || commodityPriceResponse.data.data.length === 0) {
			// 		// No commodity price data up to this date, so fetch with provisional pricing data
			// 		return null;
			// 	}
			// }

			return {
				provisionalPricingStartDate,
				provisionalPricingEndDate,
				expectedNoOfBusinessDays: null,
			}
		}

		async function setPricingDatesWithProvisionalPricing(provisionalPricingInfo: any, parcelDataForInvoice: any, invoiceType: string, contractName: string): Promise<PricingDates | null> {
			let readableRefDayType: string;
			let provisionalPricingStartDate: Date;
			let provisionalPricingEndDate: Date;


			const provisionalPricing = {
				invoice_type: invoiceType,
				days: provisionalPricingInfo[INVOICE_TYPE_PROVISIONAL_PRICING_DAYS_FIELD_NAME],
				day_type: provisionalPricingInfo[INVOICE_TYPE_PROVISIONAL_PRICING_DAY_TYPE_FIELD_NAME],
				ref_day: provisionalPricingInfo[INVOICE_TYPE_PROVISIONAL_PRICING_REF_DAY_FIELD_NAME],
			}

			if (!provisionalPricing) {
				throw new Error(`No provisional pricing found for invoice type ${invoiceType} for parcel ${parcelDataForInvoice[PARCEL_SHIPMENT_CODE_FIELD_NAME]}`);
			}
			let refDayAsString: string;
			switch (provisionalPricing['ref_day']) {
				case 'Arrival Date':
					refDayAsString = parcelDataForInvoice[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? parcelDataForInvoice[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
					readableRefDayType = 'Actual Arrival Date from the Parcel form';
					break;
				case 'B/L Date':
					refDayAsString = parcelDataForInvoice[PARCEL_BL_DATE_FIELD_NAME] ?? parcelDataForInvoice[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
					readableRefDayType = 'B/L Date from the Parcel form';
					break;
				case 'Invoice Date':
					refDayAsString = parcelDataForInvoice[PARCEL_BL_DATE_FIELD_NAME] ?? parcelDataForInvoice[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
					readableRefDayType = 'B/L Date (or Estimated Date) as Invoice Date';
					break;
				// case 'Actual Shipment Date':
				// 	refDayType = PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME;
				// 	readableRefDayType = 'Actual Shipment Date';
				// 	break;
				case 'Estimated Shipment Date':
					refDayAsString = parcelDataForInvoice[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
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
					throw new Error(`Invalid day type ${dayType} from contract ${contractName} for invoice type ${invoiceType}`);
			}

			return {
				provisionalPricingStartDate,
				provisionalPricingEndDate,
				expectedNoOfBusinessDays,
			}
		}

		async function setPricingDatesWithDefaultQp(defaultQuotationalPeriod: QuotationalPeriod, parcelDataForInvoice: any, contractName: string, commodityName: string): Promise<PricingDates | null> {
			let readableRefDayType: string;
			let provisionalPricingStartDate: Date;
			let provisionalPricingEndDate: Date;
			
			let refDayStringFromParcel: string;
			switch(defaultQuotationalPeriod.qp_code) {
				case 'MAMA':
					refDayStringFromParcel = parcelDataForInvoice[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? parcelDataForInvoice[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
					readableRefDayType = 'Actual/Estimated Arrival Date';
					break;
				case 'MOSS':
				case 'MOS':
				case 'MOAS':
					refDayStringFromParcel = parcelDataForInvoice[PARCEL_BL_DATE_FIELD_NAME] ?? parcelDataForInvoice[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
					readableRefDayType = 'B/L Date (Estimated Shipment Date)';
					break;
				default:
				throw new Error(`Unsupported QP code ${defaultQuotationalPeriod.qp_code} in the contract ${contractName}, please ensure all commodity QP codes are MAMA, MOS, MOSS, or MOAS`);
			}
			
			if (isNullOrUndefined(refDayStringFromParcel)) {
				throw new Error(`No reference day provided for ${readableRefDayType} from contract ${contractName} for commodity ${commodityName}`);
			}
			const refDay = new Date(refDayStringFromParcel);
			provisionalPricingStartDate = getFirstDateOfMonthPlusMonths(refDay, defaultQuotationalPeriod.qp_period);
			// if (provisionalPricingStartDate.valueOf() > Date.now()) {
			// 	throw new Error(`Start date for provisional pricing ${provisionalPricingStartDate} (${readableRefDayType}) from contract ${contractName} for commodity ${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]} based on default QP has not occurred yet`);
			// }
			provisionalPricingEndDate = getLastDateOfMonthPlusMonths(refDay, defaultQuotationalPeriod.qp_period);
			// if (provisionalPricingEndDate.valueOf() > Date.now()) {
			// 	throw new Error(`End date for provisional pricing ${provisionalPricingEndDate} (${readableRefDayType}) from contract ${contractName} for commodity ${commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME]} based on default QP has not occurred yet`);
			// }
			
			// get the reference date based on the QP code, and get the month based on the QP number
			// get the start and end date of the month fetched

			return {
				provisionalPricingStartDate,
				provisionalPricingEndDate,
				expectedNoOfBusinessDays: null,
			}
		}

		type ContainedMetalParam = {
			dryWeight: number,
			dryWeightUom: string,
		}

		async function mapOutCommoditiesForCashflow(commodities: any[], containedMetalParam: ContainedMetalParam) {
			console.log(`[mapOutCommoditiesForCashflow] commodities=${JSON.stringify(commodities)};;containedMetalParam=${JSON.stringify(containedMetalParam)}`);
			// flatten the array of objects into a single object with all the fields present and undefined fields filtered out
			const data = await Promise.all(commodities.map(async commodityData => {
				const containedMetalUnitConversionData = await getConversionValuesAndUnitsForPayableMetalCalculation(commodityData['payable_metal_uom'], containedMetalParam.dryWeightUom, commodityData['assay_uom']);
				console.log(`[mapOutCommoditiesForCashflow] commodity=${commodityData.commodity}, containedMetalUnitConversion=${JSON.stringify(containedMetalUnitConversionData)}`);
				const containedMetalInitialConversionFactor = !!containedMetalUnitConversionData.initialConversion?.isConvertByMultiplication ? (containedMetalUnitConversionData.initialConversion?.conversionFactor ?? 1) : 1/(containedMetalUnitConversionData.initialConversion?.conversionFactor ?? 1);
				const containedMetalFinalConversionFactor = !!containedMetalUnitConversionData.finalConversion?.isConvertByMultiplication ? (containedMetalUnitConversionData.finalConversion?.conversionFactor ?? 1) : 1/(containedMetalUnitConversionData.finalConversion?.conversionFactor ?? 1);
				const containedMetalConversionRate = containedMetalInitialConversionFactor * containedMetalFinalConversionFactor;
				const analyticalAssay = ((commodityData['assay_uom'] === '%') ? 0.01 : 1) * commodityData['analytical_assay'];
				return {
					[`${commodityData.commodity} Payable Metal (${commodityData.payable_metal_uom})`]: commodityData.payable_metal,
					[`${commodityData.commodity} Contained Metal (${commodityData.payable_metal_uom})`]: formatNumber(containedMetalParam.dryWeight * analyticalAssay * containedMetalConversionRate),
					[`${commodityData.commodity} Revenue (USD)`]: commodityData.price,
					[`${commodityData.commodity} QP Month`]: formatDateMMMYYYY(new Date(commodityData.qp_start_date)),
					[`${commodityData.commodity} Price (USD/${commodityData.price_per_uom})`]: commodityData.price_rate,
					// Optionally show TC if data exists for commodity
					...(!!commodityData.treatment_charge && {
						[`${commodityData.commodity} TC (USD)`]: commodityData.treatment_charge.final_amount,
						[`${commodityData.commodity} TC (USD/${commodityData.treatment_charge.per_uom})`]: commodityData.treatment_charge.final_rate,
					}),
					// Optionally show RC if data exists for commodity
					...(!!commodityData.refining_charge && {
						[`${commodityData.commodity} RC (USD)`]: commodityData.refining_charge.final_amount,
						[`${commodityData.commodity} RC (USD/${commodityData.refining_charge.per_uom})`]: commodityData.refining_charge.final_rate,
					}),
				};
			}));
			
			return data.reduce((acc, curr) => ({...acc, ...curr}), {});
		}

		function formatDateMMMYYYY(date: Date) {
			const monthNames = [
				"Jan", "Feb", "Mar",
				"Apr", "May", "Jun", "Jul",
				"Aug", "Sep", "Oct",
				"Nov", "Dec"
			];
			return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
		}

		function isGstApplicable(contractData) {
			// check that contractData is object and has the field for GST Applicable
			// created so that the multiple if-blocks that perform logic to evaluate GST at different points in the function can be replaced with a single call to this function
			return !!contractData
				&& typeof contractData === 'object'
				&& !!contractData[CONTRACT_GST_APPLICABLE_FIELD_NAME];
		}

		async function getCommodityAvgPrice(
			commodity: string, 
			commodityId: string, 
			source: number, 
			startDate: Date, 
			endDate: Date, 
			expectedNoOfBusinessDays: number | null, 
			priceFixToUse: 'Average' | 'PM' | 'AM' | null = null, 
			currency: number = 1
		): Promise<AveragePriceWithinPeriod> {
			console.log(`[getCommodityAvgPrice] commodity=${commodity}, commodityId=${commodityId}, source=${source}, startDate=${startDate}, endDate=${endDate}, currency=${currency}`)
			if (isNullOrUndefined(commodity)) {
				throw new Error(`Commodity ${commodity} is not defined for price calcualtion`);
			}
			if (isNullOrUndefined(source)) {
				throw new Error(`Price method for commodity ${commodity} is not defined for price calcualtion`);
			}
			if (isNullOrUndefined(startDate)) {
				throw new Error(`Start date is not defined for price calcualtion with Price Method #${source} has not been properly defined, please ensure that contract QP for commodity ${commodity} is properly defined`);
			}
			if (isNullOrUndefined(endDate)) {
				throw new Error(`End date is not defined for price calcualtion with Price Method #${source} has not been properly defined, please ensure that contract QP for commodity ${commodity} is properly defined`);
			}

			const adjustedStartDate = new Date(startDate.valueOf());
			const adjustedEndDate = new Date(endDate.valueOf());
			if (expectedNoOfBusinessDays !== null && !isNaN(expectedNoOfBusinessDays)) {
				// expectedNoOfBusinessDays is not null when it is for non-Final invoices, ensure that this holds or fix it if not. And adjust the start date to fetch more data if needed from before
				adjustedStartDate.setDate(adjustedStartDate.getDate() - NUMBER_OF_DAYS_TO_FETCH_MORE_OF);
			} else if (expectedNoOfBusinessDays === null) {
				// if null, then this is for a Final invoice, ensure this assumption holds or fix it if no longer the case. And adjust the end date to fetch more data at the end because Final invoices should be for QP Month so the end date passed in for this function should be the last day of the month, but we'll get a little bit extra to check if there is data for the next month or at least the last day of this month
				// TODO: fetching additional data pass the QP Month is no guarantee the QP month is complete, this relies on there being price data for the first few days of the next month
				adjustedEndDate.setDate(adjustedEndDate.getDate() + NUMBER_OF_DAYS_TO_FETCH_MORE_OF);
			}

			// /items/navarch_commodity_price?limit=100&filter[_and][0][price_method][_eq]=6&filter[_and][1][date][_between][0]=2023-10-02&filter[_and][1][date][_between][1]=2023-11-30&fields[]=id&fields[]=user_created&fields[]=date_created&fields[]=user_updated&fields[]=date_updated&fields[]=date&fields[]=price_method&fields[]=currency&fields[]=price_am&fields[]=price_pm&fields[]=average_price&fields[]=unit&fields[]=period&sort=id&aggregate[countDistinct][0]=id
			const commodityPrices = await api.get(`/items/${COMM_PRICE_COLLECTION_NAME}?filter[_and][0][price_method][_eq]=${source}&filter[_and][0][currency][_eq]=${currency}&filter[_and][1][date][_between][0]=${formatDateYYYYMMDD(adjustedStartDate)}&filter[_and][1][date][_between][1]=${formatDateYYYYMMDD(adjustedEndDate)}&sort[]=-${COMM_PRICE_DATE_FIELD_NAME}`, {params: {
				fields: [
					COMM_PRICE_PRICE_AM_FIELD_NAME,
					COMM_PRICE_PRICE_PM_FIELD_NAME,
					COMM_PRICE_AVG_PRICE_FIELD_NAME,
					COMM_PRICE_DATE_FIELD_NAME,
					COMM_PRICE_PRICE_METHOD_FIELD_NAME
				],
			}}); // with '&sort[]=-date', the latest date will be the first element in the array

			// if (!commodityPrices || !commodityPrices.data || !commodityPrices.data.data) {
			// 	throw new Error(`Failed to get commodity prices for commodity ${commodity} between ${formatDateYYYYMMDD(startDate)} and ${formatDateYYYYMMDD(endDate)}. This may be a network issue, try again later`);
			// }

			if (!!commodityPrices.data?.data && Array.isArray(commodityPrices.data.data) && commodityPrices.data.data.length > 0) {
				// get commodity price with the latest date
				// assuming it is sorted by date in descending order from the api response
				const latestCommodityPrice = commodityPrices.data.data[0];
				const latestCommPriceDate = new Date(latestCommodityPrice[COMM_PRICE_DATE_FIELD_NAME]);

				console.log(`[getCommodityAvgPrice] commodity prices=${JSON.stringify(commodityPrices.data.data)}`);

				// TODO: consider weekends and public holidays when deciding to use forecast or real prices
				// Also going in if expectedNoOfBusinessDays is null as an indication that this is for a Final invoice and it should just use it as long as the QP Month has price data
				// TODO: how to handle when the QP Month is only partially filled with price data
				if (latestCommPriceDate >= endDate || expectedNoOfBusinessDays === null) {
					if (expectedNoOfBusinessDays != null && commodityPrices.data.data.length < expectedNoOfBusinessDays) {
						throw new Error(`Not enough commodity prices found for commodity ${commodity} between ${formatDateYYYYMMDD(startDate)} and ${formatDateYYYYMMDD(endDate)}, please contact Navarch for support`);
					}

					const dailyPriceData: any[] = expectedNoOfBusinessDays !== null && !isNaN(expectedNoOfBusinessDays) ? 
						// for non-Final invoices, assuming that expectedNoOfBusinessDays not being null is an indication that it is for a non-Final invoice
						commodityPrices.data.data.slice(0, expectedNoOfBusinessDays) : 
						// for Final invoices, assuming that expectedNoOfBusinessDays being null is an indication that it is for a Final invoice
						commodityPrices.data.data.filter((priceData: any) => { 
							const priceDate = new Date(priceData[COMM_PRICE_DATE_FIELD_NAME]);
							return priceDate >= startDate && priceDate <= endDate;
						});
					const averagePrice = dailyPriceData.reduce((acc: number, curr: any) => {
						if (!curr[COMM_PRICE_AVG_PRICE_FIELD_NAME] && !curr[COMM_PRICE_PRICE_PM_FIELD_NAME] && !curr[COMM_PRICE_PRICE_AM_FIELD_NAME]) {
							throw new Error(`Commodity ${commodity} for Price Method #${source} on the date of ${curr[COMM_PRICE_DATE_FIELD_NAME]} does not have a price, please contact Navarch for assistance`)
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
								throw new Error(`The commodity price for ${commodity} of Price Method #${source} for the date of ${curr[COMM_PRICE_DATE_FIELD_NAME]} is not a valid number, please contact Navarch for assistance`)
							}
						}

						return acc + price;
					}, 0) / dailyPriceData.length;
					console.log(`[getCommodityAvgPrice] average price=${averagePrice} for commodity ${commodity} between ${formatDateYYYYMMDD(startDate)} (with over-adjusted start date of ${formatDateYYYYMMDD(adjustedStartDate)}) and ${formatDateYYYYMMDD(endDate)}`);
					return {
						averagePrice,
						startDate: new Date(dailyPriceData[dailyPriceData.length - 1][COMM_PRICE_DATE_FIELD_NAME]),
						endDate: new Date(dailyPriceData[0][COMM_PRICE_DATE_FIELD_NAME]),
					};
				} else {
					console.log(`[getCommodityAvgPrice] latest comm price date=${latestCommPriceDate} is before end date=${endDate}, getting forecast price`);
				}
			}

			if (!formValues.value[ID_FIELD_NAME]) {
				throw new Error('Please save the Cashflow form first before generating the cashflow doc')
			}

			const forecastPrices = await api.get(`/items/${FORECAST_COLLECTION_NAME}`, {params: {
				filter: {
					[FORECAST_COMMODITY_FIELD_NAME]: { "_eq": commodityId },
					[FORECAST_CASHFLOW_ID_FIELD_NAME]: { "_eq": formValues.value[ID_FIELD_NAME] }
				},
				fields: [
					FORECAST_PRICE_FIELD_NAME,
					FORECAST_COMMODITY_FIELD_NAME,
					FORECAST_START_DATE_FIELD_NAME,
					FORECAST_END_DATE_FIELD_NAME
				],
			}});

			validateForecastPrice(forecastPrices.data.data, commodity);
			// validatePriceRecordRange(commodityPrices.data.data, forecastPrices.data.data);

			// get the first forecast price whose start date and end date encompasses the start date and end date of the contract QP
			const forecastPrice = forecastPrices.data.data.find((forecastPrice) => {
				const forecastStartDate = new Date(forecastPrice[FORECAST_START_DATE_FIELD_NAME]);
				const forecastEndDate = new Date(forecastPrice[FORECAST_END_DATE_FIELD_NAME]);
				return forecastStartDate <= startDate && forecastEndDate >= endDate;
			});

			if (!forecastPrice) {
				throw new Error(`No single forecast price found for commodity ${commodity} between ${formatDateYYYYMMDD(startDate)} and ${formatDateYYYYMMDD(endDate)}, please ensure there is only one price value for this range`);
			}

			console.log(`[getCommodityAvgPrice] forecast price=${forecastPrice[FORECAST_PRICE_FIELD_NAME]} for commodity ${commodity} between ${formatDateYYYYMMDD(startDate)} and ${formatDateYYYYMMDD(endDate)}`);
			return {
				averagePrice: forecastPrice[FORECAST_PRICE_FIELD_NAME],
				startDate,
				endDate,
			};
		}

		function countBusinessDays(startDate: Date, endDate: Date) {
			let count = 0;
			let currentDate = new Date(startDate.getTime()); // clone startDate to avoid modifying it

			while (currentDate <= endDate) {
				// If current day is not Sunday (0) or Saturday (6), increment count
				if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
					count++;
				}
				currentDate.setDate(currentDate.getDate() + 1); // move to next day
			}

			return count;
		}

		function validateForecastPrice(forecastPrice, commodity: string) {
			if (!forecastPrice || !Array.isArray(forecastPrice) || forecastPrice.length === 0) {
				// if forecastPrice is undefined or not an array
				throw new Error(`No forecast price found for ${commodity}, please ensure prices have been provided`);
			}
		}


		function validatePriceRecordRange(actualPrices, forecastPrices) {
			// const earlistActualDate = new Date(actualPrices[0][COMM_PRICE_DATE_FIELD_NAME]);
			const latestActualDate = new Date(actualPrices[actualPrices.length - 1][COMM_PRICE_DATE_FIELD_NAME]);
			const earliestForecastDate = new Date(forecastPrices[0][FORECAST_START_DATE_FIELD_NAME]);
			// const latestForecastDate = new Date(forecastPrices[forecastPrices.length - 1][FORECAST_END_DATE_FIELD_NAME]);

			// const datefiedStartDate = new Date(startDate);
			// const datefiedEndDate = new Date(endDate);

			// if (earlistActualDate > datefiedStartDate) {
			// 	throw new Error(`The earliest actual price date ${formatDateYYYYMMDD(earlistActualDate)} is later than the start date ${formatDateYYYYMMDD(startDate)}, please ensure that there are prices for the missing dates`);
			// }

			// if (latestForecastDate < datefiedEndDate) {
			// 	throw new Error(`The latest forecast price date ${formatDateYYYYMMDD(latestActualDate)} is earlier than the end date ${formatDateYYYYMMDD(endDate)}, please ensure that there are prices for the missing dates`);
			// }

			// create a Date object one day before the earliest forecast date
			const earliestForecastDateMinusOneDay = new Date(earliestForecastDate.valueOf() - MILLISECONDS_IN_DAY);
			if (latestActualDate < earliestForecastDateMinusOneDay) {
				throw new Error(`There is a gap between the latest actual price date ${formatDateYYYYMMDD(latestActualDate)} and the earliest forecast date ${formatDateYYYYMMDD(earliestForecastDate)}, please provide a forecast value for the missing date`);
			}
		}

		function validateParcelData(parcel) {
			if (!parcel) {
				throw new Error(`Parcel data not found, please ensure the selected parcel still exists`);
			}
			if (!parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]) {
				throw new Error(`One of the parcels does not have a shipment code, please ensure that all parcels have a shipment code`);
			}
			if (!parcel[PARCEL_CONTRACT_FIELD_NAME]) {
				throw new Error(`The parcel ${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]} does not have a contract, please ensure that the contract field for the parcel is not empty`);
			}
			if (!parcel[PARCEL_COUNTERPARTY_FIELD_NAME]) {
				throw new Error(`The parcel ${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]} does not havea counterparty, please ensure that the counterparty field for the parcel is not empty`);
			}
			if (!parcel[PARCEL_ASSAY_RESULTS_FIELD_NAME]) {
				throw new NonFatalError(`The parcel ${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]} does not have assay results`);
			}
			if (!parcel[PARCEL_WEIGHT_RESULTS_FIELD_NAME]) {
				throw new NonFatalError(`The parcel ${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]} does not have weight results`);
			}
			if (!parcel[PARCEL_ORIGIN_FIELD_NAME]) {
				throw new Error(`The parcel ${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]} does not havean origin port`);
			}
			if (!parcel[PARCEL_DESTINATION_FIELD_NAME]) {
				throw new Error(`The parcel ${parcel[PARCEL_SHIPMENT_CODE_FIELD_NAME]} does not havea destination port`);
			}
		}

		function validateAssayLots(assayLots) {
			if (!assayLots || assayLots.length === 0) {
				throw new NonFatalError(`No assay lots found for the selected parcel`);
			}
		}

		function validateWeightLots(weightLots) {
			if (!weightLots || weightLots.length === 0) {
				throw new NonFatalError(`No weight lots found for the selected parcel`);
			}
		}

		function validateContractResponse(contract) {
			if (!contract) {
				throw new Error(`Contract data not found, please ensure the selected contract still exists`);
			}

			if (!contract[CONTRACT_CURRENCY_FIELD_NAME]) {
				throw new Error(`The contract ${contract[CONTRACT_NAME_FIELD_NAME]} does not have a set currency, please ensure that the currency field for the contract is not empty`);
			}

			if (!!contract[CONTRACT_GST_APPLICABLE_FIELD_NAME] && isNullOrUndefined(contract[CONTRACT_GST_RATE_FIELD_NAME])) {
				throw new Error(`The contract ${contract[CONTRACT_NAME_FIELD_NAME]} is applicable for GST but does not have a GST rate, please ensure that the GST rate field for the contract is not empty`);
			}
		}

		function validateCurrencyData(currency) {
			if (!currency) {
				throw new Error(`Currency data not found, please ensure the selected currency still exists`);
			}
			if (!currency[CURRENCY_CODE_FIELD_NAME]) {
				throw new Error(`The selected currency in the contract is not valid`);
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

			if (!commodityData[ID_FIELD_NAME]) {
				throw new Error(`Commodity ID for commodity ${commodityData[COMMODITY_NAME_FIELD_NAME] ?? commodity} is not defined, please contact Navarch for assistance`);
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

		function validateCounterparty(counterparty: any) {
			console.log('[validateCounterparty]');
			if (!counterparty) {
				throw new Error(`Counterparty for parcel not found`);
			}

			if (!counterparty[COUNTERPARTY_CODENAME_FIELD_NAME]) {
				throw new Error(`No codename defined for counterparty of the selected parcel`);
			}
		}

		// function validateCounterpartyAddress(counterpartyAddress) {
		// 	console.log('[validateCounterpartyAddress]');
		// 	if (!counterpartyAddress || counterpartyAddress.length === 0) {
		// 		throw new Error(`Counterparty address for parcel not found`);
		// 	}

		// 	if (!counterpartyAddress[0][COUNTERPARTY_ADDRESS_ADDRESS_FIELD_NAME]) {
		// 		throw new Error(`No address defined for counterparty of the selected parcel`);
		// 	}
		// }

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

			if (!company[COMPANY_PHONE_CODE_FIELD_NAME]) {
				throw new Error(`Please set company phone code in Directories > Company`);
			}

			if (!company[COMPANY_LINE_1_FIELD_NAME]) {
				throw new Error(`Please set company address line 1 in Directories > Company`);
			}

			if (!company[COMPANY_COUNTRY_FIELD_NAME]) {
				throw new Error(`Please set the country the company is based in Directories > Company`);
			}

			if (!company[COMPANY_PHONE_NUMBER_FIELD_NAME]) {
				throw new Error(`Please set the company phone number in Directories > Company`);
			}

			if (!company[COMPANY_SIGNATORY_NAME_FIELD_NAME]) {
				throw new Error(`Please set the company signatory name in Directories > Company`);
			}

			if (!company[COMPANY_SIGNATORY_TITLE_FIELD_NAME]) {
				throw new Error(`Please set the company signatory title in Directories > Company`);
			}

			if (!company[COMPANY_REMITTANCE_DETAILS_FIELD_NAME]) {
				throw new Error(`Please set the company remittance details in Directories > Company`);
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