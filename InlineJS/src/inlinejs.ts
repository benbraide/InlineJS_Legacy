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
        falseIfCondition: Array<() => void>;
        preserve: boolean;
        paused: boolean;
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

        public static enableOptimizedBinds = true;
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
        private refs_ = new Map<string, HTMLElement>();
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
                falseIfCondition: null,
                preserve: false,
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

                if (!preserve && !scope.preserve){
                    scope.changeRefs.forEach((info) => {
                        let region = Region.Get(info.regionId);
                        if (region){
                            region.changes_.Unsubscribe(info.subscriptionId);
                        }
                    });
    
                    scope.element.removeAttribute(Region.GetElementKeyName());
                    Object.keys(scope.intersectionObservers).forEach(key => scope.intersectionObservers[key].unobserve(scope.element));
                }
                else{
                    scope.preserve = !(preserve = true);
                }
                
                [...scope.element.children].forEach(child => this.RemoveElement(child as HTMLElement, preserve));
                if (!preserve){//Delete scope
                    delete this.elementScopes_[scope.key];
                }
            }
            else if (typeof element !== 'string'){
                [...element.children].forEach(child => this.RemoveElement(child as HTMLElement, preserve));
            }
            
            if (!preserve && element === this.rootElement_){//Remove from map
                this.AddNextTickCallback(() => {//Wait for changes to finalize
                    if (this.componentKey_ in Region.components_){
                        delete Region.components_[this.componentKey_];
                    }
    
                    delete RegionMap.entries[this.id_];
                });
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
            if (!Region.enableOptimizedBinds){
                return;
            }
            
            let info = this.getAccessStorages_.Peek();
            if (info && info.storage && info.storage.raw){
                info.storage.optimized = new Array<GetAccessInfo>();
                info.storage.raw.forEach(item => info.storage.optimized.push(item));
            }
        }

        public PushGetAccessStorage(storage: GetAccessStorage): void{
            this.getAccessStorages_.Push({
                storage: (storage || {
                    optimized: (Region.enableOptimizedBinds ? new Array<GetAccessInfo>() : null),
                    raw: new Array<GetAccessInfo>()
                }),
                lastAccessPath: ''
            });
        }

        public GetGetAccessStorage(optimized: false): GetAccessStorage;
        public GetGetAccessStorage(optimized: true): Array<GetAccessInfo>;
        public GetGetAccessStorage(optimized = true){
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

        public TrapGetAccess(callback: ChangeCallbackType, changeCallback: ChangeCallbackType | true, staticCallback?: () => void): Map<string, Array<number>>{
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
            if (stopped || !changeCallback || storage.length == 0){//Not reactive
                if (staticCallback){
                    staticCallback();
                }
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
                
                if (stopped){//Unsubscribe all subscribed
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

            Region.AddGlobal('$refs', (regionId: string) => Region.Get(regionId).GetRefs());
            Region.AddGlobal('$self', (regionId: string) => Region.Get(regionId).GetState().GetElementContext());
            Region.AddGlobal('$root', (regionId: string) => Region.Get(regionId).GetRootElement());

            Region.AddGlobal('$parent', (regionId: string) => Region.Get(regionId).GetElementAncestor(true, 0));
            Region.AddGlobal('$getAncestor', (regionId: string) => (index: number) => Region.Get(regionId).GetElementAncestor(true, index));

            Region.AddGlobal('$component', () => (id: string) => Region.Find(id, true));
            Region.AddGlobal('$locals', (regionId: string) => Region.Get(regionId).GetElementScope(true).locals);
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

    export interface EachOptions{
        isArray: boolean;
        list: Array<HTMLElement> | Map<string, HTMLElement>;
        target: Array<any> | Map<string, any> | number;
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
            region.AddElement(element, true).uninitCallbacks.push(() => CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            return DirectiveHandlerReturn.Handled;
        }

        public static Ref(region: Region, element: HTMLElement, directive: Directive){
            region.AddRef(directive.value, element);
            return DirectiveHandlerReturn.Handled;
        }

        public static Attr(region: Region, element: HTMLElement, directive: Directive){
            const booleanAttributes = new Array<string>(
                'allowfullscreen', 'allowpaymentrequest', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
                'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'ismap', 'itemscope', 'loop', 'multiple', 'muted',
                'nomodule', 'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected',
            );

            return CoreDirectiveHandlers.InternalAttr(region, element, directive, (key, value) => {
                if (booleanAttributes.indexOf(key) != -1){
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
                }, true);

                return DirectiveHandlerReturn.Handled;
            }

            if (validator && !validator(directive.arg.key)){
                return DirectiveHandlerReturn.Nil;
            }

            region.GetState().TrapGetAccess(() => {
                callback(directive.arg.key, CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
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
                onChange = () => element.innerHTML = CoreDirectiveHandlers.ToString(CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value));
            }
            else if (element.tagName === 'INPUT'){
                if ((element as HTMLInputElement).type === 'checkbox' || (element as HTMLInputElement).type === 'radio'){
                    onChange = () => (element as HTMLInputElement).checked = !!CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
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
            }, true);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static On(region: Region, element: HTMLElement, directive: Directive){
            if (!directive.arg || !directive.arg.key){
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
                else if (isKey && option in Region.keyMap){
                    keyOptions.keys_.push(Region.keyMap[option]);
                }
                else if (isKey){
                    keyOptions.keys_.push(option);
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
                
                try{
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
            
            let event = region.ExpandEvent(directive.arg.key, element);
            if (!options.outside){
                stoppable = true;
                if (options.window){
                    window.addEventListener(event, onEvent);
                }
                else{
                    (options.document ? document : element).addEventListener(event, onEvent);
                }
            }
            else{
                stoppable = false;
                region.AddOutsideEventCallback(element, event, onEvent);
            }
            
            return DirectiveHandlerReturn.Handled;
        }
        
        public static Model(region: Region, element: HTMLElement, directive: Directive){
            let doneInput = false, options = {
                out: false,
                lazy: false,
                number: false
            };

            directive.arg.options.forEach((option) => {
                if (option in options){
                    options[option] = true;
                }
            });
            
            if (!options.out){//Bidirectional
                CoreDirectiveHandlers.TextOrHtml(region, element, directive, false, () => !doneInput);
            }

            let isCheckable = false, isInput = false;
            if (element.tagName === 'INPUT'){
                let type = (element as HTMLInputElement).type;
                isCheckable = (type === 'checkbox' || type === 'radio');
                isInput = true;
            }

            let isUnknown = (!isInput && element.tagName !== 'TEXTAREA' && element.tagName !== 'SELECT');
            let convertValue = (value: string) => {
                if (isCheckable){
                    return [(element as HTMLInputElement).checked, (element as HTMLInputElement).checked];
                }
                
                if (!options.number){
                    return [`'${value}'`, value];
                }

                try{
                    let parsedValue = parseInt(value);
                    return [parsedValue, parsedValue];
                }
                catch (err){}

                if (value){
                    return [`'${value}'`, value];
                }

                return [null, null];
            };

            if (options.out && 'value' in element){//Initial assignment
                let values = convertValue((element as HTMLInputElement).value);
                CoreDirectiveHandlers.Assign(region, element, directive.value, values[0]?.toString(), () => values[1]);
            }

            let onEvent = (e: Event) => {
                if (doneInput){
                    return;
                }
                
                if (isUnknown){//Unpdate inner text
                    element.innerText = (e.target as HTMLInputElement).value;
                }

                let values = convertValue((e.target as HTMLInputElement).value);
                CoreDirectiveHandlers.Assign(region, element, directive.value, values[0]?.toString(), () => values[1]);

                doneInput = true;
                region.AddNextTickCallback(() => doneInput = false);
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
            let info = CoreDirectiveHandlers.InitIfOrEach(region, element, directive.original), isInserted = true, ifFirstEntry = true;
            region.GetState().TrapGetAccess(() => {
                let myRegion = Region.Get(info.regionId), scope = myRegion.GetElementScope(info.scopeKey);
                if (!scope.falseIfCondition){
                    scope.falseIfCondition = new Array<() => void>();
                }
                
                if (!isInserted){
                    scope.paused = true;//Pause removal
                    if (!element.parentElement){
                        CoreDirectiveHandlers.InsertOrAppendChildElement(info.parent, element, info.marker);//Temporarily insert element into DOM
                    }

                    if (CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value)){
                        isInserted = true;
                        scope.paused = false;//Resume removal
                        CoreDirectiveHandlers.InsertIfOrEach(myRegion, element, info);//Execute directives
                    }
                    else{//Remove from DOM
                        info.parent.removeChild(element);
                    }
                }
                else if (!CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value)){
                    isInserted = false;
                    scope.preserve = true;//Don't remove scope
                    [...scope.falseIfCondition].forEach(callback => callback());

                    if (!ifFirstEntry){
                        info.attributes.forEach(attr => element.removeAttribute(attr.name));
                    }

                    if (element.parentElement){
                        element.parentElement.removeChild(element);
                    }
                }
                else if (ifFirstEntry){//Execute directives
                    CoreDirectiveHandlers.InsertIfOrEach(region, element, info);
                }

                ifFirstEntry = false;
            }, true, () => { region.GetElementScope(element).preserve = false });

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
                ifConditionIsTrue = false;
                empty();

                let myRegion = Region.Get(info.regionId);
                if (options.path){
                    myRegion.GetChanges().Add({
                        type: 'set',
                        path: options.path,
                        prop: '',
                        origin: myRegion.GetChanges().GetOrigin()
                    });
                }
                
                let myScope = myRegion.GetElementScope(element);
                if (myScope){
                    myScope.falseIfCondition.splice(myScope.falseIfCondition.indexOf(falseIfCondition), 1);
                }
            };

            if (scope.falseIfCondition){
                scope.falseIfCondition.push(falseIfCondition);
            }
            else{
                element.removeAttribute(info.scopeKey);
            }
            
            let options: EachOptions = {
                isArray: false,
                list: null,
                target: null,
                count: 0,
                path: ''
            };

            let getIndex = (clone: HTMLElement, key?: string) => (options.isArray ? (options.list as Array<HTMLElement>).indexOf(clone) : key);
            let initLocals = (myRegion: Region, clone: HTMLElement, key?: string) => {
                myRegion.AddLocal(clone, '$each', CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === 'count'){
                        if (options.isArray){
                            return (options.target as Array<any>).length;
                        }

                        if (options.path){
                            Region.Get(info.regionId).GetChanges().AddGetAccess(`${options.path}.length`);
                        }
                        
                        return options.count;
                    }
                    
                    if (prop === 'index'){
                        return getIndex(clone, key);
                    }

                    if (prop === 'value'){
                        return (options.isArray ? (options.target as Array<any>)[(getIndex(clone) as number)] : (options.target as Map<string, any>)[key]);
                    }

                    if (prop === 'parent'){
                        return Region.Get(info.regionId).GetLocal(clone.parentElement, '$each', true);
                    }

                    return null;
                }, ['count', 'index', 'value']));
            };

            let insert = (myRegion: Region, key?: string) => {
                let clone = (element.cloneNode(true) as HTMLElement), offset: number;
                if (!options.isArray){
                    offset = Object.keys(options.list as Map<string, HTMLElement>).length;
                    if (key in (options.list as Map<string, HTMLElement>)){//Remove existing
                        info.parent.removeChild((options.list as Map<string, HTMLElement>)[key]);
                    }
                    (options.list as Map<string, HTMLElement>)[key] = clone;
                }
                else{//Append to array
                    offset = (options.list as Array<HTMLElement>).length;
                    (options.list as Array<HTMLElement>).push(clone);
                }

                CoreDirectiveHandlers.InsertIfOrEach(myRegion, clone, info, () => initLocals(myRegion, clone, key), offset);
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

            let empty = () => {
                if (options.isArray && options.list){
                    (options.list as Array<HTMLElement>).forEach(clone => info.parent.removeChild(clone));
                }
                else if (options.list){//Key-value pairs
                    Object.keys((options.list as Map<string, HTMLElement>)).forEach(key => info.parent.removeChild((options.list as Map<string, HTMLElement>)[key]));
                }

                options.list = null;
            };

            let getRange = (from: number, to: number) => {
                if (from < to){
                    return Array.from({length: (to - from)}, (value, key) => (key + from));
                }
                return Array.from({length: (from - to)}, (value, key) => (from - key));
            };

            let expandTarget = (target: any) => {
                if (typeof target === 'number' && Number.isInteger(target)){
                    let offset = (isCount ? 1 : 0);

                    if (target < 0){
                        return (isReverse ? getRange((target - offset + 1), (1 - offset)) : getRange(-offset, (target - offset)));
                    }
                    
                    return (isReverse ? getRange((target + offset - 1), (offset - 1)) : getRange(offset, (target + offset)));
                }

                return target;
            };

            let init = (myRegion: Region, refresh = false) => {
                if (!refresh){//First initialization
                    empty();
                    
                    options.target = expandTarget(CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value));
                    info.parent.removeChild(element);
                    
                    if (!options.target){
                        return false;
                    }
                }

                if (Array.isArray(options.target)){
                    options.isArray = true;
                    options.count = (options.target as Array<any>).length;
                    options.list = new Array<HTMLElement>();
                    if (!refresh && '__InlineJS_Path__' in options.target){
                        options.path = options.target['__InlineJS_Path__'];
                    }
                }
                else if (Region.IsObject(options.target)){
                    options.list = new Map<string, HTMLElement>();
                    if ('__InlineJS_Target__' in (options.target as Record<string, any>)){
                        if (!refresh){
                            options.path = options.target['__InlineJS_Path__'];
                        }
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
                if (!ifConditionIsTrue){
                    return false;
                }
                
                changes.forEach((change) => {
                    if ('original' in change){//Bubbled
                        if (options.isArray || change.original.type !== 'set' || `${options.path}.${change.original.prop}` !== change.original.path){
                            return true;
                        }

                        addSizeChange(myRegion);
                        insert(myRegion, change.original.prop);
                    }
                    else if (change.type === 'set' && change.path === options.path){//Object replaced
                        empty();
                        
                        let target = myRegion.GeRootProxy().GetNativeProxy(), parts = change.path.split('.');
                        for (let i = 1; i < parts.length; ++i){//Resolve target
                            if (!target || typeof target !== 'object' || !('__InlineJS_Target__' in target)){
                                return false;
                            }

                            target = target[parts[i]];
                        }

                        options.target = expandTarget(target);
                        return (options.target && init(myRegion, true));
                    }
                    else if (options.isArray && change.type === 'set' && change.path === `${options.path}.length`){
                        let count = (options.target as Array<any>).length;
                        if (count < options.count){//Item(s) removed
                            (options.list as Array<HTMLElement>).splice(count).forEach(clone => info.parent.removeChild(clone));
                        }
                        else if (options.count < count){//Item(s) added
                            for (let diff = (count - options.count); 0 < diff; --diff){
                                insert(myRegion);
                            }
                        }
                        options.count = count;
                    }
                    else if (!options.isArray && change.type === 'delete' && change.prop in (options.list as Map<string, HTMLElement>)){
                        info.parent.removeChild((options.list as Map<string, HTMLElement>)[change.prop]);
                        addSizeChange(Region.Get(info.regionId));
                        delete (options.list as Map<string, HTMLElement>)[change.prop];
                    }
                });

                return true;
            };
            
            region.GetState().TrapGetAccess(() => init(Region.Get(info.regionId)), (change) => onChange(Region.Get(info.regionId), change));
            
            return DirectiveHandlerReturn.QuitAll;
        }

        public static InitIfOrEach(region: Region, element: HTMLElement, except: string): IfOrEachInfo{
            let attributes = new Array<LiteAttr>(), elScopeKey = Region.GetElementKeyName(), scopeKey = element.getAttribute(elScopeKey);
            [...element.attributes].forEach((attr) => {
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
                scopeKey: scopeKey,
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

        public static Call(regionId: string, callback: (...args: any) => any, ...args: any){
            try{
                return callback(...args);
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

            if (typeof value === 'object' && '__InlineJS_Target__' in value){
                return CoreDirectiveHandlers.ToString(value['__InlineJS_Target__']);
            }

            return value.toString();
        }

        public static GetChildElementIndex(element: HTMLElement){
            return (element.parentElement ? [...element.parentElement.children].indexOf(element) : -1);
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

        public static AddAll(){
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
    })();
}
