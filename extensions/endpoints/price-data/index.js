"use strict";var e=e=>{e.get("/",((e,o)=>{const{commodity:a,source:t,startDate:r,endDate:c,currency:s="USD"}=e.query;let d;switch(console.log(`This api has been called with the following query parameters: commodity=${a}, source=${t}, startDate=${r}, endDate=${c}, currency=${s}`),a){case"Au":d="XAU";break;case"Ag":d="XAG";break;case"Pt":d="XPT";break;case"Pd":d="XPD";break;default:console.log(`[price-data] no supported symbol for commodity: ${a}`),d=["XAU","XAG","XPT","XPD"][Math.floor(4*Math.random())],console.log(`[price-data] randomly assigned commodity code: ${d} for comodity: ${a}`)}o.send(`This api has been called with the following query parameters: commodity=${a}, source=${t}, startDate=${r}, endDate=${c}, currency=${s}`)}))};module.exports=e;