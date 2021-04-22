const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
let window = dom.window;
let document = dom.window.document;


let inc = require('includeplainjs');
let out = {FormKitten:null}

inc(__dirname+'/formkitten.class.js', out, {window, document});

let { FormKitten } = out;

module.exports = {FormKitten, dom};
