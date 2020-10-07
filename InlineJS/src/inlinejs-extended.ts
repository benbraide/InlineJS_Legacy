namespace InlineJS{
    export interface StateDirectiveInfo{
        isDirty: boolean;
        isTyping: boolean;
        isValid: boolean;
    }
    
    export interface StateDirectiveCount{
        isDirty: number;
        isTyping: number;
        isValid: number;
    }
    
    export class ExtendedDirectiveHandlers{
        private static stateId_ = 0;
        private static attrChangeId_ = 0;
        private static xhrId_ = 0;
        private static intObserverId_ = 0;
        private static intersectionId_ = 0;
        
        public static State(region: Region, element: HTMLElement, directive: Directive){
            let isText: boolean = false, isUnknown: boolean = false, regionId = region.GetId();
            if (element.tagName === 'INPUT'){
                let type = (element as HTMLInputElement).type;
                isText = (type === 'text' || type === 'password' || type === 'email' || type === 'search' || type === 'number' || type === 'tel' || type === 'url');
            }
            else if (element.tagName === 'TEXTAREA'){
                isText = true;
            }
            else if (element.tagName !== 'SELECT'){
                isUnknown = true;
            }

            let options = CoreDirectiveHandlers.Evaluate(region, element, directive.value), delay = 750, lazy = false, reported = false;
            if (options && typeof options === 'object'){//Retrieve options
                delay = (('delay' in options) ? options.delay : delay);
                lazy = (('lazy' in options) ? !!options.lazy : lazy);
            }

            let info: StateDirectiveInfo = {
                isDirty: false,
                isTyping: false,
                isValid: false
            };

            let elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$state<${++ExtendedDirectiveHandlers.stateId_}>`;

            let addLocalKey = (map: Map<string, Value>, key: string) => {
                map[key] = new Value(() => {
                    Region.Get(regionId).GetChanges().AddGetAccess(`${path}.${key}`);
                    return info[key];
                });
            };

            let parentState = region.GetLocal(region.GetElementAncestor(element, 0), '$state', false);
            let hasParentState = (parentState && !(parentState instanceof NoResult));
            
            let setLocalValue = (key: string, value: boolean, initial: boolean) => {
                info[key] = value;
                if (!hasParentState || !('parent' in parentState)){
                    Region.Get(regionId).GetChanges().Add({
                        type: 'set',
                        path: `${path}.${key}`,
                        prop: key
                    });
                }
                else{//Alert parent
                    parentState.parent[key](value, initial);
                }
            };

            let locals = new Map<string, Value>();
            if (!hasParentState || !('parent' in parentState)){
                Object.keys(info).forEach(key => addLocalKey(locals, key));
            }

            let getDirective = (): Directive => {
                return {
                    original: '',
                    parts: null,
                    raw: '',
                    key: '',
                    value: `{delay:${delay},lazy:${lazy}}`
                };
            };
            
            elementScope.locals['$state'] = locals;
            if (isUnknown){
                let childCount = element.children.length;
                if (childCount == 0){
                    elementScope.postProcessCallbacks.push(() => {
                        setLocalValue('isValid', true, true);
                        setLocalValue('isTyping', false, true);
                        setLocalValue('isDirty', false, true);
                    });
                    
                    return DirectiveHandlerReturn.Handled;
                }
                
                let counts: StateDirectiveCount = {
                    isDirty: 0,
                    isTyping: 0,
                    isValid: 0
                };

                let initialCounts: StateDirectiveCount = {
                    isDirty: 0,
                    isTyping: 0,
                    isValid: 0
                };

                let updateCount = (key: string, value: -1 | 1, requireAll: boolean, initial: boolean) => {
                    if (initial && (++initialCounts[key] < childCount || value == -1)){
                        if (value == 1){
                            counts[key] += value;
                        }
                        return;
                    }
                    
                    counts[key] += value;
                    if ((counts[key] == 0 || (counts[key] < childCount && requireAll)) && info[key]){
                        setLocalValue(key, false, initial);
                    }
                    else if (counts[key] > 0 && !info[key] && (!requireAll || counts[key] == childCount)){
                        setLocalValue(key, true, initial);
                    }
                };

                locals['parent'] = {
                    isDirty: (value: boolean, initial: boolean) => updateCount('isDirty', (value ? 1 : -1), false, initial),
                    isTyping: (value: boolean, initial: boolean) => updateCount('isTyping', (value ? 1 : -1), false, initial),
                    isValid: (value: boolean, initial: boolean) => updateCount('isValid', (value ? 1 : -1), true, initial)
                };

                setTimeout(() => [...element.children].forEach((child) => {
                    ExtendedDirectiveHandlers.State(region, (child as HTMLElement), getDirective());
                    Processor.Post(region, (child as HTMLElement));
                }), 0);

                locals['reset'] = () => {
                    [...element.children].forEach((child) => {
                        let myRegion = Region.Get(regionId);
                        let childState = myRegion.GetLocal(myRegion.GetElementAncestor((child as HTMLElement), 0), '$state', false);
                        if (childState && !(childState instanceof NoResult) && 'reset' in childState){
                            childState.reset();
                        }
                    });
                };
            }
            else{//Input element
                let counter = 0;
                let onEvent = () => {
                    let checkpoint = ++counter;
                    setTimeout(() => {
                        if (checkpoint != counter){
                            return;
                        }

                        if (isText && info.isTyping){
                            setLocalValue('isTyping', false, false);
                        }

                        if (lazy && (element as HTMLInputElement).checkValidity() != info.isValid){
                            setLocalValue('isValid', !info.isValid, false);
                        }
                    }, delay);

                    if (isText && !info.isTyping){
                        setLocalValue('isTyping', true, false);
                    }

                    if (!info.isDirty){
                        setLocalValue('isDirty', true, false);
                    }

                    if (!lazy && (element as HTMLInputElement).checkValidity() != info.isValid){
                        setLocalValue('isValid', !info.isValid, false);
                    }
                };

                if (isText){
                    element.addEventListener('input', onEvent);
                    element.addEventListener('paste', onEvent);
                    element.addEventListener('cut', onEvent);
                    element.addEventListener('blur', () => {
                        if (info.isTyping){
                            setLocalValue('isTyping', false, false);
                        }
                    });
                }
                else{
                    element.addEventListener('change', onEvent);
                }

                elementScope.postProcessCallbacks.push(() => {
                    setLocalValue('isValid', (element as HTMLInputElement).checkValidity(), true);
                    setLocalValue('isTyping', false, true);
                    setLocalValue('isDirty', false, true);
                });

                locals['reset'] = () => {
                    if (info.isDirty){
                        setLocalValue('isDirty', false, false);
                    }
    
                    if ((element as HTMLInputElement).checkValidity() != info.isValid){
                        setLocalValue('isValid', !info.isValid, false);
                    }
                };
            }
            
            return DirectiveHandlerReturn.Handled;
        }

        public static AttrChange(region: Region, element: HTMLElement, directive: Directive){
            let elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$attrChange<${++ExtendedDirectiveHandlers.attrChangeId_}>`;
            
            let regionId = region.GetId(), info = {
                name: 'N/A',
                value: 'N/A'
            };

            elementScope.attributeChangeCallbacks.push((name) => {
                let myRegion = Region.Get(regionId), value = element.getAttribute(name);
                info = {
                    name: name,
                    value: value
                };
                
                CoreDirectiveHandlers.Assign(myRegion, element, directive.value, `'${name}'`, () => name);
                myRegion.GetChanges().Add({
                    type: 'set',
                    path: path,
                    prop: ''
                });
            });

            elementScope.locals['$attr'] = new Value(() => {
                region.GetChanges().AddGetAccess(path);
                return info;
            });

            CoreDirectiveHandlers.Assign(region, element, directive.value, `'N/A'`, () => info);
            return DirectiveHandlerReturn.Handled;
        }

        public static XHRLoad(region: Region, element: HTMLElement, directive: Directive){
            let regionId = region.GetId(), previousUrl = '', append = false, once = false, loaded = false;
            let load = (url: string) => {
                ExtendedDirectiveHandlers.FetchLoad(element, ((url === '::reload::') ? previousUrl : url), append, () => {
                    loaded = true;
                    Region.Get(regionId).GetChanges().Add({
                        type: 'set',
                        path: `${path}.loaded`,
                        prop: 'loaded'
                    });
                    
                    if (once){
                        append = !append;
                        once = false;
                    }
                });
            };
            
            region.GetState().TrapGetAccess(() => {
                let url = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                if (url !== previousUrl && typeof url === 'string'){
                    previousUrl = url;
                    load(url);
                }
            }, true);

            let elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$xhr<${++ExtendedDirectiveHandlers.xhrId_}>`;
            
            elementScope.locals['$xhr'] = {
                loaded: new Value(() => {
                    Region.Get(regionId).GetChanges().AddGetAccess(`${path}.loaded`);
                    return loaded;
                }),
                url: new Value(() => {
                    return previousUrl;
                }),
                isAppend: new Value(() => {
                    return append;
                }),
                isOnce: new Value(() => {
                    return once;
                }),
                append: (state: boolean, isOnce = false) => {
                    append = state;
                    once = isOnce;
                },
                reload: () => load('::reload::'),
                unload: () => load('::unload::')
            };

            return DirectiveHandlerReturn.Handled;
        }

        public static Intersection(region: Region, element: HTMLElement, directive: Directive){
            let options = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (Region.IsObject(options)){
                if ('root' in options && typeof options['root'] === 'string'){
                    options['root'] = document.querySelector(options['root']);
                }
                
                if (!('rootMargin' in options)){
                    options['rootMargin'] = '0px';
                }

                if (!('threshold' in options)){
                    options['rootMargin'] = 0;
                }
            }
            else{//Use defaults
                options = {
                    root: null,
                    rootMargin: '0px',
                    threshold: 0
                };
            }

            let regionId = region.GetId(), previousRatio = 0, visible = false, supported = true, stopped = false;
            ExtendedDirectiveHandlers.ObserveIntersection(region, element, options, (entry) => {
                if (stopped){
                    return false;
                }
                
                if (entry instanceof IntersectionObserverEntry){
                    if (entry.isIntersecting != visible){//Visibility changed
                        visible = entry.isIntersecting;
                        Region.Get(regionId).GetChanges().Add({
                            type: 'set',
                            path: `${path}.visible`,
                            prop: 'visible'
                        });
                    }
                    
                    if (entry.intersectionRatio != previousRatio){
                        previousRatio = entry.intersectionRatio;
                        Region.Get(regionId).GetChanges().Add({
                            type: 'set',
                            path: `${path}.ratio`,
                            prop: 'ratio'
                        });
                    }
                }
                else{//Not supported
                    supported = false;
                }
                
                return true;
            });

            let elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$intersection<${++ExtendedDirectiveHandlers.intersectionId_}>`;
            
            elementScope.locals['$intersection'] = {
                ratio: new Value(() => {
                    Region.Get(regionId).GetChanges().AddGetAccess(`${path}.ratio`);
                    return previousRatio;
                }),
                visible: new Value(() => {
                    Region.Get(regionId).GetChanges().AddGetAccess(`${path}.visible`);
                    return visible;
                }),
                supported: new Value(() => {
                    return supported;
                }),
                stop: () => {
                    stopped = true;
                }
            };

            return DirectiveHandlerReturn.Handled;
        }

        public static ObserveIntersection(region: Region, element: HTMLElement, options: IntersectionObserverInit, callback: (entry: IntersectionObserverEntry | false) => boolean){
            if (!('IntersectionObserver' in window)){
                return callback(false);
            }

            let regionId = region.GetId(), elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$intObserver<${++ExtendedDirectiveHandlers.intObserverId_}>`;
            
            let observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
                entries.forEach((entry: IntersectionObserverEntry) => {
                    if (callback(entry)){
                        return;
                    }

                    let scope = Region.Get(regionId).GetElementScope(element);
                    if (scope && path in scope.intersectionObservers){
                        (scope.intersectionObservers[path] as IntersectionObserver).unobserve(element);
                        delete scope.intersectionObservers[path];
                    }
                });
            }, options);

            elementScope.intersectionObservers[path] = observer;
            observer.observe(element);
        }

        public static FetchLoad(element: HTMLElement, url: string, append: boolean, onLoad: () => void){
            if (!(url = url.trim())){
                return;
            }

            let removeAll = (force: boolean = false) => {
                if (force || !append){
                    [...element.children].forEach(child => element.removeChild(child));
                }
            };

            let fetch = (url: string, callback: (response: any) => void) => {
                window.fetch(url).then((response) => {
                    try{
                        return response.json();
                    }
                    catch (err){}

                    return response.text();
                }).then((data) => {
                    callback(data);
                    if (onLoad){
                        onLoad();
                    }
                });
            };

            let fetchList = (url: string, callback: (item: object) => void) => {
                fetch(url, (data) => {
                    removeAll();
                    if (Array.isArray(data)){
                        (data as Array<object>).forEach(callback);
                    }
                    else if (typeof data === 'string'){
                        element.innerHTML = data;
                    }
                });
            };

            let onEvent = () => {
                element.removeEventListener('load', onEvent);
                onLoad();
            };

            if (url === '::unload::'){
                if (element.tagName === 'IMG' || element.tagName === 'IFRAME'){
                    (element as HTMLImageElement).src = '';
                }
                else{
                    removeAll(true);
                }
            }
            else if (element.tagName === 'SELECT'){
                fetchList(url, (item) => {
                    if (item && typeof item === 'object' && 'value' in item && 'text' in item){
                        let option = document.createElement('option');

                        option.value = item['value'];
                        option.textContent = item['text'];

                        element.appendChild(option);
                    }
                });
            }
            else if (element.tagName === 'UL' || element.tagName === 'OL'){
                fetchList(url, (item) => {
                    if (item && typeof item === 'object' && 'value' in item && 'text' in item){
                        let li = document.createElement('li');
                        li.innerHTML = ((typeof item === 'string') ? item : item.toString());
                        element.appendChild(li);
                    }
                });
            }
            else if (element.tagName === 'IMG' || element.tagName === 'IFRAME'){
                element.addEventListener('load', onEvent);
                (element as HTMLImageElement).src = url;
            }
            else{//Generic
                fetch(url, (data) => {
                    removeAll();
                    element.innerHTML = ((typeof data === 'string') ? data : (data as object).toString());
                });
            }
        }

        public static AddAll(){
            DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);

            let getEntry = (regionId: string, target: HTMLElement, name: string, key: string) => {
                let map = (Region.Infer(target) || Region.Get(regionId)).GetLocal(target, name, false);
                if (!key){
                    return ((map instanceof Value) ? map.Get() : map);
                }

                if (map && key in map){
                    let entry = map[key];
                    return ((typeof entry === 'function') ? (entry as () => void).bind(map) : ((entry instanceof Value) ? entry.Get() : entry));
                }

                return null;
            };

            let buildGlobals = (regionId: string, name: string, keys: Array<string>) => {
                let map = {};
                keys.forEach(key => map[key] = (target: HTMLElement) => getEntry(regionId, target, name, key));
                return map;
            };
            
            Region.AddGlobal('$$state', (regionId: string) => buildGlobals(regionId, '$state', ['isDirty', 'isTyping', 'isValid', 'reset']));
            Region.AddGlobal('$$attr', (regionId: string) => (target: HTMLElement) => getEntry(regionId, target, '$attr', null));
            Region.AddGlobal('$$xhr', (regionId: string) => buildGlobals(regionId, '$xhr', ['loaded', 'url', 'isAppend', 'isOnce', 'append', 'reload', 'unload']));
            Region.AddGlobal('$$intersection', (regionId: string) => buildGlobals(regionId, '$intersection', ['ratio', 'visible', 'supported', 'stop']));
        }
    }

    (function(){
        ExtendedDirectiveHandlers.AddAll();
    })();
}
