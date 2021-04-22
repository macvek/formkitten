
let specs = [
    'SampleRendering', 
    shouldCreateForm,
    shouldInitializeModelAndReturnItBack,
    shouldUpdateModel,
    shouldApplyValidation,
    shouldApplyCustomValidation
]

module.exports = specs;

let {FormKitten, dom} = require('../formkitten');

if (require.module === module.main) {
    require('testkitten')(specs);
}

function shouldCreateForm(check) {
    let formKit = new FormKitten();
    let form = formKit.build()

    check({'assertEquals':[form.tagName, 'FORM']});
}

function shouldInitializeModelAndReturnItBack(check) {
    let formKit = new FormKitten();
    
    let sampleInput = {
        'name': 'Hello',
        'lastName':'World',
        'discarded':'Not mentioned in model, so will be not parsed'
    };
    
    
    formKit.inputText('name', "First Name");
    formKit.inputText('lastName', "Last Name");

    let form = formKit.build();
    dom.window.document.body.appendChild(form);
    
    formKit.loadFrom(sampleInput);
    let out = {};
    formKit.storeTo(out);

    let expected = {
        'name':'Hello',
        'lastName':'World'
    }

    check({'assertJsonEquals':[expected, out]});
}

function shouldUpdateModel(check) {
    let formKit = new FormKitten();
    
    let model = {
        'name': 'Hello',
        'lastName':'World',
        'invisible':'Not modified'
    };
    
    
    let idForInput = formKit.inputText('name', "First Name");
    formKit.inputText('lastName', "Last Name");

    let form = formKit.build();
    dom.window.document.body.appendChild(form);
    
    formKit.loadFrom(model);

    dom.window.document.getElementById(idForInput).value = 'Johnny';

    formKit.storeTo(model);

    let expected = {
        'name': 'Johnny',
        'lastName':'World',
        'invisible':'Not modified'
    }

    check({assertJsonEquals:[expected, model]});
}

function shouldApplyValidation(check) {
    let f = new FormKitten();
        
    let idForInput = f.inputText('requiredField', "This field must be filed in order to reach submit event");

    let form = f.build(true);
    dom.window.document.body.appendChild(form);

    f.applyValidation({
        requiredField:{required:''}
    });

    let submitted = false;

    form.addEventListener('submit', submitCallback);
    triggerSubmit(dom, form);
    
    // should not reach it because of validation
    check({mark:'Check before submit', assertEquals: [false, submitted]});

    dom.window.document.getElementById(idForInput).value='something';

    triggerSubmit(dom, form);
    check({mark:'Check after submit', assertEquals: [true, submitted]});

    function submitCallback() {
        submitted = true;
    }

}

function shouldApplyCustomValidation(check) {
    let f = new FormKitten();
        
    let idForInput = f.inputText('customValidField', "It must match CHEESE value");

    let form = f.build(true);
    dom.window.document.body.appendChild(form);

    f.applyValidation({
        customValidField:{withCallback: (value) => value !== 'CHEESE' ? 'Invalid value': null}
    });

    let submitted = false;

    form.addEventListener('submit', submitCallback);
    dom.window.document.getElementById(idForInput).value = 'NotCheese';
    triggerSubmit(dom, form);
    
    check({mark:'Check before submit', assertEquals: [false, submitted]});

    dom.window.document.getElementById(idForInput).value = 'CHEESE';

    triggerSubmit(dom, form);
    check({mark:'Check after submit', assertEquals: [true, submitted]});

    let out = {};
    f.storeTo(out);
    check({assertJsonEquals: [ {customValidField:'CHEESE'}, out]});

    function submitCallback() {
        submitted = true;
    }

}

function triggerSubmit(dom,form) {
    let evt = dom.window.document.createEvent("htmlevents");
    evt.initEvent("submit", false, true);
    form.dispatchEvent(evt)
}


