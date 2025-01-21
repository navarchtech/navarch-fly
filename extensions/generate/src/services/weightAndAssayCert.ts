import { styles } from "../shared/constants";
import { 
    generateImageForPdf, 
    formatNumber, 
    generatePdf, 
    getCurrentDateTime, 
    replaceSpacesWithUnderscore,
    bottomBorderForTableContentWithColumnsAmount, 
} from "../shared/utils";
import { buildSignatoryBox } from "../shared/builders";

export async function createWeightAndAssayCertDocumentDescription(req: any): Promise<any> {
    const {
        folder_id,
        invoice_type,
        company_logo,
        seller,
        seller_address,
        seller_phone_number,
        buyer,
        contract_ref,
        parcel_ref,
        vessel,
        bl_date,
        commodity_name,
        port_of_loading,
        port_of_discharge,
        wet_weight,
        wet_weight_uom,
        dry_weight,
        dry_weight_uom,
        moisture,
        moisture_uom,
        assays,
        signatory
    } = req.body;

    const companyLogoImageData = generateImageForPdf(company_logo);

    var dd = {
        // Default pageSize for A4: {595.28, y}
        pageSize: 'A4',
        // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
        pageMargins: [ 40, 210, 40, 60 ],
        info: {
            title: `${seller}`,
            author: 'Navarch Technologies',
            subject: `Weight and Assay Certificate`,
            keywords: `${invoice_type}-weight-and-assay-cert-${replaceSpacesWithUnderscore(contract_ref)}`,
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
                            { width: '50%',text: `Weight & Assay Certificate`, style: 'bigDocTitleInHeaderWithTop10Padding', alignment: 'center' },
                            companyLogoImageData ? {
                                image: companyLogoImageData,
                                fit: [60, 60],
                                width: '25%',
                                alignment: 'right',
                                style: 'marginBottom5'
                            } : null
                        ]
                    },
                    {canvas: [{type: 'line', x1: 0, y1: 0, x2: 522, y2: 0, lineWidth: 1},]},
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
                                ['Commodity:', commodity_name==='' ? 'No primary commodity' : `${commodity_name} Concentrates`, 'Port of Discharge:', {text: `${port_of_discharge}`, alignment: 'right'}],
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
            { text: 'We hereby certify the provisional weights and assays as stated below for the above mentioned shipment.', alignment: 'center', margin: [0, 12, 0, 12], styles: 'midfont' },
            
            { text: 'Weights:', style: 'sectionHeader' },
            {
				style: 'tableSmlTopMarginLrgBottomMargin',
				table: {
				  // headers are automatically repeated if the table spans over multiple pages
				  // you can declare how many rows should be treated as headers
				  headerRows: 0,
				  widths: [ 100, 10, '*' ],
				  body: [
					[ 
						{text: 'Wet Weight'},
                        ':',
						`${formatNumber(wet_weight)} ${wet_weight_uom}`
					],
					[ 
						{text: 'Moisture'},
                        ':',
						`${formatNumber(moisture)} ${moisture_uom}`
					],
					[ 
						{text: 'Dry Weight'},
                        ':',
						`${formatNumber(dry_weight)} ${dry_weight_uom}`
					],
				  ]
				},
                layout: 'noBorders'
			},
            ...buildProvAssayCertSection(assays),
            ...buildSignatoryBox(signatory)
        ],
        styles
    }

    const downloadName = `WeightAndAssayCert-[${getCurrentDateTime()}]-${invoice_type}-${replaceSpacesWithUnderscore(contract_ref)}`;
    const title = `Weight & Assay Certificate - Contract ${contract_ref} - Parcel ${parcel_ref}`;
    return await generatePdf(dd, downloadName, title, folder_id ?? null);
}

type Assay = {
    commodity_name: string;
    analytical_assay: number;
    assay_uom: string;
}

function buildProvAssayCertSection(assays: Assay[]) {
    return [
        { text: 'Assays:', style: 'sectionHeader' },
        {
            style: 'tableSmlTopMarginLrgBottomMargin',
            table: {
                // headers are automatically repeated if the table spans over multiple pages
                // you can declare how many rows should be treated as headers
                headerRows: 0,
                widths: [ 100, 10, '*' ],
                body: [
                    ...(assays as Assay[]).map((assay: Assay) => [ 
                        assay.commodity_name,
                        ':',
                        `${formatNumber(assay.analytical_assay)} ${assay.assay_uom}`
                    ])
                ]
            },
            layout: 'noBorders'
        }
    ]
}