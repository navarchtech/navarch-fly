import { styles } from "../shared/constants";
import { 
    generateImageForPdf, 
    generatePdf, 
    getCurrentDateTime, 
    replaceSpacesWithUnderscore ,
    formatNumberAndBracketIfNegative,
    formatNumber,
    bottomBorderForTableContentWithColumnsAmount,
    bottomBorderForRightMostCellWithColumnsAmount,
} from "../shared/utils";
import { buildSignatoryBox } from "../shared/builders";

const GST_DATA_MISSING_MESSAGE = 'GST Data Missing';

export async function createInvoiceDocumentDescription(req: any): Promise<string> {
    const { 
        folder_id,
        seller,
        seller_address,
        seller_business_number,
        seller_phone_number,
        company_logo,

        buyer,
        buyer_address,
        buyer_business_number,
        shipment_code,
        vessel,
        bl_date,

        invoice_type,
        invoice_date,
        revision,
        invoice_number,
        parcel,

        port_of_loading,
        port_of_discharge,
        primary_commodity,

        due_date,
        wet_weight,
        wet_weight_uom,
        wet_weight_uom_name,
        moisture,
        moisture_uom,
        dry_weight, 
        dry_weight_uom, 
        dry_weight_uom_name,
        total_revenue,
        total_deductions,
        currency, 
        commodities, 
        penalties, 
        adjustments,
        invoice_value,
        payable_percentage, // contract
        payable_amount, // appears to be similar to 'invoice_value'
        payments_received,
        gst,
        balance_of_gst_payable,
        // payment_received_source,
        // payment_received, // where is this from??
        balance_in_sellers_favor,
        signatory,
        remittance,
    } = req.body;

    const commoditiesSection = buildCommoditiesSection(commodities, dry_weight, dry_weight_uom, currency);
    const penaltiesSection = buildPenaltiesSection(penalties, dry_weight, dry_weight_uom, currency);
    const adjustmentsSection = buildAdjustmentsSection(adjustments, currency);
    const commoditiesSummary = buildCommoditiesSummary(commodities, currency);

    const companyLogoImageData = generateImageForPdf(company_logo);

    var dd = {
        // Default pageSize for A4: {595.28, y}
        pageSize: 'A4',
        // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
        pageMargins: [ 40, 270, 40, 60 ],
        info: {
            title: `${seller}`,
            author: 'Navarch Technologies',
            subject: `Invoice ${invoice_number}`,
            keywords: `${replaceSpacesWithUnderscore(invoice_number)}`,
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
                                    {text: `${seller}\n`, style: (!!seller && seller.length <=20) ? 'midfont' : ((!!seller && seller.length <=25) ? 'smlfont' : 'xsmlfont'), bold: true},
                                    {text: `${seller_address}${!!seller_business_number ? `\n\n${seller_business_number}` : ''}\n\n`,  style: 'xsmlfont'},
                                    {text:  !!seller_phone_number ? `${seller_phone_number}\n\n\n` : `\n`, style: 'xsmlfont'},
                                ]
                            },
                            ,
                            { width: '50%', text: '', alignment: 'center' },
                            companyLogoImageData ? {
                                image: companyLogoImageData,
                                fit: [60, 60], // [width, height]
                                width: '25%',
                                alignment: 'right',
                                style: 'marginBottom5'
                            } : null
                        ]
                    },
                    {canvas: [{type: 'line', x1: 0, y1: 0, x2: 522, y2: 0, lineWidth: 1},]},
                    {
                        style: 'tableSmlBottomMarginSmlTopMargin',
                        table: {
                            widths: [90, 220, '*', 100],
                            body: [
                                [
                                    {text: 'Buyer Information', style: 'tableHeader', colSpan: 2},
                                    '', 
                                    {text: 'Shipment Information', style: 'tableHeader', colSpan: 2},
                                    '', 
                                ],
                                [
                                    {text: `${buyer}`, bold: true, colSpan: 2},'', 'Shipment:', {text: `${shipment_code}`, alignment: 'right'}
                                ],
                                [{text: `${buyer_address}${!!buyer_business_number ? `\n\n${buyer_business_number}` : ''}`, rowSpan: 2}, '', 'Vessel:', {text: `${vessel}`, alignment: 'right'}],
                                ['', '', 'B/L Date:', {text: `${bl_date}`, alignment: 'right'}],
                                bottomBorderForTableContentWithColumnsAmount(4)
                            ]
                        },
                        layout: {
                            defaultBorder: false,
                            hLineWidth: () => 0.5,
                        }
                    },
                    {
                        style: 'tableSmlBottomMargin',
                        table: {
                            widths: [90, 220, '*', 100],
                            body: [
                                [
                                    {text: `${invoice_type}${!!gst ? ' Tax' : ''} Invoice`, style: 'tableHeader', colSpan: 4}, '', '', ''
                                ],
                                [
                                    'Invoice Date:', 
                                    `${invoice_date}`,
                                    'Port of Loading:', 
                                    {text: `${port_of_loading}`, alignment: 'right'}],
                                [
                                    'Revision:', 
                                    `${revision ?? '-'}`, 
                                    'Port of Discharge:', 
                                    {text: `${port_of_discharge}`, alignment: 'right'}
                                ],
                                [
                                    'Invoice Number:', 
                                    `${invoice_number}`, 
                                    'Commodity:', 
                                    {text: `${primary_commodity}`, alignment: 'right'}
                                ],
                                ['Parcel:', `${parcel}`, '', ''],
                                bottomBorderForTableContentWithColumnsAmount(4)
                            ]
                        },
                        layout: {
                            defaultBorder: false,
                            hLineWidth: () => 1.2,
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
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [90, 220, '*', 100],
                    body: [
                        [
                            {text: 'Summary:', style: 'tableHeader'}, '','',''
                        ],
                        ['', `${wet_weight_uom_name} `, '', {text: `${formatNumber(wet_weight)} ${wet_weight_uom}`, alignment: 'right'}],
                        ['', 'Moisture', '', {text: `${formatNumber(moisture)}${moisture_uom}`, alignment: 'right'}],
                        ['', `${dry_weight_uom_name} `, '', {text: `${formatNumber(dry_weight)} ${dry_weight_uom}`, alignment: 'right'}],
                        ...commoditiesSummary,
                        ['', 'Total Revenue', '', {text: `${currency} ${formatNumberAndBracketIfNegative(total_revenue)}`, alignment: 'right'}],
                        ['', 'Total Deductions', '', {text: `${currency} ${formatNumberAndBracketIfNegative(total_deductions)}`, alignment: 'right'}],
                        bottomBorderForTableContentWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            },
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [90, 220, '*', 100],
                    body: [
                        [
                            {text: 'Totals:', style: 'tableHeader'}, '','',''
                        ],
                        ['', 'Invoice Value', '', {text: `${currency} ${formatNumberAndBracketIfNegative(invoice_value)}`, alignment: 'right'}],
                        ['', `Payable Value @ ${formatNumber(payable_percentage, 2)}% of Invoice Value`, '', {text: `${currency} ${formatNumberAndBracketIfNegative(payable_amount)}`, alignment: 'right'}],
                        ...(!!gst ? 
                            [[
                                '', 
                                !!gst['current'] ? `GST @ 100 % of Parcel Value (${gst['current'].local_currency}/USD: ${formatNumber(gst['current'].conversion_rate_to_usd)})` : GST_DATA_MISSING_MESSAGE, 
                                {text: !!gst['current'] ?  `${gst['current'].local_currency} ${formatNumberAndBracketIfNegative(gst['current'].gst_in_local_currency)}` : '', alignment: 'right'}, 
                                {text: !!gst['current'] ? `USD ${formatNumberAndBracketIfNegative(gst['current'].gst_in_usd)}` : '', alignment: 'right'}
                            ]] : []),
                        ...buildPaymentsReceivedRows(payments_received, gst, currency),
                        ...(!!balance_of_gst_payable ? [[
                            '', 
                            `Balance of GST Payable`, 
                            {text: `${balance_of_gst_payable.local_currency} ${formatNumberAndBracketIfNegative(balance_of_gst_payable.gst_in_local_currency)}`, alignment: 'right'}, 
                            {text: `USD ${formatNumberAndBracketIfNegative(balance_of_gst_payable.gst_in_usd)}`, alignment: 'right'}
                        ]] : []),
                        // ...(!!payment_received_source && !!payment_received) ? [[
                        //     '', `Payment received: ${payment_received_source}`, 
                        //     '', 
                        //     {text: `${currency} (${payment_received})`, alignment: 'right'}
                        // ]] : [],
                        bottomBorderForRightMostCellWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            },
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [90, 220, '*', 100],
                    body: [
                        [
                            '', 
                            {text: 'BALANCE IN SELLERS FAVOUR', bold: true, colSpan: 2, alignment: 'right'},
                            '',
                            {text: `${currency} ${formatNumberAndBracketIfNegative(balance_in_sellers_favor)}`, bold: true, alignment: 'right'}
                        ],
                        bottomBorderForTableContentWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            },
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [90, 220, '*', 100],
                    body: [
                        [
                            {text: 'Payment Advice:', style: 'tableHeader'},
                            { text: `Due ${due_date}`, bold: true },
                            '',
                            ''
                        ],
                        [
                            '', 
                            { text: `When remitting please quote: ${invoice_number}`, bold: true },
                            '', 
                            ''
                        ],
                        [
                            '', 
                            { text: 'Remittance details:', bold: true },
                            '', 
                            ''
                        ],
                        [
                            '', 
                            remittance, 
                            '', 
                            ''
                        ],
                        bottomBorderForTableContentWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            },
            ...buildSignatoryBox(signatory),
            {
                text: '',
                pageBreak: 'after'
            },
            
            
            
            
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [70, 220, '*', 100],
                    body: [
                        [
                            {text: 'Weights:', style: 'tableHeader'}, '','',''
                        ],
                        [{text: `${formatNumber(wet_weight)} ${wet_weight_uom}`, alignment: 'right'}, `${wet_weight_uom_name} `, '', ''],
                        [{text: `${formatNumber(moisture)}${moisture_uom}`, alignment: 'right'}, 'Moisture', '', ''],
                        [{text: `${formatNumber(dry_weight)} ${dry_weight_uom}`, alignment: 'right'}, `${dry_weight_uom_name} `, '', ''],
                        bottomBorderForTableContentWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            },

            
            ...commoditiesSection,

            ...penaltiesSection,

            ...adjustmentsSection,
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [70, 160, '*', 70],
                    body: [
                        [
                            {text: 'Totals:', style: 'tableHeader'}, '','',''
                        ],
                        ['', 'Invoice Value', '', {text: `${currency} ${formatNumberAndBracketIfNegative(invoice_value)}`, alignment: 'right', bold: true}],
                        ['', `Payable Value @ ${formatNumber(payable_percentage, 2)}% of Invoice Value`, '', {text: `${currency} ${formatNumberAndBracketIfNegative(payable_amount)}`, alignment: 'right', bold: true}],
                        ...(!!gst ? 
                            [[
                                '', 
                                !!gst['current'] ? `GST @ 100 % of Parcel Value (${gst['current'].local_currency}/USD: ${formatNumber(gst['current'].conversion_rate_to_usd)})` : GST_DATA_MISSING_MESSAGE, 
                                {text: !!gst['current'] ?  `${gst['current'].local_currency} ${formatNumberAndBracketIfNegative(gst['current'].gst_in_local_currency)}` : '', alignment: 'right'}, 
                                {text: !!gst['current'] ? `USD ${formatNumberAndBracketIfNegative(gst['current'].gst_in_usd)}` : '', alignment: 'right'}
                            ]] : []),
                        ...buildPaymentsReceivedRows(payments_received, gst, currency),
                        // ...(!!payment_received_source && !!payment_received) ? [[
                        //     '', 
                        //     {text: `Payment received: ${payment_received_source}`, colSpan: 2}, 
                        //     '', 
                        //     {text: `${currency} (${payment_received})`, alignment: 'right', bold: true}
                        // ]] : [],
                        bottomBorderForRightMostCellWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            },
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [70, 160, '*', 70],
                    body: [
                        [
                            '', 
                            {text: 'BALANCE IN SELLERS FAVOUR', bold: true, colSpan: 2, alignment: 'right'},
                            '',
                            {text: `${currency} ${formatNumberAndBracketIfNegative(balance_in_sellers_favor)}`, bold: true, alignment: 'right'}
                        ],
                        bottomBorderForTableContentWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            },
        ],
        styles
    }

    const downloadName = replaceSpacesWithUnderscore(`Invoice-[${getCurrentDateTime()}]-${invoice_number}-${invoice_type}`);
    const title = `${invoice_type}${!!gst ? ' Tax' : ''} Invoice - ${invoice_number}`;
    return await generatePdf(dd, downloadName, title, folder_id ?? null);

    // var pdfDoc = printer.createPdfKitDocument(dd);
    // // Find a way to switch between "STORAGE_LOCAL_ROOT/invoices" and can be switched to STORAGE_GCS_ROOT/invoices in production
    // // Make it dynamic, build env variable string, reference navarch/navarch repo
    // pdfDoc.pipe(fs.createWriteStream(`uploads/${replaceSpacesWithUnderscore(invoice_number)}.pdf`));
    // pdfDoc.end();
}

function buildPaymentsReceivedRows(paymentsReceived: any[] | undefined | null, gst: any, currency: string = 'USD') {
    if (!paymentsReceived || paymentsReceived.length === 0) {
        return [];
    }

    return paymentsReceived.flatMap((paymentReceived: any) => [
        [
            '', `Payment received: ${paymentReceived.payment_received_source}`, 
            '', 
            {text: `${currency} ${formatNumberAndBracketIfNegative(paymentReceived.payment_received)}`, alignment: 'right'}
        ],
        ...(gst ? [
            [
                '', 
                !!gst[paymentReceived.payment_received_source] ? `GST payment received from ${paymentReceived.payment_received_source}` : GST_DATA_MISSING_MESSAGE, 
                {text: !!gst[paymentReceived.payment_received_source] ? `${gst[paymentReceived.payment_received_source].local_currency} ${formatNumberAndBracketIfNegative(gst[paymentReceived.payment_received_source].gst_in_local_currency)}` : '', alignment: 'right'}, 
                {text: !!gst[paymentReceived.payment_received_source] ? `USD ${formatNumberAndBracketIfNegative(gst[paymentReceived.payment_received_source].gst_in_usd)}` : '', alignment: 'right'}
            ]
        ] : [])
    ]);
}

function buildCommoditiesSection(commodities: any[], dryWeight: number, dryWeightUom: string, currency: string = 'USD') {
    var commoditySection: any[] = [];
    for(const commodity of commodities) {
        commoditySection.push(
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [70, 120, '*', 70],
                    body: [
                        [
                            {text: `${commodity.commodity}:`, style: 'tableHeader'}, '','',''
                        ],
                        [{text: `${formatNumber(commodity.analytical_assay)}${commodity.assay_uom}`, alignment: 'right'}, `${commodity.commodity} Analytical Assay`, '', ''],
                        [{text: `${formatNumber(commodity.payable_assay)}${commodity.assay_uom}`, alignment: 'right'}, `${commodity.commodity} Payable Assay`, `${commodity.deduction_expression}`, ''],
                        [{text: `${formatNumber(commodity.payable_metal)} ${commodity.payable_metal_uom}`, alignment: 'right'}, `${commodity.commodity} Payable Metal`, `${commodity.payable_metal_expression}`, ''],
                        [{text: `${commodity.qp}`, alignment: 'right'}, `${commodity.commodity} QP Month`, '', ''],
                        [{text: `${currency} ${formatNumber(commodity.price_rate)}/${commodity.price_per_uom}`, alignment: 'right'}, {text: `${commodity.commodity} Price: ${commodity.qp_start_date} - ${commodity.qp_end_date} - ${commodity.price_method}`, colSpan: 2}, '', ''],
                        ['', `${commodity.commodity} Payable Value`, `${formatNumber(commodity.payable_metal)} ${commodity.payable_metal_uom} * ${currency} ${formatNumber(commodity.price_rate)}/${commodity.price_per_uom}`, {text: `${currency} ${formatNumberAndBracketIfNegative(commodity.price)}`, alignment: 'right', bold: true}],
                        // Treatment Charge line
                        ...(commodity.treatment_charge ? (commodity.treatment_charge.rate===commodity.treatment_charge.final_rate ? 
                        [
                            // Use dry weight, and going off the assumption that dry weight UOM and the TC charge per weight UOM are the same for now, may change in the future and will need to incorporate unit conversion
                            ['', 'Treatment Charge', `${formatNumber(dryWeight)} ${dryWeightUom} * ${currency} ${formatNumber(commodity.treatment_charge.final_rate)}/${commodity.treatment_charge.per_uom}`, {text: `${currency} ${formatNumberAndBracketIfNegative(commodity.treatment_charge.final_amount)}`, alignment: 'right', bold: true}]
                        ] : 
                        [
                            [{text: `${currency} ${formatNumber(commodity.treatment_charge.discount)}/${commodity.treatment_charge.per_uom}`, alignment: 'right'}, 'Treatment Charge Discount', '', ''],
                            [{text: `${currency} ${formatNumber(commodity.treatment_charge.final_rate)}/${commodity.treatment_charge.per_uom}`, alignment: 'right'}, `${commodity.commodity} Treatment Charge Rate`, `${currency} ${formatNumber(commodity.treatment_charge.rate)}/${commodity.treatment_charge.per_uom}${commodity.treatment_charge.discount === null || commodity.treatment_charge.discount === 0 ? '' : ` - ${currency} ${formatNumber(commodity.treatment_charge.discount)}/${commodity.treatment_charge.per_uom}`}`, ''],
                            // Use dry weight, and going off the assumption that dry weight UOM and the TC charge per weight UOM are the same, may change in the future and will need to incorporate unit conversion
                            ['', 'Treatment Charge', `${formatNumber(commodity.payable_metal)} ${commodity.payable_metal_uom} * ${currency} ${formatNumber(commodity.treatment_charge.final_rate)}/${commodity.treatment_charge.per_uom}`, {text: `${currency} ${formatNumberAndBracketIfNegative(commodity.treatment_charge.final_amount)}`, alignment: 'right', bold: true}],
                        ]) : []),
                        // Refining Charge line
                        ...(commodity.refining_charge ? (commodity.refining_charge.rate===commodity.refining_charge.final_rate ? 
                            [
                                // Use payable metal weight, and going off the assumption that payable metal weight UOM and the RC charge per weight UOM are the same, may change in the future and will need to incorporate unit conversion
                                ['', 'Refining Charge', `${formatNumber(commodity.payable_metal)} ${commodity.payable_metal_uom} * ${currency} ${formatNumber(commodity.refining_charge.final_rate)}/${commodity.refining_charge.per_uom}`, {text: `${currency} ${formatNumberAndBracketIfNegative(commodity.refining_charge.final_amount)}`, alignment: 'right', bold: true}]
                            ] : 
                            [
                                [{text: `${currency} ${formatNumber(commodity.refining_charge.discount)}/${commodity.refining_charge.per_uom}`, alignment: 'right'}, 'Refining Charge Discount', '', ''],
                                [{text: `${currency} ${formatNumber(commodity.refining_charge.final_rate)}/${commodity.refining_charge.per_uom}`, alignment: 'right'}, `${commodity.commodity} Refining Charge Rate`, `${currency} ${formatNumber(commodity.refining_charge.rate)}/${commodity.refining_charge.per_uom}${commodity.refining_charge.discount === null || commodity.refining_charge.discount === 0 ? '' : ` - ${currency} ${formatNumber(commodity.refining_charge.discount)}/${commodity.refining_charge.per_uom}`}`, ''],
                                // Use payable metal weight, and going off the assumption that payable metal weight UOM and the RC charge per weight UOM are the same, may change in the future and will need to incorporate unit conversion
                                ['', 'Refining Charge', `${formatNumber(commodity.payable_metal)} ${commodity.payable_metal_uom} * ${currency} ${formatNumber(commodity.refining_charge.final_rate)}/${commodity.refining_charge.per_uom}`, {text: `${currency} ${formatNumberAndBracketIfNegative(commodity.refining_charge.final_amount)}`, alignment: 'right', bold: true}],
                            ]) : []),
                        bottomBorderForRightMostCellWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            }
        );
        commoditySection.push(
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [70, 120, '*', 70],
                    body: [
                        [
                            '', '', {text: `Total ${commodity.commodity}:`, alignment: "right", bold: true},{text: `${currency} ${formatNumberAndBracketIfNegative(commodity.final_total)}`, alignment: 'right', bold: true}
                        ],
                        bottomBorderForTableContentWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            }
        );
    }
    return commoditySection;
}

function buildCommoditiesSummary(commodities: any, currency: string = 'USD') {
    const commoditiesSummary = [];
    for (const commodity of commodities) {
        commoditiesSummary.push(['', `${commodity.commodity} Analytical Assay`, '', {text: `${formatNumber(commodity.analytical_assay)}${commodity.assay_uom}`, alignment: 'right'}]);
    }
    for (const commodity of commodities) {
        commoditiesSummary.push(['', {text: `${commodity.commodity} Price: ${commodity.qp_start_date} - ${commodity.qp_end_date} - ${commodity.price_method}`, colSpan: 2}, '', {text: `${currency} ${formatNumber(commodity.price_rate)}/${commodity.price_per_uom}`, alignment: 'right'}]);
    }
    for (const commodity of commodities) {
        commoditiesSummary.push(['', `${commodity.commodity} QP Month : (${commodity.qp})`, '', {text: commodity.qp_declared ? (commodity.qp_month ?? `${commodity.qp_start_date} - ${commodity.qp_end_date}`) : 'To Be Declared', alignment: 'right'}]);
    }
    return commoditiesSummary;
}

function buildAdjustmentsSection(adjustments: { adjustments: any[], total_adjustments: string }, currency: string = 'USD') {
    if (!adjustments || adjustments.adjustments.length === 0) {
        return [];
    }
    const adjustmentsSection = [];
    // for (const adjustment of adjustments.adjustments) {
        adjustmentsSection.push(
            {
                style: 'tableSmlBottomMargin',
                table: {
                    widths: [70, 120, '*', 70],
                    body: [
                        [
                            {text: 'Adjustments:', style: 'tableHeader'}, '','',''
                        ],
                        ...adjustments.adjustments.map((adjustment: any) => (['', `${adjustment.description} :`, '', {text:`${currency} ${formatNumberAndBracketIfNegative(adjustment.amount)}`, alignment: 'right', bold: true}])),
                        bottomBorderForRightMostCellWithColumnsAmount(4)
                    ]
                },
                layout: {
                    defaultBorder: false,
                    hLineWidth: () => 0.5,
                }
            }
        );
    // }
    adjustmentsSection.push(	
        {
            style: 'tableSmlBottomMargin',
            table: {
                widths: [70, 160, '*', 70],
                body: [
                    [
                        '', '', {text: 'Total Adjustments:', alignment: "right", bold: true},{text: `${currency} ${formatNumberAndBracketIfNegative(adjustments.total_adjustments)}`, alignment: 'right', bold: true}
                    ],
                    bottomBorderForTableContentWithColumnsAmount(4)
                ]
            },
            layout: {
                defaultBorder: false,
                hLineWidth: () => 0.5,
            }
        }
    );

    return adjustmentsSection;
}

function buildPenaltiesSection(penalties: any, dryWeight: number, dryWeightUom: string, currency: string = 'USD') {
    const penaltiesSection = [];
    if (penalties.penalties.length === 0) {
        return [];
    }
    const penaltiyByCommodity: any[] = [];
    penaltiesSection.push(
        {
            style: 'tableSmlBottomMargin',
            table: {
                widths: [70, 120, '*', 70],
                body: [
                    [
                        {text: 'Penalties:', style: 'tableHeader'}, '','',''
                    ],
                    // use the spread syntax to map an array of penalties according to the format of the 6 arrays below
                    ...penaltiyByCommodity.concat(...penalties.penalties.map((penalty: any) => {
                        if (penalty.deduction_expression === 'No penalty') {
                            return [
                                [{text: `${formatNumber(penalty.analytical_assay)}${penalty.assay_uom}`, alignment: 'right'}, `${penalty.commodity} Analytical Assay`, '', ''],
                            ]
                        }
                        return [
                            [{text: `${formatNumber(penalty.analytical_assay)}${penalty.assay_uom}`, alignment: 'right'}, `${penalty.commodity} Analytical Assay`, '', ''],
                            // [{text: `${currency} ${penalty.final_penalty_rate}/${penalty.penalty_per_uom}`, alignment: 'right'}, `${penalty.commodity} Penalty`, `(${penalty.analytical_assay} - ${penalty.deductible_amount}) / 1.0000 * ${currency} ${penalty.penalty_rate}/${penalty.penalty_per_uom}`, ''],
                            [{text: `${currency} ${formatNumber(penalty.final_penalty_rate)}/${penalty.penalty_per_uom}`, alignment: 'right'}, `${penalty.commodity} Penalty`, `${penalty.deduction_expression}`, ''],
                            ['', `${penalty.commodity} Penalty`, `${formatNumber(dryWeight)} ${dryWeightUom} * ${currency} ${formatNumber(penalty.final_penalty_rate)}/${penalty.penalty_per_uom}`, {text:`${currency} ${formatNumberAndBracketIfNegative(penalty.final_penalty)}`, alignment: 'right', bold: true}]
                        ]
                    })),
                    bottomBorderForRightMostCellWithColumnsAmount(4)
                ]
            },
            layout: {
                defaultBorder: false,
                hLineWidth: () => 0.5,
            }
        }
    );
    penaltiesSection.push({
        style: 'tableSmlBottomMargin',
        table: {
            widths: [70, 160, '*', 70],
            body: [
                [
                    '', '', {text: 'Total Penalties:', alignment: "right", bold: true},{text: `${currency} ${formatNumberAndBracketIfNegative(penalties.total_penalties)}`, alignment: 'right', bold: true}
                ],
                bottomBorderForTableContentWithColumnsAmount(4)
            ]
        },
        layout: {
            defaultBorder: false,
            hLineWidth: () => 0.5,
        }
    });

    return penaltiesSection;
}