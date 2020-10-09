"use strict";
var InlineJS;
(function (InlineJS) {
    class ExtendedDirectiveHandlers {
        static State(region, element, directive) {
            let options = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), delay = 750, lazy = false;
            if (options && typeof options === 'object') { //Retrieve options
                delay = (('delay' in options) ? options.delay : delay);
                lazy = (('lazy' in options) ? !!options.lazy : lazy);
            }
            return ExtendedDirectiveHandlers.ContextState(region, element, lazy, delay, null);
        }
        static ContextState(region, element, lazy, delay, info) {
            let isText = false, isUnknown = false, regionId = region.GetId();
            if (element.tagName === 'INPUT') {
                let type = element.type;
                isText = (type === 'text' || type === 'password' || type === 'email' || type === 'search' || type === 'number' || type === 'tel' || type === 'url');
            }
            else if (element.tagName === 'TEXTAREA') {
                isText = true;
            }
            else if (element.tagName !== 'SELECT') {
                isUnknown = true;
            }
            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('state', elementScope, ['isDirty', 'isTyping', 'isValid']);
            let isRoot = false, forceSet = false;
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
                    alert: (key) => {
                        let myRegion = InlineJS.Region.Get(regionId);
                        myRegion.GetChanges().Add({
                            type: 'set',
                            path: `${scope.path}.${key}`,
                            prop: key,
                            origin: myRegion.GetChanges().GetOrigin()
                        });
                    },
                    resetCallbacks: new Array()
                };
                elementScope.locals['$state'] = InlineJS.CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop in info.value) {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                        return info.value[prop];
                    }
                    if (prop === 'reset') {
                        return () => {
                            if (!info.doneInit) { //Nothing to reset
                                return;
                            }
                            info.doneInit = false;
                            info.count.isDirty = info.count.isTyping = info.count.isValid = 0;
                            info.value.isDirty = info.value.isTyping = info.value.isValid = false;
                            info.resetCallbacks.forEach(callback => callback());
                            finalize();
                        };
                    }
                    if (prop === 'onDirty') {
                        return (callback) => scope.callbacks['isDirty'].push(callback);
                    }
                    if (prop === 'onTyping') {
                        return (callback) => scope.callbacks['isTyping'].push(callback);
                    }
                    if (prop === 'onValid') {
                        return (callback) => scope.callbacks['isValid'].push(callback);
                    }
                }, [...Object.keys(info.value), 'reset', 'onDirty', 'onTyping', 'onValid']);
            }
            let setValue = (key, value) => {
                if (forceSet || value != info.value[key]) {
                    info.value[key] = value;
                    info.alert(key);
                    scope.callbacks[key].forEach(callback => callback(value));
                }
            };
            let finalize = () => {
                if (info.doneInit) {
                    return;
                }
                info.doneInit = true;
                forceSet = true;
                setValue('isDirty', (0 < info.count.isDirty));
                setValue('isTyping', false);
                setValue('isValid', (info.count.isValid == info.activeCount));
                forceSet = false;
            };
            if (isUnknown) { //Pass to offspring
                [...element.children].forEach((child) => ExtendedDirectiveHandlers.ContextState(region, child, lazy, delay, info));
                if (isRoot) { //Done
                    if (info.activeCount == 0) {
                        return InlineJS.DirectiveHandlerReturn.Nil;
                    }
                    finalize();
                }
                return InlineJS.DirectiveHandlerReturn.Handled;
            }
            let updateCount = (key, value, requireAll) => {
                if (info.doneInit) {
                    info.count[key] += value;
                    if (info.count[key] == 0) {
                        setValue(key, false);
                    }
                    else if (info.count[key] == info.activeCount || (info.count[key] > 0 && !requireAll)) {
                        setValue(key, true);
                    }
                    else {
                        setValue(key, false);
                    }
                }
                else if (value == 1) { //Initial update
                    info.count[key] += 1;
                }
            };
            let counter = 0, isDirty = false, isTyping = false, isValid = false;
            let stoppedTyping = () => {
                if (isTyping) {
                    isTyping = false;
                    updateCount('isTyping', -1, false);
                }
                if (lazy && element.checkValidity() != isValid) {
                    isValid = !isValid;
                    updateCount('isValid', (isValid ? 1 : -1), true);
                }
            };
            let onEvent = () => {
                if (isText) {
                    let checkpoint = ++counter;
                    setTimeout(() => {
                        if (checkpoint == counter) {
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
                element.addEventListener('paste', onEvent);
                element.addEventListener('cut', onEvent);
                element.addEventListener('blur', stoppedTyping);
            }
            else {
                element.addEventListener('change', onEvent);
            }
            let initialState = () => {
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
        }
        static AttrChange(region, element, directive) {
            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('attrChange', elementScope, ['onChange']);
            let regionId = region.GetId(), info = {
                name: 'N/A',
                value: 'N/A'
            };
            elementScope.attributeChangeCallbacks.push((name) => {
                let myRegion = InlineJS.Region.Get(regionId), value = element.getAttribute(name);
                info = {
                    name: name,
                    value: value
                };
                let key = myRegion.AddTemp(() => info);
                InlineJS.CoreDirectiveHandlers.Assign(myRegion, element, directive.value, `$__InlineJS_CallTemp__('${key}')`, () => info);
                Object.keys(info).forEach((key) => {
                    myRegion.GetChanges().Add({
                        type: 'set',
                        path: `${scope.path}.${key}`,
                        prop: key,
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                });
                Object.keys(scope.callbacks).forEach(key => scope.callbacks[key].forEach(callback => callback(value)));
            });
            elementScope.locals['$attr'] = InlineJS.CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in info) {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return info[prop];
                }
                if (prop in scope.callbacks) {
                    (callback) => scope.callbacks[prop].push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);
            let key = region.AddTemp(() => info);
            InlineJS.CoreDirectiveHandlers.Assign(region, element, directive.value, `$__InlineJS_CallTemp__('${key}')`, () => info);
            return InlineJS.DirectiveHandlerReturn.Handled;
        }
        static XHRLoad(region, element, directive) {
            let append = (state, isOnce = false) => {
                info.isAppend = state;
                info.isOnce = isOnce;
            };
            let regionId = region.GetId(), info = {
                url: '',
                isAppend: false,
                isOnce: false,
                isLoaded: false,
                append: append,
                reload: () => load('::reload::'),
                unload: () => load('::unload::')
            };
            let load = (url) => {
                ExtendedDirectiveHandlers.FetchLoad(element, ((url === '::reload::') ? info.url : url), info.isAppend, () => {
                    info.isLoaded = true;
                    let myRegion = InlineJS.Region.Get(regionId);
                    myRegion.GetChanges().Add({
                        type: 'set',
                        path: `${scope.path}.isLoaded`,
                        prop: 'isLoaded',
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                    Object.keys(scope.callbacks).forEach(key => scope.callbacks[key].forEach(callback => callback(true)));
                    if (info.isOnce) {
                        info.isAppend = !info.isAppend;
                        info.isOnce = false;
                    }
                });
            };
            region.GetState().TrapGetAccess(() => {
                let url = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                if (url !== info.url && typeof url === 'string') {
                    load(url);
                    info.url = url;
                }
            }, true);
            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('xhr', elementScope, ['onLoad']);
            elementScope.locals['$xhr'] = InlineJS.CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in info) {
                    if (prop === 'isLoaded') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    }
                    return info[prop];
                }
                if (prop in scope.callbacks) {
                    (callback) => scope.callbacks[prop].push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);
            return InlineJS.DirectiveHandlerReturn.Handled;
        }
        static LazyLoad(region, element, directive) {
            let options = ExtendedDirectiveHandlers.GetIntersectionOptions(region, element, directive.value);
            let url = (('url' in options) ? options['url'] : (('original' in options) ? options['original'] : null));
            if (!url || typeof url !== 'string') { //Ignore
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('xhr', elementScope, ['onLoad']);
            let regionId = region.GetId(), info = {
                isLoaded: false
            };
            ExtendedDirectiveHandlers.ObserveIntersection(region, element, options, (entry) => {
                if ((!(entry instanceof IntersectionObserverEntry) || !entry.isIntersecting) && entry !== false) {
                    return true;
                }
                ExtendedDirectiveHandlers.FetchLoad(element, url, false, () => {
                    info.isLoaded = true;
                    let myRegion = InlineJS.Region.Get(regionId);
                    myRegion.GetChanges().Add({
                        type: 'set',
                        path: `${scope.path}.isLoaded`,
                        prop: 'isLoaded',
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                    Object.keys(scope.callbacks).forEach(key => scope.callbacks[key].forEach(callback => callback(true)));
                });
                return false;
            });
            elementScope.locals['$lazyLoad'] = InlineJS.CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in info) {
                    if (prop === 'isLoaded') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    }
                    return info[prop];
                }
                if (prop in scope.callbacks) {
                    (callback) => scope.callbacks[prop].push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);
            return InlineJS.DirectiveHandlerReturn.Handled;
        }
        static Intersection(region, element, directive) {
            let regionId = region.GetId(), info = {
                ratio: 0,
                visible: false,
                supported: true,
                stopped: false
            };
            ExtendedDirectiveHandlers.ObserveIntersection(region, element, ExtendedDirectiveHandlers.GetIntersectionOptions(region, element, directive.value), (entry) => {
                if (info.stopped) {
                    return false;
                }
                if (entry instanceof IntersectionObserverEntry) {
                    let myRegion = InlineJS.Region.Get(regionId);
                    if (entry.isIntersecting != info.visible) { //Visibility changed
                        info.visible = entry.isIntersecting;
                        myRegion.GetChanges().Add({
                            type: 'set',
                            path: `${scope.path}.visible`,
                            prop: 'visible',
                            origin: myRegion.GetChanges().GetOrigin()
                        });
                        scope.callbacks['onVisible'].forEach(callback => callback(info.visible));
                    }
                    if (entry.intersectionRatio != info.ratio) {
                        info.ratio = entry.intersectionRatio;
                        InlineJS.Region.Get(regionId).GetChanges().Add({
                            type: 'set',
                            path: `${scope.path}.ratio`,
                            prop: 'ratio',
                            origin: myRegion.GetChanges().GetOrigin()
                        });
                        scope.callbacks['onRatio'].forEach(callback => callback(info.ratio));
                    }
                }
                else { //Not supported
                    info.supported = false;
                }
                return true;
            });
            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('intersection', elementScope, ['onVisible', 'onRatio']);
            elementScope.locals['$intersection'] = InlineJS.CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in info) {
                    if (prop === 'ratio' || prop === 'visible') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    }
                    return info[prop];
                }
                if (prop in scope.callbacks) {
                    (callback) => scope.callbacks[prop].push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);
            return InlineJS.DirectiveHandlerReturn.Handled;
        }
        static GetIntersectionOptions(region, element, expression) {
            let options = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, expression);
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
        }
        static ObserveIntersection(region, element, options, callback) {
            if (!('IntersectionObserver' in window)) {
                return callback(false);
            }
            let regionId = region.GetId(), elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$intObserver<${++ExtendedDirectiveHandlers.scopeId_}>`;
            let observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (callback(entry)) {
                        return;
                    }
                    let scope = InlineJS.Region.Get(regionId).GetElementScope(element);
                    if (scope && path in scope.intersectionObservers) {
                        scope.intersectionObservers[path].unobserve(element);
                        delete scope.intersectionObservers[path];
                    }
                });
            }, options);
            elementScope.intersectionObservers[path] = observer;
            observer.observe(element);
        }
        static FetchLoad(element, url, append, onLoad) {
            if (!(url = url.trim())) {
                return;
            }
            let removeAll = (force = false) => {
                if (force || !append) {
                    [...element.children].forEach(child => element.removeChild(child));
                }
            };
            let fetch = (url, callback) => {
                window.fetch(url).then(response => response.text()).then((data) => {
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
            let fetchList = (url, callback) => {
                fetch(url, (data) => {
                    removeAll();
                    if (Array.isArray(data)) {
                        data.forEach(callback);
                    }
                    else if (typeof data === 'string') {
                        element.innerHTML = data;
                    }
                });
            };
            let onEvent = () => {
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
                fetchList(url, (item) => {
                    if (item && typeof item === 'object' && 'value' in item && 'text' in item) {
                        let option = document.createElement('option');
                        option.value = item['value'];
                        option.textContent = item['text'];
                        element.appendChild(option);
                    }
                });
            }
            else if (element.tagName === 'UL' || element.tagName === 'OL') {
                fetchList(url, (item) => {
                    if (item && typeof item === 'object' && 'value' in item && 'text' in item) {
                        let li = document.createElement('li');
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
                fetch(url, (data) => {
                    if (append) {
                        let tmpl = document.createElement('template');
                        tmpl.innerHTML = ((typeof data === 'string') ? data : data.toString());
                        tmpl.content.childNodes.forEach(child => element.appendChild(child));
                    }
                    else {
                        removeAll();
                        element.innerHTML = ((typeof data === 'string') ? data : data.toString());
                    }
                });
            }
        }
        static AddScope(prefix, elementScope, callbacks) {
            let id = `${prefix}<${++ExtendedDirectiveHandlers.scopeId_}>`;
            ExtendedDirectiveHandlers.scopes_[id] = {
                id: id,
                path: `${elementScope.key}.$${id}`,
                callbacks: new Map()
            };
            (callbacks || []).forEach(key => ExtendedDirectiveHandlers.scopes_[id].callbacks[key] = new Array());
            return ExtendedDirectiveHandlers.scopes_[id];
        }
        static AddAll() {
            InlineJS.DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            InlineJS.DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            InlineJS.DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('lazyLoad', ExtendedDirectiveHandlers.LazyLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);
            let buildGlobal = (name) => {
                InlineJS.Region.AddGlobal(`$$${name}`, (regionId) => {
                    return (target) => {
                        let local = (InlineJS.Region.Infer(target) || InlineJS.Region.Get(regionId)).GetLocal(target, `$${name}`, true);
                        return ((local instanceof InlineJS.Value) ? local.Get() : local);
                    };
                });
            };
            buildGlobal('state');
            buildGlobal('attr');
            buildGlobal('xhr');
            buildGlobal('lazyLoad');
            buildGlobal('intersection');
        }
    }
    ExtendedDirectiveHandlers.scopeId_ = 0;
    ExtendedDirectiveHandlers.scopes_ = new Map();
    InlineJS.ExtendedDirectiveHandlers = ExtendedDirectiveHandlers;
    (function () {
        ExtendedDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
