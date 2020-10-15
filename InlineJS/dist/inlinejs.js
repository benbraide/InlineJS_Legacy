"use strict";
var InlineJS;
(function (InlineJS) {
    class Stack {
        constructor() {
            this.list_ = new Array();
        }
        Push(value) {
            this.list_.push(value);
        }
        Pop() {
            return this.list_.pop();
        }
        Peek() {
            return ((this.list_.length == 0) ? null : this.list_[this.list_.length - 1]);
        }
        IsEmpty() {
            return (this.list_.length == 0);
        }
    }
    InlineJS.Stack = Stack;
    class NoResult {
    }
    InlineJS.NoResult = NoResult;
    class Value {
        constructor(callback_) {
            this.callback_ = callback_;
        }
        Get() {
            return this.callback_();
        }
    }
    InlineJS.Value = Value;
    class RegionMap {
    }
    RegionMap.entries = new Map();
    RegionMap.scopeRegionIds = new Stack();
    InlineJS.RegionMap = RegionMap;
    class RootElement {
    }
    InlineJS.RootElement = RootElement;
    ;
    class Region {
        constructor(id_, rootElement_, rootProxy_) {
            this.id_ = id_;
            this.rootElement_ = rootElement_;
            this.rootProxy_ = rootProxy_;
            this.componentKey_ = '';
            this.doneInit_ = false;
            this.elementScopes_ = new Map();
            this.lastElementId_ = null;
            this.proxies_ = new Map();
            this.refs_ = new Map();
            this.observer_ = null;
            this.outsideEvents_ = new Array();
            this.nextTickCallbacks_ = new Array();
            this.tempCallbacks_ = new Map();
            this.tempCallbacksId_ = 0;
            this.enableOptimizedBinds_ = true;
            this.state_ = new State(this.id_);
            this.changes_ = new Changes(this.id_);
            this.enableOptimizedBinds_ = Region.enableOptimizedBinds;
        }
        SetDoneInit() {
            this.doneInit_ = true;
        }
        GetDoneInit() {
            return this.doneInit_;
        }
        GetId() {
            return this.id_;
        }
        GetRootElement() {
            return this.rootElement_;
        }
        GetElementAncestor(target, index) {
            let resolvedTarget = ((target === true) ? this.state_.GetElementContext() : target);
            if (!resolvedTarget || resolvedTarget === this.rootElement_) {
                return null;
            }
            let ancestor = resolvedTarget;
            for (; 0 <= index && ancestor && ancestor !== this.rootElement_; --index) {
                ancestor = ancestor.parentElement;
            }
            return ((0 <= index) ? null : ancestor);
        }
        GetElementScope(element) {
            let key;
            if (typeof element === 'string') {
                key = element;
            }
            else if (element === true) {
                key = this.state_.GetElementContext().getAttribute(Region.GetElementKeyName());
            }
            else if (element instanceof RootElement) {
                key = this.rootElement_.getAttribute(Region.GetElementKeyName());
            }
            else if (element) { //HTMLElement
                key = element.getAttribute(Region.GetElementKeyName());
            }
            return ((key && key in this.elementScopes_) ? this.elementScopes_[key] : null);
        }
        GetElement(element) {
            if (typeof element !== 'string') {
                return element;
            }
            let scope = this.GetElementScope(element);
            return (scope ? scope.element : null);
        }
        GetState() {
            return this.state_;
        }
        GetChanges() {
            return this.changes_;
        }
        GeRootProxy() {
            return this.rootProxy_;
        }
        FindProxy(path) {
            if (path === this.rootProxy_.GetName()) {
                return this.rootProxy_;
            }
            return ((path in this.proxies_) ? this.proxies_[path] : null);
        }
        AddProxy(proxy) {
            this.proxies_[proxy.GetPath()] = proxy;
        }
        RemoveProxy(path) {
            delete this.proxies_[path];
        }
        AddRef(key, element) {
            this.refs_[key] = element;
        }
        GetRefs() {
            return this.refs_;
        }
        AddElement(element, check = true) {
            if (check) { //Check for existing
                let scope = this.GetElementScope(element);
                if (scope) {
                    return scope;
                }
            }
            if (!element || (element !== this.rootElement_ && !this.rootElement_.contains(element))) {
                return null;
            }
            let id;
            if (this.lastElementId_ === null) {
                id = (this.lastElementId_ = 0);
            }
            else {
                id = ++this.lastElementId_;
            }
            let key = `${this.id_}.${id}`;
            this.elementScopes_[key] = {
                key: key,
                element: element,
                locals: new Map(),
                uninitCallbacks: new Array(),
                changeRefs: new Array(),
                directiveHandlers: new Map(),
                preProcessCallbacks: new Array(),
                postProcessCallbacks: new Array(),
                eventExpansionCallbacks: new Array(),
                outsideEventCallbacks: new Map(),
                attributeChangeCallbacks: new Array(),
                intersectionObservers: new Map(),
                falseIfCondition: null,
                preserve: false,
                paused: false
            };
            element.setAttribute(Region.GetElementKeyName(), key);
            return this.elementScopes_[key];
        }
        RemoveElement(element, preserve = false) {
            let scope = this.GetElementScope(element);
            if (scope) {
                if (scope.paused) { //Paused removal
                    scope.paused = false;
                    return;
                }
                scope.uninitCallbacks.forEach((callback) => {
                    try {
                        callback();
                    }
                    catch (err) {
                        this.state_.ReportError(err, `InlineJs.Region<${this.id_}>.$uninit`);
                    }
                });
                if (!preserve && !scope.preserve) {
                    scope.changeRefs.forEach((info) => {
                        let region = Region.Get(info.regionId);
                        if (region) {
                            region.changes_.Unsubscribe(info.subscriptionId);
                        }
                    });
                    scope.element.removeAttribute(Region.GetElementKeyName());
                    Object.keys(scope.intersectionObservers).forEach(key => scope.intersectionObservers[key].unobserve(scope.element));
                }
                else {
                    scope.preserve = !(preserve = true);
                }
                [...scope.element.children].forEach(child => this.RemoveElement(child, preserve));
                if (!preserve) { //Delete scope
                    delete this.elementScopes_[scope.key];
                }
            }
            else if (typeof element !== 'string') {
                [...element.children].forEach(child => this.RemoveElement(child, preserve));
            }
            if (!preserve && element === this.rootElement_) { //Remove from map
                this.AddNextTickCallback(() => {
                    if (this.componentKey_ in Region.components_) {
                        delete Region.components_[this.componentKey_];
                    }
                    delete RegionMap.entries[this.id_];
                });
            }
        }
        AddOutsideEventCallback(element, event, callback) {
            let scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true)), id = this.id_;
            if (!scope) {
                return;
            }
            if (!(event in scope.outsideEventCallbacks)) {
                scope.outsideEventCallbacks[event] = new Array();
            }
            scope.outsideEventCallbacks[event].push(callback);
            if (this.outsideEvents_.indexOf(event) == -1) {
                this.outsideEvents_.push(event);
                document.body.addEventListener(event, (e) => {
                    let myRegion = Region.Get(id);
                    if (myRegion) {
                        Object.keys(myRegion.elementScopes_).forEach((key) => {
                            let scope = myRegion.elementScopes_[key];
                            if (e.target !== scope.element && e.type in scope.outsideEventCallbacks && !scope.element.contains(e.target)) {
                                scope.outsideEventCallbacks[e.type].forEach(callback => callback(e));
                            }
                        });
                    }
                }, true);
            }
        }
        RemoveOutsideEventCallback(element, event, callback) {
            let scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true)), id = this.id_;
            if (!scope || !(event in scope.outsideEventCallbacks)) {
                return;
            }
            let list = scope.outsideEventCallbacks[event];
            for (let i = 0; i < list.length; ++i) {
                if (list[i] === callback) {
                    list.splice(i, 1);
                    break;
                }
            }
        }
        AddNextTickCallback(callback) {
            this.nextTickCallbacks_.push(callback);
            this.changes_.Schedule();
        }
        ExecuteNextTick() {
            if (this.nextTickCallbacks_.length == 0) {
                return;
            }
            let callbacks = this.nextTickCallbacks_;
            let proxy = this.rootProxy_.GetNativeProxy();
            this.nextTickCallbacks_ = new Array();
            callbacks.forEach((callback) => {
                try {
                    callback.call(proxy);
                }
                catch (err) {
                    this.state_.ReportError(err, `InlineJs.Region<${this.id_}>.$nextTick`);
                }
            });
        }
        AddLocal(element, key, value) {
            let scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true));
            if (scope) {
                scope.locals = (scope.locals || new Map());
                scope.locals[key] = value;
            }
        }
        GetLocal(element, key, bubble = true) {
            let scope = this.GetElementScope(element);
            if (scope && key in scope.locals) {
                return scope.locals[key];
            }
            if (!bubble || typeof element === 'string') {
                return new NoResult();
            }
            for (let ancestor = this.GetElementAncestor(element, 0); ancestor; ancestor = this.GetElementAncestor(ancestor, 0)) {
                scope = this.GetElementScope(ancestor);
                if (scope && key in scope.locals) {
                    return scope.locals[key];
                }
            }
            return new NoResult();
        }
        SetObserver(observer) {
            this.observer_ = observer;
        }
        GetObserver() {
            return this.observer_;
        }
        ExpandEvent(event, element) {
            let scope = this.GetElementScope(element);
            if (!scope) {
                return event;
            }
            for (let i = 0; i < scope.eventExpansionCallbacks.length; ++i) {
                let expanded = scope.eventExpansionCallbacks[i](event);
                if (expanded !== null) {
                    return expanded;
                }
            }
            return event;
        }
        Call(target, ...args) {
            return ((target.name in this.rootProxy_.GetTarget()) ? target.call(this.rootProxy_.GetNativeProxy(), ...args) : target(...args));
        }
        AddTemp(callback) {
            let key = `Region<${this.id_}>.temp<${++this.tempCallbacksId_}>`;
            this.tempCallbacks_[key] = callback;
            return key;
        }
        CallTemp(key) {
            if (!(key in this.tempCallbacks_)) {
                return null;
            }
            let callback = this.tempCallbacks_[key];
            delete this.tempCallbacks_[key];
            return callback();
        }
        SetOptimizedBindsState(enabled) {
            this.enableOptimizedBinds_ = enabled;
        }
        OptimizedBindsIsEnabled() {
            return this.enableOptimizedBinds_;
        }
        static Get(id) {
            return ((id in RegionMap.entries) ? RegionMap.entries[id] : null);
        }
        static GetCurrent(id) {
            let scopeRegionId = RegionMap.scopeRegionIds.Peek();
            return (scopeRegionId ? Region.Get(scopeRegionId) : Region.Get(id));
        }
        static Infer(element) {
            if (!element) {
                return null;
            }
            let key = ((typeof element === 'string') ? element : element.getAttribute(Region.GetElementKeyName()));
            if (!key) {
                return null;
            }
            return Region.Get(key.split('.')[0]);
        }
        static AddComponent(region, element, key) {
            if (!key || region.rootElement_ !== element || region.componentKey_ || key in Region.components_) {
                return false;
            }
            region.componentKey_ = key;
            Region.components_[key] = region.GetId();
            return true;
        }
        static Find(key, getNativeProxy) {
            if (!(key in Region.components_)) {
                return null;
            }
            let region = Region.Get(Region.components_[key]);
            return (region ? (getNativeProxy ? region.rootProxy_.GetNativeProxy() : region) : null);
        }
        static AddGlobal(key, callback) {
            Region.globals_[key] = callback;
        }
        static RemoveGlobal(key) {
            delete Region.globals_[key];
        }
        static GetGlobal(key) {
            return ((key in Region.globals_) ? Region.globals_[key] : null);
        }
        static AddPostProcessCallback(callback) {
            Region.postProcessCallbacks_.push(callback);
        }
        static ExecutePostProcessCallbacks() {
            if (Region.postProcessCallbacks_.length == 0) {
                return;
            }
            Region.postProcessCallbacks_.forEach((callback) => {
                try {
                    callback();
                }
                catch (err) {
                    console.error(err, `InlineJs.Region<NIL>.ExecutePostProcessCallbacks`);
                }
            });
            Region.postProcessCallbacks_ = [];
        }
        static SetDirectivePrefix(value) {
            Region.directivePrfix = value;
            Region.directiveRegex = new RegExp(`^(data-)?${value}-(.+)$`);
        }
        static IsEqual(first, second) {
            if ('__InlineJS_Target__' in first) { //Get underlying object
                first = first['__InlineJS_Target__'];
            }
            if ('__InlineJS_Target__' in second) { //Get underlying object
                second = second['__InlineJS_Target__'];
            }
            if (Region.externalCallbacks.isEqual) {
                return Region.externalCallbacks.isEqual(first, second);
            }
            if (!first != !second || typeof first !== typeof second) {
                return false;
            }
            if (!first || typeof first !== 'object') {
                return (first == second);
            }
            if (Array.isArray(first)) {
                if (!Array.isArray(second) || first.length != second.length) {
                    return false;
                }
                for (let i = 0; i < first.length; ++i) {
                    if (!Region.IsEqual(first[i], second[i])) {
                        return false;
                    }
                }
                return true;
            }
            if (!Region.IsObject(first) || !Region.IsObject(second)) {
                return (first === second);
            }
            if (Object.keys(first).length != Object.keys(second).length) {
                return false;
            }
            for (let key in first) {
                if (!(key in second) || !Region.IsEqual(first[key], second[key])) {
                    return false;
                }
            }
            return true;
        }
        static DeepCopy(target) {
            if ('__InlineJS_Target__' in target) { //Get underlying object
                target = target['__InlineJS_Target__'];
            }
            if (Region.externalCallbacks.deepCopy) {
                return Region.externalCallbacks.deepCopy(target);
            }
            if (!target || typeof target !== 'object') {
                return target;
            }
            if (Array.isArray(target)) {
                let copy = [];
                target.forEach(item => copy.push(Region.DeepCopy(item)));
                return copy;
            }
            if (!Region.IsObject(target)) {
                return target;
            }
            let copy = {};
            for (let key in target) {
                copy[key] = Region.DeepCopy(target[key]);
            }
            return copy;
        }
        static GetElementKeyName() {
            return '__inlinejs_key__';
        }
        static IsObject(target) {
            return (target !== null && typeof target === 'object' && (('__InlineJS_Target__' in target) || target.__proto__.constructor.name === 'Object'));
        }
    }
    Region.components_ = new Map();
    Region.globals_ = new Map();
    Region.postProcessCallbacks_ = new Array();
    Region.enableOptimizedBinds = true;
    Region.directivePrfix = 'x';
    Region.directiveRegex = /^(data-)?x-(.+)$/;
    Region.externalCallbacks = {
        isEqual: (first, second) => (first === second),
        deepCopy: (target) => target,
    };
    Region.keyMap = {
        meta: 'Meta',
        alt: 'Alt',
        ctrl: 'Control',
        shift: 'Shift',
        enter: 'Enter',
        esc: 'Escape',
        tab: 'Tab',
        space: ' ',
        menu: 'ContextMenu',
        backspace: 'Backspace',
        del: 'Delete',
        ins: 'Insert',
        home: 'Home',
        end: 'End',
        plus: '+',
        minus: '-',
        star: '*',
        slash: '/',
        'page-up': 'PageUp',
        'page-down': 'PageDown',
        'arrow-left': 'ArrowLeft',
        'arrow-up': 'ArrowUp',
        'arrow-right': 'ArrowRight',
        'arrow-down': 'ArrowDown',
    };
    Region.booleanAttributes = new Array('allowfullscreen', 'allowpaymentrequest', 'async', 'autofocus', 'autoplay', 'checked', 'controls', 'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected');
    InlineJS.Region = Region;
    class Changes {
        constructor(regionId_) {
            this.regionId_ = regionId_;
            this.isScheduled_ = false;
            this.list_ = new Array();
            this.subscriberId_ = null;
            this.subscribers_ = new Map();
            this.getAccessStorages_ = new Stack();
            this.getAccessHooks_ = new Stack();
            this.origins_ = new Stack();
        }
        Schedule() {
            if (this.isScheduled_) {
                return;
            }
            this.isScheduled_ = true;
            setTimeout(() => {
                this.isScheduled_ = false;
                if (0 < this.list_.length) {
                    let list = this.list_, batches = new Array();
                    this.list_ = new Array();
                    list.forEach((item) => {
                        if (item.path in this.subscribers_) {
                            this.subscribers_[item.path].forEach((info) => {
                                if (info.callback !== Changes.GetOrigin(item)) { //Ignore originating callback
                                    Changes.AddBatch(batches, item, info.callback);
                                }
                            });
                        }
                    });
                    batches.forEach(batch => batch.callback(batch.changes));
                }
                let region = Region.Get(this.regionId_);
                if (region) {
                    region.ExecuteNextTick();
                }
            }, 0);
        }
        Add(item) {
            this.list_.push(item);
            this.Schedule();
        }
        Subscribe(path, callback) {
            let id;
            if (this.subscriberId_ === null) {
                id = (this.subscriberId_ = 0);
            }
            else {
                id = ++this.subscriberId_;
            }
            let region = Region.Get(RegionMap.scopeRegionIds.Peek() || this.regionId_);
            if (region) { //Check for a context element
                let contextElement = region.GetState().GetElementContext();
                if (contextElement) { //Add reference
                    let scope = region.AddElement(contextElement, true);
                    if (scope) {
                        scope.changeRefs.push({
                            regionId: region.GetId(),
                            subscriptionId: id
                        });
                    }
                }
            }
            let list = (this.subscribers_[path] = (this.subscribers_[path] || new Array()));
            list.push({
                id: id,
                callback: callback
            });
            return id;
        }
        Unsubscribe(id) {
            for (let path in this.subscribers_) {
                let list = this.subscribers_[path];
                for (let i = list.length; i > 0; --i) {
                    let index = (i - 1);
                    if (list[index].id == id) {
                        list.splice(index, 1);
                    }
                }
            }
        }
        AddGetAccess(path) {
            let region = Region.GetCurrent(this.regionId_);
            if (!region) {
                return;
            }
            let hook = region.GetChanges().getAccessHooks_.Peek();
            if (hook && !hook(region.GetId(), path)) { //Rejected
                return;
            }
            let storageInfo = region.GetChanges().getAccessStorages_.Peek();
            if (!storageInfo || !storageInfo.storage) {
                return;
            }
            if (storageInfo.storage.raw) {
                storageInfo.storage.raw.push({
                    regionId: this.regionId_,
                    path: path
                });
            }
            if (!storageInfo.storage.optimized) {
                return;
            }
            let optimized = storageInfo.storage.optimized;
            if (storageInfo.lastAccessPath && 0 < optimized.length && storageInfo.lastAccessPath.length < path.length && path.substr(0, storageInfo.lastAccessPath.length) === storageInfo.lastAccessPath) { //Deeper access
                optimized[(optimized.length - 1)].path = path;
            }
            else { //New entry
                optimized.push({
                    regionId: this.regionId_,
                    path: path
                });
            }
            storageInfo.lastAccessPath = path;
        }
        ReplaceOptimizedGetAccesses() {
            if (!Region.Get(this.regionId_).OptimizedBindsIsEnabled()) {
                return;
            }
            let info = this.getAccessStorages_.Peek();
            if (info && info.storage && info.storage.raw) {
                info.storage.optimized = new Array();
                info.storage.raw.forEach(item => info.storage.optimized.push(item));
            }
        }
        PushGetAccessStorage(storage) {
            this.getAccessStorages_.Push({
                storage: (storage || {
                    optimized: (Region.Get(this.regionId_).OptimizedBindsIsEnabled() ? new Array() : null),
                    raw: new Array()
                }),
                lastAccessPath: ''
            });
        }
        GetGetAccessStorage(optimized = true) {
            let info = this.getAccessStorages_.Peek();
            return ((info && info.storage) ? (optimized ? (info.storage.optimized || info.storage.raw) : info.storage) : null);
        }
        PopGetAccessStorage(optimized) {
            let info = this.getAccessStorages_.Pop();
            return ((info && info.storage) ? (optimized ? (info.storage.optimized || info.storage.raw) : info.storage) : null);
        }
        PushGetAccessHook(hook) {
            this.getAccessHooks_.Push(hook);
        }
        PopGetAccessHook() {
            return this.getAccessHooks_.Pop();
        }
        PushOrigin(origin) {
            this.origins_.Push(origin);
        }
        GetOrigin() {
            return this.origins_.Peek();
        }
        PopOrigin() {
            return this.origins_.Pop();
        }
        static SetOrigin(change, origin) {
            if ('original' in change) {
                change.original.origin = origin;
            }
            else {
                change.origin = origin;
            }
        }
        static GetOrigin(change) {
            return (('original' in change) ? change.original.origin : change.origin);
        }
        static AddBatch(batches, change, callback) {
            let batch = batches.find(info => (info.callback === callback));
            if (batch) {
                batch.changes.push(change);
            }
            else { //Add new
                batches.push({
                    callback: callback,
                    changes: new Array(change)
                });
            }
        }
    }
    InlineJS.Changes = Changes;
    class State {
        constructor(regionId_) {
            this.regionId_ = regionId_;
            this.elementContext_ = new Stack();
            this.eventContext_ = new Stack();
        }
        PushElementContext(element) {
            this.elementContext_.Push(element);
        }
        PopElementContext() {
            return this.elementContext_.Pop();
        }
        GetElementContext() {
            return this.elementContext_.Peek();
        }
        PushEventContext(Value) {
            this.eventContext_.Push(Value);
        }
        PopEventContext() {
            return this.eventContext_.Pop();
        }
        GetEventContext() {
            return this.eventContext_.Peek();
        }
        TrapGetAccess(callback, changeCallback, staticCallback) {
            let region = Region.Get(this.regionId_), stopped;
            if (!region) {
                return new Map();
            }
            try {
                region.GetChanges().PushGetAccessStorage(null);
                stopped = (callback(null) === false);
            }
            catch (err) {
                this.ReportError(err, `InlineJs.Region<${this.regionId_}>.State.TrapAccess`);
            }
            let storage = region.GetChanges().PopGetAccessStorage(true);
            if (stopped || !changeCallback || storage.length == 0) { //Not reactive
                if (staticCallback) {
                    staticCallback();
                }
                return new Map();
            }
            let ids = new Map();
            let onChange = (changes) => {
                let myRegion = Region.Get(this.regionId_);
                if (myRegion) { //Mark changes
                    myRegion.GetChanges().PushOrigin(onChange);
                }
                try {
                    if (changeCallback === true) {
                        stopped = (callback(changes) === false);
                    }
                    else {
                        stopped = (changeCallback(changes) === false);
                    }
                }
                catch (err) {
                    this.ReportError(err, `InlineJs.Region<${this.regionId_}>.State.TrapAccess`);
                }
                if (myRegion) {
                    myRegion.GetChanges().PopOrigin();
                }
                if (stopped) { //Unsubscribe all subscribed
                    for (let regionId in ids) {
                        let myRegion = Region.Get(regionId);
                        if (!myRegion) {
                            continue;
                        }
                        let changes = myRegion.GetChanges();
                        ids[regionId].forEach(id => changes.Unsubscribe(id));
                    }
                }
            };
            let uniqueEntries = new Map();
            storage.forEach(info => uniqueEntries[info.path] = info.regionId);
            for (let path in uniqueEntries) {
                let targetRegion = Region.Get(uniqueEntries[path]);
                if (targetRegion) {
                    (ids[targetRegion.GetId()] = (ids[targetRegion.GetId()] || new Array())).push(targetRegion.GetChanges().Subscribe(path, onChange));
                }
            }
            return ids;
        }
        ReportError(value, ref) {
            console.error(value, ref);
        }
        Warn(value, ref) {
            console.warn(value, ref);
        }
        Log(value, ref) {
            console.log(value, ref);
        }
    }
    InlineJS.State = State;
    class Evaluator {
        static Evaluate(regionId, elementContext, expression, useWindow = false) {
            if (!(expression = expression.trim())) {
                return null;
            }
            let region = Region.Get(regionId);
            if (!region) {
                return null;
            }
            let result;
            let state = region.GetState();
            RegionMap.scopeRegionIds.Push(regionId);
            state.PushElementContext(region.GetElement(elementContext));
            try {
                result = (new Function(Evaluator.GetContextKey(), `
                    with (${Evaluator.GetContextKey()}){
                        return (${expression});
                    };
                `)).bind(state.GetElementContext())(useWindow ? window : region.GeRootProxy().GetNativeProxy());
            }
            catch (err) {
                result = null;
                let element = state.GetElementContext();
                let elementId = element.getAttribute(Region.GetElementKeyName());
                state.ReportError(err, `InlineJs.Region<${regionId}>.Evaluator.Evaluate(Element#${elementId}, ${expression})`);
            }
            state.PopElementContext();
            RegionMap.scopeRegionIds.Pop();
            return result;
        }
        static GetContextKey() {
            return '__InlineJS_Context__';
        }
    }
    InlineJS.Evaluator = Evaluator;
    function CreateChildProxy(owner, name, target) {
        if (!owner) {
            return null;
        }
        let ownerProxies = owner.GetProxies();
        if (name in ownerProxies && name !== 'constructor' && name !== 'proto') {
            return ownerProxies[name];
        }
        if (!Array.isArray(target) && !Region.IsObject(target)) {
            return null;
        }
        let childProxy = new ChildProxy(owner.GetRegionId(), owner.GetPath(), name, target);
        owner.AddChild(childProxy);
        return childProxy;
    }
    function ProxyGetter(target, prop, regionId, parentPath, name, callback) {
        let path = (parentPath ? `${parentPath}.${name}` : name);
        if (prop === '__InlineJS_RegionId__') {
            return regionId;
        }
        if (prop === '__InlineJS_Name__') {
            return name;
        }
        if (prop === '__InlineJS_Path__') {
            return path;
        }
        if (prop === '__InlineJS_ParentPath__') {
            return parentPath;
        }
        if (prop === '__InlineJS_Target__') {
            return (('__InlineJS_Target__' in target) ? target['__InlineJS_Target__'] : target);
        }
        let exists = (prop in target);
        if (!exists && callback) {
            let result = callback();
            if (!(result instanceof NoResult)) {
                return result;
            }
        }
        let actualValue = (exists ? target[prop] : null);
        if (actualValue instanceof Value) {
            return actualValue.Get();
        }
        let region = Region.Get(regionId);
        if (region) {
            if (prop.substr(0, 1) !== '$') {
                region.GetChanges().AddGetAccess(`${path}.${prop}`);
            }
            let value = CreateChildProxy(region.FindProxy(path), prop, actualValue);
            if (value) {
                return value.GetNativeProxy();
            }
        }
        return actualValue;
    }
    function AddChanges(changes, type, path, prop) {
        if (!changes) {
            return;
        }
        let change = {
            type: type,
            path: path,
            prop: prop,
            origin: changes.GetOrigin()
        };
        changes.Add(change);
        let parts = path.split('.');
        while (parts.length > 2) { //Skip root
            parts.pop();
            changes.Add({
                original: change,
                path: parts.join('.')
            });
        }
    }
    function ProxySetter(target, prop, value, regionId, parentPath, name, callback) {
        let exists = (prop in target);
        if (!exists && callback && callback()) {
            return true;
        }
        let path = (parentPath ? `${parentPath}.${name}` : name);
        let region = Region.Get(regionId);
        if (region) {
            let proxy = region.FindProxy(path);
            if (proxy) {
                proxy.RemoveChild(prop);
            }
            AddChanges(region.GetChanges(), 'set', `${path}.${prop}`, prop);
        }
        target[prop] = value;
        return true;
    }
    function ProxyDeleter(target, prop, regionId, parentPath, name, callback) {
        let exists = (prop in target);
        if (!exists) {
            return (callback && callback());
        }
        let path = (parentPath ? `${parentPath}.${name}` : name);
        let region = Region.Get(regionId);
        if (region) {
            let proxy = region.FindProxy(path);
            if (proxy) {
                proxy.RemoveChild(prop);
            }
            AddChanges(region.GetChanges(), 'delete', path, prop);
        }
        delete target[prop];
        return true;
    }
    class RootProxy {
        constructor(regionId_, target_) {
            this.regionId_ = regionId_;
            this.target_ = target_;
            this.proxies_ = new Map();
            let regionId = this.regionId_, name = this.GetPath();
            let handler = {
                get(target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    let stringProp = prop.toString();
                    return ProxyGetter(target, stringProp, regionId, null, name, () => {
                        let region = Region.Get(regionId);
                        if (!region) {
                            return new NoResult();
                        }
                        let contextElement = region.GetState().GetElementContext();
                        let local = region.GetLocal(contextElement, stringProp);
                        if (!(local instanceof NoResult)) { //Local found
                            return ((local instanceof Value) ? local.Get() : local);
                        }
                        let global = Region.GetGlobal(stringProp);
                        if (global) {
                            let result = global(regionId, contextElement);
                            if (!(result instanceof NoResult)) { //Local found
                                return ((result instanceof Value) ? result.Get() : result);
                            }
                        }
                        return new NoResult();
                    });
                },
                set(target, prop, value) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.set(target, prop, value);
                    }
                    return ProxySetter(target, prop.toString(), value, regionId, null, name, () => {
                        return false;
                    });
                },
                deleteProperty(target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return ProxyDeleter(target, prop.toString(), regionId, null, name, () => {
                        return false;
                    });
                },
                has(target, prop) {
                    return (typeof prop !== 'symbol' || Reflect.has(target, prop));
                },
            };
            this.nativeProxy_ = new window.Proxy(this.target_, handler);
        }
        IsRoot() {
            return true;
        }
        GetRegionId() {
            return this.regionId_;
        }
        GetTarget() {
            return this.target_;
        }
        GetNativeProxy() {
            return this.nativeProxy_;
        }
        GetName() {
            return `Proxy<${this.regionId_}>`;
        }
        GetPath() {
            return this.GetName();
        }
        GetParentPath() {
            return '';
        }
        AddChild(child) {
            this.proxies_[child.GetName()] = child;
            let region = Region.Get(this.regionId_);
            if (region) {
                region.AddProxy(child);
            }
        }
        RemoveChild(name) {
            delete this.proxies_[name];
            let region = Region.Get(this.regionId_);
            if (region) {
                region.RemoveProxy(`${this.GetPath()}.${name}`);
            }
        }
        GetProxies() {
            return this.proxies_;
        }
        static Watch(regionId, elementContext, expression, callback, skipFirst) {
            let region = Region.Get(regionId);
            if (!region) {
                return;
            }
            let previousValue;
            let onChange = () => {
                let value = Evaluator.Evaluate(regionId, elementContext, expression);
                if (Region.externalCallbacks.isEqual(value, previousValue)) {
                    return true;
                }
                previousValue = Region.externalCallbacks.deepCopy(value);
                return callback(value);
            };
            region.GetState().TrapGetAccess(() => {
                let value = Evaluator.Evaluate(regionId, elementContext, expression);
                previousValue = Region.externalCallbacks.deepCopy(value);
                return (skipFirst || callback(value));
            }, onChange);
        }
        static AddGlobalCallbacks() {
            Region.AddGlobal('$window', () => window);
            Region.AddGlobal('$document', () => document);
            Region.AddGlobal('$console', () => console);
            Region.AddGlobal('$alert', () => window.alert.bind(window));
            Region.AddGlobal('$event', (regionId) => Region.Get(regionId).GetState().GetEventContext());
            Region.AddGlobal('$expandEvent', (regionId) => (event, target) => Region.Get(regionId).ExpandEvent(event, (target || true)));
            Region.AddGlobal('$dispatchEvent', (regionId, contextElement) => (event, nextCycle = true, target) => {
                let resolvedTarget = (target || contextElement);
                let resolvedEvent = ((typeof event === 'string') ? new CustomEvent(Region.Get(regionId).ExpandEvent(event, resolvedTarget)) : event);
                if (nextCycle) {
                    setTimeout(() => resolvedTarget.dispatchEvent(resolvedEvent), 0);
                }
                else {
                    resolvedTarget.dispatchEvent(resolvedEvent);
                }
            });
            Region.AddGlobal('$refs', (regionId) => Region.Get(regionId).GetRefs());
            Region.AddGlobal('$self', (regionId) => Region.Get(regionId).GetState().GetElementContext());
            Region.AddGlobal('$root', (regionId) => Region.Get(regionId).GetRootElement());
            Region.AddGlobal('$parent', (regionId) => Region.Get(regionId).GetElementAncestor(true, 0));
            Region.AddGlobal('$getAncestor', (regionId) => (index) => Region.Get(regionId).GetElementAncestor(true, index));
            Region.AddGlobal('$component', () => (id) => Region.Find(id, true));
            Region.AddGlobal('$locals', (regionId) => Region.Get(regionId).GetElementScope(true).locals);
            Region.AddGlobal('$getLocals', (regionId) => (element) => Region.Get(regionId).AddElement(element).locals);
            Region.AddGlobal('$watch', (regionId, contextElement) => (expression, callback) => {
                RootProxy.Watch(regionId, contextElement, expression, value => callback.call(Region.Get(regionId).GeRootProxy().GetNativeProxy(), value), true);
            });
            Region.AddGlobal('$when', (regionId, contextElement) => (expression, callback) => {
                RootProxy.Watch(regionId, contextElement, expression, value => (!value || callback.call(Region.Get(regionId).GeRootProxy().GetNativeProxy(), value)), false);
            });
            Region.AddGlobal('$once', (regionId, contextElement) => (expression, callback) => {
                RootProxy.Watch(regionId, contextElement, expression, value => (!value || (callback.call(Region.Get(regionId).GeRootProxy().GetNativeProxy(), value) && false)), false);
            });
            Region.AddGlobal('$nextTick', (regionId) => (callback) => {
                let region = Region.Get(regionId);
                if (region) {
                    region.AddNextTickCallback(callback);
                }
            });
            Region.AddGlobal('$post', () => (callback) => {
                Region.AddPostProcessCallback(callback);
            });
            Region.AddGlobal('$use', (regionId) => (value) => {
                let region = Region.GetCurrent(regionId);
                if (region) {
                    region.GetChanges().ReplaceOptimizedGetAccesses();
                }
                return value;
            });
            Region.AddGlobal('$__InlineJS_CallTemp__', (regionId) => (key) => {
                let region = Region.Get(regionId);
                return (region ? region.CallTemp(key) : null);
            });
        }
    }
    InlineJS.RootProxy = RootProxy;
    class ChildProxy {
        constructor(regionId_, parentPath_, name_, target_) {
            this.regionId_ = regionId_;
            this.parentPath_ = parentPath_;
            this.name_ = name_;
            this.target_ = target_;
            this.proxies_ = new Map();
            let regionId = this.regionId_, parentPath = this.parentPath_, name = this.name_;
            let handler = {
                get(target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    if ('__InlineJS_Target__' in target) {
                        return target[prop];
                    }
                    return ProxyGetter(target, prop.toString(), regionId, parentPath, name);
                },
                set(target, prop, value) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.set(target, prop, value);
                    }
                    return ProxySetter(target, prop.toString(), value, regionId, parentPath, name);
                },
                deleteProperty(target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return ProxyDeleter(target, prop.toString(), regionId, parentPath, name);
                },
                has(target, prop) {
                    return (typeof prop !== 'symbol' || Reflect.has(target, prop));
                },
            };
            this.nativeProxy_ = new window.Proxy(this.target_, handler);
            Region.Get(this.regionId_).AddProxy(this);
        }
        IsRoot() {
            return false;
        }
        GetRegionId() {
            return this.regionId_;
        }
        GetTarget() {
            return this.target_;
        }
        GetNativeProxy() {
            return this.nativeProxy_;
        }
        GetName() {
            return this.name_;
        }
        GetPath() {
            return `${this.parentPath_}.${this.name_}`;
        }
        GetParentPath() {
            return this.parentPath_;
        }
        AddChild(child) {
            this.proxies_[child.GetName()] = child;
            let region = Region.Get(this.regionId_);
            if (region) {
                region.AddProxy(child);
            }
        }
        RemoveChild(name) {
            delete this.proxies_[name];
            let region = Region.Get(this.regionId_);
            if (region) {
                region.RemoveProxy(`${this.GetPath()}.${name}`);
            }
        }
        GetProxies() {
            return this.proxies_;
        }
    }
    InlineJS.ChildProxy = ChildProxy;
    let DirectiveHandlerReturn;
    (function (DirectiveHandlerReturn) {
        DirectiveHandlerReturn[DirectiveHandlerReturn["Nil"] = 0] = "Nil";
        DirectiveHandlerReturn[DirectiveHandlerReturn["Handled"] = 1] = "Handled";
        DirectiveHandlerReturn[DirectiveHandlerReturn["Rejected"] = 2] = "Rejected";
        DirectiveHandlerReturn[DirectiveHandlerReturn["QuitAll"] = 3] = "QuitAll";
    })(DirectiveHandlerReturn = InlineJS.DirectiveHandlerReturn || (InlineJS.DirectiveHandlerReturn = {}));
    class DirectiveHandlerManager {
        static AddHandler(key, handler) {
            DirectiveHandlerManager.directiveHandlers_[key] = handler;
        }
        static RemoveHandler(key) {
            delete DirectiveHandlerManager.directiveHandlers_[key];
        }
        static GetHandler(key) {
            return ((key in DirectiveHandlerManager.directiveHandlers_) ? DirectiveHandlerManager.directiveHandlers_[key] : null);
        }
        static AddBulkHandler(handler) {
            DirectiveHandlerManager.bulkDirectiveHandlers_.push(handler);
        }
        static Handle(region, element, directive) {
            if (!directive) {
                return DirectiveHandlerReturn.Nil;
            }
            let scope = region.AddElement(element, true);
            if (scope && directive.key in scope.directiveHandlers) {
                let result = scope.directiveHandlers[directive.key](region, element, directive);
                if (result != DirectiveHandlerReturn.Nil) { //Handled
                    return result;
                }
            }
            if (directive.key in DirectiveHandlerManager.directiveHandlers_) {
                let result = DirectiveHandlerManager.directiveHandlers_[directive.key](region, element, directive);
                if (result != DirectiveHandlerReturn.Nil) { //Handled
                    return result;
                }
            }
            for (let i = DirectiveHandlerManager.bulkDirectiveHandlers_.length; i > 0; --i) {
                let result = DirectiveHandlerManager.bulkDirectiveHandlers_[(i - 1)](region, element, directive);
                if (result != DirectiveHandlerReturn.Nil) { //Handled
                    return result;
                }
            }
            return DirectiveHandlerReturn.Nil;
        }
    }
    DirectiveHandlerManager.directiveHandlers_ = new Map();
    DirectiveHandlerManager.bulkDirectiveHandlers_ = new Array();
    InlineJS.DirectiveHandlerManager = DirectiveHandlerManager;
    class CoreDirectiveHandlers {
        static Noop(region, element, directive) {
            return DirectiveHandlerReturn.Handled;
        }
        static Data(region, element, directive) {
            let proxy = region.GeRootProxy().GetNativeProxy();
            let data = CoreDirectiveHandlers.Evaluate(region, element, directive.value, true);
            if (!Region.IsObject(data)) {
                return DirectiveHandlerReturn.Handled;
            }
            let target = proxy['__InlineJS_Target__'];
            for (let key in data) {
                if (key === '$enableOptimizedBinds') {
                    region.SetOptimizedBindsState(!!data[key]);
                }
                else {
                    target[key] = data[key];
                }
            }
            return DirectiveHandlerReturn.Handled;
        }
        static Component(region, element, directive) {
            return (Region.AddComponent(region, element, directive.value) ? DirectiveHandlerReturn.Handled : DirectiveHandlerReturn.Nil);
        }
        static Post(region, element, directive) {
            let regionId = region.GetId();
            region.AddElement(element, true).postProcessCallbacks.push(() => CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            return DirectiveHandlerReturn.Handled;
        }
        static Init(region, element, directive) {
            CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            return DirectiveHandlerReturn.Handled;
        }
        static Bind(region, element, directive) {
            region.GetState().TrapGetAccess(() => {
                CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                return true;
            }, true);
            return DirectiveHandlerReturn.Handled;
        }
        static Static(region, element, directive) {
            if (!directive.arg || !directive.arg.key) {
                return DirectiveHandlerReturn.Nil;
            }
            let getTargetDirective = () => {
                if (directive.arg.options.length == 0) {
                    return `${Region.directivePrfix}-${directive.arg.key}`;
                }
                return `${Region.directivePrfix}-${directive.arg.key}.${directive.arg.options.join('.')}`;
            };
            region.GetChanges().PushGetAccessHook(() => false); //Disable get access log
            let result = DirectiveHandlerManager.Handle(region, element, Processor.GetDirectiveWith(getTargetDirective(), directive.value));
            region.GetChanges().PopGetAccessHook();
            return result;
        }
        static Uninit(region, element, directive) {
            let regionId = region.GetId();
            region.AddElement(element, true).uninitCallbacks.push(() => CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            return DirectiveHandlerReturn.Handled;
        }
        static Ref(region, element, directive) {
            region.AddRef(directive.value, element);
            return DirectiveHandlerReturn.Handled;
        }
        static Attr(region, element, directive) {
            return CoreDirectiveHandlers.InternalAttr(region, element, directive, (key, value) => {
                if (Region.booleanAttributes.indexOf(key) != -1) {
                    if (value) {
                        element.setAttribute(key, key);
                    }
                    else { //Remove attribute
                        element.removeAttribute(key);
                    }
                }
                else if (value === null || value === undefined || value === false) {
                    element.removeAttribute(key);
                }
                else { //Set evaluated value
                    element.setAttribute(key, CoreDirectiveHandlers.ToString(value));
                }
            });
        }
        static Style(region, element, directive) {
            return CoreDirectiveHandlers.InternalAttr(region, element, directive, (key, value) => { element.style[key] = CoreDirectiveHandlers.ToString(value); }, key => (key in element.style));
        }
        static Class(region, element, directive) {
            return CoreDirectiveHandlers.InternalAttr(region, element, directive, (key, value) => {
                key.trim().replace(/\s\s+/g, ' ').split(' ').forEach(item => value ? element.classList.add(item) : element.classList.remove(item));
            }, null, true);
        }
        static InternalAttr(region, element, directive, callback, validator, acceptList = false) {
            let regionId = region.GetId();
            if (!directive.arg || !directive.arg.key) {
                let isList = (acceptList && directive.arg && directive.arg.options.indexOf('list') != -1), list;
                region.GetState().TrapGetAccess(() => {
                    if (isList && list) {
                        list.forEach(item => element.classList.remove(item));
                        list = new Array();
                    }
                    let entries = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                    if (Region.IsObject(entries)) {
                        for (let key in entries) {
                            callback(key, entries[key]);
                        }
                    }
                    else if (isList && Array.isArray(entries)) {
                        (list = entries).forEach(entry => callback(CoreDirectiveHandlers.ToString(entry), true));
                    }
                    else if (isList && entries) {
                        (list = CoreDirectiveHandlers.ToString(entries).trim().replace(/\s\s+/g, ' ').split(' ')).forEach(entry => callback(entry, true));
                    }
                }, true);
                return DirectiveHandlerReturn.Handled;
            }
            if (validator && !validator(directive.arg.key)) {
                return DirectiveHandlerReturn.Nil;
            }
            region.GetState().TrapGetAccess(() => {
                callback(directive.arg.key, CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }, true);
            return DirectiveHandlerReturn.Handled;
        }
        static Text(region, element, directive) {
            return CoreDirectiveHandlers.TextOrHtml(region, element, directive, false);
        }
        static Html(region, element, directive) {
            return CoreDirectiveHandlers.TextOrHtml(region, element, directive, true);
        }
        static TextOrHtml(region, element, directive, isHtml, callback) {
            let onChange;
            let regionId = region.GetId();
            if (isHtml) {
                onChange = () => element.innerHTML = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }
            else if (element.tagName === 'INPUT') {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    onChange = () => element.checked = !!CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                }
                else {
                    onChange = () => element.value = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
                }
            }
            else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                onChange = () => element.value = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }
            else { //Unknown
                onChange = () => element.textContent = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }
            region.GetState().TrapGetAccess(() => {
                if (!callback || callback()) {
                    onChange();
                }
            }, true);
            return DirectiveHandlerReturn.Handled;
        }
        static On(region, element, directive) {
            if (!directive.arg || !directive.arg.key) {
                return DirectiveHandlerReturn.Nil;
            }
            let options = {
                outside: false,
                prevent: false,
                stop: false,
                once: false,
                document: false,
                window: false,
                self: false
            };
            let keyOptions = {
                meta: false,
                alt: false,
                ctrl: false,
                shift: false,
                keys_: null,
            };
            let isKey = (directive.arg.key === 'keydown' || directive.arg.key === 'keyup'), debounce, debounceIsNext = false, isDebounced = false;
            if (isKey) {
                keyOptions.keys_ = new Array();
            }
            directive.arg.options.forEach((option) => {
                if (debounceIsNext) {
                    debounceIsNext = false;
                    let debounceValue = CoreDirectiveHandlers.ExtractDuration(option, null);
                    if (debounceValue !== null) {
                        debounce = debounceValue;
                        return;
                    }
                }
                if (option in options) {
                    options[option] = true;
                }
                else if (option === 'debounce') {
                    debounce = (debounce || 250);
                    debounceIsNext = true;
                }
                else if (isKey && option in keyOptions) {
                    keyOptions[option] = true;
                }
                else if (isKey && option in Region.keyMap) {
                    keyOptions.keys_.push(Region.keyMap[option]);
                }
                else if (isKey) {
                    keyOptions.keys_.push(option);
                }
            });
            let regionId = region.GetId(), stoppable;
            let onEvent = (e) => {
                if (isDebounced) {
                    return;
                }
                if (options.self && !options.outside && e.target !== element) {
                    return;
                }
                if (isKey) {
                    if ((keyOptions.meta && !e.metaKey) || (keyOptions.alt && !e.altKey) || (keyOptions.ctrl && !e.ctrlKey) || (keyOptions.shift && !e.shiftKey)) {
                        return; //Key modifier absent
                    }
                    if (keyOptions.keys_ && 0 < keyOptions.keys_.length && keyOptions.keys_.indexOf(e.key) == -1) {
                        return; //Keys don't match
                    }
                }
                if (debounce) {
                    isDebounced = true;
                    setTimeout(() => { isDebounced = false; }, debounce);
                }
                let myRegion = Region.Get(regionId);
                if (options.once && options.outside) {
                    myRegion.RemoveOutsideEventCallback(element, event, onEvent);
                }
                else if (options.once) {
                    (options.window ? window : element).removeEventListener(event, onEvent);
                }
                if (options.prevent) {
                    e.preventDefault();
                }
                if (stoppable && options.stop) {
                    e.stopPropagation();
                }
                try {
                    if (myRegion) {
                        myRegion.GetState().PushEventContext(e);
                    }
                    CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value);
                }
                finally {
                    if (myRegion) {
                        myRegion.GetState().PopEventContext();
                    }
                }
            };
            let event = region.ExpandEvent(directive.arg.key, element);
            if (!options.outside) {
                stoppable = true;
                if (options.window) {
                    window.addEventListener(event, onEvent);
                }
                else {
                    (options.document ? document : element).addEventListener(event, onEvent);
                }
            }
            else {
                stoppable = false;
                region.AddOutsideEventCallback(element, event, onEvent);
            }
            return DirectiveHandlerReturn.Handled;
        }
        static Model(region, element, directive) {
            var _a;
            let doneInput = false, options = {
                out: false,
                lazy: false,
                number: false
            };
            directive.arg.options.forEach((option) => {
                if (option in options) {
                    options[option] = true;
                }
            });
            if (!options.out) { //Bidirectional
                CoreDirectiveHandlers.TextOrHtml(region, element, directive, false, () => !doneInput);
            }
            let isCheckable = false, isInput = false;
            if (element.tagName === 'INPUT') {
                let type = element.type;
                isCheckable = (type === 'checkbox' || type === 'radio');
                isInput = true;
            }
            let isUnknown = (!isInput && element.tagName !== 'TEXTAREA' && element.tagName !== 'SELECT');
            let convertValue = (value) => {
                if (isCheckable) {
                    return [element.checked, element.checked];
                }
                if (!options.number) {
                    return [`'${value}'`, value];
                }
                try {
                    let parsedValue = parseInt(value);
                    return [parsedValue, parsedValue];
                }
                catch (err) { }
                if (value) {
                    return [`'${value}'`, value];
                }
                return [null, null];
            };
            if (options.out && 'value' in element) { //Initial assignment
                let values = convertValue(element.value);
                CoreDirectiveHandlers.Assign(region, element, directive.value, (_a = values[0]) === null || _a === void 0 ? void 0 : _a.toString(), () => values[1]);
            }
            let onEvent = (e) => {
                var _a;
                if (doneInput) {
                    return;
                }
                if (isUnknown) { //Unpdate inner text
                    element.innerText = e.target.value;
                }
                let values = convertValue(e.target.value);
                CoreDirectiveHandlers.Assign(region, element, directive.value, (_a = values[0]) === null || _a === void 0 ? void 0 : _a.toString(), () => values[1]);
                doneInput = true;
                region.AddNextTickCallback(() => doneInput = false);
            };
            element.addEventListener('change', onEvent);
            if (!options.lazy) {
                element.addEventListener('input', onEvent);
            }
            return DirectiveHandlerReturn.Handled;
        }
        static Show(region, element, directive) {
            let showValue = window.getComputedStyle(element).getPropertyValue('display');
            if (showValue === 'none') {
                showValue = 'block';
            }
            let regionId = region.GetId();
            region.GetState().TrapGetAccess(() => {
                if (CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value)) {
                    element.style.display = showValue;
                }
                else { //Hide
                    element.style.display = 'none';
                }
            }, true);
            return DirectiveHandlerReturn.Handled;
        }
        static If(region, element, directive) {
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original), isInserted = true, ifFirstEntry = true;
            region.GetState().TrapGetAccess(() => {
                let myRegion = Region.Get(info.regionId), scope = myRegion.GetElementScope(info.scopeKey);
                if (!scope.falseIfCondition) {
                    scope.falseIfCondition = new Array();
                }
                if (!isInserted) {
                    scope.paused = true; //Pause removal
                    if (!element.parentElement) {
                        CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, element, info.marker); //Temporarily insert element into DOM
                    }
                    if (CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value)) {
                        isInserted = true;
                        scope.paused = false; //Resume removal
                        CoreDirectiveHandlers.InsertIfOrEach(myRegion, element, info); //Execute directives
                    }
                    else { //Remove from DOM
                        info.parent.removeChild(element);
                    }
                }
                else if (!CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value)) {
                    isInserted = false;
                    scope.preserve = true; //Don't remove scope
                    [...scope.falseIfCondition].forEach(callback => callback());
                    if (!ifFirstEntry) {
                        info.attributes.forEach(attr => element.removeAttribute(attr.name));
                    }
                    if (element.parentElement) {
                        element.parentElement.removeChild(element);
                    }
                }
                else if (ifFirstEntry) { //Execute directives
                    CoreDirectiveHandlers.InsertIfOrEach(region, element, info);
                }
                ifFirstEntry = false;
            }, true, () => { region.GetElementScope(element).preserve = false; });
            if (!isInserted) { //Initial evaluation result is false
                region.RemoveElement(element);
            }
            return DirectiveHandlerReturn.QuitAll;
        }
        static Each(region, element, directive) {
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original), isCount = false, isReverse = false;
            if (directive.arg) {
                isCount = (directive.arg.options.indexOf('count') != -1);
                isReverse = (directive.arg.options.indexOf('reverse') != -1);
            }
            let scope = region.GetElementScope(info.scopeKey), ifConditionIsTrue = true, falseIfCondition = () => {
                ifConditionIsTrue = false;
                empty();
                let myRegion = Region.Get(info.regionId);
                if (options.path) {
                    myRegion.GetChanges().Add({
                        type: 'set',
                        path: options.path,
                        prop: '',
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                }
                let myScope = myRegion.GetElementScope(element);
                if (myScope) {
                    myScope.falseIfCondition.splice(myScope.falseIfCondition.indexOf(falseIfCondition), 1);
                }
            };
            if (scope.falseIfCondition) {
                scope.falseIfCondition.push(falseIfCondition);
            }
            else {
                element.removeAttribute(info.scopeKey);
            }
            let options = {
                isArray: false,
                list: null,
                target: null,
                count: 0,
                path: ''
            };
            let getIndex = (clone, key) => (options.isArray ? options.list.indexOf(clone) : key);
            let initLocals = (myRegion, clone, key) => {
                myRegion.AddLocal(clone, '$each', CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === 'count') {
                        if (options.isArray) {
                            return options.target.length;
                        }
                        if (options.path) {
                            Region.Get(info.regionId).GetChanges().AddGetAccess(`${options.path}.length`);
                        }
                        return options.count;
                    }
                    if (prop === 'index') {
                        return getIndex(clone, key);
                    }
                    if (prop === 'value') {
                        return (options.isArray ? options.target[getIndex(clone)] : options.target[key]);
                    }
                    if (prop === 'parent') {
                        return Region.Get(info.regionId).GetLocal(clone.parentElement, '$each', true);
                    }
                    return null;
                }, ['count', 'index', 'value']));
            };
            let insert = (myRegion, key) => {
                let clone = element.cloneNode(true), offset;
                if (!options.isArray) {
                    offset = Object.keys(options.list).length;
                    if (key in options.list) { //Remove existing
                        info.parent.removeChild(options.list[key]);
                    }
                    options.list[key] = clone;
                }
                else { //Append to array
                    offset = options.list.length;
                    options.list.push(clone);
                }
                CoreDirectiveHandlers.InsertIfOrEach(myRegion, clone, info, () => initLocals(myRegion, clone, key), offset);
            };
            let build = (myRegion) => {
                if (options.isArray) {
                    for (let i = 0; i < options.count; ++i) {
                        insert(myRegion);
                    }
                }
                else {
                    Object.keys(options.target).forEach(key => insert(myRegion, key));
                }
            };
            let empty = () => {
                if (options.isArray && options.list) {
                    options.list.forEach(clone => info.parent.removeChild(clone));
                }
                else if (options.list) { //Key-value pairs
                    Object.keys(options.list).forEach(key => info.parent.removeChild(options.list[key]));
                }
                options.list = null;
            };
            let getRange = (from, to) => {
                if (from < to) {
                    return Array.from({ length: (to - from) }, (value, key) => (key + from));
                }
                return Array.from({ length: (from - to) }, (value, key) => (from - key));
            };
            let expandTarget = (target) => {
                if (typeof target === 'number' && Number.isInteger(target)) {
                    let offset = (isCount ? 1 : 0);
                    if (target < 0) {
                        return (isReverse ? getRange((target - offset + 1), (1 - offset)) : getRange(-offset, (target - offset)));
                    }
                    return (isReverse ? getRange((target + offset - 1), (offset - 1)) : getRange(offset, (target + offset)));
                }
                return target;
            };
            let init = (myRegion, refresh = false) => {
                if (!refresh) { //First initialization
                    empty();
                    options.target = expandTarget(CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value));
                    info.parent.removeChild(element);
                    if (!options.target) {
                        return false;
                    }
                }
                if (Array.isArray(options.target)) {
                    options.isArray = true;
                    options.count = options.target.length;
                    options.list = new Array();
                    if (!refresh && '__InlineJS_Path__' in options.target) {
                        options.path = options.target['__InlineJS_Path__'];
                    }
                }
                else if (Region.IsObject(options.target)) {
                    options.list = new Map();
                    if ('__InlineJS_Target__' in options.target) {
                        if (!refresh) {
                            options.path = options.target['__InlineJS_Path__'];
                        }
                        options.count = Object.keys(options.target['__InlineJS_Target__']).length;
                    }
                    else {
                        options.count = Object.keys(options.target).length;
                    }
                }
                else {
                    return false;
                }
                build(myRegion);
                return !!options.path;
            };
            let addSizeChange = (myRegion) => {
                myRegion.GetChanges().Add({
                    type: 'set',
                    path: `${options.path}.length`,
                    prop: 'length',
                    origin: myRegion.GetChanges().GetOrigin()
                });
                options.count = Object.keys(options.target['__InlineJS_Target__']).length;
            };
            let onChange = (myRegion, changes) => {
                if (!ifConditionIsTrue) {
                    return false;
                }
                changes.forEach((change) => {
                    if ('original' in change) { //Bubbled
                        if (options.isArray || change.original.type !== 'set' || `${options.path}.${change.original.prop}` !== change.original.path) {
                            return true;
                        }
                        addSizeChange(myRegion);
                        insert(myRegion, change.original.prop);
                    }
                    else if (change.type === 'set' && change.path === options.path) { //Object replaced
                        empty();
                        let target = myRegion.GeRootProxy().GetNativeProxy(), parts = change.path.split('.');
                        for (let i = 1; i < parts.length; ++i) { //Resolve target
                            if (!target || typeof target !== 'object' || !('__InlineJS_Target__' in target)) {
                                return false;
                            }
                            target = target[parts[i]];
                        }
                        options.target = expandTarget(target);
                        return (options.target && init(myRegion, true));
                    }
                    else if (options.isArray && change.type === 'set' && change.path === `${options.path}.length`) {
                        let count = options.target.length;
                        if (count < options.count) { //Item(s) removed
                            options.list.splice(count).forEach(clone => info.parent.removeChild(clone));
                        }
                        else if (options.count < count) { //Item(s) added
                            for (let diff = (count - options.count); 0 < diff; --diff) {
                                insert(myRegion);
                            }
                        }
                        options.count = count;
                    }
                    else if (!options.isArray && change.type === 'delete' && change.prop in options.list) {
                        info.parent.removeChild(options.list[change.prop]);
                        addSizeChange(Region.Get(info.regionId));
                        delete options.list[change.prop];
                    }
                });
                return true;
            };
            region.GetState().TrapGetAccess(() => init(Region.Get(info.regionId)), (change) => onChange(Region.Get(info.regionId), change));
            return DirectiveHandlerReturn.QuitAll;
        }
        static InitIfOrEach(region, element, except) {
            let attributes = new Array(), elScopeKey = Region.GetElementKeyName(), scopeKey = element.getAttribute(elScopeKey);
            [...element.attributes].forEach((attr) => {
                if (attr.name === elScopeKey) {
                    return;
                }
                element.removeAttribute(attr.name);
                if (attr.name !== except) {
                    let directive = Processor.GetDirectiveWith(attr.name, attr.value);
                    attributes.push({ name: (directive ? directive.expanded : attr.name), value: attr.value });
                }
            });
            return {
                regionId: region.GetId(),
                scopeKey: scopeKey,
                parent: element.parentElement,
                marker: CoreDirectiveHandlers.GetChildElementIndex(element),
                attributes: attributes
            };
        }
        static InsertIfOrEach(region, element, info, callback, offset = 0) {
            if (!element.parentElement) {
                element.removeAttribute(Region.GetElementKeyName());
                CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, element, (info.marker + (offset || 0)));
            }
            info.attributes.forEach(attr => element.setAttribute(attr.name, attr.value));
            if (callback) {
                callback();
            }
            Processor.All(region, element);
        }
        static CreateProxy(getter, contains) {
            let handler = {
                get(target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return getter(prop.toString());
                },
                set(target, prop, value) {
                    return false;
                },
                deleteProperty(target, prop) {
                    return false;
                },
                has(target, prop) {
                    if (Reflect.has(target, prop)) {
                        return true;
                    }
                    if (!contains) {
                        return false;
                    }
                    return ((typeof contains === 'function') ? contains(prop.toString()) : (contains.indexOf(prop.toString()) != -1));
                }
            };
            return new window.Proxy({}, handler);
        }
        static Evaluate(region, element, expression, useWindow = false) {
            if (!region) {
                return null;
            }
            RegionMap.scopeRegionIds.Push(region.GetId());
            region.GetState().PushElementContext(element);
            let result;
            try {
                result = Evaluator.Evaluate(region.GetId(), element, expression, useWindow);
                if (typeof result === 'function') {
                    result = region.Call(result);
                }
                result = ((result instanceof Value) ? result.Get() : result);
            }
            catch (err) {
                region.GetState().ReportError(err, `InlineJs.Region<${region.GetId()}>.CoreDirectiveHandlers.Evaluate(${expression})`);
            }
            finally {
                region.GetState().PopElementContext();
                RegionMap.scopeRegionIds.Pop();
            }
            return result;
        }
        static Assign(region, element, target, value, callback) {
            if (!(target = target.trim())) {
                return;
            }
            RegionMap.scopeRegionIds.Push(region.GetId());
            region.GetState().PushElementContext(element);
            let targetObject;
            try {
                targetObject = Evaluator.Evaluate(region.GetId(), element, target);
            }
            catch (err) { }
            try {
                if (typeof targetObject === 'function') {
                    region.Call(targetObject, callback());
                }
                else {
                    Evaluator.Evaluate(region.GetId(), element, `(${target})=${value}`);
                }
            }
            catch (err) {
                region.GetState().ReportError(err, `InlineJs.Region<${region.GetId()}>.CoreDirectiveHandlers.Assign(${target}=${value})`);
            }
            finally {
                region.GetState().PopElementContext();
                RegionMap.scopeRegionIds.Pop();
            }
        }
        static Call(regionId, callback, ...args) {
            try {
                return callback(...args);
            }
            catch (err) {
                Region.Get(regionId).GetState().ReportError(err, 'CoreDirectiveHandlers.Call');
            }
        }
        static ExtractDuration(value, defaultValue) {
            const regex = /[0-9]+(s|ms)?/;
            if (!value || !value.match(regex)) {
                return defaultValue;
            }
            if (value.indexOf('m') == -1 && value.indexOf('s') != -1) { //Seconds
                return (parseInt(value) * 1000);
            }
            return parseInt(value);
        }
        static ToString(value) {
            if (typeof value === 'string') {
                return value;
            }
            if (value === null || value === undefined) {
                return '';
            }
            if (typeof value === 'object' && '__InlineJS_Target__' in value) {
                return CoreDirectiveHandlers.ToString(value['__InlineJS_Target__']);
            }
            return value.toString();
        }
        static GetChildElementIndex(element) {
            return (element.parentElement ? [...element.parentElement.children].indexOf(element) : -1);
        }
        static GetChildElementAt(parent, index) {
            return ((index < parent.children.length) ? parent.children.item(index) : null);
        }
        static InsertOrAppendChildElement(parent, element, index) {
            let sibling = CoreDirectiveHandlers.GetChildElementAt(parent, index);
            if (sibling) {
                parent.insertBefore(element, sibling);
            }
            else { //Append
                parent.appendChild(element);
            }
        }
        static AddAll() {
            DirectiveHandlerManager.AddHandler('cloak', CoreDirectiveHandlers.Noop);
            DirectiveHandlerManager.AddHandler('data', CoreDirectiveHandlers.Data);
            DirectiveHandlerManager.AddHandler('component', CoreDirectiveHandlers.Component);
            DirectiveHandlerManager.AddHandler('init', CoreDirectiveHandlers.Init);
            DirectiveHandlerManager.AddHandler('post', CoreDirectiveHandlers.Post);
            DirectiveHandlerManager.AddHandler('bind', CoreDirectiveHandlers.Bind);
            DirectiveHandlerManager.AddHandler('static', CoreDirectiveHandlers.Static);
            DirectiveHandlerManager.AddHandler('uninit', CoreDirectiveHandlers.Uninit);
            DirectiveHandlerManager.AddHandler('ref', CoreDirectiveHandlers.Ref);
            DirectiveHandlerManager.AddHandler('attr', CoreDirectiveHandlers.Attr);
            DirectiveHandlerManager.AddHandler('style', CoreDirectiveHandlers.Style);
            DirectiveHandlerManager.AddHandler('class', CoreDirectiveHandlers.Class);
            DirectiveHandlerManager.AddHandler('text', CoreDirectiveHandlers.Text);
            DirectiveHandlerManager.AddHandler('html', CoreDirectiveHandlers.Html);
            DirectiveHandlerManager.AddHandler('on', CoreDirectiveHandlers.On);
            DirectiveHandlerManager.AddHandler('model', CoreDirectiveHandlers.Model);
            DirectiveHandlerManager.AddHandler('show', CoreDirectiveHandlers.Show);
            DirectiveHandlerManager.AddHandler('if', CoreDirectiveHandlers.If);
            DirectiveHandlerManager.AddHandler('each', CoreDirectiveHandlers.Each);
        }
    }
    InlineJS.CoreDirectiveHandlers = CoreDirectiveHandlers;
    class Processor {
        static All(region, element, options) {
            if (!Processor.Check(element, options)) { //Check failed -- ignore
                return;
            }
            let isTemplate = (element.tagName == 'TEMPLATE');
            if (!isTemplate && (options === null || options === void 0 ? void 0 : options.checkTemplate) && element.closest('template')) { //Inside template -- ignore
                return;
            }
            Processor.Pre(region, element);
            if (Processor.One(region, element) != DirectiveHandlerReturn.QuitAll && !isTemplate) { //Process children
                [...element.children].forEach(child => Processor.All(region, child));
            }
            Processor.Post(region, element);
        }
        static One(region, element, options) {
            if (!Processor.Check(element, options)) { //Check failed -- ignore
                return DirectiveHandlerReturn.Nil;
            }
            let isTemplate = (element.tagName == 'TEMPLATE');
            if (!isTemplate && (options === null || options === void 0 ? void 0 : options.checkTemplate) && element.closest('template')) { //Inside template -- ignore
                return DirectiveHandlerReturn.Nil;
            }
            region.GetState().PushElementContext(element);
            let result = Processor.TraverseDirectives(element, (directive) => {
                return Processor.DispatchDirective(region, element, directive);
            });
            region.GetState().PopElementContext();
            return result;
        }
        static Pre(region, element) {
            Processor.PreOrPost(region, element, 'preProcessCallbacks', 'Pre');
        }
        static Post(region, element) {
            Processor.PreOrPost(region, element, 'postProcessCallbacks', 'Post');
        }
        static PreOrPost(region, element, scopeKey, name) {
            let scope = region.GetElementScope(element);
            if (scope) {
                scope[scopeKey].forEach((callback) => {
                    try {
                        callback();
                    }
                    catch (err) {
                        region.GetState().ReportError(err, `InlineJs.Region<${region.GetId()}>.Processor.${name}(Element@${element.nodeName})`);
                    }
                });
                scope[scopeKey] = [];
            }
        }
        static DispatchDirective(region, element, directive) {
            let result;
            try {
                result = DirectiveHandlerManager.Handle(region, element, directive);
                if (result == DirectiveHandlerReturn.Nil) {
                    region.GetState().Warn('Handler not found for directive. Skipping...', `InlineJs.Region<${region.GetId()}>.Processor.DispatchDirective(Element@${element.nodeName}, ${directive.original})`);
                }
            }
            catch (err) {
                result = DirectiveHandlerReturn.Nil;
                region.GetState().ReportError(err, `InlineJs.Region<${region.GetId()}>.Processor.DispatchDirective(Element@${element.nodeName}, ${directive.original})`);
            }
            if (result != DirectiveHandlerReturn.Rejected && result != DirectiveHandlerReturn.QuitAll) {
                element.removeAttribute(directive.original);
            }
            return result;
        }
        static Check(element, options) {
            if ((element === null || element === void 0 ? void 0 : element.nodeType) !== 1) { //Not an HTMLElement
                return false;
            }
            if ((options === null || options === void 0 ? void 0 : options.checkDocument) && !document.contains(element)) { //Node is not contained inside the document
                return false;
            }
            return true;
        }
        static TraverseDirectives(element, callback) {
            let attributes = [...element.attributes]; //Duplicate attributes
            let result = DirectiveHandlerReturn.Nil;
            for (let i = 0; i < attributes.length; ++i) { //Traverse attributes
                let directive = Processor.GetDirective(attributes[i]);
                if (directive) {
                    let thisResult = callback(directive);
                    if (thisResult != DirectiveHandlerReturn.Nil) {
                        result = thisResult;
                        if (thisResult == DirectiveHandlerReturn.Rejected || thisResult == DirectiveHandlerReturn.QuitAll) {
                            break;
                        }
                    }
                }
            }
            return result;
        }
        static GetDirective(attribute) {
            return Processor.GetDirectiveWith(attribute.name, attribute.value);
        }
        static GetDirectiveWith(name, value) {
            if (!name || !(name = name.trim())) {
                return null;
            }
            let expanded = name;
            switch (name.substr(0, 1)) {
                case ':':
                    expanded = `x-attr${name}`;
                    break;
                case '.':
                    expanded = `x-class:${name.substr(1)}`;
                    break;
                case '@':
                    expanded = `x-on:${name.substr(1)}`;
                    break;
            }
            let matches = expanded.match(Region.directiveRegex);
            if (!matches || matches.length != 3 || !matches[2]) { //Not a directive
                return null;
            }
            let raw = matches[2], arg = {
                key: '',
                options: new Array()
            };
            let colonIndex = raw.indexOf(':'), options;
            if (colonIndex != -1) {
                options = raw.substr(colonIndex + 1).split('.');
                arg.key = options[0];
                raw = raw.substr(0, colonIndex);
            }
            else { //No args
                options = raw.split('.');
                raw = options[0];
            }
            for (let i = 1; i < options.length; ++i) {
                if (options[i] === 'camel') {
                    arg.key = Processor.GetCamelCaseDirectiveName(arg.key);
                }
                else if (options[i] === 'join') {
                    arg.key = arg.key.split('-').join('.');
                }
                else {
                    arg.options.push(options[i]);
                }
            }
            return {
                original: name,
                expanded: expanded,
                parts: raw.split('-'),
                raw: raw,
                key: Processor.GetCamelCaseDirectiveName(raw),
                arg: arg,
                value: value
            };
        }
        static GetCamelCaseDirectiveName(name) {
            return name.replace(/-([^-])/g, (...args) => {
                return (args[1].charAt(0).toUpperCase() + args[1].slice(1));
            });
        }
    }
    InlineJS.Processor = Processor;
    class Config {
        static SetDirectivePrefix(value) {
            Region.SetDirectivePrefix(value);
        }
        static SetExternalCallbacks(isEqual, deepCopy) {
            Region.externalCallbacks.isEqual = isEqual;
            Region.externalCallbacks.deepCopy = deepCopy;
        }
        static SetIsEqualExternalCallback(callback) {
            Region.externalCallbacks.isEqual = callback;
        }
        static SetDeepCopyExternalCallback(callback) {
            Region.externalCallbacks.deepCopy = callback;
        }
        static AddKeyEventMap(key, target) {
            Region.keyMap[key] = target;
        }
        static RemoveKeyEventMap(key) {
            delete Region.keyMap[key];
        }
        static AddBooleanAttribute(name) {
            Region.booleanAttributes.push(name);
        }
        static RemoveBooleanAttribute(name) {
            let index = Region.booleanAttributes.indexOf(name);
            if (index < Region.booleanAttributes.length) {
                Region.booleanAttributes.splice(index, 1);
            }
        }
        static SetOptimizedBindsState(enabled) {
            Region.enableOptimizedBinds = enabled;
        }
        static AddDirective(name, handler) {
            DirectiveHandlerManager.AddHandler(name, handler);
        }
        static RemoveDirective(name) {
            DirectiveHandlerManager.RemoveHandler(name);
        }
        static AddGlobalMagicProperty(name, callback) {
            Region.AddGlobal(('$' + name), callback);
        }
        static RemoveGlobalMagicProperty(name) {
            Region.RemoveGlobal(('$' + name));
        }
    }
    InlineJS.Config = Config;
    class Bootstrap {
        static Attach(anchors) {
            if (!anchors) {
                anchors = [`data-${Region.directivePrfix}-data`, `${Region.directivePrfix}-data`];
            }
            anchors.forEach((anchor) => {
                document.querySelectorAll(`[${anchor}]`).forEach((element) => {
                    if (!element.hasAttribute(anchor)) { //Probably contained inside another region
                        return;
                    }
                    let regionId;
                    if (Bootstrap.lastRegionId_ === null) {
                        regionId = (Bootstrap.lastRegionId_ = 0);
                    }
                    else {
                        regionId = ++Bootstrap.lastRegionId_;
                    }
                    let stringRegionId = `rgn_${regionId}`;
                    let region = new Region(stringRegionId, element, new RootProxy(stringRegionId, {}));
                    let observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'childList') {
                                mutation.removedNodes.forEach((node) => {
                                    if ((node === null || node === void 0 ? void 0 : node.nodeType) === 1) {
                                        region.RemoveElement(node);
                                    }
                                });
                                mutation.addedNodes.forEach((node) => {
                                    if ((node === null || node === void 0 ? void 0 : node.nodeType) === 1) {
                                        Processor.All(region, node, {
                                            checkTemplate: true,
                                            checkDocument: false
                                        });
                                    }
                                });
                            }
                            else if (mutation.type === 'attributes') {
                                let scope = region.GetElementScope(mutation.target);
                                if (scope) {
                                    scope.attributeChangeCallbacks.forEach(callback => callback(mutation.attributeName));
                                }
                            }
                        });
                        Region.ExecutePostProcessCallbacks();
                    });
                    RegionMap.entries[stringRegionId] = region;
                    Processor.All(region, element, {
                        checkTemplate: true,
                        checkDocument: false
                    });
                    region.SetDoneInit();
                    region.SetObserver(observer);
                    observer.observe(element, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        characterData: false,
                    });
                });
            });
            Region.ExecutePostProcessCallbacks();
        }
    }
    Bootstrap.lastRegionId_ = null;
    InlineJS.Bootstrap = Bootstrap;
    (function () {
        RootProxy.AddGlobalCallbacks();
        CoreDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
