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
        setValue: (key: string, value: boolean) => void;
        alert: (key: string) => void;
        resetCallbacks: Array<() => void>;
    }

    export interface ExtendedDirectiveHandlerScope{
        id: string;
        path: string;
        callbacks: Record<string, Array<(value?: any) => boolean>>;
    }

    export interface RouterOptions{
        urlPrefix?: string;
        titlePrefix?: string;
        titleSuffix?: string;
    }
    
    export interface RouterInfo{
        currentPage: string;
        currentQuery: string;
        pages: Array<RouterPageInfo>;
        url: string;
        targetUrl: string;
        mount: (url: string) => void;
        mountElement: HTMLElement;
        middlewares: Record<string, (page?: string, query?: string) => boolean>;
    }

    export interface RouterPageInfo{
        pattern: string | RegExp;
        path: string;
        title: string;
        component: string;
        entry: string;
        exit: string;
        disabled: boolean;
        middlewares: Array<string>;
        uid: number;
    }

    export interface AnimatorRange{
        from: number;
        to: number;
    }
    
    export interface Animator{
        step: (element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, start: number, value: number, duration: number) => number) => void;
    }

    export class OpacityAnimator implements Animator{
        private delta_: number;

        public constructor(element: HTMLElement, css?: CSSStyleDeclaration){
            this.delta_ = (Number.parseInt((css || getComputedStyle(element)).opacity) || 1);
        }
        
        public step(element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, start: number, value: number, duration: number) => number){
            if (this.delta_ <= 0){
                this.delta_ = (Number.parseInt(getComputedStyle(element).opacity) || 1);
            }
            
            element.style.opacity = (show ? ease(ellapsed, 0, this.delta_, duration) : (this.delta_ - ease(ellapsed, 0, this.delta_, duration))).toString();
        }
    }

    export class HeightAnimator implements Animator{
        private delta_: number;
        private margin_: number;

        public constructor(private reversed_: boolean, element: HTMLElement, css?: CSSStyleDeclaration){
            this.delta_ = Math.round(element.clientHeight);
            this.margin_ = (Number.parseInt((css || getComputedStyle(element)).marginTop) || 0);
        }
        
        public step(element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, start: number, value: number, duration: number) => number){
            if (this.delta_ <= 0){
                this.delta_ = Math.round(element.clientHeight);
            }
            
            let value = Math.round(show ? ease(ellapsed, 0, this.delta_, duration) : (this.delta_ - ease(ellapsed, 0, this.delta_, duration)));
            element.style.height = `${value}px`;
            
            if (this.reversed_){
                element.style.marginTop = `${(this.margin_ + (this.delta_ - value))}px`;
            }
        }
    }

    export class WidthAnimator implements Animator{
        private delta_: number;
        private margin_: number;

        public constructor(private reversed_: boolean, element: HTMLElement, css?: CSSStyleDeclaration){
            this.delta_ = Math.round(element.clientWidth);
            this.margin_ = (Number.parseInt((css || getComputedStyle(element)).marginLeft) || 0);
        }
        
        public step(element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, start: number, value: number, duration: number) => number){
            if (this.delta_ <= 0){
                this.delta_ = Math.round(element.clientWidth);
            }
            
            let value = Math.round(show ? ease(ellapsed, 0, this.delta_, duration) : (this.delta_ - ease(ellapsed, 0, this.delta_, duration)));
            element.style.width = `${value}px`;
            
            if (this.reversed_){
                element.style.marginLeft = `${(this.margin_ + (this.delta_ - value))}px`;
            }
        }
    }

    export let Animators = {
        opacity: (element: HTMLElement, css?: CSSStyleDeclaration) => new OpacityAnimator(element, css),
        height: (element: HTMLElement, css?: CSSStyleDeclaration) => new HeightAnimator(false, element, css),
        'height-reverse': (element: HTMLElement, css?: CSSStyleDeclaration) => new HeightAnimator(true, element, css),
        width: (element: HTMLElement, css?: CSSStyleDeclaration) => new WidthAnimator(false, element, css),
        'width-reverse': (element: HTMLElement, css?: CSSStyleDeclaration) => new WidthAnimator(true, element, css),
    };

    export interface TypewriterInfo{
        list: Array<string>;
        delay: number;
        interval: number;
        iterations: number;
        showDelete: boolean;
        useRandom: boolean;
        showCursor: boolean;
    }

    export interface CartItem{
        quantity: number;
        price: number;
        product: Record<string, any>;
    }

    export interface CartHandlers{
        init?: () => void;
        load?: (items: Record<string, CartItem>) => void;
        update?: (sku: string, quantity: number, incremental: boolean, callback: (item: CartItem) => void) => void;
        updateLink?: string;
    }

    export interface CartInfo{
        items: Record<string, CartItem>;
        itemProxies: Record<string, {}>;
        count: number;
        total: number;
    }

    export interface DBOptions{
        drop: boolean;
        name: string;
        fields: Record<string, boolean>;
    }
    
    export interface ReporterInfo{
        report: (info: any) => boolean;
        reportServerError: (err: any) => boolean;
        confirm: (info: string | Record<string, any>, callback: string | (() => void)) => void;
        prompt: (info: string | Record<string, any>, callback: (response: string | Array<string>) => void) => void;
    }

    export interface FormInfo{
        action?: string;
        method?: string;
        errorBag?: Record<string, Array<string>>;
        callback?: (data: any, err?: any) => boolean;
        confirmInfo?: string | Record<string, any>;
    }

    export class ExtendedDirectiveHandlers{
        private static scopeId_ = 0;
        private static scopes_: Record<string, ExtendedDirectiveHandlerScope> = {};

        public static Watch(region: Region, element: HTMLElement, directive: Directive){
            let previousValue: any;
            region.GetState().TrapGetAccess(() => {
                let value = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                if (!Region.IsEqual(value, previousValue)){
                    previousValue = Region.DeepCopy(value);
                    element.dispatchEvent(new CustomEvent('watch.change', { detail: value }));
                }
            }, true, element);
            return DirectiveHandlerReturn.Handled;
        }
        
        public static When(region: Region, element: HTMLElement, directive: Directive){
            region.GetState().TrapGetAccess(() => {
                if (!! CoreDirectiveHandlers.Evaluate(region, element, directive.value)){
                    element.dispatchEvent(new CustomEvent('when.change'));
                }
            }, true, element);
            return DirectiveHandlerReturn.Handled;
        }
        
        public static Once(region: Region, element: HTMLElement, directive: Directive){
            region.GetState().TrapGetAccess(() => {
                if (!! CoreDirectiveHandlers.Evaluate(region, element, directive.value)){
                    element.dispatchEvent(new CustomEvent('once.change'));
                    return false;
                }
                return true;
            }, true, element);
            return DirectiveHandlerReturn.Handled;
        }

        public static Input(region: Region, element: HTMLElement, directive: Directive){
            let wrapper = document.createElement('div'), span = document.createElement('span'), style = getComputedStyle(element);

            element.parentElement.insertBefore(wrapper, element);
            wrapper.appendChild(element);
            wrapper.appendChild(span);

            if (directive.arg.options.indexOf('password') != -1){
                let icon = document.createElement('i'), updateIcon = () => {
                    if ((element as HTMLInputElement).type === 'text'){
                        icon.title = 'Hide password';
                        icon.textContent = 'visibility_off';
                    }
                    else{//Hidden
                        icon.title = 'Show password';
                        icon.textContent = 'visibility';
                    }
                };

                wrapper.appendChild(icon);
                icon.classList.add('material-icons-outlined');
                updateIcon();

                icon.addEventListener('click', () => {
                    (element as HTMLInputElement).type = (((element as HTMLInputElement).type === 'password') ? 'text' : 'password');
                    updateIcon();

                    element.dispatchEvent(new CustomEvent('input.password', {
                        detail: (element as HTMLInputElement).type
                    }));
                });
            }

            wrapper.classList.add('inlinejs-input');
            directive.arg.options.forEach(key => wrapper.classList.add(key));

            span.style.top = `calc(${wrapper.offsetHeight}px - 1rem - ${style.marginBottom} - ${style.paddingBottom})`;
            span.style.left = `calc(${style.paddingLeft} + ${style.marginLeft})`;
            
            span.textContent = (element as HTMLInputElement).placeholder;
            (element as HTMLInputElement).placeholder = ' ';

            let onBlur = () => {
                wrapper.classList.add('blurred');
                element.removeEventListener('blur', onBlur);
            };

            element.addEventListener('blur', onBlur);
            span.addEventListener('click', () => { element.focus() });
            span.addEventListener('keydown', (e) => {
                if (e.key === ' '){
                    element.focus();
                }
            });

            return DirectiveHandlerReturn.Handled;
        }
        
        public static State(region: Region, element: HTMLElement, directive: Directive){
            let delay = 750, lazy = false, submit = false;
            for (let i = 0; i < directive.arg.options.length; ++i){
                if (directive.arg.options[i] === 'delay' && i < (directive.arg.options.length - 1)){
                    delay = CoreDirectiveHandlers.ExtractDuration(directive.arg.options[i + 1], delay);
                }
                else if (directive.arg.options[i] === 'lazy'){
                    lazy = true;
                }
                else if (directive.arg.options[i] === 'submit'){
                    submit = true;
                }
            }
            
            return ExtendedDirectiveHandlers.ContextState(region, element, lazy, delay, submit, null);
        }

        public static ContextState(region: Region, element: HTMLElement, lazy: boolean, delay: number, submit: boolean, info: StateDirectiveInfo){
            const eventKeys = {
                isDirty: 'dirty',
                isTyping: 'typing',
                isValid: 'valid'
            };

            const inverseEventKeys = {
                isDirty: 'clean',
                isTyping: 'stopped.typing',
                isValid: 'invalid'
            };

            const eventChangeKeys = {
                isDirty: 'dirty.change',
                isTyping: 'typing.change',
                isValid: 'valid.change'
            };
            
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
            if ('$state' in elementScope.locals){//Duplicate
                return DirectiveHandlerReturn.Nil;
            }
            
            let scope = ExtendedDirectiveHandlers.AddScope('state', elementScope, ['isDirty', 'isTyping', 'isValid']), isRoot = false, forceSet = false, form: HTMLElement = null;
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
                    setValue: (key: string, value: boolean) => {
                        if (forceSet || value != info.value[key]){
                            info.value[key] = value;
                            info.alert(key);
        
                            (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => CoreDirectiveHandlers.Call(regionId, callback, value));

                            element.dispatchEvent(new CustomEvent(`state.${eventChangeKeys[key]}`, { detail: value }));
                            element.dispatchEvent(new CustomEvent(`state.${(value ? eventKeys[key] : inverseEventKeys[key])}`));
                        }
                    },
                    alert: (key: string) => {
                        let myRegion = Region.Get(regionId);
                        myRegion.GetChanges().Add({
                            regionId: regionId,
                            type: 'set',
                            path: `${scope.path}.${key}`,
                            prop: key,
                            origin: myRegion.GetChanges().GetOrigin()
                        });

                        if (key === 'isDirty' || key === 'isValid'){
                            myRegion.GetChanges().Add({
                                regionId: regionId,
                                type: 'set',
                                path: `${scope.path}.isDirtyAndValid`,
                                prop: key,
                                origin: myRegion.GetChanges().GetOrigin()
                            });
                        }
                    },
                    resetCallbacks: new Array<() => void>()
                };

                if (submit){
                    form = region.GetElementWith(true, target => (target instanceof HTMLFormElement));
                }

                elementScope.locals['$state'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                    if (prop in info.value){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                        return info.value[prop];
                    }

                    if (prop === 'isDirtyAndValid'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                        return (info.value.isDirty && info.value.isValid);
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
    
                    if (prop === 'onDirtyChange'){
                        return (callback: (state: boolean) => boolean) => (scope.callbacks['isDirty'] as Array<(value?: any) => boolean>).push(callback);
                    }
    
                    if (prop === 'onTypingChange'){
                        return (callback: (state: boolean) => boolean) => (scope.callbacks['isTyping'] as Array<(value?: any) => boolean>).push(callback);
                    }

                    if (prop === 'onValidChange'){
                        return (callback: (state: boolean) => boolean) => (scope.callbacks['isValid'] as Array<(value?: any) => boolean>).push(callback);
                    }
                }, [...Object.keys(info.value), 'reset', 'onDirtyChange','onTypingChange','onValidChange']);

                region.AddElement(element).uninitCallbacks.push(() => {
                    info = null;
                });
            }

            let finalize = () => {
                if (info.doneInit){
                    return;
                }
                
                info.doneInit = true;
                forceSet = true;
                
                info.setValue('isDirty', (0 < info.count.isDirty));
                info.setValue('isTyping', false);
                info.setValue('isValid', (info.count.isValid == info.activeCount));

                forceSet = false;
            };

            if (isUnknown){//Pass to offspring
                Array.from(element.children).forEach(child => ExtendedDirectiveHandlers.ContextState(region, (child as HTMLElement), lazy, delay, submit, info));
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
                        info.setValue(key, false);
                    }
                    else if (info.count[key] == info.activeCount || (info.count[key] > 0 && !requireAll)){
                        info.setValue(key, true);
                    }
                    else{
                        info.setValue(key, false);
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
                    if (form){
                        form.dispatchEvent(new CustomEvent('submit'));
                    }
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

            let assign = () => {
                Evaluator.Evaluate(regionId, element, `(${directive.value})={name: '${info.name}', value: '${info.value}'}`);
            };
            
            elementScope.attributeChangeCallbacks.push((name) => {
                let myRegion = Region.Get(regionId), value = element.getAttribute(name);
                info = {
                    name: name,
                    value: value
                };
                
                assign();
                
                Object.keys(info).forEach((key) => {
                    myRegion.GetChanges().Add({
                        regionId: regionId,
                        type: 'set',
                        path: `${scope.path}.${key}`,
                        prop: key,
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                });

                Object.keys(scope.callbacks).forEach(key => (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => CoreDirectiveHandlers.Call(regionId, callback, {
                    name: name,
                    value: value
                })));

                element.dispatchEvent(new CustomEvent(`attr.change`, { detail: info }));
            });

            elementScope.locals['$attr'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in info){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return info[prop];
                }

                if (prop in scope.callbacks){
                    return (callback: (value: any) => boolean) => (scope.callbacks[prop] as Array<(value?: any) => boolean>).push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);

            assign();

            return DirectiveHandlerReturn.Handled;
        }

        public static XHRLoad(region: Region, element: HTMLElement, directive: Directive){
            let append = (state: boolean, isOnce = false) => {
                info.isAppend = state;
                info.isOnce = isOnce;
            };
            
            let regionId = region.GetId(), info = {
                url: '',
                isAppend: (directive.arg.options.indexOf('append') != -1),
                isOnce: (directive.arg.options.indexOf('once') != -1),
                isLoaded: false,
                append: append,
                reload: () => load('::reload::'),
                unload: () => load('::unload::')
            };

            let load = (url: string) => {
                ExtendedDirectiveHandlers.FetchLoad(element, ((url === '::reload::') ? info.url : url), info.isAppend, () => {
                    info.isLoaded = true;

                    let myRegion = Region.Get(regionId);
                    myRegion.GetChanges().Add({
                        regionId: regionId,
                        type: 'set',
                        path: `${scope.path}.isLoaded`,
                        prop: 'isLoaded',
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                    
                    Object.keys(scope.callbacks).forEach(key => (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => CoreDirectiveHandlers.Call(regionId, callback, true)));
                    element.dispatchEvent(new CustomEvent(`xhr.load`));
                    
                    if (info.isOnce){
                        info.isAppend = !info.isAppend;
                        info.isOnce = false;
                    }
                }, (err) => {
                    element.dispatchEvent(new CustomEvent(`xhr.error`, {
                        detail: { error: err },
                    }));
                });
            };
            
            region.GetState().TrapGetAccess(() => {
                let url = CoreDirectiveHandlers.Evaluate(region, element, directive.value), reload = false;
                if (typeof url !== 'string'){
                    return;
                }
                
                if (url.startsWith('::reload::')){
                    reload = true;
                    url = (url.substr(10) || info.url);
                }

                if (reload || url !== info.url){
                    if (url.startsWith('::append::')){
                        info.isAppend = info.isOnce = true;
                        url = url.substr(10);
                    }
                    
                    load(url);
                    info.url = url;
                }
                else if (url !== '::unload::'){
                    element.dispatchEvent(new CustomEvent(`xhr.reload`));
                }
            }, true, element);

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
                    return (callback: (value: any) => boolean) => (scope.callbacks[prop] as Array<(value?: any) => boolean>).push(callback);
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

                    let myRegion = Region.Get(regionId);
                    myRegion.GetChanges().Add({
                        regionId: regionId,
                        type: 'set',
                        path: `${scope.path}.isLoaded`,
                        prop: 'isLoaded',
                        origin: myRegion.GetChanges().GetOrigin()
                    });

                    Object.keys(scope.callbacks).forEach(key => (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => CoreDirectiveHandlers.Call(regionId, callback, true)));
                    element.dispatchEvent(new CustomEvent(`xhr.load`));
                }, (err) => {
                    element.dispatchEvent(new CustomEvent(`xhr.error`, {
                        detail: { error: err },
                    }));
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
                    return (callback: (value: any) => boolean) => (scope.callbacks[prop] as Array<(value?: any) => boolean>).push(callback);
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
                    let myRegion = Region.Get(regionId);
                    if (entry.isIntersecting != info.visible){//Visibility changed
                        info.visible = entry.isIntersecting;
                        myRegion.GetChanges().Add({
                            regionId: regionId,
                            type: 'set',
                            path: `${scope.path}.visible`,
                            prop: 'visible',
                            origin: myRegion.GetChanges().GetOrigin()
                        });

                        (scope.callbacks['onVisibilityChange'] as Array<(value?: any) => boolean>).forEach(callback => CoreDirectiveHandlers.Call(regionId, callback, info.visible));

                        element.dispatchEvent(new CustomEvent(`intersection.visibility.change`, { detail: info.visible }));
                        element.dispatchEvent(new CustomEvent(info.visible ? 'intersection.visible' : 'intersection.hidden'));
                    }
                    
                    if (entry.intersectionRatio != info.ratio){
                        info.ratio = entry.intersectionRatio;
                        Region.Get(regionId).GetChanges().Add({
                            regionId: regionId,
                            type: 'set',
                            path: `${scope.path}.ratio`,
                            prop: 'ratio',
                            origin: myRegion.GetChanges().GetOrigin()
                        });

                        (scope.callbacks['onRatioChange'] as Array<(value?: any) => boolean>).forEach(callback => CoreDirectiveHandlers.Call(regionId, callback, info.ratio));
                        element.dispatchEvent(new CustomEvent(`intersection.ratio.change`, { detail: info.ratio }));
                    }
                }
                else{//Not supported
                    info.supported = false;
                }
                
                return true;
            });

            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('intersection', elementScope, ['onVisibilityChange', 'onRatioChange']);
            
            elementScope.locals['$intersection'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in info){
                    if (prop === 'ratio' || prop === 'visible'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    }
                    return info[prop];
                }

                if (prop in scope.callbacks){
                    return (callback: (value: any) => boolean) => (scope.callbacks[prop] as Array<(value?: any) => boolean>).push(callback);
                }
            }, [...Object.keys(info), ...Object.keys(scope.callbacks)]);

            return DirectiveHandlerReturn.Handled;
        }

        public static Animate(region: Region, element: HTMLElement, directive: Directive){
            let animator = ExtendedDirectiveHandlers.PrepareAnimation(element, directive.arg.options);
            if (!animator){
                return DirectiveHandlerReturn.Nil;
            }

            let regionId = region.GetId(), lastValue: boolean = null;
            region.GetState().TrapGetAccess(() => {
                lastValue = !! CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                animator(lastValue, null, false);
            }, () => {
                if (lastValue != (!! CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value))){
                    lastValue = !lastValue;
                    animator(lastValue);
                }
            }, element);

            return DirectiveHandlerReturn.Handled;
        }

        public static Typewriter(region: Region, element: HTMLElement, directive: Directive){
            let data = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (!data){
                return DirectiveHandlerReturn.Nil;
            }

            let info: TypewriterInfo = {
                list: new Array<string>(),
                delay: 100,
                interval: 250,
                iterations: -1,
                showDelete: false,
                useRandom: false,
                showCursor: false
            };
            
            if (typeof data === 'string'){
                info.list.push(data);
            }
            else if (Array.isArray(data)){
                data.forEach(item => info.list.push(item));
            }
            else{
                return DirectiveHandlerReturn.Nil;
            }

            let nextDuration = '', iterationsIsNext = false;
            directive.arg.options.forEach((option) => {//Parse options
                if (nextDuration){
                    let duration = CoreDirectiveHandlers.ExtractDuration(option, null);
                    if (duration !== null){
                        info[nextDuration] = duration;
                        nextDuration = '';
                        return;
                    }

                    nextDuration = '';
                }
                else if (iterationsIsNext){
                    iterationsIsNext = false;
                    if (option === 'inf' || option === 'infinite'){
                        info.iterations = -1;
                    }
                    else{
                        info.iterations = (parseInt(option) || -1);
                    }

                    return;
                }
                
                if (option === 'delay' || option === 'interval'){
                    nextDuration = option;
                    info[nextDuration] = (info[nextDuration] || 250);
                }
                else if (option === 'iterations'){
                    iterationsIsNext = true;
                }
                else if (option === 'delete'){
                    info.showDelete = true;
                }
                else if (option === 'random'){
                    info.useRandom = true;
                }
                else if (option === 'cursor'){
                    info.showCursor = true;
                }
            });
            
            let lineIndex = -1, index = 0, line: string, isDeleting = false, span = document.createElement('span'), duration: number, startTimestamp: DOMHighResTimeStamp = null, stopped = false;
            let pass = (timestamp: DOMHighResTimeStamp) => {
                if (lineIndex == -1 || line.length <= index){
                    index = 0;
                    if (isDeleting || lineIndex == -1 || !info.showDelete){
                        lineIndex = (info.useRandom ? Math.floor(Math.random() * info.list.length) : ++lineIndex);
                        if (info.list.length <= lineIndex){//Move to front of list
                            lineIndex = 0;
                        }

                        line = info.list[lineIndex];
                        isDeleting = false;
                    }
                    else{
                        isDeleting = true;
                    }

                    duration = info.interval;
                }
                
                if (startTimestamp === null){
                    startTimestamp = timestamp;
                }

                if ((timestamp - startTimestamp) < duration){//Duration not met
                    requestAnimationFrame(pass);
                    return;
                }
                
                startTimestamp = timestamp;
                if (isDeleting){
                    ++index;
                    span.innerText = line.substr(0, (line.length - index));
                    duration = info.delay;
                }
                else{//Append
                    ++index;
                    span.innerText = line.substring(0, index);
                    duration = info.delay;
                }

                if (!stopped){
                    requestAnimationFrame(pass);
                }
            };

            span.classList.add('typewriter-text');
            if (info.showCursor){
                span.style.borderRight = '1px solid #333333';
            }
            
            element.appendChild(span);
            requestAnimationFrame(pass);

            region.AddElement(element).uninitCallbacks.push(() => {
                stopped = true;
            });
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Router(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$router', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }

            let options = (CoreDirectiveHandlers.Evaluate(region, element, directive.value) as RouterOptions), uid = 0;
            if (!Region.IsObject(options)){
                options = {};
            }
            
            let regionId = region.GetId(), origin = location.origin, pathname = location.pathname, query = location.search.substr(1), alertable = [ 'url', 'currentPage', 'currentQuery', 'targetUrl' ], info: RouterInfo = {
                currentPage: null,
                currentQuery: '',
                pages: [],
                url: null,
                targetUrl: null,
                mount: null,
                mountElement: null,
                middlewares: {}
            }, methods = {
                register: (data: Record<string, any>) => {
                    let innerRegion = Region.Get(RegionMap.scopeRegionIds.Peek());
                    if (innerRegion){
                        register(data.page, (data.path || ((typeof data.page === 'string') ? data.page : null)), data.title, innerRegion.GetComponentKey(), (data.entry || 'open'), (data.exit || 'close'), !! data.disabled, data.middlewares, data.uid);
                    }
                },
                unregister: (uid: number) => {
                    for (let i = 0; i < info.pages.length; ++i){
                        if (info.pages[i].uid == uid){
                            info.pages.splice(i, 1);
                            break;
                        }
                    }
                },
                disable: (uid: number, disabled = true) => {
                    for (let i = 0; i < info.pages.length; ++i){
                        if (info.pages[i].uid == uid){
                            info.pages[i].disabled = disabled;
                            break;
                        }
                    }
                },
                goto: (page: string, args?: Array<any> | any) => { goto(page, args) },
                redirect: (page: string, args?: Array<any> | any) => { goto(page, args, true) },
                reload: () => {
                    window.dispatchEvent(new CustomEvent('router.reload'));
                    if (info.mount){
                        info.mount(info.url);
                    }
                },
                back: () => { back() },
                addMiddleware: (name: string, handler: (page?: string, args?: Array<any> | any) => boolean) => {
                    info.middlewares[name] = handler;
                },
                parseQuery: (query: string) => parseQuery(query),
                setTitle: (title: string) => {
                    document.title = `${options.titlePrefix || ''}${title || 'Untitled'}${options.titleSuffix || ''}`;
                },
            };

            if (options.urlPrefix){
                options.urlPrefix += '/';
            }
            else{//Empty
                options.urlPrefix = '';
            }

            let scope = ExtendedDirectiveHandlers.AddScope('router', region.AddElement(element, true), Object.keys(methods));
            let register = (page: string | RegExp, path: string, title: string, component: string, entry: string, exit: string, disabled: boolean, middlewares: Array<string>, uid: number) => {
                if (typeof page === 'string' && page.length > 1 && page.startsWith('/')){
                    page = page.substr(1);
                }

                if (path && path.length > 1 && path.startsWith('/')){
                    path = path.substr(1);
                }
                
                info.pages.push({
                    pattern: page,
                    path: path,
                    title: title,
                    component: component,
                    entry: entry,
                    exit: exit,
                    disabled: disabled,
                    middlewares: ((middlewares && Array.isArray(middlewares)) ? middlewares : new Array<string>()),
                    uid: uid,
                });
            };

            let goto = (page: string, query?: string, replace = false, onReload?: () => boolean) => {
                page = page.trim();
                query = (query || '').trim();
                
                if (page.startsWith(`${origin}/`)){
                    page = (page.substr(origin.length + 1) || '/');
                }
                else if (page.length > 1 && page.startsWith('/')){
                    page = page.substr(1);
                }

                query = (query || '');
                if (query && query.substr(0, 1) !== '?'){
                    query = `?${query}`;
                }
                
                load(page, query, (title: string, path: string) => {
                    document.title = `${options.titlePrefix || ''}${title || 'Untitled'}${options.titleSuffix || ''}`;
                    if (replace){
                        history.replaceState({
                            page: page,
                            query: query
                        }, title, buildHistoryPath(path, query));
                    }
                    else{
                        history.pushState({
                            page: page,
                            query: query
                        }, title, buildHistoryPath(path, query));
                    }
                }, onReload);
            };
            
            let back = () => {
                if (info.currentPage && info.currentPage !== '/'){
                    history.back();
                    return true;
                }

                return false;
            };

            let load = (page: string, query: string, callback?: (title: string, path: string) => void, onReload?: () => boolean) => {
                let myRegion = Region.Get(regionId);
                if (info.currentPage && info.currentPage !== '/'){
                    let currentPageInfo = findPage(info.currentPage);
                    if (currentPageInfo){
                        unload(currentPageInfo.component, currentPageInfo.exit);
                    }
                }

                if (info.currentPage !== page){
                    info.currentPage = page;
                    ExtendedDirectiveHandlers.Alert(myRegion, 'currentPage', scope);
                }

                if (info.currentQuery !== query){
                    info.currentQuery = query;
                    ExtendedDirectiveHandlers.Alert(myRegion, 'currentQuery', scope);
                }

                let pageInfo = findPage(page);
                if (!pageInfo || pageInfo.disabled){//Not found
                    let targetUrl = buildPath(page, query), isReload = (targetUrl === info.targetUrl);
                    if (!isReload){
                        info.targetUrl = targetUrl;
                        ExtendedDirectiveHandlers.Alert(myRegion, 'targetUrl', scope);
                    }
                    
                    let url = buildPath('404', null);
                    if (url !== info.url){
                        info.url = url;
                        ExtendedDirectiveHandlers.Alert(myRegion, 'url', scope);
                        if (info.mount){
                            info.mount(url);
                        }
                    }
                    
                    if (isReload){
                        window.dispatchEvent(new CustomEvent('router.reload'));
                        if (onReload && !onReload()){
                            return;
                        }
                    }

                    window.dispatchEvent(new CustomEvent('router.404', { detail: page }));
                    if (callback){
                        callback('Page Not Found', page);
                    }
                    
                    return;
                }
                
                let component = pageInfo.component, handled: any;
                for (let i = 0; i < (pageInfo.middlewares || []).length; ++i){
                    let middleware = pageInfo.middlewares[i];
                    if (middleware in info.middlewares && !info.middlewares[middleware](page, query)){
                        return;//Rejected
                    }
                };

                try{
                    if (component){
                        handled = (Region.Find(component, true)[pageInfo.entry])(query);
                    }
                    else{
                        handled = false;
                    }
                }
                catch(err){
                    handled = false;
                }

                if (handled === false){
                    let url = buildPath((pageInfo.path || page), query);
                    if (url !== info.url){
                        info.url = url;
                        ExtendedDirectiveHandlers.Alert(myRegion, 'url', scope);
                    }

                    if (url === info.targetUrl){
                        window.dispatchEvent(new CustomEvent('router.reload'));
                        if (onReload && !onReload()){
                            return;
                        }
                    }
                    else{//New target
                        info.targetUrl = url;
                        ExtendedDirectiveHandlers.Alert(myRegion, 'targetUrl', scope);
                    }

                    if (info.mount){
                        info.mount(url);
                    }
                }

                if (callback){
                    callback(pageInfo.title, (pageInfo.path || page));
                }
                
                window.dispatchEvent(new CustomEvent('router.load'));
            };

            let unload = (component: string, exit: string) => {
                try{
                    (Region.Find(component, true)[exit])();
                }
                catch (err){}
            };

            let parseQuery = (query: string) => {
                let params: Record<string, string> = {};
                if (query && query.startsWith('?')){
                    query = query.substr(1);
                }
                
                if (!query){
                    return params;
                }
                
                let match: RegExpExecArray, search = /([^&=]+)=?([^&]*)/g;
                let decode = (value: string) => {
                    return decodeURIComponent(value.replace(/\+/g, ' '));
                };
                
                while (match = search.exec(query)){
                    params[decode(match[1])] = decode(match[2]);
                }

                return params;
            };

            let findPage = (page: string) => {
                for (let pageInfo of info.pages){
                    let isString = (typeof pageInfo.pattern === 'string');
                    if ((isString && page === pageInfo.pattern) || (!isString && (pageInfo.pattern as RegExp).test(page))){
                        return pageInfo;
                    }
                }

                return null;
            };

            let buildPath = (path: string, query: string) => {
                return `${origin}/${options.urlPrefix}${(path === '/') ? '' : path}${query || ''}`;
            };
            
            let buildHistoryPath = (path: string, query: string) => {
                return `${origin}/${(path === '/') ? '' : path}${query || ''}`;
            };
            
            window.addEventListener('popstate', (event) => {
                if (event.state){
                    load(event.state.page, event.state.query);
                }
            });

            DirectiveHandlerManager.AddHandler('routerMount', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                if (info.mount){
                    return DirectiveHandlerReturn.Nil;
                }
                
                info.mountElement = document.createElement('div');
                innerElement.parentElement.insertBefore(info.mountElement, innerElement);
                info.mountElement.classList.add('router-mount');

                let mount = (url: string) => {
                    ExtendedDirectiveHandlers.FetchLoad(info.mountElement, url, false, () => {
                        window.scrollTo({ top: -window.scrollY, left: 0 });
                        window.dispatchEvent(new CustomEvent('router.mount.load'));
                        Bootstrap.Reattach();
                    }, (err) => {
                        window.dispatchEvent(new CustomEvent(`router.mount.error`, {
                            detail: {
                                error: err,
                                mount: info.mountElement,
                            },
                        }));
                    });
                };

                info.mount = mount;
                innerRegion.AddElement(innerElement).uninitCallbacks.push(() => {
                    if (info.mount === mount){
                        info.mount = null;
                    }
                });

                return DirectiveHandlerReturn.Handled;
            });
            
            DirectiveHandlerManager.AddHandler('routerRegister', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let innerScope = innerRegion.AddElement(innerElement);
                if (!innerScope){
                    return DirectiveHandlerReturn.Nil;    
                }
                
                let data = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value), innerUid: number = (data.uid || uid++);
                register(data.page, (data.path || ((typeof data.page === 'string') ? data.page : null)), data.title, innerRegion.GetComponentKey(), (data.entry || 'open'), (data.exit || 'close'), !! data.disabled, data.middlewares, data.uid);

                innerScope.uninitCallbacks.push(() => {
                    methods.unregister(uid);
                });
                
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('routerLink', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let innerRegionId = innerRegion.GetId(), target = innerElement, active: boolean | null = null, nav = (innerDirective.arg.options.indexOf('nav') != -1), path = innerDirective.value, query = '', onEvent = () => {
                    if (document.contains(innerElement)){
                        if (active !== null && active == (info.currentPage === path)){
                            return;
                        }
                        
                        if (info.currentPage === path){
                            active = true;
                            if (nav){
                                innerElement.classList.add('router-active');
                            }
                        }
                        else{
                            active = false;
                            if (nav && innerElement.classList.contains('router-active')){
                                innerElement.classList.remove('router-active');
                            }
                        }

                        ExtendedDirectiveHandlers.Alert(Region.Get(innerRegionId), 'active', innerScope);
                        innerElement.dispatchEvent(new CustomEvent('router.active'));
                    }
                    else{//Removed from DOM
                        window.removeEventListener('router.load', onEvent);
                    }
                };

                let innerScope = ExtendedDirectiveHandlers.AddScope('router', innerRegion.AddElement(innerElement, true), []), reload = (innerDirective.arg.key === 'reload');
                if (path){//Use specified path
                    let queryIndex = path.indexOf('?');
                    if (queryIndex != -1){//Split
                        query = path.substr(queryIndex + 1);
                        path = path.substr(0, queryIndex);
                    }
                }
                else if (!(innerElement instanceof HTMLFormElement) && !(innerElement instanceof HTMLAnchorElement)){//Resolve path
                    target = (innerElement.querySelector('a') || innerElement.querySelector('form') || innerElement);
                }

                window.addEventListener('router.load', onEvent);
                if (target instanceof HTMLFormElement){
                    if (target.method && target.method.toLowerCase() !== 'get' && target.method.toLowerCase() !== 'head'){
                        return DirectiveHandlerReturn.Nil;
                    }
                    
                    target.addEventListener('submit', (e) => {
                        e.preventDefault();

                        let data = new FormData(target as HTMLFormElement), thisPath = (target as HTMLFormElement).action, thisQuery = '';
                        if (!path){//Compute path
                            let queryIndex = thisPath.indexOf('?');
                            if (queryIndex != -1){//Split
                                thisQuery = thisPath.substr(queryIndex + 1);
                                thisPath = thisPath.substr(0, queryIndex);
                            }
                        }
                        else{//Use specified path
                            thisPath = path;
                            thisQuery = query;
                        }
                        
                        data.forEach((value, key) => {
                            if (thisQuery){
                                thisQuery = `${thisQuery}&${key}=${value.toString()}`;
                            }
                            else{
                                thisQuery = `${key}=${value.toString()}`;
                            }
                        });
                        
                        goto(thisPath, thisQuery);
                    });

                    return DirectiveHandlerReturn.Handled;
                }
                
                target.addEventListener('click', (e) => {
                    e.preventDefault();

                    let thisPath = path, thisQuery = query;
                    if (!path && target instanceof HTMLAnchorElement){//Compute path
                        thisPath = target.href;
                        thisQuery = '';
                        
                        let queryIndex = thisPath.indexOf('?');
                        if (queryIndex != -1){//Split
                            thisQuery = thisPath.substr(queryIndex + 1);
                            thisPath = thisPath.substr(0, queryIndex);
                        }
                    }
                    
                    goto(thisPath, thisQuery, false, () => {
                        if (!reload){//Scroll top
                            window.scrollTo({ top: -window.scrollY, left: 0, behavior: 'smooth' });
                            return false;
                        }
                        return true;
                    });
                });

                let innerProxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === 'active'){
                        Region.Get(innerRegionId).GetChanges().AddGetAccess(`${innerScope.path}.${prop}`);
                        return active;
                    }
                    
                    return proxy[prop];
                }, ['active', ...Object.keys(info), ...Object.keys(methods)]);
                
                innerRegion.AddLocal(innerElement, '$router', () => innerProxy);
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('routerBack', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    back();
                });
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('routerFullPage', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let innerScope = innerRegion.AddElement(innerElement);
                if (!innerScope){
                    return DirectiveHandlerReturn.Nil;    
                }

                innerScope.uninitCallbacks.push(() => {
                    if (info.mountElement && info.mountElement.classList.contains('full-page')){
                        info.mountElement.classList.remove('full-page');
                    }
                });
                
                if (info.mountElement){
                    info.mountElement.classList.add('full-page');
                }

                return DirectiveHandlerReturn.Handled;
            });
            
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in info){
                    if (alertable.indexOf(prop) != -1){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    }
                    return info[prop];
                }

                if (prop in methods){
                    return methods[prop];
                }
            }, [...Object.keys(info), ...Object.keys(methods)]);
            
            Region.AddGlobal('$router', () => proxy);
            Region.AddPostProcessCallback(() => {
                goto(((pathname.length > 1 && pathname.startsWith('/')) ? pathname.substr(1): pathname), query);
            });
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Screen(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$screen', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }
            
            let computeBreakpoint = (width: number) => {
                if (width < 576){//Extra small
                    return [ 'xs', 0 ];
                }

                if (width < 768){//Small
                    return [ 'sm', 1 ];
                }

                if (width < 992){//Medium
                    return [ 'md', 2 ];
                }

                if (width < 1200){//Large
                    return [ 'lg', 3 ];
                }

                if (width < 1400){//Extra large
                    return [ 'xl', 4 ];
                }

                return [ 'xxl', 5 ];//Extra extra large
            };
            
            let size = {
                width: screen.width,
                height: screen.height
            }, breakpoint = computeBreakpoint(screen.width), regionId = region.GetId();

            window.addEventListener('resize', () => {
                size.width = screen.width;
                size.height = screen.height;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'size', scope);

                let thisBreakpoint = computeBreakpoint(screen.width);
                if (thisBreakpoint[0] !== breakpoint[0]){
                    breakpoint = thisBreakpoint;
                    window.dispatchEvent(new CustomEvent('screen.breakpoint', {
                        detail: breakpoint[0]
                    }));

                    window.dispatchEvent(new CustomEvent('screen.checkpoint', {
                        detail: breakpoint[1]
                    }));

                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'breakpoint', scope);
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'checkpoint', scope);
                }
            });

            let scope = ExtendedDirectiveHandlers.AddScope('screen', region.AddElement(element, true), []);
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'size'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return size;
                }

                if (prop === 'breakpoint'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return breakpoint[0];
                }

                if (prop === 'checkpoint'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return breakpoint[1];
                }
            }, ['size', 'breakpoint', 'checkpoint']);
            
            Region.AddGlobal('$screen', () => proxy);
            return DirectiveHandlerReturn.Handled;
        }

        public static Cart(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$cart', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }
            
            let handlers = (CoreDirectiveHandlers.Evaluate(region, element, directive.value) as CartHandlers);
            if (!handlers){
                return DirectiveHandlerReturn.Nil;
            }
            
            let scope = ExtendedDirectiveHandlers.AddScope('cart', region.AddElement(element, true), []), regionId = region.GetId(), updatesQueue: Array<() => void> = null;
            let info: CartInfo = {
                items: {},
                itemProxies: {},
                count: 0,
                total: 0
            };

            let computeValues = () => {
                let count = 0, total = 0;
                for (let sku in info.items){
                    count += info.items[sku].quantity;
                    total += (info.items[sku].price * info.items[sku].quantity);
                }

                if (count != info.count){
                    info.count = count;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'count', scope);
                }

                if (total != info.total){
                    info.total = total;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'total', scope);
                }
            };

            let postUpdate = (item: CartItem) => {
                if (ExtendedDirectiveHandlers.Report(regionId, item) || !item){
                    return;
                }

                let sku = item.product.sku;
                if (sku in info.items){//Update exisiting
                    if (info.items[sku].quantity != item.quantity){
                        info.items[sku].quantity = item.quantity;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `items.${sku}.quantity`, scope);
                    }

                    if (info.items[sku].price != item.price){
                        info.items[sku].price = item.price;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `items.${sku}.price`, scope);
                    }
                }
                else{//Add new
                    info.items[sku] = item;
                    info.itemProxies[sku] = createItemProxy(sku);
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);
                }

                computeValues();
            };

            let update = (sku: string, quantity: number, incremental: boolean) => {
                if (updatesQueue){//Defer
                    updatesQueue.push(() => {
                        update(sku, quantity, incremental);
                    });
                    return;
                }
                
                if (handlers.update){
                    handlers.update(sku, quantity, incremental, postUpdate);
                    return;
                }

                if (!handlers.updateLink){
                    return;
                }

                fetch(`${handlers.updateLink}?sku=${sku}&quantity=${quantity}&incremental=${incremental}`, {
                    method: 'GET',
                    credentials: 'same-origin',
                }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(postUpdate).catch((err) => {
                    ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                });
            };

            let clear = () => update(null, 0, false);

            let createItemProxy = (sku: string) => {
                return CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === 'quantity'){
                        if (sku in info.items){
                            Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items.${sku}.${prop}`);
                            return info.items[sku].quantity;
                        }
                        
                        return 0;
                    }

                    if (prop === 'price'){
                        if (sku in info.items){
                            Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items.${sku}.${prop}`);
                            return info.items[sku].price;
                        }
                        
                        return 0;
                    }
    
                    if (prop === 'product'){
                        if (sku in info.items){
                            return info.items[sku].product;
                        }
                        
                        return null;
                    }
                }, ['quantity', 'price', 'product']);
            };

            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in info && prop !== 'itemProxies'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return ((prop === 'items') ? info.itemProxies : info[prop]);
                }

                if (prop === 'update'){
                    return update;
                }

                if (prop === 'clear'){
                    return clear;
                }
            }, ['items', 'count', 'total', 'update', 'clear']);

            handlers.load = (items: Record<string, CartItem>) => {
                info.items = (items || {});
                info.itemProxies = {};
                
                for (let sku in info.items){//Create proxies
                    info.itemProxies[sku] = createItemProxy(sku);
                }

                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);
                computeValues();

                (updatesQueue || []).forEach((callback) => {
                    try{
                        callback();
                    }
                    catch (err){}
                });

                updatesQueue = null;
            };

            Region.AddGlobal('$cart', () => proxy);
            DirectiveHandlerManager.AddHandler('cartClear', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    clear();
                });
                return DirectiveHandlerReturn.Handled;
            });
            
            DirectiveHandlerManager.AddHandler('cartUpdate', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let form = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, '$form');
                if (!form || !(form instanceof HTMLFormElement)){
                    return DirectiveHandlerReturn.Nil;
                }
                
                let sku = '';
                innerRegion.GetState().TrapGetAccess(() => {
                    sku = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                }, true, innerElement);

                if (!sku){
                    return DirectiveHandlerReturn.Nil;    
                }

                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    update(sku, parseInt(((form as HTMLFormElement).elements.namedItem('cart-value') as HTMLInputElement).value), false);
                });
                
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('cartIncrement', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let sku = '';
                innerRegion.GetState().TrapGetAccess(() => {
                    sku = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                }, true, innerElement);
                
                if (!sku){
                    return DirectiveHandlerReturn.Nil;    
                }

                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    update(sku, 1, true);
                });
                
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('cartDecrement', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let sku = '';
                innerRegion.GetState().TrapGetAccess(() => {
                    sku = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                }, true, innerElement);

                if (!sku){
                    return DirectiveHandlerReturn.Nil;    
                }

                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    update(sku, -1, true);
                });

                return DirectiveHandlerReturn.Handled;
            });
            
            if (handlers.init){
                handlers.init();
            }
            
            return DirectiveHandlerReturn.Handled;
        }

        public static DB(region: Region, element: HTMLElement, directive: Directive){
            let data = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (typeof data === 'string'){
                data = {
                    name: data
                };
            }

            if (!Region.IsObject(data) || !data.name){
                return DirectiveHandlerReturn.Nil;
            }

            let options: DBOptions;
            if ('__InlineJS_Target__' in data){
                options = data['__InlineJS_Target__'];
            }
            else{//Raw data
                options = data;
            }
            
            let opened = false, openRequest: IDBOpenDBRequest = null, handle: IDBDatabase = null, queuedRequests = new Array<() => void>(), regionId = region.GetId();
            let open = (myRegion: Region) => {
                if (options.drop){
                    window.indexedDB.deleteDatabase(options.name);
                }
                
                openRequest = window.indexedDB.open(options.name);
                openRequest.addEventListener('error', (e) => {
                    opened = true;
                    Region.Get(regionId).GetState().ReportError(`Failed to open database '${options.name}'`, e);
                });

                openRequest.addEventListener('success', () => {
                    handle = openRequest.result;
                    opened = true;

                    queuedRequests.forEach((callback) => {
                        try{
                            callback();
                        }
                        catch (err){}
                    });

                    queuedRequests = new Array<() => void>();
                });

                openRequest.addEventListener('upgradeneeded', () => {
                    let db = openRequest.result, store = db.createObjectStore(options.name);
                    db.addEventListener('error', (e) => {
                        opened = true;
                        Region.Get(regionId).GetState().ReportError(`Failed to open database '${options.name}'`, e);
                    });

                    Object.keys(options.fields || {}).forEach((key) => {
                        store.createIndex(key, key, {
                            unique: options.fields[key]
                        });
                    });
                });
            };

            let close = () => {
                if (handle){
                    handle.close();
                }
                else if (!opened){//Queue
                    queuedRequests.push(close);
                }
            };

            let read = (key: string, callback: (value: any) => void) => {
                if (!handle){
                    if (opened){
                        callback(null);
                    }
                    else{//Queue
                        queuedRequests.push(() => { read(key, callback) });
                    }
                    
                    return;
                }
                
                let transaction = handle.transaction(options.name, 'readonly');
                let store = transaction.objectStore(options.name);

                let request = store.get(key);
                request.addEventListener('success', () => {
                    callback(request.result);
                });

                request.addEventListener('error', (e) => {
                    callback(null);
                    Region.Get(regionId).GetState().ReportError(`Failed to read from database '${options.name}'`, e);
                });
            };

            let write = (value: any, key?: string, callback?: (value: boolean) => void) => {
                if (!handle){
                    if (!opened){
                        queuedRequests.push(() => { write(value, key, callback) });
                    }
                    else if (callback){
                        callback(false);
                    }
                    
                    return;
                }

                let transaction = handle.transaction(options.name, 'readwrite');
                let store = transaction.objectStore(options.name);

                let request = store.put(value, key);
                request.addEventListener('success', () => {
                    if (callback){
                        callback(true);
                    }
                });

                request.addEventListener('error', (e) => {
                    if (callback){
                        callback(false);
                    }
                    Region.Get(regionId).GetState().ReportError(`Failed to write to database '${options.name}'`, e);
                });
            };

            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('db', elementScope, []);

            elementScope.locals['$db'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in options){
                    return options[prop];
                }

                if (prop === 'close'){
                    return close;
                }

                if (prop === 'read'){
                    return read;
                }

                if (prop === 'write'){
                    return write;
                }

                if (prop in scope.callbacks){
                    return (callback: (value: any) => boolean) => (scope.callbacks[prop] as Array<(value?: any) => boolean>).push(callback);
                }
            }, [...Object.keys(options), ...Object.keys(scope.callbacks)]);

            open(region);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Auth(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$auth', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }

            const userUrl = `${window.location.origin}/auth/user`;
            const registerUrl = `${window.location.origin}/auth/register`;

            const loginUrl = `${window.location.origin}/auth/login`;
            const logoutUrl = `${window.location.origin}/auth/logout`;

            const updateUrl = `${window.location.origin}/auth/update`;
            const deleteUrl = `${window.location.origin}/auth/delete`;

            let data = CoreDirectiveHandlers.Evaluate(region, element, directive.value), userData: Record<string, any> = null, isInit = false, redirectPage: string = null, redirectQuery: string = null;
            if (!Region.IsObject(data)){//Retrieve data
                fetch(userUrl, {
                    method: 'GET',
                    credentials: 'same-origin',
                }).then(response => response.json()).then((data) => {
                    if (!isInit){
                        isInit = true;
                        alertAll();
                        userData = (data || null);
                    }
                });
            }
            else{//Use specified data
                isInit = true;
                userData = (data.userData || null);
            }

            let alertAll = () => {
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'check', scope);
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'roles', scope);
                Object.keys(userData || {}).forEach(key => ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `fields.${key}`, scope));
            };

            let getRouter = () => {
                return Region.GetGlobalValue(regionId, '$router');
            };

            let redirect = (loggedIn: boolean, refresh = false) => {
                if (refresh){
                    if (loggedIn){
                        window.location.href = `${(redirectPage || '/')}${redirectQuery ? ('?' + redirectQuery) : ''}`;
                    }
                    else{
                        window.location.href = (redirectPage || '/');
                    }
                }
                else{
                    Region.Get(regionId).AddNextTickCallback(() => {
                        let router = getRouter();
                        if (router && loggedIn){
                            router.goto((redirectPage || '/'), redirectQuery);
                        }
                        else if (router){
                            router.goto('/');
                        }
                    });
                }
            };

            let rawHasRole = (name: string) => {
                return (userData && Array.isArray(userData.roles) && userData.roles.indexOf(name) != -1);
            };

            let methods = {
                check: () => {
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.check`);
                    return !! userData;
                },
                hasRole: (name: string) => {
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.roles`);
                    return rawHasRole(name);
                },
                isAdmin: () => {
                    return methods.hasRole('admin');
                },
                getField: (key: string) => {
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.fields.${key}`);
                    return (userData ? userData[key] : null);
                },
                getName: () => {
                    return methods.getField('name');
                },
                getEmail: () => {
                    return methods.getField('email');
                },
                refresh: () => {
                    fetch(userUrl, {
                        method: 'GET',
                        credentials: 'same-origin',
                    }).then(response => response.json()).then((data) => {
                        isInit = true;
                        alertAll();
                        userData = (data || null);
                    });
                },
                desync: (logout: boolean, callback?: (data: any, err?: any) => boolean) => {
                    if (!userData){
                        return;
                    }
                    
                    fetch((logout ? logoutUrl : deleteUrl), {
                        method: 'GET',
                        credentials: 'same-origin',
                    }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then((data) => {
                        isInit = true;
                        if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!callback || callback(data))){
                            alertAll();
                            userData = null;

                            window.dispatchEvent(new CustomEvent('auth.authentication', {
                                detail: false
                            }));

                            redirect(false);
                        }
                    }).catch((err) => {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback){
                            callback(null, err);
                        }
                    });
                },
                logout: (callback?: (data: any, err?: any) => boolean) => {
                    methods.desync(true, callback);
                },
                authenticate: (login: boolean, form: HTMLFormElement | Record<string, string>, callback?: (data: any, err?: any) => boolean) => {
                    if (userData){
                        return;
                    }
                    
                    let formData: FormData;
                    if (!(form instanceof HTMLFormElement)){
                        formData = new FormData();
                        Object.keys(form || {}).forEach(key => formData.append(key, form[key]));
                    }
                    else{
                        formData = new FormData(form);
                    }

                    fetch((login ? loginUrl : registerUrl), {
                        method: 'POST',
                        credentials: 'same-origin',
                        body: formData
                    }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then((data) => {
                        isInit = true;
                        if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!callback || callback(data))){
                            userData = (data || {});
                            alertAll();

                            window.dispatchEvent(new CustomEvent('auth.authentication', {
                                detail: true
                            }));

                            redirect(true);
                        }
                    }).catch((err) => {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback){
                            callback(null, err);
                        }
                    });
                },
                login: (form: HTMLFormElement | Record<string, string>, callback?: (data: any, err?: any) => boolean) => {
                    methods.authenticate(true, form, callback);
                },
                register: (form: HTMLFormElement | Record<string, string>, errorBag?: Record<string, Array<string>>, callback?: (data: any, err?: any) => boolean) => {
                    methods.authenticate(false, form, (data, err) => {
                        if (errorBag && 'failed' in data){
                            for (let key in errorBag){
                                let value = (data.failed[key] || []);
                                errorBag[key] = (Array.isArray(value) ? value : [value]);
                            }
                        }

                        return (!callback || callback(data, err));
                    });
                },
                update: (form: HTMLFormElement | Record<string, string>, errorBag?: Record<string, Array<string>>, callback?: (data: any, err?: any) => boolean) => {
                    if (!userData){
                        return;
                    }

                    let formData: FormData;
                    if (!(form instanceof HTMLFormElement)){
                        formData = new FormData();
                        Object.keys(form || {}).forEach(key => formData.append(key, form[key]));
                    }
                    else{
                        formData = new FormData(form);
                    }

                    fetch(updateUrl, {
                        method: 'POST',
                        credentials: 'same-origin',
                        body: formData
                    }).then((response) => {
                        if (response.ok){
                            return response.json();
                        }
    
                        ExtendedDirectiveHandlers.ReportServerError(null, {
                            status: response.status,
                            statusText: response.statusText,
                        });
                    }).then((data) => {
                        isInit = true;
                        if (errorBag && 'failed' in data){
                            for (let key in errorBag){
                                let value = (data.failed[key] || []);
                                errorBag[key] = (Array.isArray(value) ? value : [value]);
                            }
                        }
                        
                        if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!callback || callback(data))){
                            userData = (data || {});
                            alertAll();
                        }
                    }).catch((err) => {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback){
                            callback(null, err);
                        }
                    });
                },
                delete: (callback?: (data: any, err?: any) => boolean) => {
                    methods.desync(false, callback);
                },
                addMiddlewares: (roles?: Array<string>) => {
                    let router = getRouter();
                    if (!router){
                        return;
                    }

                    let redirectToLogin = (page: string, query: string) => {
                        router.goto('/login');
                        redirectPage = page;
                        redirectQuery = query;
                    };
                    
                    router.addMiddleware('guest', (page: string, query: string) => {
                        redirectPage = redirectQuery = null;
                        if (userData){//Logged in
                            router.goto('/');
                            return false;
                        }

                        return true;
                    });

                    router.addMiddleware('auth', (page: string, query: string) => {
                        redirectPage = redirectQuery = null;
                        if (!userData){//Not logged in
                            redirectToLogin(page, query);
                            return false;
                        }

                        return true;
                    });

                    (roles || []).forEach((role) => {
                        router.addMiddleware(`role:${role}`, (page: string, query: string) => {
                            redirectPage = redirectQuery = null;
                            if (!userData){//Not logged in
                                redirectToLogin(page, query);
                                return false;
                            }
    
                            return (rawHasRole(role) ? true : null);
                        });
                    });
                },
            };
            
            let scope = ExtendedDirectiveHandlers.AddScope('auth', region.AddElement(element, true), []), regionId = region.GetId();
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in methods){
                    return methods[prop];
                }
            }, Object.keys(methods));
            
            Region.AddGlobal('$auth', () => proxy);
            methods.addMiddlewares((data || {}).middlewareRoles);

            DirectiveHandlerManager.AddHandler('authRegister', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                if (!(innerElement instanceof HTMLFormElement)){
                    return DirectiveHandlerReturn.Nil;    
                }
                
                let data = CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                if (!Region.IsObject(data)){
                    data = {};
                }
                
                innerElement.addEventListener('submit', (e) => {
                    e.preventDefault();
                    methods.register(innerElement, data.errorBag, data.callback);
                });

                let redirectWatch = (e: Event) => {
                    setTimeout(() => {
                        if (redirectWatch){
                            redirect((e as CustomEvent).detail, true);
                        }
                    }, 3000);
                };

                window.addEventListener('auth.authentication', redirectWatch);
                innerRegion.AddElement(innerElement).uninitCallbacks.push(() => {
                    window.removeEventListener('auth.authentication', redirectWatch);
                    redirectWatch = null;
                });

                return DirectiveHandlerReturn.Handled;
            });
            
            DirectiveHandlerManager.AddHandler('authLogin', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                if (!(innerElement instanceof HTMLFormElement)){
                    return DirectiveHandlerReturn.Nil;    
                }
                
                let callback = CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                innerElement.addEventListener('submit', (e) => {
                    e.preventDefault();
                    methods.login(innerElement, callback);
                });

                let redirectWatch = (e: Event) => {
                    setTimeout(() => {
                        if (redirectWatch){
                            redirect((e as CustomEvent).detail, true);
                        }
                    }, 3000);
                };

                window.addEventListener('auth.authentication', redirectWatch);
                innerRegion.AddElement(innerElement).uninitCallbacks.push(() => {
                    window.removeEventListener('auth.authentication', redirectWatch);
                    redirectWatch = null;
                });

                return DirectiveHandlerReturn.Handled;
            });
            
            DirectiveHandlerManager.AddHandler('authUpdate', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                if (!(innerElement instanceof HTMLFormElement)){
                    return DirectiveHandlerReturn.Nil;    
                }
                
                let data = CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                if (!Region.IsObject(data)){
                    data = {};
                }

                innerElement.addEventListener('submit', (e) => {
                    e.preventDefault();
                    methods.update(innerElement, data.errorBag, data.callback);
                });

                return DirectiveHandlerReturn.Handled;
            });
            
            DirectiveHandlerManager.AddHandler('authLogout', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let callback = CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                if (innerElement instanceof HTMLFormElement){
                    innerElement.addEventListener('submit', (e) => {
                        e.preventDefault();
                        methods.logout(callback as (data: any, err?: any) => boolean);
                    });
                }
                else{//Click
                    innerElement.addEventListener('click', (e) => {
                        e.preventDefault();
                        methods.logout(callback as (data: any, err?: any) => boolean);
                    });
                }
                
                return DirectiveHandlerReturn.Handled;
            });
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Geolocation(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$geolocation', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }
            
            let position: Position = null, error: PositionError = null, regionId = region.GetId(), requested = false, tracking = false;
            let check = () => {
                if (navigator.geolocation){
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

            let setPosition = (value: Position) => {
                position = value;
                window.dispatchEvent(new CustomEvent('geolocation.position', {
                    detail: value
                }));
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'position', scope);
            };

            let setError = (value: PositionError) => {
                error = value;
                window.dispatchEvent(new CustomEvent('geolocation.error', {
                    detail: value
                }));
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'error', scope);
            };

            let request = () => {
                if (!requested && check()){
                    requested = true;
                    navigator.geolocation.getCurrentPosition(setPosition, setError);
                }
            };

            let track = () => {
                if (!tracking && check()){
                    requested = tracking = true;
                    navigator.geolocation.watchPosition(setPosition, setError);
                }
            };

            let reset = () => {
                requested = tracking = false;
                position = null;
                error = null;

                window.dispatchEvent(new CustomEvent('geolocation.position', {
                    detail: null
                }));

                window.dispatchEvent(new CustomEvent('geolocation.error', {
                    detail: null
                }));

                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'position', scope);
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'error', scope);
            };

            let scope = ExtendedDirectiveHandlers.AddScope('geolocation', region.AddElement(element, true), []);
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'position'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return position;
                }

                if (prop === 'error'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return error;
                }

                if (prop === 'request'){
                    return request;
                }

                if (prop === 'track'){
                    return track;
                }

                if (prop === 'reset'){
                    return reset;
                }
            }, ['position', 'error', 'request', 'track', 'reset']);
            
            Region.AddGlobal('$geolocation', () => proxy);
            DirectiveHandlerManager.AddHandler('geolocationRequest', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    request();
                });
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('geolocationTrack', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    track();
                });
                return DirectiveHandlerReturn.Handled;
            });
            
            DirectiveHandlerManager.AddHandler('geolocationReset', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    reset();
                });
                return DirectiveHandlerReturn.Handled;
            });
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Reporter(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$reporter', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }

            let info = (CoreDirectiveHandlers.Evaluate(region, element, directive.value) as ReporterInfo);
            if (!Region.IsObject(info) || !('report' in info)){
                return DirectiveHandlerReturn.Nil;
            }

            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in info){
                    return info[prop];
                }
            }, Object.keys(info));

            Region.AddGlobal('$reporter', () => proxy);
            return DirectiveHandlerReturn.Handled;
        }

        public static Overlay(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$overlay', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }

            let scope = ExtendedDirectiveHandlers.AddScope('overlay', region.AddElement(element, true), []), regionId = region.GetId();
            let count = 0, container = document.createElement('div'), zIndex = 1000, visible = false;

            let show = () => {
                ++count;
                if (!visible){
                    visible = true;

                    container.classList.add('inlinejs-overlay');
                    document.body.classList.add('inlinejs-overlay');

                    if (document.body.clientHeight < document.body.scrollHeight){
                        document.body.classList.add('inlinejs-overlay-pad');
                    }

                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'visible', scope);
                }

                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'count', scope);
            };

            let hide = () => {
                if (count <= 0){
                    return;
                }
                
                if (--count <= 0){
                    count = 0;
                    if (visible){
                        visible = false;
                        if (document.body.classList.contains('inlinejs-overlay-pad')){
                            document.body.classList.remove('inlinejs-overlay-pad');
                        }
        
                        if (document.body.classList.contains('inlinejs-overlay')){
                            document.body.classList.remove('inlinejs-overlay');
                        }

                        if (container.classList.contains('inlinejs-overlay')){
                            container.classList.remove('inlinejs-overlay');
                        }

                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'visible', scope);
                    }
                }

                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'count', scope);
            };

            container.style.zIndex = zIndex.toString();
            document.body.appendChild(container);
            
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'show'){
                    return show;
                }

                if (prop === 'hide'){
                    return hide;
                }

                if (prop === 'count'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return count;
                }

                if (prop === 'visible'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return visible;
                }

                if (prop === 'zIndex'){
                    return zIndex;
                }

                if (prop === 'container'){
                    return container;
                }
            }, ['show', 'hide', 'visible', 'zIndex', 'container']);

            Region.AddGlobal('$overlay', () => proxy);
            DirectiveHandlerManager.AddHandler('overlayBind', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let innerRegionId = innerRegion.GetId(), previousValue: boolean = null;
                innerRegion.GetState().TrapGetAccess(() => {
                    let value = !! CoreDirectiveHandlers.Evaluate(Region.Get(innerRegionId), innerElement, innerDirective.value);
                    if (value === previousValue){
                        return;
                    }
                    
                    previousValue = value;
                    if (value){
                        show();
                    }
                    else{
                        hide();
                    }
                }, true, innerElement);
                
                return DirectiveHandlerReturn.Handled;
            });
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Form(region: Region, element: HTMLElement, directive: Directive){
            if (!(element instanceof HTMLFormElement)){
                return DirectiveHandlerReturn.Nil;
            }

            let data = ((CoreDirectiveHandlers.Evaluate(region, element, directive.value) || {}) as FormInfo), regionId = region.GetId();
            let info: FormInfo = {
                action: (data.action || element.action),
                method: (data.method || element.method),
                errorBag: data.errorBag,
                callback: data.callback,
                confirmInfo: data.confirmInfo,
            };

            if (!info.action){
                return DirectiveHandlerReturn.Nil;
            }

            let options = {
                confirm: false,
                reload: false,
                files: false,
            };

            Object.keys(options).forEach((key) => {
                if (directive.arg.options.indexOf(key) != -1){
                    options[key] = true;
                }
            });
            
            let submitButtons = new Array<HTMLElement>();
            region.AddElement(element, true).locals['$form'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop === 'addSubmitButton'){
                    return (button: HTMLElement) => {
                        submitButtons.push(button);
                    };
                }

                if (prop === 'removeSubmitButton'){
                    return (button: HTMLElement) => {
                        submitButtons = submitButtons.filter(btn => (btn !== button));
                    };
                }

                if (prop === 'element'){
                    return element;
                }

                if (prop === 'submit'){
                    return submit;
                }
            }, ['addSubmitButton', 'removeSubmitButton', 'element']);
            
            let setDisabledState = (disable: boolean) => {
                submitButtons.forEach((button) => {
                    if (disable){
                        button.setAttribute('disabled', 'disabled');
                    }
                    else{
                        button.removeAttribute('disabled');
                    }
                });
            };

            options.files = (options.files || !! element.querySelector('input[type="file"]'));
            let submit = (checkConfirm = true) => {
                if (checkConfirm && options.confirm){
                    let reporter = (Region.GetGlobalValue(regionId, '$reporter') as ReporterInfo);
                    if (reporter && reporter.confirm){//Confirm before proceeding
                        reporter.confirm((info.confirmInfo || 'Please confirm your action.'), () => submit(false));
                        return;
                    }
                }
                
                let body: any = null;
                if (options.files){
                    body = new FormData();
                    for (let i = 0; i < element.elements.length; ++i){
                        let key = element.elements[i].getAttribute('name');
                        if (!key){
                            continue;
                        }

                        if (element.elements[i] instanceof HTMLInputElement && (element.elements[i] as HTMLInputElement).type === 'file'){
                            if (element.elements[i].getAttribute('multiple')){
                                for (let j = 0; j < (element.elements[i] as HTMLInputElement).files.length; ++j){
                                    body.append(key, (element.elements[i] as HTMLInputElement).files[j]);
                                }
                            }
                            else if (0 < (element.elements[i] as HTMLInputElement).files.length){
                                body.append(key, (element.elements[i] as HTMLInputElement).files[0]);
                            }
                        }
                        else if ('value' in element.elements[i]){
                            body.append(key, (element.elements[i] as any).value);
                        }
                    }
                }
                else{//No files embedded
                    body = new FormData(element);
                }
                
                setDisabledState(true);
                fetch(info.action, {
                    method: (info.method || 'POST'),
                    credentials: 'same-origin',
                    body: body,
                }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then((data) => {
                    setDisabledState(false);
                    if (info.errorBag && 'failed' in data){
                        for (let key in info.errorBag){
                            let value = (data.failed[key] || []);
                            info.errorBag[key] = (Array.isArray(value) ? value : [value]);
                        }
                    }
                    
                    if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!info.callback || info.callback(data))){
                        element.dispatchEvent(new CustomEvent('form.success', {
                            detail: data
                        }));

                        if (options.reload){
                            let router = Region.GetGlobalValue(regionId, '$router');
                            if (router){
                                router.reload();
                                return;
                            }
                        }

                        element.reset();
                    }
                }).catch((err) => {
                    setDisabledState(false);
                    ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                    if (info.callback){
                        info.callback(null, err);
                    }
                });
            };
            
            element.addEventListener('submit', (e) => {
                e.preventDefault();
                submit();
            });

            if (!DirectiveHandlerManager.GetHandler('formSubmit')){
                DirectiveHandlerManager.AddHandler('formSubmit', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                    let proxy = innerRegion.GetLocal(innerElement, '$form', true);
                    if (!proxy || !proxy.addSubmitButton){
                        return DirectiveHandlerReturn.Nil;
                    }
    
                    proxy.addSubmitButton(innerElement);
                    innerRegion.AddElement(innerElement, true).uninitCallbacks.push(() => {
                        proxy.removeSubmitButton(innerElement);
                    });
                    
                    return DirectiveHandlerReturn.Handled;
                });
            }
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Modal(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$modal', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }

            let scope = ExtendedDirectiveHandlers.AddScope('modal', region.AddElement(element, true), []), regionId = region.GetId(), show = false, url: string = null;
            let countainer = document.createElement('div'), mount = document.createElement('div'), overlay = Region.GetGlobalValue(regionId, '$overlay');
            
            countainer.classList.add('inlinejs-modal');
            if (element.style.zIndex){
                countainer.style.zIndex = element.style.zIndex;
            }
            else{//Compute z-index
                countainer.style.zIndex = (overlay ? ((overlay.zIndex || 1000) + 9) : 1009);
            }

            countainer.setAttribute('x-data', '');
            countainer.setAttribute('x-animate.opacity', '$modal.show');
            countainer.setAttribute('x-overlay-bind', '$modal.show');

            mount.setAttribute('x-xhr-load', '$modal.url');
            mount.setAttribute('x-on:click.outside', '$modal.show = false');
            
            countainer.appendChild(mount);
            document.body.appendChild(countainer);

            let setShow = (value: boolean) => {
                show = value;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'show', scope);
            };

            let setUrl = (value: string) => {
                url = value;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'url', scope);
            };

            let reload = () => {
                setShow(false);
                setUrl('::unload::');
            };
            
            mount.addEventListener('xhr.load', () => setShow(true));
            mount.addEventListener('xhr.reload', () => setShow(true));

            window.addEventListener('router.load', reload);
            window.addEventListener('router.reload', reload);
            region.AddOutsideEventCallback(mount, 'click', () => {
                setShow(false);
            });

            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'show'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return show;
                }

                if (prop === 'url'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return url;
                }
            }, ['show', 'url'], (target: object, prop: string | number | symbol, value: any) => {
                if (prop === 'show'){
                    setShow(!! value);
                    return true;
                }

                if (prop === 'url'){
                    setUrl(value || '');
                    return true;
                }

                return false;
            });

            Region.AddGlobal('$modal', () => proxy);
            DirectiveHandlerManager.AddHandler('modalUrl', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let url: string = null;
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    setUrl(url);
                });

                let innerRegionId = innerRegion.GetId();
                innerRegion.GetState().TrapGetAccess(() => {
                    url = CoreDirectiveHandlers.Evaluate(Region.Get(innerRegionId), innerElement, innerDirective.value);
                }, true, innerElement);
                
                return DirectiveHandlerReturn.Handled;
            });
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Counter(region: Region, element: HTMLElement, directive: Directive){
            let value = CoreDirectiveHandlers.Evaluate(region, element, directive.value), regionId = region.GetId();
            if (!Number.isInteger(value)){
                return DirectiveHandlerReturn.Nil;
            }

            let isDown = (directive.arg.key === 'down'), stop = false;
            if (isDown && value <= 0){
                return DirectiveHandlerReturn.Nil;
            }

            let counter = () => {
                if (stop || (isDown && value <= 0)){
                    return;
                }

                if (isDown){
                    --value;
                    CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, `${directive.value} -= 1`);
                }
                else{
                    CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, `${directive.value} += 1`);
                }

                setTimeout(counter, 1000);
            };

            region.AddElement(element, true).locals['$counter'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop === 'stop'){
                    return () => {
                        stop = true;
                    };
                }

                if (prop === 'resume'){
                    return () => {
                        if (stop){
                            stop = false;
                            setTimeout(counter, 1000);
                        }
                    };
                }
            }, ['stop', 'resume']);

            setTimeout(counter, 1000);
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

        public static FetchLoad(element: HTMLElement, url: string, append: boolean, onLoad: () => void, onError: (err: any) => void){
            if (!url || !(url = url.trim())){
                return;
            }

            let removeAll = (force: boolean = false) => {
                if (force || !append){
                    while (element.firstElementChild){
                        Region.RemoveElementStatic(element.firstElementChild as HTMLElement);
                        element.removeChild(element.firstElementChild);
                    }
                }
            };

            let fetch = (url: string, tryJson: boolean, callback: (response: any) => void) => {
                window.fetch(url, {
                    credentials: 'same-origin',
                }).then(ExtendedDirectiveHandlers.HandleTextResponse).then((data) => {
                    if (data === undefined){
                        return;
                    }
                    
                    let parsedData: any;
                    try{
                        if (tryJson){
                            parsedData = JSON.parse(data);    
                            if (ExtendedDirectiveHandlers.Report(null, parsedData)){
                                return;
                            }
                        }
                        else{
                            parsedData = data;
                        }
                    }
                    catch (err){
                        parsedData = data;
                    }

                    callback(parsedData);
                    if (onLoad){
                        onLoad();
                    }
                }).catch((err) => {
                    ExtendedDirectiveHandlers.ReportServerError(null, err);
                    if (onError){
                        onError(err);
                    }
                });
            };

            let fetchList = (url: string, callback: (item: object) => void) => {
                fetch(url, true, (data) => {
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
                fetch(url, false, (data) => {
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

        public static HandleJsonResponse(response: Response){
            if (response.ok){
                return response.json();
            }

            ExtendedDirectiveHandlers.ReportServerError(null, {
                status: response.status,
                statusText: response.statusText,
            });
        }

        public static HandleTextResponse(response: Response){
            if (response.ok){
                return response.text();
            }

            ExtendedDirectiveHandlers.ReportServerError(null, {
                status: response.status,
                statusText: response.statusText,
            });
        }

        public static Alert(region: Region, prop: string, prefix: ExtendedDirectiveHandlerScope | string){
            region.GetChanges().Add({
                regionId: region.GetId(),
                type: 'set',
                path: (prefix ? `${((typeof prefix === 'string') ? prefix : prefix.path)}.${prop}` : prop),
                prop: prop,
                origin: region.GetChanges().GetOrigin()
            });
        }

        public static Report(regionId: string, info: any){
            let reporter = (Region.GetGlobalValue(regionId, '$reporter') as ReporterInfo);
            return (reporter && reporter.report && reporter.report(info));
        }
        
        public static ReportServerError(regionId: string, err: any){
            let reporter = (Region.GetGlobalValue(regionId, '$reporter') as ReporterInfo);
            return (reporter && reporter.reportServerError && reporter.reportServerError(err));
        }

        public static InitAnimation(element: HTMLElement, options: Array<string>, css?: CSSStyleDeclaration, callback?: (key: string) => void){
            let animators: Record<string, Animator> = {};

            css = (css || getComputedStyle(element));
            options.forEach((key) => {
                if (key in Animators){
                    animators[key] = Animators[key](element, css);
                }
                else if (callback){
                    callback(key);
                }
            });

            return animators;
        }

        public static PrepareAnimation(element: HTMLElement, options: Array<string>){
            const displays = ['block', 'flex', 'inline', 'inline-block', 'inline-flex', 'table'];
            
            let css = getComputedStyle(element), display: string = null;
            let duration: number = null, animators = ExtendedDirectiveHandlers.InitAnimation(element, options, css, (key) => {
                if (displays.includes(key)){
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
                    duration = CoreDirectiveHandlers.ExtractDuration(key, null);
                    break;
                }
            });

            duration = (duration || 300);
            display = (display || css.display || 'block');

            let keys = Object.keys(animators);
            if (keys.length == 0){//Default
                animators['opacity'] = Animators.opacity(element, css);
                keys.push('opacity');
            }

            let ease = (time: number, start: number, value: number, duration: number) => {
                return ((time < duration) ? (-value * Math.cos(time / duration * (Math.PI / 2)) + value + start) : value);
            };

            let checkpoint = 0;
            return (show: boolean, callback?: () => boolean | void, animate = true) => {
                if (!animate){
                    if (show){
                        element.style.display = display;
                        if (callback){
                            callback();
                        }
                    }
                    else if (!callback || callback() !== false){
                        element.style.display = 'none';
                    }
                    return;
                }
                
                let lastCheckpoint = ++checkpoint, startTimestamp: DOMHighResTimeStamp = null, done = false;
                let end = () => {
                    done = true;
                    keys.forEach(key => animators[key].step(element, show, duration, duration, ease));
                    element.dispatchEvent(new CustomEvent('animation.leaving'));

                    if ((!callback || callback() !== false) && !show){
                        element.style.display = 'none';
                    }

                    element.dispatchEvent(new CustomEvent('animation.leave'));
                };
                
                let pass = (timestamp: DOMHighResTimeStamp) => {
                    if (startTimestamp === null){
                        startTimestamp = timestamp;
                    }
    
                    if (done || lastCheckpoint != checkpoint){
                        return;
                    }

                    let ellapsed = (timestamp - startTimestamp);
                    if (ellapsed < duration){
                        keys.forEach(key => animators[key].step(element, show, ellapsed, duration, ease));
                        requestAnimationFrame(pass);
                    }
                    else{//End
                        end();
                    }
                };

                setTimeout(() => {//Watcher
                    if (!done && lastCheckpoint == checkpoint){
                        end();
                    }
                }, (duration + 100));

                requestAnimationFrame(pass);
                element.dispatchEvent(new CustomEvent('animation.entering'));

                if (show){
                    element.style.display = display;
                }

                element.dispatchEvent(new CustomEvent('animation.entered'));
            };
        }

        public static AddScope(prefix: string, elementScope: ElementScope, callbacks: Array<string>) : ExtendedDirectiveHandlerScope{
            let id = `${prefix}<${++ExtendedDirectiveHandlers.scopeId_}>`;
            ExtendedDirectiveHandlers.scopes_[id] = {
                id: id,
                path: `${elementScope.key}.$${id}`,
                callbacks: {}
            };

            (callbacks || []).forEach(key => (ExtendedDirectiveHandlers.scopes_[id] as ExtendedDirectiveHandlerScope).callbacks[key] = new Array<(value?: any) => boolean>());
            return ExtendedDirectiveHandlers.scopes_[id];
        }

        public static AddAll(){
            CoreDirectiveHandlers.PrepareAnimation = ExtendedDirectiveHandlers.PrepareAnimation;
            
            DirectiveHandlerManager.AddHandler('watch', ExtendedDirectiveHandlers.Watch);
            DirectiveHandlerManager.AddHandler('when', ExtendedDirectiveHandlers.When);
            DirectiveHandlerManager.AddHandler('once', ExtendedDirectiveHandlers.Once);

            DirectiveHandlerManager.AddHandler('input', ExtendedDirectiveHandlers.Input);
            DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            
            DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            DirectiveHandlerManager.AddHandler('lazyLoad', ExtendedDirectiveHandlers.LazyLoad);

            DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);
            DirectiveHandlerManager.AddHandler('animate', ExtendedDirectiveHandlers.Animate);
            DirectiveHandlerManager.AddHandler('typewriter', ExtendedDirectiveHandlers.Typewriter);

            DirectiveHandlerManager.AddHandler('router', ExtendedDirectiveHandlers.Router);
            DirectiveHandlerManager.AddHandler('screen', ExtendedDirectiveHandlers.Screen);

            DirectiveHandlerManager.AddHandler('cart', ExtendedDirectiveHandlers.Cart);
            DirectiveHandlerManager.AddHandler('db', ExtendedDirectiveHandlers.DB);
            DirectiveHandlerManager.AddHandler('auth', ExtendedDirectiveHandlers.Auth);

            DirectiveHandlerManager.AddHandler('geolocation', ExtendedDirectiveHandlers.Geolocation);
            DirectiveHandlerManager.AddHandler('reporter', ExtendedDirectiveHandlers.Reporter);
            DirectiveHandlerManager.AddHandler('overlay', ExtendedDirectiveHandlers.Overlay);
            DirectiveHandlerManager.AddHandler('form', ExtendedDirectiveHandlers.Form);
            DirectiveHandlerManager.AddHandler('modal', ExtendedDirectiveHandlers.Modal);
            DirectiveHandlerManager.AddHandler('counter', ExtendedDirectiveHandlers.Counter);

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
            buildGlobal('db');
            buildGlobal('form');
            buildGlobal('counter');
        }
    }

    (function(){
        ExtendedDirectiveHandlers.AddAll();
    })();
}
