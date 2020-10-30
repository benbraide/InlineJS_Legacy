"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var InlineJS;
(function (InlineJS) {
    var Stack = /** @class */ (function () {
        function Stack() {
            this.list_ = new Array();
        }
        Stack.prototype.Push = function (value) {
            this.list_.push(value);
        };
        Stack.prototype.Pop = function () {
            return this.list_.pop();
        };
        Stack.prototype.Peek = function () {
            return ((this.list_.length == 0) ? null : this.list_[this.list_.length - 1]);
        };
        Stack.prototype.IsEmpty = function () {
            return (this.list_.length == 0);
        };
        return Stack;
    }());
    InlineJS.Stack = Stack;
    var NoResult = /** @class */ (function () {
        function NoResult() {
        }
        return NoResult;
    }());
    InlineJS.NoResult = NoResult;
    var Value = /** @class */ (function () {
        function Value(callback_) {
            this.callback_ = callback_;
        }
        Value.prototype.Get = function () {
            return this.callback_();
        };
        return Value;
    }());
    InlineJS.Value = Value;
    var RegionMap = /** @class */ (function () {
        function RegionMap() {
        }
        RegionMap.entries = new Map();
        RegionMap.scopeRegionIds = new Stack();
        return RegionMap;
    }());
    InlineJS.RegionMap = RegionMap;
    var RootElement = /** @class */ (function () {
        function RootElement() {
        }
        return RootElement;
    }());
    InlineJS.RootElement = RootElement;
    ;
    var Region = /** @class */ (function () {
        function Region(id_, rootElement_, rootProxy_) {
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
        Region.prototype.SetDoneInit = function () {
            this.doneInit_ = true;
        };
        Region.prototype.GetDoneInit = function () {
            return this.doneInit_;
        };
        Region.prototype.GetId = function () {
            return this.id_;
        };
        Region.prototype.GetComponentKey = function () {
            return this.componentKey_;
        };
        Region.prototype.GetRootElement = function () {
            return this.rootElement_;
        };
        Region.prototype.GetElementAncestor = function (target, index) {
            var resolvedTarget = ((target === true) ? this.state_.GetElementContext() : target);
            if (!resolvedTarget || resolvedTarget === this.rootElement_) {
                return null;
            }
            var ancestor = resolvedTarget;
            for (; 0 <= index && ancestor && ancestor !== this.rootElement_; --index) {
                ancestor = ancestor.parentElement;
            }
            return ((0 <= index) ? null : ancestor);
        };
        Region.prototype.GetElementScope = function (element) {
            var key;
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
        };
        Region.prototype.GetElement = function (element) {
            if (typeof element !== 'string') {
                return element;
            }
            var scope = this.GetElementScope(element);
            return (scope ? scope.element : null);
        };
        Region.prototype.GetState = function () {
            return this.state_;
        };
        Region.prototype.GetChanges = function () {
            return this.changes_;
        };
        Region.prototype.GetRootProxy = function () {
            return this.rootProxy_;
        };
        Region.prototype.FindProxy = function (path) {
            if (path === this.rootProxy_.GetName()) {
                return this.rootProxy_;
            }
            return ((path in this.proxies_) ? this.proxies_[path] : null);
        };
        Region.prototype.AddProxy = function (proxy) {
            this.proxies_[proxy.GetPath()] = proxy;
        };
        Region.prototype.RemoveProxy = function (path) {
            delete this.proxies_[path];
        };
        Region.prototype.AddRef = function (key, element) {
            this.refs_[key] = element;
        };
        Region.prototype.GetRefs = function () {
            return this.refs_;
        };
        Region.prototype.AddElement = function (element, check) {
            if (check === void 0) { check = true; }
            if (check) { //Check for existing
                var scope = this.GetElementScope(element);
                if (scope) {
                    return scope;
                }
            }
            if (!element || (element !== this.rootElement_ && !this.rootElement_.contains(element))) {
                return null;
            }
            var id;
            if (this.lastElementId_ === null) {
                id = (this.lastElementId_ = 0);
            }
            else {
                id = ++this.lastElementId_;
            }
            var key = this.id_ + "." + id;
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
        };
        Region.prototype.RemoveElement = function (element, preserve) {
            var _this = this;
            if (preserve === void 0) { preserve = false; }
            var scope = this.GetElementScope(element);
            if (scope) {
                if (scope.paused) { //Paused removal
                    scope.paused = false;
                    return;
                }
                scope.uninitCallbacks.forEach(function (callback) {
                    try {
                        callback();
                    }
                    catch (err) {
                        _this.state_.ReportError(err, "InlineJs.Region<" + _this.id_ + ">.$uninit");
                    }
                });
                if (!preserve && !scope.preserve) {
                    scope.changeRefs.forEach(function (info) {
                        var region = Region.Get(info.regionId);
                        if (region) {
                            region.changes_.Unsubscribe(info.subscriptionId);
                        }
                    });
                    scope.element.removeAttribute(Region.GetElementKeyName());
                    Object.keys(scope.intersectionObservers).forEach(function (key) { return scope.intersectionObservers[key].unobserve(scope.element); });
                }
                else {
                    scope.preserve = !(preserve = true);
                }
                Array.from(scope.element.children).forEach(function (child) { return _this.RemoveElement(child, preserve); });
                if (!preserve) { //Delete scope
                    delete this.elementScopes_[scope.key];
                }
            }
            else if (typeof element !== 'string') {
                Array.from(element.children).forEach(function (child) { return _this.RemoveElement(child, preserve); });
            }
            if (!preserve && element === this.rootElement_) { //Remove from map
                this.AddNextTickCallback(function () {
                    if (_this.componentKey_ in Region.components_) {
                        delete Region.components_[_this.componentKey_];
                    }
                    delete RegionMap.entries[_this.id_];
                });
            }
        };
        Region.prototype.AddOutsideEventCallback = function (element, event, callback) {
            var scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true)), id = this.id_;
            if (!scope) {
                return;
            }
            if (!(event in scope.outsideEventCallbacks)) {
                scope.outsideEventCallbacks[event] = new Array();
            }
            scope.outsideEventCallbacks[event].push(callback);
            if (this.outsideEvents_.indexOf(event) == -1) {
                this.outsideEvents_.push(event);
                document.body.addEventListener(event, function (e) {
                    var myRegion = Region.Get(id);
                    if (myRegion) {
                        Object.keys(myRegion.elementScopes_).forEach(function (key) {
                            var scope = myRegion.elementScopes_[key];
                            if (e.target !== scope.element && e.type in scope.outsideEventCallbacks && !scope.element.contains(e.target)) {
                                scope.outsideEventCallbacks[e.type].forEach(function (callback) { return callback(e); });
                            }
                        });
                    }
                }, true);
            }
        };
        Region.prototype.RemoveOutsideEventCallback = function (element, event, callback) {
            var scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true)), id = this.id_;
            if (!scope || !(event in scope.outsideEventCallbacks)) {
                return;
            }
            var list = scope.outsideEventCallbacks[event];
            for (var i = 0; i < list.length; ++i) {
                if (list[i] === callback) {
                    list.splice(i, 1);
                    break;
                }
            }
        };
        Region.prototype.AddNextTickCallback = function (callback) {
            this.nextTickCallbacks_.push(callback);
            this.changes_.Schedule();
        };
        Region.prototype.ExecuteNextTick = function () {
            var _this = this;
            if (this.nextTickCallbacks_.length == 0) {
                return;
            }
            var callbacks = this.nextTickCallbacks_;
            var proxy = this.rootProxy_.GetNativeProxy();
            this.nextTickCallbacks_ = new Array();
            callbacks.forEach(function (callback) {
                try {
                    callback.call(proxy);
                }
                catch (err) {
                    _this.state_.ReportError(err, "InlineJs.Region<" + _this.id_ + ">.$nextTick");
                }
            });
        };
        Region.prototype.AddLocal = function (element, key, value) {
            var scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true));
            if (scope) {
                scope.locals = (scope.locals || new Map());
                scope.locals[key] = value;
            }
        };
        Region.prototype.GetLocal = function (element, key, bubble) {
            if (bubble === void 0) { bubble = true; }
            var scope = this.GetElementScope(element);
            if (scope && key in scope.locals) {
                return scope.locals[key];
            }
            if (!bubble || typeof element === 'string') {
                return new NoResult();
            }
            for (var ancestor = this.GetElementAncestor(element, 0); ancestor; ancestor = this.GetElementAncestor(ancestor, 0)) {
                scope = this.GetElementScope(ancestor);
                if (scope && key in scope.locals) {
                    return scope.locals[key];
                }
            }
            return new NoResult();
        };
        Region.prototype.SetObserver = function (observer) {
            this.observer_ = observer;
        };
        Region.prototype.GetObserver = function () {
            return this.observer_;
        };
        Region.prototype.ExpandEvent = function (event, element) {
            var scope = this.GetElementScope(element);
            if (!scope) {
                return event;
            }
            for (var i = 0; i < scope.eventExpansionCallbacks.length; ++i) {
                var expanded = scope.eventExpansionCallbacks[i](event);
                if (expanded !== null) {
                    return expanded;
                }
            }
            return event;
        };
        Region.prototype.Call = function (target) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            return ((target.name in this.rootProxy_.GetTarget()) ? target.call.apply(target, __spreadArrays([this.rootProxy_.GetNativeProxy()], args)) : target.apply(void 0, args));
        };
        Region.prototype.AddTemp = function (callback) {
            var key = "Region<" + this.id_ + ">.temp<" + ++this.tempCallbacksId_ + ">";
            this.tempCallbacks_[key] = callback;
            return key;
        };
        Region.prototype.CallTemp = function (key) {
            if (!(key in this.tempCallbacks_)) {
                return null;
            }
            var callback = this.tempCallbacks_[key];
            delete this.tempCallbacks_[key];
            return callback();
        };
        Region.prototype.SetOptimizedBindsState = function (enabled) {
            this.enableOptimizedBinds_ = enabled;
        };
        Region.prototype.OptimizedBindsIsEnabled = function () {
            return this.enableOptimizedBinds_;
        };
        Region.Get = function (id) {
            return ((id in RegionMap.entries) ? RegionMap.entries[id] : null);
        };
        Region.GetCurrent = function (id) {
            var scopeRegionId = RegionMap.scopeRegionIds.Peek();
            return (scopeRegionId ? Region.Get(scopeRegionId) : Region.Get(id));
        };
        Region.Infer = function (element) {
            if (!element) {
                return null;
            }
            var key = ((typeof element === 'string') ? element : element.getAttribute(Region.GetElementKeyName()));
            if (!key) {
                return null;
            }
            return Region.Get(key.split('.')[0]);
        };
        Region.AddComponent = function (region, element, key) {
            if (!key || region.rootElement_ !== element || region.componentKey_ || key in Region.components_) {
                return false;
            }
            region.componentKey_ = key;
            Region.components_[key] = region.GetId();
            return true;
        };
        Region.Find = function (key, getNativeProxy) {
            if (!key || !(key in Region.components_)) {
                return null;
            }
            var region = Region.Get(Region.components_[key]);
            return (region ? (getNativeProxy ? region.rootProxy_.GetNativeProxy() : region) : null);
        };
        Region.AddGlobal = function (key, callback) {
            Region.globals_[key] = callback;
        };
        Region.RemoveGlobal = function (key) {
            delete Region.globals_[key];
        };
        Region.GetGlobal = function (key) {
            return ((key in Region.globals_) ? Region.globals_[key] : null);
        };
        Region.AddPostProcessCallback = function (callback) {
            Region.postProcessCallbacks_.push(callback);
        };
        Region.ExecutePostProcessCallbacks = function () {
            if (Region.postProcessCallbacks_.length == 0) {
                return;
            }
            Region.postProcessCallbacks_.forEach(function (callback) {
                try {
                    callback();
                }
                catch (err) {
                    console.error(err, "InlineJs.Region<NIL>.ExecutePostProcessCallbacks");
                }
            });
            Region.postProcessCallbacks_ = [];
        };
        Region.SetDirectivePrefix = function (value) {
            Region.directivePrfix = value;
            Region.directiveRegex = new RegExp("^(data-)?" + value + "-(.+)$");
        };
        Region.IsEqual = function (first, second) {
            var firstIsObject = (first && typeof first === 'object'), secondIsObject = (second && typeof second === 'object');
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
                for (var i = 0; i < first.length; ++i) {
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
            for (var key in first) {
                if (!(key in second) || !Region.IsEqual(first[key], second[key])) {
                    return false;
                }
            }
            return true;
        };
        Region.DeepCopy = function (target) {
            var isObject = (target && typeof target === 'object');
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
                var copy_1 = [];
                target.forEach(function (item) { return copy_1.push(Region.DeepCopy(item)); });
                return copy_1;
            }
            if (!Region.IsObject(target)) {
                return target;
            }
            var copy = {};
            for (var key in target) {
                copy[key] = Region.DeepCopy(target[key]);
            }
            return copy;
        };
        Region.GetElementKeyName = function () {
            return '__inlinejs_key__';
        };
        Region.IsObject = function (target) {
            return (target !== null && typeof target === 'object' && (('__InlineJS_Target__' in target) || target.__proto__.constructor.name === 'Object'));
        };
        Region.components_ = new Map();
        Region.globals_ = new Map();
        Region.postProcessCallbacks_ = new Array();
        Region.enableOptimizedBinds = true;
        Region.directivePrfix = 'x';
        Region.directiveRegex = /^(data-)?x-(.+)$/;
        Region.externalCallbacks = {
            isEqual: null,
            deepCopy: null
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
            'arrow-down': 'ArrowDown'
        };
        Region.booleanAttributes = new Array('allowfullscreen', 'allowpaymentrequest', 'async', 'autofocus', 'autoplay', 'checked', 'controls', 'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected');
        return Region;
    }());
    InlineJS.Region = Region;
    var Changes = /** @class */ (function () {
        function Changes(regionId_) {
            this.regionId_ = regionId_;
            this.isScheduled_ = false;
            this.list_ = new Array();
            this.subscriberId_ = null;
            this.subscribers_ = new Map();
            this.getAccessStorages_ = new Stack();
            this.getAccessHooks_ = new Stack();
            this.origins_ = new Stack();
        }
        Changes.prototype.Schedule = function () {
            var _this = this;
            if (this.isScheduled_) {
                return;
            }
            this.isScheduled_ = true;
            setTimeout(function () {
                _this.isScheduled_ = false;
                if (0 < _this.list_.length) {
                    var list = _this.list_, batches_1 = new Array();
                    _this.list_ = new Array();
                    list.forEach(function (item) {
                        if (item.path in _this.subscribers_) {
                            _this.subscribers_[item.path].forEach(function (info) {
                                if (info.callback !== Changes.GetOrigin(item)) { //Ignore originating callback
                                    Changes.AddBatch(batches_1, item, info.callback);
                                }
                            });
                        }
                    });
                    batches_1.forEach(function (batch) { return batch.callback(batch.changes); });
                }
                var region = Region.Get(_this.regionId_);
                if (region) {
                    region.ExecuteNextTick();
                }
            }, 0);
        };
        Changes.prototype.Add = function (item) {
            this.list_.push(item);
            this.Schedule();
        };
        Changes.prototype.Subscribe = function (path, callback) {
            var id;
            if (this.subscriberId_ === null) {
                id = (this.subscriberId_ = 0);
            }
            else {
                id = ++this.subscriberId_;
            }
            var region = Region.Get(RegionMap.scopeRegionIds.Peek() || this.regionId_);
            if (region) { //Check for a context element
                var contextElement = region.GetState().GetElementContext();
                if (contextElement) { //Add reference
                    var scope = region.AddElement(contextElement, true);
                    if (scope) {
                        scope.changeRefs.push({
                            regionId: region.GetId(),
                            subscriptionId: id
                        });
                    }
                }
            }
            var list = (this.subscribers_[path] = (this.subscribers_[path] || new Array()));
            list.push({
                id: id,
                callback: callback
            });
            return id;
        };
        Changes.prototype.Unsubscribe = function (id) {
            for (var path in this.subscribers_) {
                var list = this.subscribers_[path];
                for (var i = list.length; i > 0; --i) {
                    var index = (i - 1);
                    if (list[index].id == id) {
                        list.splice(index, 1);
                    }
                }
            }
        };
        Changes.prototype.AddGetAccess = function (path) {
            var region = Region.GetCurrent(this.regionId_);
            if (!region) {
                return;
            }
            var hook = region.GetChanges().getAccessHooks_.Peek();
            if (hook && !hook(region.GetId(), path)) { //Rejected
                return;
            }
            var storageInfo = region.GetChanges().getAccessStorages_.Peek();
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
            var optimized = storageInfo.storage.optimized;
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
        };
        Changes.prototype.ReplaceOptimizedGetAccesses = function () {
            if (!Region.Get(this.regionId_).OptimizedBindsIsEnabled()) {
                return;
            }
            var info = this.getAccessStorages_.Peek();
            if (info && info.storage && info.storage.raw) {
                info.storage.optimized = new Array();
                info.storage.raw.forEach(function (item) { return info.storage.optimized.push(item); });
            }
        };
        Changes.prototype.PushGetAccessStorage = function (storage) {
            this.getAccessStorages_.Push({
                storage: (storage || {
                    optimized: (Region.Get(this.regionId_).OptimizedBindsIsEnabled() ? new Array() : null),
                    raw: new Array()
                }),
                lastAccessPath: ''
            });
        };
        Changes.prototype.RetrieveGetAccessStorage = function (optimized) {
            if (optimized === void 0) { optimized = true; }
            var info = this.getAccessStorages_.Peek();
            return ((info && info.storage) ? (optimized ? (info.storage.optimized || info.storage.raw) : info.storage) : null);
        };
        Changes.prototype.PopGetAccessStorage = function (optimized) {
            var info = this.getAccessStorages_.Pop();
            return ((info && info.storage) ? (optimized ? (info.storage.optimized || info.storage.raw) : info.storage) : null);
        };
        Changes.prototype.PushGetAccessHook = function (hook) {
            this.getAccessHooks_.Push(hook);
        };
        Changes.prototype.RetrieveGetAccessHook = function () {
            return this.getAccessHooks_.Peek();
        };
        Changes.prototype.PopGetAccessHook = function () {
            return this.getAccessHooks_.Pop();
        };
        Changes.prototype.PushOrigin = function (origin) {
            this.origins_.Push(origin);
        };
        Changes.prototype.GetOrigin = function () {
            return this.origins_.Peek();
        };
        Changes.prototype.PopOrigin = function () {
            return this.origins_.Pop();
        };
        Changes.SetOrigin = function (change, origin) {
            if ('original' in change) {
                change.original.origin = origin;
            }
            else {
                change.origin = origin;
            }
        };
        Changes.GetOrigin = function (change) {
            return (('original' in change) ? change.original.origin : change.origin);
        };
        Changes.AddBatch = function (batches, change, callback) {
            var batch = batches.find(function (info) { return (info.callback === callback); });
            if (batch) {
                batch.changes.push(change);
            }
            else { //Add new
                batches.push({
                    callback: callback,
                    changes: new Array(change)
                });
            }
        };
        return Changes;
    }());
    InlineJS.Changes = Changes;
    var State = /** @class */ (function () {
        function State(regionId_) {
            this.regionId_ = regionId_;
            this.elementContext_ = new Stack();
            this.eventContext_ = new Stack();
        }
        State.prototype.PushElementContext = function (element) {
            this.elementContext_.Push(element);
        };
        State.prototype.PopElementContext = function () {
            return this.elementContext_.Pop();
        };
        State.prototype.GetElementContext = function () {
            return this.elementContext_.Peek();
        };
        State.prototype.PushEventContext = function (Value) {
            this.eventContext_.Push(Value);
        };
        State.prototype.PopEventContext = function () {
            return this.eventContext_.Pop();
        };
        State.prototype.GetEventContext = function () {
            return this.eventContext_.Peek();
        };
        State.prototype.TrapGetAccess = function (callback, changeCallback, staticCallback) {
            var _this = this;
            var region = Region.Get(this.regionId_), stopped;
            if (!region) {
                return new Map();
            }
            try {
                region.GetChanges().PushGetAccessStorage(null);
                stopped = (callback(null) === false);
            }
            catch (err) {
                this.ReportError(err, "InlineJs.Region<" + this.regionId_ + ">.State.TrapAccess");
            }
            var storage = region.GetChanges().PopGetAccessStorage(true);
            if (stopped || !changeCallback || storage.length == 0) { //Not reactive
                if (staticCallback) {
                    staticCallback();
                }
                return new Map();
            }
            var ids = new Map();
            var onChange = function (changes) {
                var myRegion = Region.Get(_this.regionId_);
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
                    _this.ReportError(err, "InlineJs.Region<" + _this.regionId_ + ">.State.TrapAccess");
                }
                if (myRegion) {
                    myRegion.GetChanges().PopOrigin();
                }
                if (stopped) { //Unsubscribe all subscribed
                    var _loop_1 = function (regionId) {
                        var myRegion_1 = Region.Get(regionId);
                        if (!myRegion_1) {
                            return "continue";
                        }
                        var changes_1 = myRegion_1.GetChanges();
                        ids[regionId].forEach(function (id) { return changes_1.Unsubscribe(id); });
                    };
                    for (var regionId in ids) {
                        _loop_1(regionId);
                    }
                }
            };
            var uniqueEntries = new Map();
            storage.forEach(function (info) { return uniqueEntries[info.path] = info.regionId; });
            for (var path in uniqueEntries) {
                var targetRegion = Region.Get(uniqueEntries[path]);
                if (targetRegion) {
                    (ids[targetRegion.GetId()] = (ids[targetRegion.GetId()] || new Array())).push(targetRegion.GetChanges().Subscribe(path, onChange));
                }
            }
            return ids;
        };
        State.prototype.ReportError = function (value, ref) {
            console.error(value, ref);
        };
        State.prototype.Warn = function (value, ref) {
            console.warn(value, ref);
        };
        State.prototype.Log = function (value, ref) {
            console.log(value, ref);
        };
        return State;
    }());
    InlineJS.State = State;
    var Evaluator = /** @class */ (function () {
        function Evaluator() {
        }
        Evaluator.Evaluate = function (regionId, elementContext, expression, useWindow) {
            if (useWindow === void 0) { useWindow = false; }
            if (!(expression = expression.trim())) {
                return null;
            }
            var region = Region.Get(regionId);
            if (!region) {
                return null;
            }
            var result;
            var state = region.GetState();
            RegionMap.scopeRegionIds.Push(regionId);
            state.PushElementContext(region.GetElement(elementContext));
            try {
                result = (new Function(Evaluator.GetContextKey(), "\n                    with (" + Evaluator.GetContextKey() + "){\n                        return (" + expression + ");\n                    };\n                ")).bind(state.GetElementContext())(useWindow ? window : region.GetRootProxy().GetNativeProxy());
            }
            catch (err) {
                result = null;
                var element = state.GetElementContext();
                var elementId = element.getAttribute(Region.GetElementKeyName());
                state.ReportError(err, "InlineJs.Region<" + regionId + ">.Evaluator.Evaluate(Element#" + elementId + ", " + expression + ")");
            }
            state.PopElementContext();
            RegionMap.scopeRegionIds.Pop();
            return result;
        };
        Evaluator.GetContextKey = function () {
            return '__InlineJS_Context__';
        };
        return Evaluator;
    }());
    InlineJS.Evaluator = Evaluator;
    function CreateChildProxy(owner, name, target) {
        if (!owner) {
            return null;
        }
        var ownerProxies = owner.GetProxies();
        if (name in ownerProxies && name !== 'constructor' && name !== 'proto') {
            return ownerProxies[name];
        }
        if (!Array.isArray(target) && !Region.IsObject(target)) {
            return null;
        }
        var childProxy = new ChildProxy(owner.GetRegionId(), owner.GetPath(), name, target);
        owner.AddChild(childProxy);
        return childProxy;
    }
    function ProxyGetter(target, prop, regionId, parentPath, name, callback) {
        var path = (parentPath ? parentPath + "." + name : name);
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
        var exists = (prop in target);
        if (!exists && callback) {
            var result = callback();
            if (!(result instanceof NoResult)) {
                return result;
            }
        }
        var actualValue = (exists ? target[prop] : null);
        if (actualValue instanceof Value) {
            return actualValue.Get();
        }
        var region = Region.Get(regionId);
        if (region) {
            if (prop.substr(0, 1) !== '$') {
                region.GetChanges().AddGetAccess(path + "." + prop);
            }
            var value = CreateChildProxy(region.FindProxy(path), prop, actualValue);
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
        var change = {
            type: type,
            path: path,
            prop: prop,
            origin: changes.GetOrigin()
        };
        changes.Add(change);
        var parts = path.split('.');
        while (parts.length > 2) { //Skip root
            parts.pop();
            changes.Add({
                original: change,
                path: parts.join('.')
            });
        }
    }
    function ProxySetter(target, prop, value, regionId, parentPath, name, callback) {
        var exists = (prop in target);
        if (!exists && callback && callback()) {
            return true;
        }
        var path = (parentPath ? parentPath + "." + name : name);
        var region = Region.Get(regionId);
        if (region) {
            var proxy = region.FindProxy(path);
            if (proxy) {
                proxy.RemoveChild(prop);
            }
            AddChanges(region.GetChanges(), 'set', path + "." + prop, prop);
        }
        target[prop] = value;
        return true;
    }
    function ProxyDeleter(target, prop, regionId, parentPath, name, callback) {
        var exists = (prop in target);
        if (!exists) {
            return (callback && callback());
        }
        var path = (parentPath ? parentPath + "." + name : name);
        var region = Region.Get(regionId);
        if (region) {
            var proxy = region.FindProxy(path);
            if (proxy) {
                proxy.RemoveChild(prop);
            }
            AddChanges(region.GetChanges(), 'delete', path, prop);
        }
        delete target[prop];
        return true;
    }
    var RootProxy = /** @class */ (function () {
        function RootProxy(regionId_, target_) {
            this.regionId_ = regionId_;
            this.target_ = target_;
            this.proxies_ = new Map();
            var regionId = this.regionId_, name = this.GetPath();
            var handler = {
                get: function (target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    var stringProp = prop.toString();
                    return ProxyGetter(target, stringProp, regionId, null, name, function () {
                        var region = Region.Get(regionId);
                        if (!region) {
                            return new NoResult();
                        }
                        var contextElement = region.GetState().GetElementContext();
                        var local = region.GetLocal(contextElement, stringProp);
                        if (!(local instanceof NoResult)) { //Local found
                            return ((local instanceof Value) ? local.Get() : local);
                        }
                        var global = Region.GetGlobal(stringProp);
                        if (global) {
                            var result = global(regionId, contextElement);
                            if (!(result instanceof NoResult)) { //Local found
                                return ((result instanceof Value) ? result.Get() : result);
                            }
                        }
                        return new NoResult();
                    });
                },
                set: function (target, prop, value) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.set(target, prop, value);
                    }
                    return ProxySetter(target, prop.toString(), value, regionId, null, name, function () {
                        return false;
                    });
                },
                deleteProperty: function (target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return ProxyDeleter(target, prop.toString(), regionId, null, name, function () {
                        return false;
                    });
                },
                has: function (target, prop) {
                    return (typeof prop !== 'symbol' || Reflect.has(target, prop));
                }
            };
            this.nativeProxy_ = new window.Proxy(this.target_, handler);
        }
        RootProxy.prototype.IsRoot = function () {
            return true;
        };
        RootProxy.prototype.GetRegionId = function () {
            return this.regionId_;
        };
        RootProxy.prototype.GetTarget = function () {
            return this.target_;
        };
        RootProxy.prototype.GetNativeProxy = function () {
            return this.nativeProxy_;
        };
        RootProxy.prototype.GetName = function () {
            return "Proxy<" + this.regionId_ + ">";
        };
        RootProxy.prototype.GetPath = function () {
            return this.GetName();
        };
        RootProxy.prototype.GetParentPath = function () {
            return '';
        };
        RootProxy.prototype.AddChild = function (child) {
            this.proxies_[child.GetName()] = child;
            var region = Region.Get(this.regionId_);
            if (region) {
                region.AddProxy(child);
            }
        };
        RootProxy.prototype.RemoveChild = function (name) {
            delete this.proxies_[name];
            var region = Region.Get(this.regionId_);
            if (region) {
                region.RemoveProxy(this.GetPath() + "." + name);
            }
        };
        RootProxy.prototype.GetProxies = function () {
            return this.proxies_;
        };
        RootProxy.Watch = function (regionId, elementContext, expression, callback, skipFirst) {
            var region = Region.Get(regionId);
            if (!region) {
                return;
            }
            var previousValue;
            var onChange = function () {
                var value = Evaluator.Evaluate(regionId, elementContext, expression);
                if (Region.IsEqual(value, previousValue)) {
                    return true;
                }
                previousValue = Region.DeepCopy(value);
                return callback(value);
            };
            region.GetState().TrapGetAccess(function () {
                var value = Evaluator.Evaluate(regionId, elementContext, expression);
                previousValue = Region.DeepCopy(value);
                return (skipFirst || callback(value));
            }, onChange);
        };
        RootProxy.AddGlobalCallbacks = function () {
            Region.AddGlobal('$window', function () { return window; });
            Region.AddGlobal('$document', function () { return document; });
            Region.AddGlobal('$console', function () { return console; });
            Region.AddGlobal('$alert', function () { return window.alert.bind(window); });
            Region.AddGlobal('$event', function (regionId) { return Region.Get(regionId).GetState().GetEventContext(); });
            Region.AddGlobal('$expandEvent', function (regionId) { return function (event, target) { return Region.Get(regionId).ExpandEvent(event, (target || true)); }; });
            Region.AddGlobal('$dispatchEvent', function (regionId, contextElement) { return function (event, nextCycle, target) {
                if (nextCycle === void 0) { nextCycle = true; }
                var resolvedTarget = (target || contextElement);
                var resolvedEvent = ((typeof event === 'string') ? new CustomEvent(Region.Get(regionId).ExpandEvent(event, resolvedTarget)) : event);
                if (nextCycle) {
                    setTimeout(function () { return resolvedTarget.dispatchEvent(resolvedEvent); }, 0);
                }
                else {
                    resolvedTarget.dispatchEvent(resolvedEvent);
                }
            }; });
            Region.AddGlobal('$refs', function (regionId) { return Region.Get(regionId).GetRefs(); });
            Region.AddGlobal('$self', function (regionId) { return Region.Get(regionId).GetState().GetElementContext(); });
            Region.AddGlobal('$root', function (regionId) { return Region.Get(regionId).GetRootElement(); });
            Region.AddGlobal('$parent', function (regionId) { return Region.Get(regionId).GetElementAncestor(true, 0); });
            Region.AddGlobal('$getAncestor', function (regionId) { return function (index) { return Region.Get(regionId).GetElementAncestor(true, index); }; });
            Region.AddGlobal('$componentKey', function (regionId) { return Region.Get(regionId).GetComponentKey(); });
            Region.AddGlobal('$component', function () { return function (id) { return Region.Find(id, true); }; });
            Region.AddGlobal('$locals', function (regionId) { return Region.Get(regionId).GetElementScope(true).locals; });
            Region.AddGlobal('$getLocals', function (regionId) { return function (element) { return Region.Get(regionId).AddElement(element).locals; }; });
            Region.AddGlobal('$watch', function (regionId, contextElement) { return function (expression, callback) {
                RootProxy.Watch(regionId, contextElement, expression, function (value) { return callback.call(Region.Get(regionId).GetRootProxy().GetNativeProxy(), value); }, true);
            }; });
            Region.AddGlobal('$when', function (regionId, contextElement) { return function (expression, callback) {
                RootProxy.Watch(regionId, contextElement, expression, function (value) { return (!value || callback.call(Region.Get(regionId).GetRootProxy().GetNativeProxy(), value)); }, false);
            }; });
            Region.AddGlobal('$once', function (regionId, contextElement) { return function (expression, callback) {
                RootProxy.Watch(regionId, contextElement, expression, function (value) { return (!value || (callback.call(Region.Get(regionId).GetRootProxy().GetNativeProxy(), value) && false)); }, false);
            }; });
            Region.AddGlobal('$nextTick', function (regionId) { return function (callback) {
                var region = Region.Get(regionId);
                if (region) {
                    region.AddNextTickCallback(callback);
                }
            }; });
            Region.AddGlobal('$post', function () { return function (callback) {
                Region.AddPostProcessCallback(callback);
            }; });
            Region.AddGlobal('$use', function (regionId) { return function (value) {
                var region = Region.GetCurrent(regionId);
                if (region) {
                    region.GetChanges().ReplaceOptimizedGetAccesses();
                }
                return value;
            }; });
            Region.AddGlobal('$__InlineJS_CallTemp__', function (regionId) { return function (key) {
                var region = Region.Get(regionId);
                return (region ? region.CallTemp(key) : null);
            }; });
        };
        return RootProxy;
    }());
    InlineJS.RootProxy = RootProxy;
    var ChildProxy = /** @class */ (function () {
        function ChildProxy(regionId_, parentPath_, name_, target_) {
            this.regionId_ = regionId_;
            this.parentPath_ = parentPath_;
            this.name_ = name_;
            this.target_ = target_;
            this.proxies_ = new Map();
            var regionId = this.regionId_, parentPath = this.parentPath_, name = this.name_;
            var handler = {
                get: function (target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    if ('__InlineJS_Target__' in target) {
                        return target[prop];
                    }
                    return ProxyGetter(target, prop.toString(), regionId, parentPath, name);
                },
                set: function (target, prop, value) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.set(target, prop, value);
                    }
                    return ProxySetter(target, prop.toString(), value, regionId, parentPath, name);
                },
                deleteProperty: function (target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return ProxyDeleter(target, prop.toString(), regionId, parentPath, name);
                },
                has: function (target, prop) {
                    return (typeof prop !== 'symbol' || Reflect.has(target, prop));
                }
            };
            this.nativeProxy_ = new window.Proxy(this.target_, handler);
            Region.Get(this.regionId_).AddProxy(this);
        }
        ChildProxy.prototype.IsRoot = function () {
            return false;
        };
        ChildProxy.prototype.GetRegionId = function () {
            return this.regionId_;
        };
        ChildProxy.prototype.GetTarget = function () {
            return this.target_;
        };
        ChildProxy.prototype.GetNativeProxy = function () {
            return this.nativeProxy_;
        };
        ChildProxy.prototype.GetName = function () {
            return this.name_;
        };
        ChildProxy.prototype.GetPath = function () {
            return this.parentPath_ + "." + this.name_;
        };
        ChildProxy.prototype.GetParentPath = function () {
            return this.parentPath_;
        };
        ChildProxy.prototype.AddChild = function (child) {
            this.proxies_[child.GetName()] = child;
            var region = Region.Get(this.regionId_);
            if (region) {
                region.AddProxy(child);
            }
        };
        ChildProxy.prototype.RemoveChild = function (name) {
            delete this.proxies_[name];
            var region = Region.Get(this.regionId_);
            if (region) {
                region.RemoveProxy(this.GetPath() + "." + name);
            }
        };
        ChildProxy.prototype.GetProxies = function () {
            return this.proxies_;
        };
        return ChildProxy;
    }());
    InlineJS.ChildProxy = ChildProxy;
    var DirectiveHandlerReturn;
    (function (DirectiveHandlerReturn) {
        DirectiveHandlerReturn[DirectiveHandlerReturn["Nil"] = 0] = "Nil";
        DirectiveHandlerReturn[DirectiveHandlerReturn["Handled"] = 1] = "Handled";
        DirectiveHandlerReturn[DirectiveHandlerReturn["Rejected"] = 2] = "Rejected";
        DirectiveHandlerReturn[DirectiveHandlerReturn["QuitAll"] = 3] = "QuitAll";
    })(DirectiveHandlerReturn = InlineJS.DirectiveHandlerReturn || (InlineJS.DirectiveHandlerReturn = {}));
    var DirectiveHandlerManager = /** @class */ (function () {
        function DirectiveHandlerManager() {
        }
        DirectiveHandlerManager.AddHandler = function (key, handler) {
            DirectiveHandlerManager.directiveHandlers_[key] = handler;
        };
        DirectiveHandlerManager.RemoveHandler = function (key) {
            delete DirectiveHandlerManager.directiveHandlers_[key];
        };
        DirectiveHandlerManager.GetHandler = function (key) {
            return ((key in DirectiveHandlerManager.directiveHandlers_) ? DirectiveHandlerManager.directiveHandlers_[key] : null);
        };
        DirectiveHandlerManager.AddBulkHandler = function (handler) {
            DirectiveHandlerManager.bulkDirectiveHandlers_.push(handler);
        };
        DirectiveHandlerManager.Handle = function (region, element, directive) {
            if (!directive) {
                return DirectiveHandlerReturn.Nil;
            }
            var scope = region.AddElement(element, true);
            if (scope && directive.key in scope.directiveHandlers) {
                var result = scope.directiveHandlers[directive.key](region, element, directive);
                if (result != DirectiveHandlerReturn.Nil) { //Handled
                    return result;
                }
            }
            if (directive.key in DirectiveHandlerManager.directiveHandlers_) {
                var result = DirectiveHandlerManager.directiveHandlers_[directive.key](region, element, directive);
                if (result != DirectiveHandlerReturn.Nil) { //Handled
                    return result;
                }
            }
            for (var i = DirectiveHandlerManager.bulkDirectiveHandlers_.length; i > 0; --i) {
                var result = DirectiveHandlerManager.bulkDirectiveHandlers_[(i - 1)](region, element, directive);
                if (result != DirectiveHandlerReturn.Nil) { //Handled
                    return result;
                }
            }
            return DirectiveHandlerReturn.Nil;
        };
        DirectiveHandlerManager.directiveHandlers_ = new Map();
        DirectiveHandlerManager.bulkDirectiveHandlers_ = new Array();
        return DirectiveHandlerManager;
    }());
    InlineJS.DirectiveHandlerManager = DirectiveHandlerManager;
    var CoreDirectiveHandlers = /** @class */ (function () {
        function CoreDirectiveHandlers() {
        }
        CoreDirectiveHandlers.Noop = function (region, element, directive) {
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Data = function (region, element, directive) {
            var proxy = region.GetRootProxy().GetNativeProxy();
            var data = CoreDirectiveHandlers.Evaluate(region, element, directive.value, true);
            if (!Region.IsObject(data)) {
                return DirectiveHandlerReturn.Handled;
            }
            var target = proxy['__InlineJS_Target__'];
            for (var key in data) {
                if (key === '$enableOptimizedBinds') {
                    region.SetOptimizedBindsState(!!data[key]);
                }
                else if (key === '$component' && data[key] && typeof data[key] === 'string') {
                    Region.AddComponent(region, element, data[key]);
                }
                else if (key !== '$component') {
                    target[key] = data[key];
                }
            }
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Component = function (region, element, directive) {
            return (Region.AddComponent(region, element, directive.value) ? DirectiveHandlerReturn.Handled : DirectiveHandlerReturn.Nil);
        };
        CoreDirectiveHandlers.Post = function (region, element, directive) {
            var regionId = region.GetId();
            region.AddElement(element, true).postProcessCallbacks.push(function () { return CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value); });
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Init = function (region, element, directive) {
            CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Bind = function (region, element, directive) {
            region.GetState().TrapGetAccess(function () {
                CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                return true;
            }, true);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Static = function (region, element, directive) {
            if (!directive.arg || !directive.arg.key) {
                return DirectiveHandlerReturn.Nil;
            }
            var getTargetDirective = function () {
                if (directive.arg.options.length == 0) {
                    return Region.directivePrfix + "-" + directive.arg.key;
                }
                return Region.directivePrfix + "-" + directive.arg.key + "." + directive.arg.options.join('.');
            };
            region.GetChanges().PushGetAccessHook(function () { return false; }); //Disable get access log
            var result = DirectiveHandlerManager.Handle(region, element, Processor.GetDirectiveWith(getTargetDirective(), directive.value));
            region.GetChanges().PopGetAccessHook();
            return result;
        };
        CoreDirectiveHandlers.Uninit = function (region, element, directive) {
            var regionId = region.GetId();
            region.AddElement(element, true).uninitCallbacks.push(function () { return CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value); });
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Ref = function (region, element, directive) {
            region.AddRef(directive.value, element);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Attr = function (region, element, directive) {
            return CoreDirectiveHandlers.InternalAttr(region, element, directive, function (key, value) {
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
        };
        CoreDirectiveHandlers.Style = function (region, element, directive) {
            return CoreDirectiveHandlers.InternalAttr(region, element, directive, function (key, value) { element.style[key] = CoreDirectiveHandlers.ToString(value); }, function (key) { return (key in element.style); });
        };
        CoreDirectiveHandlers.Class = function (region, element, directive) {
            return CoreDirectiveHandlers.InternalAttr(region, element, directive, function (key, value) {
                key.trim().replace(/\s\s+/g, ' ').split(' ').forEach(function (item) { return value ? element.classList.add(item) : element.classList.remove(item); });
            }, null, true);
        };
        CoreDirectiveHandlers.InternalAttr = function (region, element, directive, callback, validator, acceptList) {
            if (acceptList === void 0) { acceptList = false; }
            var regionId = region.GetId();
            if (!directive.arg || !directive.arg.key) {
                var isList_1 = (acceptList && directive.arg && directive.arg.options.indexOf('list') != -1), list_1;
                region.GetState().TrapGetAccess(function () {
                    if (isList_1 && list_1) {
                        list_1.forEach(function (item) { return element.classList.remove(item); });
                        list_1 = new Array();
                    }
                    var entries = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                    if (Region.IsObject(entries)) {
                        for (var key in entries) {
                            callback(key, entries[key]);
                        }
                    }
                    else if (isList_1 && Array.isArray(entries)) {
                        (list_1 = entries).forEach(function (entry) { return callback(CoreDirectiveHandlers.ToString(entry), true); });
                    }
                    else if (isList_1 && entries) {
                        (list_1 = CoreDirectiveHandlers.ToString(entries).trim().replace(/\s\s+/g, ' ').split(' ')).forEach(function (entry) { return callback(entry, true); });
                    }
                }, true);
                return DirectiveHandlerReturn.Handled;
            }
            if (validator && !validator(directive.arg.key)) {
                return DirectiveHandlerReturn.Nil;
            }
            region.GetState().TrapGetAccess(function () {
                callback(directive.arg.key, CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }, true);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Text = function (region, element, directive) {
            return CoreDirectiveHandlers.TextOrHtml(region, element, directive, false);
        };
        CoreDirectiveHandlers.Html = function (region, element, directive) {
            return CoreDirectiveHandlers.TextOrHtml(region, element, directive, true);
        };
        CoreDirectiveHandlers.TextOrHtml = function (region, element, directive, isHtml, callback) {
            var onChange;
            var regionId = region.GetId();
            if (isHtml) {
                onChange = function () { return element.innerHTML = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value)); };
            }
            else if (element.tagName === 'INPUT') {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    onChange = function () {
                        var value = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value), valueAttr = element.getAttribute('value');
                        if (valueAttr) {
                            if (value && Array.isArray(value)) {
                                element.checked = (value.findIndex(function (item) { return (item == valueAttr); }) != -1);
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
                    onChange = function () { return element.value = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value)); };
                }
            }
            else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                onChange = function () { return element.value = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value)); };
            }
            else { //Unknown
                onChange = function () { return element.textContent = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value)); };
            }
            region.GetState().TrapGetAccess(function () {
                if (!callback || callback()) {
                    onChange();
                }
            }, true);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.On = function (region, element, directive) {
            if (!directive.arg || !directive.arg.key) {
                return DirectiveHandlerReturn.Nil;
            }
            var options = {
                outside: false,
                prevent: false,
                stop: false,
                once: false,
                document: false,
                window: false,
                self: false
            };
            var keyOptions = {
                meta: false,
                alt: false,
                ctrl: false,
                shift: false,
                keys_: null
            };
            var isKey = (directive.arg.key === 'keydown' || directive.arg.key === 'keyup'), debounce, debounceIsNext = false, isDebounced = false;
            if (isKey) {
                keyOptions.keys_ = new Array();
            }
            directive.arg.options.forEach(function (option) {
                if (debounceIsNext) {
                    debounceIsNext = false;
                    var debounceValue = CoreDirectiveHandlers.ExtractDuration(option, null);
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
            var regionId = region.GetId(), stoppable;
            var onEvent = function (e) {
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
                    setTimeout(function () { isDebounced = false; }, debounce);
                }
                var myRegion = Region.Get(regionId);
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
                    CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value, false, e);
                }
                finally {
                    if (myRegion) {
                        myRegion.GetState().PopEventContext();
                    }
                }
            };
            var event = region.ExpandEvent(directive.arg.key, element);
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
        };
        CoreDirectiveHandlers.Model = function (region, element, directive) {
            var regionId = region.GetId(), doneInput = false, options = {
                out: false,
                "in": false,
                lazy: false,
                number: false,
                trim: false,
                array: false
            };
            directive.arg.options.forEach(function (option) {
                if (option in options) {
                    options[option] = true;
                }
            });
            if (!options.out) { //Bidirectional
                CoreDirectiveHandlers.TextOrHtml(region, element, directive, false, function () { return !doneInput; });
                if (options["in"]) { //Output disabled
                    return DirectiveHandlerReturn.Handled;
                }
            }
            var isCheckable = false, isInput = false;
            if (element.tagName === 'INPUT') {
                isInput = true;
                isCheckable = (element.type === 'checkbox' || element.type === 'radio');
            }
            var isSelect = (!isInput && element.tagName === 'SELECT');
            var isUnknown = (!isInput && !isSelect && element.tagName !== 'TEXTAREA');
            options.array = (options.array && isCheckable);
            var parseValue = function (value) {
                var parsedValue = (options.number ? parseFloat(value) : null);
                return ((parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) ? (value ? "'" + value + "'" : 'null') : parsedValue.toString());
            };
            var convertValue = function (value, target) {
                if (typeof value !== 'string') {
                    var joined = value.reduce(function (cummulative, item) { return (cummulative ? (cummulative + "," + parseValue(item)) : "" + parseValue(item)); }, '');
                    return "[" + joined + "]";
                }
                if (options.trim) {
                    value = value.trim();
                }
                if (isCheckable) {
                    if (!target.checked) {
                        return 'false';
                    }
                    var valueAttr = element.getAttribute('value');
                    if (valueAttr) {
                        return "'" + valueAttr + "'";
                    }
                    return 'true';
                }
                if (!options.number) {
                    return "'" + value + "'";
                }
                var parsedValue = parseInt(value);
                if (parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) {
                    return (value ? "'" + value + "'" : 'null');
                }
                return parsedValue.toString();
            };
            var getValue = function (target) {
                if (!isSelect || !target.multiple) {
                    return null;
                }
                return Array.from(target.options).filter(function (option) { return option.selected; }).map(function (option) { return (option.value || option.text); });
            };
            var setValue = function (value, target) {
                if (options.array) {
                    var evaluatedValue = Evaluator.Evaluate(regionId, element, directive.value), valueAttr_1 = element.getAttribute('value');
                    if (evaluatedValue && Array.isArray(evaluatedValue) && valueAttr_1) {
                        var index = evaluatedValue.findIndex(function (item) { return (item == valueAttr_1); });
                        if (index == -1 && target.checked) {
                            if (options.number) {
                                var parsedValue = parseFloat(valueAttr_1);
                                evaluatedValue.push((parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) ? valueAttr_1 : parsedValue);
                            }
                            else { //No conversion necessary
                                evaluatedValue.push(valueAttr_1);
                            }
                        }
                        else if (index != -1 && !target.checked) { //Remove value from array
                            evaluatedValue.splice(index, 1);
                        }
                    }
                }
                else { //Assign
                    Evaluator.Evaluate(regionId, element, "(" + directive.value + ")=(" + convertValue((getValue(target) || value), target) + ")");
                }
            };
            if (options.out && 'value' in element) { //Initial assignment
                setValue(element.value, element);
            }
            var onEvent = function (e) {
                if (isUnknown) { //Unpdate inner text
                    element.innerText = e.target.value;
                }
                doneInput = true;
                setValue(e.target.value, e.target);
                Region.Get(regionId).AddNextTickCallback(function () { return doneInput = false; });
            };
            element.addEventListener('change', onEvent);
            if (!options.lazy) {
                element.addEventListener('input', onEvent);
            }
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Show = function (region, element, directive) {
            var showValue = window.getComputedStyle(element).getPropertyValue('display');
            if (showValue === 'none') {
                showValue = 'block';
            }
            var regionId = region.GetId();
            region.GetState().TrapGetAccess(function () {
                if (CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value)) {
                    element.style.display = showValue;
                }
                else { //Hide
                    element.style.display = 'none';
                }
            }, true);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.If = function (region, element, directive) {
            var info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original), isInserted = true, ifFirstEntry = true;
            region.GetState().TrapGetAccess(function () {
                var myRegion = Region.Get(info.regionId), scope = myRegion.GetElementScope(info.scopeKey);
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
                    __spreadArrays(scope.falseIfCondition).forEach(function (callback) { return callback(); });
                    if (!ifFirstEntry) {
                        info.attributes.forEach(function (attr) { return element.removeAttribute(attr.name); });
                    }
                    if (element.parentElement) {
                        element.parentElement.removeChild(element);
                    }
                }
                else if (ifFirstEntry) { //Execute directives
                    CoreDirectiveHandlers.InsertIfOrEach(region, element, info);
                }
                ifFirstEntry = false;
            }, true, function () { region.GetElementScope(element).preserve = false; });
            if (!isInserted) { //Initial evaluation result is false
                region.RemoveElement(element);
            }
            return DirectiveHandlerReturn.QuitAll;
        };
        CoreDirectiveHandlers.Each = function (region, element, directive) {
            var info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original), isCount = false, isReverse = false, isRange = false;
            if (directive.arg) {
                isCount = (directive.arg.options.indexOf('count') != -1);
                isReverse = (directive.arg.options.indexOf('reverse') != -1);
            }
            var scope = region.GetElementScope(info.scopeKey), ifConditionIsTrue = true, falseIfCondition = function () {
                ifConditionIsTrue = false;
                empty();
                var myRegion = Region.Get(info.regionId);
                if (options.path) {
                    myRegion.GetChanges().Add({
                        type: 'set',
                        path: options.path,
                        prop: '',
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                }
                var myScope = myRegion.GetElementScope(element);
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
            var options = {
                isArray: false,
                list: null,
                target: null,
                count: 0,
                path: ''
            };
            var valueKey = '', matches = directive.value.match(/^(.+)? as[ ]+([A-Za-z_][0-9A-Za-z_$]*)[ ]*$/), expression;
            if (matches && 2 < matches.length) {
                expression = matches[1];
                valueKey = matches[2];
            }
            else {
                expression = directive.value;
            }
            var getIndex = function (clone, key) { return (options.isArray ? options.list.indexOf(clone) : key); };
            var getValue = function (clone, key) { return (options.isArray ? options.target[getIndex(clone)] : options.target[key]); };
            var initLocals = function (myRegion, clone, key) {
                myRegion.AddLocal(clone, '$each', CoreDirectiveHandlers.CreateProxy(function (prop) {
                    if (prop === 'count') {
                        if (options.isArray) {
                            return options.target.length;
                        }
                        if (options.path) {
                            Region.Get(info.regionId).GetChanges().AddGetAccess(options.path + ".length");
                        }
                        return options.count;
                    }
                    if (prop === 'index') {
                        return getIndex(clone, key);
                    }
                    if (prop === 'value') {
                        return getValue(clone, key);
                    }
                    if (prop === 'collection') {
                        return options.target;
                    }
                    if (prop === 'parent') {
                        return Region.Get(info.regionId).GetLocal(clone.parentElement, '$each', true);
                    }
                    return null;
                }, ['count', 'index', 'value', 'collection', 'parent']));
                if (valueKey) {
                    myRegion.AddLocal(clone, valueKey, new Value(function () { return getValue(clone, key); }));
                }
            };
            var insert = function (myRegion, key) {
                var clone = element.cloneNode(true), offset;
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
                CoreDirectiveHandlers.InsertIfOrEach(myRegion, clone, info, function () { return initLocals(myRegion, clone, key); }, offset);
            };
            var build = function (myRegion) {
                if (options.isArray) {
                    for (var i = 0; i < options.count; ++i) {
                        insert(myRegion);
                    }
                }
                else {
                    Object.keys(options.target).forEach(function (key) { return insert(myRegion, key); });
                }
            };
            var empty = function () {
                if (options.isArray && options.list) {
                    options.list.forEach(function (clone) { return info.parent.removeChild(clone); });
                }
                else if (options.list) { //Key-value pairs
                    Object.keys(options.list).forEach(function (key) { return info.parent.removeChild(options.list[key]); });
                }
                options.list = null;
            };
            var getRange = function (from, to) {
                if (from < to) {
                    return Array.from({ length: (to - from) }, function (value, key) { return (key + from); });
                }
                return Array.from({ length: (from - to) }, function (value, key) { return (from - key); });
            };
            var expandTarget = function (target) {
                if (typeof target === 'number' && Number.isInteger(target)) {
                    var offset = (isCount ? 1 : 0);
                    isRange = true;
                    if (target < 0) {
                        return (isReverse ? getRange((target - offset + 1), (1 - offset)) : getRange(-offset, (target - offset)));
                    }
                    return (isReverse ? getRange((target + offset - 1), (offset - 1)) : getRange(offset, (target + offset)));
                }
                return (isRange ? null : target);
            };
            var init = function (myRegion, refresh) {
                if (refresh === void 0) { refresh = false; }
                if (!refresh) {
                    empty();
                    options.target = expandTarget(CoreDirectiveHandlers.Evaluate(myRegion, element, expression));
                    if (element.parentElement) {
                        element.parentElement.removeChild(element);
                    }
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
                return true;
            };
            var addSizeChange = function (myRegion) {
                myRegion.GetChanges().Add({
                    type: 'set',
                    path: options.path + ".length",
                    prop: 'length',
                    origin: myRegion.GetChanges().GetOrigin()
                });
                options.count = Object.keys(options.target['__InlineJS_Target__']).length;
            };
            var onChange = function (myRegion, changes) {
                if (!ifConditionIsTrue) {
                    return false;
                }
                if (isRange) {
                    return init(myRegion, false);
                }
                changes.forEach(function (change) {
                    if ('original' in change) { //Bubbled
                        if (options.isArray || change.original.type !== 'set' || options.path + "." + change.original.prop !== change.original.path) {
                            return true;
                        }
                        addSizeChange(myRegion);
                        insert(myRegion, change.original.prop);
                    }
                    else if (change.type === 'set' && change.path === options.path) { //Object replaced
                        empty();
                        var target = myRegion.GetRootProxy().GetNativeProxy(), parts = change.path.split('.');
                        for (var i = 1; i < parts.length; ++i) { //Resolve target
                            if (!target || typeof target !== 'object' || !('__InlineJS_Target__' in target)) {
                                return false;
                            }
                            target = target[parts[i]];
                        }
                        options.target = expandTarget(target);
                        return (options.target && init(myRegion, true));
                    }
                    else if (options.isArray && change.type === 'set' && change.path === options.path + ".length") {
                        var count = options.target.length;
                        if (count < options.count) { //Item(s) removed
                            options.list.splice(count).forEach(function (clone) { return info.parent.removeChild(clone); });
                        }
                        else if (options.count < count) { //Item(s) added
                            for (var diff = (count - options.count); 0 < diff; --diff) {
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
            region.GetState().TrapGetAccess(function () { return init(Region.Get(info.regionId)); }, function (changes) { return onChange(Region.Get(info.regionId), changes); });
            return DirectiveHandlerReturn.QuitAll;
        };
        CoreDirectiveHandlers.InitIfOrEach = function (region, element, except) {
            var elScopeKey = Region.GetElementKeyName(), attributes = new Array();
            Array.from(element.attributes).forEach(function (attr) {
                if (attr.name === elScopeKey) {
                    return;
                }
                element.removeAttribute(attr.name);
                if (attr.name !== except) {
                    var directive = Processor.GetDirectiveWith(attr.name, attr.value);
                    attributes.push({ name: (directive ? directive.expanded : attr.name), value: attr.value });
                }
            });
            return {
                regionId: region.GetId(),
                scopeKey: element.getAttribute(elScopeKey),
                parent: element.parentElement,
                marker: CoreDirectiveHandlers.GetChildElementIndex(element),
                attributes: attributes
            };
        };
        CoreDirectiveHandlers.InsertIfOrEach = function (region, element, info, callback, offset) {
            if (offset === void 0) { offset = 0; }
            if (!element.parentElement) {
                element.removeAttribute(Region.GetElementKeyName());
                CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, element, (info.marker + (offset || 0)));
            }
            info.attributes.forEach(function (attr) { return element.setAttribute(attr.name, attr.value); });
            if (callback) {
                callback();
            }
            Processor.All(region, element);
        };
        CoreDirectiveHandlers.CreateProxy = function (getter, contains) {
            var handler = {
                get: function (target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return getter(prop.toString());
                },
                set: function (target, prop, value) {
                    return false;
                },
                deleteProperty: function (target, prop) {
                    return false;
                },
                has: function (target, prop) {
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
        };
        CoreDirectiveHandlers.Evaluate = function (region, element, expression, useWindow) {
            if (useWindow === void 0) { useWindow = false; }
            var args = [];
            for (var _i = 4; _i < arguments.length; _i++) {
                args[_i - 4] = arguments[_i];
            }
            if (!region) {
                return null;
            }
            RegionMap.scopeRegionIds.Push(region.GetId());
            region.GetState().PushElementContext(element);
            var result;
            try {
                result = Evaluator.Evaluate(region.GetId(), element, expression, useWindow);
                if (typeof result === 'function') {
                    result = region.Call.apply(region, __spreadArrays([result], args));
                }
                result = ((result instanceof Value) ? result.Get() : result);
            }
            catch (err) {
                region.GetState().ReportError(err, "InlineJs.Region<" + region.GetId() + ">.CoreDirectiveHandlers.Evaluate(" + expression + ")");
            }
            finally {
                region.GetState().PopElementContext();
                RegionMap.scopeRegionIds.Pop();
            }
            return result;
        };
        CoreDirectiveHandlers.Call = function (regionId, callback) {
            var _a;
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            try {
                return (_a = Region.Get(regionId)).Call.apply(_a, __spreadArrays([callback], args));
            }
            catch (err) {
                Region.Get(regionId).GetState().ReportError(err, 'CoreDirectiveHandlers.Call');
            }
        };
        CoreDirectiveHandlers.ExtractDuration = function (value, defaultValue) {
            var regex = /[0-9]+(s|ms)?/;
            if (!value || !value.match(regex)) {
                return defaultValue;
            }
            if (value.indexOf('m') == -1 && value.indexOf('s') != -1) { //Seconds
                return (parseInt(value) * 1000);
            }
            return parseInt(value);
        };
        CoreDirectiveHandlers.ToString = function (value) {
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
            if (Region.IsObject(value)) {
                var combined = '';
                for (var key in value) {
                    if (combined.length == 0) {
                        combined = key + ":" + CoreDirectiveHandlers.ToString(value[key]);
                    }
                    else {
                        combined += "," + key + ":" + CoreDirectiveHandlers.ToString(value[key]);
                    }
                }
                return "{" + combined + "}";
            }
            return value.toString();
        };
        CoreDirectiveHandlers.GetChildElementIndex = function (element) {
            if (!element.parentElement) {
                return -1;
            }
            for (var i = 0; i < element.parentElement.children.length; ++i) {
                if (element.parentElement.children[i] === element) {
                    return i;
                }
            }
            return -1;
        };
        CoreDirectiveHandlers.GetChildElementAt = function (parent, index) {
            return ((index < parent.children.length) ? parent.children.item(index) : null);
        };
        CoreDirectiveHandlers.InsertOrAppendChildElement = function (parent, element, index) {
            var sibling = CoreDirectiveHandlers.GetChildElementAt(parent, index);
            if (sibling) {
                parent.insertBefore(element, sibling);
            }
            else { //Append
                parent.appendChild(element);
            }
        };
        CoreDirectiveHandlers.AddAll = function () {
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
        };
        return CoreDirectiveHandlers;
    }());
    InlineJS.CoreDirectiveHandlers = CoreDirectiveHandlers;
    var Processor = /** @class */ (function () {
        function Processor() {
        }
        Processor.All = function (region, element, options) {
            if (!Processor.Check(element, options)) { //Check failed -- ignore
                return;
            }
            var isTemplate = (element.tagName == 'TEMPLATE');
            if (!isTemplate && (options === null || options === void 0 ? void 0 : options.checkTemplate) && element.closest('template')) { //Inside template -- ignore
                return;
            }
            Processor.Pre(region, element);
            if (Processor.One(region, element) != DirectiveHandlerReturn.QuitAll && !isTemplate) { //Process children
                Array.from(element.children).forEach(function (child) { return Processor.All(region, child); });
            }
            Processor.Post(region, element);
        };
        Processor.One = function (region, element, options) {
            if (!Processor.Check(element, options)) { //Check failed -- ignore
                return DirectiveHandlerReturn.Nil;
            }
            var isTemplate = (element.tagName == 'TEMPLATE');
            if (!isTemplate && (options === null || options === void 0 ? void 0 : options.checkTemplate) && element.closest('template')) { //Inside template -- ignore
                return DirectiveHandlerReturn.Nil;
            }
            region.GetState().PushElementContext(element);
            var result = Processor.TraverseDirectives(element, function (directive) {
                return Processor.DispatchDirective(region, element, directive);
            });
            region.GetState().PopElementContext();
            return result;
        };
        Processor.Pre = function (region, element) {
            Processor.PreOrPost(region, element, 'preProcessCallbacks', 'Pre');
        };
        Processor.Post = function (region, element) {
            Processor.PreOrPost(region, element, 'postProcessCallbacks', 'Post');
        };
        Processor.PreOrPost = function (region, element, scopeKey, name) {
            var scope = region.GetElementScope(element);
            if (scope) {
                scope[scopeKey].forEach(function (callback) {
                    try {
                        callback();
                    }
                    catch (err) {
                        region.GetState().ReportError(err, "InlineJs.Region<" + region.GetId() + ">.Processor." + name + "(Element@" + element.nodeName + ")");
                    }
                });
                scope[scopeKey] = [];
            }
        };
        Processor.DispatchDirective = function (region, element, directive) {
            var result;
            try {
                result = DirectiveHandlerManager.Handle(region, element, directive);
                if (result == DirectiveHandlerReturn.Nil) {
                    region.GetState().Warn('Handler not found for directive. Skipping...', "InlineJs.Region<" + region.GetId() + ">.Processor.DispatchDirective(Element@" + element.nodeName + ", " + directive.original + ")");
                }
            }
            catch (err) {
                result = DirectiveHandlerReturn.Nil;
                region.GetState().ReportError(err, "InlineJs.Region<" + region.GetId() + ">.Processor.DispatchDirective(Element@" + element.nodeName + ", " + directive.original + ")");
            }
            if (result != DirectiveHandlerReturn.Rejected && result != DirectiveHandlerReturn.QuitAll) {
                element.removeAttribute(directive.original);
            }
            return result;
        };
        Processor.Check = function (element, options) {
            if ((element === null || element === void 0 ? void 0 : element.nodeType) !== 1) { //Not an HTMLElement
                return false;
            }
            if ((options === null || options === void 0 ? void 0 : options.checkDocument) && !document.contains(element)) { //Node is not contained inside the document
                return false;
            }
            return true;
        };
        Processor.TraverseDirectives = function (element, callback) {
            var result = DirectiveHandlerReturn.Nil, attributes = Array.from(element.attributes);
            for (var i = 0; i < attributes.length; ++i) { //Traverse attributes
                var directive = Processor.GetDirectiveWith(attributes[i].name, attributes[i].value);
                if (directive) {
                    var thisResult = callback(directive);
                    if (thisResult != DirectiveHandlerReturn.Nil) {
                        result = thisResult;
                        if (thisResult == DirectiveHandlerReturn.Rejected || thisResult == DirectiveHandlerReturn.QuitAll) {
                            break;
                        }
                    }
                }
            }
            return result;
        };
        Processor.GetDirective = function (attribute) {
            return Processor.GetDirectiveWith(attribute.name, attribute.value);
        };
        Processor.GetDirectiveWith = function (name, value) {
            if (!name || !(name = name.trim())) {
                return null;
            }
            var expanded = name;
            switch (name.substr(0, 1)) {
                case ':':
                    expanded = "x-attr" + name;
                    break;
                case '.':
                    expanded = "x-class:" + name.substr(1);
                    break;
                case '@':
                    expanded = "x-on:" + name.substr(1);
                    break;
            }
            var matches = expanded.match(Region.directiveRegex);
            if (!matches || matches.length != 3 || !matches[2]) { //Not a directive
                return null;
            }
            var raw = matches[2], arg = {
                key: '',
                options: new Array()
            };
            var colonIndex = raw.indexOf(':'), options;
            if (colonIndex != -1) {
                options = raw.substr(colonIndex + 1).split('.');
                arg.key = options[0];
                raw = raw.substr(0, colonIndex);
            }
            else { //No args
                options = raw.split('.');
                raw = options[0];
            }
            for (var i = 1; i < options.length; ++i) {
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
        };
        Processor.GetCamelCaseDirectiveName = function (name) {
            return name.replace(/-([^-])/g, function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return (args[1].charAt(0).toUpperCase() + args[1].slice(1));
            });
        };
        return Processor;
    }());
    InlineJS.Processor = Processor;
    var Config = /** @class */ (function () {
        function Config() {
        }
        Config.SetDirectivePrefix = function (value) {
            Region.SetDirectivePrefix(value);
        };
        Config.SetExternalCallbacks = function (isEqual, deepCopy) {
            Region.externalCallbacks.isEqual = isEqual;
            Region.externalCallbacks.deepCopy = deepCopy;
        };
        Config.SetIsEqualExternalCallback = function (callback) {
            Region.externalCallbacks.isEqual = callback;
        };
        Config.SetDeepCopyExternalCallback = function (callback) {
            Region.externalCallbacks.deepCopy = callback;
        };
        Config.AddKeyEventMap = function (key, target) {
            Region.keyMap[key] = target;
        };
        Config.RemoveKeyEventMap = function (key) {
            delete Region.keyMap[key];
        };
        Config.AddBooleanAttribute = function (name) {
            Region.booleanAttributes.push(name);
        };
        Config.RemoveBooleanAttribute = function (name) {
            var index = Region.booleanAttributes.indexOf(name);
            if (index < Region.booleanAttributes.length) {
                Region.booleanAttributes.splice(index, 1);
            }
        };
        Config.SetOptimizedBindsState = function (enabled) {
            Region.enableOptimizedBinds = enabled;
        };
        Config.AddDirective = function (name, handler) {
            DirectiveHandlerManager.AddHandler(name, handler);
        };
        Config.RemoveDirective = function (name) {
            DirectiveHandlerManager.RemoveHandler(name);
        };
        Config.AddGlobalMagicProperty = function (name, callback) {
            Region.AddGlobal(('$' + name), callback);
        };
        Config.RemoveGlobalMagicProperty = function (name) {
            Region.RemoveGlobal(('$' + name));
        };
        return Config;
    }());
    InlineJS.Config = Config;
    var Bootstrap = /** @class */ (function () {
        function Bootstrap() {
        }
        Bootstrap.Attach = function (anchors) {
            if (!anchors) {
                anchors = ["data-" + Region.directivePrfix + "-data", Region.directivePrfix + "-data"];
            }
            anchors.forEach(function (anchor) {
                document.querySelectorAll("[" + anchor + "]").forEach(function (element) {
                    if (!element.hasAttribute(anchor)) { //Probably contained inside another region
                        return;
                    }
                    var regionId;
                    if (Bootstrap.lastRegionId_ === null) {
                        regionId = (Bootstrap.lastRegionId_ = 0);
                    }
                    else {
                        regionId = ++Bootstrap.lastRegionId_;
                    }
                    var stringRegionId = "rgn_" + regionId;
                    var region = new Region(stringRegionId, element, new RootProxy(stringRegionId, {}));
                    var observer = new MutationObserver(function (mutations) {
                        mutations.forEach(function (mutation) {
                            if (mutation.type === 'childList') {
                                mutation.removedNodes.forEach(function (node) {
                                    if ((node === null || node === void 0 ? void 0 : node.nodeType) === 1) {
                                        region.RemoveElement(node);
                                    }
                                });
                                mutation.addedNodes.forEach(function (node) {
                                    if ((node === null || node === void 0 ? void 0 : node.nodeType) === 1) {
                                        Processor.All(region, node, {
                                            checkTemplate: true,
                                            checkDocument: false
                                        });
                                    }
                                });
                            }
                            else if (mutation.type === 'attributes') {
                                var scope = region.GetElementScope(mutation.target);
                                if (scope) {
                                    scope.attributeChangeCallbacks.forEach(function (callback) { return callback(mutation.attributeName); });
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
                        characterData: false
                    });
                });
            });
            Region.ExecutePostProcessCallbacks();
        };
        Bootstrap.lastRegionId_ = null;
        return Bootstrap;
    }());
    InlineJS.Bootstrap = Bootstrap;
    (function () {
        RootProxy.AddGlobalCallbacks();
        CoreDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
