namespace InlineJS{
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
    
    export interface ElementScope{
        key: string;
        element: HTMLElement;
        locals: Map<string, any>;
        uninitCallbacks: Array<() => void>;
        changeRefs: Array<ChangeRefInfo>;
        directiveHandlers: Map<string, DirectiveHandlerType>;
        preProcessCallbacks: Array<() => void>;
        postProcessCallbacks: Array<() => void>;
        eventExpansionCallbacks: Array<(event: string) => string | null>;
        outsideEventCallbacks: Map<string, Array<(event: Event) => void>>;
        attributeChangeCallbacks: Array<(name: string) => void>;
        intersectionObservers: Map<string, IntersectionObserver>;
        preserve: boolean;
    }

    export interface ExternalCallbacks{
        isEqual: (first: any, second: any) => boolean;
        deepCopy: (target: any) => any;
    }

    export class RegionMap{
        public static entries = new Map<string, Region>();
        public static scopeRegionIds = new Stack<string>();
    }
    
    export type GlobalCallbackType = (regionId?: string, contextElement?: HTMLElement) => any;
    export class RootElement{};
    
    export class Region{
        private static components_ = new Map<string, string>();
        private static globals_ = new Map<string, GlobalCallbackType>();
        private static postProcessCallbacks_ = new Array<() => void>();

        public static directivePrfix = 'x';
        public static directiveRegex = /^(data-)?x-(.+)$/;
        public static externalCallbacks: ExternalCallbacks = {
            isEqual: (first: any, second: any) => (first === second),
            deepCopy: (target: any) => target,
        };

        public static keyMap = {
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
        
        private componentKey_ = '';
        private doneInit_ = false;
        private elementScopes_ = new Map<string, ElementScope>();
        private lastElementId_: number = null;
        private state_: State;
        private changes_: Changes;
        private proxies_ = new Map<string, Proxy>();
        private observer_: MutationObserver = null;
        private outsideEvents_ = new Array<string>();
        private nextTickCallbacks_ = new Array<() => void>();
        private tempCallbacks_ = new Map<string, () => any>();
        private tempCallbacksId_ = 0;

        public constructor(private id_: string, private rootElement_: HTMLElement, private rootProxy_: RootProxy){
            this.state_ = new State(this.id_);
            this.changes_ = new Changes(this.id_);
        }

        public SetDoneInit(){
            this.doneInit_ = true;
        }

        public GetDoneInit(){
            return this.doneInit_;
        }

        public GetId(){
            return this.id_;
        }

        public GetRootElement(){
            return this.rootElement_;
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

        public GeRootProxy(){
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
                locals: new Map<string, any>(),
                uninitCallbacks: new Array<() => void>(),
                changeRefs: new Array<ChangeRefInfo>(),
                directiveHandlers: new Map<string, DirectiveHandlerType>(),
                preProcessCallbacks: new Array<() => void>(),
                postProcessCallbacks: new Array<() => void>(),
                eventExpansionCallbacks: new Array<(event: string) => string | null>(),
                outsideEventCallbacks: new Map<string, Array<(event: Event) => void>>(),
                attributeChangeCallbacks: new Array<(name: string) => void>(),
                intersectionObservers: new Map<string, IntersectionObserver>(),
                preserve: false
            };

            element.setAttribute(Region.GetElementKeyName(), key);
            return this.elementScopes_[key];
        }
        
        public RemoveElement(element: HTMLElement | string): void{
            let scope = this.GetElementScope(element);
            if (scope){
                scope.uninitCallbacks.forEach((callback) => {
                    try{
                        callback();
                    }
                    catch (err){
                        this.state_.ReportError(err, `InlineJs.Region<${this.id_}>.$uninit`);
                    }
                });

                if (scope.preserve){
                    scope.preserve = false;
                    return;
                }
                
                scope.changeRefs.forEach((info) => {
                    let region = Region.Get(info.regionId);
                    if (region){
                        region.changes_.Unsubscribe(info.subscriptionId);
                    }
                });

                scope.element.removeAttribute(Region.GetElementKeyName());
                Object.keys(scope.intersectionObservers).forEach(key => scope.intersectionObservers[key].unobserve(scope.element));
                [...scope.element.children].forEach(child => this.RemoveElement(child as HTMLElement));
                
                delete this.elementScopes_[scope.key];
            }
            
            if (element === this.rootElement_){//Remove from map
                if (this.componentKey_ in Region.components_){
                    delete Region.components_[this.componentKey_];
                }

                delete RegionMap.entries[this.id_];
            }
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
                scope.locals = (scope.locals || new Map<string, any>());
                scope.locals[key] = value;
            }
        }

        public GetLocal(element: HTMLElement | string, key: string, bubble: boolean = true): any{
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
            if (!key || region.rootElement_ !== element || region.componentKey_ || key in  Region.components_){
                return false;
            }

            region.componentKey_ = key;
            Region.components_[key] = region.GetId();
            
            return true;
        }

        public static Find(key: string, getNativeProxy: false): Region;
        public static Find(key: string, getNativeProxy: true): any;
        public static Find(key: string, getNativeProxy: boolean): any{
            if (!(key in Region.components_)){
                return null;
            }
            
            let region = Region.Get(Region.components_[key]);
            return (region ? (getNativeProxy ? region.rootProxy_.GetNativeProxy() : region) : null);
        }

        public static AddGlobal(key: string, callback: GlobalCallbackType){
            Region.globals_[key] = callback;
        }

        public static GetGlobal(key: string): GlobalCallbackType{
            return ((key in Region.globals_) ? Region.globals_[key] : null);
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
            return (Region.externalCallbacks.isEqual ? Region.externalCallbacks.isEqual(first, second) : (first === second));
        }

        public static DeepCopy(target: any): any{
            return (Region.externalCallbacks.deepCopy ? Region.externalCallbacks.deepCopy(target) : target);
        }

        public static GetElementKeyName(){
            return '__inlinejs_key__';
        }

        public static IsObject(target: any){
            return (target !== null && typeof target === 'object' && (('__InlineJS_Target__' in target) || target.__proto__.constructor.name === 'Object'));
        }
    }

    export interface Change{
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

    export interface GetAccessStorage{
        optimized: Array<GetAccessInfo>,
        raw: Array<GetAccessInfo>
    };

    export interface GetAccessStorageInfo{
        storage: GetAccessStorage;
        lastAccessPath: string;
    }
    
    export type GetAccessHookType = (regionId?: string, path?: string) => boolean;
    export class Changes{
        private isScheduled_ = false;
        private list_ = new Array<Change | BubbledChange>();
        
        private subscriberId_: number = null;
        private subscribers_ = new Map<string, Array<SubscriberInfo>>();

        private getAccessStorages_ = new Stack<GetAccessStorageInfo>();
        private getAccessHooks_ = new Stack<GetAccessHookType>();
        private origins_ = new Stack<ChangeCallbackType>();
        
        public constructor (private regionId_: string){}

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

            let region = Region.Get(RegionMap.scopeRegionIds.Peek() || this.regionId_);
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
            let info = this.getAccessStorages_.Peek();
            if (info && info.storage){
                info.storage.optimized = new Array<GetAccessInfo>();
                info.storage.raw.forEach(item => info.storage.optimized.push(item));
            }
        }

        public PushGetAccessStorage(storage: GetAccessStorage): void{
            this.getAccessStorages_.Push({
                storage: (storage || {
                    optimized: new Array<GetAccessInfo>(),
                    raw: new Array<GetAccessInfo>()
                }),
                lastAccessPath: ''
            });
        }

        public GetGetAccessStorage(optimized: false): GetAccessStorage;
        public GetGetAccessStorage(optimized: true): Array<GetAccessInfo>;
        public GetGetAccessStorage(optimized = true){
            let info = this.getAccessStorages_.Peek();
            return ((info && info.storage) ? (optimized ? info.storage.optimized : info.storage) : null);
        }

        public PopGetAccessStorage(optimized: false): GetAccessStorage;
        public PopGetAccessStorage(optimized: true): Array<GetAccessInfo>;
        public PopGetAccessStorage(optimized: boolean){
            let info = this.getAccessStorages_.Pop();
            return ((info && info.storage) ? (optimized ? info.storage.optimized : info.storage) : null);
        }

        public PushGetAccessHook(hook: GetAccessHookType): void{
            this.getAccessHooks_.Push(hook);
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

        public TrapGetAccess(callback: ChangeCallbackType, changeCallback: ChangeCallbackType | true): Map<string, Array<number>>{
            let region = Region.Get(this.regionId_), stopped: boolean;
            if (!region){
                return new Map<string, Array<number>>();
            }

            try{
                region.GetChanges().PushGetAccessStorage(null);
                stopped = (callback(null) === false);
            }
            catch (err){
               this.ReportError(err, `InlineJs.Region<${this.regionId_}>.State.TrapAccess`);
            }

            let storage = region.GetChanges().PopGetAccessStorage(true);
            if (stopped || !changeCallback || storage.length == 0){
                return new Map<string, Array<number>>();
            }

            let ids = new Map<string, Array<number>>();
            let onChange = (changes: Array<Change | BubbledChange>) => {
                let myRegion = Region.Get(this.regionId_)
                if (myRegion){//Mark changes
                    myRegion.GetChanges().PushOrigin(onChange);
                }
                
                try{
                    if (changeCallback === true){
                        stopped = (callback(changes) === false);
                    }
                    else{
                        stopped = (changeCallback(changes) === false);
                    }
                }
                catch (err){
                   this.ReportError(err, `InlineJs.Region<${this.regionId_}>.State.TrapAccess`);
                }

                if (myRegion){
                    myRegion.GetChanges().PopOrigin();
                }
                
                if (stopped){
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

            let uniqueEntries = new Map<string, string>();
            storage.forEach(info => uniqueEntries[info.path] = info.regionId);

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
        public static Evaluate(regionId: string, elementContext: HTMLElement | string, expression: string, useWindow = false): any{
            if (!(expression = expression.trim())){
                return null;
            }
            
            let region = Region.Get(regionId);
            if (!region){
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
                `)).bind(state.GetElementContext())(useWindow ? window : region.GeRootProxy().GetNativeProxy());
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
        GetProxies: () => Map<string, ChildProxy>;
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
                return value.GetNativeProxy();
            }
        }

        return actualValue;
    }

    function AddChanges(changes: Changes, type: 'set' | 'delete', path: string, prop: string) {
        if (!changes){
            return;
        }
        
        let change: Change = {
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
        private proxies_ = new Map<string, ChildProxy>();
        
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
                        let local = region.GetLocal(contextElement, stringProp);
                        
                        if (!(local instanceof NoResult)){//Local found
                            return ((local instanceof Value) ? local.Get() : local);
                        }

                        let global = Region.GetGlobal(stringProp);
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
                if (Region.externalCallbacks.isEqual(value, previousValue)){
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

        public static AddGlobalCallbacks(){
            Region.AddGlobal('$window', () => window);
            Region.AddGlobal('$document', () => document);
            Region.AddGlobal('$console', () => console);
            Region.AddGlobal('$alert', () => window.alert);

            Region.AddGlobal('$event', (regionId: string) => new Value(() => Region.Get(regionId).GetState().GetEventContext()));
            Region.AddGlobal('$expandEvent', (regionId: string) => (event: string, target?: HTMLElement) => Region.Get(regionId).ExpandEvent(event, (target || true)));
            Region.AddGlobal('$dispatchEvent', (regionId: string, contextElement: HTMLElement) => (event: Event | string, nextCycle: boolean = true, target?: Node) => {
                let resolvedTarget = ((target as HTMLElement) || contextElement);
                let resolvedEvent = ((typeof event === 'string') ? new Event(Region.Get(regionId).ExpandEvent(event, resolvedTarget)) : event);

                if (nextCycle){
                    setTimeout(() => resolvedTarget.dispatchEvent(resolvedEvent), 0);
                }
                else{
                    resolvedTarget.dispatchEvent(resolvedEvent);
                }
            });

            Region.AddGlobal('$self', (regionId: string) => new Value(() => Region.Get(regionId).GetState().GetElementContext()));
            Region.AddGlobal('$root', (regionId: string) => new Value(() => Region.Get(regionId).GetRootElement()));

            Region.AddGlobal('$parent', (regionId: string) => new Value(() => Region.Get(regionId).GetElementAncestor(true, 0)));
            Region.AddGlobal('$getAncestor', (regionId: string) => (index: number) => Region.Get(regionId).GetElementAncestor(true, index));

            Region.AddGlobal('$component', () => (id: string) => Region.Find(id, true));
            Region.AddGlobal('$locals', (regionId: string) => new Value(() => Region.Get(regionId).GetElementScope(true).locals));
            Region.AddGlobal('$getLocals', (regionId: string) => (element: HTMLElement) => Region.Get(regionId).AddElement(element).locals);

            Region.AddGlobal('$watch', (regionId: string, contextElement: HTMLElement) => (expression: string, callback: (value: any) => boolean) => {
                RootProxy.Watch(regionId, contextElement, expression, value => callback.call(Region.Get(regionId).GeRootProxy().GetNativeProxy(), value), true);
            });

            Region.AddGlobal('$when', (regionId: string, contextElement: HTMLElement) => (expression: string, callback: (value: any) => boolean) => {
                RootProxy.Watch(regionId, contextElement, expression, value => (!value || callback.call(Region.Get(regionId).GeRootProxy().GetNativeProxy(), value)), false);
            });

            Region.AddGlobal('$once', (regionId: string, contextElement: HTMLElement) => (expression: string, callback: (value: any) => boolean) => {
                RootProxy.Watch(regionId, contextElement, expression, value => (!value || (callback.call(Region.Get(regionId).GeRootProxy().GetNativeProxy(), value) && false)), false);
            });

            Region.AddGlobal('$nextTick', (regionId: string, contextElement: HTMLElement) => (callback: () => void) => {
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
            });

            Region.AddGlobal('$__InlineJS_CallTemp__', (regionId: string) => (key: string) => {
                let region = Region.Get(regionId);
                return (region ? region.CallTemp(key) : null);
            });
        }
    }

    export class ChildProxy implements Proxy{
        private nativeProxy_: object;
        private proxies_ = new Map<string, ChildProxy>();
        
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

    export interface Directive{
        original: string;
        parts: Array<string>;
        raw: string;
        key: string;
        value: string;
    }

    export type DirectiveHandlerType = (region: Region, element: HTMLElement, directive: Directive) => DirectiveHandlerReturn;

    export class DirectiveHandlerManager{
        private static directiveHandlers_ = new Map<string, DirectiveHandlerType>();
        private static bulkDirectiveHandlers_ = new Array<DirectiveHandlerType>();

        public static AddHandler(key: string, handler: DirectiveHandlerType){
            DirectiveHandlerManager.directiveHandlers_[key] = handler;
        }

        public static GetHandler(key: string): DirectiveHandlerType{
            return ((key in DirectiveHandlerManager.directiveHandlers_) ? DirectiveHandlerManager.directiveHandlers_[key] : null);
        }

        public static AddBulkHandler(handler: DirectiveHandlerType){
            DirectiveHandlerManager.bulkDirectiveHandlers_.push(handler);
        }

        public static Handle(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn{
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

    export interface IfOrEachInfo{
        regionId: string;
        marker: HTMLElement;
        directives: Array<Directive>;
        attributes: Array<string>;
    }

    export interface EachOptions{
        isArray: boolean;
        list: Array<HTMLElement> | Map<string, HTMLElement>;
        target: Array<any> | Map<string, any>;
        count: number;
        path: string;
    }

    export class CoreDirectiveHandlers{
        public static Noop(region: Region, element: HTMLElement, directive: Directive){
            return DirectiveHandlerReturn.Handled;
        }

        public static Data(region: Region, element: HTMLElement, directive: Directive){
            let proxy = region.GeRootProxy().GetNativeProxy();
            let data = CoreDirectiveHandlers.Evaluate(region, element, directive.value, true);
            
            if (!Region.IsObject(data)){
                return DirectiveHandlerReturn.Handled;
            }

            let target = proxy['__InlineJS_Target__'];
            for (let key in data){
                target[key] = data[key];
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
            }, true);
            return DirectiveHandlerReturn.Handled;
        }

        public static Uninit(region: Region, element: HTMLElement, directive: Directive){
            let regionId = region.GetId();
            region.AddElement(element, true).uninitCallbacks.push(() => CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            return DirectiveHandlerReturn.Handled;
        }

        public static Ref(region: Region, element: HTMLElement, directive: Directive){
            if (element.tagName === 'TEMPLATE'){
                CoreDirectiveHandlers.Assign(region, element, directive.value, 'this.content', () => {
                    return (element as HTMLTemplateElement).content;
                });
            }
            else{
                CoreDirectiveHandlers.Assign(region, element, directive.value, 'this', () => {
                    return element;
                });
            }
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Class(region: Region, element: HTMLElement, directive: Directive){
            let regionId = region.GetId();
            region.GetState().TrapGetAccess(() => {
                let entries = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                if (!Region.IsObject(entries)){
                    return;
                }
                
                for (let key in entries){
                    if (entries[key] && !element.classList.contains(key)){
                        element.classList.add(key);
                    }
                    else if (!entries[key]){
                        element.classList.remove(key);
                    }
                }
            }, true);
            
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
                onChange = () => element.innerHTML = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
            }
            else if (element.tagName === 'INPUT'){
                if ((element as HTMLInputElement).type === 'checkbox' || (element as HTMLInputElement).type === 'radio'){
                    onChange = () => (element as HTMLInputElement).checked = !!CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                }
                else{
                    onChange = () => (element as HTMLInputElement).value = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                }
            }
            else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'){
                onChange = () => (element as HTMLTextAreaElement).value = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
            }
            else{//Unknown
                onChange = () => element.innerText = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
            }

            region.GetState().TrapGetAccess(() => {
                if (!callback || callback()){
                    onChange();
                }
            }, true);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Input(region: Region, element: HTMLElement, directive: Directive){
            return CoreDirectiveHandlers.InternalInput(region, element, directive, true, false);
        }

        public static LazyInput(region: Region, element: HTMLElement, directive: Directive){
            return CoreDirectiveHandlers.InternalInput(region, element, directive, true, true);
        }

        public static Model(region: Region, element: HTMLElement, directive: Directive){
            let doneInput = false;
            
            CoreDirectiveHandlers.TextOrHtml(region, element, directive, false, () => !doneInput);
            CoreDirectiveHandlers.InternalInput(region, element, directive, false, false, () => {
                region.AddNextTickCallback(() => doneInput = false);
                return (doneInput = true);
            });

            return DirectiveHandlerReturn.Handled;
        }

        public static InternalInput(region: Region, element: HTMLElement, directive: Directive, preEvaluate: boolean, lazy: boolean = false, callback?: () => boolean){
            let getValueExpression: () => string;
            let getValue: () => any;
            
            let isCheckable = false;
            if (element.tagName === 'INPUT'){
                if ((element as HTMLInputElement).type === 'checkbox' || (element as HTMLInputElement).type === 'radio'){
                    isCheckable = true;
                    getValueExpression = () => 'this.checked';
                    getValue = () => (element as HTMLInputElement).checked;
                }
                else{
                    getValueExpression = () => 'this.value';
                    getValue = () => (element as HTMLInputElement).value;
                }
            }
            else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'){
                getValueExpression = () => 'this.value';
                getValue = () => (element as HTMLTextAreaElement).value;
            }
            else{
                return DirectiveHandlerReturn.Nil;
            }

            if (preEvaluate){
                CoreDirectiveHandlers.Assign(region, element, directive.value, getValueExpression(), getValue);
            }

            let onEvent = () => {
                if (!callback || callback()){
                    CoreDirectiveHandlers.Assign(region, element, directive.value, getValueExpression(), getValue);
                }
            };

            if (!lazy && !isCheckable && element.tagName !== 'SELECT'){
                element.addEventListener('input', onEvent);
                element.addEventListener('paste', onEvent);
                element.addEventListener('cut', onEvent);
            }
            else{//Delayed
                element.addEventListener('change', onEvent);
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
                if (CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value)){
                    element.style.display = showValue;
                }
                else{//Hide
                    element.style.display = 'none';
                }
            }, true);

            return DirectiveHandlerReturn.Handled;
        }

        public static If(region: Region, element: HTMLElement, directive: Directive){
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element);
            region.GetState().TrapGetAccess(() => {
                let myRegion = Region.Get(info.regionId);
                let value = CoreDirectiveHandlers.Evaluate(myRegion, info.marker, directive.value);

                if (!value && element.parentElement){
                    let scope = myRegion.GetElementScope(element);
                    if (scope){//Don't remove scope
                        scope.preserve = true;
                    }

                    element.parentElement.removeChild(element);
                }
                else if (value && !element.parentElement){
                    CoreDirectiveHandlers.InsertIfOrEach(myRegion, element, info);
                }
            }, true);

            if (!element.parentElement){//Initial evaluation result is false
                info.attributes.forEach(value => element.removeAttribute(value));
                region.RemoveElement(element);
                return DirectiveHandlerReturn.QuitAll;
            }
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Each(region: Region, element: HTMLElement, directive: Directive){
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element);
            let options: EachOptions = {
                isArray: false,
                list: null,
                target: null,
                count: 0,
                path: ''
            };

            let getIndex = (clone: HTMLElement, key?: string) => {
                if (!options.isArray){
                    return key;
                }

                for (let i = 0; i < (options.list as Array<HTMLElement>).length; ++i){
                    if ((options.list as Array<HTMLElement>)[i] === clone){
                        return i;
                    }
                }

                return -1;
            };

            let initLocals = (myRegion: Region, clone: HTMLElement, key?: string) => {
                myRegion.AddLocal(clone, '$each', CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === 'count'){
                        if (options.isArray){
                            return (options.target as Array<any>).length;
                        }

                        if (options.path){
                            myRegion.GetChanges().AddGetAccess(`${options.path}.length`);
                        }
                        
                        return options.count;
                    }
                    
                    if (prop === 'index'){
                        return getIndex(clone, key);
                    }

                    if (prop === 'value'){
                        return (options.isArray ? (options.target as Array<any>)[(getIndex(clone) as number)] : (options.target as Map<string, any>)[key]);
                    }

                    return null;
                }, ['count', 'index', 'value']));
            };

            let insert = (myRegion: Region, key?: string) => {
                let clone = (element.cloneNode(true) as HTMLElement);
                if (!options.isArray && key in (options.list as Map<string, HTMLElement>)){
                    info.marker.parentElement.removeChild((options.list as Map<string, HTMLElement>)[key]);
                    (options.list as Map<string, HTMLElement>)[key] = clone;
                }
                else if (!options.isArray){
                    (options.list as Map<string, HTMLElement>)[key] = clone;
                }
                else if (options.isArray){
                    (options.list as Array<HTMLElement>).push(clone);
                }

                CoreDirectiveHandlers.InsertIfOrEach(myRegion, clone, info, () => initLocals(myRegion, clone, key));
            };

            let build = (myRegion: Region) => {
                if (options.isArray){
                    for (let i = 0; i < options.count; ++i){
                        insert(myRegion);
                    }
                }
                else{
                    Object.keys(options.target).forEach(key => insert(myRegion, key));
                }
            };

            let init = (myRegion: Region) => {
                options.target = CoreDirectiveHandlers.Evaluate(myRegion, info.marker, directive.value);
                if (!options.target){
                    return false;
                }

                if (Array.isArray(options.target)){
                    options.isArray = true;
                    options.count = (options.target as Array<any>).length;
                    options.list = new Array<HTMLElement>();
                    if ('__InlineJS_Path__' in options.target){
                        options.path = options.target['__InlineJS_Path__'];
                    }
                }
                else if (Region.IsObject(options.target)){
                    options.list = new Map<string, HTMLElement>();
                    if ('__InlineJS_Target__' in options.target){
                        options.path = options.target['__InlineJS_Path__'];
                        options.count = Object.keys(options.target['__InlineJS_Target__']).length;
                    }
                    else{
                        options.count = Object.keys(options.target).length;
                    }
                }
                else{
                    return false;
                }

                build(myRegion);

                return !!options.path;
            };

            let addSizeChange = (myRegion: Region) => {
                myRegion.GetChanges().Add({
                    type: 'set',
                    path: `${options.path}.length`,
                    prop: 'length',
                    origin: myRegion.GetChanges().GetOrigin()
                });
                options.count = Object.keys(options.target['__InlineJS_Target__']).length;
            };

            let onChange = (myRegion: Region, changes: Array<Change | BubbledChange>) => {
                changes.forEach((change) => {
                    if ('original' in change){//Bubbled
                        if (options.isArray || change.original.type !== 'set' || `${options.path}.${change.original.prop}` !== change.original.path){
                            return true;
                        }

                        addSizeChange(myRegion);
                        insert(myRegion, change.original.prop);
                    }
                    else if (options.isArray && change.type === 'set' && change.path === `${options.path}.length`){
                        let count = (options.target as Array<any>).length;
                        if (count < options.count){//Item(s) removed
                            (options.list as Array<HTMLElement>).splice(count).forEach(clone => info.marker.parentElement.removeChild(clone));
                        }
                        else if (options.count < count){//Item(s) added
                            for (let diff = (count - options.count); 0 < diff; --diff){
                                insert(myRegion);
                            }
                        }
                        options.count = count;
                    }
                    else if (!options.isArray && change.type === 'delete' && change.prop in (options.list as Map<string, HTMLElement>)){
                        info.marker.removeChild((options.list as Map<string, HTMLElement>)[change.prop]);
                        addSizeChange(Region.Get(info.regionId));
                        delete (options.list as Map<string, HTMLElement>)[change.prop];
                    }
                });

                return true;
            };
            
            element.parentElement.removeChild(element);
            if (region.GetRootElement() === element){
                element.removeAttribute(Region.GetElementKeyName());
            }
            else{
                region.RemoveElement(element);
            }
            
            info.attributes.forEach(value => element.removeAttribute(value));
            region.GetState().TrapGetAccess(() => init(Region.Get(info.regionId)), (change) => onChange(Region.Get(info.regionId), change));
            
            return DirectiveHandlerReturn.QuitAll;
        }

        public static InitIfOrEach(region: Region, element: HTMLElement): IfOrEachInfo{
            let regionId = region.GetId();
            let marker = document.createElement('template');

            let directives = new Array<Directive>();
            let attributes = new Array<string>();

            Processor.TraverseDirectives(element, (value) => {
                attributes.push(value.original);
                if (value.key !== 'if' && value.key !== 'each'){
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

        public static InsertIfOrEach(region: Region, element: HTMLElement, info: IfOrEachInfo, callback?: () => void){
            info.marker.parentElement.insertBefore(element, info.marker);
            if (callback){
                callback();
            }

            region.GetState().PushElementContext(element);
            for (let i = 0; i < info.directives.length; ++i){
                if (Processor.DispatchDirective(region, element, info.directives[i]) == DirectiveHandlerReturn.QuitAll){
                    break;
                }
            }

            region.GetState().PopElementContext();
            if (!region.GetDoneInit()){
                Processor.All(region, element);
            }
        }

        public static CreateProxy(getter: (prop: string) => any, contains: Array<string> | ((prop: string) => boolean)){
            let handler = {
                get(target: object, prop: string | number | symbol): any{
                    if (typeof prop === 'symbol' || (typeof prop === 'string' && prop === 'prototype')){
                        return Reflect.get(target, prop);
                    }

                    return getter(prop.toString());
                },
                set(target: object, prop: string | number | symbol, value: any){
                    return false;
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
        
        public static Evaluate(region: Region, element: HTMLElement, expression: string, useWindow = false): any{
            if (!region){
                return null;
            }
            
            RegionMap.scopeRegionIds.Push(region.GetId());
            region.GetState().PushElementContext(element);

            let result: any;
            try{
                result = Evaluator.Evaluate(region.GetId(), element, expression, useWindow);
                if (typeof result === 'function'){
                    result = region.Call(result as () => any);
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

        public static Assign(region: Region, element: HTMLElement, target: string, value: string, callback: () => any){
            if (!(target = target.trim())){
                return;
            }

            RegionMap.scopeRegionIds.Push(region.GetId());
            region.GetState().PushElementContext(element);

            let targetObject: any;
            try{
                targetObject = Evaluator.Evaluate(region.GetId(), element, target);
            }
            catch (err){}

            try{
                if (typeof targetObject === 'function'){
                    region.Call(targetObject as (arg: any) => any, callback());
                }
                else{
                    Evaluator.Evaluate(region.GetId(), element, `(${target})=${value}`);
                }
            }
            catch (err){
                region.GetState().ReportError(err, `InlineJs.Region<${region.GetId()}>.CoreDirectiveHandlers.Assign(${target}=${value})`);
            }
            finally{
                region.GetState().PopElementContext();
                RegionMap.scopeRegionIds.Pop();
            }
        }

        public static AddAll(){
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
    
    export class CoreBulkDirectiveHandlers{
        public static Static(region: Region, element: HTMLElement, directive: Directive){
            if (directive.parts[0] !== 'static'){
                return DirectiveHandlerReturn.Nil;
            }
            
            let parts = [...directive.parts].splice(1);
            let raw = parts.join('-');
            
            let newDirective: Directive = {
                original: directive.original,
                parts: parts,
                raw: raw,
                key: Processor.GetCamelCaseDirectiveName(raw),
                value: directive.value
            };
            
            region.GetChanges().PushGetAccessHook(() => false);//Disable get access log
            let result = DirectiveHandlerManager.Handle(region, element, newDirective);
            region.GetChanges().PopGetAccessHook();

            return result;
        }
        
        public static Attr(region: Region, element: HTMLElement, directive: Directive){
            const booleanAttributes = new Array<string>(
                'allowfullscreen', 'allowpaymentrequest', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
                'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'ismap', 'itemscope', 'loop', 'multiple', 'muted',
                'nomodule', 'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected',
            );

            if (directive.parts[0] !== 'attr'){
                return DirectiveHandlerReturn.Nil;
            }
            
            let regionId = region.GetId();
            let name = [...directive.parts].splice(1).join('-');
            
            let isBoolean = (booleanAttributes.indexOf(name) != -1);
            region.GetState().TrapGetAccess(() => {
                let result = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                if (isBoolean && !!result){
                    element.setAttribute(name, name);
                }
                else if (isBoolean){
                    element.removeAttribute(name);
                }
                else{//Set evaluated value
                    element.setAttribute(name, result);
                }
            }, true);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Style(region: Region, element: HTMLElement, directive: Directive){
            if (directive.parts[0] !== 'style'){
                return DirectiveHandlerReturn.Nil;
            }

            let parts = [...directive.parts].splice(1);
            let key = Processor.GetCamelCaseDirectiveName(parts.join('-'));

            if (!(key in element.style)){//Unrecognized style
                return DirectiveHandlerReturn.Nil;
            }

            let regionId = region.GetId();
            region.GetState().TrapGetAccess(() => {
                element.style[key] = CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
            }, true);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static Event(region: Region, element: HTMLElement, directive: Directive){
            const knownEvents = new Array<string>(
                'blur', 'change', 'click', 'contextmenu', 'context-menu', 'dblclick', 'focus', 'focusin', 'focusout', 'hover', 'keydown',
                'keyup', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'scroll', 'submit',
            );

            let options = {
                outside: false,
                prevent: false,
                stop: false,
                once: false,
                window: false,
                self: false,
                camel: false,
                join: false
            };

            let keyOptions = {
                meta: false,
                ctrl: false,
                shift: false,
                key_: '',
            };

            let eventName: string;
            if (directive.parts[0] === 'on'){
                eventName = [...directive.parts].splice(1).join('-');
            }
            else if (knownEvents.indexOf(directive.parts[0].split('.')[0]) != -1){
                eventName = directive.raw;
            }

            if (!eventName){
                return DirectiveHandlerReturn.Nil;
            }

            let parts = eventName.split('.'), unknownParts: Array<string>, isKey = false;
            if (parts.length > 1){//Resolve modifiers
                eventName = parts[0];
                unknownParts = new Array<string>();
                parts.forEach((part) => {
                    if (part in options){
                        options[part] = true;
                    }
                    else{
                        unknownParts.push(part);
                    }
                });

                if (eventName === 'keydown' || eventName === 'keyup'){
                    isKey = true;
                    unknownParts.forEach((part) => {
                        if (part in keyOptions){
                            keyOptions[part] = true;
                        }
                        else if (part in Region.keyMap){
                            keyOptions.key_ = Region.keyMap[part];
                        }
                        else{
                            keyOptions.key_ = part;
                        }
                    });
                }
            }

            if (options.camel){
                eventName = Processor.GetCamelCaseDirectiveName(eventName);
            }
            else if (options.join){
                eventName = eventName.split('-').join('.');
            }

            let regionId = region.GetId(), stoppable: boolean;
            let onEvent = (e: Event) => {
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
                
                try{
                    if (options.self && !options.outside && e.target !== element){
                        return;
                    }

                    if (isKey){
                        if ((keyOptions.meta && !(e as KeyboardEvent).metaKey) || (keyOptions.ctrl && !(e as KeyboardEvent).ctrlKey) || (keyOptions.shift && !(e as KeyboardEvent).shiftKey)){
                            return;//Key modifier absent
                        }

                        if (keyOptions.key_ && (e as KeyboardEvent).key !== keyOptions.key_){
                            return;//Keys don't match
                        }
                    }

                    if (myRegion){
                        myRegion.GetState().PushEventContext(e);
                    }

                    CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value);
                }
                finally{
                    if (myRegion){
                        myRegion.GetState().PopEventContext();
                    }
                }
            };
            
            let event = region.ExpandEvent(eventName, element);
            if (options.outside){
                stoppable = false;
                region.AddOutsideEventCallback(element, event, onEvent);
            }
            else{
                stoppable = true;
                (options.window ? window : element).addEventListener(event, onEvent);
            }
            
            return DirectiveHandlerReturn.Handled;
        }

        public static AddAll(){
            DirectiveHandlerManager.AddBulkHandler(CoreBulkDirectiveHandlers.Static);
            DirectiveHandlerManager.AddBulkHandler(CoreBulkDirectiveHandlers.Attr);
            DirectiveHandlerManager.AddBulkHandler(CoreBulkDirectiveHandlers.Style);
            DirectiveHandlerManager.AddBulkHandler(CoreBulkDirectiveHandlers.Event);
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
                [...element.children].forEach(child => Processor.All(region, (child as HTMLElement)));
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
            let attributes = [...element.attributes];//Duplicate attributes
            let result = DirectiveHandlerReturn.Nil;
            
            for (let i = 0; i < attributes.length; ++i){//Traverse attributes
                let directive = Processor.GetDirective(attributes[i]);
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
        
        public static GetDirective(attribute: Attr): Directive{
            let matches = attribute.name.match(Region.directiveRegex);
            if (!matches || matches.length != 3 || !matches[2]){//Not a directive
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
        
        public static GetCamelCaseDirectiveName(name: string): string{
            return name.replace(/-([^-])/g, (...args) => {
                return (args[1].charAt(0).toUpperCase() + args[1].slice(1));
            });
        }
    }

    export class Bootstrap{
        private static lastRegionId_: number = null;
        
        public static Attach(anchors?: Array<string>){
            if (!anchors){
                anchors = [`data-${Region.directivePrfix}-data`, `${Region.directivePrfix}-data`];
            }
            
            anchors.forEach((anchor) => {//Traverse anchors
                document.querySelectorAll(`[${anchor}]`).forEach((element) => {//Traverse elements
                    if (!element.hasAttribute(anchor)){//Probably contained inside another region
                        return;
                    }

                    let regionId: number;
                    if (Bootstrap.lastRegionId_ === null){
                        regionId = (Bootstrap.lastRegionId_ = 0);
                    }
                    else{
                        regionId = ++Bootstrap.lastRegionId_;
                    }

                    let stringRegionId = `rgn_${regionId}`;
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
                                let scope = region.GetElementScope(mutation.target as HTMLElement);
                                if (scope){
                                    scope.attributeChangeCallbacks.forEach(callback => callback(mutation.attributeName));
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
        CoreBulkDirectiveHandlers.AddAll();
    })();
}
