import { styles } from "../shared/constants";
import { 
    // generateImageForPdf, 
    formatDateInIso, 
    formatNumber, 
    generatePdf, 
    getCurrentDateTime, 
    replaceSpacesWithUnderscore 
} from "../shared/utils";

export async function createLoadportDisportComparisonDocumentDefinition(req: any): Promise<any> {
    const {
        folder_id,
        // company_logo,
        start_date,
        end_date,
        metal,
        assay_uom,
        parcels,
        dry_weight_uom,
        dry_weight_uom_name,
    } = req.body;

    // const companyLogoImageData = generateImageForPdf(company_logo);

    // console.log(`[shipment-latest-generator] parcels=${JSON.stringify(parcels)}`);
    const loadPortDisportTables = buildLoadPortDisportTables(parcels, metal, assay_uom, dry_weight_uom, dry_weight_uom_name);
    // console.log(`[shipment-latest-generator] shipmentTable=${JSON.stringify(shipmentTable)}`);

    var dd = {
        // Default pageSize for A4: {595.28, y}
        pageSize: 'A4',
        pageOrientation: 'landscape',
        // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
        pageMargins: [ 40, 120, 40, 60 ],
        info: {
            title: `Loadport - Disport Comparison - Grouped`,
            author: 'Navarch Technologies',
            subject: `Loadport - Disport Comparison - Grouped`,
            keywords: `Loadport-Disport-Comparison-Grouped-${replaceSpacesWithUnderscore(start_date)}-${replaceSpacesWithUnderscore(end_date)}`,
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
                                    { text: 'Loadport - Disport Comparison - Grouped', style: 'bigTitleForHeader', alignment: 'center', bold: true },
                                    { text: `From ${start_date} to ${end_date}`, alignment: 'center', italics: true },
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
                            { text: `Loadport - Disport Comparison - Grouped\nFrom ${start_date} to ${end_date}`, style: 'xsmlfont', alignment: 'left' },
                            { text: 'Page ' + currentPage.toString() + ' of ' + pageCount.toString(), alignment: 'center' },
                            { text: 'by Navarch Technologies', alignment: 'right', style: 'footer'  }
                        ]
                    }
                ]
            }
        },
        content: [
            ...loadPortDisportTables
        ],
        styles
    }

    // convert start_date and end_date to ISO format
    const isoStartDate = formatDateInIso(start_date);
    const isoEndDate = formatDateInIso(start_date);

    const downloadName = `LoadportDisportCompare-[${getCurrentDateTime()}]-Comparison_Period-${isoStartDate}~${isoEndDate}`;
    const title = `Loadport-Disport Comparison (${isoStartDate} ~ ${isoEndDate})`;
    return await generatePdf(dd, downloadName, title, folder_id ?? null);
}

type Parcel = {
    id: string,
    name: string,
    vessel: string,
    port: string,
    shipment_date: string,
    dry_weight: TotalLoadportDisportCompareInput,
    grade: TotalLoadportDisportCompareInput,
    metal: TotalLoadportDisportCompareInput,
    metal_uom: string,
    gain_loss: 'Gain' | 'Loss',
}

type TotalLoadportDisportCompareInput = {
    loadport: number,
    disport: number,
    variance: number,
    variance_percent: number,
}

type TotalLoadportDisportCompareOutput = {
    loadport: string,
    disport: string,
    variance: string,
    variance_percent: string,
}

function buildLoadPortDisportTables(parcels: Parcel[], metal: string, assay_uom: string, dry_weight_uom: string, dry_weight_uom_name: string): any[] {

    const dryWeightTotal = evaluateTotalLoadportDisportValues(parcels.map((parcel: Parcel) => parcel.dry_weight));
    const gradeTotal = evaluateTotalLoadportDisportValues(parcels.map((parcel: Parcel) => parcel.grade));
    const metalWeightTotal = evaluateTotalLoadportDisportValues(parcels.map((parcel: Parcel) => parcel.metal));

    return [ 
        {
            style: 'tableSmlTopMarginLrgBottomMargin',
            table: {
                // headers are automatically repeated if the table spans over multiple pages
                // you can declare how many rows should be treated as headers
                headerRows: 0,
                widths: [ 100, 10, '*' ],
                body: [
                    [
                        'Metal',
                        ':',
                        `${metal} (${assay_uom})`
                    ]
                ]
            },
            layout: 'noBorders'
        },
        {
            style: 'tableSmlTopMarginLrgBottomMargin',
            table: {
                // headers are automatically repeated if the table spans over multiple pages
                // you can declare how many rows should be treated as headers
                headerRows: 2,
                widths: [ 25, '*', '*', '*', 30, 30, 30, 30, 35, 30, 30, 30, 35, 30, 30, 30, 35, 25, 25 ],
                body: [
                    [
                        { text: 'Parcel ID', rowSpan: 2, alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Parcel', rowSpan: 2, alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Vessel', rowSpan: 2, alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Port', rowSpan: 2, alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Shipment', rowSpan: 2, alignment: 'center', style: 'tableHeaderCell' },
                        { text: `${dry_weight_uom_name} (${dry_weight_uom})`, colSpan: 4, alignment: 'center', style: 'tableHeaderCell' },
                        '',
                        '',
                        '',
                        { text: 'Grade', colSpan: 4, alignment: 'center', style: 'tableHeaderCell' },
                        '',
                        '',
                        '',
                        { text: 'Metal', colSpan: 6, alignment: 'center', style: 'tableHeaderCell' },
                        '',
                        '',
                        '',
                        '',
                        '',
                    ],
                    [
                        '',
                        '',
                        '',
                        '',
                        '',
                        { text: 'Loadport', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Disport', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Variance', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Variance (%)', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Loadport', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Disport', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Variance', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Variance (%)', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Loadport', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Disport', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Variance', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Variance (%)', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Unit', alignment: 'center', style: 'tableHeaderCell' },
                        { text: 'Outcome', alignment: 'center', style: 'tableHeaderCell' },
                    ],
                    ...buildLoadportDisportRows(parcels)
                ]
            },
            layout: {
                vLineWidth: () => 0.5,
                hLineWidth: () => 0.5,
                fillColor: function (rowIndex: number, _node: any, _columnIndex: number) {
                    return (rowIndex < 2) ? '#BFBFBF' : ((rowIndex % 2 === 0) ? '#F2F2F2' : null);
                }
            }
        },
        {
            style: 'tableSmlTopMarginLrgBottomMargin',
            table: {
                headerRows: 0,
                widths: [ '*', 30, 30, 30, 35, 30, 30, 30, 35, 30, 30, 30, 35, 25, 25 ],
                body: [
                    [
                        {text: 'Grand Total', bold: true},
                        dryWeightTotal.loadport,
                        dryWeightTotal.disport,
                        dryWeightTotal.variance,
                        dryWeightTotal.variance_percent,
                        gradeTotal.loadport,
                        gradeTotal.disport,
                        gradeTotal.variance,
                        gradeTotal.variance_percent,
                        metalWeightTotal.loadport,
                        metalWeightTotal.disport,
                        metalWeightTotal.variance,
                        metalWeightTotal.variance_percent,
                        '',
                        ''
                    ]
                ]
            },
            layout: {
                vLineWidth: () => 0.5,
                hLineWidth: () => 0.5,
                fillColor: function (_rowIndex: number, _node: any, columnIndex: number) {
                    return (columnIndex > 12) ? '#000000' : null;
                }
            },
        }
    ];
};

function evaluateTotalLoadportDisportValues(loadportDisport: TotalLoadportDisportCompareInput[], decimalPlaces: number = 2): TotalLoadportDisportCompareOutput {
    // get aggregate values of loadport and disport values
    const loadport = loadportDisport.reduce((acc: number, curr: TotalLoadportDisportCompareInput) => acc + curr.loadport, 0);
    const disport = loadportDisport.reduce((acc: number, curr: TotalLoadportDisportCompareInput) => acc + curr.disport, 0);
    const variance = disport - loadport;
    const variance_percent = (variance / loadport) * 100;
    return {
        loadport: formatNumber(loadport, decimalPlaces),
        disport: formatNumber(disport, decimalPlaces),
        variance: formatNumber(variance, decimalPlaces),
        variance_percent: formatNumber(variance_percent, decimalPlaces),
    };
}

function buildLoadportDisportRows(parcels: Parcel[]) {
    return parcels.map((parcel: Parcel) => {
        return [
            parcel.id,
            parcel.name,
            parcel.vessel,
            parcel.port,
            parcel.shipment_date,
            formatNumber(parcel.dry_weight.loadport, 2),
            formatNumber(parcel.dry_weight.disport, 2),
            formatNumber(parcel.dry_weight.variance, 2),
            formatNumber(parcel.dry_weight.variance_percent, 2),
            formatNumber(parcel.grade.loadport, 2),
            formatNumber(parcel.grade.disport, 2),
            formatNumber(parcel.grade.variance, 2),
            formatNumber(parcel.grade.variance_percent, 2),
            formatNumber(parcel.metal.loadport, 2),
            formatNumber(parcel.metal.disport, 2),
            formatNumber(parcel.metal.variance, 2),
            formatNumber(parcel.metal.variance_percent, 2),
            parcel.metal_uom,
            parcel.gain_loss,
        ];
    });
}