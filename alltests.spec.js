let testkitten = require('testkitten');
let samplerenderingSpec = require('./spec/samplerendering.spec');

let specs = ['All tests'].concat(samplerenderingSpec);

testkitten(specs);
