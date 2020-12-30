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
    var OpacityAnimator = /** @class */ (function () {
        function OpacityAnimator(element, css) {
            this.delta_ = (Number.parseInt((css || getComputedStyle(element)).opacity) || 1);
        }
        OpacityAnimator.prototype.step = function (element, show, sync, ellapsed, duration, ease) {
            if (sync || this.delta_ <= 0) {
                this.delta_ = (Number.parseInt(getComputedStyle(element).opacity) || 1);
            }
            element.style.opacity = (show ? ease(ellapsed, 0, this.delta_, duration) : (this.delta_ - ease(ellapsed, 0, this.delta_, duration))).toString();
        };
        return OpacityAnimator;
    }());
    InlineJS.OpacityAnimator = OpacityAnimator;
    var HeightAnimator = /** @class */ (function () {
        function HeightAnimator(reversed_, element, css) {
            this.reversed_ = reversed_;
            this.delta_ = Math.round(element.clientHeight);
            this.margin_ = (Number.parseInt((css || getComputedStyle(element)).marginTop) || 0);
        }
        HeightAnimator.prototype.step = function (element, show, sync, ellapsed, duration, ease) {
            if (sync || this.delta_ <= 0) {
                this.delta_ = Math.round(element.clientHeight);
            }
            var value = Math.round(show ? ease(ellapsed, 0, this.delta_, duration) : (this.delta_ - ease(ellapsed, 0, this.delta_, duration)));
            element.style.height = value + "px";
            if (this.reversed_) {
                element.style.marginTop = (this.margin_ + (this.delta_ - value)) + "px";
            }
        };
        return HeightAnimator;
    }());
    InlineJS.HeightAnimator = HeightAnimator;
    var WidthAnimator = /** @class */ (function () {
        function WidthAnimator(reversed_, element, css) {
            this.reversed_ = reversed_;
            this.delta_ = Math.round(element.clientWidth);
            this.margin_ = (Number.parseInt((css || getComputedStyle(element)).marginLeft) || 0);
        }
        WidthAnimator.prototype.step = function (element, show, sync, ellapsed, duration, ease) {
            if (sync || this.delta_ <= 0) {
                this.delta_ = Math.round(element.clientWidth);
            }
            var value = Math.round(show ? ease(ellapsed, 0, this.delta_, duration) : (this.delta_ - ease(ellapsed, 0, this.delta_, duration)));
            element.style.width = value + "px";
            if (this.reversed_) {
                element.style.marginLeft = (this.margin_ + (this.delta_ - value)) + "px";
            }
        };
        return WidthAnimator;
    }());
    InlineJS.WidthAnimator = WidthAnimator;
    var SlideAnimator = /** @class */ (function () {
        function SlideAnimator(direction_, element, css) {
            this.direction_ = direction_;
            this.isWidth_ = (direction_ === 'left' || direction_ === 'right');
            this.delta_ = Math.round(this.isWidth_ ? element.clientWidth : element.clientHeight);
        }
        SlideAnimator.prototype.step = function (element, show, sync, ellapsed, duration, ease) {
            if (sync || this.delta_ <= 0) {
                this.delta_ = Math.round(this.isWidth_ ? element.clientWidth : element.clientHeight);
            }
            var value = ease(ellapsed, 0, this.delta_, duration);
            if (this.direction_ === 'down') {
                element.style.top = (show ? (value - this.delta_) : -value) + "px";
            }
            else if (this.direction_ === 'left') {
                element.style.right = (show ? (value - this.delta_) : -value) + "px";
            }
            else if (this.direction_ === 'up') {
                element.style.bottom = (show ? (value - this.delta_) : -value) + "px";
            }
            else if (this.direction_ === 'right') {
                element.style.left = (show ? (value - this.delta_) : -value) + "px";
            }
        };
        return SlideAnimator;
    }());
    InlineJS.SlideAnimator = SlideAnimator;
    InlineJS.Animators = {
        opacity: function (element, css) { return new OpacityAnimator(element, css); },
        height: function (element, css) { return new HeightAnimator(false, element, css); },
        'height-reverse': function (element, css) { return new HeightAnimator(true, element, css); },
        width: function (element, css) { return new WidthAnimator(false, element, css); },
        'width-reverse': function (element, css) { return new WidthAnimator(true, element, css); },
        slide: function (element, css) { return new SlideAnimator('down', element, css); },
        'slide-down': function (element, css) { return new SlideAnimator('down', element, css); },
        'slide-left': function (element, css) { return new SlideAnimator('left', element, css); },
        'slide-up': function (element, css) { return new SlideAnimator('up', element, css); },
        'slide-right': function (element, css) { return new SlideAnimator('right', element, css); }
    };
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
                wrapper.appendChild(icon_1);
                icon_1.classList.add('material-icons-outlined');
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
                active: false,
                progress: 0,
                append: append,
                reload: function () { return load('::reload::'); },
                unload: function () { return load('::unload::'); }
            };
            var load = function (url) {
                info.active = true;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                ExtendedDirectiveHandlers.FetchLoad(element, ((url === '::reload::') ? info.url : url), info.isAppend, function () {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    if (url === '::unload::') {
                        return;
                    }
                    info.isLoaded = true;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'isLoaded', scope);
                    Object.keys(scope.callbacks).forEach(function (key) { return scope.callbacks[key].forEach(function (callback) { return InlineJS.CoreDirectiveHandlers.Call(regionId, callback, true); }); });
                    element.dispatchEvent(new CustomEvent("xhr.load"));
                    if (info.isOnce) {
                        info.isAppend = !info.isAppend;
                        info.isOnce = false;
                    }
                }, function (err) {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    element.dispatchEvent(new CustomEvent("xhr.error", {
                        detail: { error: err }
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
        ExtendedDirectiveHandlers.Animate = function (region, element, directive) {
            var animator = ExtendedDirectiveHandlers.PrepareAnimation(element, directive.arg.options);
            if (!animator) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var regionId = region.GetId(), lastValue = null, showOnly = directive.arg.options.includes('show'), hideOnly = (!showOnly && directive.arg.options.includes('hide'));
            region.GetState().TrapGetAccess(function () {
                lastValue = !!InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(regionId), element, directive.value);
                animator(lastValue, null, false);
            }, function () {
                if (lastValue != (!!InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(regionId), element, directive.value))) {
                    lastValue = !lastValue;
                    animator(lastValue, null, (lastValue ? !hideOnly : !showOnly));
                }
            }, element);
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
            var lineIndex = -1, index = 0, line, isDeleting = false, span = document.createElement('span'), duration, startTimestamp = null, stopped = false;
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
                if (!stopped) {
                    requestAnimationFrame(pass);
                }
            };
            span.classList.add('typewriter-text');
            if (info.showCursor) {
                span.style.borderRight = '1px solid #333333';
            }
            element.appendChild(span);
            requestAnimationFrame(pass);
            region.AddElement(element).uninitCallbacks.push(function () {
                stopped = true;
            });
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
                var mount = function (url) {
                    info.active = true;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                    if (info.progress != 0) {
                        info.progress = 0;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'progress', scope);
                    }
                    ExtendedDirectiveHandlers.FetchLoad(info.mountElement, url, false, function () {
                        info.active = false;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'active', scope);
                        window.scrollTo({ top: -window.scrollY, left: 0 });
                        window.dispatchEvent(new CustomEvent('router.mount.load'));
                        InlineJS.Bootstrap.Reattach();
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
                width: screen.width,
                height: screen.height
            }, breakpoint = computeBreakpoint(screen.width), regionId = region.GetId();
            window.addEventListener('resize', function () {
                size.width = screen.width;
                size.height = screen.height;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'size', scope);
                var thisBreakpoint = computeBreakpoint(screen.width);
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
            });
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
            }, ['size', 'breakpoint', 'checkpoint']);
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
                if (ExtendedDirectiveHandlers.Report(regionId, item) || !item) {
                    return;
                }
                var sku = item.product.sku;
                if (sku in info.items) { //Update exisiting
                    if (info.items[sku].quantity != item.quantity) {
                        info.items[sku].quantity = item.quantity;
                        ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), "items." + sku + ".quantity", scope);
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
                }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(postUpdate)["catch"](function (err) {
                    ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                });
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
                desync: function (logout, callback) {
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
                        }
                    })["catch"](function (err) {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback) {
                            callback(null, err);
                        }
                    });
                },
                logout: function (callback) {
                    methods.desync(true, callback);
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
                    }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(function (data) {
                        isInit = true;
                        if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!callback || callback(data))) {
                            userData = (data || {});
                            alertAll();
                            window.dispatchEvent(new CustomEvent('auth.authentication', {
                                detail: true
                            }));
                            redirect(true);
                        }
                    })["catch"](function (err) {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback) {
                            callback(null, err);
                        }
                    });
                },
                login: function (form, callback) {
                    methods.authenticate(true, form, callback);
                },
                register: function (form, errorBag, callback) {
                    methods.authenticate(false, form, function (data, err) {
                        if (errorBag && 'failed' in data) {
                            for (var key in errorBag) {
                                var value = (data.failed[key] || []);
                                errorBag[key] = (Array.isArray(value) ? value : [value]);
                            }
                            return false;
                        }
                        return (!callback || callback(data, err));
                    });
                },
                update: function (form, errorBag, callback) {
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
                        }
                        else if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!callback || callback(data))) {
                            userData = (data || {});
                            alertAll();
                        }
                    })["catch"](function (err) {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback) {
                            callback(null, err);
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
                innerElement.addEventListener('submit', function (e) {
                    e.preventDefault();
                    methods.register(innerElement, data.errorBag, data.callback);
                });
                var redirectWatch = function (e) {
                    setTimeout(function () {
                        if (redirectWatch) {
                            redirect(e.detail, true);
                        }
                    }, 3000);
                };
                if (!shouldRefresh) {
                    window.addEventListener('auth.authentication', redirectWatch);
                    innerRegion.AddElement(innerElement).uninitCallbacks.push(function () {
                        window.removeEventListener('auth.authentication', redirectWatch);
                        redirectWatch = null;
                    });
                }
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('authLogin', function (innerRegion, innerElement, innerDirective) {
                if (!(innerElement instanceof HTMLFormElement)) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                var callback = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                innerElement.addEventListener('submit', function (e) {
                    e.preventDefault();
                    methods.login(innerElement, callback);
                });
                var redirectWatch = function (e) {
                    setTimeout(function () {
                        if (redirectWatch) {
                            redirect(e.detail, true);
                        }
                    }, 3000);
                };
                window.addEventListener('auth.authentication', redirectWatch);
                innerRegion.AddElement(innerElement).uninitCallbacks.push(function () {
                    window.removeEventListener('auth.authentication', redirectWatch);
                    redirectWatch = null;
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
                innerElement.addEventListener('submit', function (e) {
                    e.preventDefault();
                    methods.update(innerElement, data.errorBag, data.callback);
                });
                return InlineJS.DirectiveHandlerReturn.Handled;
            });
            InlineJS.DirectiveHandlerManager.AddHandler('authLogout', function (innerRegion, innerElement, innerDirective) {
                var callback = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                if (innerElement instanceof HTMLFormElement) {
                    innerElement.addEventListener('submit', function (e) {
                        e.preventDefault();
                        methods.logout(callback);
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
            var data = (InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value) || {}), regionId = region.GetId(), active = false;
            var info = {
                action: (data.action || element.action),
                method: (data.method || element.method),
                errorBag: data.errorBag,
                callback: data.callback,
                confirmInfo: data.confirmInfo
            };
            if (!info.action) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var options = {
                confirm: false,
                reload: false,
                files: false
            };
            Object.keys(options).forEach(function (key) {
                if (directive.arg.options.indexOf(key) != -1) {
                    options[key] = true;
                }
            });
            var elementScope = region.AddElement(element, true);
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
            var submit = function (checkConfirm) {
                if (checkConfirm === void 0) { checkConfirm = true; }
                if (checkConfirm && options.confirm) {
                    var reporter = InlineJS.Region.GetGlobalValue(regionId, '$reporter');
                    if (reporter && reporter.confirm) { //Confirm before proceeding
                        reporter.confirm((info.confirmInfo || 'Please confirm your action.'), function () { return submit(false); });
                        return;
                    }
                }
                var body = null;
                if (options.files) {
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
                setActiveState(true);
                fetch(info.action, {
                    method: (info.method || 'POST'),
                    credentials: 'same-origin',
                    body: body
                }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(function (data) {
                    setActiveState(false);
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
                })["catch"](function (err) {
                    setActiveState(false);
                    ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                    if (info.callback) {
                        info.callback(null, err);
                    }
                });
            };
            element.addEventListener('submit', function (e) {
                e.preventDefault();
                submit();
            });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.FormSubmit = function (region, element, directive) {
            InlineJS.CoreDirectiveHandlers.Attr(region, element, InlineJS.Processor.GetDirectiveWith('x-attr:disabled', '$form.active'));
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        ExtendedDirectiveHandlers.Modal = function (region, element, directive) {
            if (InlineJS.Region.GetGlobal(region.GetId(), '$modal')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var scope = ExtendedDirectiveHandlers.AddScope('modal', region.AddElement(element, true), []), regionId = region.GetId(), show = false, url = null, active = false;
            var countainer = document.createElement('div'), mount = document.createElement('div'), overlay = InlineJS.Region.GetGlobalValue(regionId, '$overlay');
            countainer.classList.add('inlinejs-modal');
            if (element.style.zIndex) {
                countainer.style.zIndex = element.style.zIndex;
            }
            else { //Compute z-index
                countainer.style.zIndex = (overlay ? ((overlay.zIndex || 1000) + 9) : 1009);
            }
            countainer.setAttribute('x-data', '');
            countainer.setAttribute('x-animate.opacity', '$modal.show');
            countainer.setAttribute('x-overlay-bind', '$modal.show');
            mount.classList.add('inlinejs-modal-mount');
            mount.setAttribute('x-xhr-load', '$modal.url');
            mount.setAttribute('x-on:click.mobile.outside', '$modal.show = false');
            mount.setAttribute('x-bind', '$modal.active = $xhr.active');
            countainer.appendChild(mount);
            document.body.appendChild(countainer);
            var setShow = function (value) {
                show = value;
                ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'show', scope);
            };
            var setUrl = function (value) {
                if (!active) {
                    url = value;
                    ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'url', scope);
                }
            };
            var reload = function () {
                setShow(false);
                setUrl('::unload::');
            };
            mount.addEventListener('xhr.load', function () { return setShow(true); });
            mount.addEventListener('xhr.reload', function () { return setShow(true); });
            window.addEventListener('router.load', reload);
            window.addEventListener('router.reload', reload);
            region.AddOutsideEventCallback(mount, 'click', function () {
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
                    onLoad();
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
        ExtendedDirectiveHandlers.Alert = function (region, prop, prefix) {
            region.GetChanges().Add({
                regionId: region.GetId(),
                type: 'set',
                path: (prefix ? ((typeof prefix === 'string') ? prefix : prefix.path) + "." + prop : prop),
                prop: prop,
                origin: region.GetChanges().GetOrigin()
            });
        };
        ExtendedDirectiveHandlers.Report = function (regionId, info) {
            var reporter = InlineJS.Region.GetGlobalValue(regionId, '$reporter');
            return (reporter && reporter.report && reporter.report(info));
        };
        ExtendedDirectiveHandlers.ReportServerError = function (regionId, err) {
            var reporter = InlineJS.Region.GetGlobalValue(regionId, '$reporter');
            return (reporter && reporter.reportServerError && reporter.reportServerError(err));
        };
        ExtendedDirectiveHandlers.InitAnimation = function (element, options, css, callback) {
            var animators = {};
            css = (css || getComputedStyle(element));
            options.forEach(function (key) {
                if (key in InlineJS.Animators) {
                    animators[key] = InlineJS.Animators[key](element, css);
                }
                else if (callback) {
                    callback(key);
                }
            });
            return animators;
        };
        ExtendedDirectiveHandlers.PrepareAnimation = function (element, options) {
            var displays = ['block', 'flex', 'inline', 'inline-block', 'inline-flex', 'table'];
            var css = getComputedStyle(element), display = null, sync = options.includes('sync');
            var duration = null, animators = ExtendedDirectiveHandlers.InitAnimation(element, options, css, function (key) {
                if (displays.includes(key)) {
                    display = key;
                    return;
                }
                switch (key) {
                    case 'slower':
                        duration = 1000;
                        break;
                    case 'slow':
                        duration = 750;
                        break;
                    case 'normal':
                        duration = 500;
                        break;
                    case 'fast':
                        duration = 300;
                        break;
                    case 'faster':
                        duration = 200;
                        break;
                    default:
                        duration = InlineJS.CoreDirectiveHandlers.ExtractDuration(key, null);
                        break;
                }
            });
            duration = (duration || 300);
            display = (display || css.display || 'block');
            var keys = Object.keys(animators);
            if (keys.length == 0) { //Default
                animators['opacity'] = InlineJS.Animators.opacity(element, css);
                keys.push('opacity');
            }
            var ease = function (time, start, value, duration) {
                return ((time < duration) ? (-value * Math.cos(time / duration * (Math.PI / 2)) + value + start) : value);
            };
            var checkpoint = 0;
            return function (show, callback, animate) {
                if (animate === void 0) { animate = true; }
                if (!animate) {
                    if (show) {
                        element.style.display = display;
                        if (callback) {
                            callback();
                        }
                    }
                    else if (!callback || callback() !== false) {
                        element.style.display = 'none';
                    }
                    return;
                }
                var lastCheckpoint = ++checkpoint, startTimestamp = null, done = false;
                var end = function () {
                    done = true;
                    keys.forEach(function (key) { return animators[key].step(element, show, sync, duration, duration, ease); });
                    element.dispatchEvent(new CustomEvent('animation.leaving'));
                    if ((!callback || callback() !== false) && !show) {
                        element.style.display = 'none';
                    }
                    element.dispatchEvent(new CustomEvent('animation.leave'));
                };
                var pass = function (timestamp) {
                    if (startTimestamp === null) {
                        startTimestamp = timestamp;
                    }
                    if (done || lastCheckpoint != checkpoint) {
                        return;
                    }
                    var ellapsed = (timestamp - startTimestamp);
                    if (ellapsed < duration) {
                        keys.forEach(function (key) { return animators[key].step(element, show, sync, ellapsed, duration, ease); });
                        requestAnimationFrame(pass);
                    }
                    else { //End
                        end();
                    }
                };
                setTimeout(function () {
                    if (!done && lastCheckpoint == checkpoint) {
                        end();
                    }
                }, (duration + 100));
                requestAnimationFrame(pass);
                element.dispatchEvent(new CustomEvent('animation.entering'));
                if (show) {
                    element.style.display = display;
                    getComputedStyle(element);
                }
                element.dispatchEvent(new CustomEvent('animation.entered'));
            };
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
            InlineJS.CoreDirectiveHandlers.PrepareAnimation = ExtendedDirectiveHandlers.PrepareAnimation;
            InlineJS.DirectiveHandlerManager.AddHandler('watch', ExtendedDirectiveHandlers.Watch);
            InlineJS.DirectiveHandlerManager.AddHandler('when', ExtendedDirectiveHandlers.When);
            InlineJS.DirectiveHandlerManager.AddHandler('once', ExtendedDirectiveHandlers.Once);
            InlineJS.DirectiveHandlerManager.AddHandler('input', ExtendedDirectiveHandlers.Input);
            InlineJS.DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            InlineJS.DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            InlineJS.DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('lazyLoad', ExtendedDirectiveHandlers.LazyLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);
            InlineJS.DirectiveHandlerManager.AddHandler('busy', ExtendedDirectiveHandlers.Busy);
            InlineJS.DirectiveHandlerManager.AddHandler('activeGroup', ExtendedDirectiveHandlers.ActiveGroup);
            InlineJS.DirectiveHandlerManager.AddHandler('animate', ExtendedDirectiveHandlers.Animate);
            InlineJS.DirectiveHandlerManager.AddHandler('typewriter', ExtendedDirectiveHandlers.Typewriter);
            InlineJS.DirectiveHandlerManager.AddHandler('router', ExtendedDirectiveHandlers.Router);
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
            buildGlobal('busy');
            buildGlobal('db');
            buildGlobal('form');
            buildGlobal('counter');
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
