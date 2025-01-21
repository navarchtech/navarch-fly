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

export async function createCertOfOriginDocumentDescription(req: any): Promise<any> {
    const {
        folder_id,
        parcel_id,
        parcel_ref,
        company_logo,
        seller,
        seller_address,
        seller_phone_number,
        buyer,
        contract_ref,
        vessel,
        bl_date,
        port_of_loading,
        port_of_discharge,
        wet_weight,
        wet_weight_uom,
        country_of_origin,
        commodity_name,
        other_comments,
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
            subject: `Certificate of Origin for Parcel ${parcel_id}`,
            keywords: `cert-of-origin-${replaceSpacesWithUnderscore(commodity_name)}`,
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
                            { width: '50%',text: 'Certificate of Origin', style: 'bigDocTitleInHeaderWithTop27Padding', alignment: 'center' },
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
            { text: 'Origin Details', style: 'bigSectionHeader', alignment: 'center' },
            {
				style: 'tableSmlTopMarginLrgBottomMargin',
				table: {
				  // headers are automatically repeated if the table spans over multiple pages
				  // you can declare how many rows should be treated as headers
				  headerRows: 0,
				  widths: [ 100, 10, '*' ],
				  body: [
					[ 
						{text: 'Material'},
                        ':',
						{text: `${formatNumber(wet_weight)} ${wet_weight_uom}` + (commodity_name==='' ? '' : ` of ${commodity_name} Concentrates`)}
					],
					[ 
						{text: 'Country of Origin'},
                        ':',
						country_of_origin
					],
					[ 
						{text: 'Other Comments'},
                        ':',
						other_comments ?? '-'
					],
				  ]
				},
                layout: 'noBorders'
			},
            ...buildSignatoryBox(signatory)
        ],
        styles
    }

    const downloadName = `CertificateOfOrigin-[${getCurrentDateTime()}]-Parcel#${replaceSpacesWithUnderscore(parcel_id)}-Contract#${replaceSpacesWithUnderscore(contract_ref)}`;
    const title = `Certificate of Origin (Parcel #${parcel_id})`;
    return await generatePdf(dd, downloadName, title, folder_id ?? null);
    // return downloadName;
}