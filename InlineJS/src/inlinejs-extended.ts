namespace InlineJS{
    const InputDirtyEvent = 'inlinejs.input.dirty';
    const InputCleanEvent = 'inlinejs.input.clean';

    const InputResetDirtyEvent = 'inlinejs.input.reset.dirty';
    const InputResetInvalidEvent = 'inlinejs.input.reset.invalid';

    const InputTypingEvent = 'inlinejs.input.typing';
    const InputStoppedTypingEvent = 'inlinejs.input.stopped.typing';
    
    const InputValidEvent = 'inlinejs.input.valid';
    const InputInvalidEvent = 'inlinejs.input.invalid';
    
    const ObservedIncrementEvent = 'inlinejs.observed.increment';
    const ObservedDecrementEvent = 'inlinejs.observed.decrement';
    
    const ObservedVisibleEvent = 'inlinejs.observed.visible';
    const ObservedHiddenEvent = 'inlinejs.observed.hidden';

    const ObservedUnsupportedEvent = 'inlinejs.observed.unsupported';
    const LazyLoadedEvent = 'inlinejs.lazy.loaded';

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
                    region.GetChanges().AddGetAccess(`${path}.${key}`);
                    return info[key];
                });
            };

            let setLocalValue = (key: string, value: boolean, initial: boolean) => {
                let myRegion = Region.Get(regionId);
                let parentState = myRegion.GetLocal(myRegion.GetElementAncestor(element, 0), '$state', false);
                
                info[key] = value;
                if (!parentState || !('parent' in parentState)){
                    myRegion.GetChanges().Add({
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
            Object.keys(info).forEach(key => addLocalKey(locals, key));

            locals['reset'] = () => {
                if (info.isDirty){
                    setLocalValue('isDirty', false, false);
                }

                if ((element as HTMLInputElement).checkValidity() != info.isValid){
                    setLocalValue('isValid', !info.isValid, false);
                }
            };

            let getDirective = (): Directive => {
                return {
                    original: '',
                    parts: null,
                    raw: '',
                    key: '',
                    value: `{delay:${delay},lazy:${lazy}}`
                };
            };
            
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
            }
            
            region.AddLocal(element, '$state', locals);
            return DirectiveHandlerReturn.Handled;
        }

        public static AddAll(){
            DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);

            Region.AddGlobal('$gstate', (regionId: string) => {
                let getValue = (target: HTMLElement, key: string) => {
                    let region = (Region.Infer(target) || Region.Get(regionId));
                    let state = region.GetLocal(target, '$state', false);
                    return ((state && key in state) ? state[key] : null);
                };
                
                return {
                    isDirty: (target: HTMLElement) => getValue(target, 'isDirty'),
                    isTyping: (target: HTMLElement) => getValue(target, 'isTyping'),
                    isValid: (target: HTMLElement) => getValue(target, 'isValid'),
                    reset: (target: HTMLElement) => {
                        let region = (Region.Infer(target) || Region.Get(regionId));
                        let state = region.GetLocal(target, '$state', false);
                        if (state){
                            state.reset();
                        }
                    }
                };
            });
        }
    }

    (function(){
        ExtendedDirectiveHandlers.AddAll();
    })();
}
