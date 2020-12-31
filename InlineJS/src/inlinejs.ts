export namespace InlineJS{
    export class Stack<T>{
        private list_: Array<T> = new Array<T>();

        public Push(value: T): void{
            this.list_.push(value);
        }

        public Pop(): T{
            return this.list_.pop();
        }

        public Peek(): T{
            return ((this.list_.length == 0) ? null : this.list_[this.list_.length - 1]);
        }

        public IsEmpty(): boolean{
            return (this.list_.length == 0);
        }
    }
    
    export class NoResult{}

    export class Value{
        constructor(private callback_: () => any){}

        public Get(): any{
            return this.callback_();
        }
    }

    export interface ChangeRefInfo{
        regionId: string;
        subscriptionId: number;
    }
    
    export interface TrapInfo{
        stopped: boolean;
        callback: ChangeCallbackType;
    }

    export interface ElementScope{
        key: string;
        element: HTMLElement;
        locals: Record<string, any>;
        uninitCallbacks: Array<() => void>;
        changeRefs: Array<ChangeRefInfo>;
        directiveHandlers: Record<string, DirectiveHandlerType>;
        preProcessCallbacks: Array<() => void>;
        postProcessCallbacks: Array<() => void>;
        eventExpansionCallbacks: Array<(event: string) => string | null>;
        outsideEventCallbacks: Record<string, Array<(event: Event) => void>>;
        attributeChangeCallbacks: Array<(name: string) => void>;
        intersectionObservers: Record<string, IntersectionObserver>;
        falseIfCondition: Array<() => void>;
        trapInfoList: Array<TrapInfo>;
        removed: boolean;
        preserve: boolean;
        preserveSubscriptions: boolean;
        paused: boolean;
    }

    export interface LocalHandler{
        element: HTMLElement;
        callback: (element: HTMLElement, prop: string, bubble: boolean) => any;
    }

    export interface ExternalCallbacks{
        isEqual: (first: any, second: any) => boolean;
        deepCopy: (target: any) => any;
    }

    export class RegionMap{
        public static entries: Record<string, Region> = {};
        public static scopeRegionIds = new Stack<string>();
    }
    
    export type GlobalCallbackType = (regionId?: string, contextElement?: HTMLElement) => any;
    export class RootElement{};

    export interface GlobalAttributeInfo{
        handler: GlobalCallbackType;
        accessHandler: (regionId?: string) => boolean;
    }
    
    export class Region{
        private static components_: Record<string, string> = {};
        private static globals_: Record<string, GlobalAttributeInfo> = {};
        private static postProcessCallbacks_ = new Array<() => void>();

        public static enableOptimizedBinds = true;
        public static directivePrfix = 'x';
        public static directiveRegex = /^(data-)?x-(.+)$/;
        public static externalCallbacks: ExternalCallbacks = {
            isEqual: null,
            deepCopy: null,
        };

        public static keyMap = {
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

        public static booleanAttributes = new Array<string>(
            'allowfullscreen', 'allowpaymentrequest', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
            'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'ismap', 'itemscope', 'loop', 'multiple', 'muted',
            'nomodule', 'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected',
        );
        
        private componentKey_ = '';
        private doneInit_ = false;
        private elementScopes_: Record<string, ElementScope> = {};
        private lastElementId_: number = null;
        private state_: State;
        private changes_: Changes;
        private proxies_: Record<string, Proxy> = {};
        private refs_: Record<string, HTMLElement> = {};
        private observer_: MutationObserver = null;
        private outsideEvents_ = new Array<string>();
        private localHandlers_ = new Array<LocalHandler>();
        private nextTickCallbacks_ = new Array<() => void>();
        private tempCallbacks_: Record<string, () => any> = {};
        private scopeId_ = 0;
        private tempCallbacksId_ = 0;
        private enableOptimizedBinds_ = true;

        public constructor(private id_: string, private rootElement_: HTMLElement, private rootProxy_: RootProxy){
            this.state_ = new State(this.id_);
            this.changes_ = new Changes(this.id_);
            this.enableOptimizedBinds_ = Region.enableOptimizedBinds;
        }

        public SetDoneInit(){
            this.doneInit_ = true;
        }

        public GetDoneInit(){
            return this.doneInit_;
        }

        public GenerateScopeId(){
            return `${this.id_}_scope_${this.scopeId_++}`;
        }

        public GetId(){
            return this.id_;
        }

        public GetComponentKey(){
            return this.componentKey_;
        }

        public GetRootElement(){
            return this.rootElement_;
        }

        public GetElementWith(target: HTMLElement | true, callback: (resolvedTarget: HTMLElement) => boolean): HTMLElement{
            let resolvedTarget = ((target === true) ? this.state_.GetElementContext() : target);
            while (resolvedTarget){
                if (callback(resolvedTarget)){
                    return resolvedTarget;
                }

                if (resolvedTarget === this.rootElement_){
                    break;
                }

                resolvedTarget = resolvedTarget.parentElement;
            }

            return null;
        }

        public GetElementAncestor(target: HTMLElement | true, index: number): HTMLElement{
            let resolvedTarget = ((target === true) ? this.state_.GetElementContext() : target);
            if (!resolvedTarget || resolvedTarget === this.rootElement_){
                return null;
            }

            let ancestor = resolvedTarget;
            for (; 0 <= index && ancestor && ancestor !== this.rootElement_; --index){
                ancestor = ancestor.parentElement;
            }

            return ((0 <= index) ? null : ancestor);
        }

        public GetElementScope(element: HTMLElement | string | true | RootElement): ElementScope{
            let key: string;
            if (typeof element === 'string'){
                key = element;
            }
            else if (element === true){
                key = this.state_.GetElementContext().getAttribute(Region.GetElementKeyName());
            }
            else if (element instanceof RootElement){
                key = this.rootElement_.getAttribute(Region.GetElementKeyName());
            }
            else if (element){//HTMLElement
                key = element.getAttribute(Region.GetElementKeyName());
            }

            return ((key && key in this.elementScopes_) ? this.elementScopes_[key] : null);
        }

        public GetElement(element: HTMLElement | string){
            if (typeof element !== 'string'){
                return element;
            }

            let scope = this.GetElementScope(element);
            return (scope ? scope.element : null);
        }

        public GetState(){
            return this.state_;
        }

        public GetChanges(){
            return this.changes_;
        }

        public GetRootProxy(){
            if (this.componentKey_ && this.componentKey_ in Region.components_){
                let targetRegion = Region.Get(Region.components_[this.componentKey_]);
                return (targetRegion ? targetRegion.rootProxy_ : this.rootProxy_);
            }
            return this.rootProxy_;
        }

        public FindProxy(path: string): Proxy{
            if (path === this.rootProxy_.GetName()){
                return this.rootProxy_;
            }

            return ((path in this.proxies_) ? this.proxies_[path] : null);
        }

        public AddProxy(proxy: Proxy){
            this.proxies_[proxy.GetPath()] = proxy;
        }

        public RemoveProxy(path: string){
            delete this.proxies_[path];
        }

        public AddRef(key: string, element: HTMLElement){
            this.refs_[key] = element;
        }

        public GetRefs(){
            return this.refs_;
        }

        public AddElement(element: HTMLElement, check: boolean = true): ElementScope{
            if (check){//Check for existing
                let scope = this.GetElementScope(element);
                if (scope){
                    return scope;
                }
            }

            if (!element || (element !== this.rootElement_ && !this.rootElement_.contains(element))){
                return null;
            }

            let id: number;
            if (this.lastElementId_ === null){
                id = (this.lastElementId_ = 0);
            }
            else{
                id = ++this.lastElementId_;
            }

            let key = `${this.id_}.${id}`;
            (this.elementScopes_[key] as ElementScope) = {
                key: key,
                element: element,
                locals: {},
                uninitCallbacks: new Array<() => void>(),
                changeRefs: new Array<ChangeRefInfo>(),
                directiveHandlers: {},
                preProcessCallbacks: new Array<() => void>(),
                postProcessCallbacks: new Array<() => void>(),
                eventExpansionCallbacks: new Array<(event: string) => string | null>(),
                outsideEventCallbacks: {},
                attributeChangeCallbacks: new Array<(name: string) => void>(),
                intersectionObservers: {},
                falseIfCondition: null,
                trapInfoList: new Array<TrapInfo>(),
                removed: false,
                preserve: false,
                preserveSubscriptions: false,
                paused: false
            };

            element.setAttribute(Region.GetElementKeyName(), key);
            return this.elementScopes_[key];
        }
        
        public RemoveElement(element: HTMLElement | string, preserve = false): void{
            let scope = this.GetElementScope(element);
            if (scope){
                if (scope.paused){//Paused removal
                    scope.paused = false;
                    return;
                }
                
                scope.uninitCallbacks.forEach((callback) => {
                    try{
                        callback();
                    }
                    catch (err){
                        this.state_.ReportError(err, `InlineJs.Region<${this.id_}>.$uninit`);
                    }
                });

                scope.uninitCallbacks = [];
                if (!preserve && !scope.preserve && !scope.preserveSubscriptions){
                    Region.UnsubscribeAll(scope.changeRefs);
    
                    scope.changeRefs = [];
                    scope.element.removeAttribute(Region.GetElementKeyName());
                    
                    Object.keys(scope.intersectionObservers).forEach(key => scope.intersectionObservers[key].unobserve(scope.element));
                    scope.intersectionObservers = {};
                }
                else{
                    scope.preserve = !(preserve = true);
                }
                
                Array.from(scope.element.children).forEach(child => this.RemoveElement((child as HTMLElement), preserve));
                if (!preserve){//Delete scope
                    scope.trapInfoList.forEach((info) => {
                        if (!info.stopped){
                            info.stopped = true;
                            info.callback([]);
                        }
                    });

                    delete this.elementScopes_[scope.key];
                }
            }
            else if (typeof element !== 'string'){
                Array.from(element.children).forEach(child => this.RemoveElement((child as HTMLElement), preserve));
            }
            
            if (!preserve && element === this.rootElement_){//Remove from map
                this.AddNextTickCallback(() => {//Wait for changes to finalize
                    Evaluator.RemoveProxyCache(this.id_);
                    if (this.componentKey_ in Region.components_){
                        delete Region.components_[this.componentKey_];
                    }
    
                    delete RegionMap.entries[this.id_];
                });
            }
        }

        public MarkElementAsRemoved(element: HTMLElement | string): void{
            let scope = this.GetElementScope(element);
            if (scope){
                scope.removed = true;
            }
        }

        public ElementIsRemoved(element: HTMLElement | string): boolean{
            let scope = this.GetElementScope(element);
            return (scope && scope.removed);
        }

        public ElementIsContained(element: HTMLElement | string, checkDocument = true): boolean{
            if (typeof element === 'string'){
                return (element && element in this.elementScopes_);
            }
            
            if (!element || (checkDocument && !document.contains(element))){
                return false;
            }
            
            let key = element.getAttribute(Region.GetElementKeyName());
            return ((key && key in this.elementScopes_) || this.ElementIsContained(element, false));
        }
        
        public ElementExists(element: HTMLElement | string): boolean{
            let scope = this.GetElementScope(element);
            return (scope && !scope.removed);
        }

        public AddOutsideEventCallback(element: HTMLElement | string, event: string, callback: (event: Event) => void){
            let scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true)), id = this.id_;
            if (!scope){
                return;
            }

            if (!(event in scope.outsideEventCallbacks)){
                scope.outsideEventCallbacks[event] = new Array<(event: Event) => void>();
            }

            (scope.outsideEventCallbacks[event] as Array<(event: Event) => void>).push(callback);
            if (this.outsideEvents_.indexOf(event) == -1){
                this.outsideEvents_.push(event);
                document.body.addEventListener(event, (e: Event) => {
                    let myRegion = Region.Get(id);
                    if (myRegion){
                        Object.keys(myRegion.elementScopes_).forEach((key) => {
                            let scope = (myRegion.elementScopes_[key] as ElementScope);
                            if (e.target !== scope.element && e.type in scope.outsideEventCallbacks && !scope.element.contains(e.target as Node)){
                                (scope.outsideEventCallbacks[e.type] as Array<(event: Event) => void>).forEach(callback => callback(e));
                            }
                        });
                    }
                }, true);
            }
        }

        public RemoveOutsideEventCallback(element: HTMLElement | string, event: string, callback: (event: Event) => void){
            let scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true)), id = this.id_;
            if (!scope || !(event in scope.outsideEventCallbacks)){
                return;
            }

            let list = (scope.outsideEventCallbacks[event] as Array<(event: Event) => void>);
            for (let i = 0; i < list.length; ++i){
                if (list[i] === callback){
                    list.splice(i, 1);
                    break;
                }
            }
        }

        public AddNextTickCallback(callback: () => void){
            this.nextTickCallbacks_.push(callback);
            this.changes_.Schedule();
        }

        public ExecuteNextTick(){
            if (this.nextTickCallbacks_.length == 0){
                return;
            }

            let callbacks = this.nextTickCallbacks_;
            let proxy = this.rootProxy_.GetNativeProxy();

            this.nextTickCallbacks_ = new Array<() => void>();
            callbacks.forEach((callback) => {
                try{
                    callback.call(proxy);
                }
                catch (err){
                    this.state_.ReportError(err, `InlineJs.Region<${this.id_}>.$nextTick`);
                }
            });
        }

        public AddLocal(element: HTMLElement | string, key: string, value: any){
            let scope = ((typeof element === 'string') ? this.GetElementScope(element) : this.AddElement(element, true));
            if (scope){
                scope.locals = (scope.locals || {});
                scope.locals[key] = value;
            }
        }

        public GetLocal(element: HTMLElement | string, key: string, bubble: boolean = true): any{
            if (typeof element !== 'string'){
                for (let i = 0; i < this.localHandlers_.length; ++i){
                    if (this.localHandlers_[i].element === element){
                        return this.localHandlers_[i].callback(element, key, bubble);
                    }
                }
            }
            
            let scope = this.GetElementScope(element);
            if (scope && key in scope.locals){
                return scope.locals[key];
            }

            if (!bubble || typeof element === 'string'){
                return new NoResult();
            }
            
            for (let ancestor = this.GetElementAncestor(element, 0); ancestor; ancestor = this.GetElementAncestor(ancestor, 0)){
                scope = this.GetElementScope(ancestor);
                if (scope && key in scope.locals){
                    return scope.locals[key];
                }
            }

            return new NoResult();
        }

        public AddLocalHandler(element: HTMLElement, callback: (element: HTMLElement, prop: string, bubble: boolean) => any){
            this.localHandlers_.push({
                element: element,
                callback: callback
            });
        }

        public RemoveLocalHandler(element: HTMLElement){
            this.localHandlers_ = this.localHandlers_.filter(info => (info.element !== element));
        }

        public SetObserver(observer: MutationObserver){
            this.observer_ = observer;
        }

        public GetObserver(){
            return this.observer_;
        }

        public ExpandEvent(event: string, element: HTMLElement | string | true){
            let scope = this.GetElementScope(element);
            if (!scope){
                return event;
            }

            for (let i = 0; i < scope.eventExpansionCallbacks.length; ++i){
                let expanded = scope.eventExpansionCallbacks[i](event);
                if (expanded !== null){
                    return expanded;
                }
            }
            
            return event;
        }

        public Call(target: (...args: any) => any, ...args: any){
            return ((target.name in this.rootProxy_.GetTarget()) ? target.call(this.rootProxy_.GetNativeProxy(), ...args) : target(...args));
        }

        public AddTemp(callback: () => any){
            let key = `Region<${this.id_}>.temp<${++this.tempCallbacksId_}>`;
            this.tempCallbacks_[key] = callback;
            return key;
        }

        public CallTemp(key: string){
            if (!(key in this.tempCallbacks_)){
                return null;
            }

            let callback = (this.tempCallbacks_[key] as () => any);
            delete this.tempCallbacks_[key];

            return callback();
        }

        public SetOptimizedBindsState(enabled: boolean){
            this.enableOptimizedBinds_ = enabled;
        }

        public OptimizedBindsIsEnabled(){
            return this.enableOptimizedBinds_;
        }

        public static Get(id: string): Region{
            return ((id in RegionMap.entries) ? RegionMap.entries[id] : null);
        }

        public static GetCurrent(id: string): Region{
            let scopeRegionId = RegionMap.scopeRegionIds.Peek();
            return (scopeRegionId ? Region.Get(scopeRegionId) : Region.Get(id));
        }

        public static Infer(element: HTMLElement | string): Region{
            if (!element){
                return null;
            }
            
            let key = ((typeof element === 'string') ? element : element.getAttribute(Region.GetElementKeyName()));
            if (!key){
                return null;
            }

            return Region.Get(key.split('.')[0]);
        }

        public static AddComponent(region: Region, element: HTMLElement, key: string){
            if (!key || region.rootElement_ !== element || region.componentKey_){
                return false;
            }

            region.componentKey_ = key;
            if (!(key in  Region.components_)){
                Region.components_[key] = region.GetId();
            }
            
            return true;
        }

        public static RemoveElementStatic(element: HTMLElement, preserve = false){
            let region = Region.Infer(element);
            if (!region){
                Array.from(element.children).forEach(child => Region.RemoveElementStatic((child as HTMLElement)));
            }
            else{
                region.RemoveElement(element, preserve);
            }
        }

        public static Find(key: string, getNativeProxy: false): Region;
        public static Find(key: string, getNativeProxy: true): any;
        public static Find(key: string, getNativeProxy: boolean): any{
            if (!key || !(key in Region.components_)){
                return null;
            }
            
            let region = Region.Get(Region.components_[key]);
            return (region ? (getNativeProxy ? region.rootProxy_.GetNativeProxy() : region) : null);
        }

        public static AddGlobal(key: string, callback: GlobalCallbackType, accessHandler?: (regionId?: string) => boolean){
            Region.globals_[key] = {
                handler: callback,
                accessHandler: accessHandler
            };
        }

        public static RemoveGlobal(key: string){
            delete Region.globals_[key];
        }

        public static GetGlobal(regionId: string, key: string): GlobalCallbackType{
            if (!(key in Region.globals_)){
                return null;
            }

            let info = Region.globals_[key];
            return ((!regionId || !info.accessHandler || info.accessHandler(regionId)) ? info.handler : null);
        }

        public static GetGlobalValue(regionId: string, key: string, contextElement?: HTMLElement){
            let global = Region.GetGlobal(regionId, key);
            return (global ? global(regionId, contextElement) : null);
        }

        public static AddPostProcessCallback(callback: () => void){
            Region.postProcessCallbacks_.push(callback);
        }

        public static ExecutePostProcessCallbacks(){
            if (Region.postProcessCallbacks_.length == 0){
                return;
            }
            
            Region.postProcessCallbacks_.forEach((callback) => {
                try{
                    callback();
                }
                catch (err){
                    console.error(err, `InlineJs.Region<NIL>.ExecutePostProcessCallbacks`);
                }
            });

            Region.postProcessCallbacks_ = [];
        }

        public static SetDirectivePrefix(value: string){
            Region.directivePrfix = value;
            Region.directiveRegex = new RegExp(`^(data-)?${value}-(.+)$`);
        }

        public static IsEqual(first: any, second: any): boolean{
            let firstIsObject = (first && typeof first === 'object'), secondIsObject = (second && typeof second === 'object');
            if (firstIsObject && '__InlineJS_Target__' in first){//Get underlying object
                first = first['__InlineJS_Target__'];
            }

            if (secondIsObject && '__InlineJS_Target__' in second){//Get underlying object
                second = second['__InlineJS_Target__'];
            }

            if (Region.externalCallbacks.isEqual){
                return Region.externalCallbacks.isEqual(first, second);
            }
            
            if (firstIsObject != secondIsObject){
                return false;
            }

            if (!firstIsObject){
                return (first == second);
            }

            if (Array.isArray(first)){
                if (!Array.isArray(second) || first.length != second.length){
                    return false;
                }

                for (let i = 0; i < first.length; ++i){
                    if (!Region.IsEqual(first[i], second[i])){
                        return false;
                    }
                }
                
                return true;
            }

            if (!Region.IsObject(first) || !Region.IsObject(second)){
                return (first === second);
            }

            if (Object.keys(first).length != Object.keys(second).length){
                return false;
            }

            for (let key in first){
                if (!(key in second) || !Region.IsEqual(first[key], second[key])){
                    return false;
                }
            }

            return true;
        }

        public static DeepCopy(target: any): any{
            let isObject = (target && typeof target === 'object');
            if (isObject && '__InlineJS_Target__' in target){//Get underlying object
                target = target['__InlineJS_Target__'];
            }
            
            if (Region.externalCallbacks.deepCopy){
                return Region.externalCallbacks.deepCopy(target);
            }

            if (!isObject){
                return target;
            }

            if (Array.isArray(target)){
                let copy = [];
                target.forEach(item => copy.push(Region.DeepCopy(item)));
                return copy;
            }

            if (!Region.IsObject(target)){
                return target;
            }
            
            let copy = {};
            for (let key in target){
                copy[key] = Region.DeepCopy(target[key]);
            }
            
            return copy;
        }

        public static GetElementKeyName(){
            return '__inlinejs_key__';
        }

        public static IsObject(target: any){
            return (target !== null && typeof target === 'object' && (('__InlineJS_Target__' in target) || target.__proto__.constructor.name === 'Object'));
        }

        public static UnsubscribeAll(list: Array<ChangeRefInfo>){
            (list || []).forEach((info) => {
                let region = Region.Get(info.regionId);
                if (region){
                    region.changes_.Unsubscribe(info.subscriptionId);
                }
            });
        }
    }

    export interface Change{
        regionId: string;
        type: 'set' | 'delete';
        path: string;
        prop: string;
        origin: ChangeCallbackType;
    }

    export interface BubbledChange{
        original: Change;
        path: string;
    }

    export type ChangeCallbackType = (changes?: Array<Change | BubbledChange>) => void | boolean;
    export interface ChangeBatchInfo{
        callback: ChangeCallbackType;
        changes: Array<Change | BubbledChange>;
    }
    
    export interface SubscriberInfo{
        id: number;
        callback: ChangeCallbackType;
    }

    export interface GetAccessInfo{
        regionId: string;
        path: string;
    }

    export interface GetAccessCheckpoint{
        optimized: number;
        raw: number;
    }

    export interface GetAccessStorage{
        optimized: Array<GetAccessInfo>;
        raw: Array<GetAccessInfo>;
        checkpoint: GetAccessCheckpoint;
    }

    export interface GetAccessStorageInfo{
        storage: GetAccessStorage;
        lastAccessPath: string;
    }
    
    export type GetAccessHookType = (regionId?: string, path?: string) => boolean;
    export class Changes{
        private isScheduled_ = false;
        private list_ = new Array<Change | BubbledChange>();
        
        private subscriberId_: number = null;
        private subscribers_: Record<string, Array<SubscriberInfo>> = {};

        private getAccessStorages_ = new Stack<GetAccessStorageInfo>();
        private getAccessHooks_ = new Stack<GetAccessHookType>();
        private origins_ = new Stack<ChangeCallbackType>();
        
        public constructor (private regionId_: string){}

        public GetRegionId(){
            return this.regionId_;
        }

        public Schedule(){
            if (this.isScheduled_){
                return;
            }
            
            this.isScheduled_ = true;
            setTimeout(() => {//Schedule changes
                this.isScheduled_ = false;
                if (0 < this.list_.length){
                    let list = this.list_, batches = new Array<ChangeBatchInfo>();
                    this.list_ = new Array<Change | BubbledChange>();
            
                    list.forEach((item) => {
                        if (item.path in this.subscribers_){
                            (this.subscribers_[item.path] as Array<SubscriberInfo>).forEach((info) => {
                                if (info.callback !== Changes.GetOrigin(item)){//Ignore originating callback
                                    Changes.AddBatch(batches, item, info.callback);
                                }
                            });
                        }
                    });
                    
                    batches.forEach(batch => batch.callback(batch.changes));
                }

                let region = Region.Get(this.regionId_);
                if (region){
                    region.ExecuteNextTick();
                }
            }, 0);
        }

        public Add(item: Change | BubbledChange): void{
            this.list_.push(item);
            this.Schedule();
        }

        public Subscribe(path: string, callback: ChangeCallbackType): number{
            let id: number;
            if (this.subscriberId_ === null){
                id = (this.subscriberId_ = 0);
            }
            else{
                id = ++this.subscriberId_;
            }

            let region = Region.GetCurrent(this.regionId_);
            if (region){//Check for a context element
                let contextElement = region.GetState().GetElementContext();
                if (contextElement){//Add reference
                    let scope = region.AddElement(contextElement, true);
                    if (scope){
                        scope.changeRefs.push({
                            regionId: region.GetId(),
                            subscriptionId: id
                        });
                    }
                }
            }

            let list: Array<SubscriberInfo> = (this.subscribers_[path] = (this.subscribers_[path] || new Array<SubscriberInfo>()));
            list.push({
                id: id,
                callback: callback
            });
            
            return id;
        }

        public Unsubscribe(id: number){
            for (let path in this.subscribers_){
                let list = (this.subscribers_[path] as Array<SubscriberInfo>);
                for (let i = list.length; i > 0; --i){
                    let index = (i - 1);
                    if (list[index].id == id){
                        list.splice(index, 1);
                    }
                }
            }
        }

        public AddGetAccess(path: string){
            let region = Region.GetCurrent(this.regionId_);
            if (!region){
                return;
            }
            
            let hook = region.GetChanges().getAccessHooks_.Peek();
            if (hook && !hook(region.GetId(), path)){//Rejected
                return;
            }
            
            let storageInfo = region.GetChanges().getAccessStorages_.Peek();
            if (!storageInfo || !storageInfo.storage){
                return;
            }

            if (storageInfo.storage.raw){
                storageInfo.storage.raw.push({
                    regionId: this.regionId_,
                    path: path
                });
            }

            if (!storageInfo.storage.optimized){
                return;
            }
            
            let optimized = storageInfo.storage.optimized;
            if (storageInfo.lastAccessPath && 0 < optimized.length && storageInfo.lastAccessPath.length < path.length && path.substr(0, storageInfo.lastAccessPath.length) === storageInfo.lastAccessPath){//Deeper access
                optimized[(optimized.length - 1)].path = path;
            }
            else{//New entry
                optimized.push({
                    regionId: this.regionId_,
                    path: path
                });
            }

            storageInfo.lastAccessPath = path;
        }

        public ReplaceOptimizedGetAccesses(){
            if (!Region.Get(this.regionId_).OptimizedBindsIsEnabled()){
                return;
            }
            
            let info = this.getAccessStorages_.Peek();
            if (info && info.storage && info.storage.raw){
                info.storage.optimized = new Array<GetAccessInfo>();
                info.storage.raw.forEach(item => info.storage.optimized.push(item));
            }
        }

        public FlushRawGetAccesses(){
            if (!Region.Get(this.regionId_).OptimizedBindsIsEnabled()){
                return;
            }

            let info = this.getAccessStorages_.Peek();
            if (info && info.storage && info.storage.raw){
                info.storage.raw = [];
            }
        }

        public AddGetAccessesCheckpoint(){
            let info = this.getAccessStorages_.Peek();
            if (!info || !info.storage){
                return;
            }
            
            if (info.storage.optimized){
                info.storage.checkpoint.optimized = info.storage.optimized.length;
            }

            if (info.storage.raw){
                info.storage.checkpoint.raw = info.storage.raw.length;
            }
        }

        public DiscardGetAccessesCheckpoint(){
            let info = this.getAccessStorages_.Peek();
            if (!info || !info.storage){
                return;
            }
            
            if (info.storage.optimized && info.storage.checkpoint.optimized != -1 && info.storage.checkpoint.optimized < info.storage.optimized.length){
                info.storage.optimized.splice(info.storage.checkpoint.optimized);
            }

            if (info.storage.raw && info.storage.checkpoint.raw != -1 && info.storage.checkpoint.raw < info.storage.raw.length){
                info.storage.raw.splice(info.storage.checkpoint.raw);
            }

            info.storage.checkpoint.optimized = -1;
            info.storage.checkpoint.raw = -1;
        }

        public PushGetAccessStorage(storage: GetAccessStorage): void{
            this.getAccessStorages_.Push({
                storage: (storage || {
                    optimized: (Region.Get(this.regionId_).OptimizedBindsIsEnabled() ? new Array<GetAccessInfo>() : null),
                    raw: new Array<GetAccessInfo>(),
                    checkpoint: {
                        optimized: -1,
                        raw: -1
                    }
                }),
                lastAccessPath: ''
            });
        }

        public RetrieveGetAccessStorage(optimized: false): GetAccessStorage;
        public RetrieveGetAccessStorage(optimized: true): Array<GetAccessInfo>;
        public RetrieveGetAccessStorage(optimized = true){
            let info = this.getAccessStorages_.Peek();
            return ((info && info.storage) ? (optimized ? (info.storage.optimized || info.storage.raw) : info.storage) : null);
        }

        public PopGetAccessStorage(optimized: false): GetAccessStorage;
        public PopGetAccessStorage(optimized: true): Array<GetAccessInfo>;
        public PopGetAccessStorage(optimized: boolean){
            let info = this.getAccessStorages_.Pop();
            return ((info && info.storage) ? (optimized ? (info.storage.optimized || info.storage.raw) : info.storage) : null);
        }

        public PushGetAccessHook(hook: GetAccessHookType): void{
            this.getAccessHooks_.Push(hook);
        }

        public RetrieveGetAccessHook(): GetAccessHookType{
            return this.getAccessHooks_.Peek();
        }

        public PopGetAccessHook(): GetAccessHookType{
            return this.getAccessHooks_.Pop();
        }

        public PushOrigin(origin: ChangeCallbackType): void{
            this.origins_.Push(origin);
        }

        public GetOrigin(){
            return this.origins_.Peek();
        }

        public PopOrigin(){
            return this.origins_.Pop();
        }

        public static SetOrigin(change: Change | BubbledChange, origin: ChangeCallbackType){
            if ('original' in change){
                change.original.origin = origin;
            }
            else{
                change.origin = origin;
            }
        }

        public static GetOrigin(change: Change | BubbledChange){
            return (('original' in change) ? change.original.origin : change.origin);
        }

        public static AddBatch(batches: Array<ChangeBatchInfo>, change: Change | BubbledChange, callback: ChangeCallbackType){
            let batch = batches.find(info => (info.callback === callback));
            if (batch){
                batch.changes.push(change);
            }
            else{//Add new
                batches.push({
                    callback: callback,
                    changes: new Array(change)
                });
            }
        }
    }

    export class State{
        private elementContext_ = new Stack<HTMLElement>();
        private eventContext_ = new Stack<Event>();

        public constructor (private regionId_: string){}

        public PushElementContext(element: HTMLElement): void{
            this.elementContext_.Push(element);
        }

        public PopElementContext(): HTMLElement{
            return this.elementContext_.Pop();
        }

        public GetElementContext(): HTMLElement{
            return this.elementContext_.Peek();
        }

        public PushEventContext(Value: Event): void{
            this.eventContext_.Push(Value);
        }

        public PopEventContext(): Event{
            return this.eventContext_.Pop();
        }

        public GetEventContext(): Event{
            return this.eventContext_.Peek();
        }

        public TrapGetAccess(callback: ChangeCallbackType, changeCallback: ChangeCallbackType | true, elementContext: HTMLElement | string, staticCallback?: () => void): Record<string, Array<number>>{
            let region = Region.Get(this.regionId_);
            if (!region){
                return {};
            }
 
            let info: TrapInfo = {
                stopped: false,
                callback: null
            };

            try{
                region.GetChanges().PushGetAccessStorage(null);
                info.stopped = (callback(null) === false);
            }
            catch (err){
               this.ReportError(err, `InlineJs.Region<${this.regionId_}>.State.TrapAccess`);
            }

            let storage = region.GetChanges().PopGetAccessStorage(true);
            if (info.stopped || !changeCallback || storage.length == 0){//Not reactive
                if (staticCallback){
                    staticCallback();
                }
                return {};
            }

            if (elementContext){
                let scope = region.GetElementScope(elementContext);
                if (!scope && typeof elementContext !== 'string'){
                    scope = region.AddElement(elementContext, false);
                }

                if (scope){//Add info
                    scope.trapInfoList.push(info);
                }
            }

            let ids: Record<string, Array<number>> = {};
            let onChange = (changes: Array<Change | BubbledChange>) => {
                let myRegion = Region.Get(this.regionId_);
                if (myRegion){//Mark changes
                    myRegion.GetChanges().PushOrigin(onChange);
                }
                
                try{
                    if (!info.stopped && changeCallback === true){
                        info.stopped = (callback(changes) === false);
                    }
                    else if (!info.stopped && changeCallback !== true){
                        info.stopped = (changeCallback(changes) === false);
                    }
                }
                catch (err){
                   this.ReportError(err, `InlineJs.Region<${this.regionId_}>.State.TrapAccess`);
                }

                if (myRegion){
                    myRegion.GetChanges().PopOrigin();
                }
                
                if (info.stopped){//Unsubscribe all subscribed
                    for (let regionId in ids){
                        let myRegion = Region.Get(regionId);
                        if (!myRegion){
                            continue;
                        }

                        let changes = myRegion.GetChanges();
                        (ids[regionId] as Array<number>).forEach(id => changes.Unsubscribe(id));
                    }
                }
            };

            let uniqueEntries: Record<string, string> = {};
            storage.forEach(info => uniqueEntries[info.path] = info.regionId);

            info.callback = onChange;
            for (let path in uniqueEntries){
                let targetRegion = Region.Get(uniqueEntries[path]);
                if (targetRegion){
                    ((ids[targetRegion.GetId()] = (ids[targetRegion.GetId()] || new Array<number>())) as Array<number>).push(targetRegion.GetChanges().Subscribe(path, onChange));
                }
            }

            return ids;
        }

        public ReportError(value: any, ref?: any): void{
            console.error(value, ref);
        }

        public Warn(value: any, ref?: any): void{
            console.warn(value, ref);
        }

        public Log(value: any, ref?: any): void{
            console.log(value, ref);
        }
    }

    export class Evaluator{
        private static cachedProxy_: Record<string, object> = {};
        
        public static Evaluate(regionId: string, elementContext: HTMLElement | string, expression: string, useWindow = false, ignoreRemoved = true): any{
            if (!(expression = expression.trim())){
                return null;
            }
            
            let region = Region.Get(regionId);
            if (!region){
                return null;
            }

            if (ignoreRemoved && !region.ElementExists(elementContext)){
                return null;
            }
            
            let result: any;
            let state = region.GetState();

            RegionMap.scopeRegionIds.Push(regionId);
            state.PushElementContext(region.GetElement(elementContext));

            try{
                result = (new Function(Evaluator.GetContextKey(), `
                    with (${Evaluator.GetContextKey()}){
                        return (${expression});
                    };
                `)).bind(state.GetElementContext())(Evaluator.GetProxy(regionId, region.GetRootProxy().GetNativeProxy()));
            }
            catch (err){
                result = null;

                let element = state.GetElementContext();
                let elementId = element.getAttribute(Region.GetElementKeyName());
                
                state.ReportError(err, `InlineJs.Region<${regionId}>.Evaluator.Evaluate(Element#${elementId}, ${expression})`);
            }

            state.PopElementContext();
            RegionMap.scopeRegionIds.Pop();
            
            return result;
        }

        public static GetContextKey(){
            return '__InlineJS_Context__';
        }

        public static GetProxy(regionId: string, proxy: object){
            if (regionId in Evaluator.cachedProxy_){
                return Evaluator.cachedProxy_[regionId];
            }

            return (Evaluator.cachedProxy_[regionId] = Evaluator.CreateProxy(proxy));
        }
        
        public static CreateProxy(proxy: object){
            return new window.Proxy({}, {
                get(target: object, prop: string | number | symbol): any{
                    if ((!(prop in proxy) || ('__InlineJS_Target__' in proxy) && !(prop in proxy['__InlineJS_Target__'])) && (prop in window)){
                        return window[prop];//Use window
                    }

                    return proxy[prop];
                },
                set(target: object, prop: string | number | symbol, value: any){
                    if ((!(prop in proxy) || ('__InlineJS_Target__' in proxy) && !(prop in proxy['__InlineJS_Target__'])) && (prop in window)){
                        return (window[prop] = value);//Use window
                    }

                    return (proxy[prop] = value);
                },
                deleteProperty(target: object, prop: string | number | symbol){
                    if ((!(prop in proxy) || ('__InlineJS_Target__' in proxy) && !(prop in proxy['__InlineJS_Target__'])) && (prop in window)){
                        return delete window[prop];//Use window
                    }

                    return delete proxy[prop];
                },
                has(target: object, prop: string | number | symbol){
                    return (Reflect.has(target, prop) || (prop in proxy) || (prop in window));
                }
            });
        }

        public static RemoveProxyCache(regionId: string){
            if (regionId in Evaluator.cachedProxy_){
                delete Evaluator.cachedProxy_[regionId];
            }
        }
    }

    export interface Proxy{
        IsRoot: () => boolean;
        GetRegionId: () => string;
        GetTarget: () => object;
        GetNativeProxy: () => object;
        GetName: () => string;
        GetPath: () => string;
        GetParentPath: () => string;
        AddChild: (child: ChildProxy) => void;
        RemoveChild: (name: string) => void;
        GetProxies: () => Record<string, ChildProxy>;
    }

    function CreateChildProxy(owner: Proxy, name: string, target: any): ChildProxy{
        if (!owner){
            return null;
        }
        
        let ownerProxies = owner.GetProxies();
        if (name in ownerProxies && name !== 'constructor' && name !== 'proto'){
            return ownerProxies[name];
        }

        if (!Array.isArray(target) && !Region.IsObject(target)){
            return null;
        }

        let childProxy = new ChildProxy(owner.GetRegionId(), owner.GetPath(), name, target);
        owner.AddChild(childProxy);

        return childProxy;
    }

    function ProxyGetter(target: object, prop: string, regionId: string, parentPath: string, name: string, callback?: () => any): any{
        let path = (parentPath ? `${parentPath}.${name}` : name);
        if (prop === '__InlineJS_RegionId__'){
            return regionId;
        }
        
        if (prop === '__InlineJS_Name__'){
            return name;
        }

        if (prop === '__InlineJS_Path__'){
            return path;
        }

        if (prop === '__InlineJS_ParentPath__'){
            return parentPath;
        }

        if (prop === '__InlineJS_Target__'){
            return (('__InlineJS_Target__' in target) ? target['__InlineJS_Target__'] : target);
        }

        let exists = (prop in target);
        if (!exists && callback){
            let result = callback();
            if (!(result instanceof NoResult)){
                return result;
            }
        }
        
        let actualValue: any = (exists ? target[prop] : null);
        if (actualValue instanceof Value){
            return actualValue.Get();
        }

        let region = Region.Get(regionId);
        if (region){
            if (prop.substr(0, 1) !== '$'){
                region.GetChanges().AddGetAccess(`${path}.${prop}`);
            }
            
            let value = CreateChildProxy(region.FindProxy(path), prop, actualValue);
            if (value){
                return ((value instanceof ChildProxy) ? value.GetNativeProxy() : value);
            }
        }

        return actualValue;
    }

    function AddChanges(changes: Changes, type: 'set' | 'delete', path: string, prop: string) {
        if (!changes){
            return;
        }
        
        let change: Change = {
            regionId: changes.GetRegionId(),
            type: type,
            path: path,
            prop: prop,
            origin: changes.GetOrigin()
        };
        
        changes.Add(change);
        let parts = path.split('.');

        while (parts.length > 2){//Skip root
            parts.pop();
            changes.Add({
                original: change,
                path: parts.join('.')
            });
        }
    }

    function ProxySetter(target: object, prop: string, value: any, regionId: string, parentPath: string, name: string, callback?: () => boolean): boolean{
        let exists = (prop in target);
        if (!exists && callback && callback()){
            return true;
        }

        if (exists && value === target[prop]){
            return true;
        }
        
        let path = (parentPath ? `${parentPath}.${name}` : name);
        let region = Region.Get(regionId);
        if (region){
            let proxy = region.FindProxy(path);
            if (proxy){
                proxy.RemoveChild(prop);
            }

            AddChanges(region.GetChanges(), 'set', `${path}.${prop}`, prop);
        }
        
        target[prop] = value;
        return true;
    }
    
    function ProxyDeleter(target: object, prop: string, regionId: string, parentPath: string, name: string, callback?: () => boolean): boolean{
        let exists = (prop in target);
        if (!exists){
            return (callback && callback());
        }
        
        let path = (parentPath ? `${parentPath}.${name}` : name);
        let region = Region.Get(regionId);
        if (region){
            let proxy = region.FindProxy(path);
            if (proxy){
                proxy.RemoveChild(prop);
            }

            AddChanges(region.GetChanges(), 'delete', path, prop);
        }

        delete target[prop];
        return true;
    }
    
    export class RootProxy implements Proxy{
        private nativeProxy_: object;
        private proxies_: Record<string, ChildProxy> = {};
        
        public constructor (private regionId_: string, private target_: object){
            let regionId = this.regionId_, name = this.GetPath();
            let handler = {
                get(target: object, prop: string | number | symbol): any{
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')){
                        return Reflect.get(target, prop);
                    }

                    let stringProp = prop.toString();
                    return ProxyGetter(target, stringProp, regionId, null, name, (): any => {
                        let region = Region.Get(regionId);
                        if (!region){
                            return new NoResult();
                        }

                        let contextElement = region.GetState().GetElementContext();
                        let local = region.GetLocal((contextElement || region.GetRootElement()), stringProp);
                        
                        if (!(local instanceof NoResult)){//Local found
                            return ((local instanceof Value) ? local.Get() : local);
                        }

                        let global = Region.GetGlobal(regionId, stringProp);
                        if (global){
                            let result = global(regionId, contextElement);
                            if (!(result instanceof NoResult)){//Local found
                                return ((result instanceof Value) ? result.Get() : result);
                            }
                        }

                        return new NoResult();
                    });
                },
                set(target: object, prop: string | number | symbol, value: any): boolean{
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')){
                        return Reflect.set(target, prop, value);
                    }

                    return ProxySetter(target, prop.toString(), value, regionId, null, name, () => {
                        return false;
                    });
                },
                deleteProperty(target: object, prop: string | number | symbol): boolean{
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')){
                        return Reflect.get(target, prop);
                    }

                    return ProxyDeleter(target, prop.toString(), regionId, null, name, () => {
                        return false;
                    });
                },
                has(target: object, prop: string | number | symbol): boolean{
                    return (typeof prop !== 'symbol' || Reflect.has(target, prop));
                },
            };

            this.nativeProxy_ = new window.Proxy(this.target_, handler);
        }

        public IsRoot(){
            return true;
        }

        public GetRegionId(){
            return this.regionId_;
        }

        public GetTarget(){
            return this.target_;
        }

        public GetNativeProxy(){
            return this.nativeProxy_;
        }

        public GetName(){
            return `Proxy<${this.regionId_}>`;
        }

        public GetPath(){
            return this.GetName();
        }

        public GetParentPath(){
            return '';
        }

        public AddChild(child: ChildProxy){
            this.proxies_[child.GetName()] = child;
            let region = Region.Get(this.regionId_);
            if (region){
                region.AddProxy(child);
            }
        }

        public RemoveChild(name: string){
            delete this.proxies_[name];
            let region = Region.Get(this.regionId_);
            if (region){
                region.RemoveProxy(`${this.GetPath()}.${name}`);
            }
        }

        public GetProxies(){
            return this.proxies_;
        }

        public static Watch(regionId: string, elementContext: HTMLElement | string, expression: string, callback: (value: any) => boolean, skipFirst: boolean){
            let region = Region.Get(regionId);
            if (!region){
                return;
            }
            
            let previousValue: any;
            let onChange = () => {
                let value = Evaluator.Evaluate(regionId, elementContext, expression);
                if (Region.IsEqual(value, previousValue)){
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

        public static AddGlobalCallbacks(){
            Region.AddGlobal('$window', () => window);
            Region.AddGlobal('$document', () => document);
            Region.AddGlobal('$console', () => console);
            Region.AddGlobal('$alert', () => window.alert.bind(window));

            Region.AddGlobal('$event', (regionId: string) => Region.Get(regionId).GetState().GetEventContext());
            Region.AddGlobal('$expandEvent', (regionId: string) => (event: string, target?: HTMLElement) => Region.Get(regionId).ExpandEvent(event, (target || true)));
            Region.AddGlobal('$dispatchEvent', (regionId: string, contextElement: HTMLElement) => (event: Event | string, nextCycle: boolean = true, target?: Node) => {
                let resolvedTarget = ((target as HTMLElement) || contextElement);
                let resolvedEvent = ((typeof event === 'string') ? new CustomEvent(Region.Get(regionId).ExpandEvent(event, resolvedTarget)) : event);

                if (nextCycle){
                    setTimeout(() => resolvedTarget.dispatchEvent(resolvedEvent), 0);
                }
                else{
                    resolvedTarget.dispatchEvent(resolvedEvent);
                }
            });

            Region.AddGlobal('$proxy', (regionId: string) => Region.Get(regionId).GetRootProxy().GetNativeProxy());
            Region.AddGlobal('$refs', (regionId: string) => Region.Get(regionId).GetRefs());
            Region.AddGlobal('$self', (regionId: string) => Region.Get(regionId).GetState().GetElementContext());
            Region.AddGlobal('$root', (regionId: string) => Region.Get(regionId).GetRootElement());

            Region.AddGlobal('$parent', (regionId: string) => Region.Get(regionId).GetElementAncestor(true, 0));
            Region.AddGlobal('$getAncestor', (regionId: string) => (index: number) => Region.Get(regionId).GetElementAncestor(true, index));
            Region.AddGlobal('$form', (regionId: string) => Region.Get(regionId).GetElementWith(true, resolvedTarget => (resolvedTarget instanceof HTMLFormElement)));

            Region.AddGlobal('$componentKey', (regionId: string) => Region.Get(regionId).GetComponentKey());
            Region.AddGlobal('$component', () => (id: string) => Region.Find(id, true));
            Region.AddGlobal('$locals', (regionId: string) => Region.Get(regionId).GetElementScope(true).locals);
            Region.AddGlobal('$getLocals', (regionId: string) => (element: HTMLElement) => Region.Get(regionId).AddElement(element).locals);

            Region.AddGlobal('$watch', (regionId: string, contextElement: HTMLElement) => (expression: string, callback: (value: any) => boolean) => {
                RootProxy.Watch(regionId, contextElement, expression, value => callback.call(Region.Get(regionId).GetRootProxy().GetNativeProxy(), value), true);
            });

            Region.AddGlobal('$when', (regionId: string, contextElement: HTMLElement) => (expression: string, callback: (value: any) => boolean) => {
                RootProxy.Watch(regionId, contextElement, expression, value => (!value || callback.call(Region.Get(regionId).GetRootProxy().GetNativeProxy(), value)), false);
            });

            Region.AddGlobal('$once', (regionId: string, contextElement: HTMLElement) => (expression: string, callback: (value: any) => boolean) => {
                RootProxy.Watch(regionId, contextElement, expression, value => (!value || (callback.call(Region.Get(regionId).GetRootProxy().GetNativeProxy(), value) && false)), false);
            });

            Region.AddGlobal('$nextTick', (regionId: string) => (callback: () => void) => {
                let region = Region.Get(regionId);
                if (region){
                    region.AddNextTickCallback(callback);
                }
            });

            Region.AddGlobal('$post', () => (callback: () => void) => {
                Region.AddPostProcessCallback(callback);
            });

            Region.AddGlobal('$use', (regionId: string) => (value: any) => {
                let region = Region.GetCurrent(regionId);
                if (region){
                    region.GetChanges().ReplaceOptimizedGetAccesses();
                }

                return value;
            }, (regionId: string) => {
                let region = Region.GetCurrent(regionId);
                if (region){
                    region.GetChanges().FlushRawGetAccesses();
                }

                return true;
            });

            Region.AddGlobal('$static', (regionId: string) => (value: any) => {
                let region = Region.GetCurrent(regionId);
                if (region){
                    region.GetChanges().DiscardGetAccessesCheckpoint();
                }

                return value;
            }, (regionId: string) => {
                let region = Region.GetCurrent(regionId);
                if (region){
                    region.GetChanges().AddGetAccessesCheckpoint();
                }

                return true;
            });

            Region.AddGlobal('$raw', () => (value: any) => {
                return ((Region.IsObject(value) && '__InlineJS_Target__' in value) ? value.__InlineJS_Target__ : value);
            });

            Region.AddGlobal('$or', () => (...values: boolean[]) => {
                for (let i = 0; i < values.length; ++i){
                    if (values[i]){
                        return true;
                    }
                }

                return false;
            });

            Region.AddGlobal('$and', () => (...values: boolean[]) => {
                for (let i = 0; i < values.length; ++i){
                    if (!values[i]){
                        return false;
                    }
                }

                return true;
            });

            Region.AddGlobal('$conditional', () => (condition: boolean, trueValue: any, falseValue: any) => {
                return (condition ? trueValue : falseValue);
            });

            Region.AddGlobal('$__InlineJS_CallTemp__', (regionId: string) => (key: string) => {
                let region = Region.Get(regionId);
                return (region ? region.CallTemp(key) : null);
            });
        }
    }

    export class ChildProxy implements Proxy{
        private nativeProxy_: object;
        private proxies_: Record<string, ChildProxy> = {};
        
        public constructor (private regionId_: string, private parentPath_: string, private name_: string, private target_: object){
            let regionId = this.regionId_, parentPath = this.parentPath_, name = this.name_;
            let handler = {
                get(target: object, prop: string | number | symbol): any{
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')){
                        return Reflect.get(target, prop);
                    }

                    if ('__InlineJS_Target__' in target){
                        return target[prop];
                    }

                    return ProxyGetter(target, prop.toString(), regionId, parentPath, name);
                },
                set(target: object, prop: string | number | symbol, value: any): boolean{
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')){
                        return Reflect.set(target, prop, value);
                    }

                    return ProxySetter(target, prop.toString(), value, regionId, parentPath, name);
                },
                deleteProperty(target: object, prop: string | number | symbol): boolean{
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')){
                        return Reflect.get(target, prop);
                    }

                    return ProxyDeleter(target, prop.toString(), regionId, parentPath, name);
                },
                has(target: object, prop: string | number | symbol): boolean{
                    return (typeof prop !== 'symbol' || Reflect.has(target, prop));
                },
            };

            this.nativeProxy_ = new window.Proxy(this.target_, handler);
            Region.Get(this.regionId_).AddProxy(this);
        }

        public IsRoot(){
            return false;
        }

        public GetRegionId(){
            return this.regionId_;
        }

        public GetTarget(){
            return this.target_;
        }

        public GetNativeProxy(){
            return this.nativeProxy_;
        }

        public GetName(){
            return this.name_;
        }

        public GetPath(){
            return `${this.parentPath_}.${this.name_}`;
        }

        public GetParentPath(){
            return this.parentPath_;
        }

        public AddChild(child: ChildProxy){
            this.proxies_[child.GetName()] = child;
            let region = Region.Get(this.regionId_);
            if (region){
                region.AddProxy(child);
            }
        }

        public RemoveChild(name: string){
            delete this.proxies_[name];
            let region = Region.Get(this.regionId_);
            if (region){
                region.RemoveProxy(`${this.GetPath()}.${name}`);
            }
        }

        public GetProxies(){
            return this.proxies_;
        }
    }

    export enum DirectiveHandlerReturn{
        Nil,
        Handled,
        Rejected,
        QuitAll,
    }

    export interface DirectiveArg{
        key: string;
        options: Array<string>;
    }
    
    export interface Directive{
        original: string;
        expanded: string;
        parts: Array<string>;
        raw: string;
        key: string;
        arg: DirectiveArg;
        value: string;
    }

    export type DirectiveHandlerType = (region: Region, element: HTMLElement, directive: Directive) => DirectiveHandlerReturn;

    export class DirectiveHandlerManager{
        private static directiveHandlers_: Record<string, DirectiveHandlerType> = {};
        private static bulkDirectiveHandlers_ = new Array<DirectiveHandlerType>();

        public static AddHandler(key: string, handler: DirectiveHandlerType){
            DirectiveHandlerManager.directiveHandlers_[key] = handler;
        }

        public static RemoveHandler(key: string){
            delete DirectiveHandlerManager.directiveHandlers_[key];
        }

        public static GetHandler(key: string): DirectiveHandlerType{
            return ((key in DirectiveHandlerManager.directiveHandlers_) ? DirectiveHandlerManager.directiveHandlers_[key] : null);
        }

        public static AddBulkHandler(handler: DirectiveHandlerType){
            DirectiveHandlerManager.bulkDirectiveHandlers_.push(handler);
        }

        public static Handle(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn{
            if (!directive){
                return DirectiveHandlerReturn.Nil;
            }
            
            let scope = region.AddElement(element, true);
            if (scope && directive.key in scope.directiveHandlers){
                let result = (scope.directiveHandlers[directive.key] as DirectiveHandlerType)(region, element, directive);
                if (result != DirectiveHandlerReturn.Nil){//Handled
                    return result;
                }
            }

            if (directive.key in DirectiveHandlerManager.directiveHandlers_){
                let result = (DirectiveHandlerManager.directiveHandlers_[directive.key] as DirectiveHandlerType)(region, element, directive);
                if (result != DirectiveHandlerReturn.Nil){//Handled
                    return result;
                }
            }

            for (let i = DirectiveHandlerManager.bulkDirectiveHandlers_.length; i > 0; --i){
                let result = (DirectiveHandlerManager.bulkDirectiveHandlers_[(i - 1)] as DirectiveHandlerType)(region, element, directive);
                if (result != DirectiveHandlerReturn.Nil){//Handled
                    return result;
                }
            }

            return DirectiveHandlerReturn.Nil;
        }
    }

    export interface LiteAttr{
        name: string;
        value: string;
    }

    export interface IfOrEachInfo{
        regionId: string;
        scopeKey: string;
        parent: HTMLElement;
        marker: number;
        attributes: Array<LiteAttr>;
    }

    export interface EachCloneInfo{
        key: string | number;
        element: HTMLElement;
        animator: (show: boolean, callback?: () => boolean | void, animate?: boolean) => void;
    }
    
    export interface EachOptions{
        clones: Array<EachCloneInfo> | Record<string, EachCloneInfo>;
        items: Array<any> | Record<string, any> | number;
        count: number;
        path: string;
        rangeValue: number;
    }

    export interface DataOptions{
        $enableOptimizedBinds?: boolean;
        $locals?: Record<string, any>;
        $component?: string;
        $init?: (region?: Region) => void;
    }

    export class CoreDirectiveHandlers{
        public static PrepareAnimation: (element: HTMLElement, options: Array<string>) => ((show: boolean, callback?: () => boolean | void, animate?: boolean) => void) = null;
        
        public static Noop(region: Region, element: HTMLElement, directive: Directive){
            return DirectiveHandlerReturn.Handled;
        }

        public static Data(region: Region, element: HTMLElement, directive: Directive){
            let proxy = region.GetRootProxy().GetNativeProxy(), data = (CoreDirectiveHandlers.Evaluate(region, element, directive.value, true) as DataOptions);
            if (!Region.IsObject(data)){
                data = {};
            }

            if (data.$locals){//Add local fields
                for (let field in data.$locals){
                    region.AddLocal(element, field, data.$locals[field]);
                }
            }

            if ((data.$enableOptimizedBinds === true || data.$enableOptimizedBinds === false) && region.GetRootElement() === element){
                region.SetOptimizedBindsState(data.$enableOptimizedBinds);
            }

            if (data.$component && region.GetRootElement() === element){
                Region.AddComponent(region, element, data.$component);
            }

            let target: Record<string, any>;
            let addedKeys = Object.keys(data).filter(key => (key !== '$locals' && key !== '$component' && key !== '$enableOptimizedBinds' && key !== '$init'));

            if (region.GetRootElement() !== element){
                let key = region.GenerateScopeId();
                
                target = {};
                proxy[key] = target;

                region.AddElement(element).uninitCallbacks.push(() => {
                    delete proxy[key];
                });

                let regionId = region.GetId();
                region.AddLocal(element, '$scope', CoreDirectiveHandlers.CreateProxy((prop) =>{
                    let myRegion = Region.Get(regionId), myProxy = myRegion.GetRootProxy().GetNativeProxy();
                    if (prop in target){
                        return myProxy[key][prop];
                    }

                    if (prop === 'parent'){
                        return myRegion.GetLocal(myRegion.GetElementAncestor(element, 0), '$scope', true);
                    }

                    if (prop === 'key'){
                        return key;
                    }
                    
                    return myProxy[key][prop];
                }, ['parent', 'key'], (target: object, prop: string | number | symbol, value: any) => {
                    if (prop in target || typeof prop !== 'string'){
                        return target[prop];
                    }

                    let myRegion = Region.Get(regionId), myProxy = myRegion.GetRootProxy().GetNativeProxy();
                    if ('__InlineJS_Target__' in myProxy[key] && prop in myProxy[key]['__InlineJS_Target__']){
                        return (myProxy[key][prop] = value);
                    }
                    
                    if (prop === 'parent' || prop === 'key'){
                        return false;
                    }

                    myProxy[key][prop] = value;
                    return true;
                }));
            }
            else{
                target = proxy['__InlineJS_Target__'];
                region.AddLocal(element, '$scope', proxy);
            }
            
            addedKeys.forEach((key) => {
                target[key] = data[key];
            });
            
            if (data.$init){
                RegionMap.scopeRegionIds.Push(region.GetId());
                region.GetState().PushElementContext(element);
                
                try{
                    data.$init.call(proxy, region);
                }
                catch (err){}

                region.GetState().PopElementContext();
                RegionMap.scopeRegionIds.Pop();
            }

            return DirectiveHandlerReturn.Handled;
        }

        public static Locals(region: Region, element: HTMLElement, directive: Directive){
            let data = CoreDirectiveHandlers.Evaluate(region, element, directive.value, false);
            if (!Region.IsObject(data)){
                return DirectiveHandlerReturn.Handled;
            }

            for (let field in data){
                region.AddLocal(element, field, data[field]);
            }

            return DirectiveHandlerReturn.Handled;
        }

        public static Component(region: Region, element: HTMLElement, directive: Directive){
            return (Region.AddComponent(region, element, directive.value) ? DirectiveHandlerReturn.Handled : DirectiveHandlerReturn.Nil);
        }

        public static Post(region: Region, element: HTMLElement, directive: Directive){
            let regionId = region.GetId();
            region.AddElement(element, true).postProcessCallbacks.push(() => CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            return DirectiveHandlerReturn.Handled;
        }

        public static Init(region: Region, element: HTMLElement, directive: Directive){
            CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            return DirectiveHandlerReturn.Handled;
        }

        public static Bind(region: Region, element: HTMLElement, directive: Directive){
            region.GetState().TrapGetAccess(() => {
                CoreDirectiveHandlers.Evaluate(region, element, directive.value);
                return true;
            }, true, element);
            return DirectiveHandlerReturn.Handled;
        }

        public static Static(region: Region, element: HTMLElement, directive: Directive){
            if (!directive.arg || !directive.arg.key){
                return DirectiveHandlerReturn.Nil;
            }

            let getTargetDirective = () => {
                if (directive.arg.options.length == 0){
                    return `${Region.directivePrfix}-${directive.arg.key}`;
                }

                return `${Region.directivePrfix}-${directive.arg.key}.${directive.arg.options.join('.')}`;
            };
            
            region.GetChanges().PushGetAccessHook(() => false);//Disable get access log
            let result = DirectiveHandlerManager.Handle(region, element, Processor.GetDirectiveWith(getTargetDirective(), directive.value));
            region.GetChanges().PopGetAccessHook();

            return result;
        }

        public static Uninit(region: Region, element: HTMLElement, directive: Directive){
            let regionId = region.GetId();
            region.AddElement(element, true).uninitCallbacks.push(() => CoreDirectiveHandlers.EvaluateAlways(Region.Get(regionId), element, directive.value));
            return DirectiveHandlerReturn.Handled;
        }

        public static Ref(region: Region, element: HTMLElement, directive: Directive){
            region.AddRef(directive.value, element);
            return DirectiveHandlerReturn.Handled;
        }

        public static Attr(region: Region, element: HTMLElement, directive: Directive){
            return CoreDirectiveHandlers.InternalAttr(region, element, directive, (key, value) => {
                if (Region.booleanAttributes.indexOf(key) != -1){
                    if (value){
                        element.setAttribute(key, key);
                    }
                    else{//Remove attribute
                        element.removeAttribute(key);
                    }
                }
                else if (value === null || value === undefined || value === false){
                    element.removeAttribute(key);
                }
                else{//Set evaluated value
                    element.setAttribute(key, CoreDirectiveHandlers.ToString(value));
                }
            });
        }

        public static Style(region: Region, element: HTMLElement, directive: Directive){
            return CoreDirectiveHandlers.InternalAttr(region, element, directive, (key, value) => { element.style[key] = CoreDirectiveHandlers.ToString(value) }, key => (key in element.style));
        }

        public static Class(region: Region, element: HTMLElement, directive: Directive){
            return CoreDirectiveHandlers.InternalAttr(region, element, directive, (key, value) => {
                key.trim().replace(/\s\s+/g, ' ').split(' ').forEach(item => value ? element.classList.add(item) : element.classList.remove(item));
            }, null, true);
        }

        public static InternalAttr(region: Region, element: HTMLElement, directive: Directive, callback: (key: string, value: any) => void, validator?: (key: string) => boolean, acceptList = false){
            let regionId = region.GetId();
            if (!directive.arg || !directive.arg.key){
                let isList = (acceptList && directive.arg && directive.arg.options.indexOf('list') != -1), list: Array<string>;
                region.GetState().TrapGetAccess(() => {
                    if (isList && list){
                        list.forEach(item => element.classList.remove(item));
                        list = new Array<string>();
                    }
                    
                    let entries = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                    if (Region.IsObject(entries)){
                        for (let key in entries){
                            callback(key, entries[key]);
                        }
                    }
                    else if (isList && Array.isArray(entries)){
                        (list = entries).forEach(entry => callback(CoreDirectiveHandlers.ToString(entry), true));
                    }
                    else if (isList && entries){
                        (list = CoreDirectiveHandlers.ToString(entries).trim().replace(/\s\s+/g, ' ').split(' ')).forEach(entry => callback(entry, true));
                    }
                }, true, element);

                return DirectiveHandlerReturn.Handled;
            }

            if (validator && !validator(directive.arg.key)){
                return DirectiveHandlerReturn.Nil;
            }

            region.GetState().TrapGetAccess(() => {
                callback(directive.arg.key, CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }, true, element);

            return DirectiveHandlerReturn.Handled;
        }

        public static Text(region: Region, element: HTMLElement, directive: Directive){
            return CoreDirectiveHandlers.TextOrHtml(region, element, directive, false);
        }

        public static Html(region: Region, element: HTMLElement, directive: Directive){
            return CoreDirectiveHandlers.TextOrHtml(region, element, directive, true);
        }

        public static TextOrHtml(region: Region, element: HTMLElement, directive: Directive, isHtml: boolean, callback?: () => boolean){
            let onChange: () => void;
            let regionId = region.GetId();
            
            if (isHtml){
                onChange = () => element.innerHTML = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }
            else if (element.tagName === 'INPUT'){
                if ((element as HTMLInputElement).type === 'checkbox' || (element as HTMLInputElement).type === 'radio'){
                    onChange = () => {
                        let value = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value), valueAttr = element.getAttribute('value');
                        if (valueAttr){
                            if (value && Array.isArray(value)){
                                (element as HTMLInputElement).checked = ((value as Array<any>).findIndex(item => (item == valueAttr)) != -1);
                            }
                            else{
                                (element as HTMLInputElement).checked = (value == valueAttr);
                            }
                        }
                        else{
                            (element as HTMLInputElement).checked = !!value;
                        }
                    };
                }
                else{
                    onChange = () => (element as HTMLInputElement).value = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
                }
            }
            else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'){
                onChange = () => (element as HTMLTextAreaElement).value = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }
            else{//Unknown
                onChange = () => element.textContent = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }

            region.GetState().TrapGetAccess(() => {
                if (!callback || callback()){
                    onChange();
                }
            }, true, element);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static On(region: Region, element: HTMLElement, directive: Directive){
            if (!directive.arg || !directive.arg.key){
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
            
            let isKey = (directive.arg.key === 'keydown' || directive.arg.key === 'keyup'), debounce: number, debounceIsNext = false, isDebounced = false;
            if (isKey){
                keyOptions.keys_ = new Array<string>();
            }
            
            directive.arg.options.forEach((option) => {
                if (debounceIsNext){
                    debounceIsNext = false;
                    
                    let debounceValue = CoreDirectiveHandlers.ExtractDuration(option, null);
                    if (debounceValue !== null){
                        debounce = debounceValue;
                        return;
                    }
                }
                
                if (option in options){
                    options[option] = true;
                }
                else if (option === 'debounce'){
                    debounce = (debounce || 250);
                    debounceIsNext = true;
                }
                else if (isKey && option in keyOptions){
                    keyOptions[option] = true;
                }
                else if (isKey){
                    let key = Processor.GetCamelCaseDirectiveName(option, true);
                    keyOptions.keys_.push((key in Region.keyMap) ? Region.keyMap[key] : key);
                }
            });

            let regionId = region.GetId(), stoppable: boolean;
            let onEvent = (e: Event) => {
                if (isDebounced){
                    return;
                }

                if (options.self && !options.outside && e.target !== element){
                    return;
                }

                if (isKey){
                    if ((keyOptions.meta && !(e as KeyboardEvent).metaKey) || (keyOptions.alt && !(e as KeyboardEvent).altKey) || (keyOptions.ctrl && !(e as KeyboardEvent).ctrlKey) || (keyOptions.shift && !(e as KeyboardEvent).shiftKey)){
                        return;//Key modifier absent
                    }

                    if (keyOptions.keys_ && 0 < keyOptions.keys_.length && keyOptions.keys_.indexOf((e as KeyboardEvent).key) == -1){
                        return;//Keys don't match
                    }
                }
                
                if (debounce){
                    isDebounced = true;
                    setTimeout(() => { isDebounced = false }, debounce);
                }
                
                let myRegion = Region.Get(regionId);
                if (options.once && options.outside){
                    myRegion.RemoveOutsideEventCallback(element, event, onEvent);
                }
                else if (options.once){
                    (options.window ? window : element).removeEventListener(event, onEvent);
                }
                
                if (options.prevent){
                    e.preventDefault();
                }

                if (stoppable && options.stop){
                    e.stopPropagation();
                }

                if (stoppable && options.immediate){
                    e.stopImmediatePropagation();
                }
                
                try{
                    if (myRegion){
                        myRegion.GetState().PushEventContext(e);
                    }

                    CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value, false, e);
                }
                finally{
                    if (myRegion){
                        myRegion.GetState().PopEventContext();
                    }
                }
            };
            
            let event = region.ExpandEvent(directive.arg.key, element), mappedEvent: string = null;
            if (directive.arg.options.includes('mobile') && (event in mobileMap)){
                mappedEvent = mobileMap[event];
            }
            
            if (!options.outside){
                stoppable = true;
                if (options.window || options.document){
                    let target = (options.window ? window : document);
                    
                    target.addEventListener(event, onEvent);
                    if (mappedEvent){
                        target.addEventListener(mappedEvent, onEvent);
                    }
                    
                    region.AddElement(element).uninitCallbacks.push(() => {
                        target.removeEventListener(event, onEvent);
                        if (mappedEvent){
                            target.removeEventListener(mappedEvent, onEvent);
                        }
                    });
                }
                else{
                    element.addEventListener(event, onEvent);
                    if (mappedEvent){
                        element.addEventListener(mappedEvent, onEvent);
                    }
                }
            }
            else{
                stoppable = false;
                region.AddOutsideEventCallback(element, event, onEvent);
                if (mappedEvent){
                    region.AddOutsideEventCallback(element, mappedEvent, onEvent);
                }
            }
            
            return DirectiveHandlerReturn.Handled;
        }
        
        public static Model(region: Region, element: HTMLElement, directive: Directive){
            let regionId = region.GetId(), doneInput = false, options = {
                out: false,
                in: false,
                lazy: false,
                number: false,
                trim: false,
                array: false,
            };

            directive.arg.options.forEach((option) => {
                if (option in options){
                    options[option] = true;
                }
            });
            
            if (!options.out){//Bidirectional
                CoreDirectiveHandlers.TextOrHtml(region, element, directive, false, () => !doneInput);
                if (options.in){//Output disabled
                    return DirectiveHandlerReturn.Handled;
                }
            }

            let isCheckable = false, isInput = false;
            if (element.tagName === 'INPUT'){
                isInput = true;
                isCheckable = ((element as HTMLInputElement).type === 'checkbox' || (element as HTMLInputElement).type === 'radio');
            }

            let isSelect = (!isInput && element.tagName === 'SELECT');
            let isUnknown = (!isInput && !isSelect && element.tagName !== 'TEXTAREA');

            options.array = (options.array && isCheckable);
            let parseValue = (value: string) => {
                let parsedValue = (options.number ? parseFloat(value) : null);
                return ((parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) ? (value ? `'${value}'` : 'null') : parsedValue.toString());
            };
            
            let convertValue = (value: string | Array<string>, target: HTMLElement) => {
                if (typeof value !== 'string'){
                    let joined = value.reduce((cummulative, item) => (cummulative ? (`${cummulative},${parseValue(item)}`) : `${parseValue(item)}`), '');
                    return `[${joined}]`;
                }
                
                if (options.trim){
                    value = value.trim();
                }
                
                if (isCheckable){
                    if (!(target as HTMLInputElement).checked){
                        return 'false';
                    }
                    
                    let valueAttr = element.getAttribute('value');
                    if (valueAttr){
                        return `'${valueAttr}'`;   
                    }

                    return 'true';
                }
                
                if (!options.number){
                    return `'${value}'`;
                }

                let parsedValue = parseInt(value);
                if (parsedValue === null || parsedValue === undefined || isNaN(parsedValue)){
                    return (value ? `'${value}'` : 'null');
                }

                return parsedValue.toString();
            };

            let getValue = (target: HTMLElement) => {
                if (!isSelect || !(target as HTMLSelectElement).multiple){
                    return null;
                }

                return Array.from((target as HTMLSelectElement).options).filter(option => option.selected).map(option => (option.value || option.text));
            };
            
            let setValue = (value: string, target: HTMLElement) => {
                if (options.array){
                    let evaluatedValue = Evaluator.Evaluate(regionId, element, directive.value), valueAttr = element.getAttribute('value');
                    if (evaluatedValue && Array.isArray(evaluatedValue) && valueAttr){
                        let index = (evaluatedValue as Array<any>).findIndex(item => (item == valueAttr));
                        if (index == -1 && (target as HTMLInputElement).checked){
                            if (options.number){
                                let parsedValue = parseFloat(valueAttr);
                                (evaluatedValue as Array<any>).push((parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) ? valueAttr : parsedValue);
                            }
                            else{//No conversion necessary
                                (evaluatedValue as Array<any>).push(valueAttr);
                            }
                        }
                        else if (index != -1 && !(target as HTMLInputElement).checked){//Remove value from array
                            (evaluatedValue as Array<any>).splice(index, 1);
                        }
                    }
                }
                else{//Assign
                    Evaluator.Evaluate(regionId, element, `(${directive.value})=(${convertValue((getValue(target) || value), target)})`);
                }
            };

            if (options.out && 'value' in element){//Initial assignment
                setValue((element as HTMLInputElement).value, element);
            }

            let onEvent = (e: Event) => {
                if (isUnknown){//Unpdate inner text
                    element.innerText = (e.target as HTMLInputElement).value;
                }

                doneInput = true;
                setValue((e.target as HTMLInputElement).value, (e.target as HTMLElement));
                Region.Get(regionId).AddNextTickCallback(() => doneInput = false);
            };

            element.addEventListener('change', onEvent);
            if (!options.lazy){
                element.addEventListener('input', onEvent);
            }
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Show(region: Region, element: HTMLElement, directive: Directive){
            let showValue = window.getComputedStyle(element).getPropertyValue('display');
            if (showValue === 'none'){
                showValue = 'block';
            }

            let regionId = region.GetId();
            region.GetState().TrapGetAccess(() => {
                element.style.display = (CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value) ? showValue : 'none');
            }, true, element);

            return DirectiveHandlerReturn.Handled;
        }

        public static If(region: Region, element: HTMLElement, directive: Directive){
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original), isInserted = true, ifFirstEntry = true;

            let evaluate = (myRegion: Region) => {
                let hasParent = !! element.parentElement;
                if (hasParent){
                    myRegion.AddLocalHandler(element, (element: HTMLElement, prop: string, bubble: boolean) => {
                        return myRegion.GetLocal(info.parent, prop, bubble);
                    });
                }

                let result = CoreDirectiveHandlers.EvaluateAlways(myRegion, element, directive.value);
                if (hasParent){
                    myRegion.RemoveLocalHandler(element);
                }

                return result;
            };
            
            let animator = CoreDirectiveHandlers.GetAnimator((directive.arg.key === 'animate'), element, directive.arg.options);
            region.GetState().TrapGetAccess(() => {
                let myRegion = Region.Get(info.regionId), scope = myRegion.GetElementScope(info.scopeKey);
                if (!scope.falseIfCondition){
                    scope.falseIfCondition = new Array<() => void>();
                }
                
                let predicate = !! evaluate(myRegion);
                if (predicate){
                    if (!isInserted){
                        isInserted = true;
                        if (!element.parentElement){
                            CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, element, info.marker);//Temporarily insert element into DOM
                            scope.removed = false;
                        }
                        
                        animator(true, () => {
                            CoreDirectiveHandlers.InsertIfOrEach(myRegion, element, info);//Execute directives
                        });
                    }
                    else if (ifFirstEntry){//Execute directives
                        CoreDirectiveHandlers.InsertIfOrEach(region, element, info);
                    }
                }
                else if (isInserted){
                    isInserted = false;
                    animator(false, () => {
                        scope.preserve = true;//Don't remove scope
                        [...scope.falseIfCondition].forEach(callback => callback());

                        if (!ifFirstEntry){
                            info.attributes.forEach(attr => element.removeAttribute(attr.name));
                        }

                        if (element.parentElement){
                            element.parentElement.removeChild(element);
                            scope.removed = true;
                        }
                    }, !ifFirstEntry);
                }
                
                ifFirstEntry = false;
            }, true, null, () => { region.GetElementScope(element).preserve = false });

            if (!isInserted){//Initial evaluation result is false
                region.RemoveElement(element);
            }
            
            return DirectiveHandlerReturn.QuitAll;
        }

        public static Each(region: Region, element: HTMLElement, directive: Directive){
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original), isCount = false, isReverse = false;
            if (directive.arg){
                isCount = (directive.arg.options.indexOf('count') != -1);
                isReverse = (directive.arg.options.indexOf('reverse') != -1);
            }

            let scope = region.GetElementScope(info.scopeKey), ifConditionIsTrue = true, falseIfCondition = () => {
                let myRegion = Region.Get(info.regionId);
                
                ifConditionIsTrue = false;
                empty(myRegion);

                myRegion.GetChanges().Add({
                    regionId: info.regionId,
                    type: 'set',
                    path: `${scope.key}.$each`,
                    prop: '',
                    origin: myRegion.GetChanges().GetOrigin()
                });
                
                let myScope = myRegion.GetElementScope(element);
                if (myScope){
                    myScope.falseIfCondition.splice(myScope.falseIfCondition.indexOf(falseIfCondition), 1);
                }
            };

            scope.preserveSubscriptions = true;
            if (scope.falseIfCondition){
                scope.falseIfCondition.push(falseIfCondition);
            }
            else{
                element.removeAttribute(info.scopeKey);
            }
            
            let options: EachOptions = {
                clones: null,
                items: null,
                count: 0,
                path: null,
                rangeValue: null,
            };

            let valueKey = '', matches = directive.value.match(/^(.+)? as[ ]+([A-Za-z_][0-9A-Za-z_$]*)[ ]*$/), expression: string, animate = (directive.arg.key === 'animate');
            if (matches && 2 < matches.length){
                expression = matches[1];
                valueKey = matches[2];
            }
            else{
                expression = directive.value;
            }

            let addSizeChange = (myRegion: Region) => {
                myRegion.GetChanges().Add({
                    regionId: info.regionId,
                    type: 'set',
                    path: `${scope.key}.$each.count`,
                    prop: 'count',
                    origin: myRegion.GetChanges().GetOrigin()
                });
            };

            let locals = (myRegion: Region, cloneInfo: EachCloneInfo) => {
                myRegion.AddLocal(cloneInfo.element, '$each', CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === 'count'){
                        Region.Get(info.regionId).GetChanges().AddGetAccess(`${scope.key}.$each.count`);
                        return options.count;
                    }
                    
                    if (prop === 'index'){
                        return cloneInfo.key;
                    }

                    if (prop === 'value'){
                        return options.items[cloneInfo.key];
                    }

                    if (prop === 'collection'){
                        return options.items;
                    }

                    if (prop === 'parent'){
                        return Region.Get(info.regionId).GetLocal(cloneInfo.element.parentElement, '$each', true);
                    }

                    return null;
                }, ['count', 'index', 'value', 'collection', 'parent']));

                if (valueKey){
                    myRegion.AddLocal(cloneInfo.element, valueKey, new Value(() => {
                        return options.items[cloneInfo.key];
                    }));
                }
            };

            let append = (myRegion: Region, key?: string) => {
                let clone = (element.cloneNode(true) as HTMLElement), animator = CoreDirectiveHandlers.GetAnimator(animate, clone, directive.arg.options);
                if (key){
                    (options.clones as Record<string, EachCloneInfo>)[key] = {
                        key : key,
                        element: clone,
                        animator: animator,
                    };
                    
                    CoreDirectiveHandlers.InsertIfOrEach(myRegion, clone, info, () => locals(myRegion, (options.clones as Record<string, EachCloneInfo>)[key]), (Object.keys(options.clones).length - 1));
                }
                else{//Array
                    let index = (options.clones as Array<EachCloneInfo>).length;
                    (options.clones as Array<EachCloneInfo>).push({
                        key : index,
                        element: clone,
                        animator: animator,
                    });

                    CoreDirectiveHandlers.InsertIfOrEach(myRegion, clone, info, () => locals(myRegion, (options.clones as Array<EachCloneInfo>)[index]), index);
                }

                animator(true);
            };

            let empty = (myRegion: Region) => {
                if (Array.isArray(options.clones)){
                    ((options.clones as Array<EachCloneInfo>) || []).forEach((myInfo) => {//Remove previous clones
                        myInfo.animator(false, () => {
                            info.parent.removeChild(myInfo.element);
                            myRegion.MarkElementAsRemoved(myInfo.element);
                        });
                    });
                }
                else{//Map
                    Object.keys((options.clones as Record<string, EachCloneInfo>) || {}).forEach((key) => {//Remove previous clones
                        let myInfo = (options.clones as Record<string, EachCloneInfo>)[key];
                        myInfo.animator(false, () => {
                            info.parent.removeChild(myInfo.element);
                            myRegion.MarkElementAsRemoved(myInfo.element);
                        });
                    });
                }

                options.clones = null;
                options.path = null;
            };

            let getRange = (from: number, to: number) => {
                if (from < to){
                    return Array.from({length: (to - from)}, (value, key) => (key + from));
                }
                return Array.from({length: (from - to)}, (value, key) => (from - key));
            };

            let evaluate = (myRegion: Region) => {
                myRegion.AddLocalHandler(element, (element: HTMLElement, prop: string, bubble: boolean) => {
                    return myRegion.GetLocal(info.parent, prop, bubble);
                });

                let result = CoreDirectiveHandlers.EvaluateAlways(myRegion, element, expression);
                myRegion.RemoveLocalHandler(element);

                return result;
            };
            
            let arrayChangeHandler = (myRegion: Region, change: Change) => {
                let index = ((change.prop === 'length') ? null : Number.parseInt(change.prop));
                if (!index && index !== 0){//Not an index
                    return;
                }
                
                if (change.type === 'set' && (options.clones as Array<EachCloneInfo>).length <= index){//Element added
                    ++options.count;
                    addSizeChange(myRegion);
                    append(myRegion);
                }
                else if (change.type === 'delete' && index < (options.clones as Array<EachCloneInfo>).length){
                    (options.clones as Array<EachCloneInfo>).splice(index, 1).forEach((myInfo) => {
                        --options.count;
                        addSizeChange(myRegion);
                        
                        myInfo.animator(false, () => {
                            info.parent.removeChild(myInfo.element);
                            myRegion.MarkElementAsRemoved(myInfo.element);
                        });
                    });
                }
            };

            let mapChangeHandler = (myRegion: Region, change: Change) => {
                let key = change.prop;
                if (change.type === 'set' && !(key in (options.clones as Record<string, EachCloneInfo>))){//Element added
                    ++options.count;
                    addSizeChange(myRegion);
                    append(myRegion, key);
                }
                else if (change.type === 'delete' && (key in (options.clones as Record<string, EachCloneInfo>))){
                    --options.count;
                    addSizeChange(myRegion);
                    
                    let myInfo = (options.clones as Record<string, EachCloneInfo>)[key];
                    myInfo.animator(false, () => {
                        info.parent.removeChild(myInfo.element);
                        myRegion.MarkElementAsRemoved(myInfo.element);
                        delete options.clones[key];
                    });
                }
            };

            let changeHandler: (myRegion: Region, change: Change) => void, tmpl = document.createElement('template'), subscriptions = scope.changeRefs;
            let initOptions = (target: any, count: number, handler: (myRegion: Region, change: Change) => void, createClones: () => any) => {
                if (Region.IsObject(target) && '__InlineJS_Path__' in target){
                    options.path = target['__InlineJS_Path__'];
                }

                options.items = target;
                options.count = count;
                options.clones = createClones();

                changeHandler = handler;
            };
            
            let init = (myRegion: Region, target: any) => {
                let isRange = (typeof target === 'number' && Number.isInteger(target));
                if (isRange && !isReverse && options.rangeValue !== null && target <= options.count){//Range value decrement
                    let diff = (options.count - target);
                    if (0 < diff){
                        options.count = target;
                        addSizeChange(myRegion);
                        
                        (options.items as Array<any>).splice(target, diff);
                        (options.clones as Array<EachCloneInfo>).splice(target, diff).forEach((myInfo) => {
                            myInfo.animator(false, () => {
                                info.parent.removeChild(myInfo.element);
                                myRegion.MarkElementAsRemoved(myInfo.element);
                            });
                        });
                    }
                    
                    return true;
                }
                
                if (!isRange || isReverse || options.rangeValue === null){
                    empty(myRegion);
                }
                
                if (isRange){
                    let offset = (isCount ? 1 : 0), items: Array<number>;
                    if (target < 0){
                        items = (isReverse ? getRange((target - offset + 1), (1 - offset)) : getRange(-offset, (target - offset)));
                    }
                    else{
                        items = (isReverse ? getRange((target + offset - 1), (offset - 1)) : getRange(offset, (target + offset)));
                    }

                    if (!isReverse && options.rangeValue !== null){//Ranged value increment
                        let addedItems = items.splice(options.count);
                        
                        options.count = target;
                        addSizeChange(myRegion);

                        options.items = (options.items as Array<number>).concat(addedItems);
                        addedItems.forEach(item => append(myRegion));

                        options.rangeValue = target;
                    }
                    else{
                        options.rangeValue = target;
                        initOptions(items, items.length, arrayChangeHandler, () => new Array<EachCloneInfo>());
                        items.forEach(item => append(myRegion));
                    }
                }
                else if (Array.isArray(target)){
                    let items = (('__InlineJS_Target__' in target) ? (target['__InlineJS_Target__'] as Array<any>) : target);

                    options.rangeValue = null;
                    initOptions(target, items.length, arrayChangeHandler, () => new Array<EachCloneInfo>());
                    items.forEach(item => append(myRegion));
                }
                else if (Region.IsObject(target)){
                    let keys = Object.keys(('__InlineJS_Target__' in target) ? (target['__InlineJS_Target__'] as Record<string, any>) : target);

                    options.rangeValue = null;
                    initOptions(target, keys.length, mapChangeHandler, () => ({}));
                    keys.forEach(key => append(myRegion, key));
                }

                return (!!options.path || options.rangeValue !== null);
            };
            
            region.GetState().TrapGetAccess(() => {
                if (element.parentElement){
                    element.parentElement.removeChild(element);
                }
                
                let myRegion = Region.Get(info.regionId), target = evaluate(myRegion);
                if (!target && target !== 0){
                    return false;
                }

                return init(myRegion, target);
            }, (changes: Array<Change | BubbledChange>) => {
                if (!changeHandler){
                    return false;
                }
                
                let myRegion = Region.Get(info.regionId), hasBeenInit = false;
                changes.forEach((change) => {
                    if ('original' in change){//Bubbled change
                        if (change.original.path === `${options.path}.${change.original.prop}`){
                            changeHandler(myRegion, change.original);
                        }
                    }
                    else if (!hasBeenInit && change.type === 'set' && (change.path === options.path || options.rangeValue !== null)){//Target changed
                        let target = evaluate(myRegion);
                        if (!target && target !== 0){
                            return false;
                        }
                        
                        hasBeenInit = init(myRegion, target);
                    }
                    else if (change.type === 'delete' && change.path === options.path){//Item deleted
                        changeHandler(myRegion, change);
                    }
                });

                return (!!options.path || options.rangeValue !== null);
            }, null);

            info.parent.appendChild(tmpl);
            region.AddElement(tmpl).uninitCallbacks.push(() => {
                Region.UnsubscribeAll(subscriptions);
            });
            
            return DirectiveHandlerReturn.QuitAll;
        }

        public static InitIfOrEach(region: Region, element: HTMLElement, except: string): IfOrEachInfo{
            let elScopeKey = Region.GetElementKeyName(), attributes = new Array<LiteAttr>();
            Array.from(element.attributes).forEach((attr) => {
                if (attr.name === elScopeKey){
                    return;
                }

                element.removeAttribute(attr.name);
                if (attr.name !== except){
                    let directive = Processor.GetDirectiveWith(attr.name, attr.value);
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
        }

        public static InsertIfOrEach(region: Region, element: HTMLElement, info: IfOrEachInfo, callback?: () => void, offset = 0){
            if (!element.parentElement){
                element.removeAttribute(Region.GetElementKeyName());
                CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, element, (info.marker + (offset || 0)));
            }

            info.attributes.forEach(attr => element.setAttribute(attr.name, attr.value));
            if (callback){
                callback();
            }

            Processor.All(region, element);
        }

        public static CreateProxy(getter: (prop: string) => any, contains: Array<string> | ((prop: string) => boolean), setter?: (target: object, prop: string | number | symbol, value: any) => boolean){
            let handler = {
                get(target: object, prop: string | number | symbol): any{
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')){
                        return Reflect.get(target, prop);
                    }

                    return getter(prop.toString());
                },
                set(target: object, prop: string | number | symbol, value: any){
                    return (setter && setter(target, prop, value));
                },
                deleteProperty(target: object, prop: string | number | symbol){
                    return false;
                },
                has(target: object, prop: string | number | symbol){
                    if (Reflect.has(target, prop)){
                        return true;
                    }

                    if (!contains){
                        return false;
                    }

                    return ((typeof contains === 'function') ? contains(prop.toString()) : (contains.indexOf(prop.toString()) != -1));
                }
            };

            return new window.Proxy({}, handler);
        }
        
        public static Evaluate(region: Region, element: HTMLElement, expression: string, useWindow = false, ...args: any): any{
            return CoreDirectiveHandlers.DoEvaluation(region, element, expression, useWindow, true, ...args);
        }

        public static EvaluateAlways(region: Region, element: HTMLElement, expression: string, useWindow = false, ...args: any): any{
            return CoreDirectiveHandlers.DoEvaluation(region, element, expression, useWindow, false, ...args);
        }
        
        public static DoEvaluation(region: Region, element: HTMLElement, expression: string, useWindow: boolean, ignoreRemoved: boolean, ...args: any): any{
            if (!region){
                return null;
            }
            
            RegionMap.scopeRegionIds.Push(region.GetId());
            region.GetState().PushElementContext(element);

            let result: any;
            try{
                result = Evaluator.Evaluate(region.GetId(), element, expression, useWindow, ignoreRemoved);
                if (typeof result === 'function'){
                    result = region.Call(result as (...values: any) => any, ...args);
                }

                result = ((result instanceof Value) ? result.Get() : result);
            }
            catch (err){
                region.GetState().ReportError(err, `InlineJs.Region<${region.GetId()}>.CoreDirectiveHandlers.Evaluate(${expression})`);
            }
            finally{
                region.GetState().PopElementContext();
                RegionMap.scopeRegionIds.Pop();
            }
            
            return result;
        }

        public static Call(regionId: string, callback: (...args: any) => any, ...args: any){
            try{
                return Region.Get(regionId).Call(callback, ...args);
            }
            catch (err){
                Region.Get(regionId).GetState().ReportError(err, 'CoreDirectiveHandlers.Call');
            }
        }

        public static ExtractDuration(value: string, defaultValue: number){
            const regex = /[0-9]+(s|ms)?/;
            if (!value || !value.match(regex)){
                return defaultValue;
            }

            if (value.indexOf('m') == -1 && value.indexOf('s') != -1){//Seconds
                return (parseInt(value) * 1000);
            }

            return parseInt(value);
        }

        public static ToString(value: any): string{
            if (typeof value === 'string'){
                return value;
            }

            if (value === null || value === undefined){
                return '';
            }

            if (value === true){
                return 'true';
            }

            if (value === false){
                return 'false';
            }

            if (typeof value === 'object' && '__InlineJS_Target__' in value){
                return CoreDirectiveHandlers.ToString(value['__InlineJS_Target__']);
            }

            if (Region.IsObject(value) || Array.isArray(value)){
                return JSON.stringify(value);
            }

            return value.toString();
        }

        public static GetChildElementIndex(element: HTMLElement){
            if (!element.parentElement){
                return -1;
            }

            for (let i = 0; i < element.parentElement.children.length; ++i){
                if (element.parentElement.children[i] === element){
                    return i;
                }
            }
            
            return -1;
        }

        public static GetChildElementAt(parent: HTMLElement, index: number){
            return ((index < parent.children.length) ? (parent.children.item(index) as HTMLElement) : null);
        }

        public static InsertOrAppendChildElement(parent: HTMLElement, element: HTMLElement, index: number){
            let sibling = CoreDirectiveHandlers.GetChildElementAt(parent, index);
            if (sibling){
                parent.insertBefore(element, sibling);
            }
            else{//Append
                parent.appendChild(element);
            }
        }

        public static GetAnimator(animate: boolean, element: HTMLElement, options: Array<string>){
            let animator = ((animate && CoreDirectiveHandlers.PrepareAnimation) ? CoreDirectiveHandlers.PrepareAnimation(element, options) : null);
            if (!animator){//Use a dummy animator
                animator = (show: boolean, callback?: () => boolean | void, animate?: boolean) => {
                    if (callback){
                        callback();
                    }
                };
            }

            return animator;
        }

        public static AddAll(){
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
    
    export interface ProcessorOptions{
        checkTemplate?: boolean;
        checkDocument?: boolean;
    }

    export class Processor{
        public static All(region: Region, element: HTMLElement, options?: ProcessorOptions): void{
            if (!Processor.Check(element, options)){//Check failed -- ignore
                return;
            }

            let isTemplate = (element.tagName == 'TEMPLATE');
            if (!isTemplate && options?.checkTemplate && element.closest('template')){//Inside template -- ignore
                return;
            }

            Processor.Pre(region, element);
            if (Processor.One(region, element) != DirectiveHandlerReturn.QuitAll && !isTemplate){//Process children
                Array.from(element.children).forEach(child => Processor.All(region, (child as HTMLElement)));
            }

            Processor.Post(region, element);
        }
        
        public static One(region: Region, element: HTMLElement, options?: ProcessorOptions): DirectiveHandlerReturn{
            if (!Processor.Check(element, options)){//Check failed -- ignore
                return DirectiveHandlerReturn.Nil;
            }

            let isTemplate = (element.tagName == 'TEMPLATE');
            if (!isTemplate && options?.checkTemplate && element.closest('template')){//Inside template -- ignore
                return DirectiveHandlerReturn.Nil;
            }
            
            region.GetState().PushElementContext(element);
            let result = Processor.TraverseDirectives(element, (directive: Directive): DirectiveHandlerReturn => {
                return Processor.DispatchDirective(region, element, directive);
            });

            region.GetState().PopElementContext();
            return result;
        }

        public static Pre(region: Region, element: HTMLElement){
            Processor.PreOrPost(region, element, 'preProcessCallbacks', 'Pre');
        }

        public static Post(region: Region, element: HTMLElement){
            Processor.PreOrPost(region, element, 'postProcessCallbacks', 'Post');
        }

        public static PreOrPost(region: Region, element: HTMLElement, scopeKey: string, name: string){
            let scope = region.GetElementScope(element);
            if (scope){
                (scope[scopeKey] as Array<() => void>).forEach((callback) => {
                    try{
                        callback();
                    }
                    catch (err){
                        region.GetState().ReportError(err, `InlineJs.Region<${region.GetId()}>.Processor.${name}(Element@${element.nodeName})`);
                    }
                });

                scope[scopeKey] = [];
            }
        }
        
        public static DispatchDirective(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn{
            let result: DirectiveHandlerReturn;
            try{
                result = DirectiveHandlerManager.Handle(region, element, directive);
                if (result == DirectiveHandlerReturn.Nil){
                    region.GetState().Warn('Handler not found for directive. Skipping...', `InlineJs.Region<${region.GetId()}>.Processor.DispatchDirective(Element@${element.nodeName}, ${directive.original})`);
                }
            }
            catch (err){
                result = DirectiveHandlerReturn.Nil;
                region.GetState().ReportError(err, `InlineJs.Region<${region.GetId()}>.Processor.DispatchDirective(Element@${element.nodeName}, ${directive.original})`);
            }

            if (result != DirectiveHandlerReturn.Rejected && result != DirectiveHandlerReturn.QuitAll){
                element.removeAttribute(directive.original);
            }
            
            return result;
        }
        
        public static Check(element: HTMLElement, options: ProcessorOptions): boolean{
            if (element?.nodeType !== 1){//Not an HTMLElement
                return false;
            }
            
            if (options?.checkDocument && !document.contains(element)){//Node is not contained inside the document
                return false;
            }

            return true;
        }
        
        public static TraverseDirectives(element: HTMLElement, callback: (directive: Directive) => DirectiveHandlerReturn): DirectiveHandlerReturn{
            let result = DirectiveHandlerReturn.Nil, attributes = Array.from(element.attributes);
            for (let i = 0; i < attributes.length; ++i){//Traverse attributes
                let directive = Processor.GetDirectiveWith(attributes[i].name, attributes[i].value);
                if (directive){
                    let thisResult = callback(directive);
                    if (thisResult != DirectiveHandlerReturn.Nil){
                        result = thisResult;
                        if (thisResult == DirectiveHandlerReturn.Rejected || thisResult == DirectiveHandlerReturn.QuitAll){
                            break;
                        }
                    }
                }
            }

            return result;
        }
        
        public static GetDirective(attribute: Attr){
            return Processor.GetDirectiveWith(attribute.name, attribute.value);
        }
        
        public static GetDirectiveWith(name: string, value: string): Directive{
            if (!name || !(name = name.trim())){
                return null;
            }

            let expanded = name;
            switch (name.substr(0, 1)){
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
            if (!matches || matches.length != 3 || !matches[2]){//Not a directive
                return null;
            }

            let raw: string = matches[2], arg: DirectiveArg = {
                key: '',
                options: new Array<string>()
            };

            let colonIndex = raw.indexOf(':'), options: Array<string>;
            if (colonIndex != -1){
                options = raw.substr(colonIndex + 1).split('.');
                arg.key = options[0];
                raw = raw.substr(0, colonIndex);
            }
            else{//No args
                options = raw.split('.');
                raw = options[0];
            }

            for (let i = 1; i < options.length; ++i){
                if (options[i] === 'camel'){
                    arg.key = Processor.GetCamelCaseDirectiveName(arg.key);
                }
                else if (options[i] === 'join'){
                    arg.key = arg.key.split('-').join('.');
                }
                else{
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
        
        public static GetCamelCaseDirectiveName(name: string, ucfirst = false): string{
            let converted = name.replace(/-([^-])/g, (...args) => (args[1].charAt(0).toUpperCase() + args[1].slice(1)));
            return ((ucfirst && 0 < converted.length) ? (converted.charAt(0).toUpperCase() + converted.slice(1)) : converted);
        }
    }

    export class Config{
        public static SetDirectivePrefix(value: string){
            Region.SetDirectivePrefix(value);
        }

        public static SetExternalCallbacks(isEqual: (first: any, second: any) => boolean, deepCopy: (target: any) => any){
            Region.externalCallbacks.isEqual = isEqual;
            Region.externalCallbacks.deepCopy = deepCopy;
        }

        public static SetIsEqualExternalCallback(callback: (first: any, second: any) => boolean){
            Region.externalCallbacks.isEqual = callback;
        }

        public static SetDeepCopyExternalCallback(callback: (target: any) => any){
            Region.externalCallbacks.deepCopy = callback;
        }

        public static AddKeyEventMap(key: string, target: string){
            Region.keyMap[key] = target;
        }

        public static RemoveKeyEventMap(key: string){
            delete Region.keyMap[key];
        }

        public static AddBooleanAttribute(name: string){
            Region.booleanAttributes.push(name);
        }

        public static RemoveBooleanAttribute(name: string){
            let index = Region.booleanAttributes.indexOf(name);
            if (index < Region.booleanAttributes.length){
                Region.booleanAttributes.splice(index, 1);
            }
        }

        public static SetOptimizedBindsState(enabled: boolean){
            Region.enableOptimizedBinds = enabled;
        }

        public static AddDirective(name: string, handler: DirectiveHandlerType){
            DirectiveHandlerManager.AddHandler(name, handler);
        }

        public static RemoveDirective(name: string){
            DirectiveHandlerManager.RemoveHandler(name);
        }
        
        public static AddGlobalMagicProperty(name: string, value: GlobalCallbackType | any){
            if (typeof value === 'function'){
                Region.AddGlobal(('$' + name), value);
            }
            else{
                Region.AddGlobal(('$' + name), () => value);
            }
        }

        public static RemoveGlobalMagicProperty(name: string){
            Region.RemoveGlobal(('$' + name));
        }
    }

    export class Bootstrap{
        private static lastRegionId_: number = null;
        private static lastRegionSubId_: number = null;
        private static anchors_: Array<string> = null;
        
        public static Attach(anchors?: Array<string>){
            Bootstrap.anchors_ = anchors;
            Bootstrap.Attach_();
        }

        public static Reattach(){
            Bootstrap.Attach_();
        }

        public static Attach_(){
            (Bootstrap.anchors_ || [`data-${Region.directivePrfix}-data`, `${Region.directivePrfix}-data`]).forEach((anchor) => {//Traverse anchors
                document.querySelectorAll(`[${anchor}]`).forEach((element) => {//Traverse elements
                    if (!element.hasAttribute(anchor)){//Probably contained inside another region
                        return;
                    }

                    let regionId = (Bootstrap.lastRegionId_ = (Bootstrap.lastRegionId_ || 0)), regionSubId: number;
                    if (Bootstrap.lastRegionSubId_ === null){
                        regionSubId = (Bootstrap.lastRegionSubId_ = 0);
                    }
                    else if (Bootstrap.lastRegionSubId_ == (Number.MAX_SAFE_INTEGER || 9007199254740991)){//Roll over
                        regionId = ++Bootstrap.lastRegionId_;
                        regionSubId = 0;
                    }
                    else{
                        regionSubId = ++Bootstrap.lastRegionSubId_;
                    }

                    let stringRegionId = `rgn__${regionId}_${regionSubId}`;
                    let region = new Region(stringRegionId, (element as HTMLElement), new RootProxy(stringRegionId, {}));

                    let observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'childList'){
                                mutation.removedNodes.forEach((node) => {
                                    if (node?.nodeType === 1){
                                        region.RemoveElement(node as HTMLElement);
                                    }
                                });
    
                                mutation.addedNodes.forEach((node) => {
                                    if (node?.nodeType === 1){
                                        Processor.All(region, (node as HTMLElement), {
                                            checkTemplate: true,
                                            checkDocument: false
                                        });
                                    }
                                });
                            }
                            else if (mutation.type === 'attributes'){
                                let directive = ((mutation.target as HTMLElement).hasAttribute(mutation.attributeName) ? Processor.GetDirectiveWith(mutation.attributeName, (mutation.target as HTMLElement).getAttribute(mutation.attributeName)) : null);
                                if (!directive){
                                    let scope = region.GetElementScope(mutation.target as HTMLElement);
                                    if (scope){
                                        scope.attributeChangeCallbacks.forEach(callback => callback(mutation.attributeName));
                                    }
                                }
                                else{//Process directive
                                    Processor.DispatchDirective(region, (mutation.target as HTMLElement), directive);
                                }
                            }
                        });

                        Region.ExecutePostProcessCallbacks();
                    });

                    RegionMap.entries[stringRegionId] = region;
                    Processor.All(region, (element as HTMLElement), {
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

    (function(){
        RootProxy.AddGlobalCallbacks();
        CoreDirectiveHandlers.AddAll();
    })();
}
