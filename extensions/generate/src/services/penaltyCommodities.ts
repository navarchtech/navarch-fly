import { styles } from "../shared/constants";
import { 
    // generateImageForPdf, 
    formatNumber, 
    generatePdf, 
    getCurrentDateTime, 
    replaceSpacesWithUnderscore 
} from "../shared/utils";

export async function createPenaltyElementsDocumentDefintion(req: any): Promise<any> {
    const {
        folder_id,
        // company_logo,
        start_date,
        end_date,
        filter_date,
        invoice_type,
        parcels,
        dry_weight_uom,
        penalty_rate_uom,
        currency,
    } = req.body;

    // const companyLogoImageData = generateImageForPdf(company_logo);

    var dd = {
        // Default pageSize for A4: {595.28, y}
        pageSize: 'A4',
        pageOrientation: 'landscape',
        // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
        pageMargins: [ 40, 120, 40, 60 ],
        info: {
            title: `Penalty Elements`,
            author: 'Navarch Technologies',
            subject: `Penalty Elements`,
            keywords: `penalty-elments-${replaceSpacesWithUnderscore(start_date)}-${replaceSpacesWithUnderscore(end_date)}`,
        },
        header: function(_currentPage: any, _pageCount :any, _pageSize: any) {
            return {
                margin: [40, 50, 40, 0],
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
                                    { text: 'Penalty Elements', style: 'bigTitleForHeader', alignment: 'center', bold: true },
                                    { text: `From ${start_date} to ${end_date}`, alignment: 'center', italics: true },
                                ]
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
                            { text: `Penalty Elements\nFrom ${start_date} to ${end_date}`, style: 'xsmlfont', alignment: 'left' },
                            { text: 'Page ' + currentPage.toString() + ' of ' + pageCount.toString(), alignment: 'center' },
                            { text: 'by Navarch Technologies', alignment: 'right', style: 'footer'  }
                        ]
                    }
                ],
            }
        },
        content: [
            {
                style: 'tableSmlTopMarginLrgBottomMargin',
                table: {
                    // headers are automatically repeated if the table spans over multiple pages
                    // you can declare how many rows should be treated as headers
                    headerRows: 0,
                    widths: [ 100, 10, '*' ],
                    body: [
                        [
                            'Filter Date',
                            ':',
                            filter_date
                        ],
                        [
                            'Invoice Type',
                            ':',
                            invoice_type
                        ],
                    ]
                },
                layout: 'noBorders'
            },
            ...buildPenaltyTable(parcels, dry_weight_uom, penalty_rate_uom, currency)
        ],
        styles
    }

    const downloadName = `PenaltyElements-[${getCurrentDateTime()}]-${replaceSpacesWithUnderscore(start_date)}-${replaceSpacesWithUnderscore(end_date)}`;
    const title = `Penalty Elements (${start_date} ~ ${end_date})`;
    return await generatePdf(dd, downloadName, title, folder_id ?? null);
}

type Parcel = {
    id: string,
    name: string,
    vessel: string,
    invoice_type: string,
    dry_weight: number,
    // dry_weight_uom: string,
    penalties: Penalty[],
}

type Penalty = {
    mine: string,
    commodity_code: string,
    counterparty: string,
    // vessel: string,
    // invoice_type: string,
    assay: number,
    assay_uom: string,
    penalty_rate: number,
    // penalty_rate_uom: string,
    // currency: string,
    penalty_amount: number,
};

function buildPenaltyTable(parcels: Parcel[], dry_weight_uom: string, penalty_rate_uom: string, currency: string) {
    return [
        {
            style: 'tableSmlTopMarginLrgBottomMargin',
            table: {
                // headers are automatically repeated if the table spans over multiple pages
                // you can declare how many rows should be treated as headers
                headerRows: 1,
                widths: [ 50, '*', 50, 50, '*', '*', 50, 50, 50, 50, 50 ],
                body: [
                    [ 
                        { text: 'Parcel ID', style: 'tableHeaderCell' },
                        { text: 'Parcel Name', style: 'tableHeaderCell' },
                        { text: 'Mine', style: 'tableHeaderCell' },
                        { text: 'Counterparty', style: 'tableHeaderCell' },
                        { text: 'Vessel', style: 'tableHeaderCell' },
                        { text: 'Invoice', style: 'tableHeaderCell' },
                        { text: `Weight (${dry_weight_uom})`, style: 'tableHeaderCell' },
                        { text: 'Assay', style: 'tableHeaderCell' },
                        { text: 'Element', style: 'tableHeaderCell' },
                        { text: `Rate (${penalty_rate_uom})`, style: 'tableHeaderCell' },
                        { text: `Value (${currency})`, style: 'tableHeaderCell' },
                    ],
                    ...buildAllPenaltiesByParcel(parcels)
                ]
            },
            layout: {
                vLineWidth: () => 0.5,
                hLineWidth: () => 0.5,
                fillColor: function (rowIndex: number, _node: any, _columnIndex: number) {
                    return (rowIndex < 1) ? '#BFBFBF' : ((rowIndex % 2 === 1) ? '#F2F2F2' : null);
                }
            }
        },
        buildGrandTotal(parcels)
    ]
}

function buildAllPenaltiesByParcel(parcels: Parcel[]) {
    const rows: any[] = [];
    parcels.forEach((parcel: Parcel) => {
        rows.push(...buildPenaltyByParcelRows(parcel));
    });
    return rows;
}

function buildPenaltyByParcelRows(parcel: Parcel) {
    return parcel.penalties.map((penalty: Penalty) => [
        parcel.id,
        parcel.name,
        penalty.mine,
        penalty.counterparty,
        parcel.vessel,
        parcel.invoice_type,
        formatNumber(parcel.dry_weight, 2),
        `${formatNumber(penalty.assay)} ${penalty.assay_uom}`,
        penalty.commodity_code,
        formatNumber(penalty.penalty_rate, 2) === '0.00' ? formatNumber(penalty.penalty_rate, 6) : formatNumber(penalty.penalty_rate, 2), // if penalty rate is 0.00, show up to 6 decimal places
        formatNumber(penalty.penalty_amount, 2),
    ]);
}

function buildGrandTotal(parcels: Parcel[]) {
    const totalPenalties = parcels.reduce((total: number, parcel: Parcel) => {
        return total + parcel.penalties.reduce((total: number, penalty: Penalty) => {
            return total + penalty.penalty_amount;
        }, 0);
    }, 0);
    return {
        style: 'tableSmlTopMarginLrgBottomMargin',
        table: {
            // headers are automatically repeated if the table spans over multiple pages
            // you can declare how many rows should be treated as headers
            headerRows: 0,
            widths: [ '*', 50 ],
            body: [
                [ 
                    {text: 'Grand Total', bold: true},
                    formatNumber(totalPenalties, 2)
                ]
            ]
        },
        layout: {
            vLineWidth: () => 0.5,
            hLineWidth: () => 0.5,
        },
    }
}