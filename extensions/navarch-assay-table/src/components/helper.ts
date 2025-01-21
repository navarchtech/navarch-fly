import { Assay, AssayComposite, AssayLot, FinalAssayEquation, LosingPartyEnum } from "./types";
/**
 * Functions to evaluate Assay data based on Assay Lot data
 */
export function evaluateAssayData(lotsOrComposite: (AssayLot |AssayComposite)[], commidityNameMapping: Record<string, string>): Assay[] {
    if (!lotsOrComposite) {
        return [];
    }
    const lots = lotsOrComposite.filter(isNotComposite) as AssayLot[];
    const composites = lotsOrComposite.filter(item => !isNotComposite(item)) as AssayComposite[];
    let returnAssays: Assay[] = [];
    // Assay Lots must be mapped first
    if (lots.length > 0) {
        const groupedAssayLots = groupAssayLotsByMethodAndCommodity(lots);
        returnAssays = groupedAssayLots.map(groupedLots => evaluateAssayDataForLots(groupedLots, commidityNameMapping)).filter(isNotNullAssay);
    }

    // Composite Assays must be mapped after Assay Lots to give priority to Assay Lots
    if (composites.length > 0) {
        for(const composite of composites){
            if (!isCompositeUnique(composite, returnAssays)) {
                // if composite assay already exists in assay list, skip it
                // also runs after assay lots have been created first so assay lots get priority over composite assay if they have the same method and commodity
                continue;
            }
            const assay = evaluateAssayDataForComposite(composite, commidityNameMapping);
            if (assay != null) {
                returnAssays = [...returnAssays, assay];
            }
        }
    }
    return returnAssays;
    
}

export function evaluateAssayDataV2(lotsOrComposite: (AssayLot |AssayComposite)[], commidityNameMapping: Record<string, string>): Assay[] {
    const finalAssays: Assay[] = [];
    if (!lotsOrComposite) {
        return finalAssays;
    }
    const groupedAssays = groupAssaysByMethodAndCommodity(lotsOrComposite);
    let assay: Assay | null = null;
    for(const groupedAssay of groupedAssays){
        if (groupedAssay.length === 1 && !isNotComposite(groupedAssay[0])) {
            assay = evaluateAssayDataForComposite(groupedAssay[0] as AssayComposite, commidityNameMapping);
        } else {
            assay = evaluateAssayDataForLots(groupedAssay, commidityNameMapping);
        }
        if (assay != null) {
            finalAssays.push(assay);
        }
    }
    return finalAssays;
}

export function isCompositeAssay(assayLotOrComposite: AssayLot[] | AssayComposite): boolean {
    return !Array.isArray(assayLotOrComposite);
}

export function cloneLots(lots: AssayLot[]): AssayLot[] {
    console.log('[cloneLots]');
    return [...lots].map(lot => ({...lot}));
}

function isNotNullAssay(assayToCheck : Assay | null | undefined): assayToCheck is Assay {
    return !!assayToCheck;
}

function isNotNullAssayLot(lotToCheck: AssayLot | null | undefined): lotToCheck is AssayLot {
    return !!lotToCheck;
}

function isNotComposite(lotToCheck: AssayLot | AssayComposite | null | undefined): boolean {
    if (!lotToCheck) {
        return false;
    }
    return !!(('lot_number' in lotToCheck) && !!lotToCheck.lot_number);
}

function isCompositeUnique(composite: AssayComposite, assays: Assay[]): boolean {
    return !assays.some(assay => assay.method === composite.method && assay.commodity === composite.commodity);
}

export function generateDeterministicAssayId(assay: Assay | AssayLot | AssayComposite) {
    return `${assay.method}-${assay.commodity}`;
}

export function evaluateAssayDataForComposite(composite: AssayComposite, commidityNameMapping: Record<string, string>): Assay | null {
    if (!composite) {
        return null;
    }
    console.log(`[evaluateAssayDataForComposite] commodity name=${commidityNameMapping[composite.commodity]} for commodity=${composite.commodity}`)
    const assay: Assay = {
        assay_id: generateDeterministicAssayId(composite),
        method: composite.method,
        commodity: composite.commodity,
        commodity_name: commidityNameMapping[composite.commodity] ?? composite.commodity,
        assay_uom: composite.assay_uom,
        dry_weight_uom: composite.dry_weight_uom,
        seller_assay: composite.seller_assay,
        buyer_assay: composite.buyer_assay,
        difference: composite.difference,
        splitting_limit: composite.splitting_limit,
        to_umpire: composite.to_umpire,
        umpire_name: composite.umpire_name,
        umpire_assay: composite.umpire_assay,
        losing_party: composite.losing_party,
        final_assay: composite.final_assay,
        total_dry_weight: (composite.dry_weight ?? 0),
        total_arbitrated_dry_weight: !!composite.to_umpire ? (composite.dry_weight ?? 0) : 0,
        lots: composite
    }
    return assay;
}

export function evaluateAssayDataForLots(assayLots: (AssayLot | AssayComposite)[], commidityNameMapping: Record<string, string>): Assay | null {
    if (!assayLots) {
        return null;
    }
    const filteredAssayLots = (assayLots.filter(isNotComposite) as AssayLot[]).filter(isNotNullAssayLot);
    if (filteredAssayLots.length === 0) {
        return null;
    }

    const firstLot = filteredAssayLots[0] as AssayLot;
    console.log(`[evaluateAssayDataForLots] commodity name=${commidityNameMapping[firstLot.commodity]} for commodity=${firstLot.commodity}`)

    let assay: Assay = {
        assay_id: generateDeterministicAssayId(firstLot),

        dry_weight_uom: firstLot.dry_weight_uom,
        method: firstLot.method,
        commodity: firstLot.commodity,
        commodity_name: commidityNameMapping[firstLot.commodity] ?? firstLot.commodity,
        // Assay UoM should be the same for all assay lots with the same commodity and method as defined in the contract, will assume firstLot.assay_uom is the same for all lots here
        assay_uom: firstLot.assay_uom,
        seller_assay: 0,
        buyer_assay: 0,
        difference: 0,
        // Splitting limit should be the same for all assay lots with the same commodity, will assume firstLot.splitting_limit is the same for all lots here
        splitting_limit: firstLot.splitting_limit,
        final_assay: 0,

        to_umpire: false,

        total_dry_weight: 0,
        total_arbitrated_dry_weight: 0,
        lots: filteredAssayLots
    }

    filteredAssayLots.forEach(lot => {
        assay.buyer_assay = parseOptionalNumber(assay.buyer_assay) + parseOptionalNumber(lot.buyer_assay)*parseOptionalNumber(lot.dry_weight);
        // TODO: check if I really need to calculate difference here like this, or I can just get the average of seller_assay - average of buyer_assay; THERE'S A DIFFERENCE BETWEEN THESE 2 WAYS
        assay.difference = parseOptionalNumber(assay.difference) + parseOptionalNumber(lot.difference)*parseOptionalNumber(lot.dry_weight);;
        assay.final_assay = parseOptionalNumber(assay.final_assay) + parseOptionalNumber(lot.final_assay)*parseOptionalNumber(lot.dry_weight);;
        assay.seller_assay = parseOptionalNumber(assay.seller_assay) + parseOptionalNumber(lot.seller_assay)*parseOptionalNumber(lot.dry_weight);;

        assay.to_umpire = parseOptionalBoolean(assay.to_umpire) || parseOptionalBoolean(lot.to_umpire);
        if(!!lot.to_umpire) {
            // only have umpire assay as a defined value if there is at least one lot that requires umpire arbitration
            assay.umpire_assay = parseOptionalNumber(assay.umpire_assay) + parseOptionalNumber(lot.umpire_assay)*parseOptionalNumber(lot.dry_weight);;
            // TODO: confirm that we will only take the average of all umpire assays for a given lot by commodity & method
            assay.total_arbitrated_dry_weight += parseOptionalNumber(lot.dry_weight);
        } 

        // TODO: how to calculate the 'aggregate' value for splitting limit in Assay from Assay lots
        // Ans: same value per commodity from the contract
        // assay.splitting_limit += lot.splitting_limit;

        assay.total_dry_weight += parseOptionalNumber(lot.dry_weight);

        // assay.lots.push(lot);
    });

    // const count = filteredAssayLots.length;
    assay.buyer_assay = parseOptionalNumber(assay.buyer_assay)/assay.total_dry_weight;
    assay.seller_assay = parseOptionalNumber(assay.seller_assay)/assay.total_dry_weight;
    if (!!assay.to_umpire) {
        assay.umpire_assay = parseOptionalNumber(assay.umpire_assay)/assay.total_arbitrated_dry_weight;
    }
    assay.final_assay = parseOptionalNumber(assay.final_assay)/assay.total_dry_weight;

    assay.difference = parseOptionalNumber(assay.difference)/assay.total_dry_weight;
    
    const buyerLosesCount = filteredAssayLots.filter(lot => lot.losing_party === LosingPartyEnum.BUYER).length;
    const sellerLosesCount = filteredAssayLots.filter(lot => lot.losing_party === LosingPartyEnum.SELLER).length;
    if (sellerLosesCount !== 0 || buyerLosesCount !== 0) {
        // TODO: check on what to do all lots don't have a losing party, currently just declaring an assay for an commodity-method combo has a losing party only if there is at least one loser
        if (sellerLosesCount > buyerLosesCount) {
            assay.losing_party = LosingPartyEnum.SELLER;
        } else if (sellerLosesCount < buyerLosesCount) {
            assay.losing_party = LosingPartyEnum.BUYER;
        } else {
            assay.losing_party = LosingPartyEnum.SPLIT;
        }
    }

    return assay;
}

export function groupAssayLotsByMethodAndCommodity(assayLots: AssayLot[]): AssayLot[][] {
    const group = {
        'Planned': {} as { [key: string]: AssayLot[]; },
        'Estimated': {} as { [key: string]: AssayLot[]; },
        'Inturn': {} as { [key: string]: AssayLot[]; },
        'Inturn Final': {} as { [key: string]: AssayLot[]; },
        'Outturn': {} as { [key: string]: AssayLot[]; },
    };
    // const group = {} as { 
    //     [key: string]: { 
    //         [key: string]: AssayLot[]; 
    //     }; 
    // };
    assayLots.forEach(lot => {
        if (!group[lot.method]) {
            group[lot.method] = {} as { [key: string]: AssayLot[]; };
        }
        if (!group[lot.method][lot.commodity]) {
            group[lot.method][lot.commodity] = [lot];
        } else {
            // Shouldn't be null/undefined
            group[lot.method][lot.commodity]?.push(lot);
        }
    });
    return [
        ...Object.values(group['Planned']),
        ...Object.values(group['Estimated']),
        ...Object.values(group['Inturn']),
        ...Object.values(group['Inturn Final']),
        ...Object.values(group['Outturn']),
    ]
}

function groupAssaysByMethodAndCommodity(lotsOrComposite: (AssayLot | AssayComposite)[]): (AssayLot | AssayComposite)[][] {
    const group = {
        'Planned': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
        'Estimated': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
        'Inturn': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
        'Inturn Final': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
        'Outturn': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
    };
    // const group = {} as { 
    //     [key: string]: { 
    //         [key: string]: AssayLot[]; 
    //     }; 
    // };
    lotsOrComposite.forEach(lot => {
        if (!group[lot.method]) {
            group[lot.method] = {} as { [key: string]: AssayLot[]; };
        }
        if (!group[lot.method][lot.commodity]) {
            group[lot.method][lot.commodity] = [lot];
        } else {
            // Shouldn't be null/undefined
            group[lot.method][lot.commodity]?.push(lot);
        }
    });
    return [
        ...Object.values(group['Planned']),
        ...Object.values(group['Estimated']),
        ...Object.values(group['Inturn']),
        ...Object.values(group['Inturn Final']),
        ...Object.values(group['Outturn']),
    ]
}

export function evaluateDifference(sellerAssay: number | undefined, buyerAssay: number | undefined): number | undefined {
    if (!sellerAssay || !buyerAssay) {
        return undefined;
    }
    return sellerAssay - buyerAssay;
}

export function evaluateToUmpire(difference: number, splittingLimit: number, requireUmpireOnEquality: boolean): boolean {
    if (!!requireUmpireOnEquality && Math.abs(difference) === splittingLimit) {
        return true;
    }
    return Math.abs(difference) > splittingLimit;
}

export function evaluateLosingParty(sellerAssay: number | undefined, buyerAssay: number | undefined, umpireAssay: number | undefined): LosingPartyEnum | undefined {
    // Must check that the sellerAssay and buyerAssay params are not undefined, null or NaN before passing them into this function
    
    // TODO: check what happens when difference=splittingLimit
    // Ans: depends on the contract

    if (!umpireAssay || !sellerAssay || !buyerAssay) {
        // if one of these three assay values is undefined, null or NaN, then we can't determine a losing party
        // and even if the difference > splitting limit, don't define a losing party yet until an umpire assay value is given
        return undefined;
    }
    const sellerToUmpireDiff = Math.abs(sellerAssay-umpireAssay);
    const buyerToUmpireDiff = Math.abs(buyerAssay-umpireAssay);

    if (sellerToUmpireDiff > buyerToUmpireDiff) {
        return LosingPartyEnum.SELLER;
    } else if (buyerToUmpireDiff > sellerToUmpireDiff) {
        return LosingPartyEnum.BUYER;
    } else {
        // The only reason this block should be executed is when sellerToUmpireDiff=buyerToUmpireDiff
        return LosingPartyEnum.SPLIT;
    }
}

export function evaluateFinalAssay(sellerAssay: number | undefined, buyerAssay: number | undefined, umpireAssay: number | undefined, toUmpire: boolean | undefined, losingParty: LosingPartyEnum | undefined, finalAssayEvalMethod: FinalAssayEquation): number | undefined {
    if (!!sellerAssay && !!buyerAssay && !toUmpire) {
        // Get average of seller and buyer assay as final if there's no umpire
        return (sellerAssay + buyerAssay)/2;
    } else if (!!sellerAssay && !!buyerAssay && toUmpire) {
        if (!!umpireAssay){
            if (finalAssayEvalMethod === FinalAssayEquation.AVG_WITH_MIDDLE_ASSAY_AS_FINAL_FOR_ARBITRATION) {
                // get the middle value of the three assays
                return [umpireAssay, sellerAssay, buyerAssay].sort((a,b) => a-b)[1];
            } else if (finalAssayEvalMethod === FinalAssayEquation.AVG_WITH_AVG_OF_UMPIRE_AND_CLOSEST_AS_FINAL_FOR_ARBITRATION) {
                if (losingParty === undefined) {
                    // if there is no losing party defined for some reason (should not happen because the autofills should handle that), then evaluate the losing party here anyway and get calculate the final assay
                    // the evaluated losing party value here will not be saved though because this function has no access to it
                    losingParty = evaluateLosingParty(sellerAssay, buyerAssay, umpireAssay);
                }
                if (losingParty === LosingPartyEnum.SPLIT) {
                    // When there is a split and the final assay should be the average of the umpire and the closest assay, then get the middle value of the three assays instead
                    return [umpireAssay, sellerAssay, buyerAssay].sort((a,b) => a-b)[1];
                } else if (losingParty === LosingPartyEnum.SELLER) {
                    return (umpireAssay + buyerAssay)/2;
                } else if (losingParty === LosingPartyEnum.BUYER) {
                    return (umpireAssay + sellerAssay)/2;
                }
            }
        } else {
            // Get the average of the seller and buyer assay as final if there's no umpire assay even if toUmpire is true
            return (sellerAssay + buyerAssay)/2;
        }
    }
    return undefined
}

export function parseOptionalNumber(value: any, defaultValue: number = 0): number {
    if (value === undefined || value === null || isNaN(value)) {
        return defaultValue;
    }
    return parseFloat(value);
}

export function parseOptionalBoolean(value: boolean | undefined, defaultValue?: boolean): boolean {
    if (value === undefined || value === null) {
        return (defaultValue !== null && defaultValue !== undefined) ? defaultValue : false;
    }
    return value;
}

export function formatNumber(number: any, decimalPlaces: number = 4, showZero: boolean = true) {
    console.log(`[formatNumber] with number value=${number}`);
    if (isNaN(number) || number === null) {
        return '-';
    }
    // round off number to decimalPlaces decimal places
    const roundedNumber = Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
    // console.log(`[formatNumber] with roundedNumber value=${roundedNumber}`)
    // convert number to string and split into array of integer and decimal parts
    const [integerPart, decimalPart] = roundedNumber.toString().split('.');
    // console.log(`[formatNumber] with integerPart value=${integerPart} and decimalPart value=${decimalPart}`)
    if (!integerPart) {
        return '';
    }
    // convert integer part to string with digit group separator
    const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    // console.log(`[formatNumber] with formattedIntegerPart value=${formattedIntegerPart}`)
    if (!decimalPart && !showZero) {
        // if there is no decimal part, return formatted integer part
        return formattedIntegerPart;
    }

    // fill with zeroes to the right of decimal point to specified number of decimal places, if decimal part is not defined, let it start with an empty string and be padded
    const formattedDecimalPart = (decimalPart ?? '').padEnd(decimalPlaces, '0');
    // console.log(`[formatNumber] with formattedDecimalPart value=${formattedDecimalPart}`)


    // // convert decimal part to string with specified number of decimal places
    // const formattedDecimalPart = decimalPart ? decimalPart.slice(0, decimalPlaces) : '0'.repeat(decimalPlaces);
    // return formatted number
    return `${formattedIntegerPart}.${formattedDecimalPart}`;
}

export function isCompositeLotChanged(currentComposite: AssayComposite, originalComposite: AssayComposite): boolean {
    if (currentComposite.id !== originalComposite.id) {
        console.log(`[isCompositeLotChanged()] Current=${currentComposite.id} vs original=${originalComposite.id} composite id mismatch`);
        return false;
    }
    if (currentComposite.foreign_key !== originalComposite.foreign_key) {
        // TODO: throw error here?
        console.log(`[isCompositeLotChanged()] Current=${currentComposite.foreign_key} vs original=${originalComposite.foreign_key} foreign_key mismatch! This is a major error as it means data from another parcel is being used.`);
        return false;
    }
    // compare all values in both composite objects, if there is a difference, return true, else return false at the end
    if (currentComposite.dry_weight !== originalComposite.dry_weight) {
        return true;
    }
    if (currentComposite.dry_weight_uom !== originalComposite.dry_weight_uom) {
        return true;
    }

    if (currentComposite.assay_uom !== originalComposite.assay_uom) {
        return true;
    }
    if (currentComposite.seller_assay !== originalComposite.seller_assay) {
        return true;
    }
    if (currentComposite.buyer_assay !== originalComposite.buyer_assay) {
        return true;
    }

    if (currentComposite.difference !== originalComposite.difference) {
        return true;
    }
    if (currentComposite.splitting_limit !== originalComposite.splitting_limit) {
        return true;
    }

    if (currentComposite.to_umpire !== originalComposite.to_umpire) {
        return true;
    }
    if (currentComposite.umpire_name !== originalComposite.umpire_name) {
        return true;
    }
    if (currentComposite.umpire_assay !== originalComposite.umpire_assay) {
        return true;
    }
    if (currentComposite.losing_party !== originalComposite.losing_party) {
        return true;
    }

    if (currentComposite.final_assay !== originalComposite.final_assay) {
        return true;
    }
    
    if (currentComposite.commodity !== originalComposite.commodity) {
        return true;
    }
    if (currentComposite.method !== originalComposite.method) {
        return true;
    }
    return false;
}