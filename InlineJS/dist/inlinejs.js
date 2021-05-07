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
        RegionMap.entries = {};
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
        Region.prototype.SetDoneInit = function () {
            this.doneInit_ = true;
        };
        Region.prototype.GetDoneInit = function () {
            return this.doneInit_;
        };
        Region.prototype.GenerateScopeId = function () {
            return this.id_ + "_scope_" + this.scopeId_++;
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
        Region.prototype.GetElementWith = function (target, callback) {
            var resolvedTarget = ((target === true) ? this.state_.GetElementContext() : target);
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
            if (this.componentKey_ && this.componentKey_ in Region.components_) {
                var targetRegion = Region.Get(Region.components_[this.componentKey_]);
                return (targetRegion ? targetRegion.rootProxy_ : this.rootProxy_);
            }
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
                isRoot: false
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
                scope.uninitCallbacks.splice(0).forEach(function (callback) {
                    try {
                        callback();
                    }
                    catch (err) {
                        _this.state_.ReportError(err, "InlineJs.Region<" + _this.id_ + ">.$uninit");
                    }
                });
                if (!preserve && !scope.preserve && !scope.preserveSubscriptions) {
                    Region.UnsubscribeAll(scope.changeRefs);
                    scope.changeRefs = [];
                    scope.element.removeAttribute(Region.GetElementKeyName());
                    Object.keys(scope.intersectionObservers).forEach(function (key) { return scope.intersectionObservers[key].unobserve(scope.element); });
                    scope.intersectionObservers = {};
                }
                else {
                    scope.preserve = !(preserve = true);
                }
                Array.from(scope.element.children).forEach(function (child) { return _this.RemoveElement(child, preserve); });
                if (!preserve) { //Delete scope
                    scope.trapInfoList.forEach(function (info) {
                        if (!info.stopped) {
                            info.stopped = true;
                            info.callback([]);
                        }
                    });
                    delete this.elementScopes_[scope.key];
                }
            }
            else if (typeof element !== 'string') {
                Array.from(element.children).forEach(function (child) { return _this.RemoveElement(child, preserve); });
            }
            if (!preserve && element === this.rootElement_) { //Remove from map
                Bootstrap.regionHooks.forEach(function (hook) { return hook(RegionMap.entries[_this.id_], false); });
                this.AddNextTickCallback(function () {
                    Evaluator.RemoveProxyCache(_this.id_);
                    if (_this.componentKey_ in Region.components_) {
                        delete Region.components_[_this.componentKey_];
                    }
                    delete RegionMap.entries[_this.id_];
                });
            }
        };
        Region.prototype.MarkElementAsRemoved = function (element) {
            var scope = this.GetElementScope(element);
            if (scope) {
                scope.removed = true;
            }
        };
        Region.prototype.ElementIsRemoved = function (element) {
            var scope = this.GetElementScope(element);
            return (scope && scope.removed);
        };
        Region.prototype.ElementIsContained = function (element, checkDocument) {
            if (checkDocument === void 0) { checkDocument = true; }
            if (typeof element === 'string') {
                return (element && element in this.elementScopes_);
            }
            if (!element || (checkDocument && !document.contains(element))) {
                return false;
            }
            var key = element.getAttribute(Region.GetElementKeyName());
            return ((key && key in this.elementScopes_) || this.ElementIsContained(element, false));
        };
        Region.prototype.ElementExists = function (element) {
            var scope = this.GetElementScope(element);
            return (scope && !scope.removed);
        };
        Region.prototype.AddOutsideEventCallback = function (element, events, callback) {
            var _this = this;
            var scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true)), id = this.id_;
            if (!scope) {
                return;
            }
            ((typeof events === 'string') ? [events] : events).forEach(function (event) {
                if (!(event in scope.outsideEventCallbacks)) {
                    scope.outsideEventCallbacks[event] = new Array();
                }
                scope.outsideEventCallbacks[event].push({
                    callback: callback,
                    excepts: null
                });
                if (!_this.outsideEvents_.includes(event)) {
                    _this.outsideEvents_.push(event);
                    document.body.addEventListener(event, function (e) {
                        var myRegion = Region.Get(id);
                        if (myRegion) {
                            Object.keys(myRegion.elementScopes_).forEach(function (key) {
                                var scope = myRegion.elementScopes_[key];
                                if (e.target !== scope.element && e.type in scope.outsideEventCallbacks && !scope.element.contains(e.target)) {
                                    scope.outsideEventCallbacks[e.type].forEach(function (info) {
                                        if (!info.excepts || info.excepts.findIndex(function (except) { return (except === e.target || except.contains(e.target)); }) == -1) {
                                            info.callback(e);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        };
        Region.prototype.RemoveOutsideEventCallback = function (element, events, callback) {
            var scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true));
            if (!scope) {
                return;
            }
            ((typeof events === 'string') ? [events] : events).forEach(function (event) {
                if (!(event in scope.outsideEventCallbacks)) {
                    return;
                }
                var index = scope.outsideEventCallbacks[event].findIndex(function (info) { return (info.callback === callback); });
                if (index != -1) {
                    scope.outsideEventCallbacks[event].splice(index, 1);
                }
            });
        };
        Region.prototype.AddOutsideEventExcept = function (element, list, callback) {
            if (!list) {
                return;
            }
            var scope = this.GetElementScope(element);
            if (!scope) {
                return;
            }
            Object.keys(list).forEach(function (key) {
                if (!(key in scope.outsideEventCallbacks)) {
                    return;
                }
                var infoList;
                if (callback) { //Find matching entry
                    var index = scope.outsideEventCallbacks[key].findIndex(function (info) { return (info.callback === callback); });
                    if (index != -1) {
                        infoList = scope.outsideEventCallbacks[key].slice(index, 1);
                    }
                    else {
                        infoList = null;
                    }
                }
                else {
                    infoList = scope.outsideEventCallbacks[key];
                }
                infoList.forEach(function (info) {
                    info.excepts = (info.excepts || []);
                    if (Array.isArray(list[key])) {
                        list[key].forEach(function (item) { return info.excepts.push(item); });
                    }
                    else { //Add single
                        info.excepts.push(list[key]);
                    }
                });
            });
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
                scope.locals = (scope.locals || {});
                scope.locals[key] = value;
            }
        };
        Region.prototype.GetLocal = function (element, key, bubble) {
            if (bubble === void 0) { bubble = true; }
            if (typeof element !== 'string') {
                for (var i = 0; i < this.localHandlers_.length; ++i) {
                    if (this.localHandlers_[i].element === element) {
                        return this.localHandlers_[i].callback(element, key, bubble);
                    }
                }
            }
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
        Region.prototype.AddLocalHandler = function (element, callback) {
            this.localHandlers_.push({
                element: element,
                callback: callback
            });
        };
        Region.prototype.RemoveLocalHandler = function (element) {
            this.localHandlers_ = this.localHandlers_.filter(function (info) { return (info.element !== element); });
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
            return Region.Get(RegionMap.scopeRegionIds.Peek() || id);
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
            if (!key || region.rootElement_ !== element || region.componentKey_) {
                return false;
            }
            region.componentKey_ = key;
            if (!(key in Region.components_)) {
                Region.components_[key] = region.GetId();
            }
            return true;
        };
        Region.RemoveElementStatic = function (element, preserve) {
            if (preserve === void 0) { preserve = false; }
            var region = Region.Infer(element);
            if (!region) {
                Array.from(element.children).forEach(function (child) { return Region.RemoveElementStatic(child); });
            }
            else {
                region.RemoveElement(element, preserve);
            }
        };
        Region.Find = function (key, getNativeProxy) {
            if (!key || !(key in Region.components_)) {
                return null;
            }
            var region = Region.Get(Region.components_[key]);
            return (region ? (getNativeProxy ? region.rootProxy_.GetNativeProxy() : region) : null);
        };
        Region.AddGlobal = function (key, callback, accessHandler) {
            Region.globals_[key] = {
                handler: callback,
                accessHandler: accessHandler
            };
        };
        Region.RemoveGlobal = function (key) {
            delete Region.globals_[key];
        };
        Region.GetGlobal = function (regionId, key) {
            if (!(key in Region.globals_)) {
                return null;
            }
            var info = Region.globals_[key];
            return ((!regionId || !info.accessHandler || info.accessHandler(regionId)) ? info.handler : null);
        };
        Region.GetGlobalValue = function (regionId, key, contextElement) {
            var global = Region.GetGlobal(regionId, key);
            return (global ? global(regionId, contextElement) : null);
        };
        Region.PushPostProcessCallback = function () {
            Region.postProcessCallbacks_.Push(new Array());
        };
        Region.AddPostProcessCallback = function (callback) {
            var list = Region.postProcessCallbacks_.Peek();
            if (list) {
                list.push(callback);
            }
        };
        Region.ExecutePostProcessCallbacks = function () {
            var list = Region.postProcessCallbacks_.Pop();
            if (list) {
                list.forEach(function (callback) {
                    try {
                        callback();
                    }
                    catch (err) {
                        console.error(err, "InlineJs.Region<NIL>.ExecutePostProcessCallbacks");
                    }
                });
            }
        };
        Region.AddGlobalOutsideEventCallback = function (element, events, callback) {
            ((typeof events === 'string') ? [events] : events).forEach(function (event) {
                if (!(event in Region.outsideEventCallbacks_)) {
                    Region.outsideEventCallbacks_[event] = new Array();
                }
                Region.outsideEventCallbacks_[event].push({
                    target: element,
                    handler: callback
                });
                if (!Region.globalOutsideEvents_.includes(event)) {
                    Region.globalOutsideEvents_.push(event);
                    document.body.addEventListener(event, function (e) {
                        if (!(e.type in Region.outsideEventCallbacks_)) {
                            return;
                        }
                        Region.outsideEventCallbacks_[e.type].forEach(function (info) {
                            if (e.target !== info.target && e.type in Region.outsideEventCallbacks_ && !info.target.contains(e.target)) {
                                info.handler(e);
                            }
                        });
                    }, true);
                }
            });
        };
        Region.RemoveGlobalOutsideEventCallback = function (element, events, callback) {
            ((typeof events === 'string') ? [events] : events).forEach(function (event) {
                if (!(event in Region.outsideEventCallbacks_)) {
                    return;
                }
                var index = Region.outsideEventCallbacks_[event].findIndex(function (info) { return (info.target === element && info.handler === callback); });
                if (index != -1) {
                    Region.outsideEventCallbacks_[event].splice(index, 1);
                }
            });
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
            return (target && typeof target === 'object' && (('__InlineJS_Target__' in target) || (target.__proto__ && target.__proto__.constructor.name === 'Object')));
        };
        Region.UnsubscribeAll = function (list) {
            (list || []).forEach(function (info) {
                var region = Region.Get(info.regionId);
                if (region) {
                    region.changes_.Unsubscribe(info.subscriptionId);
                }
            });
        };
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
            deepCopy: null
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
            Slash: '/'
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
            this.subscribers_ = {};
            this.subscriptionCallbacks_ = {};
            this.getAccessStorages_ = new Stack();
            this.getAccessHooks_ = new Stack();
            this.origins_ = new Stack();
        }
        Changes.prototype.GetRegionId = function () {
            return this.regionId_;
        };
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
                        if (item.path in _this.subscriptionCallbacks_) {
                            var subscriptionCallbacks_1 = _this.subscriptionCallbacks_[item.path];
                            Object.keys(subscriptionCallbacks_1).forEach(function (key) {
                                if (subscriptionCallbacks_1[key] !== Changes.GetOrigin(item)) { //Ignore originating callback
                                    Changes.AddBatch(batches_1, item, subscriptionCallbacks_1[key]);
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
                id = "sub_" + (this.subscriberId_ = 0);
            }
            else {
                id = "sub_" + ++this.subscriberId_;
            }
            var region = Region.GetCurrent(this.regionId_);
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
            (this.subscriptionCallbacks_[path] = (this.subscriptionCallbacks_[path] || {}))[id] = callback;
            this.subscribers_[id] = {
                path: path,
                callback: callback
            };
            return id;
        };
        Changes.prototype.Unsubscribe = function (id) {
            if (id in this.subscribers_) {
                delete this.subscriptionCallbacks_[this.subscribers_[id].path][id];
                delete this.subscribers_[id];
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
        Changes.prototype.FlushRawGetAccesses = function () {
            if (!Region.Get(this.regionId_).OptimizedBindsIsEnabled()) {
                return;
            }
            var info = this.getAccessStorages_.Peek();
            if (info && info.storage && info.storage.raw) {
                info.storage.raw = [];
            }
        };
        Changes.prototype.AddGetAccessesCheckpoint = function () {
            var info = this.getAccessStorages_.Peek();
            if (!info || !info.storage) {
                return;
            }
            if (info.storage.optimized) {
                info.storage.checkpoint.optimized = info.storage.optimized.length;
            }
            if (info.storage.raw) {
                info.storage.checkpoint.raw = info.storage.raw.length;
            }
        };
        Changes.prototype.DiscardGetAccessesCheckpoint = function () {
            var info = this.getAccessStorages_.Peek();
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
        };
        Changes.prototype.PushGetAccessStorage = function (storage) {
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
        State.prototype.TrapGetAccess = function (callback, changeCallback, elementContext, staticCallback) {
            var _this = this;
            var region = Region.Get(this.regionId_);
            if (!region) {
                return {};
            }
            var info = {
                stopped: false,
                callback: null
            };
            try {
                region.GetChanges().PushGetAccessStorage(null);
                info.stopped = (callback(null) === false);
            }
            catch (err) {
                this.ReportError(err, "InlineJs.Region<" + this.regionId_ + ">.State.TrapAccess");
            }
            var storage = region.GetChanges().PopGetAccessStorage(true);
            if (info.stopped || !changeCallback || storage.length == 0) { //Not reactive
                if (staticCallback) {
                    staticCallback();
                }
                return {};
            }
            if (elementContext) {
                var scope = region.GetElementScope(elementContext);
                if (!scope && typeof elementContext !== 'string') {
                    scope = region.AddElement(elementContext, false);
                }
                if (scope) { //Add info
                    scope.trapInfoList.push(info);
                }
            }
            var ids = {};
            var onChange = function (changes) {
                if (Object.keys(ids).length == 0) {
                    return;
                }
                var myRegion = Region.Get(_this.regionId_);
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
                    _this.ReportError(err, "InlineJs.Region<" + _this.regionId_ + ">.State.TrapAccess");
                }
                if (myRegion) {
                    myRegion.GetChanges().PopOrigin();
                }
                if (info.stopped) { //Unsubscribe all subscribed
                    var _loop_1 = function (regionId) {
                        var myRegion_1 = Region.Get(regionId);
                        if (myRegion_1) {
                            ids[regionId].forEach(function (id) { return myRegion_1.GetChanges().Unsubscribe(id); });
                        }
                    };
                    for (var regionId in ids) {
                        _loop_1(regionId);
                    }
                }
            };
            var uniqueEntries = {};
            storage.forEach(function (info) { return uniqueEntries[info.path] = info.regionId; });
            info.callback = onChange;
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
        Evaluator.Evaluate = function (regionId, elementContext, expression, useWindow, ignoreRemoved, useBlock) {
            if (useWindow === void 0) { useWindow = false; }
            if (ignoreRemoved === void 0) { ignoreRemoved = true; }
            if (useBlock === void 0) { useBlock = false; }
            if (!(expression = expression.trim())) {
                return null;
            }
            var region = Region.Get(regionId);
            if (!region) {
                return null;
            }
            if (ignoreRemoved && !region.ElementExists(elementContext)) {
                return null;
            }
            var result;
            var state = region.GetState();
            RegionMap.scopeRegionIds.Push(regionId);
            state.PushElementContext(region.GetElement(elementContext));
            try {
                if (useBlock) {
                    result = (new Function(Evaluator.GetContextKey(), "\n                        with (" + Evaluator.GetContextKey() + "){\n                            " + expression + ";\n                        };\n                    ")).bind(state.GetElementContext())(Evaluator.GetProxy(regionId, region.GetRootProxy().GetNativeProxy()));
                }
                else {
                    result = (new Function(Evaluator.GetContextKey(), "\n                        with (" + Evaluator.GetContextKey() + "){\n                            return (" + expression + ");\n                        };\n                    ")).bind(state.GetElementContext())(Evaluator.GetProxy(regionId, region.GetRootProxy().GetNativeProxy()));
                }
            }
            catch (err) {
                result = null;
                var element = state.GetElementContext();
                var elementId = element.getAttribute(Region.GetElementKeyName());
                state.ReportError(err, "InlineJs.Region<" + regionId + ">.Evaluator.Evaluate(" + element.tagName + "#" + elementId + ", " + expression + ")");
            }
            state.PopElementContext();
            RegionMap.scopeRegionIds.Pop();
            return result;
        };
        Evaluator.GetContextKey = function () {
            return '__InlineJS_Context__';
        };
        Evaluator.GetProxy = function (regionId, proxy) {
            if (regionId in Evaluator.cachedProxy_) {
                return Evaluator.cachedProxy_[regionId];
            }
            return (Evaluator.cachedProxy_[regionId] = Evaluator.CreateProxy(proxy));
        };
        Evaluator.CreateProxy = function (proxy) {
            return new window.Proxy({}, {
                get: function (target, prop) {
                    if ((!(prop in proxy) || ('__InlineJS_Target__' in proxy) && !(prop in proxy['__InlineJS_Target__'])) && (prop in window)) {
                        return window[prop]; //Use window
                    }
                    return proxy[prop];
                },
                set: function (target, prop, value) {
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
                deleteProperty: function (target, prop) {
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
                has: function (target, prop) {
                    return (Reflect.has(target, prop) || (prop in proxy));
                }
            });
        };
        Evaluator.RemoveProxyCache = function (regionId) {
            if (regionId in Evaluator.cachedProxy_) {
                delete Evaluator.cachedProxy_[regionId];
            }
        };
        Evaluator.cachedProxy_ = {};
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
                return ((value instanceof ChildProxy) ? value.GetNativeProxy() : value);
            }
        }
        return actualValue;
    }
    function AddChanges(changes, type, path, prop) {
        if (!changes) {
            return;
        }
        var change = {
            regionId: changes.GetRegionId(),
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
        if (exists && value === target[prop]) {
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
            this.proxies_ = {};
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
                        var local = region.GetLocal((contextElement || region.GetRootElement()), stringProp);
                        if (!(local instanceof NoResult)) { //Local found
                            return ((local instanceof Value) ? local.Get() : local);
                        }
                        var global = Region.GetGlobal(regionId, stringProp);
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
                var value = Evaluator.Evaluate(regionId, elementContext, "$use(" + expression + ")");
                previousValue = Region.DeepCopy(value);
                return (skipFirst || callback(value));
            }, onChange, elementContext);
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
            Region.AddGlobal('$proxy', function (regionId) { return Region.Get(regionId).GetRootProxy().GetNativeProxy(); });
            Region.AddGlobal('$refs', function (regionId) { return Region.Get(regionId).GetRefs(); });
            Region.AddGlobal('$self', function (regionId) { return Region.Get(regionId).GetState().GetElementContext(); });
            Region.AddGlobal('$root', function (regionId) { return Region.Get(regionId).GetRootElement(); });
            Region.AddGlobal('$parent', function (regionId) { return Region.Get(regionId).GetElementAncestor(true, 0); });
            Region.AddGlobal('$getAncestor', function (regionId) { return function (index) { return Region.Get(regionId).GetElementAncestor(true, index); }; });
            Region.AddGlobal('$form', function (regionId) { return Region.Get(regionId).GetElementWith(true, function (resolvedTarget) { return (resolvedTarget instanceof HTMLFormElement); }); });
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
            }; }, function (regionId) {
                var region = Region.GetCurrent(regionId);
                if (region) {
                    region.GetChanges().FlushRawGetAccesses();
                }
                return true;
            });
            Region.AddGlobal('$static', function (regionId) { return function (value) {
                var region = Region.GetCurrent(regionId);
                if (region) {
                    region.GetChanges().DiscardGetAccessesCheckpoint();
                }
                return value;
            }; }, function (regionId) {
                var region = Region.GetCurrent(regionId);
                if (region) {
                    region.GetChanges().AddGetAccessesCheckpoint();
                }
                return true;
            });
            Region.AddGlobal('$raw', function () { return function (value) {
                return ((Region.IsObject(value) && '__InlineJS_Target__' in value) ? value.__InlineJS_Target__ : value);
            }; });
            Region.AddGlobal('$or', function () { return function () {
                var values = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    values[_i] = arguments[_i];
                }
                for (var i = 0; i < values.length; ++i) {
                    if (values[i]) {
                        return true;
                    }
                }
                return false;
            }; });
            Region.AddGlobal('$and', function () { return function () {
                var values = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    values[_i] = arguments[_i];
                }
                for (var i = 0; i < values.length; ++i) {
                    if (!values[i]) {
                        return false;
                    }
                }
                return true;
            }; });
            Region.AddGlobal('$conditional', function () { return function (condition, trueValue, falseValue) {
                return (condition ? trueValue : falseValue);
            }; });
            Region.AddGlobal('$evaluate', function (regionId, contextElement) { return function (value, useWindow) {
                if (useWindow === void 0) { useWindow = false; }
                var args = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    args[_i - 2] = arguments[_i];
                }
                var region = Region.Get(regionId);
                return (region ? CoreDirectiveHandlers.Evaluate.apply(CoreDirectiveHandlers, __spreadArrays([region, contextElement, value, useWindow], args)) : null);
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
            this.proxies_ = {};
            var regionId = this.regionId_, parentPath = this.parentPath_, name = this.name_, isArray = Array.isArray(this.target_), tempProxy = new window.Proxy(this.target_, {
                get: function (target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return ProxyGetter(target, prop.toString(), regionId, parentPath, name);
                },
                set: function (target, prop, value) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.set(target, prop, value);
                    }
                    return ProxySetter(target, prop.toString(), value, regionId, parentPath, name);
                }
            });
            var handler = {
                get: function (target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    if ('__InlineJS_Target__' in target) {
                        return target[prop];
                    }
                    if (isArray && typeof prop === 'string') {
                        if (prop === 'unshift') {
                            return function () {
                                var items = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    items[_i] = arguments[_i];
                                }
                                var path = (parentPath ? parentPath + "." + name + ".unshift" : name + ".unshift");
                                AddChanges(Region.Get(regionId).GetChanges(), 'set', path + "." + items.length, "" + items.length);
                                return tempProxy['unshift'].apply(tempProxy, items);
                            };
                        }
                        else if (prop === 'shift') {
                            return function () {
                                var path = (parentPath ? parentPath + "." + name + ".shift" : name + ".shift");
                                AddChanges(Region.Get(regionId).GetChanges(), 'set', path + ".1", '1');
                                return tempProxy['shift']();
                            };
                        }
                        else if (prop === 'splice') {
                            return function (start, deleteCount) {
                                var items = [];
                                for (var _i = 2; _i < arguments.length; _i++) {
                                    items[_i - 2] = arguments[_i];
                                }
                                if (target.length <= start) {
                                    return tempProxy['splice'].apply(tempProxy, __spreadArrays([start, deleteCount], items));
                                }
                                var path = (parentPath ? parentPath + "." + name + ".splice" : name + ".splice");
                                AddChanges(Region.Get(regionId).GetChanges(), 'set', path + "." + start + "." + deleteCount + "." + items.length, start + "." + deleteCount + "." + items.length);
                                return tempProxy['splice'].apply(tempProxy, __spreadArrays([start, deleteCount], items));
                            };
                        }
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
        DirectiveHandlerManager.directiveHandlers_ = {};
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
            var proxy = region.GetRootProxy().GetNativeProxy(), data = CoreDirectiveHandlers.Evaluate(region, element, directive.value, true);
            if (!Region.IsObject(data)) {
                data = {};
            }
            if (data.$locals) { //Add local fields
                for (var field in data.$locals) {
                    region.AddLocal(element, field, data.$locals[field]);
                }
            }
            if ((data.$enableOptimizedBinds === true || data.$enableOptimizedBinds === false) && region.GetRootElement() === element) {
                region.SetOptimizedBindsState(data.$enableOptimizedBinds);
            }
            if (data.$component && region.GetRootElement() === element) {
                Region.AddComponent(region, element, data.$component);
            }
            var target, scope = (Region.Infer(element) || region).AddElement(element);
            var addedKeys = Object.keys(data).filter(function (key) { return (key !== '$locals' && key !== '$component' && key !== '$enableOptimizedBinds' && key !== '$init'); });
            scope.isRoot = true;
            if (region.GetRootElement() !== element) {
                var key_1 = region.GenerateScopeId();
                target = {};
                proxy[key_1] = target;
                scope.uninitCallbacks.push(function () {
                    delete proxy[key_1];
                });
                var regionId_1 = region.GetId();
                region.AddLocal(element, '$scope', CoreDirectiveHandlers.CreateProxy(function (prop) {
                    var myRegion = Region.Get(regionId_1), myProxy = myRegion.GetRootProxy().GetNativeProxy();
                    if (prop in target) {
                        return myProxy[key_1][prop];
                    }
                    if (prop === 'parent') {
                        return myRegion.GetLocal(myRegion.GetElementAncestor(element, 0), '$scope', true);
                    }
                    if (prop === 'key') {
                        return key_1;
                    }
                    return myProxy[key_1][prop];
                }, ['parent', 'key'], function (target, prop, value) {
                    if (prop in target || typeof prop !== 'string') {
                        target[prop] = value;
                        return true;
                    }
                    var myRegion = Region.Get(regionId_1), myProxy = myRegion.GetRootProxy().GetNativeProxy();
                    if ('__InlineJS_Target__' in myProxy[key_1] && prop in myProxy[key_1]['__InlineJS_Target__']) {
                        myProxy[key_1][prop] = value;
                        return true;
                    }
                    if (prop === 'parent' || prop === 'key') {
                        return false;
                    }
                    myProxy[key_1][prop] = value;
                    return true;
                }));
            }
            else {
                target = proxy['__InlineJS_Target__'];
                region.AddLocal(element, '$scope', proxy);
            }
            addedKeys.forEach(function (key) {
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
        };
        CoreDirectiveHandlers.Locals = function (region, element, directive) {
            var data = CoreDirectiveHandlers.Evaluate(region, element, directive.value, false);
            if (!Region.IsObject(data)) {
                return DirectiveHandlerReturn.Handled;
            }
            for (var field in data) {
                region.AddLocal(element, field, data[field]);
            }
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Component = function (region, element, directive) {
            return (Region.AddComponent(region, element, directive.value) ? DirectiveHandlerReturn.Handled : DirectiveHandlerReturn.Nil);
        };
        CoreDirectiveHandlers.Post = function (region, element, directive) {
            var regionId = region.GetId();
            region.AddElement(element, true).postProcessCallbacks.push(function () { return CoreDirectiveHandlers.BlockEvaluate(Region.Get(regionId), element, directive.value); });
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Init = function (region, element, directive) {
            CoreDirectiveHandlers.BlockEvaluate(region, element, directive.value);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Bind = function (region, element, directive) {
            region.GetState().TrapGetAccess(function () {
                CoreDirectiveHandlers.BlockEvaluate(region, element, directive.value);
                return true;
            }, true, element);
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
            region.AddElement(element, true).uninitCallbacks.push(function () { return CoreDirectiveHandlers.BlockEvaluateAlways(Region.Get(regionId), element, directive.value); });
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
                key.trim().replace(/\s\s+/g, ' ').split(' ').forEach(function (item) {
                    if (value) {
                        element.classList.add(item);
                    }
                    else if (element.classList.contains(item)) {
                        element.classList.remove(item);
                    }
                });
            }, null, true);
        };
        CoreDirectiveHandlers.InternalAttr = function (region, element, directive, callback, validator, acceptList) {
            if (acceptList === void 0) { acceptList = false; }
            var regionId = region.GetId();
            if (!directive.arg || !directive.arg.key) {
                var isList_1 = (acceptList && directive.arg && directive.arg.options.indexOf('list') != -1), list_1;
                region.GetState().TrapGetAccess(function () {
                    if (isList_1 && list_1) {
                        list_1.forEach(function (item) {
                            if (element.classList.contains(item)) {
                                element.classList.remove(item);
                            }
                        });
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
                }, true, element);
                return DirectiveHandlerReturn.Handled;
            }
            if (validator && !validator(directive.arg.key)) {
                return DirectiveHandlerReturn.Nil;
            }
            region.GetState().TrapGetAccess(function () {
                callback(directive.arg.key, CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }, true, element);
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
                onChange = function (value) { return element.innerHTML = CoreDirectiveHandlers.ToString(value); };
            }
            else if (element.tagName === 'INPUT') {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    onChange = function (value) {
                        var valueAttr = element.getAttribute('value');
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
                    onChange = function (value) { return element.value = CoreDirectiveHandlers.ToString(value); };
                }
            }
            else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                onChange = function (value) { return element.value = CoreDirectiveHandlers.ToString(value); };
            }
            else { //Unknown
                onChange = function (value) { return element.textContent = CoreDirectiveHandlers.ToString(value); };
            }
            var animator = null;
            if (directive.arg.key === 'animate') {
                if (!directive.arg.options.includes('counter')) {
                    directive.arg.options.unshift('counter');
                }
                animator = CoreDirectiveHandlers.GetAnimator(region, true, element, directive.arg.options, false);
            }
            region.GetState().TrapGetAccess(function () {
                if (!callback || callback()) {
                    if (animator) {
                        animator(true, null, null, {
                            value: CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value),
                            callback: function (result) {
                                onChange(result);
                            }
                        });
                    }
                    else {
                        onChange(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
                    }
                }
            }, true, element);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.On = function (region, element, directive) {
            if (!directive.arg || !directive.arg.key) {
                return DirectiveHandlerReturn.Nil;
            }
            var mobileMap = {
                click: 'touchend',
                mouseup: 'touchend',
                mousedown: 'touchstart',
                mousemove: 'touchmove'
            };
            var options = {
                outside: false,
                prevent: false,
                stop: false,
                immediate: false,
                once: false,
                document: false,
                window: false,
                self: false,
                nexttick: false
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
                else if (isKey) {
                    var key = Processor.GetCamelCaseDirectiveName(option, true);
                    keyOptions.keys_.push((key in Region.keyMap) ? Region.keyMap[key] : key);
                }
            });
            var regionId = region.GetId(), stoppable;
            var doEvaluation = function (myRegion, e) {
                try {
                    if (myRegion) {
                        myRegion.GetState().PushEventContext(e);
                    }
                    CoreDirectiveHandlers.BlockEvaluate(myRegion, element, directive.value, false, e);
                }
                finally {
                    if (myRegion) {
                        myRegion.GetState().PopEventContext();
                    }
                }
            };
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
                if (stoppable && options.immediate) {
                    e.stopImmediatePropagation();
                }
                if (options.nexttick) {
                    myRegion.AddNextTickCallback(function () {
                        doEvaluation(Region.Get(regionId), e);
                    });
                }
                else {
                    doEvaluation(myRegion, e);
                }
            };
            var event = region.ExpandEvent(directive.arg.key, element), mappedEvent = null;
            if (directive.arg.options.includes('mobile') && (event in mobileMap)) {
                mappedEvent = mobileMap[event];
            }
            if (!options.outside) {
                stoppable = true;
                if (options.window || options.document) {
                    var target_1 = (options.window ? window : document);
                    target_1.addEventListener(event, onEvent);
                    if (mappedEvent) {
                        target_1.addEventListener(mappedEvent, onEvent);
                    }
                    region.AddElement(element).uninitCallbacks.push(function () {
                        target_1.removeEventListener(event, onEvent);
                        if (mappedEvent) {
                            target_1.removeEventListener(mappedEvent, onEvent);
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
        };
        CoreDirectiveHandlers.OutsideEventExcept = function (region, element, directive) {
            region.AddOutsideEventExcept(element, CoreDirectiveHandlers.Evaluate(region, element, directive.value));
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
            var regionId = region.GetId(), animator = CoreDirectiveHandlers.GetAnimator(region, (directive.arg.key === 'animate'), element, directive.arg.options, false);
            if (animator) {
                var lastValue_1 = null, showOnly_1 = directive.arg.options.includes('show'), hideOnly_1 = (!showOnly_1 && directive.arg.options.includes('hide'));
                region.GetState().TrapGetAccess(function () {
                    lastValue_1 = !!CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                    element.style.display = (lastValue_1 ? showValue : 'none');
                }, function () {
                    if (lastValue_1 != (!!CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value))) {
                        lastValue_1 = !lastValue_1;
                        if ((lastValue_1 ? !hideOnly_1 : !showOnly_1)) {
                            animator(lastValue_1, function (show) {
                                if (show) {
                                    element.style.display = showValue;
                                }
                            }, function (show) {
                                if (!show) {
                                    element.style.display = 'none';
                                }
                            });
                        }
                        else { //No animation
                            element.style.display = (lastValue_1 ? showValue : 'none');
                        }
                    }
                }, element);
            }
            else {
                region.GetState().TrapGetAccess(function () {
                    element.style.display = (CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value) ? showValue : 'none');
                }, true, element);
            }
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.If = function (region, element, directive) {
            var info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original, function () {
                if (itemInfo) {
                    CoreDirectiveHandlers.RemoveIfOrEachItem(itemInfo, info);
                }
            });
            if (!info) {
                return DirectiveHandlerReturn.Nil;
            }
            var lastValue = false, itemInfo = null, animate = (directive.arg.key === 'animate');
            info.subscriptions = region.GetState().TrapGetAccess(function () {
                var value = !!CoreDirectiveHandlers.Evaluate(Region.Get(info.regionId), element, directive.value);
                if (value != lastValue) {
                    lastValue = value;
                    if (value) { //Insert into parent
                        itemInfo = CoreDirectiveHandlers.InsertIfOrEachItem(info, animate, directive.arg.options);
                    }
                    else if (itemInfo) {
                        CoreDirectiveHandlers.RemoveIfOrEachItem(itemInfo, info);
                    }
                }
            }, true, null);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.Each = function (region, element, directive) {
            var info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original, function () {
                empty(Region.Get(info.regionId));
            }), isCount = false, isReverse = false;
            if (!info) {
                return DirectiveHandlerReturn.Nil;
            }
            if (directive.arg) {
                isCount = directive.arg.options.includes('count');
                isReverse = directive.arg.options.includes('reverse');
            }
            var options = {
                clones: null,
                items: null,
                itemsTarget: null,
                count: 0,
                path: null,
                rangeValue: null
            };
            var valueKey = '', matches = directive.value.match(/^(.+)? as[ ]+([A-Za-z_][0-9A-Za-z_$]*)[ ]*$/), expression, animate = (directive.arg.key === 'animate');
            if (matches && 2 < matches.length) {
                expression = matches[1];
                valueKey = matches[2];
            }
            else {
                expression = directive.value;
            }
            var scopeId = region.GenerateScopeId();
            var addSizeChange = function (myRegion) {
                myRegion.GetChanges().Add({
                    regionId: info.regionId,
                    type: 'set',
                    path: scopeId + ".$each.count",
                    prop: 'count',
                    origin: myRegion.GetChanges().GetOrigin()
                });
            };
            var locals = function (myRegion, cloneInfo) {
                myRegion.AddLocal(cloneInfo.itemInfo.clone, '$each', CoreDirectiveHandlers.CreateProxy(function (prop) {
                    var innerRegion = Region.Get(info.regionId);
                    if (prop === 'count') {
                        innerRegion.GetChanges().AddGetAccess(scopeId + ".$each.count");
                        return options.count;
                    }
                    if (prop === 'index') {
                        if (typeof cloneInfo.key === 'number') {
                            var myScope = innerRegion.AddElement(cloneInfo.itemInfo.clone);
                            innerRegion.GetChanges().AddGetAccess(myScope.key + ".$each.index");
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
                    myRegion.AddLocal(cloneInfo.itemInfo.clone, valueKey, new Value(function () {
                        return options.items[cloneInfo.key];
                    }));
                }
            };
            var append = function (myRegion, key) {
                if (typeof key !== 'string') {
                    if (typeof key === 'number') {
                        for (var index = key; index < options.clones.length; ++index) {
                            var cloneInfo = options.clones[index], myScope = myRegion.GetElementScope(cloneInfo.itemInfo.clone);
                            if (myScope) {
                                AddChanges(myRegion.GetChanges(), 'set', myScope.key + ".$each.index", 'index');
                            }
                            ++cloneInfo.key;
                        }
                    }
                    else { //Array
                        key = options.clones.length;
                    }
                    CoreDirectiveHandlers.InsertIfOrEachItem(info, animate, directive.arg.options, function (itemInfo) {
                        if (key < options.clones.length) {
                            options.clones.splice(key, 0, {
                                key: key,
                                itemInfo: itemInfo
                            });
                        }
                        else { //Append
                            options.clones.push({
                                key: key,
                                itemInfo: itemInfo
                            });
                        }
                        locals(myRegion, options.clones[key]);
                    }, key);
                }
                else { //Map
                    CoreDirectiveHandlers.InsertIfOrEachItem(info, animate, directive.arg.options, function (itemInfo) {
                        options.clones[key] = {
                            key: key,
                            itemInfo: itemInfo
                        };
                        locals(myRegion, options.clones[key]);
                    }, Object.keys(options.items).indexOf(key));
                }
            };
            var empty = function (myRegion) {
                if (!Array.isArray(options.clones)) {
                    Object.keys(options.clones || {}).forEach(function (key) {
                        var myInfo = options.clones[key];
                        CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info);
                    });
                }
                else { //Array
                    (options.clones || []).forEach(function (myInfo) { return CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info); });
                }
                options.clones = null;
                options.path = null;
            };
            var getRange = function (from, to) {
                if (from < to) {
                    return Array.from({ length: (to - from) }, function (value, key) { return (key + from); });
                }
                return Array.from({ length: (from - to) }, function (value, key) { return (from - key); });
            };
            var arrayChangeHandler = function (myRegion, change, isOriginal) {
                if (isOriginal) {
                    if (change.path === options.path + ".unshift." + change.prop) {
                        var count = (Number.parseInt(change.prop) || 0);
                        options.count += count;
                        addSizeChange(myRegion);
                        for (var index_1 = 0; index_1 < count; ++index_1) {
                            append(myRegion, index_1);
                        }
                    }
                    else if (change.path === options.path + ".shift." + change.prop) {
                        var count_1 = (Number.parseInt(change.prop) || 0);
                        options.count -= count_1;
                        addSizeChange(myRegion);
                        options.clones.splice(0, count_1).forEach(function (myInfo) { return CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info); });
                        options.clones.forEach(function (cloneInfo) {
                            var myScope = myRegion.GetElementScope(cloneInfo.itemInfo.clone);
                            if (myScope) {
                                AddChanges(myRegion.GetChanges(), 'set', myScope.key + ".$each.index", 'index');
                            }
                            cloneInfo.key -= count_1;
                        });
                    }
                    else if (change.path === options.path + ".splice." + change.prop) {
                        var parts = change.prop.split('.'); //start.deleteCount.itemsCount
                        var index_2 = (Number.parseInt(parts[0]) || 0);
                        var itemsCount = (Number.parseInt(parts[2]) || 0);
                        var removedClones = options.clones.splice(index_2, (Number.parseInt(parts[1]) || 0));
                        removedClones.forEach(function (myInfo) { return CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info); });
                        for (var i = index_2; i < (itemsCount + index_2); ++i) {
                            append(myRegion, i);
                        }
                        options.count += (itemsCount - removedClones.length);
                        addSizeChange(myRegion);
                        for (var i = (index_2 + itemsCount); i < options.clones.length; ++i) {
                            var cloneInfo = options.clones[i], myScope = myRegion.GetElementScope(cloneInfo.itemInfo.clone);
                            if (myScope) {
                                AddChanges(myRegion.GetChanges(), 'set', myScope.key + ".$each.index", 'index');
                            }
                            cloneInfo.key -= removedClones.length;
                        }
                    }
                    else if (change.path === options.path + ".push." + change.prop) {
                        var count = (Number.parseInt(change.prop) || 0);
                        options.count += count;
                        addSizeChange(myRegion);
                        for (var index_3 = 0; index_3 < count; ++index_3) {
                            append(myRegion);
                        }
                    }
                    if (change.path !== options.path + "." + change.prop) {
                        return;
                    }
                }
                var index = ((change.prop === 'length') ? null : Number.parseInt(change.prop));
                if (!index && index !== 0) { //Not an index
                    return;
                }
                if (change.type === 'set' && options.clones.length <= index) { //Element added
                    ++options.count;
                    addSizeChange(myRegion);
                    append(myRegion);
                }
                else if (change.type === 'delete' && index < options.clones.length) {
                    options.clones.splice(index, 1).forEach(function (myInfo) {
                        --options.count;
                        addSizeChange(myRegion);
                        CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info);
                    });
                }
            };
            var mapChangeHandler = function (myRegion, change, isOriginal) {
                if (isOriginal && change.path !== options.path + "." + change.prop) {
                    return;
                }
                var key = change.prop;
                if (change.type === 'set' && !(key in options.clones)) { //Element added
                    ++options.count;
                    addSizeChange(myRegion);
                    append(myRegion, key);
                }
                else if (change.type === 'delete' && (key in options.clones)) {
                    --options.count;
                    addSizeChange(myRegion);
                    var myInfo = options.clones[key];
                    delete options.clones[key];
                    CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info);
                }
            };
            var changeHandler;
            var initOptions = function (target, count, handler, createClones) {
                if (Region.IsObject(target) && '__InlineJS_Path__' in target) {
                    options.path = target['__InlineJS_Path__'];
                }
                options.items = target;
                options.itemsTarget = getTarget(target);
                options.count = count;
                options.clones = createClones();
                changeHandler = handler;
            };
            var init = function (myRegion, target) {
                var isRange = (typeof target === 'number' && Number.isInteger(target));
                if (isRange && !isReverse && options.rangeValue !== null && target <= options.count) { //Range value decrement
                    var diff = (options.count - target);
                    if (0 < diff) {
                        options.count = target;
                        addSizeChange(myRegion);
                        options.items.splice(target, diff);
                        options.clones.splice(target, diff).forEach(function (myInfo) { return CoreDirectiveHandlers.RemoveIfOrEachItem(myInfo.itemInfo, info); });
                    }
                    return true;
                }
                if (!isRange || isReverse || options.rangeValue === null) {
                    empty(myRegion);
                }
                if (isRange) {
                    var offset = (isCount ? 1 : 0), items = void 0;
                    if (target < 0) {
                        items = (isReverse ? getRange((target - offset + 1), (1 - offset)) : getRange(-offset, (target - offset)));
                    }
                    else {
                        items = (isReverse ? getRange((target + offset - 1), (offset - 1)) : getRange(offset, (target + offset)));
                    }
                    if (!isReverse && options.rangeValue !== null) { //Ranged value increment
                        var addedItems = items.splice(options.count);
                        options.count = target;
                        addSizeChange(myRegion);
                        options.items = options.items.concat(addedItems);
                        addedItems.forEach(function (item) { return append(myRegion); });
                        options.rangeValue = target;
                    }
                    else {
                        options.rangeValue = target;
                        initOptions(items, items.length, arrayChangeHandler, function () { return new Array(); });
                        items.forEach(function (item) { return append(myRegion); });
                    }
                }
                else if (Array.isArray(target)) {
                    var items = getTarget(target);
                    options.rangeValue = null;
                    initOptions(target, items.length, arrayChangeHandler, function () { return new Array(); });
                    items.forEach(function (item) { return append(myRegion); });
                }
                else if (Region.IsObject(target)) {
                    var keys = Object.keys(getTarget(target));
                    options.rangeValue = null;
                    initOptions(target, keys.length, mapChangeHandler, function () { return ({}); });
                    keys.forEach(function (key) { return append(myRegion, key); });
                }
                return true;
            };
            var getTarget = function (target) {
                return (((Array.isArray(target) || Region.IsObject(target)) && ('__InlineJS_Target__' in target)) ? target['__InlineJS_Target__'] : target);
            };
            info.subscriptions = region.GetState().TrapGetAccess(function () {
                var myRegion = Region.Get(info.regionId), target = CoreDirectiveHandlers.Evaluate(myRegion, element, expression);
                init(myRegion, target);
            }, function (changes) {
                var myRegion = Region.Get(info.regionId);
                changes.forEach(function (change) {
                    if ('original' in change) { //Bubbled change
                        if (changeHandler) {
                            changeHandler(myRegion, change.original, true);
                        }
                    }
                    else if (change.type === 'set') { //Target changed
                        var target = CoreDirectiveHandlers.Evaluate(myRegion, element, expression);
                        if (getTarget(target) !== options.itemsTarget) {
                            init(myRegion, target);
                        }
                    }
                    else if (change.type === 'delete' && change.path === options.path) { //Item deleted
                        if (changeHandler) {
                            changeHandler(myRegion, change, false);
                        }
                    }
                });
                return true;
            }, null);
            return DirectiveHandlerReturn.Handled;
        };
        CoreDirectiveHandlers.InitIfOrEach = function (region, element, except, onUninit) {
            if (!element.parentElement || !(element instanceof HTMLTemplateElement) || element.content.children.length != 1) {
                return null;
            }
            var scope = region.AddElement(element);
            if (!scope) {
                return null;
            }
            var info = {
                regionId: region.GetId(),
                template: element,
                parent: element.parentElement,
                blueprint: element.content.firstElementChild
            };
            scope.uninitCallbacks.push(function () {
                Object.keys(info.subscriptions || {}).forEach(function (key) {
                    var targetRegion = Region.Get(key);
                    if (targetRegion) {
                        var changes_1 = targetRegion.GetChanges();
                        info.subscriptions[key].forEach(function (id) { return changes_1.Unsubscribe(id); });
                    }
                    delete info.subscriptions[key];
                });
                onUninit();
            });
            return info;
        };
        CoreDirectiveHandlers.InsertIfOrEach = function (regionId, element, info, callback, offset) {
            if (offset === void 0) { offset = 0; }
            if (!element.parentElement) {
                element.removeAttribute(Region.GetElementKeyName());
                CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, element, (offset || 0), info.template);
            }
            if (callback) {
                callback();
            }
            Processor.All((Region.Infer(element) || Region.Get(regionId) || Bootstrap.CreateRegion(element)), element);
        };
        CoreDirectiveHandlers.InsertIfOrEachItem = function (info, animate, options, callback, offset) {
            if (offset === void 0) { offset = 0; }
            var clone = info.blueprint.cloneNode(true);
            var animator = (animate ? CoreDirectiveHandlers.GetAnimator(Region.Get(info.regionId), true, clone, options) : null);
            CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, clone, offset, info.template); //Temporarily insert element into DOM
            var itemInfo = {
                clone: clone,
                animator: animator,
                onLoadList: new Array()
            };
            if (callback) {
                callback(itemInfo);
            }
            if (animator) { //Animate view
                animator(true, null, function () {
                    if (clone.parentElement) { //Execute directives
                        CoreDirectiveHandlers.InsertIfOrEach(info.regionId, clone, info, null, 0);
                    }
                });
            }
            else { //Immediate insertion
                CoreDirectiveHandlers.InsertIfOrEach(info.regionId, clone, info, null, 0);
            }
            return itemInfo;
        };
        CoreDirectiveHandlers.RemoveIfOrEachItem = function (itemInfo, info) {
            var afterRemove = function () {
                var myRegion = Region.Get(info.regionId);
                if (myRegion) {
                    myRegion.MarkElementAsRemoved(itemInfo.clone);
                }
            };
            if (itemInfo.animator) { //Animate view
                itemInfo.animator(false, null, function () {
                    if (itemInfo.clone.parentElement) {
                        itemInfo.clone.parentElement.removeChild(itemInfo.clone);
                        afterRemove();
                    }
                });
            }
            else if (itemInfo.clone.parentElement) { //Immediate removal
                itemInfo.clone.parentElement.removeChild(itemInfo.clone);
                afterRemove();
            }
        };
        CoreDirectiveHandlers.CreateProxy = function (getter, contains, setter, target) {
            var hasTarget = !!target;
            var handler = {
                get: function (target, prop) {
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')) {
                        return Reflect.get(target, prop);
                    }
                    return getter(prop.toString());
                },
                set: function (target, prop, value) {
                    if (hasTarget) {
                        return (setter ? setter(target, prop, value) : Reflect.set(target, prop, value));
                    }
                    return (setter && setter(target, prop, value));
                },
                deleteProperty: function (target, prop) {
                    return (hasTarget ? Reflect.deleteProperty(target, prop) : false);
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
            return new window.Proxy((target || {}), handler);
        };
        CoreDirectiveHandlers.Evaluate = function (region, element, expression, useWindow) {
            if (useWindow === void 0) { useWindow = false; }
            var args = [];
            for (var _i = 4; _i < arguments.length; _i++) {
                args[_i - 4] = arguments[_i];
            }
            return CoreDirectiveHandlers.DoEvaluation.apply(CoreDirectiveHandlers, __spreadArrays([region, element, expression, useWindow, true, false], args));
        };
        CoreDirectiveHandlers.EvaluateAlways = function (region, element, expression, useWindow) {
            if (useWindow === void 0) { useWindow = false; }
            var args = [];
            for (var _i = 4; _i < arguments.length; _i++) {
                args[_i - 4] = arguments[_i];
            }
            return CoreDirectiveHandlers.DoEvaluation.apply(CoreDirectiveHandlers, __spreadArrays([region, element, expression, useWindow, false, false], args));
        };
        CoreDirectiveHandlers.BlockEvaluate = function (region, element, expression, useWindow) {
            if (useWindow === void 0) { useWindow = false; }
            var args = [];
            for (var _i = 4; _i < arguments.length; _i++) {
                args[_i - 4] = arguments[_i];
            }
            return CoreDirectiveHandlers.DoEvaluation.apply(CoreDirectiveHandlers, __spreadArrays([region, element, expression, useWindow, true, true], args));
        };
        CoreDirectiveHandlers.BlockEvaluateAlways = function (region, element, expression, useWindow) {
            if (useWindow === void 0) { useWindow = false; }
            var args = [];
            for (var _i = 4; _i < arguments.length; _i++) {
                args[_i - 4] = arguments[_i];
            }
            return CoreDirectiveHandlers.DoEvaluation.apply(CoreDirectiveHandlers, __spreadArrays([region, element, expression, useWindow, false, true], args));
        };
        CoreDirectiveHandlers.DoEvaluation = function (region, element, expression, useWindow, ignoreRemoved, useBlock) {
            var args = [];
            for (var _i = 6; _i < arguments.length; _i++) {
                args[_i - 6] = arguments[_i];
            }
            if (!region) {
                return null;
            }
            RegionMap.scopeRegionIds.Push(region.GetId());
            region.GetState().PushElementContext(element);
            var result;
            try {
                result = Evaluator.Evaluate(region.GetId(), element, expression, useWindow, ignoreRemoved, useBlock);
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
            if (Region.IsObject(value) || Array.isArray(value)) {
                return JSON.stringify(value);
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
        CoreDirectiveHandlers.InsertOrAppendChildElement = function (parent, element, index, after) {
            if (after) {
                index += (CoreDirectiveHandlers.GetChildElementIndex(after) + 1);
            }
            var sibling = CoreDirectiveHandlers.GetChildElementAt(parent, index);
            if (sibling) {
                parent.insertBefore(element, sibling);
            }
            else { //Append
                parent.appendChild(element);
            }
        };
        CoreDirectiveHandlers.GetAnimator = function (region, animate, element, options, always) {
            if (always === void 0) { always = true; }
            var animator = ((animate && CoreDirectiveHandlers.PrepareAnimation) ? CoreDirectiveHandlers.PrepareAnimation(region, element, options) : null);
            if (!animator && always) { //Use a dummy animator
                animator = function (show, beforeCallback, afterCallback) {
                    if (beforeCallback) {
                        beforeCallback(show);
                    }
                    if (afterCallback) {
                        afterCallback(show);
                    }
                };
            }
            return animator;
        };
        CoreDirectiveHandlers.AddAll = function () {
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
            DirectiveHandlerManager.AddHandler('outsideEventExcept', CoreDirectiveHandlers.OutsideEventExcept);
            DirectiveHandlerManager.AddHandler('model', CoreDirectiveHandlers.Model);
            DirectiveHandlerManager.AddHandler('show', CoreDirectiveHandlers.Show);
            DirectiveHandlerManager.AddHandler('if', CoreDirectiveHandlers.If);
            DirectiveHandlerManager.AddHandler('each', CoreDirectiveHandlers.Each);
        };
        CoreDirectiveHandlers.PrepareAnimation = null;
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
                scope[scopeKey].splice(0).forEach(function (callback) {
                    try {
                        callback();
                    }
                    catch (err) {
                        region.GetState().ReportError(err, "InlineJs.Region<" + region.GetId() + ">.Processor." + name + "(Element@" + element.nodeName + ")");
                    }
                });
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
        };
        Processor.GetCamelCaseDirectiveName = function (name, ucfirst) {
            if (ucfirst === void 0) { ucfirst = false; }
            var converted = name.replace(/-([^-])/g, function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return (args[1].charAt(0).toUpperCase() + args[1].slice(1));
            });
            return ((ucfirst && 0 < converted.length) ? (converted.charAt(0).toUpperCase() + converted.slice(1)) : converted);
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
        Config.GetDirectivePrefix = function (value) {
            return Region.directivePrfix;
        };
        Config.GetDirectiveName = function (value) {
            return Region.directivePrfix + "-" + value;
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
        Config.AddGlobalMagicProperty = function (name, value) {
            if (typeof value === 'function') {
                Region.AddGlobal(('$' + name), value);
            }
            else {
                Region.AddGlobal(('$' + name), function () { return value; });
            }
        };
        Config.RemoveGlobalMagicProperty = function (name) {
            Region.RemoveGlobal(('$' + name));
        };
        Config.AddRegionHook = function (handler) {
            Bootstrap.regionHooks.push(handler);
        };
        Config.RemoveRegionHook = function (handler) {
            Bootstrap.regionHooks.splice(Bootstrap.regionHooks.indexOf(handler), 1);
        };
        return Config;
    }());
    InlineJS.Config = Config;
    var Bootstrap = /** @class */ (function () {
        function Bootstrap() {
        }
        Bootstrap.Attach_ = function (node) {
            Region.PushPostProcessCallback();
            (Bootstrap.anchors_ || ["data-" + Region.directivePrfix + "-data", Region.directivePrfix + "-data"]).forEach(function (anchor) {
                (node || document).querySelectorAll("[" + anchor + "]").forEach(function (element) {
                    if (!element.hasAttribute(anchor) || !document.contains(element)) { //Probably contained inside another region
                        return;
                    }
                    var region = Bootstrap.CreateRegion(element);
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
                                var directive = (mutation.target.hasAttribute(mutation.attributeName) ? Processor.GetDirectiveWith(mutation.attributeName, mutation.target.getAttribute(mutation.attributeName)) : null);
                                if (!directive) {
                                    var scope = region.GetElementScope(mutation.target);
                                    if (scope) {
                                        scope.attributeChangeCallbacks.forEach(function (callback) { return callback(mutation.attributeName); });
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
                        characterData: false
                    });
                    Bootstrap.regionHooks.forEach(function (hook) { return hook(region, true); });
                });
            });
            Region.ExecutePostProcessCallbacks();
        };
        Bootstrap.Attach = function (anchors, node) {
            Bootstrap.anchors_ = anchors;
            Bootstrap.Attach_(node);
        };
        Bootstrap.Reattach = function (node) {
            Bootstrap.Attach_(node);
        };
        Bootstrap.CreateRegion = function (element) {
            var regionId = (Bootstrap.lastRegionId_ = (Bootstrap.lastRegionId_ || 0)), regionSubId;
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
            var stringRegionId = "rgn__" + regionId + "_" + regionSubId;
            var region = new Region(stringRegionId, element, new RootProxy(stringRegionId, {}));
            return (RegionMap.entries[region.GetId()] = region);
        };
        Bootstrap.lastRegionId_ = null;
        Bootstrap.lastRegionSubId_ = null;
        Bootstrap.anchors_ = null;
        Bootstrap.regionHooks = new Array();
        return Bootstrap;
    }());
    InlineJS.Bootstrap = Bootstrap;
    (function () {
        RootProxy.AddGlobalCallbacks();
        CoreDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
