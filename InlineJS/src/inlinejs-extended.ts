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
        active: boolean;
        progress: number;
    }

    export interface RouterPageInfo{
        pattern: string | RegExp;
        name: string;
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

    export interface CartItem{
        quantity: number;
        price: number;
        product: Record<string, any>;
    }

    export interface CartHandlers{
        init?: () => void;
        load?: () => void;
        update?: (sku: string, quantity: number, incremental: boolean, callback: (item: CartItem) => void) => void;
        loadLink?: string;
        updateLink?: string;
        productLink?: string;
        db?: any;
    }

    export interface CartInfo{
        items: Array<CartItem>;
        products: Array<any>;
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
        confirm: (info: string | Record<string, any>, confirmed: string | (() => void), canceled?: string | (() => void)) => void;
        prompt: (info: string | Record<string, any>, callback: (response: string | Array<string>) => void) => void;
    }

    export interface FormInfo{
        action?: string;
        method?: string;
        errorBag?: Record<string, Array<string>>;
        callback?: (data: any, err?: any) => boolean;
        confirmInfo?: string | Record<string, any>;
        dbExcept?: Array<string>;
    }

    export interface Point{
        x: number,
        y: number,
    }

    export class ExtendedDirectiveHandlers{
        private static scopeId_ = 0;
        private static scopes_: Record<string, ExtendedDirectiveHandlerScope> = {};
        private static formData_: Record<string, any> = null;

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

        public static Mouse(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal(region.GetId(), '$mouse')){
                return DirectiveHandlerReturn.Nil;
            }

            Region.AddGlobal('$mouse', (regionId: string, contextElement: HTMLElement) => {
                if (!contextElement){
                    return null;
                }

                let elementScope = Region.Get(regionId).AddElement(contextElement, true);
                if (elementScope && '$mouse' in elementScope.locals){
                    return elementScope.locals['$mouse'];
                }
                
                let scope = (elementScope ? ExtendedDirectiveHandlers.AddScope('mouse', elementScope, []) : null)
                if (!scope){
                    return null;
                }

                let inside = false, listening = {
                    inside: false,
                };

                let callbacks = {
                    click: new Array<(event?: Event) => void>(),
                    mousemove: new Array<(event?: Event) => void>(),
                    mouseenter: new Array<(event?: Event) => void>(),
                    mouseleave: new Array<(event?: Event) => void>(),
                    mouseover: new Array<(event?: Event) => void>(),
                    mouseout: new Array<(event?: Event) => void>(),
                    mousedown: new Array<(event?: Event) => void>(),
                    mouseup: new Array<(event?: Event) => void>(),
                };

                Object.keys(callbacks).forEach(key => listening[key] = false);
                let proxy = CoreDirectiveHandlers.CreateProxy((prop) =>{
                    if (prop === 'inside'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                        if (!listening.inside){
                            listening.inside = true;
                            contextElement.addEventListener('mouseenter', () => {
                                if (!inside){
                                    inside = true;
                                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'inside', scope);
                                }
                            });
                            contextElement.addEventListener('mouseleave', () => {
                                if (inside){
                                    inside = false;
                                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'inside', scope);
                                }
                            });
                        }
                        return inside;
                    }

                    if (prop in callbacks){
                        return (callback: (event?: Event) => void, remove = false) => {
                            if (remove){
                                (callbacks[prop] as Array<(event?: Event) => void>).splice((callbacks[prop] as Array<(event?: Event) => void>).indexOf(callback), 1);
                                return;
                            }
                            
                            if (!(callbacks[prop] as Array<(event?: Event) => void>).includes(callback)){
                                (callbacks[prop] as Array<(event?: Event) => void>).push(callback);
                            }
                            
                            if (!listening[prop]){
                                listening[prop] = true;
                                contextElement.addEventListener(prop, (e) => {
                                    (callbacks[prop] as Array<(event?: Event) => void>).forEach(callback => callback(e));
                                });
                            }
                        };
                    }

                    if (prop === 'parent'){
                        return (Region.GetGlobalValue(regionId, '$$mouse') as (target: HTMLElement) => any)(Region.Get(regionId).GetElementAncestor(contextElement, 0));
                    }

                    if (prop === 'ancestor'){
                        return (index: number) => {
                            return (Region.GetGlobalValue(regionId, '$$mouse') as (target: HTMLElement) => any)(Region.Get(regionId).GetElementAncestor(contextElement, index));
                        };
                    }
                }, ['inside', 'parent', 'ancestor', ...Object.keys(callbacks)]);

                elementScope.locals['$mouse'] = proxy;
                return proxy;
            });

            Region.AddGlobal('$$mouse', (regionId: string) => (target: HTMLElement) => {
                if (!target){
                    return null;
                }

                let mouseGlobal = Region.GetGlobal(regionId, '$mouse');
                return (mouseGlobal ? mouseGlobal(regionId, target) : null);
            });

            return DirectiveHandlerReturn.Handled;
        }

        public static Input(region: Region, element: HTMLElement, directive: Directive){
            let wrapper = document.createElement('div'), innerWrapper = document.createElement('div'), label = document.createElement('span'), hiddenLabel = document.createElement('span'), style = getComputedStyle(element);
            let cachedValues = {
                fontSize: style.fontSize,
                paddingBottom: style.paddingBottom,
                borderBottom: style.borderBottomWidth,
                height: element.clientHeight,
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
            if (directive.arg.options.includes('validate')){
                wrapper.classList.add('validate');
            }
            
            innerWrapper.classList.add('inlinejs-input-wrapper');
            label.classList.add('inlinejs-input-label');
            hiddenLabel.classList.add('inlinejs-input-hidden-label');
            element.classList.add('inlinejs-input-textbox');

            label.style.left = style.paddingLeft;
            label.style.bottom = cachedValues.paddingBottom;
            label.style.fontSize = style.fontSize;
            hiddenLabel.style.fontSize = `calc(${style.fontSize} * 0.81)`;

            element.parentElement.insertBefore(wrapper, element);
            innerWrapper.appendChild(hiddenLabel);
            innerWrapper.appendChild(element);
            innerWrapper.appendChild(label);
            wrapper.appendChild(innerWrapper);

            if (directive.arg.options.includes('password')){
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

                icon.classList.add('inlinejs-input-password-icon');
                icon.classList.add('material-icons-outlined');

                icon.style.right = style.paddingRight;
                icon.style.bottom = cachedValues.paddingBottom;
                icon.style.fontSize = `calc(${style.fontSize} * 1.25)`;
                
                innerWrapper.appendChild(icon);
                updateIcon();
                
                icon.addEventListener('click', () => {
                    (element as HTMLInputElement).type = (((element as HTMLInputElement).type === 'password') ? 'text' : 'password');
                    (element as HTMLInputElement).focus();
                    
                    updateIcon();
                    element.dispatchEvent(new CustomEvent('input.password', {
                        detail: (element as HTMLInputElement).type
                    }));
                });
            }

            label.textContent = (element as HTMLInputElement).placeholder;
            (element as HTMLInputElement).placeholder = '';

            let options = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (Region.IsObject(options)){
                Object.keys(options).forEach((key) => {
                    if (key === 'wrapperClass'){
                        (Array.isArray(options[key]) ? (options[key] as Array<string>) : (options[key] as string).split(' ')).forEach(item =>  wrapper.classList.add(item));
                    }
                    else if (key === 'labelClass'){
                        (Array.isArray(options[key]) ? (options[key] as Array<string>) : (options[key] as string).split(' ')).forEach(item =>  label.classList.add(item));
                    }
                });
            }

            let labelShown = true;
            let toggleLabel = (show: boolean) => {
                if (show == labelShown){
                    return;
                }

                labelShown = show;
                if (show){
                    label.style.bottom = cachedValues.paddingBottom;
                    label.style.fontSize = cachedValues.fontSize;
                }
                else{
                    label.style.bottom = `${cachedValues.height}px`;
                    label.style.fontSize = hiddenLabel.style.fontSize;
                }
            };
            
            let onBlur = () => {
                wrapper.classList.add('blurred');
                if (!(element as HTMLInputElement).value){
                    toggleLabel(true);
                }
            };

            element.addEventListener('blur', onBlur);
            element.addEventListener('focus', () => {
                toggleLabel(false);
            });

            element.addEventListener('input', () => {
                if ((element as HTMLInputElement).value){
                    toggleLabel(false);
                }
            });

            label.addEventListener('focus', () => element.focus());
            label.addEventListener('click', () => {
                element.focus();
            });

            if ((element as HTMLInputElement).value){
                toggleLabel(false);
            }

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

        public static JSONLoad(region: Region, element: HTMLElement, directive: Directive){
            let shouldUseNull = directive.arg.options.includes('null');
            let regionId = region.GetId(), info = {
                url: '',
                active: false,
                data: (shouldUseNull ? null : {}),
                reload: () => load('::reload::'),
                unload: () => load('::unload::'),
            };

            let queuedUrl: string = null;
            let load = (url: string) => {
                if (!url || !(url = url.trim())){
                    return;
                }
                
                if (info.active){
                    queuedUrl = url;
                    return;
                }
                
                if (url === '::unload::'){
                    if (shouldUseNull && info.data !== null){
                        info.data = null;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'data', scope);
                    }
                    else if (!shouldUseNull && Object.keys(info.data).length != 0){
                        info.data = {};
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'data', scope);
                    }

                    return;
                }
                
                info.active = true;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);

                fetch(url, {
                    method: 'GET',
                    credentials: 'same-origin',
                }).then((response) => {
                    try{
                        return response.json();
                    }
                    catch (err){}
                    return null;
                }).then((data) => {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                    
                    if (!Region.IsEqual(data, info.data)){
                        info.data = data;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'data', scope);
                    }

                    Object.keys(scope.callbacks).forEach(key => (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => CoreDirectiveHandlers.Call(regionId, callback, true)));
                    element.dispatchEvent(new CustomEvent(`json.load`, {
                        detail: { data: data },
                    }));

                    if (queuedUrl){
                        load(queuedUrl);
                        queuedUrl = null;
                    }
                }).catch((err) => {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                    
                    if (info.data !== null){
                        info.data = null;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'data', scope);
                    }

                    if (queuedUrl){
                        load(queuedUrl);
                        queuedUrl = null;
                    }
                });
            };
            
            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('json', elementScope, ['onLoad']);

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
                    load(url);
                    info.url = url;
                }
                else if (url !== '::unload::'){
                    element.dispatchEvent(new CustomEvent(`json.reload`));
                }
            }, true, element);

            elementScope.locals['$json'] = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in info){
                    if (prop === 'active' || prop === 'data'){
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

        public static XHRLoad(region: Region, element: HTMLElement, directive: Directive){
            let append = (state: boolean, isOnce = false) => {
                info.isAppend = state;
                info.isOnce = isOnce;
            };
            
            let regionId = region.GetId(), info = {
                url: '',
                isAppend: directive.arg.options.includes('append'),
                isOnce: directive.arg.options.includes('once'),
                isLoaded: false,
                active: false,
                progress: 0,
                append: append,
                reload: () => load('::reload::'),
                unload: () => load('::unload::'),
            };

            let queuedUrl: string = null;
            let load = (url: string) => {
                if (!url || !(url = url.trim())){
                    return;
                }

                if (info.active){
                    queuedUrl = url;
                    return;
                }
                
                let isAppend = info.isAppend;
                if (info.isOnce){
                    info.isAppend = !info.isAppend;
                    info.isOnce = false;
                }
                
                info.active = true;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                
                ExtendedDirectiveHandlers.FetchLoad(element, ((url === '::reload::') ? info.url : url), isAppend, () => {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                    
                    if (url === '::unload::'){
                        return;
                    }
                    
                    info.isLoaded = true;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'isLoaded', scope);
                    
                    Object.keys(scope.callbacks).forEach(key => (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => CoreDirectiveHandlers.Call(regionId, callback, true)));
                    element.dispatchEvent(new CustomEvent(`xhr.load`));

                    if (queuedUrl){
                        load(queuedUrl);
                        queuedUrl = null;
                    }
                }, (err) => {
                    info.active = false;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                    
                    element.dispatchEvent(new CustomEvent(`xhr.error`, {
                        detail: { error: err },
                    }));

                    if (queuedUrl){
                        load(queuedUrl);
                        queuedUrl = null;
                    }
                }, (e) => {
                    if (e.lengthComputable){
                        let progress = ((e.loaded / e.total) * 100);
                        if (progress != info.progress){
                            info.progress = progress;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'progress', scope);
                        }
                    }
                });
            };
            
            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('xhr', elementScope, ['onLoad']);

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

            elementScope.locals['$xhr'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in info){
                    if (prop === 'isLoaded' || prop === 'active' || prop === 'progress'){
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
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'isLoaded', scope);
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

        public static Busy(region: Region, element: HTMLElement, directive: Directive){
            let elementScope = region.AddElement(element, true), scope = ExtendedDirectiveHandlers.AddScope('busy', elementScope, []), shouldDisable = (directive.arg.options.includes('disable'));
            let options = (CoreDirectiveHandlers.Evaluate(region, element, directive.value) || {}), regionId = region.GetId(), info = {
                active: false,
                enable: () => {
                    return info.setActiveState(true);
                },
                disable: () => {
                    return info.setActiveState(false);
                },
                setActiveState(state: boolean){
                    if (info.active == state){
                        return false;
                    }

                    info.active = state;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);

                    if (shouldDisable && info.active){
                        element.setAttribute('disabled', 'disabled');
                    }
                    else if (shouldDisable){
                        element.removeAttribute('disabled');
                    }

                    window.dispatchEvent(new CustomEvent(`busy.${options.key}`, {
                        detail: { active: info.active, source: element }
                    }));

                    return true;
                },
                handleEvent: (e: Event) => {
                    if (!info.disable()){//Already disabled
                        e.preventDefault();
                    }
                },
            };
            
            options.key = (options.key || elementScope.key);
            ((options.events as Array<string>) || ((element instanceof HTMLFormElement) ? ['submit'] : ['click', 'keydown.enter'])).forEach((e) => {
                CoreDirectiveHandlers.On(region, element, Processor.GetDirectiveWith(`${Region.directivePrfix}-on:${e}`, '$busy.handleEvent($event)'));
            });

            window.addEventListener(`busy.${options.key}`, (e) => {
                if (((e as CustomEvent).detail as any).source !== element){
                    info.setActiveState(((e as CustomEvent).detail as any).active)
                }
            });

            elementScope.locals['$busy'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in info){
                    if (prop === 'active'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    }
                    return info[prop];
                }
            }, Object.keys(info));

            return DirectiveHandlerReturn.Handled;
        }

        public static ActiveGroup(region: Region, element: HTMLElement, directive: Directive){
            let options = (CoreDirectiveHandlers.Evaluate(region, element, directive.value) || {}), name = (options.key ? `activeGroup.${options.key}` : 'activeGroup');
            if (Region.GetGlobal(null, `$${name}`)){
                return DirectiveHandlerReturn.Nil;
            }

            let elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('activeGroup', elementScope, []), regionId = region.GetId(), count = 0, setCount = (value: number) => {
                count = value;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'count', scope);
            };
            
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'count'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return count;
                }

                if (prop === 'active'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.count`);
                    return (0 < count);
                }

                if (prop === 'setCount'){
                    return (value: number) => {
                        setCount((value < 0) ? 0 : value);
                    };
                }
                
                if (prop === 'offsetCount'){
                    return (value: number) => {
                        let newCount = (count += value);
                        setCount((newCount < 0) ? 0 : newCount);
                    };
                }
            }, ['count', 'active', 'setCount', 'offsetCount']);

            elementScope.locals['$activeGroup'] = proxy;
            Region.AddGlobal(`$${name}`, () => proxy);

            if (!Region.GetGlobal(null, '$activeGroup')){
                Region.AddGlobal('$activeGroup', () => {
                    return (key: string) => Region.GetGlobalValue(null, `activeGroup.${key}`);
                });
            }

            let update = (key: string, state: boolean, isInitial: boolean) => {
                let proxy = Region.GetGlobalValue(null, (key ? `$activeGroup.${key}` : '$activeGroup'));
                if (proxy){
                    (proxy.offsetCount as (value: number) => void)(state ? 1 : (isInitial ? 0 : -1));
                }
            };

            let trapExpression = (innerRegion: Region, innerElement: HTMLElement, expression: string, key: string) => {
                let innerRegionId = innerRegion.GetId(), previousValue: boolean = null;
                innerRegion.GetState().TrapGetAccess(() => {
                    let value = !! CoreDirectiveHandlers.Evaluate(Region.Get(innerRegionId), innerElement, expression);
                    if (value !== previousValue){
                        update(key, value, (previousValue === null));
                        previousValue = value;
                    }
                }, true, innerElement);
            };

            if (!DirectiveHandlerManager.GetHandler('activeGroupBind')){
                DirectiveHandlerManager.AddHandler('activeGroupBind', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                    trapExpression(innerRegion, innerElement, innerDirective.value, null);
                    return DirectiveHandlerReturn.Handled;
                });
            }
            
            if (!DirectiveHandlerManager.GetHandler('activeGroupBindFor')){
                DirectiveHandlerManager.AddHandler('activeGroupBindFor', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                    let innerOptions = (CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value) || {})
                    if (!innerOptions.expression){
                        return DirectiveHandlerReturn.Nil;    
                    }
                    
                    trapExpression(innerRegion, innerElement, innerOptions.expression, innerOptions.key);
                    
                    return DirectiveHandlerReturn.Handled;
                });
            }
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Router(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal(region.GetId(), '$router')){
                return DirectiveHandlerReturn.Nil;
            }

            let options = (CoreDirectiveHandlers.Evaluate(region, element, directive.value) as RouterOptions), uid = 0, notifCount = 0, title = '';
            if (!Region.IsObject(options)){
                options = {};
            }

            let hooks = {
                beforeLoad: [],
                afterLoad: [],
            };
            
            let regionId = region.GetId(), origin = location.origin, pathname = location.pathname, query = location.search.substr(1), parsedQuery: Record<string, any> = null;
            let alertable = [ 'url', 'currentPage', 'currentQuery', 'targetUrl', 'active', 'progress' ], info: RouterInfo = {
                currentPage: null,
                currentQuery: '',
                pages: [],
                url: null,
                targetUrl: null,
                mount: null,
                mountElement: null,
                middlewares: {},
                active: false,
                progress: 0,
            }, methods = {
                register: (data: Record<string, any>) => {
                    let innerRegion = Region.Get(RegionMap.scopeRegionIds.Peek());
                    if (innerRegion){
                        register(data.page, (data.name || ''), (data.path || ((typeof data.page === 'string') ? data.page : null)), data.title, innerRegion.GetComponentKey(),
                            (data.entry || 'open'), (data.exit || 'close'), !! data.disabled, data.middlewares, data.uid);
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
                goto: (page: string, args?: Array<any> | any, pageData?: any) => { goto(page, args, false, null, pageData) },
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
                getQueryValue: (key: string) => {
                    parsedQuery = (parsedQuery || methods.parseQuery(info.currentQuery));
                    return (Region.IsObject(parsedQuery) ? parsedQuery[key] : null);
                },
                updateUnreadCount: (value: number) => {
                    notifCount = value;
                    updateTitle();
                },
                setTitle: (value: string) => {
                    title = (value || 'Untitled');
                    updateTitle();
                },
                addHook: (key: string, handler: (...args: any) => any) => {
                    if (key in hooks){
                        hooks[key].push(handler);
                    }
                },
            };

            if (options.urlPrefix){
                options.urlPrefix += '/';
            }
            else{//Empty
                options.urlPrefix = '';
            }

            let scope = ExtendedDirectiveHandlers.AddScope('router', region.AddElement(element, true), Object.keys(methods));
            let register = (page: string | RegExp, name: string, path: string, title: string, component: string, entry: string, exit: string, disabled: boolean, middlewares: Array<string>, uid: number) => {
                if (typeof page === 'string' && page.length > 1 && page.startsWith('/')){
                    page = page.substr(1);
                }

                if (path && path.length > 1 && path.startsWith('/')){
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
                    middlewares: ((middlewares && Array.isArray(middlewares)) ? middlewares : new Array<string>()),
                    uid: uid,
                });
            };

            let goto = (page: string, query?: string, replace = false, onReload?: () => boolean, pageData?: any) => {
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
                }, onReload, () => {
                    let pageGlobal = Region.GetGlobalValue(null, '$page');
                    if (pageGlobal && Region.IsObject(pageData)){
                        Object.keys(pageData || {}).forEach(key => (pageGlobal[key] = pageData[key]));
                    }
                    else if (pageGlobal){
                        pageGlobal['$loadData'] = pageData;
                    }
                });
            };
            
            let back = () => {
                if (info.currentPage && info.currentPage !== '/'){
                    history.back();
                    return true;
                }

                return false;
            };

            let load = (page: string, query: string, callback?: (title: string, path: string) => void, onReload?: () => boolean, afterCallback?: () => void) => {
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
                    parsedQuery = null;
                    info.currentQuery = query;
                    ExtendedDirectiveHandlers.Alert(myRegion, 'currentQuery', scope);
                }

                let pageInfo = findPage(page), prevented = false;
                hooks.beforeLoad.forEach((handler) => {
                    if (handler(pageInfo, page, query) === false){
                        prevented = true;
                    }
                });

                if (prevented){
                    return;
                }
                
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

                    window.dispatchEvent(new CustomEvent('router.load'));
                    hooks.afterLoad.forEach((handler) => {
                        handler(pageInfo, page, query);
                    });
                    
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
                hooks.afterLoad.forEach((handler) => {
                    handler(pageInfo, page, query);
                });

                if (afterCallback){
                    afterCallback();
                }
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

            let updateTitle = () => {
                let computedTitle = `${options.titlePrefix || ''}${title}${options.titleSuffix || ''}`;
                if (notifCount){
                    computedTitle = `(${notifCount}) ${computedTitle}`;
                }
                
                document.title = computedTitle;
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

                let regions = new Array<Region>(), regionsCopy: Array<Region> = null;
                Config.AddRegionHook((region, added) => {
                    if (!added){
                        regions.splice(regions.indexOf(region), 1);
                        if (regionsCopy){
                            regionsCopy.splice(regionsCopy.indexOf(region), 1);
                        }
                    }
                    else if (info.mountElement.contains(region.GetRootElement())){
                        regions.push(region);
                    }
                });
                
                let mount = (url: string) => {
                    info.active = true;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                    
                    if (info.progress != 0){
                        info.progress = 0;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'progress', scope);
                    }

                    regionsCopy = regions;
                    regions = new Array<Region>();
                    
                    ExtendedDirectiveHandlers.FetchLoad(info.mountElement, url, false, () => {
                        if (regionsCopy){
                            regionsCopy.forEach(region => region.RemoveElement(region.GetRootElement()));
                            regionsCopy = null;
                        }
                        
                        info.active = false;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                        
                        window.scrollTo({ top: -window.scrollY, left: 0 });
                        window.dispatchEvent(new CustomEvent('router.mount.load'));

                        Bootstrap.Reattach(info.mountElement);
                    }, (err) => {
                        info.active = false;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                        
                        window.dispatchEvent(new CustomEvent(`router.mount.error`, {
                            detail: {
                                error: err,
                                mount: info.mountElement,
                            },
                        }));
                    }, (e) => {
                        if (e.lengthComputable){
                            let progress = ((e.loaded / e.total) * 100);
                            if (progress != info.progress){
                                info.progress = progress;
                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'progress', scope);
                            }
                        }
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
                register(data.page, (data.name || ''), (data.path || ((typeof data.page === 'string') ? data.page : null)), data.title, innerRegion.GetComponentKey(),
                    (data.entry || 'open'), (data.exit || 'close'), !! data.disabled, data.middlewares, data.uid);

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

        public static Page(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal(region.GetId(), '$page')){
                return DirectiveHandlerReturn.Nil;
            }

            let reset = () => {
                Object.keys(entries).forEach(key => ExtendedDirectiveHandlers.Alert(Region.Get(regionId), key, `${scope.path}.entries`));
                entries = {};
            };

            let scope = ExtendedDirectiveHandlers.AddScope('page', region.AddElement(element, true), []), regionId = region.GetId(), entries = {};
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === '$title'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return title;
                }

                if (prop === '$location'){
                    return window.location;
                }

                if (prop === 'reset'){
                    return reset;
                }

                Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.entries.${prop}`);
                return entries[prop];
            }, ['$title', '$location', 'reset'], (target: object, prop: string | number | symbol, value: any) => {
                if (prop.toString() === '$title'){
                    let router = Region.GetGlobalValue(regionId, '$router');
                    if (router){
                        router.setTitle(value);
                    }
                    else if (value !== title){
                        document.title = title = value;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), '$title', scope);
                    }
                }
                else{
                    entries[prop] = value;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), prop.toString(), `${scope.path}.entries`);
                }

                return true;
            });
            
            Region.AddGlobal('$page', () => proxy);
            window.addEventListener('router.load', reset);

            let title = document.title, observer = new MutationObserver(function(mutations) {
                if (title === mutations[0].target.nodeValue && Region.GetGlobalValue(regionId, '$router')){
                    title = mutations[0].target.nodeValue;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), '$title', scope);
                }
            });

            let titleDOM = document.querySelector('title');
            if (!titleDOM){
                titleDOM = document.createElement('title');
                document.head.append(titleDOM);
            }

            observer.observe(titleDOM, {
                subtree: true,
                characterData: true,
                childList: true,
            });
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Screen(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal(region.GetId(), '$screen')){
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
                width: window.innerWidth,
                height: window.innerHeight,
            }, breakpoint = computeBreakpoint(window.innerWidth), regionId = region.GetId();

            let resizeCheckpoint = 0;
            window.addEventListener('resize', () => {
                let myCheckpoint = ++resizeCheckpoint;
                setTimeout(() => {//Debounce
                    if (myCheckpoint != resizeCheckpoint){//Debounced
                        return;
                    }
                    
                    size.width = window.innerWidth;
                    size.height = window.innerHeight;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'size', scope);

                    let thisBreakpoint = computeBreakpoint(window.innerWidth);
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
                }, 250);
            }, { passive: true });

            let getScrollPosition = (): Point => {
                return {
                    x: (window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0),
                    y: (window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0),
                };
            };

            let scrollCheckpoint = 0, position = getScrollPosition(), percentage: Point = {
                x: ((document.body.scrollWidth <= 0) ? 0 : ((position.x / document.body.scrollWidth) * 100)),
                y: ((document.body.scrollHeight <= 0) ? 0 : ((position.y / document.body.scrollHeight) * 100)),
            };

            if (directive.arg.key === 'realtime'){
                let handleScroll = () => {
                    let myPosition = getScrollPosition();
                    if (myPosition.x != position.x || myPosition.y != position.y){
                        let offset = {
                            x: ((document.documentElement.scrollWidth || document.body.scrollWidth) - (document.documentElement.clientWidth || document.body.clientWidth)),
                            y: ((document.documentElement.scrollHeight || document.body.scrollHeight) - (document.documentElement.clientHeight || document.body.clientHeight)),
                        };

                        position = myPosition;
                        let myPercentage = {
                            x: ((offset.x <= 0) ? 0 : ((position.x / offset.x) * 100)),
                            y: ((offset.y <= 0) ? 0 : ((position.y / offset.y) * 100)),
                        };

                        if (myPercentage.x < percentage.x){
                            window.dispatchEvent(new CustomEvent('screen.left', {
                                detail: myPosition
                            }));
                        }
                        else if (myPercentage.x > percentage.x){
                            window.dispatchEvent(new CustomEvent('screen.right', {
                                detail: myPosition
                            }));
                        }
                        
                        if (myPercentage.y < percentage.y){
                            window.dispatchEvent(new CustomEvent('screen.up', {
                                detail: myPosition
                            }));
                        }
                        else if (myPercentage.y > percentage.y){
                            window.dispatchEvent(new CustomEvent('screen.down', {
                                detail: myPosition
                            }));
                        }
                        
                        percentage = myPercentage;
                        window.dispatchEvent(new CustomEvent('screen.position', {
                            detail: position
                        }));

                        window.dispatchEvent(new CustomEvent('screen.percentage', {
                            detail: percentage
                        }));
                        
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'position', scope);
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'percentage', scope);
                    }
                };

                let debounceIndex = directive.arg.options.indexOf('debounce');
                if (debounceIndex != -1){
                    window.addEventListener('scroll', () => {
                        let myCheckpoint = ++scrollCheckpoint;
                        setTimeout(() => {//Debounce
                            if (myCheckpoint == scrollCheckpoint){//Debounced
                                handleScroll();
                            }
                        }, (parseInt(directive.arg.options[debounceIndex + 1]) || 250));
                    }, { passive: true });
                }
                else{
                    window.addEventListener('scroll', handleScroll, { passive: true });
                }
            }

            let scroll = (from: Point, to: Point, animate = false, animateOptions?: Array<string>) => {
                let myPosition = getScrollPosition();
                if (from.x < 0){
                    from.x = myPosition.x;
                }

                if (to.x < 0){
                    to.x = myPosition.x;
                }

                if (from.y < 0){
                    from.y = myPosition.y;
                }

                if (to.y < 0){
                    to.y = myPosition.y;
                }

                let animator = CoreDirectiveHandlers.GetAnimator(region, animate, (step) => {
                    window.scrollTo((((to.x - from.x) * step) + from.x), (((to.y - from.y) * step) + from.y));
                }, animateOptions, false);

                if (animator){
                    animator(true);
                }
                else{
                    window.scrollTo(from.x, from.y);
                }
            };

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

                if (prop === 'scrollOffset' || prop === 'position'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.position`);
                    return position;
                }

                if (prop === 'scrollPercentage'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.percentage`);
                    return percentage;
                }

                if (prop === 'getScrollOffset' || prop === 'getPosition'){
                    return getScrollPosition;
                }

                if (prop === 'getScrollPercentage'){
                    return () => {
                        let myPosition = getScrollPosition();
                        return {
                            x: ((document.body.scrollWidth <= 0) ? 0 : ((myPosition.x / document.body.scrollWidth) * 100)),
                            y: ((document.body.scrollHeight <= 0) ? 0 : ((myPosition.y / document.body.scrollHeight) * 100)),
                        };
                    };
                }

                if (prop === 'scroll'){
                    return scroll;
                }

                if (prop === 'scrollTo'){
                    return (to: Point, animate = false, animateOptions?: Array<string>) => {
                        scroll({ x: -1, y: -1 }, to, animate, animateOptions);
                    };
                }

                if (prop === 'scrollTop'){
                    return (animate = false, animateOptions?: Array<string>) => {
                        scroll({ x: -1, y: -1 }, { x: -1, y: 0 }, animate, animateOptions);
                    };
                }

                if (prop === 'scrollBottom'){
                    return (animate = false, animateOptions?: Array<string>) => {
                        scroll({ x: -1, y: -1 }, { x: -1, y: document.body.scrollHeight }, animate, animateOptions);
                    };
                }

                if (prop === 'scrollLeft'){
                    return (animate = false, animateOptions?: Array<string>) => {
                        scroll({ x: -1, y: -1 }, { x: 0, y: -1 }, animate, animateOptions);
                    };
                }

                if (prop === 'scrollRight'){
                    return (animate = false, animateOptions?: Array<string>) => {
                        scroll({ x: -1, y: -1 }, { x: document.body.scrollWidth, y: -1 }, animate, animateOptions);
                    };
                }
            }, ['size', 'breakpoint', 'checkpoint', 'scrollOffset', 'position', 'scrollPercentage', 'getScrollOffset', 'getPosition', 'getScrollPercentage', 'scroll']);
            
            Region.AddGlobal('$screen', () => proxy);
            return DirectiveHandlerReturn.Handled;
        }

        public static DarkMode(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal(region.GetId(), '$darkMode')){
                return DirectiveHandlerReturn.Nil;
            }

            let updateLink = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (typeof updateLink !== 'string'){
                updateLink = '';
            }
            
            let scope = ExtendedDirectiveHandlers.AddScope('darkMode', region.AddElement(element, true), []), regionId = region.GetId(), enabled: boolean = null;
            let setEnabled = (value: boolean, isInitial = false) => {
                if (value === enabled){
                    return;
                }
                
                enabled = value;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'enabled', scope);

                if (value === true){
                    document.documentElement.classList.add('dark');
                }
                else if (value === false){
                    if (document.documentElement.classList.contains('dark')){
                        document.documentElement.classList.remove('dark');
                    }
                }
                else if (window.matchMedia('(prefers-color-scheme: dark)').matches){
                    document.documentElement.classList.add('dark');
                }
                else if (!isInitial && document.documentElement.classList.contains('dark')){
                    document.documentElement.classList.remove('dark');
                }

                if (!isInitial){
                    let db = Region.GetGlobalValue(regionId, '$db');
                    if (db){
                        db.write(value, '__InlineJS_DarkMode_Enabled');
                    }
                    
                    if (updateLink){
                        fetch(`${updateLink}?enabled=${(value === true) ? true : false}`, {
                            method: 'GET',
                            credentials: 'same-origin',
                        }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then((data) => {}).catch((err) => {
                            ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        });
                    }
                }
            };
            
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'enabled'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return enabled;
                }
            }, ['enabled'], (target: object, prop: string | number | symbol, value: any) => {
                if (prop.toString() === 'enabled'){
                    setEnabled(value);
                    return true;
                }

                return false;
            });
            
            Region.AddGlobal('$darkMode', () => proxy);

            let db = Region.GetGlobalValue(regionId, '$db');
            if (db){
                db.read('__InlineJS_DarkMode_Enabled', (value: boolean) => {
                    setEnabled(value, true);
                });
            }

            return DirectiveHandlerReturn.Handled;
        }

        public static Cart(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal(region.GetId(), '$cart')){
                return DirectiveHandlerReturn.Nil;
            }
            
            let handlers = (CoreDirectiveHandlers.Evaluate(region, element, directive.value) as CartHandlers);
            if (!handlers){
                return DirectiveHandlerReturn.Nil;
            }

            if (!handlers.load){
                handlers.load = () => {
                    let checked = Region.GetGlobalValue(regionId, '$auth').check(), setItems = (items: Array<CartItem>) => {
                        items = (items || []);
                        
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `0.${info.items.length}.${items.length}`, `${scope.path}.items.splice`, `${scope.path}.items`);
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `0.${info.products.length}.${items.length}`, `${scope.path}.products.splice`, `${scope.path}.products`);
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'products', scope);

                        info.items.splice(0, info.items.length, ...items);
                        info.products.splice(0, info.products.length, ...items.map(item => item.product));

                        computeValues();
                        (updatesQueue || []).forEach((callback) => {
                            try{
                                callback();
                            }
                            catch (err){}
                        });

                        updatesQueue = null;
                    };

                    if (checked && handlers.loadLink){
                        fetch(handlers.loadLink, {
                            method: 'GET',
                            credentials: 'same-origin',
                        }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(data => setItems(data.items)).catch((err) => {
                            ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        });
                    }
                    else if (!checked && handlers.db){
                        handlers.db.read('cart', setItems);
                    }
                };
            }

            let hasNew = false, alertHasNew = () => {
                hasNew = true;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'hasNew', scope);

                InlineJS.Region.GetGlobalValue(regionId, '$nextTick')(() => {
                    hasNew = false;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'hasNew', scope);
                });
            };
            
            if (!handlers.update){
                handlers.update = (sku: string, quantity: number, incremental: boolean, callback: (item: CartItem) => void) => {
                    if (!Region.GetGlobalValue(regionId, '$auth').check()){
                        if (sku === null && !incremental){//Clear
                            if (info.items.length == 0){
                                return;
                            }

                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `0.${info.items.length}.0`, `${scope.path}.items.splice`, `${scope.path}.items`);
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `0.${info.items.length}.0`, `${scope.path}.products.splice`, `${scope.path}.products`);
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'products', scope);

                            info.items.splice(0, info.items.length);
                            info.products.splice(0, info.products.length);
                            
                            computeValues();
                            if (handlers.db){//Save to DB
                                handlers.db.write(info.items, 'cart', (state: boolean) => {});
                            }
                            
                            return;
                        }
                        
                        let computeQuantity = (itemQuantity: number) => {
                            let computed = (incremental ? (itemQuantity + quantity) : quantity);
                            return ((computed < 0) ? 0 : computed);
                        };
                        
                        let doUpdate = (item: CartItem, myQuantity: number) => {
                            if (myQuantity == item.quantity){//No changes
                                return;
                            }

                            if (item.quantity < myQuantity){
                                alertHasNew();
                            }

                            item.quantity = myQuantity;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `items.${item.product.sku}.quantity`, scope);

                            if (item.quantity <= 0){//Remove from list
                                let index = info.items.findIndex(infoItem => (infoItem.product.sku === item.product.sku));
                                if (index == -1){
                                    return;
                                }

                                info.items.splice(index, 1);
                                info.products.splice(index, 1);

                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `${index}.1.0`, `${scope.path}.items.splice`, `${scope.path}.items`);
                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `${index}.1.0`, `${scope.path}.products.splice`, `${scope.path}.products`);
                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'products', scope);
                            }
                            
                            if (handlers.db){//Save to DB
                                handlers.db.write(info.items, 'cart', (state: boolean) => {
                                    if (state && callback){
                                        callback(item);
                                    }
                                });
                            }
                            else if (callback){
                                callback(item);
                            }
                        };
                        
                        let item = info.items.find(infoItem => (infoItem.product.sku === sku));
                        if (!item){
                            if (!handlers.productLink){
                                return;
                            }

                            let computedQuantity = computeQuantity(0);
                            if (computedQuantity == 0){//No changes
                                return;
                            }

                            fetch(`${handlers.productLink}/${sku}`, {
                                method: 'GET',
                                credentials: 'same-origin',
                            }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then((data) => {
                                let newItem = {
                                    price: (data.price || data.product.price),
                                    quantity: 0,
                                    product: data.product,
                                };
                                
                                info.items.unshift(newItem);
                                info.products.unshift(newItem.product);

                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), '1', `${scope.path}.items.unshift`, `${scope.path}.items`);
                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), '1', `${scope.path}.products.unshift`, `${scope.path}.products`);
                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'products', scope);

                                doUpdate(newItem, computedQuantity);
                            }).catch((err) => {
                                ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                            });
                        }
                        else{
                            doUpdate(item, computeQuantity(item.quantity));
                        }
                    }
                    else if (handlers.updateLink){
                        fetch(`${handlers.updateLink}?sku=${sku}&quantity=${quantity}&incremental=${incremental}`, {
                            method: 'GET',
                            credentials: 'same-origin',
                        }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then((data) => {
                            if (data.empty){
                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `0.${info.items.length}.0`, `${scope.path}.items.splice`, `${scope.path}.items`);
                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `0.${info.items.length}.0`, `${scope.path}.products.splice`, `${scope.path}.products`);
                                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'products', scope);

                                info.items.splice(0, info.items.length);
                                info.products.splice(0, info.products.length);
                                
                                computeValues();
                                return;
                            }
                            
                            if (data.quantity <= 0){
                                let index = info.items.findIndex(infoItem => (infoItem.product.sku === sku));
                                if (index != -1){//Remove from list
                                    info.items.splice(index, 1);
                                    info.products.splice(index, 1);

                                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `${index}.1.0`, `${scope.path}.items.splice`, `${scope.path}.items`);
                                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `${index}.1.0`, `${scope.path}.products.splice`, `${scope.path}.products`);
                                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'products', scope);
                                }

                                return;
                            }

                            callback({
                                price: (data.price || data.product.price),
                                quantity: data.quantity,
                                product: data.product,
                            });
                        }).catch((err) => {
                            ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        });
                    }
                };
            }
            
            let scope = ExtendedDirectiveHandlers.AddScope('cart', region.AddElement(element, true), []), regionId = region.GetId(), updatesQueue: Array<() => void> = null;
            let info: CartInfo = {
                items: new Array<CartItem>(),
                products: new Array<any>(),
                count: 0,
                total: 0,
            };

            let computeValues = () => {
                let count = 0, total = 0;
                info.items.forEach((item) => {
                    count += item.quantity;
                    total += (item.price * item.quantity);
                });

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

                let existing = info.items.find(infoItem => (infoItem.product.sku == item.product.sku));
                if (existing){//Update exisiting
                    if (existing.quantity != item.quantity){
                        existing.quantity = item.quantity;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `items.${existing.product.sku}.quantity`, scope);
                    }

                    if ((item.price || item.price === 0) && existing.price != item.price){
                        existing.price = item.price;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `items.${existing.product.sku}.price`, scope);
                    }
                }
                else if (0 < item.quantity){//Add new
                    info.items.unshift(item);
                    info.products.unshift(item.product);

                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), '1', `${scope.path}.items.unshift`, `${scope.path}.items`);
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), '1', `${scope.path}.products.unshift`, `${scope.path}.products`);
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'products', scope);

                    alertHasNew();
                }

                computeValues();
            };

            let update = (sku: string, quantity: number, incremental: boolean) => {
                if (updatesQueue){//Defer
                    updatesQueue.push(() => {
                        update(sku, quantity, incremental);
                    });
                }
                else{
                    handlers.update(sku, quantity, incremental, postUpdate);
                }
            };

            let clear = () => update(null, 0, false);

            let createListProxy = (key: string, list: Array<any>) => {
                return CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === '__InlineJS_Target__'){
                        return info[key];
                    }
    
                    if (prop === '__InlineJS_Path__'){
                        return `${scope.path}.${key}`;
                    }
    
                    return info[key][prop];
                }, ['__InlineJS_Target__', '__InlineJS_Path__'], null, list);
            }

            let itemsProxy = createListProxy('items', info.items), productsProxy = createListProxy('products', info.products);
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop in info){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    if (prop === 'items'){
                        return itemsProxy;
                    }

                    if (prop === 'products'){
                        return productsProxy;
                    }

                    return info[prop];
                }

                if (prop === 'hasNew'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return hasNew;
                }

                if (prop === 'update'){
                    return update;
                }

                if (prop === 'clear'){
                    return clear;
                }

                if (prop === 'contains'){
                    return (sku: string) => {
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items`);
                        return (info.items.findIndex(item => (item.product.sku === sku)) != -1);
                    };
                }

                if (prop === 'get'){
                    return (sku: string) => {
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items`);
                        return info.items.find(item => (item.product.sku === sku));
                    };
                }

                if (prop === 'getQuantity'){
                    return (sku: string) => {
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items.${sku}.quantity`);
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items`);

                        let item = info.items.find(item => (item.product.sku === sku));
                        return (item ? item.quantity : 0);
                    };
                }

                if (prop === 'getPrice'){
                    return (sku: string) => {
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items.${sku}.price`);
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items`);
                        
                        let item = info.items.find(item => (item.product.sku === sku));
                        return (item ? item.price : 0);
                    };
                }

                if (prop === 'json'){
                    return () => {
                        return JSON.stringify(info.items.map(item => ({
                            quantity: item.quantity,
                            productSku: item.product.sku,
                        })));
                    };
                }
            }, [...Object.keys(info), 'hasNew', 'update', 'clear', 'contains', 'get', 'getQuantity', 'getPrice', 'json']);

            Region.AddGlobal('$cart', () => proxy);

            let cartAction = (myRegion: Region, myElement: HTMLElement, myDirective: Directive, eventHandler: () => void, valueCallback?: (value: any) => void,
                eventBinder?: (handler: (e: Event) => void) => void) => {
                if (valueCallback){//Bind value
                    let myRegionId = myRegion.GetId();
                    myRegion.GetState().TrapGetAccess(() => {
                        valueCallback(InlineJS.CoreDirectiveHandlers.Evaluate(Region.Get(myRegionId), myElement, myDirective.value));
                    }, true, myElement);
                }

                let defaultEventBinder = (handler: (e: Event) => void) => {
                    myElement.addEventListener('click', handler);
                };

                (eventBinder || defaultEventBinder)((e) => {
                    e.preventDefault();
                    eventHandler();
                });

                return DirectiveHandlerReturn.Handled;
            };
            
            DirectiveHandlerManager.AddHandler('cartClear', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                return cartAction(innerRegion, innerElement, innerDirective, clear);
            });
            
            DirectiveHandlerManager.AddHandler('cartUpdate', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let form = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, '$form');
                if (!form || !(form instanceof HTMLFormElement)){
                    return DirectiveHandlerReturn.Nil;
                }
                
                let sku = '';
                return cartAction(innerRegion, innerElement, innerDirective, () => {
                    update(sku, parseInt(((form as HTMLFormElement).elements.namedItem('cart-value') as HTMLInputElement).value), false);
                }, value => (sku = value), (handler) => {
                    form.addEventListener('submit', handler);
                });
            });

            DirectiveHandlerManager.AddHandler('cartIncrement', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let sku = '';
                return cartAction(innerRegion, innerElement, innerDirective, () => {
                    update(sku, 1, true);
                }, value => (sku = value));
            });

            DirectiveHandlerManager.AddHandler('cartDecrement', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let sku = '';
                return cartAction(innerRegion, innerElement, innerDirective, () => {
                    update(sku, -1, true);
                }, value => (sku = value));
            });

            DirectiveHandlerManager.AddHandler('cartRemove', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let sku = '';
                return cartAction(innerRegion, innerElement, innerDirective, () => {
                    update(sku, 0, false);
                }, value => (sku = value));
            });
            
            if (handlers.init){
                handlers.init();
            }
            
            updatesQueue = new Array<() => void>();
            handlers.load();
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Favorites(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal(region.GetId(), '$favorites')){
                return DirectiveHandlerReturn.Nil;
            }
        }

        public static DB(region: Region, element: HTMLElement, directive: Directive){
            if (directive.arg.key === 'global' && Region.GetGlobal(region.GetId(), '$db')){
                return DirectiveHandlerReturn.Nil;
            }
            
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
            let open = () => {
                if (handle){
                    return;
                }
                
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
                    handle = null;
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

            let proxy = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop in options){
                    return options[prop];
                }

                if (prop === 'open'){
                    return open;
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
            }, [...Object.keys(options), 'open', 'close', 'read', 'write']);
            
            if (directive.arg.key === 'global'){
                Region.AddGlobal('$db', () => proxy);
            }
            else{
                region.AddElement(element, true).locals['$db'] = proxy;
            }

            open();
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Auth(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal(region.GetId(), '$auth')){
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

            let shouldRefresh = directive.arg.options.includes('refresh');
            let redirect = (loggedIn: boolean, refresh = false) => {
                if (shouldRefresh || refresh){
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
                redirect_: (loggedIn: boolean, refresh = false) => {
                    redirect(loggedIn, refresh);
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
                desync: (logout: boolean, callback?: (data: any, err?: any) => boolean, after?: (state: boolean) => void) => {
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
                            if (after){
                                after(true);
                            }
                        }
                        else if (after){
                            after(false);
                        }
                    }).catch((err) => {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback){
                            callback(null, err);
                        }

                        if (after){
                            after(false);
                        }
                    });
                },
                logout: (callback?: (data: any, err?: any) => boolean, after?: (state: boolean) => void) => {
                    methods.desync(true, callback, after);
                },
                authenticate: (login: boolean, form: HTMLFormElement | Record<string, string>, callback?: (data: any, err?: any) => boolean, after?: (state: boolean) => void) => {
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
                            if (after){
                                after(true);
                            }
                        }
                        else if (after){
                            after(false);
                        }
                    }).catch((err) => {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback){
                            callback(null, err);
                        }

                        if (after){
                            after(false);
                        }
                    });
                },
                login: (form: HTMLFormElement | Record<string, string>, callback?: (data: any, err?: any) => boolean, after?: (state: boolean) => void) => {
                    methods.authenticate(true, form, callback, after);
                },
                register: (form: HTMLFormElement | Record<string, string>, errorBag?: Record<string, Array<string>>, callback?: (data: any, err?: any) => boolean, after?: (state: boolean) => void) => {
                    methods.authenticate(false, form, (data, err) => {
                        if (errorBag && 'failed' in data){
                            for (let key in errorBag){
                                let value = (data.failed[key] || []);
                                errorBag[key] = (Array.isArray(value) ? value : [value]);
                            }

                            return false;
                        }

                        return (!callback || callback(data, err));
                    }, after);
                },
                update: (form: HTMLFormElement | Record<string, string>, errorBag?: Record<string, Array<string>>, callback?: (data: any, err?: any) => boolean, after?: (state: boolean) => void) => {
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

                            if (after){
                                after(false);
                            }
                        }
                        else if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!callback || callback(data))){
                            userData = (data || {});
                            alertAll();
                            if (after){
                                after(true);
                            }
                        }
                        else if (after){
                            after(false);
                        }
                    }).catch((err) => {
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (callback){
                            callback(null, err);
                        }

                        if (after){
                            after(false);
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

                    router.addHook('beforeLoad', (info: RouterPageInfo) => {
                        if (!info || (info.name !== 'login' && info.name !== 'register')){
                            redirectPage = redirectQuery = null;
                        }
                    });

                    let redirectToLogin = (page: string, query: string) => {
                        router.goto('/login');
                        redirectPage = page;
                        redirectQuery = query;
                    };
                    
                    router.addMiddleware('guest', (page: string, query: string) => {
                        if (userData){//Logged in
                            router.goto('/');
                            return false;
                        }

                        return true;
                    });

                    router.addMiddleware('auth', (page: string, query: string) => {
                        if (!userData){//Not logged in
                            redirectToLogin(page, query);
                            return false;
                        }

                        return true;
                    });

                    (roles || []).forEach((role) => {
                        router.addMiddleware(`role:${role}`, (page: string, query: string) => {
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
                
                ExtendedDirectiveHandlers.BindForm(innerRegion, innerElement, {}, [], (after: () => void) => {
                    methods.register(innerElement, data.errorBag, data.callback, (state) => {
                        if (state){
                            redirect(true, true);
                        }
                        else{
                            after();
                        }
                    });
                });
                
                return DirectiveHandlerReturn.Handled;
            });
            
            DirectiveHandlerManager.AddHandler('authLogin', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                if (!(innerElement instanceof HTMLFormElement)){
                    return DirectiveHandlerReturn.Nil;    
                }

                let callback = CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                ExtendedDirectiveHandlers.BindForm(innerRegion, innerElement, {}, [], (after: () => void) => {
                    methods.login(innerElement, callback, (state) => {
                        if (state){
                            redirect(true, true);
                        }
                        else{
                            after();
                        }
                    });
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
                
                ExtendedDirectiveHandlers.BindForm(innerRegion, innerElement, {}, [], (after: () => void) => {
                    methods.update(innerElement, data.errorBag, data.callback, (state) => {
                        after();
                    });
                });

                return DirectiveHandlerReturn.Handled;
            });
            
            DirectiveHandlerManager.AddHandler('authLogout', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let callback = CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                if (innerElement instanceof HTMLFormElement){
                    ExtendedDirectiveHandlers.BindForm(innerRegion, innerElement, {}, [], (after: () => void) => {
                        methods.logout(callback as (data: any, err?: any) => boolean, (state) => {
                            after();
                        });
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
            if (Region.GetGlobal(region.GetId(),'$geolocation')){
                return DirectiveHandlerReturn.Nil;
            }
            
            let position: GeolocationPosition = null, error: GeolocationPositionError = null, regionId = region.GetId(), requested = false, tracking = false;
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

            let setPosition = (value: GeolocationPosition) => {
                position = value;
                window.dispatchEvent(new CustomEvent('geolocation.position', {
                    detail: value
                }));

                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'position', scope);
                if (active){
                    active = false;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                }
            };

            let setError = (value: GeolocationPositionError) => {
                error = value;
                window.dispatchEvent(new CustomEvent('geolocation.error', {
                    detail: value
                }));
                
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'error', scope);
                if (active){
                    active = false;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                }
            };

            let request = (force = false) => {
                if ((!requested || force) && check()){
                    if (!active){
                        active = true;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                    }
                    
                    requested = true;
                    navigator.geolocation.getCurrentPosition(setPosition, setError);
                }
            };

            let track = (force = false) => {
                if ((!tracking || force) && check()){
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

            let scope = ExtendedDirectiveHandlers.AddScope('geolocation', region.AddElement(element, true), []), active = false;
            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'position'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return position;
                }

                if (prop === 'error'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return error;
                }

                if (prop === 'active'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return active;
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
                let shouldForce = innerDirective.arg.options.includes('force');
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    request(shouldForce);
                });
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('geolocationTrack', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let shouldForce = innerDirective.arg.options.includes('force');
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    track(shouldForce);
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
            if (Region.GetGlobal(region.GetId(), '$reporter')){
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
            if (Region.GetGlobal(region.GetId(), '$overlay')){
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
                        let screen = Region.GetGlobalValue(region.GetId(),'$screen');
                        if (!screen || screen.checkpoint > 1){
                            document.body.classList.add('inlinejs-overlay-pad');
                        }
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

                if (prop === 'toggle'){
                    return (shouldShow: boolean) => {
                        if (shouldShow){
                            show();
                        }
                        else{
                            hide();
                        }
                    };
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
            }, ['show', 'hide', 'count', 'visible', 'zIndex', 'container']);

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

            let data = ((CoreDirectiveHandlers.Evaluate(region, element, directive.value) || {}) as FormInfo);
            ExtendedDirectiveHandlers.BindForm(region, element, {
                action: (data.action || element.action),
                method: (data.method || element.method),
                errorBag: data.errorBag,
                callback: data.callback,
                confirmInfo: data.confirmInfo,
                dbExcept: (data.dbExcept || ['_token']),
            }, directive.arg.options);

            return DirectiveHandlerReturn.Handled;
        }

        public static BindForm(region: Region, element: HTMLFormElement, info: FormInfo, directiveOptions: Array<string>, onSubmit?: (after: () => void, info?: FormInfo) => void){
            if (!info.action && !onSubmit){
                return DirectiveHandlerReturn.Nil;
            }

            let options = {
                refresh: false,
                reload: false,
                files: false,
                db: false,
                redirect: false,
            };

            let regionId = region.GetId(), middlewares = new Array<(callback: (state: boolean | null) => void, form?: HTMLFormElement) => void>();
            directiveOptions.forEach((key) => {
                if (key in options){
                    options[key] = true;
                }
                else{
                    let handler = (Region.GetGlobalValue(regionId, `$form.${key}`, element) as (callback: (state: boolean) => void) => void);
                    if (handler){
                        middlewares.push(handler);
                    }
                    else if (key === 'confirm'){
                        middlewares.push((callback) => {
                            let reporter = (Region.GetGlobalValue(regionId, '$reporter') as ReporterInfo);
                            if (reporter && reporter.confirm){//Confirm before proceeding
                                reporter.confirm((info.confirmInfo || 'Please confirm your action.'), () => callback(true), () => callback(false));
                            }
                            else{//Dummy confirmation
                                callback(true);
                            }
                        });
                    }
                }
            });
            
            let active = false, elementScope = region.AddElement(element, true);
            let scope = ExtendedDirectiveHandlers.AddScope('form', elementScope, []), errors: Record<string, Array<string>> = {};

            let errorsProxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === '__InlineJS_Target__'){
                    return errors;
                }

                if (prop === '__InlineJS_Path__'){
                    return `${scope.path}.errors`;
                }

                Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.errors.${prop}`);
                return (errors[prop] || []);
            }, ['__InlineJS_Target__', '__InlineJS_Path__'], null, errors);
            
            elementScope.locals['$form'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop === 'active'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return active;
                }

                if (prop === 'errors'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return errorsProxy;
                }
                
                if (prop === 'element'){
                    return element;
                }

                if (prop === 'submit'){
                    return submit;
                }
            }, ['active', 'element', 'submit', 'errors']);
            
            let setActiveState = (state: boolean) => {
                if (active != state){
                    active = state;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                }
            };

            options.files = (options.files || !! element.querySelector('input[type="file"]'));
            if (options.db){
                let db = Region.GetGlobalValue(regionId, '$db'), name = element.getAttribute('name');
                if (db && name){//Read from DB
                    db.read(`__InlineJS_Form_${name}`, (fields: Record<string, string>) => {
                        Object.keys(fields || {}).forEach((key) => {
                            let member = element.elements.namedItem(key);
                            if (!(member instanceof RadioNodeList) && 'value' in member && !(member as any).value){
                                (member as any).value = fields[key];
                            }
                        });
                    });
                }
            }
            
            let submit = () => {
                if (onSubmit){//Pass to handler
                    onSubmit(() => {
                        setActiveState(false);
                    }, info);

                    return;
                }
                
                let body: FormData = null, initInfo: RequestInit = {
                    method: (info.method || 'POST'),
                    credentials: 'same-origin',
                };

                let action = info.action;
                if (initInfo.method.toUpperCase() !== 'POST'){
                    let hasQuest = action.includes('?'), query = '';
                    for (let i = 0; i < element.elements.length; ++i){
                        let key = element.elements[i].getAttribute('name');
                        if (key && 'value' in element.elements[i]){
                            let pair = `${encodeURIComponent(key)}=${encodeURIComponent((element.elements[i] as HTMLInputElement).value.toString())}`;
                            if (query){
                                query += `&${pair}`;
                            }
                            else{
                                query = (hasQuest ? pair : `?${pair}`);
                            }
                        }
                    }

                    action += query;
                }
                else if (options.files){
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

                if (body){
                    initInfo.body = body;
                }
                
                fetch(action, initInfo).then(ExtendedDirectiveHandlers.HandleJsonResponse).then((data) => {
                    setActiveState(false);
                    
                    let myRegion = Region.Get(regionId);
                    for (let key in errors){
                        ExtendedDirectiveHandlers.Alert(myRegion, key, `${scope.path}.errors`);
                    }

                    errors = {};
                    ExtendedDirectiveHandlers.Alert(myRegion, 'errors', scope);
                    
                    try{
                        if ('failed' in data){
                            for (let key in (info.errorBag || {})){
                                let value = (data.failed[key] || []);
                                info.errorBag[key] = (Array.isArray(value) ? value : [value]);
                            }

                            for (let key in data.failed){
                                errors[key] = data.failed[key];
                                ExtendedDirectiveHandlers.Alert(myRegion, key, `${scope.path}.errors`);
                            }

                            ExtendedDirectiveHandlers.Report(regionId, data);
                            return;
                        }
                        
                        if (!ExtendedDirectiveHandlers.Report(regionId, data) && (!info.callback || info.callback(data))){
                            element.dispatchEvent(new CustomEvent('form.success', {
                                detail: data
                            }));

                            ExtendedDirectiveHandlers.formData_ = null;
                            if (options.db){
                                let db = Region.GetGlobalValue(regionId, '$db'), name = element.getAttribute('name');
                                if (db && name){//Write to DB
                                    let fields: Record<string, string> = {};
                                    for (let i = 0; i < element.elements.length; ++i){
                                        let key = element.elements[i].getAttribute('name');
                                        if (key && 'value' in element.elements[i] && (!info || !info.dbExcept.includes(key))){
                                            fields[key] = (element.elements[i] as any).value;
                                        }
                                    }
                                    
                                    db.write(fields, `__InlineJS_Form_${name}`);
                                }
                            }

                            if ('__redirect' in data){
                                let redirectData = data['__redirect'], isObject = Region.IsObject(redirectData);
                                if (isObject && redirectData['refresh']){
                                    window.location.href = redirectData['page'];
                                    return;
                                }

                                let router = Region.GetGlobalValue(regionId, '$router');
                                if (router){
                                    let fields: Record<string, string> = {};
                                    for (let i = 0; i < element.elements.length; ++i){
                                        let key = element.elements[i].getAttribute('name');
                                        if (key && 'value' in element.elements[i]){
                                            fields[key] = (element.elements[i] as any).value;
                                        }
                                    }
    
                                    if (isObject){
                                        if (redirectData['reresh']){
                                            window.location.href = redirectData['page'];
                                            return;
                                        }
                                        
                                        if ('data' in redirectData){
                                            if (Region.IsObject(redirectData['data'])){
                                                if ('formData' in redirectData['data']){
                                                    let formData = redirectData['data']['formData'];
                                                    Object.keys(formData || {}).forEach(key => (fields[key] = formData[key]));
                                                }
                                            }
                                            else{
                                                redirectData['data'] = {
                                                    '$loadData': redirectData['data'],
                                                };
                                            }
                                        }
                                        else{
                                            redirectData['data'] = {
                                                'formData': fields,
                                            };
                                        }
                                        
                                        ExtendedDirectiveHandlers.formData_ = fields;
                                        router.goto(redirectData['page'], (redirectData['query'] || data['__redirectQuery']), redirectData['data']);
                                    }
                                    else{
                                        ExtendedDirectiveHandlers.formData_ = fields;
                                        router.goto(redirectData, data['__redirectQuery'], {
                                            'formData': fields,
                                        });
                                    }
                                    
                                    return;
                                }
                            }
    
                            if (options.refresh){
                                window.location.reload();
                                return;
                            }
    
                            if (options.reload){
                                let router = Region.GetGlobalValue(regionId, '$router');
                                if (router){
                                    router.reload();
                                    return;
                                }
                            }

                            let auth = Region.GetGlobalValue(regionId, '$auth');
                            if (options.redirect && auth){
                                auth.redirect_(true, true);
                                return;
                            }
    
                            element.reset();
                        }
                    }
                    catch (err){
                        Region.Get(regionId).GetState().ReportError(err, `InlineJs.Region<${regionId}>.ExtendedDirectiveHandlers.BindForm(Element@${element.nodeName}, x-form)`);
                    }
                }).catch((err) => {
                    setActiveState(false);
                    
                    try{
                        ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                        if (info.callback){
                            info.callback(null, err);
                        }
                    }
                    catch (err){
                        Region.Get(regionId).GetState().ReportError(err, `InlineJs.Region<${regionId}>.ExtendedDirectiveHandlers.BindForm(Element@${element.nodeName}, x-form)`);
                    }
                });
            };

            let runMiddleWares = (index: number) => {
                if (index < middlewares.length){
                    middlewares[index]((state) => {
                        if (state){//Run next
                            runMiddleWares(index + 1);
                        }
                        else if (state === null){
                            submit();
                        }
                        else{//Rejected
                            setActiveState(false);
                        }
                    }, element);
                }
                else{
                    submit();
                }
            };
            
            element.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!active){
                    setActiveState(true);
                    runMiddleWares(0);   
                }
            });

            if (!Region.GetGlobal(region.GetId(), '$formData')){
                let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                    return ((Region.IsObject(ExtendedDirectiveHandlers.formData_) && prop in ExtendedDirectiveHandlers.formData_) ? ExtendedDirectiveHandlers.formData_[prop] : null);
                }, prop => (Region.IsObject(ExtendedDirectiveHandlers.formData_) && prop in ExtendedDirectiveHandlers.formData_));
    
                Region.AddGlobal('$formData', () => proxy);
            }
        }

        public static FormSubmit(region: Region, element: HTMLElement, directive: Directive){
            CoreDirectiveHandlers.Attr(region, element, Processor.GetDirectiveWith(`${Region.directivePrfix}-attr:disabled`, '$form.active'));
            return DirectiveHandlerReturn.Handled;
        }

        public static FormError(region: Region, element: HTMLElement, directive: Directive){
            if (!element.parentElement){
                return DirectiveHandlerReturn.Nil;
            }

            let name = element.getAttribute('name');
            if (!name){
                return DirectiveHandlerReturn.Nil;
            }

            let tmpl = document.createElement('template');
            tmpl.innerHTML = `
                <div class="inlinejs-form-error">
                    <template ${Region.directivePrfix}-each="$form.errors['${name}'] as error">
                        <p class="inlinejs-form-error-item" ${Region.directivePrfix}-text="error"></p>
                    </template>
                </div>
            `;

            Array.from(tmpl.content.children).forEach((child) => {
                if (child instanceof HTMLElement){
                    CoreDirectiveHandlers.InsertOrAppendChildElement(element.parentElement, child, 0, element);
                }
            });

            let regionId = region.GetId();
            Region.AddPostProcessCallback(() => {
                Processor.All(Region.Get(regionId), element.parentElement);
            });

            return DirectiveHandlerReturn.Handled;
        }

        public static Modal(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal(region.GetId(), '$modal')){
                return DirectiveHandlerReturn.Nil;
            }

            let scope = ExtendedDirectiveHandlers.AddScope('modal', region.AddElement(element, true), []), regionId = region.GetId(), show: boolean = null, url: string = null, active = false;
            let container = document.createElement('div'), mount = document.createElement('div'), overlay = Region.GetGlobalValue(regionId, '$overlay');
            
            container.classList.add('inlinejs-modal');
            mount.classList.add('inlinejs-modal-mount');

            if (element.style.zIndex){
                container.style.zIndex = element.style.zIndex;
            }
            else{//Compute z-index
                container.style.zIndex = (overlay ? ((overlay.zIndex || 1000) + 9) : 1009);
            }

            container.appendChild(mount);
            document.body.appendChild(container);

            let animator = (CoreDirectiveHandlers.PrepareAnimation ? CoreDirectiveHandlers.PrepareAnimation(region, container, ['zoom', 'faster']) : null);
            let setShow = (value: boolean) => {
                if (value !== show){
                    show = value;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'show', scope);

                    if (animator){
                        animator(show, (show) => {
                            if (show){
                                container.style.display = 'flex';
                            }
                        }, (show) => {
                            if (!show){
                                container.style.display = 'none';
                            }
                        });
                    }
                    else if (show){
                        container.style.display = 'flex';
                    }
                    else{
                        container.style.display = 'none';
                    }
                    
                    overlay.toggle(show);
                }
            };

            let regions = new Array<Region>(), regionsCopy: Array<Region> = null;
            Config.AddRegionHook((region, added) => {
                if (!added){
                    regions.splice(regions.indexOf(region), 1);
                    if (regionsCopy){
                        regionsCopy.splice(regionsCopy.indexOf(region), 1);
                    }
                }
                else if (mount.contains(region.GetRootElement())){
                    regions.push(region);
                }
            });
            
            let setUrl = (value: string) => {
                if (active){
                    return;
                }

                if (url === value){
                    if (url !== '::unload::'){
                        setShow(true);
                    }
                    return;
                }
                    
                url = value;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'url', scope);

                regionsCopy = regions;
                regions = new Array<Region>();
                
                setActive(true);
                ExtendedDirectiveHandlers.FetchLoad(mount, url, false, (unloaded) => {
                    if (regionsCopy){
                        regionsCopy.forEach(region => region.RemoveElement(region.GetRootElement()));
                        regionsCopy = null;
                    }
                    
                    setActive(false);
                    if (!unloaded){
                        setShow(true);
                    }
                    
                    window.dispatchEvent(new CustomEvent('modal.mount.load'));
                    if (!unloaded){
                        Bootstrap.Reattach(mount);
                    }
                }, (err) => {
                    setActive(false);
                    window.dispatchEvent(new CustomEvent(`modal.mount.error`, {
                        detail: {
                            error: err,
                            mount: mount,
                        },
                    }));
                });
            };

            let setActive = (value: boolean) => {
                if (active != value){
                    active = value;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                }
            };

            let reload = () => {
                setShow(false);
                setUrl('::unload::');
            };
            
            window.addEventListener('router.load', reload);
            window.addEventListener('router.reload', reload);

            Region.AddGlobalOutsideEventCallback(mount, ['click', 'touchend'], () => {
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

                if (prop === 'active'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return active;
                }
            }, ['show', 'url', 'active'], (target: object, prop: string | number | symbol, value: any) => {
                if (prop === 'show'){
                    setShow(!! value);
                    return true;
                }

                if (prop === 'url'){
                    setUrl(value || '');
                    return true;
                }

                if (prop === 'active'){
                    active = !! value;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
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
                    options['threshold'] = 0;
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

        public static FetchLoad(element: HTMLElement, url: string, append: boolean, onLoad: (unloaded?: boolean) => void, onError: (err: any) => void,
            onProgress?: (e: ProgressEvent<XMLHttpRequestEventTarget>) => void, onRemoveAll?: () => void){
            if (!url || !(url = url.trim())){
                return;
            }

            let removeAll = (force: boolean = false) => {
                if (force || !append){
                    while (element.firstElementChild){
                        window.dispatchEvent(new CustomEvent('inlinejs.refresh', {
                            detail: { target: element.firstElementChild },
                        }));

                        Region.RemoveElementStatic(element.firstElementChild as HTMLElement);
                        element.removeChild(element.firstElementChild);
                    }

                    if (onRemoveAll){
                        onRemoveAll();
                    }
                }
            };

            let fetch = (url: string, tryJson: boolean, callback: (response: any) => void) => {
                let request = new XMLHttpRequest();

                if (onProgress){
                    request.addEventListener('progress', onProgress);
                }

                if (onError){
                    request.addEventListener('error', () => {
                        onError({
                            status: request.status,
                            statusText: request.statusText,
                        });
                    });
                }

                request.addEventListener('load', () => {
                    let parsedData: any;
                    try{
                        if (tryJson){
                            parsedData = JSON.parse(request.responseText);    
                            if (ExtendedDirectiveHandlers.Report(null, parsedData)){
                                return;
                            }
                        }
                        else{
                            parsedData = request.responseText;
                        }
                    }
                    catch (err){
                        parsedData = request.responseText;
                    }

                    callback(parsedData);
                    if (onLoad){
                        onLoad();
                    }
                });

                request.open('GET', url);
                request.send();
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

                    if (onLoad){
                        onLoad();
                    }
                });
            };

            let onEvent = () => {
                element.removeEventListener('load', onEvent);
                if (onLoad){
                    onLoad();
                }
            };

            if (url === '::unload::'){
                if (element.tagName === 'IMG' || element.tagName === 'IFRAME'){
                    (element as HTMLImageElement).src = '';
                }
                else{
                    removeAll(true);
                }

                if (onLoad){
                    onLoad(true);
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
                        Array.from(tmpl.content.childNodes).forEach(child => element.appendChild(child));
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

        public static Alert(region: Region, prop: string, prefix: ExtendedDirectiveHandlerScope | string, target?: string){
            if (!region){
                return;
            }
            
            let change: Change = {
                regionId: region.GetId(),
                type: 'set',
                path: (prefix ? `${((typeof prefix === 'string') ? prefix : prefix.path)}.${prop}` : prop),
                prop: prop,
                origin: region.GetChanges().GetOrigin()
            };

            if (target){
                region.GetChanges().Add({
                    original: change,
                    path: target,
                });
            }
            else{
                region.GetChanges().Add(change);
            }
        }

        public static Report(regionId: string, info: any){
            let reporter = (Region.GetGlobalValue(regionId, '$reporter') as ReporterInfo);
            return (reporter && reporter.report && reporter.report(info));
        }
        
        public static ReportServerError(regionId: string, err: any){
            let reporter = (Region.GetGlobalValue(regionId, '$reporter') as ReporterInfo);
            return (reporter && reporter.reportServerError && reporter.reportServerError(err));
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

        public static BuildGlobal(name: string){
            Region.AddGlobal(`$$${name}`, (regionId: string) => {
                return (target: HTMLElement) => {
                    let local = (Region.Infer(target) || Region.Get(regionId)).GetLocal(target, `$${name}`, true);
                    return ((local instanceof Value) ? local.Get() : local);
                };
            });
        }
        
        public static AddAll(){
            DirectiveHandlerManager.AddHandler('watch', ExtendedDirectiveHandlers.Watch);
            DirectiveHandlerManager.AddHandler('when', ExtendedDirectiveHandlers.When);
            DirectiveHandlerManager.AddHandler('once', ExtendedDirectiveHandlers.Once);

            DirectiveHandlerManager.AddHandler('mouse', ExtendedDirectiveHandlers.Mouse);

            DirectiveHandlerManager.AddHandler('input', ExtendedDirectiveHandlers.Input);
            DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            DirectiveHandlerManager.AddHandler('attrChange', ExtendedDirectiveHandlers.AttrChange);
            
            DirectiveHandlerManager.AddHandler('jsonLoad', ExtendedDirectiveHandlers.JSONLoad);
            DirectiveHandlerManager.AddHandler('xhrLoad', ExtendedDirectiveHandlers.XHRLoad);
            DirectiveHandlerManager.AddHandler('lazyLoad', ExtendedDirectiveHandlers.LazyLoad);

            DirectiveHandlerManager.AddHandler('intersection', ExtendedDirectiveHandlers.Intersection);
            DirectiveHandlerManager.AddHandler('busy', ExtendedDirectiveHandlers.Busy);
            DirectiveHandlerManager.AddHandler('activeGroup', ExtendedDirectiveHandlers.ActiveGroup);

            DirectiveHandlerManager.AddHandler('router', ExtendedDirectiveHandlers.Router);
            DirectiveHandlerManager.AddHandler('page', ExtendedDirectiveHandlers.Page);
            DirectiveHandlerManager.AddHandler('screen', ExtendedDirectiveHandlers.Screen);
            DirectiveHandlerManager.AddHandler('darkMode', ExtendedDirectiveHandlers.DarkMode);

            DirectiveHandlerManager.AddHandler('cart', ExtendedDirectiveHandlers.Cart);
            DirectiveHandlerManager.AddHandler('favorites', ExtendedDirectiveHandlers.Favorites);
            DirectiveHandlerManager.AddHandler('db', ExtendedDirectiveHandlers.DB);
            DirectiveHandlerManager.AddHandler('auth', ExtendedDirectiveHandlers.Auth);

            DirectiveHandlerManager.AddHandler('geolocation', ExtendedDirectiveHandlers.Geolocation);
            DirectiveHandlerManager.AddHandler('reporter', ExtendedDirectiveHandlers.Reporter);
            DirectiveHandlerManager.AddHandler('overlay', ExtendedDirectiveHandlers.Overlay);

            DirectiveHandlerManager.AddHandler('form', ExtendedDirectiveHandlers.Form);
            DirectiveHandlerManager.AddHandler('formSubmit', ExtendedDirectiveHandlers.FormSubmit);
            DirectiveHandlerManager.AddHandler('formButton', ExtendedDirectiveHandlers.FormSubmit);
            DirectiveHandlerManager.AddHandler('formError', ExtendedDirectiveHandlers.FormError);
            
            DirectiveHandlerManager.AddHandler('modal', ExtendedDirectiveHandlers.Modal);
            DirectiveHandlerManager.AddHandler('counter', ExtendedDirectiveHandlers.Counter);

            ExtendedDirectiveHandlers.BuildGlobal('state');
            ExtendedDirectiveHandlers.BuildGlobal('attr');
            ExtendedDirectiveHandlers.BuildGlobal('xhr');
            ExtendedDirectiveHandlers.BuildGlobal('lazyLoad');
            ExtendedDirectiveHandlers.BuildGlobal('intersection');
            ExtendedDirectiveHandlers.BuildGlobal('busy');
            ExtendedDirectiveHandlers.BuildGlobal('db');
            ExtendedDirectiveHandlers.BuildGlobal('form');
            ExtendedDirectiveHandlers.BuildGlobal('counter');
        }
    }

    (function(){
        ExtendedDirectiveHandlers.AddAll();
    })();
}
