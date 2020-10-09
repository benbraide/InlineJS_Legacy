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
            this.observer_ = null;
            this.outsideEvents_ = new Array();
            this.nextTickCallbacks_ = new Array();
            this.tempCallbacks_ = new Map();
            this.tempCallbacksId_ = 0;
            this.state_ = new State(this.id_);
            this.changes_ = new Changes(this.id_);
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
                preserve: false
            };
            element.setAttribute(Region.GetElementKeyName(), key);
            return this.elementScopes_[key];
        }
        RemoveElement(element) {
            let scope = this.GetElementScope(element);
            if (scope) {
                scope.uninitCallbacks.forEach((callback) => {
                    try {
                        callback();
                    }
                    catch (err) {
                        this.state_.ReportError(err, `InlineJs.Region<${this.id_}>.$uninit`);
                    }
                });
                if (scope.preserve) {
                    scope.preserve = false;
                    return;
                }
                scope.changeRefs.forEach((info) => {
                    let region = Region.Get(info.regionId);
                    if (region) {
                        region.changes_.Unsubscribe(info.subscriptionId);
                    }
                });
                scope.element.removeAttribute(Region.GetElementKeyName());
                Object.keys(scope.intersectionObservers).forEach(key => scope.intersectionObservers[key].unobserve(scope.element));
                [...scope.element.children].forEach(child => this.RemoveElement(child));
                delete this.elementScopes_[scope.key];
            }
            if (element === this.rootElement_) { //Remove from map
                if (this.componentKey_ in Region.components_) {
                    delete Region.components_[this.componentKey_];
                }
                delete RegionMap.entries[this.id_];
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
            return (Region.externalCallbacks.isEqual ? Region.externalCallbacks.isEqual(first, second) : (first === second));
        }
        static DeepCopy(target) {
            return (Region.externalCallbacks.deepCopy ? Region.externalCallbacks.deepCopy(target) : target);
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
    Region.directivePrfix = 'x';
    Region.directiveRegex = /^(data-)?x-(.+)$/;
    Region.externalCallbacks = {
        isEqual: (first, second) => (first === second),
        deepCopy: (target) => target,
    };
    InlineJS.Region = Region;
    ;
    class Changes {
        constructor(regionId_) {
            this.regionId_ = regionId_;
            this.isScheduled_ = false;
            this.list_ = new Array();
            this.subscriberId_ = null;
            this.subscribers_ = new Map();
            this.getAccessStorages_ = new Stack();
            this.getAccessHooks_ = new Stack();
        }
        Schedule() {
            if (this.isScheduled_) {
                return;
            }
            this.isScheduled_ = true;
            setTimeout(() => {
                this.isScheduled_ = false;
                if (0 < this.list_.length) {
                    let list = this.list_;
                    this.list_ = new Array();
                    for (let item of list) { //Traverse changes
                        if (item.path in this.subscribers_) {
                            this.subscribers_[item.path].forEach(info => info.callback(item));
                        }
                    }
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
            let info = this.getAccessStorages_.Peek();
            if (info && info.storage) {
                info.storage.optimized = new Array();
                info.storage.raw.forEach(item => info.storage.optimized.push(item));
            }
        }
        PushGetAccessStorage(storage) {
            this.getAccessStorages_.Push({
                storage: (storage || {
                    optimized: new Array(),
                    raw: new Array()
                }),
                lastAccessPath: ''
            });
        }
        GetGetAccessStorage(optimized = true) {
            let info = this.getAccessStorages_.Peek();
            return ((info && info.storage) ? (optimized ? info.storage.optimized : info.storage) : null);
        }
        PopGetAccessStorage(optimized) {
            let info = this.getAccessStorages_.Pop();
            return ((info && info.storage) ? (optimized ? info.storage.optimized : info.storage) : null);
        }
        PushGetAccessHook(hook) {
            this.getAccessHooks_.Push(hook);
        }
        PopGetAccessHook() {
            return this.getAccessHooks_.Pop();
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
        TrapGetAccess(callback, changeCallback) {
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
            if (stopped || !changeCallback || storage.length == 0) {
                return new Map();
            }
            let ids = new Map();
            let onChange = (change) => {
                try {
                    if (changeCallback === true) {
                        stopped = (callback(change) === false);
                    }
                    else {
                        stopped = (changeCallback(change) === false);
                    }
                }
                catch (err) {
                    this.ReportError(err, `InlineJs.Region<${this.regionId_}>.State.TrapAccess`);
                }
                if (stopped) {
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
            prop: prop
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
            Region.AddGlobal('$alert', () => window.alert);
            Region.AddGlobal('$event', (regionId) => new Value(() => Region.Get(regionId).GetState().GetEventContext()));
            Region.AddGlobal('$expandEvent', (regionId) => (event, target) => Region.Get(regionId).ExpandEvent(event, (target || true)));
            Region.AddGlobal('$dispatchEvent', (regionId, contextElement) => (event, nextCycle = true, target) => {
                let resolvedTarget = (target || contextElement);
                let resolvedEvent = ((typeof event === 'string') ? new Event(Region.Get(regionId).ExpandEvent(event, resolvedTarget)) : event);
                if (nextCycle) {
                    setTimeout(() => resolvedTarget.dispatchEvent(resolvedEvent), 0);
                }
                else {
                    resolvedTarget.dispatchEvent(resolvedEvent);
                }
            });
            Region.AddGlobal('$self', (regionId) => new Value(() => Region.Get(regionId).GetState().GetElementContext()));
            Region.AddGlobal('$root', (regionId) => new Value(() => Region.Get(regionId).GetRootElement()));
            Region.AddGlobal('$parent', (regionId) => new Value(() => Region.Get(regionId).GetElementAncestor(true, 0)));
            Region.AddGlobal('$getAncestor', (regionId) => (index) => Region.Get(regionId).GetElementAncestor(true, index));
            Region.AddGlobal('$component', () => (id) => Region.Find(id, true));
            Region.AddGlobal('$locals', (regionId) => new Value(() => Region.Get(regionId).GetElementScope(true).locals));
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
            Region.AddGlobal('$nextTick', (regionId, contextElement) => (callback) => {
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
        static GetHandler(key) {
            return ((key in DirectiveHandlerManager.directiveHandlers_) ? DirectiveHandlerManager.directiveHandlers_[key] : null);
        }
        static AddBulkHandler(handler) {
            DirectiveHandlerManager.bulkDirectiveHandlers_.push(handler);
        }
        static Handle(region, element, directive) {
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
                target[key] = data[key];
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
        static Uninit(region, element, directive) {
            let regionId = region.GetId();
            region.AddElement(element, true).uninitCallbacks.push(() => CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            return DirectiveHandlerReturn.Handled;
        }
        static Ref(region, element, directive) {
            if (element.tagName === 'TEMPLATE') {
                CoreDirectiveHandlers.Assign(region, element, directive.value, 'this.content', () => {
                    return element.content;
                });
            }
            else {
                CoreDirectiveHandlers.Assign(region, element, directive.value, 'this', () => {
                    return element;
                });
            }
            return DirectiveHandlerReturn.Handled;
        }
        static Class(region, element, directive) {
            let regionId = region.GetId();
            region.GetState().TrapGetAccess(() => {
                let entries = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                if (!Region.IsObject(entries)) {
                    return;
                }
                for (let key in entries) {
                    if (entries[key] && !element.classList.contains(key)) {
                        element.classList.add(key);
                    }
                    else if (!entries[key]) {
                        element.classList.remove(key);
                    }
                }
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
                onChange = () => element.innerHTML = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
            }
            else if (element.tagName === 'INPUT') {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    onChange = () => element.checked = !!CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                }
                else {
                    onChange = () => element.value = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                }
            }
            else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                onChange = () => element.value = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
            }
            else { //Unknown
                onChange = () => element.innerText = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
            }
            region.GetState().TrapGetAccess(() => {
                if (!callback || callback()) {
                    onChange();
                }
            }, true);
            return DirectiveHandlerReturn.Handled;
        }
        static Input(region, element, directive) {
            return CoreDirectiveHandlers.InternalInput(region, element, directive, true, false);
        }
        static LazyInput(region, element, directive) {
            return CoreDirectiveHandlers.InternalInput(region, element, directive, true, true);
        }
        static Model(region, element, directive) {
            let doneInput = false;
            CoreDirectiveHandlers.TextOrHtml(region, element, directive, false, () => !doneInput);
            CoreDirectiveHandlers.InternalInput(region, element, directive, false, false, () => {
                region.AddNextTickCallback(() => doneInput = false);
                return (doneInput = true);
            });
            return DirectiveHandlerReturn.Handled;
        }
        static InternalInput(region, element, directive, preEvaluate, lazy = false, callback) {
            let getValueExpression;
            let getValue;
            let isCheckable = false;
            if (element.tagName === 'INPUT') {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    isCheckable = true;
                    getValueExpression = () => 'this.checked';
                    getValue = () => element.checked;
                }
                else {
                    getValueExpression = () => 'this.value';
                    getValue = () => element.value;
                }
            }
            else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                getValueExpression = () => 'this.value';
                getValue = () => element.value;
            }
            else {
                return DirectiveHandlerReturn.Nil;
            }
            if (preEvaluate) {
                CoreDirectiveHandlers.Assign(region, element, directive.value, getValueExpression(), getValue);
            }
            let onEvent = () => {
                if (!callback || callback()) {
                    CoreDirectiveHandlers.Assign(region, element, directive.value, getValueExpression(), getValue);
                }
            };
            if (!lazy && !isCheckable && element.tagName !== 'SELECT') {
                element.addEventListener('input', onEvent);
                element.addEventListener('paste', onEvent);
                element.addEventListener('cut', onEvent);
            }
            else { //Delayed
                element.addEventListener('change', onEvent);
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
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element);
            region.GetState().TrapGetAccess(() => {
                let myRegion = Region.Get(info.regionId);
                let value = CoreDirectiveHandlers.Evaluate(myRegion, info.marker, directive.value);
                if (!value && element.parentElement) {
                    let scope = myRegion.GetElementScope(element);
                    if (scope) { //Don't remove scope
                        scope.preserve = true;
                    }
                    element.parentElement.removeChild(element);
                }
                else if (value && !element.parentElement) {
                    CoreDirectiveHandlers.InsertIfOrEach(myRegion, element, info);
                }
            }, true);
            if (!element.parentElement) { //Initial evaluation result is false
                info.attributes.forEach(value => element.removeAttribute(value));
                region.RemoveElement(element);
                return DirectiveHandlerReturn.QuitAll;
            }
            return DirectiveHandlerReturn.Handled;
        }
        static Each(region, element, directive) {
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element);
            let options = {
                isArray: false,
                list: null,
                target: null,
                count: 0,
                path: ''
            };
            let getIndex = (clone, key) => {
                if (!options.isArray) {
                    return key;
                }
                for (let i = 0; i < options.list.length; ++i) {
                    if (options.list[i] === clone) {
                        return i;
                    }
                }
                return -1;
            };
            let initLocals = (myRegion, clone, key) => {
                myRegion.AddLocal(clone, '$each', CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === 'count') {
                        if (options.isArray) {
                            return options.target.length;
                        }
                        if (options.path) {
                            myRegion.GetChanges().AddGetAccess(`${options.path}.length`);
                        }
                        return options.count;
                    }
                    if (prop === 'index') {
                        return getIndex(clone, key);
                    }
                    if (prop === 'value') {
                        return (options.isArray ? options.target[getIndex(clone)] : options.target[key]);
                    }
                    return null;
                }, ['count', 'index', 'value']));
            };
            let insert = (myRegion, key) => {
                let clone = element.cloneNode(true);
                if (!options.isArray && key in options.list) {
                    info.marker.parentElement.removeChild(options.list[key]);
                    options.list[key] = clone;
                }
                else if (!options.isArray) {
                    options.list[key] = clone;
                }
                else if (options.isArray) {
                    options.list.push(clone);
                }
                CoreDirectiveHandlers.InsertIfOrEach(myRegion, clone, info, () => initLocals(myRegion, clone, key));
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
            let init = (myRegion) => {
                options.target = CoreDirectiveHandlers.Evaluate(myRegion, info.marker, directive.value);
                if (!options.target) {
                    return false;
                }
                if (Array.isArray(options.target)) {
                    options.isArray = true;
                    options.count = options.target.length;
                    options.list = new Array();
                    if ('__InlineJS_Path__' in options.target) {
                        options.path = options.target['__InlineJS_Path__'];
                    }
                }
                else if (Region.IsObject(options.target)) {
                    options.list = new Map();
                    if ('__InlineJS_Target__' in options.target) {
                        options.path = options.target['__InlineJS_Path__'];
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
                    prop: 'length'
                });
                options.count = Object.keys(options.target['__InlineJS_Target__']).length;
            };
            let onChange = (myRegion, change) => {
                if ('original' in change) { //Bubbled
                    if (options.isArray || change.original.type !== 'set' || `${options.path}.${change.original.prop}` !== change.original.path) {
                        return true;
                    }
                    addSizeChange(myRegion);
                    insert(myRegion, change.original.prop);
                }
                else if (options.isArray && change.type === 'set' && change.path === `${options.path}.length`) {
                    let count = options.target.length;
                    if (count < options.count) { //Item(s) removed
                        options.list.splice(count).forEach(clone => info.marker.parentElement.removeChild(clone));
                    }
                    else if (options.count < count) { //Item(s) added
                        for (let diff = (count - options.count); 0 < diff; --diff) {
                            insert(myRegion);
                        }
                    }
                    options.count = count;
                }
                else if (!options.isArray && change.type === 'delete' && change.prop in options.list) {
                    info.marker.removeChild(options.list[change.prop]);
                    addSizeChange(Region.Get(info.regionId));
                    delete options.list[change.prop];
                }
                return true;
            };
            element.parentElement.removeChild(element);
            if (region.GetRootElement() === element) {
                element.removeAttribute(Region.GetElementKeyName());
            }
            else {
                region.RemoveElement(element);
            }
            info.attributes.forEach(value => element.removeAttribute(value));
            region.GetState().TrapGetAccess(() => init(Region.Get(info.regionId)), (change) => onChange(Region.Get(info.regionId), change));
            return DirectiveHandlerReturn.QuitAll;
        }
        static InitIfOrEach(region, element) {
            let regionId = region.GetId();
            let marker = document.createElement('template');
            let directives = new Array();
            let attributes = new Array();
            Processor.TraverseDirectives(element, (value) => {
                attributes.push(value.original);
                if (value.key !== 'if' && value.key !== 'each') {
                    directives.push(value);
                }
                return DirectiveHandlerReturn.Nil;
            });
            element.parentElement.insertBefore(marker, element);
            return {
                regionId: regionId,
                marker: marker,
                directives: directives,
                attributes: attributes
            };
        }
        static InsertIfOrEach(region, element, info, callback) {
            info.marker.parentElement.insertBefore(element, info.marker);
            if (callback) {
                callback();
            }
            region.GetState().PushElementContext(element);
            for (let i = 0; i < info.directives.length; ++i) {
                if (Processor.DispatchDirective(region, element, info.directives[i]) == DirectiveHandlerReturn.QuitAll) {
                    break;
                }
            }
            region.GetState().PopElementContext();
            if (!region.GetDoneInit()) {
                Processor.All(region, element);
            }
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
        static AddAll() {
            DirectiveHandlerManager.AddHandler('cloak', CoreDirectiveHandlers.Noop);
            DirectiveHandlerManager.AddHandler('data', CoreDirectiveHandlers.Data);
            DirectiveHandlerManager.AddHandler('component', CoreDirectiveHandlers.Component);
            DirectiveHandlerManager.AddHandler('init', CoreDirectiveHandlers.Init);
            DirectiveHandlerManager.AddHandler('post', CoreDirectiveHandlers.Post);
            DirectiveHandlerManager.AddHandler('bind', CoreDirectiveHandlers.Bind);
            DirectiveHandlerManager.AddHandler('uninit', CoreDirectiveHandlers.Uninit);
            DirectiveHandlerManager.AddHandler('ref', CoreDirectiveHandlers.Ref);
            DirectiveHandlerManager.AddHandler('class', CoreDirectiveHandlers.Class);
            DirectiveHandlerManager.AddHandler('text', CoreDirectiveHandlers.Text);
            DirectiveHandlerManager.AddHandler('html', CoreDirectiveHandlers.Html);
            DirectiveHandlerManager.AddHandler('input', CoreDirectiveHandlers.Input);
            DirectiveHandlerManager.AddHandler('lazyInput', CoreDirectiveHandlers.LazyInput);
            DirectiveHandlerManager.AddHandler('model', CoreDirectiveHandlers.Model);
            DirectiveHandlerManager.AddHandler('show', CoreDirectiveHandlers.Show);
            DirectiveHandlerManager.AddHandler('if', CoreDirectiveHandlers.If);
            DirectiveHandlerManager.AddHandler('each', CoreDirectiveHandlers.Each);
        }
    }
    InlineJS.CoreDirectiveHandlers = CoreDirectiveHandlers;
    class CoreBulkDirectiveHandlers {
        static Static(region, element, directive) {
            if (directive.parts[0] !== 'static') {
                return DirectiveHandlerReturn.Nil;
            }
            let parts = [...directive.parts].splice(1);
            let raw = parts.join('-');
            let newDirective = {
                original: directive.original,
                parts: parts,
                raw: raw,
                key: Processor.GetCamelCaseDirectiveName(raw),
                value: directive.value
            };
            region.GetChanges().PushGetAccessHook(() => false); //Disable get access log
            let result = DirectiveHandlerManager.Handle(region, element, newDirective);
            region.GetChanges().PopGetAccessHook();
            return result;
        }
        static Attr(region, element, directive) {
            const booleanAttributes = new Array('allowfullscreen', 'allowpaymentrequest', 'async', 'autofocus', 'autoplay', 'checked', 'controls', 'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected');
            if (directive.parts[0] !== 'attr') {
                return DirectiveHandlerReturn.Nil;
            }
            let regionId = region.GetId();
            let name = [...directive.parts].splice(1).join('-');
            let isBoolean = (booleanAttributes.indexOf(name) != -1);
            region.GetState().TrapGetAccess(() => {
                let result = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                if (isBoolean && !!result) {
                    element.setAttribute(name, name);
                }
                else if (isBoolean) {
                    element.removeAttribute(name);
                }
                else { //Set evaluated value
                    element.setAttribute(name, result);
                }
            }, true);
            return DirectiveHandlerReturn.Handled;
        }
        static Style(region, element, directive) {
            if (directive.parts[0] !== 'style') {
                return DirectiveHandlerReturn.Nil;
            }
            let parts = [...directive.parts].splice(1);
            let key = Processor.GetCamelCaseDirectiveName(parts.join('-'));
            if (!(key in element.style)) { //Unrecognized style
                return DirectiveHandlerReturn.Nil;
            }
            let regionId = region.GetId();
            region.GetState().TrapGetAccess(() => {
                element.style[key] = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
            }, true);
            return DirectiveHandlerReturn.Handled;
        }
        static Event(region, element, directive) {
            const knownEvents = new Array('blur', 'change', 'click', 'contextmenu', 'context-menu', 'dblclick', 'focus', 'focusin', 'focusout', 'hover', 'keydown', 'keyup', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'scroll', 'submit');
            let options = {
                on: false,
                outside: false,
                prevented: false,
                stopped: false,
                once: false,
                window: false,
            };
            let index = 0, length = directive.parts.length, parts, raw;
            for (; index < directive.parts.length; ++index) {
                let part = directive.parts[index];
                if (part in options) {
                    options[part] = true;
                    if (!options.on) { //Malformed
                        return DirectiveHandlerReturn.Nil;
                    }
                }
                else if (0 < index) { //Start of event
                    parts = [...directive.parts].splice(index);
                    raw = parts.join('-');
                    break;
                }
                else { //No modifiers
                    parts = directive.parts;
                    raw = parts.join('-');
                    break;
                }
            }
            if (length <= index || !parts || parts.length == 0 || (!options.on && knownEvents.indexOf(raw) == -1)) { //Malformed
                return DirectiveHandlerReturn.Nil;
            }
            let regionId = region.GetId(), stoppable;
            let onEvent = (e) => {
                let myRegion = Region.Get(regionId);
                if (options.once && options.outside) {
                    myRegion.AddOutsideEventCallback(element, event, onEvent);
                }
                else if (options.once) {
                    (options.window ? window : element).removeEventListener(event, onEvent);
                }
                if (options.prevented) {
                    e.preventDefault();
                }
                if (stoppable && options.stopped) {
                    e.stopPropagation();
                }
                if (myRegion) {
                    myRegion.GetState().PushEventContext(e);
                }
                try {
                    CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value);
                }
                finally {
                    if (myRegion) {
                        myRegion.GetState().PopEventContext();
                    }
                }
            };
            let event = region.ExpandEvent(raw, element);
            if (options.outside) {
                stoppable = false;
                region.AddOutsideEventCallback(element, event, onEvent);
            }
            else {
                stoppable = true;
                (options.window ? window : element).addEventListener(event, onEvent);
            }
            return DirectiveHandlerReturn.Handled;
        }
        static AddAll() {
            DirectiveHandlerManager.AddBulkHandler(CoreBulkDirectiveHandlers.Static);
            DirectiveHandlerManager.AddBulkHandler(CoreBulkDirectiveHandlers.Attr);
            DirectiveHandlerManager.AddBulkHandler(CoreBulkDirectiveHandlers.Style);
            DirectiveHandlerManager.AddBulkHandler(CoreBulkDirectiveHandlers.Event);
        }
    }
    InlineJS.CoreBulkDirectiveHandlers = CoreBulkDirectiveHandlers;
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
            let matches = attribute.name.match(Region.directiveRegex);
            if (!matches || matches.length != 3 || !matches[2]) { //Not a directive
                return null;
            }
            return {
                original: attribute.name,
                parts: matches[2].split('-'),
                raw: matches[2],
                key: Processor.GetCamelCaseDirectiveName(matches[2]),
                value: attribute.value
            };
        }
        static GetCamelCaseDirectiveName(name) {
            return name.replace(/-([^-])/g, (...args) => {
                return (args[1].charAt(0).toUpperCase() + args[1].slice(1));
            });
        }
    }
    InlineJS.Processor = Processor;
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
        CoreBulkDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
