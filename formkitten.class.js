class FormKitten {
    static globalId = 0;
    content = [];
    validationPacks = [];
    knownIds = new Set();
    instanceId = ++FormKitten.globalId;
    builtForm;

    multiSelect(modelName, caption, values, hint) {
        return this.select(modelName, caption, values, hint, true);
    }

    select(modelName, caption, values, hint, multiple=false) {
        let selectId = this._idFor(modelName);
        
        let optionsList = [];
        for (let each of values) {
            optionsList.push( this._objectToNode('option', each));
        }

        let options = optionsList.join('\n');

        let multipleHint = multiple?'multiple':''

        let template = `
            <div class="mb-3">
            <label for="${selectId}" class="form-label">${caption}</label>
            <select id="${selectId}" ${multipleHint} class="form-select">
                ${options}
            </select>
            </div>
        `;
        
        this._pushAsHTML(template);
        return selectId;
    }

    option(caption, attributes) {
        return { caption, attributes };
    }

    submit(caption) {
        let template = `<button type="submit" class="btn btn-primary">${caption}</button>`;
        this._pushAsHTML(template);
    }

    checkbox(modelName, caption, hint) {
        let inputId = this._idFor(modelName);
        let [hintTemplate, hintPointer] = this._hintLabelTemplate(hint, modelName);
        let template = `
            <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="${inputId}" ${hintPointer}>
                <label for="${inputId}" class="form-check-label">${caption}</label>
                ${hintTemplate}
            </div>
        `;

        this._pushAsHTML(template);
        return inputId;
    }

    textarea(modelName, caption, hint) {
        let inputId = this._idFor(modelName);
        let [hintTemplate, hintPointer] = this._hintLabelTemplate(hint, modelName);

        let template = `
        <div class="mb-3">
            <label for="${inputId}" class="form-label">${caption}</label>
            <textarea class="form-control" id="${inputId}" rows="3" ${hintPointer}></textarea>
            ${hintTemplate}
        </div>
        `;

        this._pushAsHTML(template);
        return inputId;
    }

    inputEmail(modelName, caption, hint) {
        return this.input(modelName, 'email', caption, hint);
    }

    inputPassword(modelName, caption, hint) {
        return this.input(modelName, 'password', caption, hint);
    }

    inputText(modelName, caption, hint) {
        return this.input(modelName, 'text', caption, hint);
    }

    input(modelName, type, caption, hint) {
        let inputId = this._idFor(modelName);
        let [hintTemplate, hintPointer] = this._hintLabelTemplate(hint, modelName);

        let template = `
        <div class="mb-3">
            <label for="${inputId}" class="form-label">${caption}</label>
            <input type="${type}" class="form-control" id="${inputId}" ${hintPointer}>
            ${hintTemplate}
        </div>
        `;

        this._pushAsHTML(template);
        return inputId;
    }

    /**
     * Adds a custom component to a form; component must be a DOM Element;
     * factoryCallback is in form (idForInput:string)=>(DOMElement);
     * Returned element must be detached, because FormKit will attach it on 'build' operation.
     * DOM element is created during this method invocation.
     * 
     * if idForInput is set to created input, then all model related operations will apply to such input.
     * @param {*} modelName name of field to attach to
     * @param {*} factoryCallback (idForInput:string)=>(DOMElement)
     * @returns id for input; same value which is passed to factoryCallback
     */
    custom(modelName, factoryCallback) {
        let inputId = this._idFor(modelName);
        let domElement = factoryCallback(inputId);
        this.content.push(domElement);
        return inputId;
    }

    /**
     * Allows putting any DOM element between form controls; it is used for decoration, extra texts or separators.
     * @param {*} domElement 
     */
    element(domElement) {
        this.content.push(domElement);
    }

    /**
     * Builds dom element <form>
     * @param {Boolean} withValidation triggers if submit should check form validation
     * @returns DOM element form
     */
    build(withValidation=false) {
        let form = document.createElement('form');
        this.builtForm = form;
        for (let each of this.content) {
            form.appendChild(each);
        }

        let self = this;
        if (withValidation) {
            form.setAttribute('novalidate','');
            form.addEventListener('submit', (event) => {
                let passed = self.triggerValidation();
                if (!passed) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }, true);
        }
        
        return form;
    }

    /**
     * triggers form validation and returns if form passes it
     * @returns boolean - if form is valid
     */
    triggerValidation() {
        this._triggerValidationCallbacks();
        let ret = this.builtForm.checkValidity();
        this.builtForm.classList.add('was-validated');

        return ret;
    }

    /**
     * Applies validation rules to form elements.
     * This method finds bound controls from model (by property name) and adds attributes (property values) to them.
     * There are 2 special attributes: withCallback, withInvalidFeedback.
     * 
     * withCallback must hold callback in form of (inputValue:string, modelName:string) => text:String, 
     * where:
     *  inputValue - value loaded from control
     *  modelName - path in model
     *  return text - error message for invalid control; valid control should return something which is (==) false (like nothing, or false or '')
     * 
     * example of model:
     * { "model.name" : {required:''},
       "other": {min:10, withInvalidFeedback:"requires at least 10 characters"},
       "onlyHello": { withCallback: ( value => value != "Hello" ? "only Hello accepted;" : '') }
     };
     * @param {*} model with validation properties 
     */

    applyValidation(model) {
        for (let each of this.knownIds) {
            let fromModel = this._loadValue(model, each);
            if (fromModel !== undefined) {
                let domInput = document.getElementById(this._idFor(each));
                for (let attrName in fromModel) {
                    let attrValue = fromModel[attrName];
                    switch(attrName) {
                    case 'withCallback':
                        this._addValidationCallback(domInput, attrName, attrValue);
                        break;
                    case 'withInvalidFeedback':
                        this._addInvalidFeedbackText(domInput, attrValue);
                        break;
                    default:
                        domInput.setAttribute(attrName, attrValue);
                    }
                }
            }
        }
    }



    /**
     * Loads values from model and places into form fields
     * @param {*} model Object with fields matching paths from defined form elements
     */
    loadFrom(model) {
        for (let each of this.knownIds) {
            let fromModel = this._loadValue(model, each);
            if (fromModel !== undefined) {
                let domInput = document.getElementById(this._idFor(each));
                if (domInput) {
                    this._fillDOMInputValue(domInput, fromModel);
                }
            }
        }
    }

    /**
     * Puts values from form elements into model fields
     * @param {*} model Destination for values from form elements
     */
    storeTo(model) {
        for (let modelName of this.knownIds) {
            let domInput = document.getElementById(this._idFor(modelName));
            if (domInput) {
                let value = this._loadDOMInputValue(domInput);
                if (typeof value !== 'undefined') {
                    this._storeValue(model, modelName, value);
                }
            }
        }
    }

    _loadValue(model, varName) {
        if (typeof model !== 'object') {
            console.error('incorrect model', model);
            throw 'Model must be an object';
        }
        if (typeof model[varName] !== 'undefined') {
            return model[varName];
        }

        let parts = varName.split('.');
        let nextInLine = model[parts[0]];
        if (typeof nextInLine === 'object') {
            parts.splice(0,1);
            if (parts.length > 0) {
                return this._loadValue(nextInLine, parts.join('.'));
            }
        }
    }

    _storeValue(model, varName, value) {
        let parts = varName.split('.');
        if (parts.length > 1) {
            let head = parts[0];
            let nextModel;
            if (typeof model[head] === 'object') {
                nextModel = model[head];
            }
            else {
                nextModel = {};
            }

            parts.splice(0,1);
            this._storeValue(nextModel, parts.join('.'), value);
            model[head] = nextModel;
        }
        else {
            model[varName] = value;
        }
    }

    _addInvalidFeedbackText(domInput, text) {
        let template = `<div class='invalid-feedback'>${text}</div>`;
        let node = this._pickFromHTML(template);
        let parent = domInput.parentNode;
        let after = domInput.nextSibling;
        if (!after) {
            parent.appendChild(node);
        }
        else {
            parent.insertBefore(node, after);
        }
        
    }

    _addValidationCallback(domInput, modelName, callback) {
        this.validationPacks.push({
            domInput,
            modelName,
            callback
        });
    }

    _triggerValidationCallbacks() {
        for (let pack of this.validationPacks) {
            let value = this._loadDOMInputValue(pack.domInput);
            let text = pack.callback(value, pack.modelName);
            if (!text) {
                text = '';
                this._restoreInvalidFeedbackText(pack.domInput);
            }

            if (text !== '') {
                this._replaceInvalidFeedbackText(pack.domInput, text);
            }

            pack.domInput.setCustomValidity(text);
        }
    }

    _loadDOMInputValue(domInput) {
        let tagName = domInput.tagName;
        if (!tagName) return;
        switch(domInput.tagName.toLowerCase()) {
            case 'select': if (domInput.hasAttribute('multiple')) { return this._loadMultiSelectValue(domInput);}
            case 'textarea':
            case 'input': return this._loadHTMLInputValue(domInput);
        }
    }

    _fillDOMInputValue(domInput, fromModel) {
        let tagName = domInput.tagName;
        if (!tagName) return;
        switch(domInput.tagName.toLowerCase()) {
            case 'select': if (domInput.hasAttribute('multiple')) { return this._fillMultiSelectValue(domInput, fromModel);}
            case 'textarea':
            case 'input': return this._fillHTMLInputValue(domInput, fromModel);
        }
    }

    _loadHTMLInputValue(htmlInput) {
        if (htmlInput.getAttribute('type') === 'checkbox') {
            return htmlInput.checked;
        }
        else {
            return htmlInput.value;
        }
    }

    _fillHTMLInputValue(htmlInput, value) {
        if (htmlInput.getAttribute('type') === 'checkbox') {
            htmlInput.checked = true === value;
        }
        else {
            htmlInput.value = value;
            htmlInput.focus();
        }
    }

    _loadMultiSelectValue(htmlInput) {
        let options = htmlInput.querySelectorAll(`option`);
        let values = []
        for (let opt of options) {
            if (opt.selected) {
                values.push(opt.value);
            }
        }

        return values;
    }

    _restoreInvalidFeedbackText(domInput) {
        let feedbackNode = domInput.nextSibling;
        if (feedbackNode && feedbackNode.classList.contains('invalid-feedback')) {
            let tempNode = feedbackNode.querySelector('.temporary');
            if (tempNode) {
                let restoredText = tempNode.innerHTML;
                feedbackNode.innerHTML = restoredText;
            }
        }
    }

    _replaceInvalidFeedbackText(domInput, text) {
        let feedbackNode = domInput.nextSibling;
        if (feedbackNode && feedbackNode.classList.contains('invalid-feedback')) {
            let replacement = `<div class="temporary" style="display:none">${feedbackNode.innerHTML}</div>${text}</div>`;
            feedbackNode.innerHTML = replacement;
        }
    }


    _fillMultiSelectValue(htmlInput, values) {
        if (!Array.isArray(values)) {
            return;
        }
        let options = htmlInput.querySelectorAll(`option`);
        for (let opt of options) {
            let value = opt.value;
            
            opt.selected = values.indexOf(value) != -1;
        }
    }

    _hintLabelTemplate(hint, modelName) {
        let hintTemplate = '';
        let hintPointer = '';
        if (hint) {
            let hintId = this._idFor(`${modelName}-hint`);
            hintTemplate =`<div id="${hintId}" class="form-text">${hint}</div>`;
            hintPointer = `aria-describedby="${hintId}"`;
        }
        return [hintTemplate, hintPointer];
    }

    _pickFromHTML(template) {
        let parent = document.createElement('div');
        parent.innerHTML = template.trim();
        let ret = parent.firstChild;
        parent.removeChild(ret);

        return ret;
    }

    _objectToNode(nodeName, obj) {
        let caption = obj.caption;
        let attrs = obj.attributes;
        let selectedMark = attrs.selected ? 'selected' : '';
        let valueMark = attrs.value ? `value="${attrs.value}"` : '';
        let disabledMark = attrs.disabled ? 'disabled' : '';
        let readonlyMark = attrs.readonly ? 'readonly' : '';
        let packedItem = `<${nodeName} ${valueMark} ${selectedMark} ${disabledMark} ${readonlyMark}>${caption}</${nodeName}>`;

        return packedItem;
    }

    _pushAsHTML(template) {
        let x = this._pickFromHTML(template);
        this.content.push(x);
    }

    _idFor(name) {
        this.knownIds.add(name);
        return `formkit${this.instanceId}-${name}`;
    }
}
