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
        ExtendedDirectiveHandlers.Input = function (region, element, directive) {
            var wrapper = document.createElement('div'), span = document.createElement('span'), style = getComputedStyle(element);
            element.parentElement.insertBefore(wrapper, element);
            wrapper.appendChild(element);
            wrapper.appendChild(span);
            wrapper.classList.add('inlinejs-input');
            directive.arg.options.forEach(function (key) { return wrapper.classList.add(key); });
            span.style.top = "calc(" + wrapper.offsetHeight + "px - 1rem - " + style.marginBottom + " - " + style.paddingBottom + ")";
            span.style.left = "calc(" + style.paddingLeft + " + " + style.marginLeft + ")";
            span.textContent = element.placeholder;
            element.placeholder = ' ';
            var onBlur = function () {
                wrapper.classList.add('blurred');
                element.removeEventListener('blur', onBlur);
            };
            element.addEventListener('blur', onBlur);
            span.addEventListener('click', function () { element.focus(); });
            span.addEventListener('keydown', function (e) {
                if (e.key === ' ') {
                    element.focus();
                }
            });
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
        ExtendedDirectiveHandlers.XHRLoad = function (region, element, directive) {
            var append = function (state, isOnce) {
                if (isOnce === void 0) { isOnce = false; }
                info.isAppend = state;
                info.isOnce = isOnce;
            };
            var regionId = region.GetId(), info = {
                url: '',
                isAppend: (directive.arg.options.indexOf('append') != -1),
                isOnce: (directive.arg.options.indexOf('once') != -1),
                isLoaded: false,
                append: append,
                reload: function () { return load('::reload::'); },
                unload: function () { return load('::unload::'); }
            };
            var load = function (url) {
                ExtendedDirectiveHandlers.FetchLoad(element, ((url === '::reload::') ? info.url : url), info.isAppend, function () {
                    info.isLoaded = true;
                    var myRegion = InlineJS.Region.Get(regionId);
                    myRegion.GetChanges().Add({
                        regionId: regionId,
                        type: 'set',
                        path: scope.path + ".isLoaded",
                        prop: 'isLoaded',
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                    Object.keys(scope.callbacks).forEach(function (key) { return scope.callbacks[key].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, true); }); });
                    element.dispatchEvent(new CustomEvent("xhr.load"));
                    if (info.isOnce) {
                        info.isAppend = !info.isAppend;
                        info.isOnce = false;
                    }
                });
            };
            region.GetState().TrapGetAccess(function () {
                var url = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                if (url !== info.url && typeof url === 'string') {
                    load(url);
                    info.url = url;
                }
            }, true, element);
            var elementScope = region.AddElement(element, true);
            var scope = ExtendedDirectiveHandlers.AddScope('xhr', elementScope, ['onLoad']);
            elementScope.locals['$xhr'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
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
                    var myRegion = InlineJS.Region.Get(regionId);
                    myRegion.GetChanges().Add({
                        regionId: regionId,
                        type: 'set',
                        path: scope.path + ".isLoaded",
                        prop: 'isLoaded',
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                    Object.keys(scope.callbacks).forEach(function (key) { return scope.callbacks[key].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, true); }); });
                    element.dispatchEvent(new CustomEvent("xhr.load"));
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
        ExtendedDirectiveHandlers.Animate = function (region, element, directive) {
            var type = (directive.arg.key || 'transition'), showOnly = false, target = '', duration = 300, style = getComputedStyle(element);
            var extractDuration = function (option) {
                if (option === 'slower') {
                    return 1000;
                }
                if (option === 'slow') {
                    return 750;
                }
                if (option === 'normal') {
                    return 500;
                }
                if (option === 'fast') {
                    return 300;
                }
                if (option === 'faster') {
                    return 200;
                }
                return InlineJS.CoreDirectiveHandlers.ExtractDuration(option, null);
            };
            var extractors = {
                transition: function (options) {
                    options.forEach(function (option) {
                        if ((duration = extractDuration(option)) === null) {
                            if (option === 'show') {
                                showOnly = true;
                            }
                            else {
                                target = option;
                            }
                        }
                    });
                },
                unknown: function (options) {
                    options.forEach(function (option) { return duration = extractDuration(option); });
                }
            };
            var animationMap = {
                backUp: {
                    "in": 'backInUp',
                    out: 'backOutUp'
                },
                backRight: {
                    "in": 'backInRight',
                    out: 'backOutRight'
                },
                backDown: {
                    "in": 'backInDown',
                    out: 'backOutDown'
                },
                backLeft: {
                    "in": 'backInLeft',
                    out: 'backOutLeft'
                },
                bounce: {
                    "in": 'bounceIn',
                    out: 'bounceOut'
                },
                bounceUp: {
                    "in": 'bounceInUp',
                    out: 'bounceOutUp'
                },
                bounceRight: {
                    "in": 'bounceInRight',
                    out: 'bounceOutRight'
                },
                bounceDown: {
                    "in": 'bounceInDown',
                    out: 'bounceOutDown'
                },
                bounceLeft: {
                    "in": 'bounceInLeft',
                    out: 'bounceOutLeft'
                },
                fade: {
                    "in": 'fadeIn',
                    out: 'fadeOut'
                },
                fadeUp: {
                    "in": 'fadeInUp',
                    out: 'fadeOutUp'
                },
                fadeRight: {
                    "in": 'fadeInRight',
                    out: 'fadeOutRight'
                },
                fadeDown: {
                    "in": 'fadeInDown',
                    out: 'fadeOutDown'
                },
                fadeLeft: {
                    "in": 'fadeInLeft',
                    out: 'fadeOutLeft'
                },
                zoom: {
                    "in": 'zoomIn',
                    out: 'zoomOut'
                },
                zoomUp: {
                    "in": 'zoomInUp',
                    out: 'zoomOutUp'
                },
                zoomRight: {
                    "in": 'zoomInRight',
                    out: 'zoomOutRight'
                },
                zoomDown: {
                    "in": 'zoomInDown',
                    out: 'zoomOutDown'
                },
                zoomLeft: {
                    "in": 'zoomInLeft',
                    out: 'zoomOutLeft'
                },
                slideUp: {
                    "in": 'slideInUp',
                    out: 'slideOutUp'
                },
                slideRight: {
                    "in": 'slideInRight',
                    out: 'slideOutRight'
                },
                slideDown: {
                    "in": 'slideInDown',
                    out: 'slideOutDown'
                },
                slideLeft: {
                    "in": 'slideInLeft',
                    out: 'slideOutLeft'
                },
                rotate: {
                    "in": 'rotateIn',
                    out: 'rotateOut'
                },
                rotateUpRight: {
                    "in": 'rotateInUpRight',
                    out: 'rotateOutUpRight'
                },
                rotateDownRight: {
                    "in": 'rotateInDownRight',
                    out: 'rotateOutDownRight'
                },
                rotateDownLeft: {
                    "in": 'rotateInDownLeft',
                    out: 'rotateOutDownLeft'
                },
                rotateUpLeft: {
                    "in": 'rotateInUpLeft',
                    out: 'rotateOutUpLeft'
                },
                roll: {
                    "in": 'rollIn',
                    out: 'rollOut'
                },
                flipX: {
                    "in": 'flipInX',
                    out: 'flipOutX'
                },
                flipY: {
                    "in": 'flipInY',
                    out: 'flipOutY'
                },
                lightSpeedLeft: {
                    "in": 'lightSpeedInLeft',
                    out: 'lightSpeedOutLeft'
                },
                lightSpeedRight: {
                    "in": 'lightSpeedInRight',
                    out: 'lightSpeedOutRight'
                }
            };
            if (type in extractors) {
                extractors[type](directive.arg.options);
            }
            else {
                extractors.unknown(directive.arg.options);
            }
            var update;
            var isShown = false, isTransitioning = false, checkpoint = 0;
            var endTransition = function () {
                if (!isTransitioning) {
                    return;
                }
                isTransitioning = false;
                if (!isShown) {
                    if (showValue) {
                        element.style.display = 'none';
                    }
                    element.dispatchEvent(new CustomEvent('animate.hide'));
                }
                else {
                    element.dispatchEvent(new CustomEvent('animate.show'));
                }
            };
            var preUpdate = function (show) {
                isShown = show;
                isTransitioning = true;
                if (show) {
                    if (showValue) {
                        element.style.display = showValue;
                    }
                    element.dispatchEvent(new CustomEvent('animate.showing'));
                }
                else {
                    element.dispatchEvent(new CustomEvent('animate.hiding'));
                }
                if (showOnly && !isShown) {
                    return;
                }
                if (showValue) {
                    var thisCheckpoint_1 = ++checkpoint;
                    setTimeout(function () {
                        if (thisCheckpoint_1 == checkpoint) {
                            endTransition();
                        }
                    }, (duration || 300));
                }
            };
            var setTransitions = function (list) {
                var reduced = list.reduce(function (previous, current) { return (previous ? previous + ", " + current + " " + (duration || 300) + "ms ease" : current + " " + (duration || 300) + "ms ease"); }, '');
                if (element.style.transition) {
                    element.style.transition += ", " + reduced;
                }
                else {
                    element.style.transition = reduced;
                }
                element.addEventListener('transitionend', function () {
                    endTransition();
                });
            };
            var height = style.height, width = style.width, padding = style.padding, borderWidth = style.borderWidth, showValue = style.getPropertyValue('display');
            if (showValue === 'none') {
                showValue = 'block';
            }
            if (type === 'transition') {
                var updateSize_1 = function (show) {
                    element.style.padding = (show ? padding : '0');
                    element.style.borderWidth = (show ? borderWidth : '0');
                    if (target === 'height' || target !== 'width') {
                        element.style.height = (show ? height : '0');
                    }
                    if (target === 'width' || target !== 'height') {
                        element.style.width = (show ? width : '0');
                    }
                };
                var updateOpacity_1 = function (show) {
                    element.style.opacity = (show ? '1' : '0');
                };
                if (!target || target === 'all') {
                    showValue = null;
                    element.style.overflow = 'hidden';
                    setTransitions(['height', 'width', 'padding', 'border', 'opacity']);
                    update = function (show) {
                        preUpdate(show);
                        updateSize_1(show);
                        updateOpacity_1(show);
                        if (showOnly && !isShown) {
                            endTransition();
                        }
                    };
                }
                else if (target === 'height' || target === 'width' || target === 'size') {
                    showValue = null;
                    element.style.overflow = 'hidden';
                    setTransitions(['height', 'width', 'padding', 'border']);
                    update = function (show) {
                        preUpdate(show);
                        updateSize_1(show);
                        if (showOnly && !isShown) {
                            endTransition();
                        }
                    };
                }
                else if (target === 'opacity') {
                    setTransitions(['opacity']);
                    update = function (show) {
                        preUpdate(show);
                        updateOpacity_1(show);
                        if (showOnly && !isShown) {
                            endTransition();
                        }
                    };
                }
            }
            else if (type in animationMap) { //Use Animate.css
                var inTarget_1 = "animate__" + animationMap[type]["in"], outTarget_1 = "animate__" + animationMap[type].out, lastTarget_1 = '';
                update = function (show) {
                    preUpdate(show);
                    if (element.classList.contains(lastTarget_1)) {
                        element.classList.remove(lastTarget_1);
                    }
                    element.classList.add('animate__animated');
                    if (show) {
                        element.classList.add(lastTarget_1 = inTarget_1);
                    }
                    else { //Hide
                        element.classList.add(lastTarget_1 = outTarget_1);
                    }
                };
                element.style.animationDuration = (duration || 300) + "ms";
                element.addEventListener('animationend', function () {
                    endTransition();
                });
            }
            else {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var regionId = region.GetId();
            region.GetState().TrapGetAccess(function () {
                update(!!InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(regionId), element, directive.value));
            }, true, element);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Typewriter = function (region, element, directive) {
            var data = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (!data) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var info = {
                list: new Array(),
                delay: 100,
                interval: 250,
                iterations: -1,
                showDelete: false,
                useRandom: false,
                showCursor: false
            };
            if (typeof data === 'string') {
                info.list.push(data);
            }
            else if (Array.isArray(data)) {
                data.forEach(function (item) { return info.list.push(item); });
            }
            else {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var nextDuration = '', iterationsIsNext = false;
            directive.arg.options.forEach(function (option) {
                if (nextDuration) {
                    var duration_1 = InlineJS.CoreDirectiveHandlers.ExtractDuration(option, null);
                    if (duration_1 !== null) {
                        info[nextDuration] = duration_1;
                        nextDuration = '';
                        return;
                    }
                    nextDuration = '';
                }
                else if (iterationsIsNext) {
                    iterationsIsNext = false;
                    if (option === 'inf' || option === 'infinite') {
                        info.iterations = -1;
                    }
                    else {
                        info.iterations = (parseInt(option) || -1);
                    }
                    return;
                }
                if (option === 'delay' || option === 'interval') {
                    nextDuration = option;
                    info[nextDuration] = (info[nextDuration] || 250);
                }
                else if (option === 'iterations') {
                    iterationsIsNext = true;
                }
                else if (option === 'delete') {
                    info.showDelete = true;
                }
                else if (option === 'random') {
                    info.useRandom = true;
                }
                else if (option === 'cursor') {
                    info.showCursor = true;
                }
            });
            var lineIndex = -1, index = 0, line, isDeleting = false, span = document.createElement('span'), duration, startTimestamp = null;
            var pass = function (timestamp) {
                if (lineIndex == -1 || line.length <= index) {
                    index = 0;
                    if (isDeleting || lineIndex == -1 || !info.showDelete) {
                        lineIndex = (info.useRandom ? Math.floor(Math.random() * info.list.length) : ++lineIndex);
                        if (info.list.length <= lineIndex) { //Move to front of list
                            lineIndex = 0;
                        }
                        line = info.list[lineIndex];
                        isDeleting = false;
                    }
                    else {
                        isDeleting = true;
                    }
                    duration = info.interval;
                }
                if (startTimestamp === null) {
                    startTimestamp = timestamp;
                }
                if ((timestamp - startTimestamp) < duration) { //Duration not met
                    requestAnimationFrame(pass);
                    return;
                }
                startTimestamp = timestamp;
                if (isDeleting) {
                    ++index;
                    span.innerText = line.substr(0, (line.length - index));
                    duration = info.delay;
                }
                else { //Append
                    ++index;
                    span.innerText = line.substring(0, index);
                    duration = info.delay;
                }
                requestAnimationFrame(pass);
            };
            span.classList.add('typewriter-text');
            if (info.showCursor) {
                span.style.borderRight = '1px solid #333333';
            }
            element.appendChild(span);
            requestAnimationFrame(pass);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Router = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal('$router', region.GetId())) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var regionId = region.GetId(), prefix = directive.value, origin = location.origin, pathname = location.pathname, query = location.search.substr(1), alertable = ['url', 'currentPage', 'currentQuery'], info = {
                currentPage: null,
                currentQuery: '',
                targetComponent: null,
                targetExit: null,
                pages: {},
                url: null,
                mount: null,
                middlewares: {}
            }, methods = {
                register: function (data) {
                    var innerRegion = InlineJS.Region.Get(InlineJS.RegionMap.scopeRegionIds.Peek());
                    if (innerRegion) {
                        register(data.page, (data.path || data.page), data.title, innerRegion.GetComponentKey(), (data.entry || 'open'), (data.exit || 'close'), !!data.disabled, data.middlewares);
                    }
                },
                unregister: function (page) {
                    delete info.pages[page];
                },
                disable: function (page, disabled) {
                    if (disabled === void 0) { disabled = true; }
                    if (page in info.pages) {
                        info.pages[page].disabled = disabled;
                    }
                },
                goto: function (page, args) { goto(page, args); },
                redirect: function (page, args) { goto(page, args, true); },
                back: function () { back(); },
                exit: function (component) {
                    if (!component) {
                        var innerRegion = InlineJS.Region.Get(InlineJS.RegionMap.scopeRegionIds.Peek());
                        if (innerRegion) {
                            exit(innerRegion.GetComponentKey());
                        }
                    }
                    else {
                        exit(component);
                    }
                },
                addMiddleware: function (name, handler) {
                    info.middlewares[name] = handler;
                },
                parseQuery: function (query) { return parseQuery(query); }
            };
            if (prefix) {
                prefix += '/';
            }
            var scope = ExtendedDirectiveHandlers.AddScope('router', region.AddElement(element, true), Object.keys(methods));
            var register = function (page, path, title, component, entry, exit, disabled, middlewares) {
                info.pages[page] = {
                    path: path,
                    title: title,
                    component: component,
                    entry: entry,
                    exit: exit,
                    disabled: disabled,
                    middlewares: ((middlewares && Array.isArray(middlewares)) ? middlewares : new Array())
                };
            };
            var goto = function (page, query, replace) {
                if (replace === void 0) { replace = false; }
                var pageInfo = null;
                if (page in info.pages) {
                    pageInfo = info.pages[page];
                }
                else if (page.indexOf(origin + "/") == 0) {
                    page = (page.substr(origin.length + 1) || '/');
                    pageInfo = ((page in info.pages) ? info.pages[page] : null);
                }
                if (pageInfo && !pageInfo.disabled) {
                    query = (query || '');
                    if (query && query.substr(0, 1) !== '?') {
                        query = "?" + query;
                    }
                    if (origin + "/" + prefix + pageInfo.path + query === info.url) {
                        window.dispatchEvent(new CustomEvent('router.reload'));
                        window.dispatchEvent(new CustomEvent('router.page'));
                        return;
                    }
                    load(page, query, function () {
                        if (replace) {
                            history.replaceState({
                                page: page,
                                query: query
                            }, pageInfo.title, origin + "/" + ((pageInfo.path === '/') ? '' : pageInfo.path) + query);
                        }
                        else {
                            history.pushState({
                                page: page,
                                query: query
                            }, pageInfo.title, origin + "/" + ((pageInfo.path === '/') ? '' : pageInfo.path) + query);
                        }
                    });
                }
                else {
                    window.dispatchEvent(new CustomEvent('router.404', { detail: page }));
                }
            };
            var back = function () {
                if (info.currentPage && info.currentPage !== '/') {
                    history.back();
                    return true;
                }
                return false;
            };
            var exit = function (component) {
                if (!info.targetComponent && info.currentPage && info.currentPage !== '/' && info.pages[info.currentPage].component === component) {
                    info.targetComponent = component;
                    info.targetExit = info.pages[info.currentPage].exit;
                    history.back();
                }
            };
            var load = function (page, query, callback) {
                if (info.currentPage && info.currentPage !== '/') {
                    unload(info.pages[info.currentPage].component, info.pages[info.currentPage].exit);
                }
                var pageInfo = info.pages[page], component = pageInfo.component, handled;
                for (var i = 0; i < (pageInfo.middlewares || []).length; ++i) {
                    var middleware = pageInfo.middlewares[i];
                    if (middleware in info.middlewares && !info.middlewares[middleware](page, query)) {
                        return; //Rejected
                    }
                }
                ;
                info.currentPage = page;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'currentPage', scope);
                if (info.currentQuery !== query) {
                    info.currentQuery = query;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'currentQuery', scope);
                }
                try {
                    if (component) {
                        handled = (InlineJS.Region.Find(component, true)[info.pages[page].entry])(query);
                    }
                    else {
                        handled = false;
                    }
                }
                catch (err) {
                    handled = false;
                }
                var urlChanged = false;
                if (handled === false) {
                    var url = origin + "/" + prefix + info.pages[page].path + (query || '');
                    if (url !== info.url) {
                        urlChanged = true;
                        info.url = url;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'url', scope);
                    }
                }
                if (callback) {
                    callback();
                }
                if (urlChanged) {
                    window.dispatchEvent(new CustomEvent('router.load'));
                }
                window.dispatchEvent(new CustomEvent('router.page'));
            };
            var unload = function (component, exit) {
                try {
                    (InlineJS.Region.Find(component, true)[exit])();
                }
                catch (err) { }
                window.dispatchEvent(new CustomEvent('router.unload'));
            };
            var parseQuery = function (query) {
                var params = {};
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
            window.addEventListener('popstate', function (event) {
                if (!event.state) {
                    return;
                }
                var page = event.state.page;
                if (!page || !(page in info.pages)) {
                    return;
                }
                if (!info.targetComponent || info.pages[page].component !== info.targetComponent || !back()) {
                    if (info.targetComponent) {
                        info.targetComponent = null;
                        info.targetExit = null;
                    }
                    load(page, event.state.query);
                }
            });
            InlineJS.DirectiveHandlerManager.AddHandler('routerMount', function (innerRegion, innerElement, innerDirective) {
                var innerRegionId = innerRegion.GetId();
                if (info.mount) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                info.mount = document.createElement('div');
                innerElement.parentElement.insertBefore(info.mount, innerElement);
                info.mount.classList.add('router-mount');
                innerRegion.GetState().TrapGetAccess(function () {
                    var url = InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(innerRegionId), innerElement, '$router.url');
                    ExtendedDirectiveHandlers.FetchLoad(info.mount, url, false, function () {
                        innerElement.dispatchEvent(new CustomEvent('router.mount.load'));
                        InlineJS.Bootstrap.Reattach();
                    });
                }, true, innerElement);
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('routerRegister', function (innerRegion, innerElement, innerDirective) {
                var data = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                register(data.page, (data.path || data.page), data.title, innerRegion.GetComponentKey(), (data.entry || 'open'), (data.exit || 'close'), !!data.disabled, data.middlewares);
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
                        alert('active');
                        innerElement.dispatchEvent(new CustomEvent('router.active'));
                    }
                    else { //Removed from DOM
                        window.removeEventListener('router.load', onEvent);
                    }
                };
                var innerScope = ExtendedDirectiveHandlers.AddScope('router', innerRegion.AddElement(innerElement, true), []);
                var alert = function (prop) {
                    var myRegion = InlineJS.Region.Get(innerRegionId);
                    myRegion.GetChanges().Add({
                        regionId: innerRegionId,
                        type: 'set',
                        path: innerScope.path + "." + prop,
                        prop: prop,
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                };
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
                    goto(thisPath, thisQuery);
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
            InlineJS.DirectiveHandlerManager.AddHandler('routerExit', function (innerRegion, innerElement, innerDirective) {
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    exit(innerRegion.GetComponentKey());
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.Config.AddGlobalMagicProperty('routerExit', function (regionId) {
                return function () { return exit(InlineJS.Region.Get(regionId).GetComponentKey()); };
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
        ExtendedDirectiveHandlers.Screen = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal('$screen', region.GetId())) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var computeBreakpoint = function (width) {
                if (width < 576) { //Extra small
                    return 'xs';
                }
                if (width < 768) { //Small
                    return 'sm';
                }
                if (width < 992) { //Medium
                    return 'md';
                }
                if (width < 1200) { //Large
                    return 'lg';
                }
                if (width < 1400) { //Extra large
                    return 'xl';
                }
                return 'xxl'; //Extra extra large
            };
            var size = {
                width: screen.width,
                height: screen.height
            }, breakpoint = computeBreakpoint(screen.width), regionId = region.GetId();
            window.addEventListener('resize', function () {
                size.width = screen.width;
                size.height = screen.height;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'size', scope);
                var thisBreakpoint = computeBreakpoint(screen.width);
                if (thisBreakpoint !== breakpoint) {
                    breakpoint = thisBreakpoint;
                    window.dispatchEvent(new CustomEvent('screen.breakpoint', {
                        detail: thisBreakpoint
                    }));
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'breakpoint', scope);
                }
            });
            var scope = ExtendedDirectiveHandlers.AddScope('screen', region.AddElement(element, true), []);
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'size') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return size;
                }
                if (prop === 'breakpoint') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return breakpoint;
                }
            }, ['size', 'breakpoint']);
            InlineJS.Region.AddGlobal('$screen', function () { return proxy; });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Cart = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal('$cart', region.GetId())) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var handlers = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (!handlers) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var scope = ExtendedDirectiveHandlers.AddScope('cart', region.AddElement(element, true), []), regionId = region.GetId(), updatesQueue = null;
            var info = {
                items: {},
                itemProxies: {},
                count: 0,
                total: 0
            };
            var computeValues = function () {
                var count = 0, total = 0;
                for (var sku in info.items) {
                    count += info.items[sku].quantity;
                    total += (info.items[sku].price * info.items[sku].quantity);
                }
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
                if (!item) {
                    return;
                }
                var sku = item.product.sku;
                if (sku in info.items) { //Update exisiting
                    if (info.items[sku].quantity != item.quantity) {
                        info.items[sku].quantity = item.quantity;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), "items." + sku + ".quantity", scope);
                        alert("items." + sku + ".quantity");
                    }
                    if (info.items[sku].price != item.price) {
                        info.items[sku].price = item.price;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), "items." + sku + ".price", scope);
                    }
                }
                else { //Add new
                    info.items[sku] = item;
                    info.itemProxies[sku] = createItemProxy(sku);
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                }
                computeValues();
            };
            var update = function (sku, quantity, incremental) {
                if (updatesQueue) { //Defer
                    updatesQueue.push(function () {
                        update(sku, quantity, incremental);
                    });
                    return;
                }
                if (handlers.update) {
                    handlers.update(sku, quantity, incremental, postUpdate);
                    return;
                }
                if (!handlers.updateLink) {
                    return;
                }
                fetch(handlers.updateLink + "?sku=" + sku + "&quantity=" + quantity + "&incremental=" + incremental, {
                    method: 'GET',
                    credentials: 'same-origin'
                }).then(function (response) { return response.json(); }).then(postUpdate);
            };
            var clear = function () { return update(null, 0, false); };
            var createItemProxy = function (sku) {
                return InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                    if (prop === 'quantity') {
                        if (sku in info.items) {
                            InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items." + sku + "." + prop);
                            return info.items[sku].quantity;
                        }
                        return 0;
                    }
                    if (prop === 'price') {
                        if (sku in info.items) {
                            InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items." + sku + "." + prop);
                            return info.items[sku].price;
                        }
                        return 0;
                    }
                    if (prop === 'product') {
                        if (sku in info.items) {
                            return info.items[sku].product;
                        }
                        return null;
                    }
                }, ['quantity', 'price', 'product']);
            };
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in info && prop !== 'itemProxies') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return ((prop === 'items') ? info.itemProxies : info[prop]);
                }
                if (prop === 'update') {
                    return update;
                }
                if (prop === 'clear') {
                    return clear;
                }
            }, ['items', 'count', 'total', 'update', 'clear']);
            handlers.load = function (items) {
                info.items = (items || {});
                info.itemProxies = {};
                for (var sku in info.items) { //Create proxies
                    info.itemProxies[sku] = createItemProxy(sku);
                }
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                computeValues();
                (updatesQueue || []).forEach(function (callback) {
                    try {
                        callback();
                    }
                    catch (err) { }
                });
                updatesQueue = null;
            };
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
                if (!sku) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
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
                if (!sku) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    update(sku, -1, true);
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            if (handlers.init) {
                handlers.init();
            }
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
            var open = function (myRegion) {
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
            }, __spreadArrays(Object.keys(options), Object.keys(scope.callbacks)));
            open(region);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Auth = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal('$auth', region.GetId())) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var userUrl = window.location.origin + "/auth/user";
            var registerUrl = window.location.origin + "/auth/register";
            var loginUrl = window.location.origin + "/auth/login";
            var logoutUrl = window.location.origin + "/auth/logout";
            var data = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), userData = null, isInit = false;
            if (!InlineJS.Region.IsObject(data)) { //Retrieve data
                fetch(userUrl, {
                    method: 'GET',
                    credentials: 'same-origin'
                }).then(function (response) { return response.json(); }).then(function (data) {
                    if (!isInit) {
                        isInit = true;
                        alertAll();
                        userData = (data.userData || null);
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
            var methods = {
                check: function () {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".check");
                    return !!userData;
                },
                hasRole: function (name) {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".roles");
                    return (userData && Array.isArray(userData.roles) && userData.roles.indexOf(name) != -1);
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
                logout: function (callback) {
                    if (!userData) {
                        return;
                    }
                    fetch(logoutUrl, {
                        method: 'GET',
                        credentials: 'same-origin'
                    }).then(function (response) { return response.json(); }).then(function (data) {
                        isInit = true;
                        if (!callback || callback(data)) {
                            alertAll();
                            userData = null;
                            window.dispatchEvent(new CustomEvent('auth.authentication', {
                                detail: false
                            }));
                        }
                    });
                },
                authenticate: function (login, form, callback) {
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
                    }).then(function (response) { return response.json(); }).then(function (data) {
                        isInit = true;
                        if (!callback || callback(data)) {
                            userData = (data.userData || {});
                            alertAll();
                            window.dispatchEvent(new CustomEvent('auth.authentication', {
                                detail: true
                            }));
                        }
                    });
                },
                login: function (form, callback) {
                    methods.authenticate(true, form, callback);
                },
                register: function (form, callback) {
                    methods.authenticate(false, form, callback);
                }
            };
            var scope = ExtendedDirectiveHandlers.AddScope('auth', region.AddElement(element, true), []), regionId = region.GetId();
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop in methods) {
                    return methods[prop];
                }
            }, Object.keys(methods));
            InlineJS.Region.AddGlobal('$auth', function () { return proxy; });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Geolocation = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal('$geolocation', region.GetId())) {
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
            };
            var setError = function (value) {
                error = value;
                window.dispatchEvent(new CustomEvent('geolocation.error', {
                    detail: value
                }));
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'error', scope);
            };
            var request = function () {
                if (!requested && check()) {
                    requested = true;
                    navigator.geolocation.getCurrentPosition(setPosition, setError);
                }
            };
            var track = function () {
                if (!tracking && check()) {
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
            var scope = ExtendedDirectiveHandlers.AddScope('geolocation', region.AddElement(element, true), []);
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'position') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return position;
                }
                if (prop === 'error') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return error;
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
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    request();
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('geolocationTrack', function (innerRegion, innerElement, innerDirective) {
                innerElement.addEventListener('click', function (e) {
                    e.preventDefault();
                    track();
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
                    options['rootMargin'] = 0;
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
        ExtendedDirectiveHandlers.FetchLoad = function (element, url, append, onLoad) {
            if (!url || !(url = url.trim())) {
                return;
            }
            var removeAll = function (force) {
                if (force === void 0) { force = false; }
                if (force || !append) {
                    while (element.firstElementChild) {
                        element.removeChild(element.firstElementChild);
                    }
                }
            };
            var fetch = function (url, callback) {
                window.fetch(url).then(function (response) { return response.text(); }).then(function (data) {
                    try {
                        callback(JSON.parse(data));
                    }
                    catch (err) {
                        callback(data);
                    }
                    if (onLoad) {
                        onLoad();
                    }
                });
            };
            var fetchList = function (url, callback) {
                fetch(url, function (data) {
                    removeAll();
                    if (Array.isArray(data)) {
                        data.forEach(callback);
                    }
                    else if (typeof data === 'string') {
                        element.innerHTML = data;
                    }
                });
            };
            var onEvent = function () {
                element.removeEventListener('load', onEvent);
                onLoad();
            };
            if (url === '::unload::') {
                if (element.tagName === 'IMG' || element.tagName === 'IFRAME') {
                    element.src = '';
                }
                else {
                    removeAll(true);
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
                fetch(url, function (data) {
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
        ExtendedDirectiveHandlers.Alert = function (region, prop, prefix) {
            region.GetChanges().Add({
                regionId: region.GetId(),
                type: 'set',
                path: (prefix ? ((typeof prefix === 'string') ? prefix : prefix.path) + "." + prop : prop),
                prop: prop,
                origin: region.GetChanges().GetOrigin()
            });
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
        ExtendedDirectiveHandlers.AddAll = function () {
            InlineJS.DirectiveHandlerManager.AddHandler('watch', ExtendedDirectiveHandlers.Watch);
            InlineJS.DirectiveHandlerManager.AddHandler('when', ExtendedDirectiveHandlers.When);
            InlineJS.DirectiveHandlerManager.AddHandler('once', ExtendedDirectiveHandlers.Once);
            InlineJS.DirectiveHandlerManager.AddHandler('input', ExtendedDirectiveHandlers.Input);
            InlineJS.DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            InlineJS.DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            InlineJS.DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('lazyLoad', ExtendedDirectiveHandlers.LazyLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);
            InlineJS.DirectiveHandlerManager.AddHandler('animate', ExtendedDirectiveHandlers.Animate);
            InlineJS.DirectiveHandlerManager.AddHandler('typewriter', ExtendedDirectiveHandlers.Typewriter);
            InlineJS.DirectiveHandlerManager.AddHandler('router', ExtendedDirectiveHandlers.Router);
            InlineJS.DirectiveHandlerManager.AddHandler('screen', ExtendedDirectiveHandlers.Screen);
            InlineJS.DirectiveHandlerManager.AddHandler('cart', ExtendedDirectiveHandlers.Cart);
            InlineJS.DirectiveHandlerManager.AddHandler('db', ExtendedDirectiveHandlers.DB);
            InlineJS.DirectiveHandlerManager.AddHandler('auth', ExtendedDirectiveHandlers.Auth);
            InlineJS.DirectiveHandlerManager.AddHandler('geolocation', ExtendedDirectiveHandlers.Geolocation);
            var buildGlobal = function (name) {
                InlineJS.Region.AddGlobal("$$" + name, function (regionId) {
                    return function (target) {
                        var local = (InlineJS.Region.Infer(target) || InlineJS.Region.Get(regionId)).GetLocal(target, "$" + name, true);
                        return ((local instanceof InlineJS.Value) ? local.Get() : local);
                    };
                });
            };
            buildGlobal('state');
            buildGlobal('attr');
            buildGlobal('xhr');
            buildGlobal('lazyLoad');
            buildGlobal('intersection');
            buildGlobal('db');
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
