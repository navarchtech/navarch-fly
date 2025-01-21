import { styles } from "../shared/constants";
import { 
    // generateImageForPdf, 
    formatDateInIso, 
    formatNumber, 
    generatePdf, 
    getCurrentDateTime, 
    replaceSpacesWithUnderscore 
} from "../shared/utils";

export async function createShipmentLatestDocumentDefintion(req: any): Promise<any> {
    /**
     * Expectations from the request body:
     * - All elements in all parcels are of the same assay uom and contained metal uom
     * - All parcels wet/dry weight are measured in their respective uoms
     * - All parcels moisture is measured in percentage and have been correctly calculated
     * - No two parcels have the same name, if they have the same name then it is expected the requester had appended a number to the name in the form of 'name (1)', 'name (2)', etc. in the request body
     */
    const {
        folder_id,
        // company_logo,
        start_date,
        end_date,
        filter_date,
        parcels,
        wet_weight_uom,
        dry_weight_uom,
    } = req.body;

    // const companyLogoImageData = generateImageForPdf(company_logo);

    // console.log(`[shipment-latest-generator] parcels=${JSON.stringify(parcels)}`);
    const shipmentTable = buildShipmentTables(parcels, filter_date, wet_weight_uom, dry_weight_uom);
    // console.log(`[shipment-latest-generator] shipmentTable=${JSON.stringify(shipmentTable)}`);

    var dd = {
        // Default pageSize for A4: {595.28, y}
        pageSize: 'A4',
        pageOrientation: 'landscape',
        // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
        pageMargins: [ 40, 120, 40, 60 ],
        info: {
            title: `Shipment Latest`,
            author: 'Navarch Technologies',
            subject: `Shipment Latest`,
            keywords: `shipment-latest-${replaceSpacesWithUnderscore(start_date)}-${replaceSpacesWithUnderscore(end_date)}`,
        },
        header: function(_currentPage: any, _pageCount :any, _pageSize: any) {
            return {
                margin: [40, 60, 40, 0],
                stack: [
                    {
                        columns: [
                            {
                                text: '',
                                width: '25%',
                                alignment: 'right'
                            },
                            {
                                width: '50%',
                                stack: [
                                    { text: 'Shipment Latest', style: 'bigTitleForHeader', alignment: 'center', bold: true },
                                    { text: `${filter_date} from ${start_date} to ${end_date}`, alignment: 'center', italics: true },
                                ]
                            },
                            {
                                text: '',
                                width: '25%',
                            },
                            // {
                            //     [!!companyLogoImageData ? 'image' : 'text']: companyLogoImageData ?? '',
                            //     fit: [60, 60],
                            //     width: '25%',
                            //     alignment: 'right',
                            //     style: 'marginBottom5'
                            // },
                        ]
                    },
                ]
            }
        },
        footer: function(currentPage: any, pageCount: any, _pageSize: any) {
            return {
                margin: [40, 0, 40, 0],
                stack: [
                    {canvas: [{type: 'line', x1: 0, y1: 0, x2: 760, y2: 0, lineWidth: 0.5},]},
                    ' ',
                    {
                        columns: [
                            { text: `Shipment Latest - with Metals\n${filter_date} from ${start_date} to ${end_date}`, style: 'xsmlfont', alignment: 'left' },
                            { text: 'Page ' + currentPage.toString() + ' of ' + pageCount.toString(), alignment: 'center' },
                            { text: 'by Navarch Technologies', alignment: 'right', style: 'footer'  }
                        ]
                    }
                ]
            }
        },
        content: [
            ...shipmentTable
        ],
        styles
    }

    // convert start_date and end_date to ISO format
    const isoStartDate = formatDateInIso(start_date);
    const isoEndDate = formatDateInIso(start_date);

    const downloadName = `ShipmentLatest-[${getCurrentDateTime()}]-${isoStartDate}-${isoEndDate}`;
    const title = `Shipment Latest - ${filter_date} (${start_date} ~ ${end_date})`;
    return await generatePdf(dd, downloadName, title, folder_id ?? null);
}

type Parcel = {
    name: string,
    counterparty: string,
    port: string,
    vessel: string,
    phy_status: string,
    fin_status: string,
    shipment_date: string,
    weight_source: string,
    wet_weight: number,
    dry_weight: number,
    moisture: number,
    assay_source: string,
    assays: Assay[],
}

type ParcelForTable = {
    name: string,
    counterparty: string,
    port: string,
    vessel: string,
    phy_status: string,
    fin_status: string,
    shipment_date: string,
    weight_source: string,
    wet_weight: number,
    dry_weight: number,
    moisture: number,
    assay_source: string,
    assays: {
        [key: string]: Assay
    },
}

type GrandTotalData = {
    totalWetWeight: number,
    totalMoisture: number,
    totalDryWeight: number,
}

type TotalMetalWeightByCode = {
    [key: string]: number
}

type Assay = {
    commodity: string,
    code: string,
    assay: number,
    assay_uom: string,
    contained_metal: number,
    contained_metal_uom: string,
}

type AssayField = 'commodity' | 'code' | 'assay' | 'assay_uom' | 'contained_metal' | 'contained_metal_uom';

function fetchAllElementsAndSort(parcels: Parcel[]): Assay[][] {
    // extract all assays from all parcels into an array of assays, make unique by assay.code
    const assays: Assay[] = [];
    parcels.forEach((parcel: Parcel) => {
        parcel.assays.forEach((assay: Assay) => {
            assays.push(assay);
        });
    });
    const uniqueAssays = assays.filter((assay: Assay, index: number, self: Assay[]) => {
        return index === self.findIndex((t: Assay) => (
            t.code === assay.code
        ))
    });

    // take the list of uniqueAssays and group them into arrays of two
    const assaysGroupedByTwo: Assay[][] = [];
    for (let i = 0; i < uniqueAssays.length; i += 2) {
        assaysGroupedByTwo.push(uniqueAssays.slice(i, i + 2));
    }

    return assaysGroupedByTwo;
}

function processParcelsForTable(parcels: Parcel[]): ParcelForTable[] {
    // convert parcels into a ParcelForTable where the key is the assay code
    const parcelsForTable: ParcelForTable[] = [];
    parcels.forEach((parcel: Parcel) => {
        const assays: any = {};
        parcel.assays.forEach((assay: Assay) => {
            assays[assay.code] = assay;
        });
        parcelsForTable.push({
            name: parcel.name,
            counterparty: parcel.counterparty,
            port: parcel.port,
            vessel: parcel.vessel,
            phy_status: parcel.phy_status,
            fin_status: parcel.fin_status,
            shipment_date: parcel.shipment_date,
            weight_source: parcel.weight_source,
            wet_weight: parcel.wet_weight,
            dry_weight: parcel.dry_weight,
            moisture: parcel.moisture,
            assay_source: parcel.assay_source,
            assays
        });
    });

    // if multiple parcels share the same 'name' then append a number to the name in the form of 'name (1)', 'name (2)', etc. and assign it to the parcels in parcelForTable
    const parcelNames: string[] = [];
    parcelsForTable.forEach((parcel: ParcelForTable) => {
        if (parcelNames.includes(parcel.name)) {
            let i = 1;
            while (parcelNames.includes(`${parcel.name} (${i})`)) {
                i++;
            }
            parcelNames.push(`${parcel.name} (${i})`);
            parcel.name = `${parcel.name} (${i})`;
        } else {
            parcelNames.push(parcel.name);
        }
    });

    return parcelsForTable;
}

function buildShipmentTables(parcels: Parcel[], _filter_date: string, wet_weight_uom: string, dry_weight_uom: string): any[] {
    const assaysGroupedByTwo = fetchAllElementsAndSort(parcels);
    const parcelsForTable = processParcelsForTable(parcels);
    const totalDryAndWetWeights = evaluateTotalDryAndWetWeights(parcels);
    const totalMetalWeightByCode = evaluateTotalMetalWeightByCode(parcels);

    const allPages: any[] = [];

    const numberOfPages = assaysGroupedByTwo.length;
    assaysGroupedByTwo.forEach((assaysOfTwo, i) => {
        if (assaysOfTwo.length === 2) {
            // allPages.push(
            //     {
            //         style: 'tableSmlTopMarginLrgBottomMargin',
            //         table: {
            //             // headers are automatically repeated if the table spans over multiple pages
            //             // you can declare how many rows should be treated as headers
            //             headerRows: 0,
            //             widths: [ 100, 10, '*' ],
            //             body: [
            //                 [
            //                     'Filter Date',
            //                     ':',
            //                     filter_date
            //                 ]
            //             ]
            //         },
            //         layout: 'noBorders'
            //     }
            // );

            allPages.push({
                style: 'tableSmlTopMarginLrgBottomMargin',
                table: {
                    // headers are automatically repeated if the table spans over multiple pages
                    // you can declare how many rows should be treated as headers
                    headerRows: 2,
                    widths: [ 43, 46, 46, 46, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37 ],
                    body: [
                        [
                            // 'Parcel',
                            { text: 'Parcel', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Counterparty',
                            { text: 'Counterparty', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Port',
                            { text: 'Port', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Vessel',
                            { text: 'Vessel', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Status',
                            { text: 'Status', colSpan: 2, alignment: 'center', bold: true },
                            '',
                            // 'Shipment Date',
                            { text: 'Shipment Date', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Weight Source',
                            { text: 'Weight Source', rowSpan: 2, alignment: 'center', bold: true },
                            // wet_weight_uom,
                            { text: wet_weight_uom, rowSpan: 2, alignment: 'center', bold: true },
                            // 'Moist',
                            { text: 'Moisture', rowSpan: 2, alignment: 'center', bold: true },
                            // dry_weight_uom,
                            { text: dry_weight_uom, rowSpan: 2, alignment: 'center', bold: true },
                            // 'Assay Source',
                            { text: 'Assay Source', rowSpan: 2, alignment: 'center', bold: true },
                            { text: `${assaysOfTwo[0]?.commodity} (${assaysOfTwo[0]?.code})`, colSpan: 2, alignment: 'center', bold: true },
                            '',
                            // `${assaysOfTwo[0]?.commodity} (${assaysOfTwo[0]?.code})`,
                            // `${assaysOfTwo[0]?.commodity} (${assaysOfTwo[0]?.code})`,
                            { text: `${assaysOfTwo[1]?.commodity} (${assaysOfTwo[1]?.code})`, colSpan: 2, alignment: 'center', bold: true },
                            ''
                            // `${assaysOfTwo[1]?.commodity} (${assaysOfTwo[1]?.code})`,
                            // `${assaysOfTwo[1]?.commodity} (${assaysOfTwo[1]?.code})`
                        ],
                        [
                            '',
                            '',
                            '',
                            '',
                            { text: 'Physical', alignment: 'center', bold: true },
                            { text: 'Financial', alignment: 'center', bold: true },
                            '',
                            '',
                            '',
                            '',
                            '',
                            '',
                            { text: `Assay (${assaysOfTwo[0]?.assay_uom})`, alignment: 'center', bold: true },
                            { text: `Assay (${assaysOfTwo[0]?.contained_metal_uom})`, alignment: 'center', bold: true },
                            { text: `Assay (${assaysOfTwo[1]?.assay_uom})`, alignment: 'center', bold: true },
                            { text: `Assay (${assaysOfTwo[1]?.contained_metal_uom})`, alignment: 'center', bold: true },
                        ],
                        ...buildShipmentTableRows(parcelsForTable, assaysOfTwo)
                    ]
                },
                layout: {
                    vLineWidth: () => 0.5,
                    hLineWidth: () => 0.5,
                    fillColor: function (rowIndex: number, _node: any, _columnIndex: number) {
                        return (rowIndex < 2) ? '#BFBFBF' : ((rowIndex % 2 === 0) ? '#F2F2F2' : null);
                    }
                }
            });

            allPages.push({
                style: 'tableSmlTopMarginLrgBottomMargin',
                table: {
                    headerRows: 0,
                    widths: [ '*', 37, 37, 37, 37, 37, 37, 37, 37 ],
                    body: [
                        [
                            {text: 'Grand Total', bold: true},
                            formatNumber(totalDryAndWetWeights.totalWetWeight, 3),
                            formatNumber(totalDryAndWetWeights.totalMoisture, 3),
                            formatNumber(totalDryAndWetWeights.totalDryWeight, 3),
                            '',
                            '',
                            {text: formatNumber(getTotalMetalWeight(totalMetalWeightByCode, assaysOfTwo[0]?.code)), bold: true},
                            '',
                            {text: formatNumber(getTotalMetalWeight(totalMetalWeightByCode, assaysOfTwo[1]?.code)), bold: true},
                        ]
                    ]
                },
                layout: {
                    vLineWidth: () => 0.5,
                    hLineWidth: () => 0.5,
                },
                pageBreak: numberOfPages===i+1 ? undefined : 'after'
            });
        } else if (assaysOfTwo.length === 1) {
            // allPages.push(
            //     {
            //         style: 'tableSmlTopMarginLrgBottomMargin',
            //         table: {
            //             // headers are automatically repeated if the table spans over multiple pages
            //             // you can declare how many rows should be treated as headers
            //             headerRows: 0,
            //             widths: [ 100, 10, '*' ],
            //             body: [
            //                 [
            //                     'Filter Date',
            //                     ':',
            //                     filter_date
            //                 ]
            //             ]
            //         },
            //         layout: 'noBorders'
            //     }
            // );

            allPages.push({
                style: 'tableSmlTopMarginLrgBottomMargin',
                table: {
                    // headers are automatically repeated if the table spans over multiple pages
                    // you can declare how many rows should be treated as headers
                    headerRows: 2,
                    widths: [ 43, 46, 46, 46, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37 ],
                    body: [
                        [
                            // 'Parcel',
                            { text: 'Parcel', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Counterparty',
                            { text: 'Counterparty', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Port',
                            { text: 'Port', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Vessel',
                            { text: 'Vessel', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Status',
                            { text: 'Status', colSpan: 2, alignment: 'center', bold: true },
                            '',
                            // 'Shipment Date',
                            { text: 'Shipment Date', rowSpan: 2, alignment: 'center', bold: true },
                            // 'Weight Source',
                            { text: 'Weight Source', rowSpan: 2, alignment: 'center', bold: true },
                            // wet_weight_uom,
                            { text: wet_weight_uom, rowSpan: 2, alignment: 'center', bold: true },
                            // 'Moist',
                            { text: 'Moisture', rowSpan: 2, alignment: 'center', bold: true },
                            // dry_weight_uom,
                            { text: dry_weight_uom, rowSpan: 2, alignment: 'center', bold: true },
                            // 'Assay Source',
                            { text: 'Assay Source', rowSpan: 2, alignment: 'center', bold: true },
                            { text: `${assaysOfTwo[0]?.commodity} (${assaysOfTwo[0]?.code})`, colSpan: 4, alignment: 'center', bold: true },
                            '',
                            '',
                            ''
                        ],
                        [
                            '',
                            '',
                            '',
                            '',
                            { text: 'Physical', alignment: 'center', bold: true },
                            { text: 'Financial', alignment: 'center', bold: true },
                            '',
                            '',
                            '',
                            '',
                            '',
                            '',
                            { text: `Assay (${assaysOfTwo[0]?.assay_uom})`, colSpan: 2, alignment: 'center', bold: true },
                            '',
                            { text: `Assay (${assaysOfTwo[0]?.contained_metal_uom})`, colSpan: 2, alignment: 'center', bold: true },
                            ''
                        ],
                        ...buildShipmentTableRows(parcelsForTable, assaysOfTwo)
                    ]
                },
                layout: {
                    vLineWidth: () => 0.5,
                    hLineWidth: () => 0.5,
                    fillColor: function (rowIndex: number, _node: any, _columnIndex: number) {
                        return (rowIndex < 2) ? '#BFBFBF' : ((rowIndex % 2 === 0) ? '#F2F2F2' : null);
                    }
                }
            });

            allPages.push({
                style: 'tableSmlTopMarginLrgBottomMargin',
                table: {
                    headerRows: 0,
                    widths: [ '*', 37, 37, 37, 37, 37, 37, 37, 37 ],
                    body: [
                        [
                            {text: 'Grand Total', bold: true},
                            formatNumber(totalDryAndWetWeights.totalWetWeight, 3),
                            formatNumber(totalDryAndWetWeights.totalMoisture, 3),
                            formatNumber(totalDryAndWetWeights.totalDryWeight, 3),
                            '',
                            {text: '', colSpan: 2},
                            '',
                            {text: formatNumber(getTotalMetalWeight(totalMetalWeightByCode, assaysOfTwo[0]?.code)), colSpan: 2, bold: true},
                            '',
                        ]
                    ]
                },
                layout: {
                    vLineWidth: () => 0.5,
                    hLineWidth: () => 0.5,
                },
                pageBreak: numberOfPages===i+1 ? undefined : 'after'
            });
        }
    });

    // console.log(`[shipment-latest-generator] allPages=${JSON.stringify(allPages)}`);

    return allPages;


    // return assaysGroupedByTwo.map(assaysOfTwo => {
    //     return {
    //         style: 'tableSmlTopMarginLrgBottomMargin',
    //         table: {
    //             // headers are automatically repeated if the table spans over multiple pages
    //             // you can declare how many rows should be treated as headers
    //             headerRows: 2,
    //             widths: [ 43, 43, 46, 47, 43, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40 ],
    //             body: [
    //                 [
    //                     // 'Parcel',
    //                     { text: 'Parcel', rowSpan: 2, alignment: 'center' },
    //                     // 'Counterparty',
    //                     { text: 'Counterparty', rowSpan: 2, alignment: 'center' },
    //                     // 'Port',
    //                     { text: 'Port', rowSpan: 2, alignment: 'center' },
    //                     // 'Vessel',
    //                     { text: 'Vessel', rowSpan: 2, alignment: 'center' },
    //                     // 'Status',
    //                     { text: 'Status', rowSpan: 2, alignment: 'center' },
    //                     // 'Shipment Date',
    //                     { text: 'Shipment Date', rowSpan: 2, alignment: 'center' },
    //                     // 'Weight Source',
    //                     { text: 'Weight Source', rowSpan: 2, alignment: 'center' },
    //                     // wet_weight_uom,
    //                     { text: wet_weight_uom, rowSpan: 2, alignment: 'center' },
    //                     // 'Moist',
    //                     { text: 'Moist', rowSpan: 2, alignment: 'center' },
    //                     // dry_weight_uom,
    //                     { text: dry_weight_uom, rowSpan: 2, alignment: 'center' },
    //                     // 'Assay Source',
    //                     { text: 'Assay Source', rowSpan: 2, alignment: 'center' },
    //                     { text: `${assaysOfTwo[0]?.commodity} (${assaysOfTwo[0]?.code})`, colSpan: 2, alignment: 'center' },
    //                     '',
    //                     // `${assaysOfTwo[0]?.commodity} (${assaysOfTwo[0]?.code})`,
    //                     // `${assaysOfTwo[0]?.commodity} (${assaysOfTwo[0]?.code})`,
    //                     { text: `${assaysOfTwo[1]?.commodity} (${assaysOfTwo[1]?.code})`, colSpan: 2, alignment: 'center' },
    //                     ''
    //                     // `${assaysOfTwo[1]?.commodity} (${assaysOfTwo[1]?.code})`,
    //                     // `${assaysOfTwo[1]?.commodity} (${assaysOfTwo[1]?.code})`
    //                 ],
    //                 [
    //                     '',
    //                     '',
    //                     '',
    //                     '',
    //                     '',
    //                     '',
    //                     '',
    //                     '',
    //                     '',
    //                     '',
    //                     '',
    //                     `Assay (${assaysOfTwo[0]?.assay_uom})`,
    //                     `Assay (${assaysOfTwo[0]?.contained_metal_uom})`,
    //                     `Assay (${assaysOfTwo[1]?.assay_uom})`,
    //                     `Assay (${assaysOfTwo[1]?.contained_metal_uom})`,
    //                 ],
    //                 ...buildShipmentTableRows(parcelsForTable, assaysOfTwo)
    //             ]
    //         }
    //     };
    // });
};

function evaluateTotalDryAndWetWeights(parcels: Parcel[]): GrandTotalData {
    const totalWetWeight = parcels.reduce((total: number, parcel: Parcel) => {
        return total + parcel.wet_weight;
    }, 0);
    const totalDryWeight = parcels.reduce((total: number, parcel: Parcel) => {
        return total + parcel.dry_weight;
    }, 0);
    return {
        totalWetWeight,
        totalMoisture: (totalWetWeight - totalDryWeight)/totalWetWeight * 100,
        totalDryWeight
    };
}

function evaluateTotalMetalWeightByCode(parcels: Parcel[]): TotalMetalWeightByCode {
    const totalMetalWeightByCode: TotalMetalWeightByCode = {};
    parcels.forEach((parcel: Parcel) => {
        parcel.assays.forEach((assay: Assay) => {
            if (totalMetalWeightByCode[assay.code] !== undefined) {
                totalMetalWeightByCode[assay.code] += assay.contained_metal;
            } else {
                totalMetalWeightByCode[assay.code] = assay.contained_metal;
            }
        });
    });
    return totalMetalWeightByCode;
}

function buildShipmentTableRows(parcelsForTable: ParcelForTable[], assaysByTwo: Assay[]) {
    return parcelsForTable.map((parcel: ParcelForTable) => {
        if (assaysByTwo.length === 2) {
            return [
                parcel.name,
                parcel.counterparty,
                parcel.port,
                parcel.vessel,
                parcel.phy_status,
                parcel.fin_status,
                parcel.shipment_date,
                parcel.weight_source,
                formatNumber(parcel.wet_weight, 3),
                formatNumber(parcel.moisture, 2),
                formatNumber(parcel.dry_weight, 3),
                parcel.assay_source,
                formatNumber(getAssayValueFromParcel(parcel, assaysByTwo[0]?.code, 'assay')),
                formatNumber(getAssayValueFromParcel(parcel, assaysByTwo[0]?.code, 'contained_metal')),
                formatNumber(getAssayValueFromParcel(parcel, assaysByTwo[1]?.code, 'assay')),
                formatNumber(getAssayValueFromParcel(parcel, assaysByTwo[1]?.code, 'contained_metal')),
            ];
        } else if (assaysByTwo.length === 1) {
            return [
                parcel.name,
                parcel.counterparty,
                parcel.port,
                parcel.vessel,
                parcel.phy_status,
                parcel.fin_status,
                parcel.shipment_date,
                parcel.weight_source,
                formatNumber(parcel.wet_weight, 3),
                formatNumber(parcel.moisture, 2),
                formatNumber(parcel.dry_weight, 3),
                parcel.assay_source,
                { text: formatNumber(getAssayValueFromParcel(parcel, assaysByTwo[0]?.code, 'assay')), colSpan: 2 },
                '',
                { text: formatNumber(getAssayValueFromParcel(parcel, assaysByTwo[0]?.code, 'contained_metal')), colSpan: 2 },
                ''
            ];
        } else {
            // should not come in here, we should only either have 1 or 2 items in assaysByTwo
            return [];
        }
    });
}

function getAssayValueFromParcel(parcel: ParcelForTable, element: string | undefined, key: AssayField): string | number {
    if (element) {
        element;
        const parcelElement = parcel.assays[element];
        if (parcelElement) {
            return parcelElement[key];
        }
    }
    return '-';
}

function getTotalMetalWeight(totalMetalWeightByCode: TotalMetalWeightByCode, code: string | undefined): number | '' {
    if (!code) {
        return '';
    }
    const value = totalMetalWeightByCode[code];
    if (!value) {
        return '';
    }
    return value;
}

// function buildGrandTotal(parcels: Parcel[]) {
//     const totalPenalties = parcels.reduce((total: number, parcel: Parcel) => {
//         return total + parcel.penalties.reduce((total: number, penalty: Penalty) => {
//             return total + penalty.penalty_amount;
//         }, 0);
//     }, 0);
//     return {
//         style: 'tableSmlTopMarginLrgBottomMargin',
//         table: {
//           // headers are automatically repeated if the table spans over multiple pages
//           // you can declare how many rows should be treated as headers
//           headerRows: 0,
//           widths: [ '*', 30 ],
//           body: [
//             [ 
//                 {text: 'Grand Total', bold: true},
//                 totalPenalties
//             ]
//           ]
//         }
//     }
// }