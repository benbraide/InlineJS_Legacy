"use strict";
var InlineJS;
(function (InlineJS) {
    class ExtendedDirectiveHandlers {
        static State(region, element, directive) {
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
            let options = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), delay = 750, lazy = false, reported = false;
            if (options && typeof options === 'object') { //Retrieve options
                delay = (('delay' in options) ? options.delay : delay);
                lazy = (('lazy' in options) ? !!options.lazy : lazy);
            }
            let info = {
                isDirty: false,
                isTyping: false,
                isValid: false
            };
            let elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$state<${++ExtendedDirectiveHandlers.stateId_}>`;
            let addLocalKey = (map, key) => {
                map[key] = new InlineJS.Value(() => {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(`${path}.${key}`);
                    return info[key];
                });
            };
            let parentState = region.GetLocal(region.GetElementAncestor(element, 0), '$state', false);
            let hasParentState = (parentState && !(parentState instanceof InlineJS.NoResult));
            let setLocalValue = (key, value, initial) => {
                info[key] = value;
                if (!hasParentState || !('parent' in parentState)) {
                    InlineJS.Region.Get(regionId).GetChanges().Add({
                        type: 'set',
                        path: `${path}.${key}`,
                        prop: key
                    });
                }
                else { //Alert parent
                    parentState.parent[key](value, initial);
                }
            };
            let locals = new Map();
            if (!hasParentState || !('parent' in parentState)) {
                Object.keys(info).forEach(key => addLocalKey(locals, key));
            }
            let getDirective = () => {
                return {
                    original: '',
                    parts: null,
                    raw: '',
                    key: '',
                    value: `{delay:${delay},lazy:${lazy}}`
                };
            };
            elementScope.locals['$state'] = locals;
            if (isUnknown) {
                let childCount = element.children.length;
                if (childCount == 0) {
                    elementScope.postProcessCallbacks.push(() => {
                        setLocalValue('isValid', true, true);
                        setLocalValue('isTyping', false, true);
                        setLocalValue('isDirty', false, true);
                    });
                    return InlineJS.DirectiveHandlerReturn.Handled;
                }
                let counts = {
                    isDirty: 0,
                    isTyping: 0,
                    isValid: 0
                };
                let initialCounts = {
                    isDirty: 0,
                    isTyping: 0,
                    isValid: 0
                };
                let updateCount = (key, value, requireAll, initial) => {
                    if (initial && (++initialCounts[key] < childCount || value == -1)) {
                        if (value == 1) {
                            counts[key] += value;
                        }
                        return;
                    }
                    counts[key] += value;
                    if ((counts[key] == 0 || (counts[key] < childCount && requireAll)) && info[key]) {
                        setLocalValue(key, false, initial);
                    }
                    else if (counts[key] > 0 && !info[key] && (!requireAll || counts[key] == childCount)) {
                        setLocalValue(key, true, initial);
                    }
                };
                locals['parent'] = {
                    isDirty: (value, initial) => updateCount('isDirty', (value ? 1 : -1), false, initial),
                    isTyping: (value, initial) => updateCount('isTyping', (value ? 1 : -1), false, initial),
                    isValid: (value, initial) => updateCount('isValid', (value ? 1 : -1), true, initial)
                };
                setTimeout(() => [...element.children].forEach((child) => {
                    ExtendedDirectiveHandlers.State(region, child, getDirective());
                    InlineJS.Processor.Post(region, child);
                }), 0);
                locals['reset'] = () => {
                    [...element.children].forEach((child) => {
                        let myRegion = InlineJS.Region.Get(regionId);
                        let childState = myRegion.GetLocal(myRegion.GetElementAncestor(child, 0), '$state', false);
                        if (childState && !(childState instanceof InlineJS.NoResult) && 'reset' in childState) {
                            childState.reset();
                        }
                    });
                };
            }
            else { //Input element
                let counter = 0;
                let onEvent = () => {
                    let checkpoint = ++counter;
                    setTimeout(() => {
                        if (checkpoint != counter) {
                            return;
                        }
                        if (isText && info.isTyping) {
                            setLocalValue('isTyping', false, false);
                        }
                        if (lazy && element.checkValidity() != info.isValid) {
                            setLocalValue('isValid', !info.isValid, false);
                        }
                    }, delay);
                    if (isText && !info.isTyping) {
                        setLocalValue('isTyping', true, false);
                    }
                    if (!info.isDirty) {
                        setLocalValue('isDirty', true, false);
                    }
                    if (!lazy && element.checkValidity() != info.isValid) {
                        setLocalValue('isValid', !info.isValid, false);
                    }
                };
                if (isText) {
                    element.addEventListener('input', onEvent);
                    element.addEventListener('paste', onEvent);
                    element.addEventListener('cut', onEvent);
                    element.addEventListener('blur', () => {
                        if (info.isTyping) {
                            setLocalValue('isTyping', false, false);
                        }
                    });
                }
                else {
                    element.addEventListener('change', onEvent);
                }
                elementScope.postProcessCallbacks.push(() => {
                    setLocalValue('isValid', element.checkValidity(), true);
                    setLocalValue('isTyping', false, true);
                    setLocalValue('isDirty', false, true);
                });
                locals['reset'] = () => {
                    if (info.isDirty) {
                        setLocalValue('isDirty', false, false);
                    }
                    if (element.checkValidity() != info.isValid) {
                        setLocalValue('isValid', !info.isValid, false);
                    }
                };
            }
            return InlineJS.DirectiveHandlerReturn.Handled;
        }
        static AttrChange(region, element, directive) {
            let elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$attrChange<${++ExtendedDirectiveHandlers.attrChangeId_}>`;
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
                InlineJS.CoreDirectiveHandlers.Assign(myRegion, element, directive.value, `'${name}'`, () => name);
                myRegion.GetChanges().Add({
                    type: 'set',
                    path: path,
                    prop: ''
                });
            });
            elementScope.locals['$attr'] = new InlineJS.Value(() => {
                region.GetChanges().AddGetAccess(path);
                return info;
            });
            InlineJS.CoreDirectiveHandlers.Assign(region, element, directive.value, `'N/A'`, () => info);
            return InlineJS.DirectiveHandlerReturn.Handled;
        }
        static XHRLoad(region, element, directive) {
            let regionId = region.GetId(), previousUrl = '', append = false, once = false, loaded = false;
            let load = (url) => {
                ExtendedDirectiveHandlers.FetchLoad(element, ((url === '::reload::') ? previousUrl : url), append, () => {
                    loaded = true;
                    InlineJS.Region.Get(regionId).GetChanges().Add({
                        type: 'set',
                        path: `${path}.loaded`,
                        prop: 'loaded'
                    });
                    if (once) {
                        append = !append;
                        once = false;
                    }
                });
            };
            region.GetState().TrapGetAccess(() => {
                let url = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                if (url !== previousUrl && typeof url === 'string') {
                    previousUrl = url;
                    load(url);
                }
            }, true);
            let elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$xhr<${++ExtendedDirectiveHandlers.xhrId_}>`;
            elementScope.locals['$xhr'] = {
                loaded: new InlineJS.Value(() => {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(`${path}.loaded`);
                    return loaded;
                }),
                url: new InlineJS.Value(() => {
                    return previousUrl;
                }),
                isAppend: new InlineJS.Value(() => {
                    return append;
                }),
                isOnce: new InlineJS.Value(() => {
                    return once;
                }),
                append: (state, isOnce = false) => {
                    append = state;
                    once = isOnce;
                },
                reload: () => load('::reload::'),
                unload: () => load('::unload::')
            };
            return InlineJS.DirectiveHandlerReturn.Handled;
        }
        static Intersection(region, element, directive) {
            let options = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
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
                    threshold: 0
                };
            }
            let regionId = region.GetId(), previousRatio = 0, visible = false, supported = true, stopped = false;
            ExtendedDirectiveHandlers.ObserveIntersection(region, element, options, (entry) => {
                if (stopped) {
                    return false;
                }
                if (entry instanceof IntersectionObserverEntry) {
                    if (entry.isIntersecting != visible) { //Visibility changed
                        visible = entry.isIntersecting;
                        InlineJS.Region.Get(regionId).GetChanges().Add({
                            type: 'set',
                            path: `${path}.visible`,
                            prop: 'visible'
                        });
                    }
                    if (entry.intersectionRatio != previousRatio) {
                        previousRatio = entry.intersectionRatio;
                        InlineJS.Region.Get(regionId).GetChanges().Add({
                            type: 'set',
                            path: `${path}.ratio`,
                            prop: 'ratio'
                        });
                    }
                }
                else { //Not supported
                    supported = false;
                }
                return true;
            });
            let elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$intersection<${++ExtendedDirectiveHandlers.intersectionId_}>`;
            elementScope.locals['$intersection'] = {
                ratio: new InlineJS.Value(() => {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(`${path}.ratio`);
                    return previousRatio;
                }),
                visible: new InlineJS.Value(() => {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(`${path}.visible`);
                    return visible;
                }),
                supported: new InlineJS.Value(() => {
                    return supported;
                }),
                stop: () => {
                    stopped = true;
                }
            };
            return InlineJS.DirectiveHandlerReturn.Handled;
        }
        static ObserveIntersection(region, element, options, callback) {
            if (!('IntersectionObserver' in window)) {
                return callback(false);
            }
            let regionId = region.GetId(), elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$intObserver<${++ExtendedDirectiveHandlers.intObserverId_}>`;
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
                window.fetch(url).then((response) => {
                    try {
                        return response.json();
                    }
                    catch (err) { }
                    return response.text();
                }).then((data) => {
                    callback(data);
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
                    removeAll();
                    element.innerHTML = ((typeof data === 'string') ? data : data.toString());
                });
            }
        }
        static AddAll() {
            InlineJS.DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            InlineJS.DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            InlineJS.DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            InlineJS.DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);
            let getEntry = (regionId, target, name, key) => {
                let map = (InlineJS.Region.Infer(target) || InlineJS.Region.Get(regionId)).GetLocal(target, name, false);
                if (!key) {
                    return ((map instanceof InlineJS.Value) ? map.Get() : map);
                }
                if (map && key in map) {
                    let entry = map[key];
                    return ((typeof entry === 'function') ? entry.bind(map) : ((entry instanceof InlineJS.Value) ? entry.Get() : entry));
                }
                return null;
            };
            let buildGlobals = (regionId, name, keys) => {
                let map = {};
                keys.forEach(key => map[key] = (target) => getEntry(regionId, target, name, key));
                return map;
            };
            InlineJS.Region.AddGlobal('$$state', (regionId) => buildGlobals(regionId, '$state', ['isDirty', 'isTyping', 'isValid', 'reset']));
            InlineJS.Region.AddGlobal('$$attr', (regionId) => (target) => getEntry(regionId, target, '$attr', null));
            InlineJS.Region.AddGlobal('$$xhr', (regionId) => buildGlobals(regionId, '$xhr', ['loaded', 'url', 'isAppend', 'isOnce', 'append', 'reload', 'unload']));
            InlineJS.Region.AddGlobal('$$intersection', (regionId) => buildGlobals(regionId, '$intersection', ['ratio', 'visible', 'supported', 'stop']));
        }
    }
    ExtendedDirectiveHandlers.stateId_ = 0;
    ExtendedDirectiveHandlers.attrChangeId_ = 0;
    ExtendedDirectiveHandlers.xhrId_ = 0;
    ExtendedDirectiveHandlers.intObserverId_ = 0;
    ExtendedDirectiveHandlers.intersectionId_ = 0;
    InlineJS.ExtendedDirectiveHandlers = ExtendedDirectiveHandlers;
    (function () {
        ExtendedDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
