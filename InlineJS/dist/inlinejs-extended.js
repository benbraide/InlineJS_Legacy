"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var InlineJS;
(function (InlineJS) {
    var ExtendedDirectiveHandlers = /** @class */ (function () {
        function ExtendedDirectiveHandlers() {
        }
        ExtendedDirectiveHandlers.Watch = function (region, element, directive) {
            var previousValue;
            region.GetState().TrapGetAccess(function () {
                var value = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                if (!InlineJS.Region.IsEqual(value, previousValue)) {
                    previousValue = InlineJS.Region.DeepCopy(value);
                    element.dispatchEvent(new CustomEvent('watch.change', { detail: value }));
                }
            }, true, element);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.When = function (region, element, directive) {
            region.GetState().TrapGetAccess(function () {
                if (!!InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value)) {
                    element.dispatchEvent(new CustomEvent('when.change'));
                }
            }, true, element);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Once = function (region, element, directive) {
            region.GetState().TrapGetAccess(function () {
                if (!!InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value)) {
                    element.dispatchEvent(new CustomEvent('once.change'));
                    return false;
                }
                return true;
            }, true, element);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Mouse = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$mouse')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            InlineJS.Region.AddGlobal('$mouse', function (regionId, contextElement) {
                if (!contextElement) {
                    return null;
                }
                var elementScope = InlineJS.Region.Get(regionId).AddElement(contextElement, true);
                if (elementScope && '$mouse' in elementScope.locals) {
                    return elementScope.locals['$mouse'];
                }
                var scope = (elementScope ? ExtendedDirectiveHandlers.AddScope('mouse', elementScope, []) : null);
                if (!scope) {
                    return null;
                }
                var inside = false, listening = {
                    inside: false
                };
                var callbacks = {
                    click: new Array(),
                    mousemove: new Array(),
                    mouseenter: new Array(),
                    mouseleave: new Array(),
                    mouseover: new Array(),
                    mouseout: new Array(),
                    mousedown: new Array(),
                    mouseup: new Array()
                };
                Object.keys(callbacks).forEach(function (key) { return listening[key] = false; });
                var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                    if (prop === 'inside') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                        if (!listening.inside) {
                            listening.inside = true;
                            contextElement.addEventListener('mouseenter', function () {
                                if (!inside) {
                                    inside = true;
                                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'inside', scope);
                                }
                            });
                            contextElement.addEventListener('mouseleave', function () {
                                if (inside) {
                                    inside = false;
                                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'inside', scope);
                                }
                            });
                        }
                        return inside;
                    }
                    if (prop in callbacks) {
                        return function (callback, remove) {
                            if (remove === void 0) { remove = false; }
                            if (remove) {
                                callbacks[prop].splice(callbacks[prop].indexOf(callback), 1);
                                return;
                            }
                            if (!callbacks[prop].includes(callback)) {
                                callbacks[prop].push(callback);
                            }
                            if (!listening[prop]) {
                                listening[prop] = true;
                                contextElement.addEventListener(prop, function (e) {
                                    callbacks[prop].forEach(function (callback) { return callback(e); });
                                });
                            }
                        };
                    }
                    if (prop === 'parent') {
                        return InlineJS.Region.GetGlobalValue(regionId, '$$mouse')(InlineJS.Region.Get(regionId).GetElementAncestor(contextElement, 0));
                    }
                    if (prop === 'ancestor') {
                        return function (index) {
                            return InlineJS.Region.GetGlobalValue(regionId, '$$mouse')(InlineJS.Region.Get(regionId).GetElementAncestor(contextElement, index));
                        };
                    }
                }, __spreadArrays(['inside', 'parent', 'ancestor'], Object.keys(callbacks)));
                elementScope.locals['$mouse'] = proxy;
                return proxy;
            });
            InlineJS.Region.AddGlobal('$$mouse', function (regionId) { return function (target) {
                if (!target) {
                    return null;
                }
                var mouseGlobal = InlineJS.Region.GetGlobal(regionId, '$mouse');
                return (mouseGlobal ? mouseGlobal(regionId, target) : null);
            }; });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Input = function (region, element, directive) {
            var wrapper = document.createElement('div'), innerWrapper = document.createElement('div'), label = document.createElement('span'), hiddenLabel = document.createElement('span'), style = getComputedStyle(element);
            var cachedValues = {
                fontSize: style.fontSize,
                paddingBottom: style.paddingBottom,
                borderBottom: style.borderBottomWidth,
                height: element.clientHeight
            };
            wrapper.style.display = style.display;
            wrapper.style.position = style.position;
            wrapper.style.visibility = style.visibility;
            wrapper.style.width = style.width;
            wrapper.style.margin = style.margin;
            wrapper.style.top = style.top;
            wrapper.style.right = style.right;
            wrapper.style.bottom = style.bottom;
            wrapper.style.left = style.left;
            wrapper.classList.add('inlinejs-input');
            if (directive.arg.options.includes('validate')) {
                wrapper.classList.add('validate');
            }
            innerWrapper.classList.add('inlinejs-input-wrapper');
            label.classList.add('inlinejs-input-label');
            hiddenLabel.classList.add('inlinejs-input-hidden-label');
            element.classList.add('inlinejs-input-textbox');
            label.style.left = style.paddingLeft;
            label.style.bottom = cachedValues.paddingBottom;
            label.style.fontSize = style.fontSize;
            hiddenLabel.style.fontSize = "calc(" + style.fontSize + " * 0.81)";
            element.parentElement.insertBefore(wrapper, element);
            innerWrapper.appendChild(hiddenLabel);
            innerWrapper.appendChild(element);
            innerWrapper.appendChild(label);
            wrapper.appendChild(innerWrapper);
            if (directive.arg.options.includes('password')) {
                var icon_1 = document.createElement('i'), updateIcon_1 = function () {
                    if (element.type === 'text') {
                        icon_1.title = 'Hide password';
                        icon_1.textContent = 'visibility_off';
                    }
                    else { //Hidden
                        icon_1.title = 'Show password';
                        icon_1.textContent = 'visibility';
                    }
                };
                icon_1.classList.add('inlinejs-input-password-icon');
                icon_1.classList.add('material-icons-outlined');
                icon_1.style.right = style.paddingRight;
                icon_1.style.bottom = cachedValues.paddingBottom;
                icon_1.style.fontSize = "calc(" + style.fontSize + " * 1.25)";
                innerWrapper.appendChild(icon_1);
                updateIcon_1();
                icon_1.addEventListener('click', function () {
                    element.type = ((element.type === 'password') ? 'text' : 'password');
                    element.focus();
                    updateIcon_1();
                    element.dispatchEvent(new CustomEvent('input.password', {
                        detail: element.type
                    }));
                });
            }
            label.textContent = element.placeholder;
            element.placeholder = '';
            var options = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (InlineJS.Region.IsObject(options)) {
                Object.keys(options).forEach(function (key) {
                    if (key === 'wrapperClass') {
                        (Array.isArray(options[key]) ? options[key] : options[key].split(' ')).forEach(function (item) { return wrapper.classList.add(item); });
                    }
                    else if (key === 'labelClass') {
                        (Array.isArray(options[key]) ? options[key] : options[key].split(' ')).forEach(function (item) { return label.classList.add(item); });
                    }
                });
            }
            var labelShown = true;
            var toggleLabel = function (show) {
                if (show == labelShown) {
                    return;
                }
                labelShown = show;
                if (show) {
                    label.style.bottom = cachedValues.paddingBottom;
                    label.style.fontSize = cachedValues.fontSize;
                }
                else {
                    label.style.bottom = cachedValues.height + "px";
                    label.style.fontSize = hiddenLabel.style.fontSize;
                }
            };
            var onBlur = function () {
                wrapper.classList.add('blurred');
                if (!element.value) {
                    toggleLabel(true);
                }
            };
            element.addEventListener('blur', onBlur);
            element.addEventListener('focus', function () {
                toggleLabel(false);
            });
            element.addEventListener('input', function () {
                if (element.value) {
                    toggleLabel(false);
                }
            });
            label.addEventListener('focus', function () { return element.focus(); });
            label.addEventListener('click', function () {
                element.focus();
            });
            if (element.value) {
                toggleLabel(false);
            }
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.State = function (region, element, directive) {
            var delay = 750, lazy = false, submit = false;
            for (var i = 0; i < directive.arg.options.length; ++i) {
                if (directive.arg.options[i] === 'delay' && i < (directive.arg.options.length - 1)) {
                    delay = InlineJS.CoreDirectiveHandlers.ExtractDuration(directive.arg.options[i + 1], delay);
                }
                else if (directive.arg.options[i] === 'lazy') {
                    lazy = true;
                }
                else if (directive.arg.options[i] === 'submit') {
                    submit = true;
                }
            }
            return ExtendedDirectiveHandlers.ContextState(region, element, lazy, delay, submit, null);
        };
        ExtendedDirectiveHandlers.ContextState = function (region, element, lazy, delay, submit, info) {
            var eventKeys = {
                isDirty: 'dirty',
                isTyping: 'typing',
                isValid: 'valid'
            };
            var inverseEventKeys = {
                isDirty: 'clean',
                isTyping: 'stopped.typing',
                isValid: 'invalid'
            };
            var eventChangeKeys = {
                isDirty: 'dirty.change',
                isTyping: 'typing.change',
                isValid: 'valid.change'
            };
            var isText = false, isUnknown = false, regionId = region.GetId();
            if (element.tagName === 'INPUT') {
                var type = element.type;
                isText = (type === 'text' || type === 'password' || type === 'email' || type === 'search' || type === 'number' || type === 'tel' || type === 'url');
            }
            else if (element.tagName === 'TEXTAREA') {
                isText = true;
            }
            else if (element.tagName !== 'SELECT') {
                isUnknown = true;
            }
            var elementScope = region.AddElement(element, true);
            if ('$state' in elementScope.locals) { //Duplicate
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var scope = ExtendedDirectiveHandlers.AddScope('state', elementScope, ['isDirty', 'isTyping', 'isValid']), isRoot = false, forceSet = false, form = null;
            if (!info) { //Initialize info
                isRoot = true;
                info = {
                    value: {
                        isDirty: false,
                        isTyping: false,
                        isValid: false
                    },
                    count: {
                        isDirty: 0,
                        isTyping: 0,
                        isValid: 0
                    },
                    activeCount: 0,
                    doneInit: false,
                    setValue: function (key, value) {
                        if (forceSet || value != info.value[key]) {
                            info.value[key] = value;
                            info.alert(key);
                            scope.callbacks[key].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, value); });
                            element.dispatchEvent(new CustomEvent("state." + eventChangeKeys[key], { detail: value }));
                            element.dispatchEvent(new CustomEvent("state." + (value ? eventKeys[key] : inverseEventKeys[key])));
                        }
                    },
                    alert: function (key) {
                        var myRegion = InlineJS.Region.Get(regionId);
                        myRegion.GetChanges().Add({
                            regionId: regionId,
                            type: 'set',
                            path: scope.path + "." + key,
                            prop: key,
                            origin: myRegion.GetChanges().GetOrigin()
                        });
                        if (key === 'isDirty' || key === 'isValid') {
                            myRegion.GetChanges().Add({
                                regionId: regionId,
                                type: 'set',
                                path: scope.path + ".isDirtyAndValid",
                                prop: key,
                                origin: myRegion.GetChanges().GetOrigin()
                            });
                        }
                    },
                    resetCallbacks: new Array()
                };
                if (submit) {
                    form = region.GetElementWith(true, function (target) { return (target instanceof HTMLFormElement); });
                }
                elementScope.locals['$state'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                    if (prop in info.value) {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                        return info.value[prop];
                    }
                    if (prop === 'isDirtyAndValid') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                        return (info.value.isDirty && info.value.isValid);
                    }
                    if (prop === 'reset') {
                        return function () {
                            if (!info.doneInit) { //Nothing to reset
                                return;
                            }
                            info.doneInit = false;
                            info.count.isDirty = info.count.isTyping = info.count.isValid = 0;
                            info.value.isDirty = info.value.isTyping = info.value.isValid = false;
                            info.resetCallbacks.forEach(function (callback) { return callback(); });
                            finalize();
                        };
                    }
                    if (prop === 'onDirtyChange') {
                        return function (callback) { return scope.callbacks['isDirty'].push(callback); };
                    }
                    if (prop === 'onTypingChange') {
                        return function (callback) { return scope.callbacks['isTyping'].push(callback); };
                    }
                    if (prop === 'onValidChange') {
                        return function (callback) { return scope.callbacks['isValid'].push(callback); };
                    }
                }, __spreadArrays(Object.keys(info.value), ['reset', 'onDirtyChange', 'onTypingChange', 'onValidChange']));
                region.AddElement(element).uninitCallbacks.push(function () {
                    info = null;
                });
            }
            var finalize = function () {
                if (info.doneInit) {
                    return;
                }
                info.doneInit = true;
                forceSet = true;
                info.setValue('isDirty', (0 < info.count.isDirty));
                info.setValue('isTyping', false);
                info.setValue('isValid', (info.count.isValid == info.activeCount));
                forceSet = false;
            };
            if (isUnknown) { //Pass to offspring
                Array.from(element.children).forEach(function (child) { return ExtendedDirectiveHandlers.ContextState(region, child, lazy, delay, submit, info); });
                if (isRoot) { //Done
                    if (info.activeCount == 0) {
                        return InlineJS.DirectiveHandlerReturn.Nil;
                    }
                    finalize();
                }
                return InlineJS.DirectiveHandlerReturn.Handled;
            }
            var updateCount = function (key, value, requireAll) {
                if (info.doneInit) {
                    info.count[key] += value;
                    if (info.count[key] == 0) {
                        info.setValue(key, false);
                    }
                    else if (info.count[key] == info.activeCount || (info.count[key] > 0 && !requireAll)) {
                        info.setValue(key, true);
                    }
                    else {
                        info.setValue(key, false);
                    }
                }
                else if (value == 1) { //Initial update
                    info.count[key] += 1;
                }
            };
            var counter = 0, isDirty = false, isTyping = false, isValid = false;
            var stoppedTyping = function () {
                if (isTyping) {
                    isTyping = false;
                    updateCount('isTyping', -1, false);
                    if (form) {
                        form.dispatchEvent(new CustomEvent('submit'));
                    }
                }
                if (lazy && element.checkValidity() != isValid) {
                    isValid = !isValid;
                    updateCount('isValid', (isValid ? 1 : -1), true);
                }
            };
            var onEvent = function () {
                if (isText) {
                    var checkpoint_1 = ++counter;
                    setTimeout(function () {
                        if (checkpoint_1 == counter) {
                            stoppedTyping();
                        }
                    }, delay);
                    if (!isTyping) {
                        isTyping = true;
                        updateCount('isTyping', 1, false);
                    }
                }
                if (!isDirty) {
                    isDirty = true;
                    updateCount('isDirty', 1, false);
                }
                if ((!isText || !lazy) && element.checkValidity() != isValid) {
                    isValid = !isValid;
                    updateCount('isValid', (isValid ? 1 : -1), true);
                }
            };
            if (isText) {
                element.addEventListener('input', onEvent);
                element.addEventListener('blur', stoppedTyping);
            }
            else {
                element.addEventListener('change', onEvent);
            }
            var initialState = function () {
                isDirty = isTyping = false;
                isValid = element.checkValidity();
                updateCount('isValid', (isValid ? 1 : -1), true);
            };
            ++info.activeCount;
            info.resetCallbacks.push(initialState);
            initialState();
            if (isRoot) { //Done
                finalize();
            }
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.AttrChange = function (region, element, directive) {
            var elementScope = region.AddElement(element, true);
            var scope = ExtendedDirectiveHandlers.AddScope('attrChange', elementScope, ['onChange']);
            var regionId = region.GetId(), info = {
                name: 'N/A',
                value: 'N/A'
            };
            var assign = function () {
                InlineJS.Evaluator.Evaluate(regionId, element, "(" + directive.value + ")={name: '" + info.name + "', value: '" + info.value + "'}");
            };
            elementScope.attributeChangeCallbacks.push(function (name) {
                var myRegion = InlineJS.Region.Get(regionId), value = element.getAttribute(name);
                info = {
                    name: name,
                    value: value
                };
                assign();
                Object.keys(info).forEach(function (key) {
                    myRegion.GetChanges().Add({
                        regionId: regionId,
                        type: 'set',
                        path: scope.path + "." + key,
                        prop: key,
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                });
                Object.keys(scope.callbacks).forEach(function (key) { return scope.callbacks[key].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, {
                    name: name,
                    value: value
                }); }); });
                element.dispatchEvent(new CustomEvent("attr.change", { detail: info }));
            });
            elementScope.locals['$attr'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info) {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return info[prop];
                }
                if (prop in scope.callbacks) {
                    return function (callback) { return scope.callbacks[prop].push(callback); };
                }
            }, __spreadArrays(Object.keys(info), Object.keys(scope.callbacks)));
            assign();
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.JSONLoad = function (region, element, directive) {
            var regionId = region.GetId(), info = {
                url: '',
                active: false,
                data: null,
                reload: function () { return load('::reload::'); },
                unload: function () { return load('::unload::'); }
            };
            var queuedUrl = null;
            var load = function (url) {
                if (!url || !(url = url.trim())) {
                    return;
                }
                if (info.active) {
                    queuedUrl = url;
                    return;
                }
                if (url === '::unload::') {
                    if (info.data !== null) {
                        info.data = null;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'data', scope);
                    }
                    return;
                }
                info.active = true;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                fetch(url, {
                    method: 'GET',
                    credentials: 'same-origin'
                }).then(function (response) {
                    try {
                        return response.json();
                    }
                    catch (err) { }
                    return null;
                }).then(function (data) {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    if (!InlineJS.Region.IsEqual(data, info.data)) {
                        info.data = data;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'data', scope);
                    }
                    Object.keys(scope.callbacks).forEach(function (key) { return scope.callbacks[key].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, true); }); });
                    element.dispatchEvent(new CustomEvent("json.load", {
                        detail: { data: data }
                    }));
                    if (queuedUrl) {
                        load(queuedUrl);
                        queuedUrl = null;
                    }
                })["catch"](function (err) {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    if (info.data !== null) {
                        info.data = null;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'data', scope);
                    }
                    if (queuedUrl) {
                        load(queuedUrl);
                        queuedUrl = null;
                    }
                });
            };
            var elementScope = region.AddElement(element, true);
            var scope = ExtendedDirectiveHandlers.AddScope('json', elementScope, ['onLoad']);
            region.GetState().TrapGetAccess(function () {
                var url = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), reload = false;
                if (typeof url !== 'string') {
                    return;
                }
                if (url.startsWith('::reload::')) {
                    reload = true;
                    url = (url.substr(10) || info.url);
                }
                if (reload || url !== info.url) {
                    load(url);
                    info.url = url;
                }
                else if (url !== '::unload::') {
                    element.dispatchEvent(new CustomEvent("json.reload"));
                }
            }, true, element);
            elementScope.locals['$json'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info) {
                    if (prop === 'active' || prop === 'data') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    }
                    return info[prop];
                }
                if (prop in scope.callbacks) {
                    return function (callback) { return scope.callbacks[prop].push(callback); };
                }
            }, __spreadArrays(Object.keys(info), Object.keys(scope.callbacks)));
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.XHRLoad = function (region, element, directive) {
            var append = function (state, isOnce) {
                if (isOnce === void 0) { isOnce = false; }
                info.isAppend = state;
                info.isOnce = isOnce;
            };
            var regionId = region.GetId(), info = {
                url: '',
                isAppend: directive.arg.options.includes('append'),
                isOnce: directive.arg.options.includes('once'),
                isLoaded: false,
                active: false,
                progress: 0,
                append: append,
                reload: function () { return load('::reload::'); },
                unload: function () { return load('::unload::'); }
            };
            var queuedUrl = null;
            var load = function (url) {
                if (!url || !(url = url.trim())) {
                    return;
                }
                if (info.active) {
                    queuedUrl = url;
                    return;
                }
                var isAppend = info.isAppend;
                if (info.isOnce) {
                    info.isAppend = !info.isAppend;
                    info.isOnce = false;
                }
                info.active = true;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                ExtendedDirectiveHandlers.FetchLoad(element, ((url === '::reload::') ? info.url : url), isAppend, function () {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    if (url === '::unload::') {
                        return;
                    }
                    info.isLoaded = true;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'isLoaded', scope);
                    Object.keys(scope.callbacks).forEach(function (key) { return scope.callbacks[key].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, true); }); });
                    element.dispatchEvent(new CustomEvent("xhr.load"));
                    if (queuedUrl) {
                        load(queuedUrl);
                        queuedUrl = null;
                    }
                }, function (err) {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    element.dispatchEvent(new CustomEvent("xhr.error", {
                        detail: { error: err }
                    }));
                    if (queuedUrl) {
                        load(queuedUrl);
                        queuedUrl = null;
                    }
                }, function (e) {
                    if (e.lengthComputable) {
                        var progress = ((e.loaded / e.total) * 100);
                        if (progress != info.progress) {
                            info.progress = progress;
                            ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'progress', scope);
                        }
                    }
                });
            };
            var elementScope = region.AddElement(element, true);
            var scope = ExtendedDirectiveHandlers.AddScope('xhr', elementScope, ['onLoad']);
            region.GetState().TrapGetAccess(function () {
                var url = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), reload = false;
                if (typeof url !== 'string') {
                    return;
                }
                if (url.startsWith('::reload::')) {
                    reload = true;
                    url = (url.substr(10) || info.url);
                }
                if (reload || url !== info.url) {
                    if (url.startsWith('::append::')) {
                        info.isAppend = info.isOnce = true;
                        url = url.substr(10);
                    }
                    load(url);
                    info.url = url;
                }
                else if (url !== '::unload::') {
                    element.dispatchEvent(new CustomEvent("xhr.reload"));
                }
            }, true, element);
            elementScope.locals['$xhr'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info) {
                    if (prop === 'isLoaded' || prop === 'active' || prop === 'progress') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    }
                    return info[prop];
                }
                if (prop in scope.callbacks) {
                    return function (callback) { return scope.callbacks[prop].push(callback); };
                }
            }, __spreadArrays(Object.keys(info), Object.keys(scope.callbacks)));
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.LazyLoad = function (region, element, directive) {
            var options = ExtendedDirectiveHandlers.GetIntersectionOptions(region, element, directive.value);
            var url = (('url' in options) ? options['url'] : (('original' in options) ? options['original'] : null));
            if (!url || typeof url !== 'string') { //Ignore
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var elementScope = region.AddElement(element, true);
            var scope = ExtendedDirectiveHandlers.AddScope('xhr', elementScope, ['onLoad']);
            var regionId = region.GetId(), info = {
                isLoaded: false
            };
            ExtendedDirectiveHandlers.ObserveIntersection(region, element, options, function (entry) {
                if ((!(entry instanceof IntersectionObserverEntry) || !entry.isIntersecting) && entry !== false) {
                    return true;
                }
                ExtendedDirectiveHandlers.FetchLoad(element, url, false, function () {
                    info.isLoaded = true;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'isLoaded', scope);
                    Object.keys(scope.callbacks).forEach(function (key) { return scope.callbacks[key].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, true); }); });
                    element.dispatchEvent(new CustomEvent("xhr.load"));
                }, function (err) {
                    element.dispatchEvent(new CustomEvent("xhr.error", {
                        detail: { error: err }
                    }));
                });
                return false;
            });
            elementScope.locals['$lazyLoad'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info) {
                    if (prop === 'isLoaded') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    }
                    return info[prop];
                }
                if (prop in scope.callbacks) {
                    return function (callback) { return scope.callbacks[prop].push(callback); };
                }
            }, __spreadArrays(Object.keys(info), Object.keys(scope.callbacks)));
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Intersection = function (region, element, directive) {
            var regionId = region.GetId(), info = {
                ratio: 0,
                visible: false,
                supported: true,
                stopped: false
            };
            ExtendedDirectiveHandlers.ObserveIntersection(region, element, ExtendedDirectiveHandlers.GetIntersectionOptions(region, element, directive.value), function (entry) {
                if (info.stopped) {
                    return false;
                }
                if (entry instanceof IntersectionObserverEntry) {
                    var myRegion = InlineJS.Region.Get(regionId);
                    if (entry.isIntersecting != info.visible) { //Visibility changed
                        info.visible = entry.isIntersecting;
                        myRegion.GetChanges().Add({
                            regionId: regionId,
                            type: 'set',
                            path: scope.path + ".visible",
                            prop: 'visible',
                            origin: myRegion.GetChanges().GetOrigin()
                        });
                        scope.callbacks['onVisibilityChange'].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, info.visible); });
                        element.dispatchEvent(new CustomEvent("intersection.visibility.change", { detail: info.visible }));
                        element.dispatchEvent(new CustomEvent(info.visible ? 'intersection.visible' : 'intersection.hidden'));
                    }
                    if (entry.intersectionRatio != info.ratio) {
                        info.ratio = entry.intersectionRatio;
                        InlineJS.Region.Get(regionId).GetChanges().Add({
                            regionId: regionId,
                            type: 'set',
                            path: scope.path + ".ratio",
                            prop: 'ratio',
                            origin: myRegion.GetChanges().GetOrigin()
                        });
                        scope.callbacks['onRatioChange'].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, info.ratio); });
                        element.dispatchEvent(new CustomEvent("intersection.ratio.change", { detail: info.ratio }));
                    }
                }
                else { //Not supported
                    info.supported = false;
                }
                return true;
            });
            var elementScope = region.AddElement(element, true);
            var scope = ExtendedDirectiveHandlers.AddScope('intersection', elementScope, ['onVisibilityChange', 'onRatioChange']);
            elementScope.locals['$intersection'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info) {
                    if (prop === 'ratio' || prop === 'visible') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    }
                    return info[prop];
                }
                if (prop in scope.callbacks) {
                    return function (callback) { return scope.callbacks[prop].push(callback); };
                }
            }, __spreadArrays(Object.keys(info), Object.keys(scope.callbacks)));
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Busy = function (region, element, directive) {
            var elementScope = region.AddElement(element, true), scope = ExtendedDirectiveHandlers.AddScope('busy', elementScope, []), shouldDisable = (directive.arg.options.includes('disable'));
            var options = (InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value) || {}), regionId = region.GetId(), info = {
                active: false,
                enable: function () {
                    return info.setActiveState(true);
                },
                disable: function () {
                    return info.setActiveState(false);
                },
                setActiveState: function (state) {
                    if (info.active == state) {
                        return false;
                    }
                    info.active = state;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    if (shouldDisable && info.active) {
                        element.setAttribute('disabled', 'disabled');
                    }
                    else if (shouldDisable) {
                        element.removeAttribute('disabled');
                    }
                    window.dispatchEvent(new CustomEvent("busy." + options.key, {
                        detail: { active: info.active, source: element }
                    }));
                    return true;
                },
                handleEvent: function (e) {
                    if (!info.disable()) { //Already disabled
                        e.preventDefault();
                    }
                }
            };
            options.key = (options.key || elementScope.key);
            (options.events || ((element instanceof HTMLFormElement) ? ['submit'] : ['click', 'keydown.enter'])).forEach(function (e) {
                InlineJS.CoreDirectiveHandlers.On(region, element, InlineJS.Processor.GetDirectiveWith("x-on:" + e, '$busy.handleEvent($event)'));
            });
            window.addEventListener("busy." + options.key, function (e) {
                if (e.detail.source !== element) {
                    info.setActiveState(e.detail.active);
                }
            });
            elementScope.locals['$busy'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info) {
                    if (prop === 'active') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    }
                    return info[prop];
                }
            }, Object.keys(info));
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.ActiveGroup = function (region, element, directive) {
            var options = (InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value) || {}), name = (options.key ? "activeGroup." + options.key : 'activeGroup');
            if (InlineJS.Region.GetGlobal(null, "$" + name)) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var elementScope = region.AddElement(element, true);
            var scope = ExtendedDirectiveHandlers.AddScope('activeGroup', elementScope, []), regionId = region.GetId(), count = 0, setCount = function (value) {
                count = value;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'count', scope);
            };
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'count') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return count;
                }
                if (prop === 'active') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".count");
                    return (0 < count);
                }
                if (prop === 'setCount') {
                    return function (value) {
                        setCount((value < 0) ? 0 : value);
                    };
                }
                if (prop === 'offsetCount') {
                    return function (value) {
                        var newCount = (count += value);
                        setCount((newCount < 0) ? 0 : newCount);
                    };
                }
            }, ['count', 'active', 'setCount', 'offsetCount']);
            elementScope.locals['$activeGroup'] = proxy;
            InlineJS.Region.AddGlobal("$" + name, function () { return proxy; });
            if (!InlineJS.Region.GetGlobal(null, '$activeGroup')) {
                InlineJS.Region.AddGlobal('$activeGroup', function () {
                    return function (key) { return InlineJS.Region.GetGlobalValue(null, "activeGroup." + key); };
                });
            }
            var update = function (key, state, isInitial) {
                var proxy = InlineJS.Region.GetGlobalValue(null, (key ? "$activeGroup." + key : '$activeGroup'));
                if (proxy) {
                    proxy.offsetCount(state ? 1 : (isInitial ? 0 : -1));
                }
            };
            var trapExpression = function (innerRegion, innerElement, expression, key) {
                var innerRegionId = innerRegion.GetId(), previousValue = null;
                innerRegion.GetState().TrapGetAccess(function () {
                    var value = !!InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(innerRegionId), innerElement, expression);
                    if (value !== previousValue) {
                        update(key, value, (previousValue === null));
                        previousValue = value;
                    }
                }, true, innerElement);
            };
            if (!InlineJS.DirectiveHandlerManager.GetHandler('activeGroupBind')) {
                InlineJS.DirectiveHandlerManager.AddHandler('activeGroupBind', function (innerRegion, innerElement, innerDirective) {
                    trapExpression(innerRegion, innerElement, innerDirective.value, null);
                    return InlineJS.DirectiveHandlerReturn.Handled;
                });
            }
            if (!InlineJS.DirectiveHandlerManager.GetHandler('activeGroupBindFor')) {
                InlineJS.DirectiveHandlerManager.AddHandler('activeGroupBindFor', function (innerRegion, innerElement, innerDirective) {
                    var innerOptions = (InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value) || {});
                    if (!innerOptions.expression) {
                        return InlineJS.DirectiveHandlerReturn.Nil;
                    }
                    trapExpression(innerRegion, innerElement, innerOptions.expression, innerOptions.key);
                    return InlineJS.DirectiveHandlerReturn.Handled;
                });
            }
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Router = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$router')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var options = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), uid = 0;
            if (!InlineJS.Region.IsObject(options)) {
                options = {};
            }
            var hooks = {
                beforeLoad: [],
                afterLoad: []
            };
            var regionId = region.GetId(), origin = location.origin, pathname = location.pathname, query = location.search.substr(1), alertable = ['url', 'currentPage', 'currentQuery', 'targetUrl', 'active', 'progress'], info = {
                currentPage: null,
                currentQuery: '',
                pages: [],
                url: null,
                targetUrl: null,
                mount: null,
                mountElement: null,
                middlewares: {},
                active: false,
                progress: 0
            }, methods = {
                register: function (data) {
                    var innerRegion = InlineJS.Region.Get(InlineJS.RegionMap.scopeRegionIds.Peek());
                    if (innerRegion) {
                        register(data.page, (data.name || ''), (data.path || ((typeof data.page === 'string') ? data.page : null)), data.title, innerRegion.GetComponentKey(), (data.entry || 'open'), (data.exit || 'close'), !!data.disabled, data.middlewares, data.uid);
                    }
                },
                unregister: function (uid) {
                    for (var i = 0; i < info.pages.length; ++i) {
                        if (info.pages[i].uid == uid) {
                            info.pages.splice(i, 1);
                            break;
                        }
                    }
                },
                disable: function (uid, disabled) {
                    if (disabled === void 0) { disabled = true; }
                    for (var i = 0; i < info.pages.length; ++i) {
                        if (info.pages[i].uid == uid) {
                            info.pages[i].disabled = disabled;
                            break;
                        }
                    }
                },
                goto: function (page, args) { goto(page, args); },
                redirect: function (page, args) { goto(page, args, true); },
                reload: function () {
                    window.dispatchEvent(new CustomEvent('router.reload'));
                    if (info.mount) {
                        info.mount(info.url);
                    }
                },
                back: function () { back(); },
                addMiddleware: function (name, handler) {
                    info.middlewares[name] = handler;
                },
                parseQuery: function (query) { return parseQuery(query); },
                setTitle: function (title) {
                    document.title = "" + (options.titlePrefix || '') + (title || 'Untitled') + (options.titleSuffix || '');
                },
                addHook: function (key, handler) {
                    if (key in hooks) {
                        hooks[key].push(handler);
                    }
                }
            };
            if (options.urlPrefix) {
                options.urlPrefix += '/';
            }
            else { //Empty
                options.urlPrefix = '';
            }
            var scope = ExtendedDirectiveHandlers.AddScope('router', region.AddElement(element, true), Object.keys(methods));
            var register = function (page, name, path, title, component, entry, exit, disabled, middlewares, uid) {
                if (typeof page === 'string' && page.length > 1 && page.startsWith('/')) {
                    page = page.substr(1);
                }
                if (path && path.length > 1 && path.startsWith('/')) {
                    path = path.substr(1);
                }
                info.pages.push({
                    pattern: page,
                    name: name,
                    path: path,
                    title: title,
                    component: component,
                    entry: entry,
                    exit: exit,
                    disabled: disabled,
                    middlewares: ((middlewares && Array.isArray(middlewares)) ? middlewares : new Array()),
                    uid: uid
                });
            };
            var goto = function (page, query, replace, onReload) {
                if (replace === void 0) { replace = false; }
                page = page.trim();
                query = (query || '').trim();
                if (page.startsWith(origin + "/")) {
                    page = (page.substr(origin.length + 1) || '/');
                }
                else if (page.length > 1 && page.startsWith('/')) {
                    page = page.substr(1);
                }
                query = (query || '');
                if (query && query.substr(0, 1) !== '?') {
                    query = "?" + query;
                }
                load(page, query, function (title, path) {
                    document.title = "" + (options.titlePrefix || '') + (title || 'Untitled') + (options.titleSuffix || '');
                    if (replace) {
                        history.replaceState({
                            page: page,
                            query: query
                        }, title, buildHistoryPath(path, query));
                    }
                    else {
                        history.pushState({
                            page: page,
                            query: query
                        }, title, buildHistoryPath(path, query));
                    }
                }, onReload);
            };
            var back = function () {
                if (info.currentPage && info.currentPage !== '/') {
                    history.back();
                    return true;
                }
                return false;
            };
            var load = function (page, query, callback, onReload) {
                var myRegion = InlineJS.Region.Get(regionId);
                if (info.currentPage && info.currentPage !== '/') {
                    var currentPageInfo = findPage(info.currentPage);
                    if (currentPageInfo) {
                        unload(currentPageInfo.component, currentPageInfo.exit);
                    }
                }
                if (info.currentPage !== page) {
                    info.currentPage = page;
                    ExtendedDirectiveHandlers.Alert(myRegion, 'currentPage', scope);
                }
                if (info.currentQuery !== query) {
                    info.currentQuery = query;
                    ExtendedDirectiveHandlers.Alert(myRegion, 'currentQuery', scope);
                }
                var pageInfo = findPage(page), prevented = false;
                hooks.beforeLoad.forEach(function (handler) {
                    if (handler(pageInfo, page, query) === false) {
                        prevented = true;
                    }
                });
                if (prevented) {
                    return;
                }
                if (!pageInfo || pageInfo.disabled) { //Not found
                    var targetUrl = buildPath(page, query), isReload = (targetUrl === info.targetUrl);
                    if (!isReload) {
                        info.targetUrl = targetUrl;
                        ExtendedDirectiveHandlers.Alert(myRegion, 'targetUrl', scope);
                    }
                    var url = buildPath('404', null);
                    if (url !== info.url) {
                        info.url = url;
                        ExtendedDirectiveHandlers.Alert(myRegion, 'url', scope);
                        if (info.mount) {
                            info.mount(url);
                        }
                    }
                    if (isReload) {
                        window.dispatchEvent(new CustomEvent('router.reload'));
                        if (onReload && !onReload()) {
                            return;
                        }
                    }
                    window.dispatchEvent(new CustomEvent('router.404', { detail: page }));
                    if (callback) {
                        callback('Page Not Found', page);
                    }
                    window.dispatchEvent(new CustomEvent('router.load'));
                    hooks.afterLoad.forEach(function (handler) {
                        handler(pageInfo, page, query);
                    });
                    return;
                }
                var component = pageInfo.component, handled;
                for (var i = 0; i < (pageInfo.middlewares || []).length; ++i) {
                    var middleware = pageInfo.middlewares[i];
                    if (middleware in info.middlewares && !info.middlewares[middleware](page, query)) {
                        return; //Rejected
                    }
                }
                ;
                try {
                    if (component) {
                        handled = (InlineJS.Region.Find(component, true)[pageInfo.entry])(query);
                    }
                    else {
                        handled = false;
                    }
                }
                catch (err) {
                    handled = false;
                }
                if (handled === false) {
                    var url = buildPath((pageInfo.path || page), query);
                    if (url !== info.url) {
                        info.url = url;
                        ExtendedDirectiveHandlers.Alert(myRegion, 'url', scope);
                    }
                    if (url === info.targetUrl) {
                        window.dispatchEvent(new CustomEvent('router.reload'));
                        if (onReload && !onReload()) {
                            return;
                        }
                    }
                    else { //New target
                        info.targetUrl = url;
                        ExtendedDirectiveHandlers.Alert(myRegion, 'targetUrl', scope);
                    }
                    if (info.mount) {
                        info.mount(url);
                    }
                }
                if (callback) {
                    callback(pageInfo.title, (pageInfo.path || page));
                }
                window.dispatchEvent(new CustomEvent('router.load'));
                hooks.afterLoad.forEach(function (handler) {
                    handler(pageInfo, page, query);
                });
            };
            var unload = function (component, exit) {
                try {
                    (InlineJS.Region.Find(component, true)[exit])();
                }
                catch (err) { }
            };
            var parseQuery = function (query) {
                var params = {};
                if (query && query.startsWith('?')) {
                    query = query.substr(1);
                }
                if (!query) {
                    return params;
                }
                var match, search = /([^&=]+)=?([^&]*)/g;
                var decode = function (value) {
                    return decodeURIComponent(value.replace(/\+/g, ' '));
                };
                while (match = search.exec(query)) {
                    params[decode(match[1])] = decode(match[2]);
                }
                return params;
            };
            var findPage = function (page) {
                for (var _i = 0, _a = info.pages; _i < _a.length; _i++) {
                    var pageInfo = _a[_i];
                    var isString = (typeof pageInfo.pattern === 'string');
                    if ((isString && page === pageInfo.pattern) || (!isString && pageInfo.pattern.test(page))) {
                        return pageInfo;
                    }
                }
                return null;
            };
            var buildPath = function (path, query) {
                return origin + "/" + options.urlPrefix + ((path === '/') ? '' : path) + (query || '');
            };
            var buildHistoryPath = function (path, query) {
                return origin + "/" + ((path === '/') ? '' : path) + (query || '');
            };
            window.addEventListener('popstate', function (event) {
                if (event.state) {
                    load(event.state.page, event.state.query);
                }
            });
            InlineJS.DirectiveHandlerManager.AddHandler('routerMount', function (innerRegion, innerElement, innerDirective) {
                if (info.mount) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                info.mountElement = document.createElement('div');
                innerElement.parentElement.insertBefore(info.mountElement, innerElement);
                info.mountElement.classList.add('router-mount');
                var regions = new Array(), regionsCopy = null;
                InlineJS.Config.AddRegionHook(function (region, added) {
                    if (!added) {
                        regions.splice(regions.indexOf(region), 1);
                        if (regionsCopy) {
                            regionsCopy.splice(regionsCopy.indexOf(region), 1);
                        }
                    }
                    else if (info.mountElement.contains(region.GetRootElement())) {
                        regions.push(region);
                    }
                });
                var mount = function (url) {
                    info.active = true;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    if (info.progress != 0) {
                        info.progress = 0;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'progress', scope);
                    }
                    regionsCopy = regions;
                    regions = new Array();
                    ExtendedDirectiveHandlers.FetchLoad(info.mountElement, url, false, function () {
                        if (regionsCopy) {
                            regionsCopy.forEach(function (region) { return region.RemoveElement(region.GetRootElement()); });
                            regionsCopy = null;
                        }
                        info.active = false;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                        window.scrollTo({ top: -window.scrollY, left: 0 });
                        window.dispatchEvent(new CustomEvent('router.mount.load'));
                        InlineJS.Bootstrap.Reattach(info.mountElement);
                    }, function (err) {
                        info.active = false;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                        window.dispatchEvent(new CustomEvent("router.mount.error", {
                            detail: {
                                error: err,
                                mount: info.mountElement
                            }
                        }));
                    }, function (e) {
                        if (e.lengthComputable) {
                            var progress = ((e.loaded / e.total) * 100);
                            if (progress != info.progress) {
                                info.progress = progress;
                                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'progress', scope);
                            }
                        }
                    });
                };
                info.mount = mount;
                innerRegion.AddElement(innerElement).uninitCallbacks.push(function () {
                    if (info.mount === mount) {
                        info.mount = null;
                    }
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('routerRegister', function (innerRegion, innerElement, innerDirective) {
                var innerScope = innerRegion.AddElement(innerElement);
                if (!innerScope) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                var data = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value), innerUid = (data.uid || uid++);
                register(data.page, (data.name || ''), (data.path || ((typeof data.page === 'string') ? data.page : null)), data.title, innerRegion.GetComponentKey(), (data.entry || 'open'), (data.exit || 'close'), !!data.disabled, data.middlewares, data.uid);
                innerScope.uninitCallbacks.push(function () {
                    methods.unregister(uid);
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('routerLink', function (innerRegion, innerElement, innerDirective) {
                var innerRegionId = innerRegion.GetId(), target = innerElement, active = null, nav = (innerDirective.arg.options.indexOf('nav') != -1), path = innerDirective.value, query = '', onEvent = function () {
                    if (document.contains(innerElement)) {
                        if (active !== null && active == (info.currentPage === path)) {
                            return;
                        }
                        if (info.currentPage === path) {
                            active = true;
                            if (nav) {
                                innerElement.classList.add('router-active');
                            }
                        }
                        else {
                            active = false;
                            if (nav && innerElement.classList.contains('router-active')) {
                                innerElement.classList.remove('router-active');
                            }
                        }
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(innerRegionId), 'active', innerScope);
                        innerElement.dispatchEvent(new CustomEvent('router.active'));
                    }
                    else { //Removed from DOM
                        window.removeEventListener('router.load', onEvent);
                    }
                };
                var innerScope = ExtendedDirectiveHandlers.AddScope('router', innerRegion.AddElement(innerElement, true), []), reload = (innerDirective.arg.key === 'reload');
                if (path) { //Use specified path
                    var queryIndex = path.indexOf('?');
                    if (queryIndex != -1) { //Split
                        query = path.substr(queryIndex + 1);
                        path = path.substr(0, queryIndex);
                    }
                }
                else if (!(innerElement instanceof HTMLFormElement) && !(innerElement instanceof HTMLAnchorElement)) { //Resolve path
                    target = (innerElement.querySelector('a') || innerElement.querySelector('form') || innerElement);
                }
                window.addEventListener('router.load', onEvent);
                if (target instanceof HTMLFormElement) {
                    if (target.method && target.method.toLowerCase() !== 'get' && target.method.toLowerCase() !== 'head') {
                        return InlineJS.DirectiveHandlerReturn.Nil;
                    }
                    target.addEventListener('submit', function (e) {
                        e.preventDefault();
                        var data = new FormData(target), thisPath = target.action, thisQuery = '';
                        if (!path) { //Compute path
                            var queryIndex = thisPath.indexOf('?');
                            if (queryIndex != -1) { //Split
                                thisQuery = thisPath.substr(queryIndex + 1);
                                thisPath = thisPath.substr(0, queryIndex);
                            }
                        }
                        else { //Use specified path
                            thisPath = path;
                            thisQuery = query;
                        }
                        data.forEach(function (value, key) {
                            if (thisQuery) {
                                thisQuery = thisQuery + "&" + key + "=" + value.toString();
                            }
                            else {
                                thisQuery = key + "=" + value.toString();
                            }
                        });
                        goto(thisPath, thisQuery);
                    });
                    return InlineJS.DirectiveHandlerReturn.Handled;
                }
                target.addEventListener('click', function (e) {
                    e.preventDefault();
                    var thisPath = path, thisQuery = query;
                    if (!path && target instanceof HTMLAnchorElement) { //Compute path
                        thisPath = target.href;
                        thisQuery = '';
                        var queryIndex = thisPath.indexOf('?');
                        if (queryIndex != -1) { //Split
                            thisQuery = thisPath.substr(queryIndex + 1);
                            thisPath = thisPath.substr(0, queryIndex);
                        }
                    }
                    goto(thisPath, thisQuery, false, function () {
                        if (!reload) { //Scroll top
                            window.scrollTo({ top: -window.scrollY, left: 0, behavior: 'smooth' });
                            return false;
                        }
                        return true;
                    });
                });
                var innerProxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                    if (prop === 'active') {
                        InlineJS.Region.Get(innerRegionId).GetChanges().AddGetAccess(innerScope.path + "." + prop);
                        return active;
                    }
                    return proxy[prop];
                }, __spreadArrays(['active'], Object.keys(info), Object.keys(methods)));
                innerRegion.AddLocal(innerElement, '$router', function () { return innerProxy; });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('routerBack', function (innerRegion, innerElement, innerDirective) {
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    back();
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('routerFullPage', function (innerRegion, innerElement, innerDirective) {
                var innerScope = innerRegion.AddElement(innerElement);
                if (!innerScope) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                innerScope.uninitCallbacks.push(function () {
                    if (info.mountElement && info.mountElement.classList.contains('full-page')) {
                        info.mountElement.classList.remove('full-page');
                    }
                });
                if (info.mountElement) {
                    info.mountElement.classList.add('full-page');
                }
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info) {
                    if (alertable.indexOf(prop) != -1) {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    }
                    return info[prop];
                }
                if (prop in methods) {
                    return methods[prop];
                }
            }, __spreadArrays(Object.keys(info), Object.keys(methods)));
            InlineJS.Region.AddGlobal('$router', function () { return proxy; });
            InlineJS.Region.AddPostProcessCallback(function () {
                goto(((pathname.length > 1 && pathname.startsWith('/')) ? pathname.substr(1) : pathname), query);
            });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Page = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$page')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var reset = function () {
                Object.keys(entries).forEach(function (key) { return ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), key, scope.path + ".entries"); });
                entries = {};
            };
            var scope = ExtendedDirectiveHandlers.AddScope('page', region.AddElement(element, true), []), regionId = region.GetId(), entries = {};
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'title') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return title;
                }
                if (prop === 'location') {
                    return window.location;
                }
                if (prop === 'reset') {
                    return reset;
                }
                InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".entries." + prop);
                return entries[prop];
            }, ['$title', '$location', 'reset'], function (target, prop, value) {
                if (prop.toString() === 'title') {
                    if (router) {
                        router.setTitle(value);
                    }
                    else if (value !== title) {
                        document.title = title = value;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'title', scope);
                    }
                }
                else {
                    entries[prop] = value;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), prop.toString(), scope.path + ".entries");
                }
                return true;
            });
            InlineJS.Region.AddGlobal('$page', function () { return proxy; });
            window.addEventListener('router.load', reset);
            var router = InlineJS.Region.GetGlobalValue(regionId, '$router');
            var title = document.title, observer = new MutationObserver(function (mutations) {
                if (!router && title !== mutations[0].target.nodeValue) {
                    title = mutations[0].target.nodeValue;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'title', scope);
                }
            });
            var titleDOM = document.querySelector('title');
            if (!titleDOM) {
                titleDOM = document.createElement('title');
                document.head.append(titleDOM);
            }
            observer.observe(titleDOM, {
                subtree: true,
                characterData: true,
                childList: true
            });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Screen = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$screen')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var computeBreakpoint = function (width) {
                if (width < 576) { //Extra small
                    return ['xs', 0];
                }
                if (width < 768) { //Small
                    return ['sm', 1];
                }
                if (width < 992) { //Medium
                    return ['md', 2];
                }
                if (width < 1200) { //Large
                    return ['lg', 3];
                }
                if (width < 1400) { //Extra large
                    return ['xl', 4];
                }
                return ['xxl', 5]; //Extra extra large
            };
            var size = {
                width: window.innerWidth,
                height: window.innerHeight
            }, breakpoint = computeBreakpoint(window.innerWidth), regionId = region.GetId();
            var resizeCheckpoint = 0;
            window.addEventListener('resize', function () {
                var myCheckpoint = ++resizeCheckpoint;
                setTimeout(function () {
                    if (myCheckpoint != resizeCheckpoint) { //Debounced
                        return;
                    }
                    size.width = window.innerWidth;
                    size.height = window.innerHeight;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'size', scope);
                    var thisBreakpoint = computeBreakpoint(window.innerWidth);
                    if (thisBreakpoint[0] !== breakpoint[0]) {
                        breakpoint = thisBreakpoint;
                        window.dispatchEvent(new CustomEvent('screen.breakpoint', {
                            detail: breakpoint[0]
                        }));
                        window.dispatchEvent(new CustomEvent('screen.checkpoint', {
                            detail: breakpoint[1]
                        }));
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'breakpoint', scope);
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'checkpoint', scope);
                    }
                }, 250);
            }, { passive: true });
            var getScrollPosition = function () {
                return {
                    x: (window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0),
                    y: (window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0)
                };
            };
            var scrollCheckpoint = 0, position = getScrollPosition(), percentage = {
                x: ((document.body.scrollWidth <= 0) ? 0 : ((position.x / document.body.scrollWidth) * 100)),
                y: ((document.body.scrollHeight <= 0) ? 0 : ((position.y / document.body.scrollHeight) * 100))
            };
            if (directive.arg.key === 'realtime') {
                var handleScroll_1 = function () {
                    var myPosition = getScrollPosition();
                    if (myPosition.x != position.x || myPosition.y != position.y) {
                        var offset = {
                            x: ((document.documentElement.scrollWidth || document.body.scrollWidth) - (document.documentElement.clientWidth || document.body.clientWidth)),
                            y: ((document.documentElement.scrollHeight || document.body.scrollHeight) - (document.documentElement.clientHeight || document.body.clientHeight))
                        };
                        position = myPosition;
                        percentage = {
                            x: ((offset.x <= 0) ? 0 : ((position.x / offset.x) * 100)),
                            y: ((offset.y <= 0) ? 0 : ((position.y / offset.y) * 100))
                        };
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'position', scope);
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'percentage', scope);
                    }
                };
                var debounceIndex_1 = directive.arg.options.indexOf('debounce');
                if (debounceIndex_1 != -1) {
                    window.addEventListener('scroll', function () {
                        var myCheckpoint = ++scrollCheckpoint;
                        setTimeout(function () {
                            if (myCheckpoint == scrollCheckpoint) { //Debounced
                                handleScroll_1();
                            }
                        }, (parseInt(directive.arg.options[debounceIndex_1 + 1]) || 250));
                    }, { passive: true });
                }
                else {
                    window.addEventListener('scroll', handleScroll_1, { passive: true });
                }
            }
            var scroll = function (from, to, animate, animateOptions) {
                if (animate === void 0) { animate = false; }
                var myPosition = getScrollPosition();
                if (from.x < 0) {
                    from.x = myPosition.x;
                }
                if (to.x < 0) {
                    to.x = myPosition.x;
                }
                if (from.y < 0) {
                    from.y = myPosition.y;
                }
                if (to.y < 0) {
                    to.y = myPosition.y;
                }
                var animator = InlineJS.CoreDirectiveHandlers.GetAnimator(region, animate, function (step) {
                    window.scrollTo((((to.x - from.x) * step) + from.x), (((to.y - from.y) * step) + from.y));
                }, animateOptions, false);
                if (animator) {
                    animator(true);
                }
                else {
                    window.scrollTo(from.x, from.y);
                }
            };
            var scope = ExtendedDirectiveHandlers.AddScope('screen', region.AddElement(element, true), []);
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'size') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return size;
                }
                if (prop === 'breakpoint') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return breakpoint[0];
                }
                if (prop === 'checkpoint') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return breakpoint[1];
                }
                if (prop === 'scrollOffset' || prop === 'position') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".position");
                    return position;
                }
                if (prop === 'scrollPercentage') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".percentage");
                    return percentage;
                }
                if (prop === 'getScrollOffset' || prop === 'getPosition') {
                    return getScrollPosition;
                }
                if (prop === 'getScrollPercentage') {
                    return function () {
                        var myPosition = getScrollPosition();
                        return {
                            x: ((document.body.scrollWidth <= 0) ? 0 : ((myPosition.x / document.body.scrollWidth) * 100)),
                            y: ((document.body.scrollHeight <= 0) ? 0 : ((myPosition.y / document.body.scrollHeight) * 100))
                        };
                    };
                }
                if (prop === 'scroll') {
                    return scroll;
                }
                if (prop === 'scrollTo') {
                    return function (to, animate, animateOptions) {
                        if (animate === void 0) { animate = false; }
                        scroll({ x: -1, y: -1 }, to, animate, animateOptions);
                    };
                }
                if (prop === 'scrollTop') {
                    return function (animate, animateOptions) {
                        if (animate === void 0) { animate = false; }
                        scroll({ x: -1, y: -1 }, { x: -1, y: 0 }, animate, animateOptions);
                    };
                }
                if (prop === 'scrollBottom') {
                    return function (animate, animateOptions) {
                        if (animate === void 0) { animate = false; }
                        scroll({ x: -1, y: -1 }, { x: -1, y: document.body.scrollHeight }, animate, animateOptions);
                    };
                }
                if (prop === 'scrollLeft') {
                    return function (animate, animateOptions) {
                        if (animate === void 0) { animate = false; }
                        scroll({ x: -1, y: -1 }, { x: 0, y: -1 }, animate, animateOptions);
                    };
                }
                if (prop === 'scrollRight') {
                    return function (animate, animateOptions) {
                        if (animate === void 0) { animate = false; }
                        scroll({ x: -1, y: -1 }, { x: document.body.scrollWidth, y: -1 }, animate, animateOptions);
                    };
                }
            }, ['size', 'breakpoint', 'checkpoint', 'scrollOffset', 'position', 'scrollPercentage', 'getScrollOffset', 'getPosition', 'getScrollPercentage', 'scroll']);
            InlineJS.Region.AddGlobal('$screen', function () { return proxy; });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Cart = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$cart')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var handlers = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (!handlers) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            if (!handlers.load) {
                handlers.load = function () {
                    var checked = InlineJS.Region.GetGlobalValue(regionId, '$auth').check(), setItems = function (items) {
                        items = (items || []);
                        info.items = items;
                        info.products = [];
                        items.forEach(function (item) { return info.products.push(item.product); });
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'products', scope);
                        computeValues();
                        (updatesQueue || []).forEach(function (callback) {
                            try {
                                callback();
                            }
                            catch (err) { }
                        });
                        updatesQueue = null;
                    };
                    if (checked && handlers.loadLink) {
                        fetch(handlers.loadLink, {
                            method: 'GET',
                            credentials: 'same-origin'
                        }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(function (data) { return setItems(data.items); })["catch"](function (err) {
                            ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        });
                    }
                    else if (!checked && handlers.db) {
                        handlers.db.read('cart', setItems);
                    }
                };
            }
            var hasNew = false, alertHasNew = function () {
                hasNew = true;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'hasNew', scope);
                InlineJS.Region.GetGlobalValue(regionId, '$nextTick')(function () {
                    hasNew = false;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'hasNew', scope);
                });
            };
            if (!handlers.update) {
                handlers.update = function (sku, quantity, incremental, callback) {
                    if (!InlineJS.Region.GetGlobalValue(regionId, '$auth').check()) {
                        if (sku === null && !incremental) { //Clear
                            if (info.items.length == 0) {
                                return;
                            }
                            info.items = [];
                            info.products = [];
                            ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                            ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'products', scope);
                            computeValues();
                            if (handlers.db) { //Save to DB
                                handlers.db.write(info.items, 'cart', function (state) { });
                            }
                            return;
                        }
                        var computeQuantity = function (itemQuantity) {
                            var computed = (incremental ? (itemQuantity + quantity) : quantity);
                            return ((computed < 0) ? 0 : computed);
                        };
                        var doUpdate_1 = function (item, myQuantity) {
                            if (myQuantity == item.quantity) { //No changes
                                return;
                            }
                            if (item.quantity < myQuantity) {
                                alertHasNew();
                            }
                            item.quantity = myQuantity;
                            ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), "items." + item.product.sku + ".quantity", scope);
                            if (item.quantity <= 0) { //Remove from list
                                var index = info.items.findIndex(function (infoItem) { return (infoItem.product.sku === item.product.sku); });
                                if (index == -1) {
                                    return;
                                }
                                info.items.splice(index, 1);
                                info.products.splice(index, 1);
                                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), index + ".1.0", scope.path + ".items.splice", scope.path + ".items");
                                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), index + ".1.0", scope.path + ".products.splice", scope.path + ".products");
                                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'products', scope);
                            }
                            if (handlers.db) { //Save to DB
                                handlers.db.write(info.items, 'cart', function (state) {
                                    if (state && callback) {
                                        callback(item);
                                    }
                                });
                            }
                            else if (callback) {
                                callback(item);
                            }
                        };
                        var item = info.items.find(function (infoItem) { return (infoItem.product.sku === sku); });
                        if (!item) {
                            if (!handlers.productLink) {
                                return;
                            }
                            var computedQuantity_1 = computeQuantity(0);
                            if (computedQuantity_1 == 0) { //No changes
                                return;
                            }
                            fetch(handlers.productLink + "/" + sku, {
                                method: 'GET',
                                credentials: 'same-origin'
                            }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(function (data) {
                                var newItem = {
                                    price: (data.price || data.product.price),
                                    quantity: 0,
                                    product: data.product
                                };
                                info.items.unshift(newItem);
                                info.products.unshift(newItem.product);
                                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), '1', scope.path + ".items.unshift", scope.path + ".items");
                                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), '1', scope.path + ".products.unshift", scope.path + ".products");
                                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'products', scope);
                                doUpdate_1(newItem, computedQuantity_1);
                            })["catch"](function (err) {
                                ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                            });
                        }
                        else {
                            doUpdate_1(item, computeQuantity(item.quantity));
                        }
                    }
                    else if (handlers.updateLink) {
                        fetch(handlers.updateLink + "/" + sku + "?quantity=" + quantity + "&incremental=" + incremental, {
                            method: 'GET',
                            credentials: 'same-origin'
                        }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(function (data) {
                            if (data.quantity <= 0) {
                                var index = info.items.findIndex(function (infoItem) { return (infoItem.product.sku === sku); });
                                if (index != -1) { //Remove from list
                                    info.items.splice(index, 1);
                                    info.products.splice(index, 1);
                                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), index + ".1.0", scope.path + ".items.splice", scope.path + ".items");
                                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), index + ".1.0", scope.path + ".products.splice", scope.path + ".products");
                                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'products', scope);
                                }
                                return;
                            }
                            callback({
                                price: (data.price || data.product.price),
                                quantity: data.quantity,
                                product: data.product
                            });
                        })["catch"](function (err) {
                            ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        });
                    }
                };
            }
            var scope = ExtendedDirectiveHandlers.AddScope('cart', region.AddElement(element, true), []), regionId = region.GetId(), updatesQueue = null;
            var info = {
                items: new Array(),
                products: new Array(),
                count: 0,
                total: 0
            };
            var computeValues = function () {
                var count = 0, total = 0;
                info.items.forEach(function (item) {
                    count += item.quantity;
                    total += (item.price * item.quantity);
                });
                if (count != info.count) {
                    info.count = count;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'count', scope);
                }
                if (total != info.total) {
                    info.total = total;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'total', scope);
                }
            };
            var postUpdate = function (item) {
                if (ExtendedDirectiveHandlers.Report(regionId, item) || !item) {
                    return;
                }
                var existing = info.items.find(function (infoItem) { return (infoItem.product.sku == item.product.sku); });
                if (existing) { //Update exisiting
                    if (existing.quantity != item.quantity) {
                        existing.quantity = item.quantity;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), "items." + existing.product.sku + ".quantity", scope);
                    }
                    if ((item.price || item.price === 0) && existing.price != item.price) {
                        existing.price = item.price;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), "items." + existing.product.sku + ".price", scope);
                    }
                }
                else if (0 < item.quantity) { //Add new
                    info.items.unshift(item);
                    info.products.unshift(item.product);
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), '1', scope.path + ".items.unshift", scope.path + ".items");
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), '1', scope.path + ".products.unshift", scope.path + ".products");
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'products', scope);
                    alertHasNew();
                }
                computeValues();
            };
            var update = function (sku, quantity, incremental) {
                if (updatesQueue) { //Defer
                    updatesQueue.push(function () {
                        update(sku, quantity, incremental);
                    });
                }
                else {
                    handlers.update(sku, quantity, incremental, postUpdate);
                }
            };
            var clear = function () { return update(null, 0, false); };
            var createListProxy = function (key) {
                return InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                    if (prop === '__InlineJS_Target__') {
                        return info[key];
                    }
                    if (prop === '__InlineJS_Path__') {
                        return scope.path + "." + key;
                    }
                    return info[key][prop];
                }, ['__InlineJS_Target__', '__InlineJS_Path__'], null, []);
            };
            var itemsProxy = createListProxy('items'), productsProxy = createListProxy('products');
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info) {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    if (prop === 'items') {
                        return itemsProxy;
                    }
                    if (prop === 'products') {
                        return productsProxy;
                    }
                    return info[prop];
                }
                if (prop === 'hasNew') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return hasNew;
                }
                if (prop === 'update') {
                    return update;
                }
                if (prop === 'clear') {
                    return clear;
                }
                if (prop === 'contains') {
                    return function (sku) {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items");
                        return (info.items.findIndex(function (item) { return (item.product.sku === sku); }) != -1);
                    };
                }
                if (prop === 'get') {
                    return function (sku) {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items");
                        return info.items.find(function (item) { return (item.product.sku === sku); });
                    };
                }
                if (prop === 'getQuantity') {
                    return function (sku) {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items." + sku + ".quantity");
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items");
                        var item = info.items.find(function (item) { return (item.product.sku === sku); });
                        return (item ? item.quantity : 0);
                    };
                }
                if (prop === 'getPrice') {
                    return function (sku) {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items." + sku + ".price");
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items");
                        var item = info.items.find(function (item) { return (item.product.sku === sku); });
                        return (item ? item.price : 0);
                    };
                }
            }, __spreadArrays(Object.keys(info), ['hasNew', 'update', 'clear', 'contains', 'get', 'getQuantity', 'getPrice']));
            InlineJS.Region.AddGlobal('$cart', function () { return proxy; });
            InlineJS.DirectiveHandlerManager.AddHandler('cartClear', function (innerRegion, innerElement, innerDirective) {
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    clear();
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('cartUpdate', function (innerRegion, innerElement, innerDirective) {
                var form = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, '$form');
                if (!form || !(form instanceof HTMLFormElement)) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                var sku = '';
                innerRegion.GetState().TrapGetAccess(function () {
                    sku = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                }, true, innerElement);
                if (!sku) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    update(sku, parseInt(form.elements.namedItem('cart-value').value), false);
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('cartIncrement', function (innerRegion, innerElement, innerDirective) {
                var sku = '';
                innerRegion.GetState().TrapGetAccess(function () {
                    sku = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                }, true, innerElement);
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    update(sku, 1, true);
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('cartDecrement', function (innerRegion, innerElement, innerDirective) {
                var sku = '';
                innerRegion.GetState().TrapGetAccess(function () {
                    sku = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                }, true, innerElement);
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    update(sku, -1, true);
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('cartRemove', function (innerRegion, innerElement, innerDirective) {
                var sku = '';
                innerRegion.GetState().TrapGetAccess(function () {
                    sku = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                }, true, innerElement);
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    update(sku, 0, false);
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            if (handlers.init) {
                handlers.init();
            }
            updatesQueue = new Array();
            handlers.load();
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.DB = function (region, element, directive) {
            var data = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (typeof data === 'string') {
                data = {
                    name: data
                };
            }
            if (!InlineJS.Region.IsObject(data) || !data.name) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var options;
            if ('__InlineJS_Target__' in data) {
                options = data['__InlineJS_Target__'];
            }
            else { //Raw data
                options = data;
            }
            var opened = false, openRequest = null, handle = null, queuedRequests = new Array(), regionId = region.GetId();
            var open = function () {
                if (handle) {
                    return;
                }
                if (options.drop) {
                    window.indexedDB.deleteDatabase(options.name);
                }
                openRequest = window.indexedDB.open(options.name);
                openRequest.addEventListener('error', function (e) {
                    opened = true;
                    InlineJS.Region.Get(regionId).GetState().ReportError("Failed to open database '" + options.name + "'", e);
                });
                openRequest.addEventListener('success', function () {
                    handle = openRequest.result;
                    opened = true;
                    queuedRequests.forEach(function (callback) {
                        try {
                            callback();
                        }
                        catch (err) { }
                    });
                    queuedRequests = new Array();
                });
                openRequest.addEventListener('upgradeneeded', function () {
                    var db = openRequest.result, store = db.createObjectStore(options.name);
                    db.addEventListener('error', function (e) {
                        opened = true;
                        InlineJS.Region.Get(regionId).GetState().ReportError("Failed to open database '" + options.name + "'", e);
                    });
                    Object.keys(options.fields || {}).forEach(function (key) {
                        store.createIndex(key, key, {
                            unique: options.fields[key]
                        });
                    });
                });
            };
            var close = function () {
                if (handle) {
                    handle.close();
                    handle = null;
                }
                else if (!opened) { //Queue
                    queuedRequests.push(close);
                }
            };
            var read = function (key, callback) {
                if (!handle) {
                    if (opened) {
                        callback(null);
                    }
                    else { //Queue
                        queuedRequests.push(function () { read(key, callback); });
                    }
                    return;
                }
                var transaction = handle.transaction(options.name, 'readonly');
                var store = transaction.objectStore(options.name);
                var request = store.get(key);
                request.addEventListener('success', function () {
                    callback(request.result);
                });
                request.addEventListener('error', function (e) {
                    callback(null);
                    InlineJS.Region.Get(regionId).GetState().ReportError("Failed to read from database '" + options.name + "'", e);
                });
            };
            var write = function (value, key, callback) {
                if (!handle) {
                    if (!opened) {
                        queuedRequests.push(function () { write(value, key, callback); });
                    }
                    else if (callback) {
                        callback(false);
                    }
                    return;
                }
                var transaction = handle.transaction(options.name, 'readwrite');
                var store = transaction.objectStore(options.name);
                var request = store.put(value, key);
                request.addEventListener('success', function () {
                    if (callback) {
                        callback(true);
                    }
                });
                request.addEventListener('error', function (e) {
                    if (callback) {
                        callback(false);
                    }
                    InlineJS.Region.Get(regionId).GetState().ReportError("Failed to write to database '" + options.name + "'", e);
                });
            };
            var elementScope = region.AddElement(element, true);
            var scope = ExtendedDirectiveHandlers.AddScope('db', elementScope, []);
            elementScope.locals['$db'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in options) {
                    return options[prop];
                }
                if (prop === 'open') {
                    return open;
                }
                if (prop === 'close') {
                    return close;
                }
                if (prop === 'read') {
                    return read;
                }
                if (prop === 'write') {
                    return write;
                }
                if (prop in scope.callbacks) {
                    return function (callback) { return scope.callbacks[prop].push(callback); };
                }
            }, __spreadArrays(Object.keys(options), ['open', 'close', 'read', 'write'], Object.keys(scope.callbacks)));
            open();
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Auth = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$auth')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var userUrl = window.location.origin + "/auth/user";
            var registerUrl = window.location.origin + "/auth/register";
            var loginUrl = window.location.origin + "/auth/login";
            var logoutUrl = window.location.origin + "/auth/logout";
            var updateUrl = window.location.origin + "/auth/update";
            var deleteUrl = window.location.origin + "/auth/delete";
            var data = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), userData = null, isInit = false, redirectPage = null, redirectQuery = null;
            if (!InlineJS.Region.IsObject(data)) { //Retrieve data
                fetch(userUrl, {
                    method: 'GET',
                    credentials: 'same-origin'
                }).then(function (response) { return response.json(); }).then(function (data) {
                    if (!isInit) {
                        isInit = true;
                        alertAll();
                        userData = (data || null);
                    }
                });
            }
            else { //Use specified data
                isInit = true;
                userData = (data.userData || null);
            }
            var alertAll = function () {
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'check', scope);
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'roles', scope);
                Object.keys(userData || {}).forEach(function (key) { return ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), "fields." + key, scope); });
            };
            var getRouter = function () {
                return InlineJS.Region.GetGlobalValue(regionId, '$router');
            };
            var shouldRefresh = directive.arg.options.includes('refresh');
            var redirect = function (loggedIn, refresh) {
                if (refresh === void 0) { refresh = false; }
                if (shouldRefresh || refresh) {
                    if (loggedIn) {
                        window.location.href = "" + (redirectPage || '/') + (redirectQuery ? ('?' + redirectQuery) : '');
                    }
                    else {
                        window.location.href = (redirectPage || '/');
                    }
                }
                else {
                    InlineJS.Region.Get(regionId).AddNextTickCallback(function () {
                        var router = getRouter();
                        if (router && loggedIn) {
                            router.goto((redirectPage || '/'), redirectQuery);
                        }
                        else if (router) {
                            router.goto('/');
                        }
                    });
                }
            };
            var rawHasRole = function (name) {
                return (userData && Array.isArray(userData.roles) && userData.roles.indexOf(name) != -1);
            };
            var methods = {
                check: function () {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".check");
                    return !!userData;
                },
                hasRole: function (name) {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".roles");
                    return rawHasRole(name);
                },
                isAdmin: function () {
                    return methods.hasRole('admin');
                },
                getField: function (key) {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".fields." + key);
                    return (userData ? userData[key] : null);
                },
                getName: function () {
                    return methods.getField('name');
                },
                getEmail: function () {
                    return methods.getField('email');
                },
                refresh: function () {
                    fetch(userUrl, {
                        method: 'GET',
                        credentials: 'same-origin'
                    }).then(function (response) { return response.json(); }).then(function (data) {
                        isInit = true;
                        alertAll();
                        userData = (data || null);
                    });
                },
                desync: function (logout, callback, after) {
                    if (!userData) {
                        return;
                    }
                    fetch((logout ? logoutUrl : deleteUrl), {
                        method: 'GET',
                        credentials: 'same-origin'
                    }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(function (data) {
                        isInit = true;
                        if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!callback || callback(data))) {
                            alertAll();
                            userData = null;
                            window.dispatchEvent(new CustomEvent('auth.authentication', {
                                detail: false
                            }));
                            redirect(false);
                            if (after) {
                                after(true);
                            }
                        }
                        else if (after) {
                            after(false);
                        }
                    })["catch"](function (err) {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback) {
                            callback(null, err);
                        }
                        if (after) {
                            after(false);
                        }
                    });
                },
                logout: function (callback, after) {
                    methods.desync(true, callback, after);
                },
                authenticate: function (login, form, callback, after) {
                    if (userData) {
                        return;
                    }
                    var formData;
                    if (!(form instanceof HTMLFormElement)) {
                        formData = new FormData();
                        Object.keys(form || {}).forEach(function (key) { return formData.append(key, form[key]); });
                    }
                    else {
                        formData = new FormData(form);
                    }
                    fetch((login ? loginUrl : registerUrl), {
                        method: 'POST',
                        credentials: 'same-origin',
                        body: formData
                    }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(function (data) {
                        isInit = true;
                        if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!callback || callback(data))) {
                            userData = (data || {});
                            alertAll();
                            window.dispatchEvent(new CustomEvent('auth.authentication', {
                                detail: true
                            }));
                            redirect(true);
                            if (after) {
                                after(true);
                            }
                        }
                        else if (after) {
                            after(false);
                        }
                    })["catch"](function (err) {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback) {
                            callback(null, err);
                        }
                        if (after) {
                            after(false);
                        }
                    });
                },
                login: function (form, callback, after) {
                    methods.authenticate(true, form, callback, after);
                },
                register: function (form, errorBag, callback, after) {
                    methods.authenticate(false, form, function (data, err) {
                        if (errorBag && 'failed' in data) {
                            for (var key in errorBag) {
                                var value = (data.failed[key] || []);
                                errorBag[key] = (Array.isArray(value) ? value : [value]);
                            }
                            return false;
                        }
                        return (!callback || callback(data, err));
                    }, after);
                },
                update: function (form, errorBag, callback, after) {
                    if (!userData) {
                        return;
                    }
                    var formData;
                    if (!(form instanceof HTMLFormElement)) {
                        formData = new FormData();
                        Object.keys(form || {}).forEach(function (key) { return formData.append(key, form[key]); });
                    }
                    else {
                        formData = new FormData(form);
                    }
                    fetch(updateUrl, {
                        method: 'POST',
                        credentials: 'same-origin',
                        body: formData
                    }).then(function (response) {
                        if (response.ok) {
                            return response.json();
                        }
                        ExtendedDirectiveHandlers.ReportServerError(null, {
                            status: response.status,
                            statusText: response.statusText
                        });
                    }).then(function (data) {
                        isInit = true;
                        if (errorBag && 'failed' in data) {
                            for (var key in errorBag) {
                                var value = (data.failed[key] || []);
                                errorBag[key] = (Array.isArray(value) ? value : [value]);
                            }
                            if (after) {
                                after(false);
                            }
                        }
                        else if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!callback || callback(data))) {
                            userData = (data || {});
                            alertAll();
                            if (after) {
                                after(true);
                            }
                        }
                        else if (after) {
                            after(false);
                        }
                    })["catch"](function (err) {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback) {
                            callback(null, err);
                        }
                        if (after) {
                            after(false);
                        }
                    });
                },
                "delete": function (callback) {
                    methods.desync(false, callback);
                },
                addMiddlewares: function (roles) {
                    var router = getRouter();
                    if (!router) {
                        return;
                    }
                    router.addHook('beforeLoad', function (info) {
                        if (!info || (info.name !== 'login' && info.name !== 'register')) {
                            redirectPage = redirectQuery = null;
                        }
                    });
                    var redirectToLogin = function (page, query) {
                        router.goto('/login');
                        redirectPage = page;
                        redirectQuery = query;
                    };
                    router.addMiddleware('guest', function (page, query) {
                        if (userData) { //Logged in
                            router.goto('/');
                            return false;
                        }
                        return true;
                    });
                    router.addMiddleware('auth', function (page, query) {
                        if (!userData) { //Not logged in
                            redirectToLogin(page, query);
                            return false;
                        }
                        return true;
                    });
                    (roles || []).forEach(function (role) {
                        router.addMiddleware("role:" + role, function (page, query) {
                            if (!userData) { //Not logged in
                                redirectToLogin(page, query);
                                return false;
                            }
                            return (rawHasRole(role) ? true : null);
                        });
                    });
                }
            };
            var scope = ExtendedDirectiveHandlers.AddScope('auth', region.AddElement(element, true), []), regionId = region.GetId();
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in methods) {
                    return methods[prop];
                }
            }, Object.keys(methods));
            InlineJS.Region.AddGlobal('$auth', function () { return proxy; });
            methods.addMiddlewares((data || {}).middlewareRoles);
            InlineJS.DirectiveHandlerManager.AddHandler('authRegister', function (innerRegion, innerElement, innerDirective) {
                if (!(innerElement instanceof HTMLFormElement)) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                var data = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                if (!InlineJS.Region.IsObject(data)) {
                    data = {};
                }
                ExtendedDirectiveHandlers.BindForm(innerRegion, innerElement, {}, [], function (after) {
                    methods.register(innerElement, data.errorBag, data.callback, function (state) {
                        if (state) {
                            redirect(true, true);
                        }
                        else {
                            after();
                        }
                    });
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('authLogin', function (innerRegion, innerElement, innerDirective) {
                if (!(innerElement instanceof HTMLFormElement)) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                var callback = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                ExtendedDirectiveHandlers.BindForm(innerRegion, innerElement, {}, [], function (after) {
                    methods.login(innerElement, callback, function (state) {
                        if (state) {
                            redirect(true, true);
                        }
                        else {
                            after();
                        }
                    });
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('authUpdate', function (innerRegion, innerElement, innerDirective) {
                if (!(innerElement instanceof HTMLFormElement)) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                var data = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                if (!InlineJS.Region.IsObject(data)) {
                    data = {};
                }
                ExtendedDirectiveHandlers.BindForm(innerRegion, innerElement, {}, [], function (after) {
                    methods.update(innerElement, data.errorBag, data.callback, function (state) {
                        after();
                    });
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('authLogout', function (innerRegion, innerElement, innerDirective) {
                var callback = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                if (innerElement instanceof HTMLFormElement) {
                    ExtendedDirectiveHandlers.BindForm(innerRegion, innerElement, {}, [], function (after) {
                        methods.logout(callback, function (state) {
                            after();
                        });
                    });
                }
                else { //Click
                    innerElement.addEventListener('click', function (e) {
                        e.preventDefault();
                        methods.logout(callback);
                    });
                }
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Geolocation = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$geolocation')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var position = null, error = null, regionId = region.GetId(), requested = false, tracking = false;
            var check = function () {
                if (navigator.geolocation) {
                    error = null;
                    return true;
                }
                error = {
                    code: -1,
                    message: 'Geolocation is not supported on this device.',
                    PERMISSION_DENIED: 0,
                    POSITION_UNAVAILABLE: 1,
                    TIMEOUT: 2
                };
                return false;
            };
            var setPosition = function (value) {
                position = value;
                window.dispatchEvent(new CustomEvent('geolocation.position', {
                    detail: value
                }));
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'position', scope);
                if (active) {
                    active = false;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                }
            };
            var setError = function (value) {
                error = value;
                window.dispatchEvent(new CustomEvent('geolocation.error', {
                    detail: value
                }));
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'error', scope);
                if (active) {
                    active = false;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                }
            };
            var request = function (force) {
                if (force === void 0) { force = false; }
                if ((!requested || force) && check()) {
                    if (!active) {
                        active = true;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    }
                    requested = true;
                    navigator.geolocation.getCurrentPosition(setPosition, setError);
                }
            };
            var track = function (force) {
                if (force === void 0) { force = false; }
                if ((!tracking || force) && check()) {
                    requested = tracking = true;
                    navigator.geolocation.watchPosition(setPosition, setError);
                }
            };
            var reset = function () {
                requested = tracking = false;
                position = null;
                error = null;
                window.dispatchEvent(new CustomEvent('geolocation.position', {
                    detail: null
                }));
                window.dispatchEvent(new CustomEvent('geolocation.error', {
                    detail: null
                }));
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'position', scope);
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'error', scope);
            };
            var scope = ExtendedDirectiveHandlers.AddScope('geolocation', region.AddElement(element, true), []), active = false;
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'position') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return position;
                }
                if (prop === 'error') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return error;
                }
                if (prop === 'active') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return active;
                }
                if (prop === 'request') {
                    return request;
                }
                if (prop === 'track') {
                    return track;
                }
                if (prop === 'reset') {
                    return reset;
                }
            }, ['position', 'error', 'request', 'track', 'reset']);
            InlineJS.Region.AddGlobal('$geolocation', function () { return proxy; });
            InlineJS.DirectiveHandlerManager.AddHandler('geolocationRequest', function (innerRegion, innerElement, innerDirective) {
                var shouldForce = innerDirective.arg.options.includes('force');
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    request(shouldForce);
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('geolocationTrack', function (innerRegion, innerElement, innerDirective) {
                var shouldForce = innerDirective.arg.options.includes('force');
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    track(shouldForce);
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('geolocationReset', function (innerRegion, innerElement, innerDirective) {
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    reset();
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Reporter = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$reporter')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var info = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (!InlineJS.Region.IsObject(info) || !('report' in info)) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info) {
                    return info[prop];
                }
            }, Object.keys(info));
            InlineJS.Region.AddGlobal('$reporter', function () { return proxy; });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Overlay = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$overlay')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var scope = ExtendedDirectiveHandlers.AddScope('overlay', region.AddElement(element, true), []), regionId = region.GetId();
            var count = 0, container = document.createElement('div'), zIndex = 1000, visible = false;
            var show = function () {
                ++count;
                if (!visible) {
                    visible = true;
                    container.classList.add('inlinejs-overlay');
                    document.body.classList.add('inlinejs-overlay');
                    if (document.body.clientHeight < document.body.scrollHeight) {
                        var screen_1 = InlineJS.Region.GetGlobalValue(region.GetId(), '$screen');
                        if (!screen_1 || screen_1.checkpoint > 1) {
                            document.body.classList.add('inlinejs-overlay-pad');
                        }
                    }
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'visible', scope);
                }
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'count', scope);
            };
            var hide = function () {
                if (count <= 0) {
                    return;
                }
                if (--count <= 0) {
                    count = 0;
                    if (visible) {
                        visible = false;
                        if (document.body.classList.contains('inlinejs-overlay-pad')) {
                            document.body.classList.remove('inlinejs-overlay-pad');
                        }
                        if (document.body.classList.contains('inlinejs-overlay')) {
                            document.body.classList.remove('inlinejs-overlay');
                        }
                        if (container.classList.contains('inlinejs-overlay')) {
                            container.classList.remove('inlinejs-overlay');
                        }
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'visible', scope);
                    }
                }
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'count', scope);
            };
            container.style.zIndex = zIndex.toString();
            document.body.appendChild(container);
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'show') {
                    return show;
                }
                if (prop === 'hide') {
                    return hide;
                }
                if (prop === 'toggle') {
                    return function (shouldShow) {
                        if (shouldShow) {
                            show();
                        }
                        else {
                            hide();
                        }
                    };
                }
                if (prop === 'count') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return count;
                }
                if (prop === 'visible') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return visible;
                }
                if (prop === 'zIndex') {
                    return zIndex;
                }
                if (prop === 'container') {
                    return container;
                }
            }, ['show', 'hide', 'count', 'visible', 'zIndex', 'container']);
            InlineJS.Region.AddGlobal('$overlay', function () { return proxy; });
            InlineJS.DirectiveHandlerManager.AddHandler('overlayBind', function (innerRegion, innerElement, innerDirective) {
                var innerRegionId = innerRegion.GetId(), previousValue = null;
                innerRegion.GetState().TrapGetAccess(function () {
                    var value = !!InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(innerRegionId), innerElement, innerDirective.value);
                    if (value === previousValue) {
                        return;
                    }
                    previousValue = value;
                    if (value) {
                        show();
                    }
                    else {
                        hide();
                    }
                }, true, innerElement);
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Form = function (region, element, directive) {
            if (!(element instanceof HTMLFormElement)) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var data = (InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value) || {});
            ExtendedDirectiveHandlers.BindForm(region, element, {
                action: (data.action || element.action),
                method: (data.method || element.method),
                errorBag: data.errorBag,
                callback: data.callback,
                confirmInfo: data.confirmInfo
            }, directive.arg.options);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.BindForm = function (region, element, info, directiveOptions, onSubmit) {
            if (!info.action && !onSubmit) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var options = {
                reload: false,
                files: false
            };
            var regionId = region.GetId(), middlewares = new Array();
            directiveOptions.forEach(function (key) {
                if (key in options) {
                    options[key] = true;
                }
                else {
                    var handler = InlineJS.Region.GetGlobalValue(regionId, "$form." + key, element);
                    if (handler) {
                        middlewares.push(handler);
                    }
                    else if (key === 'confirm') {
                        middlewares.push(function (callback) {
                            var reporter = InlineJS.Region.GetGlobalValue(regionId, '$reporter');
                            if (reporter && reporter.confirm) { //Confirm before proceeding
                                reporter.confirm((info.confirmInfo || 'Please confirm your action.'), function () { return callback(true); }, function () { return callback(false); });
                            }
                            else { //Dummy confirmation
                                callback(true);
                            }
                        });
                    }
                }
            });
            var active = false, elementScope = region.AddElement(element, true);
            var scope = ExtendedDirectiveHandlers.AddScope('form', elementScope, []);
            elementScope.locals['$form'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'active') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return active;
                }
                if (prop === 'element') {
                    return element;
                }
                if (prop === 'submit') {
                    return submit;
                }
            }, ['active', 'element', 'submit']);
            var setActiveState = function (state) {
                if (active != state) {
                    active = state;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                }
            };
            options.files = (options.files || !!element.querySelector('input[type="file"]'));
            var submit = function () {
                if (onSubmit) { //Pass to handler
                    onSubmit(function () {
                        setActiveState(false);
                    }, info);
                    return;
                }
                var body = null, initInfo = {
                    method: (info.method || 'POST'),
                    credentials: 'same-origin'
                };
                var action = info.action;
                if (initInfo.method.toUpperCase() !== 'POST') {
                    var hasQuest = action.includes('?'), query = '';
                    for (var i = 0; i < element.elements.length; ++i) {
                        var key = element.elements[i].getAttribute('name');
                        if (key && 'value' in element.elements[i]) {
                            var pair = encodeURIComponent(key) + "=" + encodeURIComponent(element.elements[i].value.toString());
                            if (query) {
                                query += "&" + pair;
                            }
                            else {
                                query = (hasQuest ? pair : "?" + pair);
                            }
                        }
                    }
                    action += query;
                }
                else if (options.files) {
                    body = new FormData();
                    for (var i = 0; i < element.elements.length; ++i) {
                        var key = element.elements[i].getAttribute('name');
                        if (!key) {
                            continue;
                        }
                        if (element.elements[i] instanceof HTMLInputElement && element.elements[i].type === 'file') {
                            if (element.elements[i].getAttribute('multiple')) {
                                for (var j = 0; j < element.elements[i].files.length; ++j) {
                                    body.append(key, element.elements[i].files[j]);
                                }
                            }
                            else if (0 < element.elements[i].files.length) {
                                body.append(key, element.elements[i].files[0]);
                            }
                        }
                        else if ('value' in element.elements[i]) {
                            body.append(key, element.elements[i].value);
                        }
                    }
                }
                else { //No files embedded
                    body = new FormData(element);
                }
                if (body) {
                    initInfo.body = body;
                }
                fetch(action, initInfo).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(function (data) {
                    try {
                        if (info.errorBag && 'failed' in data) {
                            for (var key in info.errorBag) {
                                var value = (data.failed[key] || []);
                                info.errorBag[key] = (Array.isArray(value) ? value : [value]);
                            }
                        }
                        if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!info.callback || info.callback(data))) {
                            element.dispatchEvent(new CustomEvent('form.success', {
                                detail: data
                            }));
                            if (options.reload) {
                                var router = InlineJS.Region.GetGlobalValue(regionId, '$router');
                                if (router) {
                                    router.reload();
                                    return;
                                }
                            }
                            element.reset();
                        }
                    }
                    catch (err) {
                        InlineJS.Region.Get(regionId).GetState().ReportError(err, "InlineJs.Region<" + regionId + ">.ExtendedDirectiveHandlers.BindForm(Element@" + element.nodeName + ", x-form)");
                    }
                    setActiveState(false);
                })["catch"](function (err) {
                    try {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (info.callback) {
                            info.callback(null, err);
                        }
                    }
                    catch (err) {
                        InlineJS.Region.Get(regionId).GetState().ReportError(err, "InlineJs.Region<" + regionId + ">.ExtendedDirectiveHandlers.BindForm(Element@" + element.nodeName + ", x-form)");
                    }
                    setActiveState(false);
                });
            };
            var runMiddleWares = function (index) {
                if (index < middlewares.length) {
                    middlewares[index](function (state) {
                        if (state) { //Run next
                            runMiddleWares(index + 1);
                        }
                        else { //Rejected
                            setActiveState(false);
                        }
                    }, element);
                }
                else {
                    submit();
                }
            };
            element.addEventListener('submit', function (e) {
                e.preventDefault();
                if (!active) {
                    setActiveState(true);
                    runMiddleWares(0);
                }
            });
        };
        ExtendedDirectiveHandlers.FormSubmit = function (region, element, directive) {
            InlineJS.CoreDirectiveHandlers.Attr(region, element, InlineJS.Processor.GetDirectiveWith('x-attr:disabled', '$form.active'));
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Modal = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$modal')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var scope = ExtendedDirectiveHandlers.AddScope('modal', region.AddElement(element, true), []), regionId = region.GetId(), show = null, url = null, active = false;
            var container = document.createElement('div'), mount = document.createElement('div'), overlay = InlineJS.Region.GetGlobalValue(regionId, '$overlay');
            container.classList.add('inlinejs-modal');
            mount.classList.add('inlinejs-modal-mount');
            if (element.style.zIndex) {
                container.style.zIndex = element.style.zIndex;
            }
            else { //Compute z-index
                container.style.zIndex = (overlay ? ((overlay.zIndex || 1000) + 9) : 1009);
            }
            container.appendChild(mount);
            document.body.appendChild(container);
            var animator = (InlineJS.CoreDirectiveHandlers.PrepareAnimation ? InlineJS.CoreDirectiveHandlers.PrepareAnimation(region, container, ['zoom', 'faster']) : null);
            var setShow = function (value) {
                if (value !== show) {
                    show = value;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'show', scope);
                    if (animator) {
                        animator(show, function (show) {
                            if (show) {
                                container.style.display = 'flex';
                            }
                        }, function (show) {
                            if (!show) {
                                container.style.display = 'none';
                            }
                        });
                    }
                    else if (show) {
                        container.style.display = 'flex';
                    }
                    else {
                        container.style.display = 'none';
                    }
                    overlay.toggle(show);
                }
            };
            var regions = new Array(), regionsCopy = null;
            InlineJS.Config.AddRegionHook(function (region, added) {
                if (!added) {
                    regions.splice(regions.indexOf(region), 1);
                    if (regionsCopy) {
                        regionsCopy.splice(regionsCopy.indexOf(region), 1);
                    }
                }
                else if (mount.contains(region.GetRootElement())) {
                    regions.push(region);
                }
            });
            var setUrl = function (value) {
                if (active) {
                    return;
                }
                if (url === value) {
                    if (url !== '::unload::') {
                        setShow(true);
                    }
                    return;
                }
                url = value;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'url', scope);
                regionsCopy = regions;
                regions = new Array();
                setActive(true);
                ExtendedDirectiveHandlers.FetchLoad(mount, url, false, function (unloaded) {
                    if (regionsCopy) {
                        regionsCopy.forEach(function (region) { return region.RemoveElement(region.GetRootElement()); });
                        regionsCopy = null;
                    }
                    setActive(false);
                    if (!unloaded) {
                        setShow(true);
                    }
                    window.dispatchEvent(new CustomEvent('modal.mount.load'));
                    if (!unloaded) {
                        InlineJS.Bootstrap.Reattach(mount);
                    }
                }, function (err) {
                    setActive(false);
                    window.dispatchEvent(new CustomEvent("modal.mount.error", {
                        detail: {
                            error: err,
                            mount: mount
                        }
                    }));
                });
            };
            var setActive = function (value) {
                if (active != value) {
                    active = value;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                }
            };
            var reload = function () {
                setShow(false);
                setUrl('::unload::');
            };
            window.addEventListener('router.load', reload);
            window.addEventListener('router.reload', reload);
            InlineJS.Region.AddGlobalOutsideEventCallback(mount, ['click', 'touchend'], function () {
                setShow(false);
            });
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'show') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return show;
                }
                if (prop === 'url') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return url;
                }
                if (prop === 'active') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return active;
                }
            }, ['show', 'url', 'active'], function (target, prop, value) {
                if (prop === 'show') {
                    setShow(!!value);
                    return true;
                }
                if (prop === 'url') {
                    setUrl(value || '');
                    return true;
                }
                if (prop === 'active') {
                    active = !!value;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    return true;
                }
                return false;
            });
            InlineJS.Region.AddGlobal('$modal', function () { return proxy; });
            InlineJS.DirectiveHandlerManager.AddHandler('modalUrl', function (innerRegion, innerElement, innerDirective) {
                var url = null;
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    setUrl(url);
                });
                var innerRegionId = innerRegion.GetId();
                innerRegion.GetState().TrapGetAccess(function () {
                    url = InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(innerRegionId), innerElement, innerDirective.value);
                }, true, innerElement);
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Counter = function (region, element, directive) {
            var value = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), regionId = region.GetId();
            if (!Number.isInteger(value)) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var isDown = (directive.arg.key === 'down'), stop = false;
            if (isDown && value <= 0) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var counter = function () {
                if (stop || (isDown && value <= 0)) {
                    return;
                }
                if (isDown) {
                    --value;
                    InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(regionId), element, directive.value + " -= 1");
                }
                else {
                    InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(regionId), element, directive.value + " += 1");
                }
                setTimeout(counter, 1000);
            };
            region.AddElement(element, true).locals['$counter'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'stop') {
                    return function () {
                        stop = true;
                    };
                }
                if (prop === 'resume') {
                    return function () {
                        if (stop) {
                            stop = false;
                            setTimeout(counter, 1000);
                        }
                    };
                }
            }, ['stop', 'resume']);
            setTimeout(counter, 1000);
        };
        ExtendedDirectiveHandlers.GetIntersectionOptions = function (region, element, expression) {
            var options = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, expression);
            if (InlineJS.Region.IsObject(options)) {
                if ('root' in options && typeof options['root'] === 'string') {
                    options['root'] = document.querySelector(options['root']);
                }
                if (!('rootMargin' in options)) {
                    options['rootMargin'] = '0px';
                }
                if (!('threshold' in options)) {
                    options['threshold'] = 0;
                }
            }
            else { //Use defaults
                options = {
                    root: null,
                    rootMargin: '0px',
                    threshold: 0,
                    original: options
                };
            }
            return options;
        };
        ExtendedDirectiveHandlers.ObserveIntersection = function (region, element, options, callback) {
            if (!('IntersectionObserver' in window)) {
                return callback(false);
            }
            var regionId = region.GetId(), elementScope = region.AddElement(element, true);
            var path = elementScope.key + ".$intObserver<" + ++ExtendedDirectiveHandlers.scopeId_ + ">";
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (callback(entry)) {
                        return;
                    }
                    var scope = InlineJS.Region.Get(regionId).GetElementScope(element);
                    if (scope && path in scope.intersectionObservers) {
                        scope.intersectionObservers[path].unobserve(element);
                        delete scope.intersectionObservers[path];
                    }
                });
            }, options);
            elementScope.intersectionObservers[path] = observer;
            observer.observe(element);
        };
        ExtendedDirectiveHandlers.FetchLoad = function (element, url, append, onLoad, onError, onProgress) {
            if (!url || !(url = url.trim())) {
                return;
            }
            var removeAll = function (force) {
                if (force === void 0) { force = false; }
                if (force || !append) {
                    while (element.firstElementChild) {
                        InlineJS.Region.RemoveElementStatic(element.firstElementChild);
                        element.removeChild(element.firstElementChild);
                    }
                }
            };
            var fetch = function (url, tryJson, callback) {
                var request = new XMLHttpRequest();
                if (onProgress) {
                    request.addEventListener('progress', onProgress);
                }
                if (onError) {
                    request.addEventListener('error', function () {
                        onError({
                            status: request.status,
                            statusText: request.statusText
                        });
                    });
                }
                request.addEventListener('load', function () {
                    var parsedData;
                    try {
                        if (tryJson) {
                            parsedData = JSON.parse(request.responseText);
                            if (ExtendedDirectiveHandlers.Report(null, parsedData)) {
                                return;
                            }
                        }
                        else {
                            parsedData = request.responseText;
                        }
                    }
                    catch (err) {
                        parsedData = request.responseText;
                    }
                    callback(parsedData);
                    if (onLoad) {
                        onLoad();
                    }
                });
                request.open('GET', url);
                request.send();
            };
            var fetchList = function (url, callback) {
                fetch(url, true, function (data) {
                    removeAll();
                    if (Array.isArray(data)) {
                        data.forEach(callback);
                    }
                    else if (typeof data === 'string') {
                        element.innerHTML = data;
                    }
                    if (onLoad) {
                        onLoad();
                    }
                });
            };
            var onEvent = function () {
                element.removeEventListener('load', onEvent);
                if (onLoad) {
                    onLoad();
                }
            };
            if (url === '::unload::') {
                if (element.tagName === 'IMG' || element.tagName === 'IFRAME') {
                    element.src = '';
                }
                else {
                    removeAll(true);
                }
                if (onLoad) {
                    onLoad(true);
                }
            }
            else if (element.tagName === 'SELECT') {
                fetchList(url, function (item) {
                    if (item && typeof item === 'object' && 'value' in item && 'text' in item) {
                        var option = document.createElement('option');
                        option.value = item['value'];
                        option.textContent = item['text'];
                        element.appendChild(option);
                    }
                });
            }
            else if (element.tagName === 'UL' || element.tagName === 'OL') {
                fetchList(url, function (item) {
                    if (item && typeof item === 'object' && 'value' in item && 'text' in item) {
                        var li = document.createElement('li');
                        li.innerHTML = ((typeof item === 'string') ? item : item.toString());
                        element.appendChild(li);
                    }
                });
            }
            else if (element.tagName === 'IMG' || element.tagName === 'IFRAME') {
                element.addEventListener('load', onEvent);
                element.src = url;
            }
            else { //Generic
                fetch(url, false, function (data) {
                    if (append) {
                        var tmpl = document.createElement('template');
                        tmpl.innerHTML = ((typeof data === 'string') ? data : data.toString());
                        tmpl.content.childNodes.forEach(function (child) { return element.appendChild(child); });
                    }
                    else {
                        removeAll();
                        element.innerHTML = ((typeof data === 'string') ? data : data.toString());
                    }
                });
            }
        };
        ExtendedDirectiveHandlers.HandleJsonResponse = function (response) {
            if (response.ok) {
                return response.json();
            }
            ExtendedDirectiveHandlers.ReportServerError(null, {
                status: response.status,
                statusText: response.statusText
            });
        };
        ExtendedDirectiveHandlers.HandleTextResponse = function (response) {
            if (response.ok) {
                return response.text();
            }
            ExtendedDirectiveHandlers.ReportServerError(null, {
                status: response.status,
                statusText: response.statusText
            });
        };
        ExtendedDirectiveHandlers.Alert = function (region, prop, prefix, target) {
            var change = {
                regionId: region.GetId(),
                type: 'set',
                path: (prefix ? ((typeof prefix === 'string') ? prefix : prefix.path) + "." + prop : prop),
                prop: prop,
                origin: region.GetChanges().GetOrigin()
            };
            if (target) {
                region.GetChanges().Add({
                    original: change,
                    path: target
                });
            }
            else {
                region.GetChanges().Add(change);
            }
        };
        ExtendedDirectiveHandlers.Report = function (regionId, info) {
            var reporter = InlineJS.Region.GetGlobalValue(regionId, '$reporter');
            return (reporter && reporter.report && reporter.report(info));
        };
        ExtendedDirectiveHandlers.ReportServerError = function (regionId, err) {
            var reporter = InlineJS.Region.GetGlobalValue(regionId, '$reporter');
            return (reporter && reporter.reportServerError && reporter.reportServerError(err));
        };
        ExtendedDirectiveHandlers.AddScope = function (prefix, elementScope, callbacks) {
            var id = prefix + "<" + ++ExtendedDirectiveHandlers.scopeId_ + ">";
            ExtendedDirectiveHandlers.scopes_[id] = {
                id: id,
                path: elementScope.key + ".$" + id,
                callbacks: {}
            };
            (callbacks || []).forEach(function (key) { return ExtendedDirectiveHandlers.scopes_[id].callbacks[key] = new Array(); });
            return ExtendedDirectiveHandlers.scopes_[id];
        };
        ExtendedDirectiveHandlers.BuildGlobal = function (name) {
            InlineJS.Region.AddGlobal("$$" + name, function (regionId) {
                return function (target) {
                    var local = (InlineJS.Region.Infer(target) || InlineJS.Region.Get(regionId)).GetLocal(target, "$" + name, true);
                    return ((local instanceof InlineJS.Value) ? local.Get() : local);
                };
            });
        };
        ExtendedDirectiveHandlers.AddAll = function () {
            InlineJS.DirectiveHandlerManager.AddHandler('watch', ExtendedDirectiveHandlers.Watch);
            InlineJS.DirectiveHandlerManager.AddHandler('when', ExtendedDirectiveHandlers.When);
            InlineJS.DirectiveHandlerManager.AddHandler('once', ExtendedDirectiveHandlers.Once);
            InlineJS.DirectiveHandlerManager.AddHandler('mouse', ExtendedDirectiveHandlers.Mouse);
            InlineJS.DirectiveHandlerManager.AddHandler('input', ExtendedDirectiveHandlers.Input);
            InlineJS.DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            InlineJS.DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            InlineJS.DirectiveHandlerManager.AddHandler('jsonLoad', ExtendedDirectiveHandlers.JSONLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('lazyLoad', ExtendedDirectiveHandlers.LazyLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);
            InlineJS.DirectiveHandlerManager.AddHandler('busy', ExtendedDirectiveHandlers.Busy);
            InlineJS.DirectiveHandlerManager.AddHandler('activeGroup', ExtendedDirectiveHandlers.ActiveGroup);
            InlineJS.DirectiveHandlerManager.AddHandler('router', ExtendedDirectiveHandlers.Router);
            InlineJS.DirectiveHandlerManager.AddHandler('page', ExtendedDirectiveHandlers.Page);
            InlineJS.DirectiveHandlerManager.AddHandler('screen', ExtendedDirectiveHandlers.Screen);
            InlineJS.DirectiveHandlerManager.AddHandler('cart', ExtendedDirectiveHandlers.Cart);
            InlineJS.DirectiveHandlerManager.AddHandler('db', ExtendedDirectiveHandlers.DB);
            InlineJS.DirectiveHandlerManager.AddHandler('auth', ExtendedDirectiveHandlers.Auth);
            InlineJS.DirectiveHandlerManager.AddHandler('geolocation', ExtendedDirectiveHandlers.Geolocation);
            InlineJS.DirectiveHandlerManager.AddHandler('reporter', ExtendedDirectiveHandlers.Reporter);
            InlineJS.DirectiveHandlerManager.AddHandler('overlay', ExtendedDirectiveHandlers.Overlay);
            InlineJS.DirectiveHandlerManager.AddHandler('form', ExtendedDirectiveHandlers.Form);
            InlineJS.DirectiveHandlerManager.AddHandler('formSubmit', ExtendedDirectiveHandlers.FormSubmit);
            InlineJS.DirectiveHandlerManager.AddHandler('formButton', ExtendedDirectiveHandlers.FormSubmit);
            InlineJS.DirectiveHandlerManager.AddHandler('modal', ExtendedDirectiveHandlers.Modal);
            InlineJS.DirectiveHandlerManager.AddHandler('counter', ExtendedDirectiveHandlers.Counter);
            ExtendedDirectiveHandlers.BuildGlobal('state');
            ExtendedDirectiveHandlers.BuildGlobal('attr');
            ExtendedDirectiveHandlers.BuildGlobal('xhr');
            ExtendedDirectiveHandlers.BuildGlobal('lazyLoad');
            ExtendedDirectiveHandlers.BuildGlobal('intersection');
            ExtendedDirectiveHandlers.BuildGlobal('busy');
            ExtendedDirectiveHandlers.BuildGlobal('db');
            ExtendedDirectiveHandlers.BuildGlobal('form');
            ExtendedDirectiveHandlers.BuildGlobal('counter');
        };
        ExtendedDirectiveHandlers.scopeId_ = 0;
        ExtendedDirectiveHandlers.scopes_ = {};
        return ExtendedDirectiveHandlers;
    }());
    InlineJS.ExtendedDirectiveHandlers = ExtendedDirectiveHandlers;
    (function () {
        ExtendedDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
