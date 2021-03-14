export var InlineJS;
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
    RegionMap.entries = {};
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
            this.elementScopes_ = {};
            this.lastElementId_ = null;
            this.proxies_ = {};
            this.refs_ = {};
            this.observer_ = null;
            this.outsideEvents_ = new Array();
            this.localHandlers_ = new Array();
            this.nextTickCallbacks_ = new Array();
            this.tempCallbacks_ = {};
            this.scopeId_ = 0;
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
        GenerateScopeId() {
            return `${this.id_}_scope_${this.scopeId_++}`;
        }
        GetId() {
            return this.id_;
        }
        GetComponentKey() {
            return this.componentKey_;
        }
        GetRootElement() {
            return this.rootElement_;
        }
        GetElementWith(target, callback) {
            let resolvedTarget = ((target === true) ? this.state_.GetElementContext() : target);
            while (resolvedTarget) {
                if (callback(resolvedTarget)) {
                    return resolvedTarget;
                }
                if (resolvedTarget === this.rootElement_) {
                    break;
                }
                resolvedTarget = resolvedTarget.parentElement;
            }
            return null;
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
        GetRootProxy() {
            if (this.componentKey_ && this.componentKey_ in Region.components_) {
                let targetRegion = Region.Get(Region.components_[this.componentKey_]);
                return (targetRegion ? targetRegion.rootProxy_ : this.rootProxy_);
            }
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
                locals: {},
                uninitCallbacks: new Array(),
                changeRefs: new Array(),
                directiveHandlers: {},
                preProcessCallbacks: new Array(),
                postProcessCallbacks: new Array(),
                eventExpansionCallbacks: new Array(),
                outsideEventCallbacks: {},
                attributeChangeCallbacks: new Array(),
                intersectionObservers: {},
                falseIfCondition: null,
                trapInfoList: new Array(),
                removed: false,
                preserve: false,
                preserveSubscriptions: false,
                paused: false,
                isRoot: false,
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
                scope.uninitCallbacks.splice(0).forEach((callback) => {
                    try {
                        callback();
                    }
                    catch (err) {
                        this.state_.ReportError(err, `InlineJs.Region<${this.id_}>.$uninit`);
                    }
                });
                if (!preserve && !scope.preserve && !scope.preserveSubscriptions) {
                    Region.UnsubscribeAll(scope.changeRefs);
                    scope.changeRefs = [];
                    scope.element.removeAttribute(Region.GetElementKeyName());
                    Object.keys(scope.intersectionObservers).forEach(key => scope.intersectionObservers[key].unobserve(scope.element));
                    scope.intersectionObservers = {};
                }
                else {
                    scope.preserve = !(preserve = true);
                }
                Array.from(scope.element.children).forEach(child => this.RemoveElement(child, preserve));
                if (!preserve) { //Delete scope
                    scope.trapInfoList.forEach((info) => {
                        if (!info.stopped) {
                            info.stopped = true;
                            info.callback([]);
                        }
                    });
                    delete this.elementScopes_[scope.key];
                }
            }
            else if (typeof element !== 'string') {
                Array.from(element.children).forEach(child => this.RemoveElement(child, preserve));
            }
            if (!preserve && element === this.rootElement_) { //Remove from map
                Bootstrap.regionHooks.forEach(hook => hook(RegionMap.entries[this.id_], false));
                this.AddNextTickCallback(() => {
                    Evaluator.RemoveProxyCache(this.id_);
                    if (this.componentKey_ in Region.components_) {
                        delete Region.components_[this.componentKey_];
                    }
                    delete RegionMap.entries[this.id_];
                });
            }
        }
        MarkElementAsRemoved(element) {
            let scope = this.GetElementScope(element);
            if (scope) {
                scope.removed = true;
            }
        }
        ElementIsRemoved(element) {
            let scope = this.GetElementScope(element);
            return (scope && scope.removed);
        }
        ElementIsContained(element, checkDocument = true) {
            if (typeof element === 'string') {
                return (element && element in this.elementScopes_);
            }
            if (!element || (checkDocument && !document.contains(element))) {
                return false;
            }
            let key = element.getAttribute(Region.GetElementKeyName());
            return ((key && key in this.elementScopes_) || this.ElementIsContained(element, false));
        }
        ElementExists(element) {
            let scope = this.GetElementScope(element);
            return (scope && !scope.removed);
        }
        AddOutsideEventCallback(element, events, callback) {
            let scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true)), id = this.id_;
            if (!scope) {
                return;
            }
            ((typeof events === 'string') ? [events] : events).forEach((event) => {
                if (!(event in scope.outsideEventCallbacks)) {
                    scope.outsideEventCallbacks[event] = new Array();
                }
                scope.outsideEventCallbacks[event].push(callback);
                if (!this.outsideEvents_.includes(event)) {
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
            });
        }
        RemoveOutsideEventCallback(element, events, callback) {
            let scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true)), id = this.id_;
            if (!scope) {
                return;
            }
            ((typeof events === 'string') ? [events] : events).forEach((event) => {
                if (!(event in scope.outsideEventCallbacks)) {
                    return;
                }
                let index = scope.outsideEventCallbacks[event].findIndex(handler => (handler === callback));
                if (index != -1) {
                    scope.outsideEventCallbacks[event].splice(index, 1);
                }
            });
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
                scope.locals = (scope.locals || {});
                scope.locals[key] = value;
            }
        }
        GetLocal(element, key, bubble = true) {
            if (typeof element !== 'string') {
                for (let i = 0; i < this.localHandlers_.length; ++i) {
                    if (this.localHandlers_[i].element === element) {
                        return this.localHandlers_[i].callback(element, key, bubble);
                    }
                }
            }
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
        AddLocalHandler(element, callback) {
            this.localHandlers_.push({
                element: element,
                callback: callback
            });
        }
        RemoveLocalHandler(element) {
            this.localHandlers_ = this.localHandlers_.filter(info => (info.element !== element));
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
            return Region.Get(RegionMap.scopeRegionIds.Peek() || id);
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
            if (!key || region.rootElement_ !== element || region.componentKey_) {
                return false;
            }
            region.componentKey_ = key;
            if (!(key in Region.components_)) {
                Region.components_[key] = region.GetId();
            }
            return true;
        }
        static RemoveElementStatic(element, preserve = false) {
            let region = Region.Infer(element);
            if (!region) {
                Array.from(element.children).forEach(child => Region.RemoveElementStatic(child));
            }
            else {
                region.RemoveElement(element, preserve);
            }
        }
        static Find(key, getNativeProxy) {
            if (!key || !(key in Region.components_)) {
                return null;
            }
            let region = Region.Get(Region.components_[key]);
            return (region ? (getNativeProxy ? region.rootProxy_.GetNativeProxy() : region) : null);
        }
        static AddGlobal(key, callback, accessHandler) {
            Region.globals_[key] = {
                handler: callback,
                accessHandler: accessHandler
            };
        }
        static RemoveGlobal(key) {
            delete Region.globals_[key];
        }
        static GetGlobal(regionId, key) {
            if (!(key in Region.globals_)) {
                return null;
            }
            let info = Region.globals_[key];
            return ((!regionId || !info.accessHandler || info.accessHandler(regionId)) ? info.handler : null);
        }
        static GetGlobalValue(regionId, key, contextElement) {
            let global = Region.GetGlobal(regionId, key);
            return (global ? global(regionId, contextElement) : null);
        }
        static PushPostProcessCallback() {
            Region.postProcessCallbacks_.Push(new Array());
        }
        static AddPostProcessCallback(callback) {
            let list = Region.postProcessCallbacks_.Peek();
            if (list) {
                list.push(callback);
            }
        }
        static ExecutePostProcessCallbacks() {
            let list = Region.postProcessCallbacks_.Pop();
            if (list) {
                list.forEach((callback) => {
                    try {
                        callback();
                    }
                    catch (err) {
                        console.error(err, `InlineJs.Region<NIL>.ExecutePostProcessCallbacks`);
                    }
                });
            }
        }
        static AddGlobalOutsideEventCallback(element, events, callback) {
            ((typeof events === 'string') ? [events] : events).forEach((event) => {
                if (!(event in Region.outsideEventCallbacks_)) {
                    Region.outsideEventCallbacks_[event] = new Array();
                }
                Region.outsideEventCallbacks_[event].push({
                    target: element,
                    handler: callback,
                });
                if (!Region.globalOutsideEvents_.includes(event)) {
                    Region.globalOutsideEvents_.push(event);
                    document.body.addEventListener(event, (e) => {
                        if (!(e.type in Region.outsideEventCallbacks_)) {
                            return;
                        }
                        Region.outsideEventCallbacks_[e.type].forEach((info) => {
                            if (e.target !== info.target && e.type in Region.outsideEventCallbacks_ && !info.target.contains(e.target)) {
                                info.handler(e);
                            }
                        });
                    }, true);
                }
            });
        }
        static RemoveGlobalOutsideEventCallback(element, events, callback) {
            ((typeof events === 'string') ? [events] : events).forEach((event) => {
                if (!(event in Region.outsideEventCallbacks_)) {
                    return;
                }
                let index = Region.outsideEventCallbacks_[event].findIndex(info => (info.target === element && info.handler === callback));
                if (index != -1) {
                    Region.outsideEventCallbacks_[event].splice(index, 1);
                }
            });
        }
        static SetDirectivePrefix(value) {
            Region.directivePrfix = value;
            Region.directiveRegex = new RegExp(`^(data-)?${value}-(.+)$`);
        }
        static IsEqual(first, second) {
            let firstIsObject = (first && typeof first === 'object'), secondIsObject = (second && typeof second === 'object');
            if (firstIsObject && '__InlineJS_Target__' in first) { //Get underlying object
                first = first['__InlineJS_Target__'];
            }
            if (secondIsObject && '__InlineJS_Target__' in second) { //Get underlying object
                second = second['__InlineJS_Target__'];
            }
            if (Region.externalCallbacks.isEqual) {
                return Region.externalCallbacks.isEqual(first, second);
            }
            if (firstIsObject != secondIsObject) {
                return false;
            }
            if (!firstIsObject) {
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
            let isObject = (target && typeof target === 'object');
            if (isObject && '__InlineJS_Target__' in target) { //Get underlying object
                target = target['__InlineJS_Target__'];
            }
            if (Region.externalCallbacks.deepCopy) {
                return Region.externalCallbacks.deepCopy(target);
            }
            if (!isObject) {
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
        static UnsubscribeAll(list) {
            (list || []).forEach((info) => {
                let region = Region.Get(info.regionId);
                if (region) {
                    region.changes_.Unsubscribe(info.subscriptionId);
                }
            });
        }
    }
    Region.components_ = {};
    Region.globals_ = {};
    Region.postProcessCallbacks_ = new Stack();
    Region.outsideEventCallbacks_ = {};
    Region.globalOutsideEvents_ = new Array();
    Region.enableOptimizedBinds = true;
    Region.directivePrfix = 'x';
    Region.directiveRegex = /^(data-)?x-(.+)$/;
    Region.externalCallbacks = {
        isEqual: null,
        deepCopy: null,
    };
    Region.keyMap = {
        Ctrl: 'Control',
        Return: 'Enter',
        Esc: 'Escape',
        Space: ' ',
        Menu: 'ContextMenu',
        Del: 'Delete',
        Ins: 'Insert',
        Plus: '+',
        Minus: '-',
        Star: '*',
        Slash: '/',
    };
    Region.booleanAttributes = new Array('allowfullscreen', 'allowpaymentrequest', 'async', 'autofocus', 'autoplay', 'checked', 'controls', 'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected');
    InlineJS.Region = Region;
    class Changes {
        constructor(regionId_) {
            this.regionId_ = regionId_;
            this.isScheduled_ = false;
            this.list_ = new Array();
            this.subscriberId_ = null;
            this.subscribers_ = {};
            this.subscriptionCallbacks_ = {};
            this.getAccessStorages_ = new Stack();
            this.getAccessHooks_ = new Stack();
            this.origins_ = new Stack();
        }
        GetRegionId() {
            return this.regionId_;
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
                        if (item.path in this.subscriptionCallbacks_) {
                            let subscriptionCallbacks = this.subscriptionCallbacks_[item.path];
                            Object.keys(subscriptionCallbacks).forEach((key) => {
                                if (subscriptionCallbacks[key] !== Changes.GetOrigin(item)) { //Ignore originating callback
                                    Changes.AddBatch(batches, item, subscriptionCallbacks[key]);
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
                id = `sub_${(this.subscriberId_ = 0)}`;
            }
            else {
                id = `sub_${++this.subscriberId_}`;
            }
            let region = Region.GetCurrent(this.regionId_);
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
            (this.subscriptionCallbacks_[path] = (this.subscriptionCallbacks_[path] || {}))[id] = callback;
            this.subscribers_[id] = {
                path: path,
                callback: callback,
            };
            return id;
        }
        Unsubscribe(id) {
            if (id in this.subscribers_) {
                delete this.subscriptionCallbacks_[this.subscribers_[id].path][id];
                delete this.subscribers_[id];
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
            if (storageInfo.lastAccessPath && 0 < optimized.length && storageInfo.lastAccessPath.length < path.length &&
                1 < (path.match(/\./g) || []).length && path.substr(0, storageInfo.lastAccessPath.length) === storageInfo.lastAccessPath) { //Deeper access
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
        FlushRawGetAccesses() {
            if (!Region.Get(this.regionId_).OptimizedBindsIsEnabled()) {
                return;
            }
            let info = this.getAccessStorages_.Peek();
            if (info && info.storage && info.storage.raw) {
                info.storage.raw = [];
            }
        }
        AddGetAccessesCheckpoint() {
            let info = this.getAccessStorages_.Peek();
            if (!info || !info.storage) {
                return;
            }
            if (info.storage.optimized) {
                info.storage.checkpoint.optimized = info.storage.optimized.length;
            }
            if (info.storage.raw) {
                info.storage.checkpoint.raw = info.storage.raw.length;
            }
        }
        DiscardGetAccessesCheckpoint() {
            let info = this.getAccessStorages_.Peek();
            if (!info || !info.storage) {
                return;
            }
            if (info.storage.optimized && info.storage.checkpoint.optimized != -1 && info.storage.checkpoint.optimized < info.storage.optimized.length) {
                info.storage.optimized.splice(info.storage.checkpoint.optimized);
            }
            if (info.storage.raw && info.storage.checkpoint.raw != -1 && info.storage.checkpoint.raw < info.storage.raw.length) {
                info.storage.raw.splice(info.storage.checkpoint.raw);
            }
            info.storage.checkpoint.optimized = -1;
            info.storage.checkpoint.raw = -1;
        }
        PushGetAccessStorage(storage) {
            this.getAccessStorages_.Push({
                storage: (storage || {
                    optimized: (Region.Get(this.regionId_).OptimizedBindsIsEnabled() ? new Array() : null),
                    raw: new Array(),
                    checkpoint: {
                        optimized: -1,
                        raw: -1
                    }
                }),
                lastAccessPath: ''
            });
        }
        RetrieveGetAccessStorage(optimized = true) {
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
        RetrieveGetAccessHook() {
            return this.getAccessHooks_.Peek();
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
        TrapGetAccess(callback, changeCallback, elementContext, staticCallback) {
            let region = Region.Get(this.regionId_);
            if (!region) {
                return {};
            }
            let info = {
                stopped: false,
                callback: null
            };
            try {
                region.GetChanges().PushGetAccessStorage(null);
                info.stopped = (callback(null) === false);
            }
            catch (err) {
                this.ReportError(err, `InlineJs.Region<${this.regionId_}>.State.TrapAccess`);
            }
            let storage = region.GetChanges().PopGetAccessStorage(true);
            if (info.stopped || !changeCallback || storage.length == 0) { //Not reactive
                if (staticCallback) {
                    staticCallback();
                }
                return {};
            }
            if (elementContext) {
                let scope = region.GetElementScope(elementContext);
                if (!scope && typeof elementContext !== 'string') {
                    scope = region.AddElement(elementContext, false);
                }
                if (scope) { //Add info
                    scope.trapInfoList.push(info);
                }
            }
            let ids = {};
            let onChange = (changes) => {
                if (Object.keys(ids).length == 0) {
                    return;
                }
                let myRegion = Region.Get(this.regionId_);
                if (myRegion) { //Mark changes
                    myRegion.GetChanges().PushOrigin(onChange);
                }
                try {
                    if (!info.stopped && changeCallback === true) {
                        info.stopped = (callback(changes) === false);
                    }
                    else if (!info.stopped && changeCallback !== true) {
                        info.stopped = (changeCallback(changes) === false);
                    }
                }
                catch (err) {
                    this.ReportError(err, `InlineJs.Region<${this.regionId_}>.State.TrapAccess`);
                }
                if (myRegion) {
                    myRegion.GetChanges().PopOrigin();
                }
                if (info.stopped) { //Unsubscribe all subscribed
                    for (let regionId in ids) {
                        let myRegion = Region.Get(regionId);
                        if (myRegion) {
                            ids[regionId].forEach(id => myRegion.GetChanges().Unsubscribe(id));
                        }
                    }
                }
            };
            let uniqueEntries = {};
            storage.forEach(info => uniqueEntries[info.path] = info.regionId);
            info.callback = onChange;
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
        static Evaluate(regionId, elementContext, expression, useWindow = false, ignoreRemoved = true) {
            if (!(expression = expression.trim())) {
                return null;
            }
            let region = Region.Get(regionId);
            if (!region) {
                return null;
            }
            if (ignoreRemoved && !region.ElementExists(elementContext)) {
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
                `)).bind(state.GetElementContext())(Evaluator.GetProxy(regionId, region.GetRootProxy().GetNativeProxy()));
            }
            catch (err) {
                result = null;
                let element = state.GetElementContext();
                let elementId = element.getAttribute(Region.GetElementKeyName());
                state.ReportError(err, `InlineJs.Region<${regionId}>.Evaluator.Evaluate(${element.tagName}#${elementId}, ${expression})`);
            }
            state.PopElementContext();
            RegionMap.scopeRegionIds.Pop();
            return result;
        }
        static GetContextKey() {
            return '__InlineJS_Context__';
        }
        static GetProxy(regionId, proxy) {
            if (regionId in Evaluator.cachedProxy_) {
                return Evaluator.cachedProxy_[regionId];
            }
            return (Evaluator.cachedProxy_[regionId] = Evaluator.CreateProxy(proxy));
        }
        static CreateProxy(proxy) {
            return new window.Proxy({}, {
                get(target, prop) {
                    if ((!(prop in proxy) || ('__InlineJS_Target__' in proxy) && !(prop in proxy['__InlineJS_Target__'])) && (prop in window)) {
                        return window[prop]; //Use window
                    }
                    return proxy[prop];
                },
                set(target, prop, value) {
                    if ((!(prop in proxy) || ('__InlineJS_Target__' in proxy) && !(prop in proxy['__InlineJS_Target__'])) && (prop in window)) {
                        window[prop] = value; //Use window
                        return true;
                    }
                    try {
                        proxy[prop] = value;
                    }
                    catch (err) {
                        return false;
                    }
                    return true;
                },
                deleteProperty(target, prop) {
                    if ((!(prop in proxy) || ('__InlineJS_Target__' in proxy) && !(prop in proxy['__InlineJS_Target__'])) && (prop in window)) {
                        delete window[prop]; //Use window
                        return true;
                    }
                    try {
                        delete proxy[prop];
                    }
                    catch (err) {
                        return false;
                    }
                    return true;
                },
                has(target, prop) {
                    return (Reflect.has(target, prop) || (prop in proxy));
                }
            });
        }
        static RemoveProxyCache(regionId) {
            if (regionId in Evaluator.cachedProxy_) {
                delete Evaluator.cachedProxy_[regionId];
            }
        }
    }
    Evaluator.cachedProxy_ = {};
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
                return ((value instanceof ChildProxy) ? value.GetNativeProxy() : value);
            }
        }
        return actualValue;
    }
    function AddChanges(changes, type, path, prop) {
        if (!changes) {
            return;
        }
        let change = {
            regionId: changes.GetRegionId(),
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
        if (exists && value === target[prop]) {
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
            this.proxies_ = {};
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
                        let local = region.GetLocal((contextElement || region.GetRootElement()), stringProp);
                        if (!(local instanceof NoResult)) { //Local found
                            return ((local instanceof Value) ? local.Get() : local);
                        }
                        let global = Region.GetGlobal(regionId, stringProp);
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
                if (Region.IsEqual(value, previousValue)) {
                    return true;
                }
                previousValue = Region.DeepCopy(value);
                return callback(value);
            };
            region.GetState().TrapGetAccess(() => {
                let value = Evaluator.Evaluate(regionId, elementContext, `$use(${expression})`);
                previousValue = Region.DeepCopy(value);
                return (skipFirst || callback(value));
            }, onChange, elementContext);
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
            Region.AddGlobal('$proxy', (regionId) => Region.Get(regionId).GetRootProxy().GetNativeProxy());
            Region.AddGlobal('$refs', (regionId) => Region.Get(regionId).GetRefs());
            Region.AddGlobal('$self', (regionId) => Region.Get(regionId).GetState().GetElementContext());
            Region.AddGlobal('$root', (regionId) => Region.Get(regionId).GetRootElement());
            Region.AddGlobal('$parent', (regionId) => Region.Get(regionId).GetElementAncestor(true, 0));
            Region.AddGlobal('$getAncestor', (regionId) => (index) => Region.Get(regionId).GetElementAncestor(true, index));
            Region.AddGlobal('$form', (regionId) => Region.Get(regionId).GetElementWith(true, resolvedTarget => (resolvedTarget instanceof HTMLFormElement)));
            Region.AddGlobal('$componentKey', (regionId) => Region.Get(regionId).GetComponentKey());
            Region.AddGlobal('$component', () => (id) => Region.Find(id, true));
            Region.AddGlobal('$locals', (regionId) => Region.Get(regionId).GetElementScope(true).locals);
            Region.AddGlobal('$getLocals', (regionId) => (element) => Region.Get(regionId).AddElement(element).locals);
            Region.AddGlobal('$watch', (regionId, contextElement) => (expression, callback) => {
                RootProxy.Watch(regionId, contextElement, expression, value => callback.call(Region.Get(regionId).GetRootProxy().GetNativeProxy(), value), true);
            });
            Region.AddGlobal('$when', (regionId, contextElement) => (expression, callback) => {
                RootProxy.Watch(regionId, contextElement, expression, value => (!value || callback.call(Region.Get(regionId).GetRootProxy().GetNativeProxy(), value)), false);
            });
            Region.AddGlobal('$once', (regionId, contextElement) => (expression, callback) => {
                RootProxy.Watch(regionId, contextElement, expression, value => (!value || (callback.call(Region.Get(regionId).GetRootProxy().GetNativeProxy(), value) && false)), false);
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
            }, (regionId) => {
                let region = Region.GetCurrent(regionId);
                if (region) {
                    region.GetChanges().FlushRawGetAccesses();
                }
                return true;
            });
            Region.AddGlobal('$static', (regionId) => (value) => {
                let region = Region.GetCurrent(regionId);
                if (region) {
                    region.GetChanges().DiscardGetAccessesCheckpoint();
                }
                return value;
            }, (regionId) => {
                let region = Region.GetCurrent(regionId);
                if (region) {
                    region.GetChanges().AddGetAccessesCheckpoint();
                }
                return true;
            });
            Region.AddGlobal('$raw', () => (value) => {
                return ((Region.IsObject(value) && '__InlineJS_Target__' in value) ? value.__InlineJS_Target__ : value);
            });
            Region.AddGlobal('$or', () => (...values) => {
                for (let i = 0; i < values.length; ++i) {
                    if (values[i]) {
                        return true;
                    }
                }
                return false;
            });
            Region.AddGlobal('$and', () => (...values) => {
                for (let i = 0; i < values.length; ++i) {
                    if (!values[i]) {
                        return false;
                    }
                }
                return true;
            });
            Region.AddGlobal('$conditional', () => (condition, trueValue, falseValue) => {
                return (condition ? trueValue : falseValue);
            });
            Region.AddGlobal('$evaluate', (regionId, contextElement) => (value, useWindow = false, ...args) => {
                let region = Region.Get(regionId);
                return (region ? CoreDirectiveHandlers.Evaluate(region, contextElement, value, useWindow, ...args) : null);
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
            this.proxies_ = {};
            let regionId = this.regionId_, parentPath = this.parentPath_, name = this.name_, isArray = Array.isArray(this.target_), tempProxy = new window.Proxy(this.target_, {
                get(target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return ProxyGetter(target, prop.toString(), regionId, parentPath, name);
                },
                set(target, prop, value) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.set(target, prop, value);
                    }
                    return ProxySetter(target, prop.toString(), value, regionId, parentPath, name);
                },
            });
            let handler = {
                get(target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    if ('__InlineJS_Target__' in target) {
                        return target[prop];
                    }
                    if (isArray && typeof prop === 'string') {
                        if (prop === 'unshift') {
                            return (...items) => {
                                let path = (parentPath ? `${parentPath}.${name}.unshift` : `${name}.unshift`);
                                AddChanges(Region.Get(regionId).GetChanges(), 'set', `${path}.${items.length}`, `${items.length}`);
                                return tempProxy['unshift'](...items);
                            };
                        }
                        else if (prop === 'shift') {
                            return () => {
                                let path = (parentPath ? `${parentPath}.${name}.shift` : `${name}.shift`);
                                AddChanges(Region.Get(regionId).GetChanges(), 'set', `${path}.1`, '1');
                                return tempProxy['shift']();
                            };
                        }
                        else if (prop === 'splice') {
                            return (start, deleteCount, ...items) => {
                                if (target.length <= start) {
                                    return tempProxy['splice'](start, deleteCount, ...items);
                                }
                                let path = (parentPath ? `${parentPath}.${name}.splice` : `${name}.splice`);
                                AddChanges(Region.Get(regionId).GetChanges(), 'set', `${path}.${start}.${deleteCount}.${items.length}`, `${start}.${deleteCount}.${items.length}`);
                                return tempProxy['splice'](start, deleteCount, ...items);
                            };
                        }
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
    DirectiveHandlerManager.directiveHandlers_ = {};
    DirectiveHandlerManager.bulkDirectiveHandlers_ = new Array();
    InlineJS.DirectiveHandlerManager = DirectiveHandlerManager;
    class CoreDirectiveHandlers {
        static Noop(region, element, directive) {
            return DirectiveHandlerReturn.Handled;
        }
        static Data(region, element, directive) {
            let proxy = region.GetRootProxy().GetNativeProxy(), data = CoreDirectiveHandlers.Evaluate(region, element, directive.value, true);
            if (!Region.IsObject(data)) {
                data = {};
            }
            if (data.$locals) { //Add local fields
                for (let field in data.$locals) {
                    region.AddLocal(element, field, data.$locals[field]);
                }
            }
            if ((data.$enableOptimizedBinds === true || data.$enableOptimizedBinds === false) && region.GetRootElement() === element) {
                region.SetOptimizedBindsState(data.$enableOptimizedBinds);
            }
            if (data.$component && region.GetRootElement() === element) {
                Region.AddComponent(region, element, data.$component);
            }
            let target, scope = (Region.Infer(element) || region).AddElement(element);
            let addedKeys = Object.keys(data).filter(key => (key !== '$locals' && key !== '$component' && key !== '$enableOptimizedBinds' && key !== '$init'));
            scope.isRoot = true;
            if (region.GetRootElement() !== element) {
                let key = region.GenerateScopeId();
                target = {};
                proxy[key] = target;
                scope.uninitCallbacks.push(() => {
                    delete proxy[key];
                });
                let regionId = region.GetId();
                region.AddLocal(element, '$scope', CoreDirectiveHandlers.CreateProxy((prop) => {
                    let myRegion = Region.Get(regionId), myProxy = myRegion.GetRootProxy().GetNativeProxy();
                    if (prop in target) {
                        return myProxy[key][prop];
                    }
                    if (prop === 'parent') {
                        return myRegion.GetLocal(myRegion.GetElementAncestor(element, 0), '$scope', true);
                    }
                    if (prop === 'key') {
                        return key;
                    }
                    return myProxy[key][prop];
                }, ['parent', 'key'], (target, prop, value) => {
                    if (prop in target || typeof prop !== 'string') {
                        target[prop] = value;
                        return true;
                    }
                    let myRegion = Region.Get(regionId), myProxy = myRegion.GetRootProxy().GetNativeProxy();
                    if ('__InlineJS_Target__' in myProxy[key] && prop in myProxy[key]['__InlineJS_Target__']) {
                        myProxy[key][prop] = value;
                        return true;
                    }
                    if (prop === 'parent' || prop === 'key') {
                        return false;
                    }
                    myProxy[key][prop] = value;
                    return true;
                }));
            }
            else {
                target = proxy['__InlineJS_Target__'];
                region.AddLocal(element, '$scope', proxy);
            }
            addedKeys.forEach((key) => {
                target[key] = data[key];
            });
            if (data.$init) {
                RegionMap.scopeRegionIds.Push(region.GetId());
                region.GetState().PushElementContext(element);
                try {
                    data.$init.call(proxy, region);
                }
                catch (err) { }
                region.GetState().PopElementContext();
                RegionMap.scopeRegionIds.Pop();
            }
            return DirectiveHandlerReturn.Handled;
        }
        static Locals(region, element, directive) {
            let data = CoreDirectiveHandlers.Evaluate(region, element, directive.value, false);
            if (!Region.IsObject(data)) {
                return DirectiveHandlerReturn.Handled;
            }
            for (let field in data) {
                region.AddLocal(element, field, data[field]);
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
            }, true, element);
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
            region.AddElement(element, true).uninitCallbacks.push(() => CoreDirectiveHandlers.EvaluateAlways(Region.Get(regionId), element, directive.value));
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
                }, true, element);
                return DirectiveHandlerReturn.Handled;
            }
            if (validator && !validator(directive.arg.key)) {
                return DirectiveHandlerReturn.Nil;
            }
            region.GetState().TrapGetAccess(() => {
                callback(directive.arg.key, CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }, true, element);
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
                onChange = (value) => element.innerHTML = CoreDirectiveHandlers.ToString(value);
            }
            else if (element.tagName === 'INPUT') {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    onChange = (value) => {
                        let valueAttr = element.getAttribute('value');
                        if (valueAttr) {
                            if (value && Array.isArray(value)) {
                                element.checked = (value.findIndex(item => (item == valueAttr)) != -1);
                            }
                            else {
                                element.checked = (value == valueAttr);
                            }
                        }
                        else {
                            element.checked = !!value;
                        }
                    };
                }
                else {
                    onChange = (value) => element.value = CoreDirectiveHandlers.ToString(value);
                }
            }
            else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                onChange = (value) => element.value = CoreDirectiveHandlers.ToString(value);
            }
            else { //Unknown
                onChange = (value) => element.textContent = CoreDirectiveHandlers.ToString(value);
            }
            let animator = null;
            if (directive.arg.key === 'animate') {
                if (!directive.arg.options.includes('counter')) {
                    directive.arg.options.unshift('counter');
                }
                animator = CoreDirectiveHandlers.GetAnimator(region, true, element, directive.arg.options, false);
            }
            region.GetState().TrapGetAccess(() => {
                if (!callback || callback()) {
                    if (animator) {
                        animator(true, null, null, {
                            value: CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value),
                            callback: (result) => {
                                onChange(result);
                            },
                        });
                    }
                    else {
                        onChange(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
                    }
                }
            }, true, element);
            return DirectiveHandlerReturn.Handled;
        }
        static On(region, element, directive) {
            if (!directive.arg || !directive.arg.key) {
                return DirectiveHandlerReturn.Nil;
            }
            const mobileMap = {
                click: 'touchend',
                mouseup: 'touchend',
                mousedown: 'touchstart',
                mousemove: 'touchmove',
            };
            let options = {
                outside: false,
                prevent: false,
                stop: false,
                immediate: false,
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
                else if (isKey) {
                    let key = Processor.GetCamelCaseDirectiveName(option, true);
                    keyOptions.keys_.push((key in Region.keyMap) ? Region.keyMap[key] : key);
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
                if (stoppable && options.immediate) {
                    e.stopImmediatePropagation();
                }
                try {
                    if (myRegion) {
                        myRegion.GetState().PushEventContext(e);
                    }
                    CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value, false, e);
                }
                finally {
                    if (myRegion) {
                        myRegion.GetState().PopEventContext();
                    }
                }
            };
            let event = region.ExpandEvent(directive.arg.key, element), mappedEvent = null;
            if (directive.arg.options.includes('mobile') && (event in mobileMap)) {
                mappedEvent = mobileMap[event];
            }
            if (!options.outside) {
                stoppable = true;
                if (options.window || options.document) {
                    let target = (options.window ? window : document);
                    target.addEventListener(event, onEvent);
                    if (mappedEvent) {
                        target.addEventListener(mappedEvent, onEvent);
                    }
                    region.AddElement(element).uninitCallbacks.push(() => {
                        target.removeEventListener(event, onEvent);
                        if (mappedEvent) {
                            target.removeEventListener(mappedEvent, onEvent);
                        }
                    });
                }
                else {
                    element.addEventListener(event, onEvent);
                    if (mappedEvent) {
                        element.addEventListener(mappedEvent, onEvent);
                    }
                }
            }
            else {
                stoppable = false;
                region.AddOutsideEventCallback(element, event, onEvent);
                if (mappedEvent) {
                    region.AddOutsideEventCallback(element, mappedEvent, onEvent);
                }
            }
            return DirectiveHandlerReturn.Handled;
        }
        static Model(region, element, directive) {
            let regionId = region.GetId(), doneInput = false, options = {
                out: false,
                in: false,
                lazy: false,
                number: false,
                trim: false,
                array: false,
            };
            directive.arg.options.forEach((option) => {
                if (option in options) {
                    options[option] = true;
                }
            });
            if (!options.out) { //Bidirectional
                CoreDirectiveHandlers.TextOrHtml(region, element, directive, false, () => !doneInput);
                if (options.in) { //Output disabled
                    return DirectiveHandlerReturn.Handled;
                }
            }
            let isCheckable = false, isInput = false;
            if (element.tagName === 'INPUT') {
                isInput = true;
                isCheckable = (element.type === 'checkbox' || element.type === 'radio');
            }
            let isSelect = (!isInput && element.tagName === 'SELECT');
            let isUnknown = (!isInput && !isSelect && element.tagName !== 'TEXTAREA');
            options.array = (options.array && isCheckable);
            let parseValue = (value) => {
                let parsedValue = (options.number ? parseFloat(value) : null);
                return ((parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) ? (value ? `'${value}'` : 'null') : parsedValue.toString());
            };
            let convertValue = (value, target) => {
                if (typeof value !== 'string') {
                    let joined = value.reduce((cummulative, item) => (cummulative ? (`${cummulative},${parseValue(item)}`) : `${parseValue(item)}`), '');
                    return `[${joined}]`;
                }
                if (options.trim) {
                    value = value.trim();
                }
                if (isCheckable) {
                    if (!target.checked) {
                        return 'false';
                    }
                    let valueAttr = element.getAttribute('value');
                    if (valueAttr) {
                        return `'${valueAttr}'`;
                    }
                    return 'true';
                }
                if (!options.number) {
                    return `'${value}'`;
                }
                let parsedValue = parseInt(value);
                if (parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) {
                    return (value ? `'${value}'` : 'null');
                }
                return parsedValue.toString();
            };
            let getValue = (target) => {
                if (!isSelect || !target.multiple) {
                    return null;
                }
                return Array.from(target.options).filter(option => option.selected).map(option => (option.value || option.text));
            };
            let setValue = (value, target) => {
                if (options.array) {
                    let evaluatedValue = Evaluator.Evaluate(regionId, element, directive.value), valueAttr = element.getAttribute('value');
                    if (evaluatedValue && Array.isArray(evaluatedValue) && valueAttr) {
                        let index = evaluatedValue.findIndex(item => (item == valueAttr));
                        if (index == -1 && target.checked) {
                            if (options.number) {
                                let parsedValue = parseFloat(valueAttr);
                                evaluatedValue.push((parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) ? valueAttr : parsedValue);
                            }
                            else { //No conversion necessary
                                evaluatedValue.push(valueAttr);
                            }
                        }
                        else if (index != -1 && !target.checked) { //Remove value from array
                            evaluatedValue.splice(index, 1);
                        }
                    }
                }
                else { //Assign
                    Evaluator.Evaluate(regionId, element, `(${directive.value})=(${convertValue((getValue(target) || value), target)})`);
                }
            };
            if (options.out && 'value' in element) { //Initial assignment
                setValue(element.value, element);
            }
            let onEvent = (e) => {
                if (isUnknown) { //Unpdate inner text
                    element.innerText = e.target.value;
                }
                doneInput = true;
                setValue(e.target.value, e.target);
                Region.Get(regionId).AddNextTickCallback(() => doneInput = false);
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
            let regionId = region.GetId(), animator = CoreDirectiveHandlers.GetAnimator(region, (directive.arg.key === 'animate'), element, directive.arg.options, false);
            if (animator) {
                let lastValue = null, showOnly = directive.arg.options.includes('show'), hideOnly = (!showOnly && directive.arg.options.includes('hide'));
                region.GetState().TrapGetAccess(() => {
                    lastValue = !!CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                    element.style.display = (lastValue ? showValue : 'none');
                }, () => {
                    if (lastValue != (!!CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value))) {
                        lastValue = !lastValue;
                        if ((lastValue ? !hideOnly : !showOnly)) {
                            animator(lastValue, (show) => {
                                if (show) {
                                    element.style.display = showValue;
                                }
                            }, (show) => {
                                if (!show) {
                                    element.style.display = 'none';
                                }
                            });
                        }
                        else { //No animation
                            element.style.display = (lastValue ? showValue : 'none');
                        }
                    }
                }, element);
            }
            else {
                region.GetState().TrapGetAccess(() => {
                    element.style.display = (CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value) ? showValue : 'none');
                }, true, element);
            }
            return DirectiveHandlerReturn.Handled;
        }
        static If(region, element, directive) {
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original, () => {
                if (itemInfo) {
                    CoreDirectiveHandlers.RemoveIfOrEachItem(itemInfo, info);
                }
            });
            if (!info) {
                return DirectiveHandlerReturn.Nil;
            }
            let lastValue = false, itemInfo = null, animate = (directive.arg.key === 'animate');
            info.subscriptions = region.GetState().TrapGetAccess(() => {
                let value = !!CoreDirectiveHandlers.EvaluateIfOrEach(element, info, directive.value);
                if (value != lastValue) {
                    lastValue = value;
                    if (value) { //Insert into parent
                        itemInfo = CoreDirectiveHandlers.InsertIfOrEachItem(element, info, animate, directive.arg.options);
                    }
                    else if (itemInfo) {
                        CoreDirectiveHandlers.RemoveIfOrEachItem(itemInfo, info);
                    }
                }
            }, true, null);
            return DirectiveHandlerReturn.QuitAll;
        }
        static Each(region, element, directive) {
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original, () => {
                empty(Region.Get(info.regionId));
            }), isCount = false, isReverse = false;
            if (!info) {
                return DirectiveHandlerReturn.Nil;
            }
            if (directive.arg) {
                isCount = directive.arg.options.includes('count');
                isReverse = directive.arg.options.includes('reverse');
            }
            let options = {
                clones: null,
                items: null,
                itemsTarget: null,
                count: 0,
                path: null,
                rangeValue: null,
            };
            let valueKey = '', matches = directive.value.match(/^(.+)? as[ ]+([A-Za-z_][0-9A-Za-z_$]*)[ ]*$/), expression, animate = (directive.arg.key === 'animate');
            if (matches && 2 < matches.length) {
                expression = matches[1];
                valueKey = matches[2];
            }
            else {
                expression = directive.value;
            }
            let scopeId = region.GenerateScopeId();
            let addSizeChange = (myRegion) => {
                myRegion.GetChanges().Add({
                    regionId: info.regionId,
                    type: 'set',
                    path: `${scopeId}.$each.count`,
                    prop: 'count',
                    origin: myRegion.GetChanges().GetOrigin()
                });
            };
            let locals = (myRegion, cloneInfo) => {
                myRegion.AddLocal(cloneInfo.itemInfo.clone, '$each', CoreDirectiveHandlers.CreateProxy((prop) => {
                    let innerRegion = Region.Get(info.regionId);
                    if (prop === 'count') {
                        innerRegion.GetChanges().AddGetAccess(`${scopeId}.$each.count`);
                        return options.count;
                    }
                    if (prop === 'index') {
                        if (typeof cloneInfo.key === 'number') {
                            let myScope = innerRegion.AddElement(cloneInfo.itemInfo.clone);
                            innerRegion.GetChanges().AddGetAccess(`${myScope.key}.$each.index`);
                        }
                        return cloneInfo.key;
                    }
                    if (prop === 'value') {
                        return options.items[cloneInfo.key];
                    }
                    if (prop === 'collection') {
                        return options.items;
                    }
                    if (prop === 'parent') {
                        return innerRegion.GetLocal(cloneInfo.itemInfo.clone.parentElement, '$each', true);
                    }
                    return null;
                }, ['count', 'index', 'value', 'collection', 'parent']));
                if (valueKey) {
                    myRegion.AddLocal(cloneInfo.itemInfo.clone, valueKey, new Value(() => {
                        return options.items[cloneInfo.key];
                    }));
                }
            };
            let append = (myRegion, key) => {
                if (typeof key !== 'string') {
                    if (typeof key === 'number') {
                        for (let index = key; index < options.clones.length; ++index) {
                            let cloneInfo = options.clones[index], myScope = myRegion.GetElementScope(cloneInfo.itemInfo.clone);
                            if (myScope) {
                                AddChanges(myRegion.GetChanges(), 'set', `${myScope.key}.$each.index`, 'index');
                            }
                            ++cloneInfo.key;
                        }
                    }
                    else { //Array
                        key = options.clones.length;
                    }
                    CoreDirectiveHandlers.InsertIfOrEachItem(element, info, animate, directive.arg.options, (itemInfo) => {
                        if (key < options.clones.length) {
                            options.clones.splice(key, 0, {
                                key: key,
                                itemInfo: itemInfo,
                            });
                        }
                        else { //Append
                            options.clones.push({
                                key: key,
                                itemInfo: itemInfo,
                            });
                        }
                        locals(myRegion, options.clones[key]);
                    }, key);
                }
                else { //Map
                    CoreDirectiveHandlers.InsertIfOrEachItem(element, info, animate, directive.arg.options, (itemInfo) => {
                        options.clones[key] = {
                            key: key,
                            itemInfo: itemInfo,
                        };
                        locals(myRegion, options.clones[key]);
                    }, Object.keys(options.items).indexOf(key));
                }
            };
            let empty = (myRegion) => {
                if (!Array.isArray(options.clones)) {
                    Object.keys(options.clones || {}).forEach((key) => {
                        let myInfo = options.clones[key];
                        CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info);
                    });
                }
                else { //Array
                    (options.clones || []).forEach(myInfo => CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info));
                }
                options.clones = null;
                options.path = null;
            };
            let getRange = (from, to) => {
                if (from < to) {
                    return Array.from({ length: (to - from) }, (value, key) => (key + from));
                }
                return Array.from({ length: (from - to) }, (value, key) => (from - key));
            };
            let arrayChangeHandler = (myRegion, change, isOriginal) => {
                if (isOriginal) {
                    if (change.path === `${options.path}.unshift.${change.prop}`) {
                        let count = (Number.parseInt(change.prop) || 0);
                        options.count += count;
                        addSizeChange(myRegion);
                        for (let index = 0; index < count; ++index) {
                            append(myRegion, index);
                        }
                    }
                    else if (change.path === `${options.path}.shift.${change.prop}`) {
                        let count = (Number.parseInt(change.prop) || 0);
                        options.count -= count;
                        addSizeChange(myRegion);
                        options.clones.splice(0, count).forEach(myInfo => CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info));
                        options.clones.forEach((cloneInfo) => {
                            let myScope = myRegion.GetElementScope(cloneInfo.itemInfo.clone);
                            if (myScope) {
                                AddChanges(myRegion.GetChanges(), 'set', `${myScope.key}.$each.index`, 'index');
                            }
                            cloneInfo.key -= count;
                        });
                    }
                    else if (change.path === `${options.path}.splice.${change.prop}`) {
                        let parts = change.prop.split('.'); //start.deleteCount.itemsCount
                        let index = (Number.parseInt(parts[0]) || 0);
                        let itemsCount = (Number.parseInt(parts[2]) || 0);
                        let removedClones = options.clones.splice(index, (Number.parseInt(parts[1]) || 0));
                        removedClones.forEach(myInfo => CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info));
                        for (let i = index; i < (itemsCount + index); ++i) {
                            append(myRegion, i);
                        }
                        options.count += (itemsCount - removedClones.length);
                        addSizeChange(myRegion);
                        for (let i = (index + itemsCount); i < options.clones.length; ++i) {
                            let cloneInfo = options.clones[i], myScope = myRegion.GetElementScope(cloneInfo.itemInfo.clone);
                            if (myScope) {
                                AddChanges(myRegion.GetChanges(), 'set', `${myScope.key}.$each.index`, 'index');
                            }
                            cloneInfo.key -= removedClones.length;
                        }
                    }
                    else if (change.path === `${options.path}.push.${change.prop}`) {
                        let count = (Number.parseInt(change.prop) || 0);
                        options.count += count;
                        addSizeChange(myRegion);
                        for (let index = 0; index < count; ++index) {
                            append(myRegion);
                        }
                    }
                    if (change.path !== `${options.path}.${change.prop}`) {
                        return;
                    }
                }
                let index = ((change.prop === 'length') ? null : Number.parseInt(change.prop));
                if (!index && index !== 0) { //Not an index
                    return;
                }
                if (change.type === 'set' && options.clones.length <= index) { //Element added
                    ++options.count;
                    addSizeChange(myRegion);
                    append(myRegion);
                }
                else if (change.type === 'delete' && index < options.clones.length) {
                    options.clones.splice(index, 1).forEach((myInfo) => {
                        --options.count;
                        addSizeChange(myRegion);
                        CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info);
                    });
                }
            };
            let mapChangeHandler = (myRegion, change, isOriginal) => {
                if (isOriginal && change.path !== `${options.path}.${change.prop}`) {
                    return;
                }
                let key = change.prop;
                if (change.type === 'set' && !(key in options.clones)) { //Element added
                    ++options.count;
                    addSizeChange(myRegion);
                    append(myRegion, key);
                }
                else if (change.type === 'delete' && (key in options.clones)) {
                    --options.count;
                    addSizeChange(myRegion);
                    let myInfo = options.clones[key];
                    CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info);
                }
            };
            let changeHandler;
            let initOptions = (target, count, handler, createClones) => {
                if (Region.IsObject(target) && '__InlineJS_Path__' in target) {
                    options.path = target['__InlineJS_Path__'];
                }
                options.items = target;
                options.itemsTarget = getTarget(target);
                options.count = count;
                options.clones = createClones();
                changeHandler = handler;
            };
            let init = (myRegion, target) => {
                let isRange = (typeof target === 'number' && Number.isInteger(target));
                if (isRange && !isReverse && options.rangeValue !== null && target <= options.count) { //Range value decrement
                    let diff = (options.count - target);
                    if (0 < diff) {
                        options.count = target;
                        addSizeChange(myRegion);
                        options.items.splice(target, diff);
                        options.clones.splice(target, diff).forEach(myInfo => CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info));
                    }
                    return true;
                }
                if (!isRange || isReverse || options.rangeValue === null) {
                    empty(myRegion);
                }
                if (isRange) {
                    let offset = (isCount ? 1 : 0), items;
                    if (target < 0) {
                        items = (isReverse ? getRange((target - offset + 1), (1 - offset)) : getRange(-offset, (target - offset)));
                    }
                    else {
                        items = (isReverse ? getRange((target + offset - 1), (offset - 1)) : getRange(offset, (target + offset)));
                    }
                    if (!isReverse && options.rangeValue !== null) { //Ranged value increment
                        let addedItems = items.splice(options.count);
                        options.count = target;
                        addSizeChange(myRegion);
                        options.items = options.items.concat(addedItems);
                        addedItems.forEach(item => append(myRegion));
                        options.rangeValue = target;
                    }
                    else {
                        options.rangeValue = target;
                        initOptions(items, items.length, arrayChangeHandler, () => new Array());
                        items.forEach(item => append(myRegion));
                    }
                }
                else if (Array.isArray(target)) {
                    let items = getTarget(target);
                    options.rangeValue = null;
                    initOptions(target, items.length, arrayChangeHandler, () => new Array());
                    items.forEach(item => append(myRegion));
                }
                else if (Region.IsObject(target)) {
                    let keys = Object.keys(getTarget(target));
                    options.rangeValue = null;
                    initOptions(target, keys.length, mapChangeHandler, () => ({}));
                    keys.forEach(key => append(myRegion, key));
                }
                return true;
            };
            let getTarget = (target) => {
                return (((Array.isArray(target) || Region.IsObject(target)) && ('__InlineJS_Target__' in target)) ? target['__InlineJS_Target__'] : target);
            };
            info.subscriptions = region.GetState().TrapGetAccess(() => {
                let myRegion = Region.Get(info.regionId), target = CoreDirectiveHandlers.EvaluateIfOrEach(element, info, expression);
                if (element.parentElement) {
                    element.parentElement.removeChild(element);
                }
                if (!target && target !== 0) {
                    return false;
                }
                return init(myRegion, target);
            }, (changes) => {
                if (!changeHandler) {
                    return false;
                }
                let myRegion = Region.Get(info.regionId), hasBeenInit = false;
                changes.forEach((change) => {
                    if ('original' in change) { //Bubbled change
                        changeHandler(myRegion, change.original, true);
                    }
                    else if (!hasBeenInit && change.type === 'set' && (change.path === options.path || options.rangeValue !== null)) { //Target changed
                        let target = CoreDirectiveHandlers.EvaluateIfOrEach(element, info, expression);
                        if (!target && target !== 0) {
                            return false;
                        }
                        if (getTarget(target) !== options.itemsTarget) {
                            hasBeenInit = init(myRegion, target);
                        }
                    }
                    else if (change.type === 'delete' && change.path === options.path) { //Item deleted
                        changeHandler(myRegion, change, false);
                    }
                });
                return true;
            }, null);
            return DirectiveHandlerReturn.QuitAll;
        }
        static InitIfOrEach(region, element, except, onUninit) {
            if (!element.parentElement || region.GetRootElement() === element) {
                return null;
            }
            let elScopeKey = Region.GetElementKeyName(), attributes = new Array(), scope = region.AddElement(element), scopeKey = element.getAttribute(elScopeKey);
            let info = {
                regionId: region.GetId(),
                scopeKey: scopeKey,
                parent: element.parentElement,
                marker: CoreDirectiveHandlers.GetChildElementIndex(element),
                attributes: attributes,
            };
            CoreDirectiveHandlers.BindOnContentLoad(region, element, () => {
                onUninit();
                CoreDirectiveHandlers.UninitIfOrEach(region, info);
            });
            element.parentElement.removeChild(element);
            Array.from(element.attributes).forEach((attr) => {
                element.removeAttribute(attr.name);
                if (attr.name !== elScopeKey && attr.name !== except) {
                    let directive = Processor.GetDirectiveWith(attr.name, attr.value);
                    attributes.push({ name: (directive ? directive.expanded : attr.name), value: attr.value });
                }
            });
            if (scope) {
                scope.preserveSubscriptions = true;
            }
            return info;
        }
        static UninitIfOrEach(region, info) {
            Object.keys(info.subscriptions || {}).forEach((key) => {
                let targetRegion = Region.Get(key);
                if (targetRegion) {
                    let changes = targetRegion.GetChanges();
                    info.subscriptions[key].forEach(id => changes.Unsubscribe(id));
                }
                delete info.subscriptions[key];
            });
        }
        static InsertIfOrEach(regionId, element, info, callback, offset = 0, insertAttributes = true) {
            if (!element.parentElement) {
                element.removeAttribute(Region.GetElementKeyName());
                CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, element, (info.marker + (offset || 0)));
            }
            if (insertAttributes) {
                info.attributes.forEach(attr => element.setAttribute(attr.name, attr.value));
            }
            if (callback) {
                callback();
            }
            Processor.All((Region.Infer(element) || Region.Get(regionId) || Bootstrap.CreateRegion(element)), element);
        }
        static InsertIfOrEachItem(element, info, animate, options, callback, offset = 0) {
            let clone = element.cloneNode(true);
            let animator = (animate ? CoreDirectiveHandlers.GetAnimator(Region.Get(info.regionId), true, clone, options) : null);
            CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, clone, (info.marker + offset)); //Temporarily insert element into DOM
            let itemInfo = {
                clone: clone,
                animator: animator,
                onLoadList: new Array(),
            };
            let elementScope = Region.Get(info.regionId).AddElement(clone, true);
            if (elementScope) {
                elementScope.locals['$contentLoad'] = CoreDirectiveHandlers.CreateContentLoadProxy(itemInfo.onLoadList);
                CoreDirectiveHandlers.BindOnContentLoad(Region.Get(info.regionId), clone.parentElement, () => {
                    itemInfo.onLoadList = CoreDirectiveHandlers.AlertContentLoad(itemInfo.onLoadList);
                });
            }
            if (callback) {
                callback(itemInfo);
            }
            if (animator) { //Animate view
                animator(true, null, () => {
                    if (clone.parentElement) { //Execute directives
                        CoreDirectiveHandlers.InsertIfOrEach(info.regionId, clone, info, null, 0, true);
                    }
                });
            }
            else { //Immediate insertion
                CoreDirectiveHandlers.InsertIfOrEach(info.regionId, clone, info, null, 0, true);
            }
            return itemInfo;
        }
        static RemoveIfOrEachItem(itemInfo, info) {
            let afterRemove = () => {
                Region.Get(info.regionId).MarkElementAsRemoved(itemInfo.clone);
                itemInfo.onLoadList = CoreDirectiveHandlers.AlertContentLoad(itemInfo.onLoadList);
            };
            if (itemInfo.animator) { //Animate view
                itemInfo.animator(false, null, () => {
                    if (itemInfo.clone.parentElement) {
                        itemInfo.clone.parentElement.removeChild(itemInfo.clone);
                        afterRemove();
                    }
                    else {
                        itemInfo.onLoadList = CoreDirectiveHandlers.AlertContentLoad(itemInfo.onLoadList);
                    }
                });
            }
            else if (itemInfo.clone.parentElement) { //Immediate removal
                itemInfo.clone.parentElement.removeChild(itemInfo.clone);
                afterRemove();
            }
            else {
                itemInfo.onLoadList = CoreDirectiveHandlers.AlertContentLoad(itemInfo.onLoadList);
            }
        }
        static EvaluateIfOrEach(element, info, expression) {
            let myRegion = Region.Get(info.regionId);
            if (!myRegion) {
                return null;
            }
            myRegion.AddLocalHandler(element, (element, prop, bubble) => {
                return myRegion.GetLocal(info.parent, prop, bubble);
            });
            let result = CoreDirectiveHandlers.EvaluateAlways(myRegion, element, expression);
            myRegion.RemoveLocalHandler(element);
            return result;
        }
        static CreateContentLoadProxy(list) {
            return CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'onUnload') {
                    return (callback, once = false) => {
                        list.push({
                            callback: callback,
                            once: once,
                        });
                    };
                }
                if (prop === 'unbindOnUnload') {
                    return (callback) => {
                        list.splice(list.findIndex(item => (item.callback === callback)), 1);
                    };
                }
                if (prop === 'getList') {
                    return () => list;
                }
            }, ['onUnload', 'unbindOnUnload', 'getList']);
        }
        static BindOnContentLoad(region, element, callback) {
            let contentLoad = region.GetLocal(element, '$contentLoad');
            if (!contentLoad || contentLoad instanceof NoResult) {
                contentLoad = Region.GetGlobalValue(region.GetId(), '$contentLoad', element);
            }
            if (contentLoad && !(contentLoad instanceof NoResult)) {
                contentLoad.onUnload(callback, true);
            }
        }
        static AlertContentLoad(list) {
            return list.filter((item) => {
                try {
                    item.callback();
                }
                catch (err) { }
                return !item.once;
            });
        }
        static CreateProxy(getter, contains, setter, target) {
            let handler = {
                get(target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return getter(prop.toString());
                },
                set(target, prop, value) {
                    return (setter && setter(target, prop, value));
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
            return new window.Proxy((target || {}), handler);
        }
        static Evaluate(region, element, expression, useWindow = false, ...args) {
            return CoreDirectiveHandlers.DoEvaluation(region, element, expression, useWindow, true, ...args);
        }
        static EvaluateAlways(region, element, expression, useWindow = false, ...args) {
            return CoreDirectiveHandlers.DoEvaluation(region, element, expression, useWindow, false, ...args);
        }
        static DoEvaluation(region, element, expression, useWindow, ignoreRemoved, ...args) {
            if (!region) {
                return null;
            }
            RegionMap.scopeRegionIds.Push(region.GetId());
            region.GetState().PushElementContext(element);
            let result;
            try {
                result = Evaluator.Evaluate(region.GetId(), element, expression, useWindow, ignoreRemoved);
                if (typeof result === 'function') {
                    result = region.Call(result, ...args);
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
        static Call(regionId, callback, ...args) {
            try {
                return Region.Get(regionId).Call(callback, ...args);
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
            if (value === true) {
                return 'true';
            }
            if (value === false) {
                return 'false';
            }
            if (typeof value === 'object' && '__InlineJS_Target__' in value) {
                return CoreDirectiveHandlers.ToString(value['__InlineJS_Target__']);
            }
            if (Region.IsObject(value) || Array.isArray(value)) {
                return JSON.stringify(value);
            }
            return value.toString();
        }
        static GetChildElementIndex(element) {
            if (!element.parentElement) {
                return -1;
            }
            for (let i = 0; i < element.parentElement.children.length; ++i) {
                if (element.parentElement.children[i] === element) {
                    return i;
                }
            }
            return -1;
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
        static GetAnimator(region, animate, element, options, always = true) {
            let animator = ((animate && CoreDirectiveHandlers.PrepareAnimation) ? CoreDirectiveHandlers.PrepareAnimation(region, element, options) : null);
            if (!animator && always) { //Use a dummy animator
                animator = (show, beforeCallback, afterCallback) => {
                    if (beforeCallback) {
                        beforeCallback(show);
                    }
                    if (afterCallback) {
                        afterCallback(show);
                    }
                };
            }
            return animator;
        }
        static AddAll() {
            DirectiveHandlerManager.AddHandler('cloak', CoreDirectiveHandlers.Noop);
            DirectiveHandlerManager.AddHandler('data', CoreDirectiveHandlers.Data);
            DirectiveHandlerManager.AddHandler('locals', CoreDirectiveHandlers.Locals);
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
    CoreDirectiveHandlers.PrepareAnimation = null;
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
                Array.from(element.children).forEach(child => Processor.All(region, child));
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
                scope[scopeKey].splice(0).forEach((callback) => {
                    try {
                        callback();
                    }
                    catch (err) {
                        region.GetState().ReportError(err, `InlineJs.Region<${region.GetId()}>.Processor.${name}(Element@${element.nodeName})`);
                    }
                });
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
            let result = DirectiveHandlerReturn.Nil, attributes = Array.from(element.attributes);
            for (let i = 0; i < attributes.length; ++i) { //Traverse attributes
                let directive = Processor.GetDirectiveWith(attributes[i].name, attributes[i].value);
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
                else if (options[i] === 'capitalize') {
                    arg.key = Processor.GetCamelCaseDirectiveName(arg.key, true);
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
        static GetCamelCaseDirectiveName(name, ucfirst = false) {
            let converted = name.replace(/-([^-])/g, (...args) => (args[1].charAt(0).toUpperCase() + args[1].slice(1)));
            return ((ucfirst && 0 < converted.length) ? (converted.charAt(0).toUpperCase() + converted.slice(1)) : converted);
        }
    }
    InlineJS.Processor = Processor;
    class Config {
        static SetDirectivePrefix(value) {
            Region.SetDirectivePrefix(value);
        }
        static GetDirectivePrefix(value) {
            return Region.directivePrfix;
        }
        static GetDirectiveName(value) {
            return `${Region.directivePrfix}-${value}`;
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
        static AddGlobalMagicProperty(name, value) {
            if (typeof value === 'function') {
                Region.AddGlobal(('$' + name), value);
            }
            else {
                Region.AddGlobal(('$' + name), () => value);
            }
        }
        static RemoveGlobalMagicProperty(name) {
            Region.RemoveGlobal(('$' + name));
        }
        static AddRegionHook(handler) {
            Bootstrap.regionHooks.push(handler);
        }
        static RemoveRegionHook(handler) {
            Bootstrap.regionHooks.splice(Bootstrap.regionHooks.indexOf(handler), 1);
        }
    }
    InlineJS.Config = Config;
    class Bootstrap {
        static Attach_(node) {
            Region.PushPostProcessCallback();
            (Bootstrap.anchors_ || [`data-${Region.directivePrfix}-data`, `${Region.directivePrfix}-data`]).forEach((anchor) => {
                (node || document).querySelectorAll(`[${anchor}]`).forEach((element) => {
                    if (!element.hasAttribute(anchor) || !document.contains(element)) { //Probably contained inside another region
                        return;
                    }
                    let region = Bootstrap.CreateRegion(element);
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
                                let directive = (mutation.target.hasAttribute(mutation.attributeName) ? Processor.GetDirectiveWith(mutation.attributeName, mutation.target.getAttribute(mutation.attributeName)) : null);
                                if (!directive) {
                                    let scope = region.GetElementScope(mutation.target);
                                    if (scope) {
                                        scope.attributeChangeCallbacks.forEach(callback => callback(mutation.attributeName));
                                    }
                                }
                                else { //Process directive
                                    Processor.DispatchDirective(region, mutation.target, directive);
                                }
                            }
                        });
                        Region.ExecutePostProcessCallbacks();
                    });
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
                    Bootstrap.regionHooks.forEach(hook => hook(region, true));
                });
            });
            Region.ExecutePostProcessCallbacks();
        }
        static Attach(anchors, node) {
            Bootstrap.anchors_ = anchors;
            Bootstrap.Attach_(node);
        }
        static Reattach(node) {
            Bootstrap.Attach_(node);
        }
        static CreateRegion(element) {
            let regionId = (Bootstrap.lastRegionId_ = (Bootstrap.lastRegionId_ || 0)), regionSubId;
            if (Bootstrap.lastRegionSubId_ === null) {
                regionSubId = (Bootstrap.lastRegionSubId_ = 0);
            }
            else if (Bootstrap.lastRegionSubId_ == (Number.MAX_SAFE_INTEGER || 9007199254740991)) { //Roll over
                regionId = ++Bootstrap.lastRegionId_;
                regionSubId = 0;
            }
            else {
                regionSubId = ++Bootstrap.lastRegionSubId_;
            }
            let stringRegionId = `rgn__${regionId}_${regionSubId}`;
            let region = new Region(stringRegionId, element, new RootProxy(stringRegionId, {}));
            return (RegionMap.entries[region.GetId()] = region);
        }
    }
    Bootstrap.lastRegionId_ = null;
    Bootstrap.lastRegionSubId_ = null;
    Bootstrap.anchors_ = null;
    Bootstrap.regionHooks = new Array();
    InlineJS.Bootstrap = Bootstrap;
    (function () {
        RootProxy.AddGlobalCallbacks();
        CoreDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
