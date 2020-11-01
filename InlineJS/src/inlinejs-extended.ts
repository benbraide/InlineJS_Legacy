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
        callbacks: Map<string, Array<(value?: any) => boolean>>;
    }
    
    export class ExtendedDirectiveHandlers{
        private static scopeId_ = 0;
        private static scopes_ = new Map<string, ExtendedDirectiveHandlerScope>();

        public static Watch(region: Region, element: HTMLElement, directive: Directive){
            let previousValue: any;
            region.GetState().TrapGetAccess(() => {
                let value = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                if (!Region.IsEqual(value, previousValue)){
                    previousValue = Region.DeepCopy(value);
                    element.dispatchEvent(new CustomEvent('watch.change', { detail: value }));
                }
            }, true);
            return DirectiveHandlerReturn.Handled;
        }
        
        public static When(region: Region, element: HTMLElement, directive: Directive){
            region.GetState().TrapGetAccess(() => {
                if (!! CoreDirectiveHandlers.Evaluate(region, element, directive.value)){
                    element.dispatchEvent(new CustomEvent('when.change'));
                }
            }, true);
            return DirectiveHandlerReturn.Handled;
        }
        
        public static Once(region: Region, element: HTMLElement, directive: Directive){
            region.GetState().TrapGetAccess(() => {
                if (!! CoreDirectiveHandlers.Evaluate(region, element, directive.value)){
                    element.dispatchEvent(new CustomEvent('once.change'));
                    return false;
                }
                return true;
            }, true);
            return DirectiveHandlerReturn.Handled;
        }

        public static Input(region: Region, element: HTMLElement, directive: Directive){
            let wrapper = document.createElement('div'), span = document.createElement('span');

            element.parentElement.insertBefore(wrapper, element);
            wrapper.appendChild(element);
            wrapper.appendChild(span);

            wrapper.classList.add('inlinejs-input');
            directive.arg.options.forEach(key => wrapper.classList.add(key));

            span.style.top = `calc(${element.offsetHeight}px + 0.1rem)`;
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
            let delay = 750, lazy = false;
            for (let i = 0; i < directive.arg.options.length; ++i){
                if (directive.arg.options[i] === 'delay' && i < (directive.arg.options.length - 1)){
                    delay = CoreDirectiveHandlers.ExtractDuration(directive.arg.options[i + 1], delay);
                }
                else if (directive.arg.options[i] === 'lazy'){
                    lazy = true;
                }
            }
            
            return ExtendedDirectiveHandlers.ContextState(region, element, lazy, delay, null);
        }

        public static ContextState(region: Region, element: HTMLElement, lazy: boolean, delay: number, info: StateDirectiveInfo){
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
            
            let scope = ExtendedDirectiveHandlers.AddScope('state', elementScope, ['isDirty', 'isTyping', 'isValid']), isRoot = false, forceSet = false;
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
                Array.from(element.children).forEach(child => ExtendedDirectiveHandlers.ContextState(region, (child as HTMLElement), lazy, delay, info));
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
            let type = (directive.arg.key || 'transition'), target = '', duration = 300, style = getComputedStyle(element);
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
                            target = option;
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
            let setTransitions = (list: Array<string>) => {
                let reduced = list.reduce((previous, current) => (previous ? `${previous}, ${current} ${duration || 300}ms ease` : `${current} ${duration || 300}ms ease`), '');
                if (element.style.transition){
                    element.style.transition += `, ${reduced}`;
                }
                else{
                    element.style.transition = reduced;
                }
            };
            
            let height = style.height, width = style.width, padding = style.padding, borderWidth = style.borderWidth, isShown = false;
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

                let shouldUpdateSize = true;
                let updateOpacity = (show: boolean) => {
                    isShown = show;
                    if (show){
                        element.style.opacity = '1';
                        if (shouldUpdateSize){
                            element.style.padding = padding;
                            element.style.borderWidth = borderWidth;
                            element.style.height = height;
                        }
                    }
                    else{
                        element.style.opacity = '0';
                    }
                };
                
                if (!target || target === 'all'){
                    shouldUpdateSize = false;
                    element.style.overflow = 'hidden';

                    setTransitions(['height', 'width', 'padding', 'border', 'opacity']);
                    update = (show: boolean) => {
                        updateSize(show);
                        updateOpacity(show);
                    };
                }
                else if (target === 'height' || target === 'width' || target === 'size'){
                    element.style.overflow = 'hidden';
                    setTransitions(['height', 'width', 'padding', 'border']);
                    update = updateSize;
                }
                else if (target === 'opacity'){
                    setTransitions(['opacity']);
                    update = updateOpacity;
                    
                    element.addEventListener('transitionend', () => {
                        if (!isShown){
                            element.style.padding = '0';
                            element.style.borderWidth = '0';
                            element.style.height = '0';
                        }
                    });
                }
            }
            else if (type in animationMap){//Use Animate.css
                let inTarget = `animate__${animationMap[type].in}`,  outTarget = `animate__${animationMap[type].out}`, lastTarget = '';
                update = (show: boolean) => {
                    isShown = show;
                    element.style.padding = padding;
                    element.style.borderWidth = borderWidth;
                    element.style.height = height;
                    
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
                
                element.style.animationDuration = `${duration}ms`;
                element.addEventListener('animationend', () => {
                    if (!isShown){
                        element.style.padding = '0';
                        element.style.borderWidth = '0';
                        element.style.height = '0';
                    }
                });
            }
            else{
                return DirectiveHandlerReturn.Nil;
            }

            let regionId = region.GetId();
            region.GetState().TrapGetAccess(() => {
                update(!! CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }, true);

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
                callbacks: new Map<string, Array<(value?: any) => boolean>>()
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
