import { defineEndpoint } from '@directus/extensions-sdk';
import axios from 'axios';

import { formatDateYYYYMMDD } from './util/util';

export default defineEndpoint((router) => {
	router.get('/', (req: any, res: any) => {
		// get request body
		const {
			commodity,
			source,
			startDate,
			endDate,
			currency = 'USD'
		} = req.query;
		console.log(`This api has been called with the following query parameters: commodity=${commodity}, source=${source}, startDate=${startDate}, endDate=${endDate}, currency=${currency}`);
		let commodityCode;
		switch (commodity) {
			case 'Au':
				commodityCode = 'XAU';
				break;
			case 'Ag':
				commodityCode = 'XAG';
				break;
			case 'Pt':
				commodityCode = 'XPT';
				break;
			case 'Pd':
				commodityCode = 'XPD';
				break;
			default:
				console.log(`[price-data] no supported symbol for commodity: ${commodity}`);
				// randomly assign a commodity code from the list of supported commodities
				commodityCode = ['XAU', 'XAG', 'XPT', 'XPD'][Math.floor(Math.random() * 4)];
				console.log(`[price-data] randomly assigned commodity code: ${commodityCode} for comodity: ${commodity}`);
				break;
		}
		// axios.get(`https://api.metalpriceapi.com/v1/change?base=${commodityCode}&start_date=${formatDateYYYYMMDD(new Date(startDate))}&end_date=${formatDateYYYYMMDD(new Date(endDate))}&currencies=${currency}`, {
		// 	headers: {
		// 		'X-API-KEY': '205146ee045a49824d5d43b40f478505'
		// 	}
		// }).then((response) => {
		// 	res.send(JSON.stringify(response.data.data));
		// }).catch((error) => {
		// 	res.error(`axios error: ${error}`);
		// });
		res.send(`This api has been called with the following query parameters: commodity=${commodity}, source=${source}, startDate=${startDate}, endDate=${endDate}, currency=${currency}`);
	});
});
