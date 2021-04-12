let { FormKitten, dom } = require('./formkitten.js');

let document = dom.window.document;

let version = 3;
let all = true;
let f = new FormKitten();
if (version == 1 || all) {
    f.inputEmail('emailField', "Email address", `We'll never share your email with anyone else.`);
    f.inputPassword('embedded.passwordField', "Password");
    f.checkbox('checkboxField', 'Check me out', "Hint for checkbox");
    f.submit('Submit');
}
if (version == 2 || all) {
    f.textarea("textareaField", "Example textarea", "extra hint");
}
if (version == 3 || all) {
    let possibleValues = [
        f.option("Open this select menu",{selected:true}),
        f.option("One", {value:1}),
        f.option("Two", {value:2}),
        f.option("Three", {value:3})
    ]
    f.select("selectedField", "Picker", possibleValues, "extra hint");

    possibleValues = [
        f.option("Open this select menu",{selected:true}),
        f.option("One", {value:'a',selected:true}),
        f.option("Two", {value:'b',selected:true}),
        f.option("Three", {value:'c'})
    ]
    f.multiSelect("multiPicker", "Multi Picker", possibleValues, "extra hint");
}

let formDOM = f.build(true);
document.body.appendChild(formDOM);
f.loadFrom({
    emailField:'Hello@world',
    embedded: {passwordField:'pass'},
    textareaField: 'in text area',
    selectedField:2,
    multiPicker:['a','c'],
    customField:1234
});

f.applyValidation({
    emailField:{required:'',withInvalidFeedback:'Please add email', withCallback: (value, modelName) => {
        console.log(`triggered custom from ${modelName} ${value}`);
        if (value !== "Hello@World" && value !== '') {
            return "Only Hello@World is accepted here";
        }
    }},
    checkboxField: {required:'', withInvalidFeedback:'You must accept the terms'},
    textareaField: {minlength:10}

})


formDOM.addEventListener('submit', event => {
    let newModel = {};
    f.storeTo(newModel);
    console.log(newModel);
    event.preventDefault();
});

var evt = document.createEvent("htmlevents");
evt.initEvent("submit", false, true);
formDOM.dispatchEvent(evt)
