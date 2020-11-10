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

    export interface RouterInfo{
        currentPage: string;
        currentQuery: Record<string, string>;
        targetComponent: string;
        targetExit: string;
        pages: Record<string, RouterPageInfo>;
        url: string;
        mount: HTMLElement;
        middlewares: Record<string, (page?: string, params?: Record<string, string>) => boolean>;
    }

    export interface RouterPageInfo{
        path: string;
        title: string;
        component: string;
        entry: string;
        exit: string;
        disabled: boolean;
        middlewares: Array<string>;
    }

    export interface TypewriterInfo{
        list: Array<string>;
        delay: number;
        interval: number;
        iterations: number;
        showDelete: boolean;
        useRandom: boolean;
        showCursor: boolean;
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
                            type: 'set',
                            path: `${scope.path}.${key}`,
                            prop: key,
                            origin: myRegion.GetChanges().GetOrigin()
                        });
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
                });
            };
            
            region.GetState().TrapGetAccess(() => {
                let url = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                if (url !== info.url && typeof url === 'string'){
                    load(url);
                    info.url = url;
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
                        type: 'set',
                        path: `${scope.path}.isLoaded`,
                        prop: 'isLoaded',
                        origin: myRegion.GetChanges().GetOrigin()
                    });

                    Object.keys(scope.callbacks).forEach(key => (scope.callbacks[key] as Array<(value?: any) => boolean>).forEach(callback => CoreDirectiveHandlers.Call(regionId, callback, true)));
                    element.dispatchEvent(new CustomEvent(`xhr.load`));
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
            let type = (directive.arg.key || 'transition'), showOnly = false, target = '', duration = 300, style = getComputedStyle(element);
            let extractDuration = (option: string) => {
                if (option === 'slower'){
                    return 1000;
                }

                if (option === 'slow'){
                    return 750;
                }

                if (option === 'normal'){
                    return 500;
                }

                if (option === 'fast'){
                    return 300;
                }

                if (option === 'faster'){
                    return 200;
                }

                return CoreDirectiveHandlers.ExtractDuration(option, null);
            };
            
            let extractors = {
                transition: (options: Array<string>) => {
                    options.forEach((option) => {
                        if ((duration = extractDuration(option)) === null){
                            if (option === 'show'){
                                showOnly = true;
                            }
                            else{
                                target = option;
                            }
                        }
                    });
                },
                unknown: (options: Array<string>) => {
                    options.forEach(option => duration = extractDuration(option));
                }
            };

            let animationMap = {
                backUp: {
                    in: 'backInUp',
                    out: 'backOutUp',
                },
                backRight: {
                    in: 'backInRight',
                    out: 'backOutRight',
                },
                backDown: {
                    in: 'backInDown',
                    out: 'backOutDown',
                },
                backLeft: {
                    in: 'backInLeft',
                    out: 'backOutLeft',
                },
                bounce: {
                    in: 'bounceIn',
                    out: 'bounceOut',
                },
                bounceUp: {
                    in: 'bounceInUp',
                    out: 'bounceOutUp',
                },
                bounceRight: {
                    in: 'bounceInRight',
                    out: 'bounceOutRight',
                },
                bounceDown: {
                    in: 'bounceInDown',
                    out: 'bounceOutDown',
                },
                bounceLeft: {
                    in: 'bounceInLeft',
                    out: 'bounceOutLeft',
                },
                fade: {
                    in: 'fadeIn',
                    out: 'fadeOut',
                },
                fadeUp: {
                    in: 'fadeInUp',
                    out: 'fadeOutUp',
                },
                fadeRight: {
                    in: 'fadeInRight',
                    out: 'fadeOutRight',
                },
                fadeDown: {
                    in: 'fadeInDown',
                    out: 'fadeOutDown',
                },
                fadeLeft: {
                    in: 'fadeInLeft',
                    out: 'fadeOutLeft',
                },
                zoom: {
                    in: 'zoomIn',
                    out: 'zoomOut',
                },
                zoomUp: {
                    in: 'zoomInUp',
                    out: 'zoomOutUp',
                },
                zoomRight: {
                    in: 'zoomInRight',
                    out: 'zoomOutRight',
                },
                zoomDown: {
                    in: 'zoomInDown',
                    out: 'zoomOutDown',
                },
                zoomLeft: {
                    in: 'zoomInLeft',
                    out: 'zoomOutLeft',
                },
                slideUp: {
                    in: 'slideInUp',
                    out: 'slideOutUp',
                },
                slideRight: {
                    in: 'slideInRight',
                    out: 'slideOutRight',
                },
                slideDown: {
                    in: 'slideInDown',
                    out: 'slideOutDown',
                },
                slideLeft: {
                    in: 'slideInLeft',
                    out: 'slideOutLeft',
                },
                rotate: {
                    in: 'rotateIn',
                    out: 'rotateOut',
                },
                rotateUpRight: {
                    in: 'rotateInUpRight',
                    out: 'rotateOutUpRight',
                },
                rotateDownRight: {
                    in: 'rotateInDownRight',
                    out: 'rotateOutDownRight',
                },
                rotateDownLeft: {
                    in: 'rotateInDownLeft',
                    out: 'rotateOutDownLeft',
                },
                rotateUpLeft: {
                    in: 'rotateInUpLeft',
                    out: 'rotateOutUpLeft',
                },
                roll: {
                    in: 'rollIn',
                    out: 'rollOut',
                },
                flipX: {
                    in: 'flipInX',
                    out: 'flipOutX',
                },
                flipY: {
                    in: 'flipInY',
                    out: 'flipOutY',
                },
                lightSpeedLeft: {
                    in: 'lightSpeedInLeft',
                    out: 'lightSpeedOutLeft',
                },
                lightSpeedRight: {
                    in: 'lightSpeedInRight',
                    out: 'lightSpeedOutRight',
                },
            };
            
            if (type in extractors){
                extractors[type](directive.arg.options);
            }
            else{
                extractors.unknown(directive.arg.options);
            }

            let update: (show: boolean) => void;
            let isShown = false, isTransitioning = false, checkpoint = 0;
            
            let endTransition = () => {
                if (!isTransitioning){
                    return;
                }
                
                isTransitioning = false;
                if (!isShown){
                    if (showValue){
                        element.style.display = 'none';
                    }
                    element.dispatchEvent(new CustomEvent('animate.hide'));
                }
                else{
                    element.dispatchEvent(new CustomEvent('animate.show'));
                }
            };

            let preUpdate = (show: boolean) => {
                isShown = show;
                isTransitioning = true;
                
                if (show){
                    if (showValue){
                        element.style.display = showValue;
                    }
                    element.dispatchEvent(new CustomEvent('animate.showing'));
                }
                else{
                    element.dispatchEvent(new CustomEvent('animate.hiding'));
                }

                if (showOnly && !isShown){
                    return;
                }

                if (showValue){
                    let thisCheckpoint = ++checkpoint;
                    setTimeout(() => {
                        if (thisCheckpoint == checkpoint){
                            endTransition();
                        }
                    }, (duration || 300));
                }
            };
            
            let setTransitions = (list: Array<string>) => {
                let reduced = list.reduce((previous, current) => (previous ? `${previous}, ${current} ${duration || 300}ms ease` : `${current} ${duration || 300}ms ease`), '');
                if (element.style.transition){
                    element.style.transition += `, ${reduced}`;
                }
                else{
                    element.style.transition = reduced;
                }

                element.addEventListener('transitionend', () => {
                    endTransition();
                });
            };
            
            let height = style.height, width = style.width, padding = style.padding, borderWidth = style.borderWidth, showValue = style.getPropertyValue('display');
            if (showValue === 'none'){
                showValue = 'block';
            }
            
            if (type === 'transition'){
                let updateSize = (show: boolean) => {
                    element.style.padding = (show ? padding : '0');
                    element.style.borderWidth = (show ? borderWidth : '0');
                    if (target === 'height' || target !== 'width'){
                        element.style.height = (show ? height : '0');
                    }

                    if (target === 'width' || target !== 'height'){
                        element.style.width = (show ? width : '0');
                    }
                };

                let updateOpacity = (show: boolean) => {
                    element.style.opacity = (show ? '1' : '0');
                };
                
                if (!target || target === 'all'){
                    showValue = null;
                    element.style.overflow = 'hidden';
                    setTransitions(['height', 'width', 'padding', 'border', 'opacity']);
                    update = (show: boolean) => {
                        preUpdate(show);
                        updateSize(show);
                        updateOpacity(show);
                        if (showOnly && !isShown){
                            endTransition();
                        }
                    };
                }
                else if (target === 'height' || target === 'width' || target === 'size'){
                    showValue = null;
                    element.style.overflow = 'hidden';
                    setTransitions(['height', 'width', 'padding', 'border']);
                    update = (show: boolean) => {
                        preUpdate(show);
                        updateSize(show);
                        if (showOnly && !isShown){
                            endTransition();
                        }
                    };
                }
                else if (target === 'opacity'){
                    setTransitions(['opacity']);
                    update = (show: boolean) => {
                        preUpdate(show);
                        updateOpacity(show);
                        if (showOnly && !isShown){
                            endTransition();
                        }
                    };
                }
            }
            else if (type in animationMap){//Use Animate.css
                let inTarget = `animate__${animationMap[type].in}`,  outTarget = `animate__${animationMap[type].out}`, lastTarget = '';
                update = (show: boolean) => {
                    preUpdate(show);
                    if (element.classList.contains(lastTarget)){
                        element.classList.remove(lastTarget);
                    }

                    element.classList.add('animate__animated');
                    if (show){
                        element.classList.add(lastTarget = inTarget);
                    }
                    else{//Hide
                        element.classList.add(lastTarget = outTarget);
                    }
                };
                
                element.style.animationDuration = `${duration || 300}ms`;
                element.addEventListener('animationend', () => {
                    endTransition();
                });
            }
            else{
                return DirectiveHandlerReturn.Nil;
            }

            let regionId = region.GetId();
            region.GetState().TrapGetAccess(() => {
                update(!! CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }, true, element);

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
            
            let lineIndex = -1, index = 0, line: string, isDeleting = false, span = document.createElement('span'), duration: number, startTimestamp: DOMHighResTimeStamp = null;
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

                requestAnimationFrame(pass);
            };

            span.classList.add('typewriter-text');
            if (info.showCursor){
                span.style.borderRight = '1px solid #333333';
            }
            
            element.appendChild(span);
            requestAnimationFrame(pass);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Router(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$router', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }
            
            let regionId = region.GetId(), prefix = directive.value, origin = location.origin, pathname = location.pathname, query = location.search.substr(1), alertable = [ 'url', 'currentPage', 'currentQuery' ], info: RouterInfo = {
                currentPage: null,
                currentQuery: {},
                targetComponent: null,
                targetExit: null,
                pages: {},
                url: null,
                mount: null,
                middlewares: {}
            }, methods = {
                register: (data: Record<string, any>) => {
                    let innerRegion = Region.Get(RegionMap.scopeRegionIds.Peek());
                    if (innerRegion){
                        register(data.page, (data.path || data.page), data.title, innerRegion.GetComponentKey(), (data.entry || 'open'), (data.exit || 'close'), !! data.disabled, data.middlewares);
                    }
                },
                unregister: (page: string) => {
                    delete info.pages[page];
                },
                disable: (page: string, disabled = true) => {
                    if (page in info.pages){
                        info.pages[page].disabled = disabled;
                    }
                },
                goto: (page: string, args?: Array<any> | any) => { goto(page, args) },
                redirect: (page: string, args?: Array<any> | any) => { goto(page, args, true) },
                back: () => { back() },
                exit: (component?: string) => {
                    if (!component){
                        let innerRegion = Region.Get(RegionMap.scopeRegionIds.Peek());
                        if (innerRegion){
                            exit(innerRegion.GetComponentKey());
                        }
                    }
                    else{
                        exit(component);
                    }
                },
                addMiddleware: (name: string, handler: (page?: string, args?: Array<any> | any) => boolean) => {
                    info.middlewares[name] = handler;
                }
            };

            if (prefix){
                prefix += '/';
            }

            let scope = ExtendedDirectiveHandlers.AddScope('router', region.AddElement(element, true), Object.keys(methods));
            let alert = (prop: string) => {
                let myRegion = Region.Get(regionId);
                myRegion.GetChanges().Add({
                    type: 'set',
                    path: `${scope.path}.${prop}`,
                    prop: prop,
                    origin: myRegion.GetChanges().GetOrigin()
                });
            };
            
            let register = (page: string, path: string, title: string, component: string, entry: string, exit: string, disabled: boolean, middlewares: Array<string>) => {
                info.pages[page] = {
                    path: path,
                    title: title,
                    component: component,
                    entry: entry,
                    exit: exit,
                    disabled: disabled,
                    middlewares: ((middlewares && Array.isArray(middlewares)) ? middlewares : new Array<string>())
                };
            };

            let goto = (page: string, params?: Record<string, string>, replace = false) => {
                if (page in info.pages && !info.pages[page].disabled){
                    let query = '';
                    for (let key in params){
                        if (query){
                            query += `&${key}=${params[key]}`;
                        }
                        else{
                            query += `?${key}=${params[key]}`;
                        }
                    }
                    
                    if (`${prefix}${info.pages[page].path}${query}` === info.url){
                        window.dispatchEvent(new CustomEvent('router.reload'));
                        window.dispatchEvent(new CustomEvent('router.load'));
                        return;
                    }
                    
                    load(page, params, query, () => {
                        if (replace){
                            history.replaceState({
                                page: page,
                                params: params,
                                query: query
                            }, info.pages[page].title, `${origin}/${page}${query}`);
                        }
                        else{
                            history.pushState({
                                page: page,
                                params: params,
                                query: query
                            }, info.pages[page].title, `${origin}/${page}${query}`);
                        }
                    });
                }
                else{
                    window.dispatchEvent(new CustomEvent('router.404', { detail: page }));
                }
            };
            
            let back = () => {
                if (info.currentPage && info.currentPage !== '/'){
                    history.back();
                    return true;
                }

                return false;
            };

            let exit = (component: string) => {
                if (!info.targetComponent && info.currentPage && info.currentPage !== '/' && info.pages[info.currentPage].component === component){
                    info.targetComponent = component;
                    info.targetExit = info.pages[info.currentPage].exit;
                    history.back();
                }
            };

            let load = (page: string, params: Record<string, string>, query: string, callback?: () => void) => {
                let pageInfo = info.pages[page], component = pageInfo.component, handled: any;
                for (let i = 0; i < (pageInfo.middlewares || []).length; ++i){
                    let middleware = pageInfo.middlewares[i];
                    if (middleware in info.middlewares && !info.middlewares[middleware](page, params)){
                        return;//Rejected
                    }
                };

                info.currentPage = page;
                alert('currentPage');

                if (!Region.IsEqual(info.currentQuery, params)){
                    info.currentQuery = params;
                    alert('currentQuery');
                }

                try{
                    if (component){
                        handled = (Region.Find(component, true)[info.pages[page].entry])(params);
                    }
                    else{
                        handled = false;
                    }
                }
                catch(err){
                    handled = false;
                }

                if (handled === false){
                    info.url = `${origin}/${prefix}${info.pages[page].path}${query}`;
                    alert('url');
                }

                if (callback){
                    callback();
                }
                
                window.dispatchEvent(new CustomEvent('router.load'));
            };

            let unload = (component: string, exit: string) => {
                try{
                    (Region.Find(component, true)[exit])();
                }
                catch (err){}

                window.dispatchEvent(new CustomEvent('router.unload'));
            };

            let parseQuery = (query: string) => {
                let params: Record<string, string> = {};
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
            
            window.addEventListener('popstate', (event) => {
                if (!event.state){
                    return;
                }
                
                let page = event.state.page;
                if (!page || !(page in info.pages)){
                    return;
                }

                if (!info.targetComponent || info.pages[page].component !== info.targetComponent || !back()){
                    if (info.targetComponent){
                        unload(info.targetComponent, info.targetExit);
                        info.targetComponent = null;
                        info.targetExit = null;
                    }
                    else if (info.currentPage && info.currentPage !== '/'){
                        unload(info.pages[info.currentPage].component, info.pages[info.currentPage].exit);
                    }
                    
                    load(page, event.state.params, event.state.query);
                }
            });

            DirectiveHandlerManager.AddHandler('routerMount', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let innerRegionId = innerRegion.GetId();
                if (info.mount){
                    return DirectiveHandlerReturn.Nil;
                }
                
                info.mount = document.createElement('div');
                innerElement.parentElement.insertBefore(info.mount, innerElement);
                info.mount.classList.add('router-mount');

                innerRegion.GetState().TrapGetAccess(() => {
                    let url = CoreDirectiveHandlers.Evaluate(Region.Get(innerRegionId), innerElement, '$router.url');
                    ExtendedDirectiveHandlers.FetchLoad(info.mount, url, false, () => {
                        innerElement.dispatchEvent(new CustomEvent('router.mount.load'));
                        Bootstrap.Reattach();
                    });
                }, true, innerElement);
                
                return DirectiveHandlerReturn.Handled;
            });
            
            DirectiveHandlerManager.AddHandler('routerRegister', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                let data = InlineJS.CoreDirectiveHandlers.Evaluate(innerRegion, innerElement, innerDirective.value);
                register(data.page, (data.path || data.page), data.title, innerRegion.GetComponentKey(), (data.entry || 'open'), (data.exit || 'close'), !! data.disabled, data.middlewares);
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('routerLink', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                if (innerElement instanceof HTMLFormElement){
                    innerElement.addEventListener('submit', (e) => {
                        e.preventDefault();
                        
                        let data = new FormData(innerElement), query: Record<string, string> = {};
                        data.forEach((value, key) => {
                            let stringValue = value.toString();
                            if (stringValue){
                                query[key] = stringValue;
                            }
                        });
                        
                        goto(innerDirective.value, query);
                    });

                    return DirectiveHandlerReturn.Handled;
                }
                
                let path: string, query = '';
                if (innerElement instanceof HTMLAnchorElement){
                    query = innerElement.search.substr(1);
                    path = innerElement.pathname;

                    if (!path){
                        path = innerDirective.value;
                    }
                    else if (path.length > 1 && path.startsWith('/')){
                        path = path.substr(1);
                    }
                }
                else{
                    path = innerDirective.value;
                }
                
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    goto(path, parseQuery(query));
                });
                
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('routerBack', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    back();
                });
                return DirectiveHandlerReturn.Handled;
            });

            DirectiveHandlerManager.AddHandler('routerExit', (innerRegion: Region, innerElement: HTMLElement, innerDirective: Directive) => {
                innerElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    exit(innerRegion.GetComponentKey());
                });
                return DirectiveHandlerReturn.Handled;
            });
            
            Config.AddGlobalMagicProperty('routerExit', (regionId) => {
                return () => exit(Region.Get(regionId).GetComponentKey());
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
                goto(((pathname.length > 1 && pathname.startsWith('/')) ? pathname.substr(1): pathname), parseQuery(query));
            });
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Screen(region: Region, element: HTMLElement, directive: Directive){
            if (Region.GetGlobal('$screen', region.GetId())){
                return DirectiveHandlerReturn.Nil;
            }
            
            let computeBreakpoint = (width: number) => {
                if (width < 576){//Extra small
                    return 'xs';
                }

                if (width < 768){//Small
                    return 'sm';
                }

                if (width < 992){//Medium
                    return 'md';
                }

                if (width < 1200){//Large
                    return 'lg';
                }

                if (width < 1400){//Extra large
                    return 'xl';
                }

                return 'xxl';//Extra extra large
            };
            
            let size = {
                width: screen.width,
                height: screen.height
            }, breakpoint = computeBreakpoint(screen.width), regionId = region.GetId();

            let alert = (prop: string) => {
                let myRegion = Region.Get(regionId);
                myRegion.GetChanges().Add({
                    type: 'set',
                    path: `${scope.path}.${prop}`,
                    prop: prop,
                    origin: myRegion.GetChanges().GetOrigin()
                });
            };

            window.addEventListener('resize', () => {
                size.width = screen.width;
                size.height = screen.height;
                alert('size');

                let thisBreakpoint = computeBreakpoint(screen.width);
                if (thisBreakpoint !== breakpoint){
                    breakpoint = thisBreakpoint;
                    window.dispatchEvent(new CustomEvent('screen.breakpoint'));
                    alert('breakpoint');
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
                    return breakpoint;
                }
            }, ['size', 'breakpoint']);
            
            Region.AddGlobal('$screen', () => proxy);
        }

        public static DB(region: Region, element: HTMLElement, directive: Directive){
            let options = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (typeof options === 'string'){
                options = {
                    name: options
                };
            }

            if (!Region.IsObject(options) || !options.name){
                return DirectiveHandlerReturn.Nil;
            }
            
            let opened = false, openRequest: IDBOpenDBRequest = null, handle: IDBDatabase = null, queuedRequests = new Array<() => void>(), regionId = region.GetId();
            let open = (myRegion: Region) => {
                if (options.drop){
                    window.indexedDB.deleteDatabase(options.name);
                }
                
                openRequest = window.indexedDB.open(options.name);
                openRequest.addEventListener('error', (e) => {
                    myRegion.GetState().ReportError(`Failed to open database '${options.name}'`, e);
                    opened = true;
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
                        myRegion.GetState().ReportError(`Failed to open database '${options.name}'`, e);
                        opened = true;
                    });

                    if (Region.IsObject(options.fields)){
                        Object.keys(options.fields).forEach((key) => {
                            store.createIndex(key, key, {
                                unique: !! options.fields[key]
                            });
                        });
                    }
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
            if (!url || !(url = url.trim())){
                return;
            }

            let removeAll = (force: boolean = false) => {
                if (force || !append){
                    while (element.firstElementChild){
                        element.removeChild(element.firstElementChild);
                    }
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
                callbacks: {}
            };

            (callbacks || []).forEach(key => (ExtendedDirectiveHandlers.scopes_[id] as ExtendedDirectiveHandlerScope).callbacks[key] = new Array<(value?: any) => boolean>());
            return ExtendedDirectiveHandlers.scopes_[id];
        }

        public static AddAll(){
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
            DirectiveHandlerManager.AddHandler('db', ExtendedDirectiveHandlers.DB);

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
        }
    }

    (function(){
        ExtendedDirectiveHandlers.AddAll();
    })();
}
