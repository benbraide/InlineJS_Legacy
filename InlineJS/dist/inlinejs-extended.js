"use strict";
var InlineJS;
(function (InlineJS) {
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
                    region.GetChanges().AddGetAccess(`${path}.${key}`);
                    return info[key];
                });
            };
            let setLocalValue = (key, value, initial) => {
                let myRegion = InlineJS.Region.Get(regionId);
                let parentState = myRegion.GetLocal(myRegion.GetElementAncestor(element, 0), '$state', false);
                info[key] = value;
                if (!parentState || !('parent' in parentState)) {
                    myRegion.GetChanges().Add({
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
            Object.keys(info).forEach(key => addLocalKey(locals, key));
            locals['reset'] = () => {
                if (info.isDirty) {
                    setLocalValue('isDirty', false, false);
                }
                if (element.checkValidity() != info.isValid) {
                    setLocalValue('isValid', !info.isValid, false);
                }
            };
            let getDirective = () => {
                return {
                    original: '',
                    parts: null,
                    raw: '',
                    key: '',
                    value: `{delay:${delay},lazy:${lazy}}`
                };
            };
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
            }
            region.AddLocal(element, '$state', locals);
            return InlineJS.DirectiveHandlerReturn.Handled;
        }
        static AddAll() {
            InlineJS.DirectiveHandlerManager.AddHandler('state', ExtendedDirectiveHandlers.State);
            InlineJS.Region.AddGlobal('$gstate', (regionId) => {
                let getValue = (target, key) => {
                    let region = (InlineJS.Region.Infer(target) || InlineJS.Region.Get(regionId));
                    let state = region.GetLocal(target, '$state', false);
                    return ((state && key in state) ? state[key] : null);
                };
                return {
                    isDirty: (target) => getValue(target, 'isDirty'),
                    isTyping: (target) => getValue(target, 'isTyping'),
                    isValid: (target) => getValue(target, 'isValid'),
                    reset: (target) => {
                        let region = (InlineJS.Region.Infer(target) || InlineJS.Region.Get(regionId));
                        let state = region.GetLocal(target, '$state', false);
                        if (state) {
                            state.reset();
                        }
                    }
                };
            });
        }
    }
    ExtendedDirectiveHandlers.stateId_ = 0;
    InlineJS.ExtendedDirectiveHandlers = ExtendedDirectiveHandlers;
    (function () {
        ExtendedDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
