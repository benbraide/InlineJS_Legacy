namespace InlineJS{
    export interface StateDirectiveValue{
        isDirty: boolean;
        isTyping: boolean;
        isValid: boolean;
    }

    export interface StateDirectiveCount{
        isDirty: number;
        isTyping: number;
        isValid: number;
    }

    export interface StateDirectiveInfo{
        value: StateDirectiveValue;
        count: StateDirectiveCount;
        activeCount: number;
        doneInit: boolean;
        alert: (key: string) => void;
        resetCallbacks: Array<() => void>;
    }

    export interface ExtendedDirectiveHandlerScope{
        id: string;
        path: string;
        callbacks: Map<string, Array<(value?: any) => boolean>>;
    }
    
    export class ExtendedDirectiveHandlers{
        private static scopeId_ = 0;
        private static scopes_ = new Map<string, ExtendedDirectiveHandlerScope>();
        
        public static State(region: Region, element: HTMLElement, directive: Directive){
            let options = CoreDirectiveHandlers.Evaluate(region, element, directive.value), delay = 750, lazy = false;
            if (options && typeof options === 'object'){//Retrieve options
                delay = (('delay' in options) ? options.delay : delay);
                lazy = (('lazy' in options) ? !!options.lazy : lazy);
            }
            
            return ExtendedDirectiveHandlers.ContextState(region, element, lazy, delay, null);
        }

        public static ContextState(region: Region, element: HTMLElement, lazy: boolean, delay: number, info: StateDirectiveInfo){
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

            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('state', elementScope, ['isDirty', 'isTyping', 'isValid']);

            let isRoot = false, forceSet = false;
            if (!info){//Initialize info
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
                    alert: (key: string) => {
                        Region.Get(regionId).GetChanges().Add({
                            type: 'set',
                            path: `${scope.path}.${key}`,
                            prop: key
                        });
                    },
                    resetCallbacks: new Array<() => void>()
                };

                elementScope.locals['$state'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                    if (prop in info.value){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                        return info.value[prop];
                    }
    
                    if (prop === 'reset'){
                        return () => {
                            if (!info.doneInit){//Nothing to reset
                                return;
                            }
                            
                            info.doneInit = false;
                            info.count.isDirty = info.count.isTyping = info.count.isValid = 0;
                            info.value.isDirty = info.value.isTyping = info.value.isValid = false;
                            info.resetCallbacks.forEach(callback => callback());
                            finalize();
                        };
                    }
    
                    if (prop === 'onDirty'){
                        return (callback: (state: boolean) => boolean) => (scope.callbacks['isDirty'] as Array<(value?: any) => boolean>).push(callback);
                    }
    
                    if (prop === 'onTyping'){
                        return (callback: (state: boolean) => boolean) => (scope.callbacks['isTyping'] as Array<(value?: any) => boolean>).push(callback);
                    }

                    if (prop === 'onValid'){
                        return (callback: (state: boolean) => boolean) => (scope.callbacks['isValid'] as Array<(value?: any) => boolean>).push(callback);
                    }
                }, [...Object.keys(info.value), 'reset', 'onDirty','onTyping','onValid']);
            }

            let setValue = (key: string, value: boolean) => {
                if (forceSet || value != info.value[key]){
                    info.value[key] = value;
                    info.alert(key);
                    (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => callback(value));
                }
            };

            let finalize = () => {
                if (info.doneInit){
                    return;
                }
                
                info.doneInit = true;
                forceSet = true;
                
                setValue('isDirty', (0 < info.count.isDirty));
                setValue('isTyping', false);
                setValue('isValid', (info.count.isValid == info.activeCount));

                forceSet = false;
            };

            if (isUnknown){//Pass to offspring
                [...element.children].forEach((child) => ExtendedDirectiveHandlers.ContextState(region, (child as HTMLElement), lazy, delay, info));

                if (isRoot){//Done
                    if (info.activeCount == 0){
                        return DirectiveHandlerReturn.Nil;
                    }
                    
                    finalize();
                }
                
                return DirectiveHandlerReturn.Handled;
            }

            let updateCount = (key: string, value: -1 | 1, requireAll: boolean) => {
                if (info.doneInit){
                    info.count[key] += value;
                    if (info.count[key] == 0){
                        setValue(key, false);
                    }
                    else if (info.count[key] == info.activeCount || (info.count[key] > 0 && !requireAll)){
                        setValue(key, true);
                    }
                    else{
                        setValue(key, false);
                    }
                }
                else if (value == 1){//Initial update
                    info.count[key] += 1;
                }
            };

            let counter = 0, isDirty = false, isTyping = false, isValid = false;
            let stoppedTyping = () => {
                if (isTyping){
                    isTyping = false;
                    updateCount('isTyping', -1, false);
                }

                if (lazy && (element as HTMLInputElement).checkValidity() != isValid){
                    isValid = !isValid;
                    updateCount('isValid', (isValid ? 1 : -1), true);
                }
            };
            
            let onEvent = () => {
                if (isText){
                    let checkpoint = ++counter;
                    setTimeout(() => {
                        if (checkpoint == counter){
                            stoppedTyping();
                        }
                    }, delay);

                    if (!isTyping){
                        isTyping = true;
                        updateCount('isTyping', 1, false);
                    }
                }

                if (!isDirty){
                    isDirty = true;
                    updateCount('isDirty', 1, false);
                }

                if ((!isText || !lazy) && (element as HTMLInputElement).checkValidity() != isValid){
                    isValid = !isValid;
                    updateCount('isValid', (isValid ? 1 : -1), true);
                }
            };

            if (isText){
                element.addEventListener('input', onEvent);
                element.addEventListener('paste', onEvent);
                element.addEventListener('cut', onEvent);
                element.addEventListener('blur', stoppedTyping);
            }
            else{
                element.addEventListener('change', onEvent);
            }

            let initialState = () => {
                isDirty = isTyping = false;
                isValid = (element as HTMLInputElement).checkValidity();
                updateCount('isValid', (isValid ? 1 : -1), true);
            };

            ++info.activeCount;
            info.resetCallbacks.push(initialState);
            
            initialState();
            if (isRoot){//Done
                finalize();
            }

            return DirectiveHandlerReturn.Handled;
        }

        public static AttrChange(region: Region, element: HTMLElement, directive: Directive){
            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('attrChange', elementScope, ['onChange']);
            
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
                
                let key = myRegion.AddTemp(() => info);
                CoreDirectiveHandlers.Assign(myRegion, element, directive.value, `$__InlineJS_CallTemp__('${key}')`, () => info);
                
                Object.keys(info).forEach((key) => {
                    myRegion.GetChanges().Add({
                        type: 'set',
                        path: `${scope.path}.${key}`,
                        prop: key
                    });
                });

                Object.keys(scope.callbacks).forEach(key => (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => callback(value)));
            });

            elementScope.locals['$attr'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in info){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return info[prop];
                }

                if (prop in scope.callbacks){
                    (callback: (value: any) => boolean) => (scope.callbacks[prop] as Array<(value?: any) => boolean>).push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);

            let key = region.AddTemp(() => info);
            CoreDirectiveHandlers.Assign(region, element, directive.value, `$__InlineJS_CallTemp__('${key}')`, () => info);

            return DirectiveHandlerReturn.Handled;
        }

        public static XHRLoad(region: Region, element: HTMLElement, directive: Directive){
            let append = (state: boolean, isOnce = false) => {
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

            let load = (url: string) => {
                ExtendedDirectiveHandlers.FetchLoad(element, ((url === '::reload::') ? info.url : url), info.isAppend, () => {
                    info.isLoaded = true;
                    Region.Get(regionId).GetChanges().Add({
                        type: 'set',
                        path: `${scope.path}.isLoaded`,
                        prop: 'isLoaded'
                    });
                    
                    Object.keys(scope.callbacks).forEach(key => (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => callback(true)));
                    if (info.isOnce){
                        info.isAppend = !info.isAppend;
                        info.isOnce = false;
                    }
                });
            };
            
            region.GetState().TrapGetAccess(() => {
                let url = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                if (url !== info.url && typeof url === 'string'){
                    load(url);
                    info.url = url;
                }
            }, true);

            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('xhr', elementScope, ['onLoad']);

            elementScope.locals['$xhr'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in info){
                    if (prop === 'isLoaded'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    }
                    return info[prop];
                }

                if (prop in scope.callbacks){
                    (callback: (value: any) => boolean) => (scope.callbacks[prop] as Array<(value?: any) => boolean>).push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static LazyLoad(region: Region, element: HTMLElement, directive: Directive){
            let options = ExtendedDirectiveHandlers.GetIntersectionOptions(region, element, directive.value);
            let url = (('url' in options) ? options['url'] : (('original' in options) ? options['original'] : null));

            if (!url || typeof url !== 'string'){//Ignore
                return DirectiveHandlerReturn.Nil;
            }

            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('xhr', elementScope, ['onLoad']);
            
            let regionId = region.GetId(), info = {
                isLoaded: false
            };

            ExtendedDirectiveHandlers.ObserveIntersection(region, element, options, (entry) => {
                if ((!(entry instanceof IntersectionObserverEntry) || !entry.isIntersecting) && entry !== false){
                    return true;
                }

                ExtendedDirectiveHandlers.FetchLoad(element, url, false, () => {
                    info.isLoaded = true;
                    Region.Get(regionId).GetChanges().Add({
                        type: 'set',
                        path: `${scope.path}.isLoaded`,
                        prop: 'isLoaded'
                    });

                    Object.keys(scope.callbacks).forEach(key => (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => callback(true)));
                });
                
                return false;
            });

            elementScope.locals['$lazyLoad'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in info){
                    if (prop === 'isLoaded'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    }
                    return info[prop];
                }

                if (prop in scope.callbacks){
                    (callback: (value: any) => boolean) => (scope.callbacks[prop] as Array<(value?: any) => boolean>).push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);

            return DirectiveHandlerReturn.Handled;
        }

        public static Intersection(region: Region, element: HTMLElement, directive: Directive){
            let regionId = region.GetId(), info = {
                ratio: 0,
                visible: false,
                supported: true,
                stopped: false
            };

            ExtendedDirectiveHandlers.ObserveIntersection(region, element, ExtendedDirectiveHandlers.GetIntersectionOptions(region, element, directive.value), (entry) => {
                if (info.stopped){
                    return false;
                }
                
                if (entry instanceof IntersectionObserverEntry){
                    if (entry.isIntersecting != info.visible){//Visibility changed
                        info.visible = entry.isIntersecting;
                        Region.Get(regionId).GetChanges().Add({
                            type: 'set',
                            path: `${scope.path}.visible`,
                            prop: 'visible'
                        });

                        (scope.callbacks['onVisible'] as Array<(value?: any) => boolean>).forEach(callback => callback(info.visible));
                    }
                    
                    if (entry.intersectionRatio != info.ratio){
                        info.ratio = entry.intersectionRatio;
                        Region.Get(regionId).GetChanges().Add({
                            type: 'set',
                            path: `${scope.path}.ratio`,
                            prop: 'ratio'
                        });

                        (scope.callbacks['onRatio'] as Array<(value?: any) => boolean>).forEach(callback => callback(info.ratio));
                    }
                }
                else{//Not supported
                    info.supported = false;
                }
                
                return true;
            });

            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('intersection', elementScope, ['onVisible', 'onRatio']);
            
            elementScope.locals['$intersection'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in info){
                    if (prop === 'ratio' || prop === 'visible'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    }
                    return info[prop];
                }

                if (prop in scope.callbacks){
                    (callback: (value: any) => boolean) => (scope.callbacks[prop] as Array<(value?: any) => boolean>).push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);

            return DirectiveHandlerReturn.Handled;
        }

        public static GetIntersectionOptions(region: Region, element: HTMLElement, expression: string){
            let options = CoreDirectiveHandlers.Evaluate(region, element, expression);
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
                    threshold: 0,
                    original: options
                };
            }

            return options;
        }

        public static ObserveIntersection(region: Region, element: HTMLElement, options: IntersectionObserverInit, callback: (entry: IntersectionObserverEntry | false) => boolean){
            if (!('IntersectionObserver' in window)){
                return callback(false);
            }

            let regionId = region.GetId(), elementScope = region.AddElement(element, true);
            let path = `${elementScope.key}.$intObserver<${++ExtendedDirectiveHandlers.scopeId_}>`;
            
            let observer = new IntersectionObserver((entries: Array<IntersectionObserverEntry>) => {
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
                window.fetch(url).then(response => response.text()).then((data) => {
                    try{
                        callback(JSON.parse(data));
                    }
                    catch (err){
                        callback(data);
                    }
                    
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
                    if (append){
                        let tmpl = document.createElement('template');
                        tmpl.innerHTML = ((typeof data === 'string') ? data : (data as object).toString());
                        tmpl.content.childNodes.forEach(child => element.appendChild(child));
                    }
                    else{
                        removeAll();
                        element.innerHTML = ((typeof data === 'string') ? data : (data as object).toString());
                    }
                });
            }
        }

        public static AddScope(prefix: string, elementScope: ElementScope, callbacks: Array<string>) : ExtendedDirectiveHandlerScope{
            let id = `${prefix}<${++ExtendedDirectiveHandlers.scopeId_}>`;
            ExtendedDirectiveHandlers.scopes_[id] = {
                id: id,
                path: `${elementScope.key}.$${id}`,
                callbacks: new Map<string, Array<(value?: any) => boolean>>()
            };

            (callbacks || []).forEach(key => (ExtendedDirectiveHandlers.scopes_[id] as ExtendedDirectiveHandlerScope).callbacks[key] = new Array<(value?: any) => boolean>());
            return ExtendedDirectiveHandlers.scopes_[id];
        }

        public static AddAll(){
            DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            DirectiveHandlerManager.AddHandler('lazyLoad', ExtendedDirectiveHandlers.LazyLoad);
            DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);

            let buildGlobal = (name: string) => {
                Region.AddGlobal(`$$${name}`, (regionId: string) => {
                    return (target: HTMLElement) => {
                        let local = (Region.Infer(target) || Region.Get(regionId)).GetLocal(target, `$${name}`, true);
                        return ((local instanceof Value) ? local.Get() : local);
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

    (function(){
        ExtendedDirectiveHandlers.AddAll();
    })();
}
