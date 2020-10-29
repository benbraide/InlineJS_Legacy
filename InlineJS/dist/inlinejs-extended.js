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
        ExtendedDirectiveHandlers.State = function (region, element, directive) {
            var delay = 750, lazy = false;
            for (var i = 0; i < directive.arg.options.length; ++i) {
                if (directive.arg.options[i] === 'delay' && i < (directive.arg.options.length - 1)) {
                    delay = InlineJS.CoreDirectiveHandlers.ExtractDuration(directive.arg.options[i + 1], delay);
                }
                else if (directive.arg.options[i] === 'lazy') {
                    lazy = true;
                }
            }
            return ExtendedDirectiveHandlers.ContextState(region, element, lazy, delay, null);
        };
        ExtendedDirectiveHandlers.ContextState = function (region, element, lazy, delay, info) {
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
            var scope = ExtendedDirectiveHandlers.AddScope('state', elementScope, ['isDirty', 'isTyping', 'isValid']), isRoot = false, forceSet = false;
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
                            type: 'set',
                            path: scope.path + "." + key,
                            prop: key,
                            origin: myRegion.GetChanges().GetOrigin()
                        });
                    },
                    resetCallbacks: new Array()
                };
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
                Array.from(element.children).forEach(function (child) { return ExtendedDirectiveHandlers.ContextState(region, child, lazy, delay, info); });
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
                isAppend: false,
                isOnce: false,
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
            }, true);
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
            var type = (directive.arg.key || 'transition'), target = '', duration = 300, style = getComputedStyle(element);
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
                            target = option;
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
            var setTransitions = function (list) {
                var reduced = list.reduce(function (previous, current) { return (previous ? previous + ", " + current + " " + (duration || 300) + "ms ease" : current + " " + (duration || 300) + "ms ease"); }, '');
                if (element.style.transition) {
                    element.style.transition += ", " + reduced;
                }
                else {
                    element.style.transition = reduced;
                }
            };
            var height = style.height, width = style.width, padding = style.padding, borderWidth = style.borderWidth, isShown = false;
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
                var shouldUpdateSize_1 = true;
                var updateOpacity_1 = function (show) {
                    isShown = show;
                    if (show) {
                        element.style.opacity = '1';
                        if (shouldUpdateSize_1) {
                            element.style.padding = padding;
                            element.style.borderWidth = borderWidth;
                            element.style.height = height;
                        }
                    }
                    else {
                        element.style.opacity = '0';
                    }
                };
                if (!target || target === 'all') {
                    shouldUpdateSize_1 = false;
                    element.style.overflow = 'hidden';
                    setTransitions(['height', 'width', 'padding', 'border', 'opacity']);
                    update = function (show) {
                        updateSize_1(show);
                        updateOpacity_1(show);
                    };
                }
                else if (target === 'height' || target === 'width' || target === 'size') {
                    element.style.overflow = 'hidden';
                    setTransitions(['height', 'width', 'padding', 'border']);
                    update = updateSize_1;
                }
                else if (target === 'opacity') {
                    setTransitions(['opacity']);
                    update = updateOpacity_1;
                    element.addEventListener('transitionend', function () {
                        if (!isShown) {
                            element.style.padding = '0';
                            element.style.borderWidth = '0';
                            element.style.height = '0';
                        }
                    });
                }
            }
            else if (type in animationMap) { //Use Animate.css
                var inTarget_1 = "animate__" + animationMap[type]["in"], outTarget_1 = "animate__" + animationMap[type].out, lastTarget_1 = '';
                update = function (show) {
                    isShown = show;
                    element.style.padding = padding;
                    element.style.borderWidth = borderWidth;
                    element.style.height = height;
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
                element.style.animationDuration = duration + "ms";
                element.addEventListener('animationend', function () {
                    if (!isShown) {
                        element.style.padding = '0';
                        element.style.borderWidth = '0';
                        element.style.height = '0';
                    }
                });
            }
            else {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var regionId = region.GetId();
            region.GetState().TrapGetAccess(function () {
                update(!!InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(regionId), element, directive.value));
            }, true);
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
            if (!(url = url.trim())) {
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
        ExtendedDirectiveHandlers.AddScope = function (prefix, elementScope, callbacks) {
            var id = prefix + "<" + ++ExtendedDirectiveHandlers.scopeId_ + ">";
            ExtendedDirectiveHandlers.scopes_[id] = {
                id: id,
                path: elementScope.key + ".$" + id,
                callbacks: new Map()
            };
            (callbacks || []).forEach(function (key) { return ExtendedDirectiveHandlers.scopes_[id].callbacks[key] = new Array(); });
            return ExtendedDirectiveHandlers.scopes_[id];
        };
        ExtendedDirectiveHandlers.AddAll = function () {
            InlineJS.DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            InlineJS.DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            InlineJS.DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('lazyLoad', ExtendedDirectiveHandlers.LazyLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);
            InlineJS.DirectiveHandlerManager.AddHandler('animate', ExtendedDirectiveHandlers.Animate);
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
        };
        ExtendedDirectiveHandlers.scopeId_ = 0;
        ExtendedDirectiveHandlers.scopes_ = new Map();
        return ExtendedDirectiveHandlers;
    }());
    InlineJS.ExtendedDirectiveHandlers = ExtendedDirectiveHandlers;
    (function () {
        ExtendedDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
