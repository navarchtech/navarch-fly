import { styles } from "../shared/constants";
import { 
    generatePdf, 
    replaceSpacesWithUnderscore, 
    formatNumber, 
    generateImageForPdf, 
    getCurrentDateTime,
    bottomBorderForTableContentWithColumnsAmount,
} from "../shared/utils";
import { buildSignatoryBox } from "../shared/builders";

export async function createAssayExchangeCertDocDescription(req: any): Promise<any> {
    const {
        folder_id,
        company_logo,
        seller,
        seller_address,
        seller_phone_number,
        buyer,
        parcel_ref,
        contract_ref,
        vessel,
        bl_date,
        port_of_loading,
        port_of_discharge,
        assays,
        composite_assays,
        weights,
        signatory
    } = req.body;

    const companyLogoImageData = generateImageForPdf(company_logo);

    var dd = {
        // Default pageSize for A4: {595.28, y}
        // 520px is the full width of the page
        pageSize: 'A4',
        // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
        pageMargins: [ 40, 240, 40, 60 ],
        info: {
            title: `${seller}`,
            author: 'Navarch Technologies',
            subject: `Assay Exchange Certificate (${parcel_ref})`,
            keywords: `${replaceSpacesWithUnderscore(parcel_ref)}-assay-exchange-cert`,
        },
        header: function(_currentPage: any, _pageCount :any, _pageSize: any) {
            return {
                margin: [40, 60, 40, 0],
                stack: [
                    {
                        columns: [
                            {
                                width: '25%',
                                stack: [
                                    {text: `${seller}\n`, style: (!!seller && seller.length <=20) ? 'midfont' : 'smlfont', bold: true},
                                    {text: `${seller_address}\n\n`,  style: 'xsmlfont'},
                                    {text:  !!seller_phone_number ? `${seller_phone_number}\n\n\n` : `\n`, style: 'xsmlfont'},
                                ]
                            },
                            { width: '50%',text: 'Assay Exchange Certificate', style: 'bigDocTitleInHeaderWithTop27Padding', alignment: 'center' },
                            companyLogoImageData ? {
                                image: companyLogoImageData,
                                fit: [60, 60],
                                width: '25%',
                                alignment: 'right',
                                style: 'marginBottom5'
                            } : null
                        ]
                    },
                    {canvas: [{type: 'line', x1: 0, y1: 10, x2: 522, y2: 10, lineWidth: 1},]},
                    {
                        style: 'tableSmlTopMarginLrgBottomMargin',
                        table: {
                            widths: [90, 220, '*', 100],
                            body: [
                                [
                                    {text: 'Parcel Information', style: 'tableHeader', colSpan: 2},
                                    '', 
                                    {text: 'Shipment Information', style: 'tableHeader', colSpan: 2},
                                    '', 
                                ],
                                [
                                    'Buyer:', {text: `${buyer}`, bold: true}, 'Vessel:', {text: `${vessel}`, alignment: 'right'}
                                ],
                                ['Contract:', `${contract_ref ?? '-'}`, 'Port of Loading:', {text: `${port_of_loading}`, alignment: 'right'}],
                                ['Parcel:', `${parcel_ref ?? '-'}`, 'B/L Date:', {text: `${bl_date}`, alignment: 'right'}],
                                ['', '', 'Port of Discharge:', {text: `${port_of_discharge}`, alignment: 'right'}],
                                bottomBorderForTableContentWithColumnsAmount(4)
                            ]
                        },
                        layout: {
                            defaultBorder: false,
                            hLineWidth: () => 1,
                        }
                    },
                ]
            }
        },
        footer: function(currentPage: any, pageCount: any, _pageSize: any) {
            return {
                margin: [40, 0, 40, 0],
                stack: [
                    {canvas: [{type: 'line', x1: 0, y1: 0, x2: 522, y2: 0, lineWidth: 0.5},]},
                    ' ',
                    {
                        columns: [
                        ' ',
                        { text: 'Page ' + currentPage.toString() + ' of ' + pageCount.toString(), alignment: 'center' },
                        { text: 'by Navarch Technologies', alignment: 'right', style: 'footer'  }
                        ]
                    }
                ],
            }
        },
        content: [
            ...buildAssayLotsExchangeTables(assays, weights),
            ...buildCompositeAssaysExchangeTables(composite_assays),
            ...buildSignatoryBox(signatory)
        ],
        styles
    }

    const downloadName = `AssayExchangeCertificate-[${getCurrentDateTime()}]-${replaceSpacesWithUnderscore(parcel_ref)}`;
    const title = `Assay Exchange Certificate (Parcel #${parcel_ref})`;
    return await generatePdf(dd, downloadName, title, folder_id ?? null);

    // var pdfDoc = printer.createPdfKitDocument(dd);
    // // Find a way to switch between "STORAGE_LOCAL_ROOT/invoices" and can be switched to STORAGE_GCS_ROOT/invoices in production
    // // Make it dynamic, build env variable string, reference navarch/navarch repo
    // pdfDoc.pipe(fs.createWriteStream(`uploads/${replaceSpacesWithUnderscore(parcel_ref)}-assay-exchange-cert.pdf`));
    // pdfDoc.end();
}

type AssayLot = {
	lotNumber: number;
	assayUom: string;
	analyticalAssay: number;
	commodityName: string;
	commodityCode: string;
}

type WeightLot = {
	lotNumber: number;
	dryWeight: number;
	dryWeightUom: string;
	wetWeight: number;
	wetWeightUom: string;
	moisture: number;
	moistureUom: string;
}

type TotalWeightAvgMoisture = {
	totalDryWeight: number;
	totalWetWeight: number;
	avgMoisture: number;
}

// type CommodityInRow = {
// 	assayUom: string;
// 	analyticalAssay: number;
// 	commodityName: string;
// 	commodityCode: string;
// }

// type AssayLotTableRow = {
// 	lotNumber: number;
// 	firstCommodity: CommodityInRow;
// 	secondCommodity?: CommodityInRow;
// 	dryWeight: number;
// 	dryWeightUom: string;
// 	wetWeight: number;
// 	wetWeightUom: string;
// 	moisture: number;
// 	moistureUom: string;
// }

type CompositeAssay = {
	assayUom: string;
	analyticalAssay: number;
	commodityName: string;
	commodityCode: string;
}

function groupAssayLotsByCommodity(assays: AssayLot[]): AssayLot[][] {
	const assaysByCommodity: any = {};
	for (const assay of assays) {
		if (assaysByCommodity[assay.commodityCode] === undefined) {
			// console.log(`[Assay Exchange Cert Builder] new commodity ${assay.commodityCode} found and creating a new assay array`);
			assaysByCommodity[assay.commodityCode] = [];
		}
		// console.log(`[Assay Exchange Cert Builder] pushing assay=${JSON.stringify(assay)}`);
		assaysByCommodity[assay.commodityCode].push(assay);
	}
	// return values of assaysByCommodity where assays are sorted by lot number
    const assayByCommodityArray = Object.values(assaysByCommodity) as AssayLot[][];

    assayByCommodityArray.forEach(assays => assays.sort((lotOne, lotTwo) => lotOne.lotNumber - lotTwo.lotNumber));

    return assayByCommodityArray;
}

// // take every first and second assay AssayLot[] in AssayLot[][] and convert it to AssayLotTableRow[][]
// function convertAssayLotsToAssayLotTableRows(assays: AssayLot[][]): AssayLotTableRow[][] {
// 	const groupedAssayLotsByTwo = groupAssayLotsIntoGroupsOf(2, assays);
// 	const assayLotTables: AssayLotTableRow[][] = [];
// 	let assayLotTable: AssayLotTableRow[] = [];
// 	for(const groupOfTwo of groupedAssayLotsByTwo) {
// 		for(const commodityAssay of groupOfTwo) 
// 			assayLotTable.push({});
// 	}
// }
 
function groupAssayLotsIntoGroupsOf(groupCount: number, groupedAssayLots: AssayLot[][]): AssayLot[][][] {
	const assayLotsGroups: AssayLot[][][] = [];
	for (let i = 0; i < groupedAssayLots.length; i += groupCount) {
		assayLotsGroups.push(groupedAssayLots.slice(i, i + groupCount));
	}
	return assayLotsGroups;
}

function evaluateAggregateWeightLotValues(weights: WeightLot[]): TotalWeightAvgMoisture {
    const totalWetWeight = weights.reduce((acc, curr) => (acc + curr.wetWeight), 0);
    const totalDryWeight = weights.reduce((acc, curr) => (acc + curr.dryWeight), 0);
    const avgMoisture = ((totalWetWeight - totalDryWeight)/totalWetWeight) * 100;
    return {
        totalWetWeight,
        totalDryWeight,
        avgMoisture
    }
}

function evaluateWeightedAverageAssay(assays: AssayLot[], weights: WeightLot[]): number {
    // assumes all assays are for the same commodity, no checks will be performed
    // assumes the lots are sorted in ascending order for lot numbers for both 'assays' and 'weights'

    if (assays.length !== weights.length) {
        throw new Error(`[Assay Exchange Doc Builder] number of assays=${assays.length} does not match the number of weights=${weights.length}`);
    }

    const noOfLots = assays.length;

    let assayTimesDryWeight = 0;
    let totalDryWeight = 0;
    for (let i=0; i<noOfLots; i++) {
        if (assays[i] === undefined || assays[i]?.analyticalAssay === undefined || weights[i] === undefined || weights[i]?.dryWeight === undefined) {
            console.error(`[Assay Exchange Doc Builder] assay (${JSON.stringify(assays[i])}) or weight (${JSON.stringify(weights[i])}) no.${i} is undefined or one of their value is undefined`)
            continue;
        }
        assayTimesDryWeight += (assays[i]?.analyticalAssay ?? 0)*(weights[i]?.dryWeight ?? 0);
        totalDryWeight += weights[i]?.dryWeight ?? 0
    }

    return assayTimesDryWeight/totalDryWeight;
}

function buildAssayLotsExchangeTables(assays: AssayLot[], weights: WeightLot[]): Array<Object> {
	// console.log(`[Assay Exchange Doc Builder] assays=${JSON.stringify(assays)}`)
	// assays.sort((lotOne, lotTwo) => lotOne.lotNumber - lotTwo.lotNumber);
	weights.sort((lotOne, lotTwo) => lotOne.lotNumber - lotTwo.lotNumber);
    const totalWeightsAvgMoisture = evaluateAggregateWeightLotValues(weights);
	const groupedAssaysByCommodity = groupAssayLotsByCommodity(assays);

    /**Not sure why this if block is here to be honest, there should be no need to check the number of commodities in the assays to the number of weight lots */
	// if (groupedAssaysByCommodity.length !== weights.length) {
	// 	throw new Error(`[Assay Exchange Doc Builder] number of assay lots by commodity=${groupedAssaysByCommodity.length} does not match the number of weight lots=${weights.length}`);
	// }
	const assayLotsInGroupsOfTwo = groupAssayLotsIntoGroupsOf(2, groupedAssaysByCommodity);

	const dd = [];
	for (const groupOfTwo of assayLotsInGroupsOfTwo) {
		if (groupOfTwo.length === 2) {
			const firstCommodityAssays = (groupOfTwo[0] as AssayLot[]).sort((lotOne, lotTwo) => lotOne.lotNumber - lotTwo.lotNumber);
            const avgFirstCommodityAssay = evaluateWeightedAverageAssay(firstCommodityAssays, weights);
			const secondCommodityAssays = (groupOfTwo[1] as AssayLot[]).sort((lotOne, lotTwo) => lotOne.lotNumber - lotTwo.lotNumber);
            const avgSecondCommodityAssay = evaluateWeightedAverageAssay(secondCommodityAssays, weights);
			dd.push({
				style: 'tableSmlTopMarginLrgBottomMargin',
				table: {
				  // headers are automatically repeated if the table spans over multiple pages
				  // you can declare how many rows should be treated as headers
				  headerRows: 1,
				  widths: [ 50, 60, 30, 60, 30, 60, 30, 60, 60 ],
		  
				  body: [
					[ 
						{text: 'Lot', alignment: 'center', style: 'tableHeaderCell' }, 
						{text: 'Wet Weight', alignment: 'right', style: 'tableHeaderCell' }, 
						{text: 'Unit', alignment: 'left', style: 'tableHeaderCell' }, 
						{text: 'Moisture', alignment: 'right', style: 'tableHeaderCell' }, 
						{text: 'Unit', alignment: 'left', style: 'tableHeaderCell' }, 
						{text: 'Dry Weight', alignment: 'right', style: 'tableHeaderCell' }, 
						{text: 'Unit', alignment: 'left', style: 'tableHeaderCell' }, 
						{text: `${firstCommodityAssays[0]?.commodityName} (${firstCommodityAssays[0]?.commodityCode} - ${firstCommodityAssays[0]?.assayUom})`, alignment: 'center', style: 'tableHeaderCell' }, 
						{text: `${secondCommodityAssays[0]?.commodityName} (${secondCommodityAssays[0]?.commodityCode} - ${secondCommodityAssays[0]?.assayUom})`, alignment: 'center', style: 'tableHeaderCell' }, 
					],
					...weights.map((weightLot, index) => [{text: weightLot.lotNumber, alignment: 'center'}, {text: formatNumber(weightLot.wetWeight), alignment: 'right'}, weightLot.wetWeightUom, {text: formatNumber(weightLot.moisture), alignment: 'right'}, weightLot.moistureUom, {text: formatNumber(weightLot.dryWeight), alignment: 'right'}, weightLot.dryWeightUom, {text: formatNumber(firstCommodityAssays[index]?.analyticalAssay), alignment: 'center'}, {text: formatNumber(secondCommodityAssays[index]?.analyticalAssay), alignment: 'center'}])
				  ]
				},
                layout: {
                    vLineWidth: () => 0.5,
                    hLineWidth: () => 0.5,
                    fillColor: function (rowIndex: number, _node: any, _columnIndex: number) {
                        return (rowIndex < 1) ? '#BFBFBF' : ((rowIndex % 2 === 1) ? '#F2F2F2' : null);
                    }
                }
			});

            dd.push({
				style: 'tableSmlTopMarginLrgBottomMargin',
				table: {
				  // headers are automatically repeated if the table spans over multiple pages
				  // you can declare how many rows should be treated as headers
				  headerRows: 0,
				  widths: [ 50, 60, 30, 60, 30, 60, 30, 60, 60 ],
		  
				  body: [
					[ 
						{text: 'Total / Average', alignment: 'center'}, 
						{text: formatNumber(totalWeightsAvgMoisture.totalWetWeight), alignment: 'right'}, 
						'', 
						{text: formatNumber(totalWeightsAvgMoisture.avgMoisture), alignment: 'right'}, 
						'', 
						{text: formatNumber(totalWeightsAvgMoisture.totalDryWeight), alignment: 'right'}, 
						'', 
						{text: formatNumber(avgFirstCommodityAssay), alignment: 'center'}, 
						{text: formatNumber(avgSecondCommodityAssay), alignment: 'center'}, 
					]
				  ]
				},
                layout: {
                    vLineWidth: () => 0.5,
                    hLineWidth: () => 0.5,
                },
				pageBreak: 'after'
			});
		} else if (groupOfTwo.length === 1) {
			const firstCommodityAssays = (groupOfTwo[0] as AssayLot[]).sort((lotOne, lotTwo) => lotOne.lotNumber - lotTwo.lotNumber);
            const avgFirstCommodityAssay = evaluateWeightedAverageAssay(firstCommodityAssays, weights);
			dd.push({
				style: 'tableSmlTopMarginLrgBottomMargin',
				table: {
				  // headers are automatically repeated if the table spans over multiple pages
				  // you can declare how many rows should be treated as headers
				  headerRows: 1,
				  widths: [ 50, 60, 30, 60, 30, 60, 30, 120 ],
		  
				  body: [
					[ 
						{text: 'Lot', alignment: 'center', style: 'tableHeaderCell' }, 
						{text: 'Wet Weight', alignment: 'right', style: 'tableHeaderCell' }, 
						{text: 'Unit', alignment: 'left', style: 'tableHeaderCell' }, 
						{text: 'Moisture', alignment: 'right', style: 'tableHeaderCell' }, 
						{text: 'Unit', alignment: 'left', style: 'tableHeaderCell' }, 
						{text: 'Dry Weight', alignment: 'right', style: 'tableHeaderCell' }, 
						{text: 'Unit', alignment: 'left', style: 'tableHeaderCell' }, 
						{text: `${firstCommodityAssays[0]?.commodityName} (${firstCommodityAssays[0]?.commodityCode} - ${firstCommodityAssays[0]?.assayUom})`, alignment: 'center', style: 'tableHeaderCell' }
					],
					...weights.map((weightLot, index) => [{text: weightLot.lotNumber, alignment: 'center'}, {text: formatNumber(weightLot.wetWeight), alignment: 'right'}, weightLot.wetWeightUom, {text: formatNumber(weightLot.moisture), alignment: 'right'}, weightLot.moistureUom, {text: formatNumber(weightLot.dryWeight), alignment: 'right'}, weightLot.dryWeightUom, {text: formatNumber(firstCommodityAssays[index]?.analyticalAssay), alignment: 'center'}])
				  ]
				},
                layout: {
                    vLineWidth: () => 0.5,
                    hLineWidth: () => 0.5,
                    fillColor: function (rowIndex: number, _node: any, _columnIndex: number) {
                        return (rowIndex < 1) ? '#BFBFBF' : ((rowIndex % 2 === 1) ? '#F2F2F2' : null);
                    }
                }
			});

            dd.push({
				style: 'tableSmlTopMarginLrgBottomMargin',
				table: {
				  // headers are automatically repeated if the table spans over multiple pages
				  // you can declare how many rows should be treated as headers
				  headerRows: 0,
				  widths: [ 50, 60, 30, 60, 30, 60, 30, 120 ],
		  
				  body: [
					[ 
						{text: 'Total / Average', alignment: 'center'}, 
						{text: formatNumber(totalWeightsAvgMoisture.totalWetWeight), alignment: 'right'}, 
						'', 
						{text: formatNumber(totalWeightsAvgMoisture.avgMoisture), alignment: 'right'}, 
						'', 
						{text: formatNumber(totalWeightsAvgMoisture.totalDryWeight), alignment: 'right'}, 
						'', 
						{text: formatNumber(avgFirstCommodityAssay), alignment: 'center'}
					]
				  ]
				},
                layout: {
                    vLineWidth: () => 0.5,
                    hLineWidth: () => 0.5,
                },
				pageBreak: 'after'
			});
		}
	}

	return dd;
}

function buildCompositeAssaysExchangeTables(assays: CompositeAssay[]) {
    const dd: any[] = [{text: 'Composite Assays', style: 'sectionHeader'}];
    if (assays.length === 0) {
        return dd;
    }
    dd.push({
        style: 'tableSmlTopMarginLrgBottomMargin',
        table: {
            // headers are automatically repeated if the table spans over multiple pages
            // you can declare how many rows should be treated as headers
            headerRows: 1,
            widths: [ 100, 100 ],
    
            body: [
                [
                    {text: 'Commodity', style: 'tableHeaderCell' },
                    {text: 'Assay', style: 'tableHeaderCell' },
                ],
                ...assays.map(assay => [ 
                    {text: `${assay.commodityName} (${assay.commodityCode})`}, 
                    {text: `${formatNumber(assay.analyticalAssay)} ${assay.assayUom}`}
                ])
            ]
        },
        layout: {
            vLineWidth: () => 0.5,
            hLineWidth: () => 0.5,
            fillColor: function (rowIndex: number, _node: any, _columnIndex: number) {
                return (rowIndex < 1) ? '#BFBFBF' : ((rowIndex % 2 === 1) ? '#F2F2F2' : null);
            }
        }
    });
	return dd;
}