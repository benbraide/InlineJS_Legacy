declare namespace InlineJS {
    class Stack<T> {
        private list_;
        Push(value: T): void;
        Pop(): T;
        Peek(): T;
        IsEmpty(): boolean;
    }
    class NoResult {
    }
    class Value {
        private callback_;
        constructor(callback_: () => any);
        Get(): any;
    }
    interface ChangeRefInfo {
        regionId: string;
        subscriptionId: number;
    }
    interface TrapInfo {
        stopped: boolean;
        callback: ChangeCallbackType;
    }
    interface ElementScope {
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
    interface LocalHandler {
        element: HTMLElement;
        callback: (element: HTMLElement, prop: string, bubble: boolean) => any;
    }
    interface ExternalCallbacks {
        isEqual: (first: any, second: any) => boolean;
        deepCopy: (target: any) => any;
    }
    class RegionMap {
        static entries: Record<string, Region>;
        static scopeRegionIds: Stack<string>;
    }
    type GlobalCallbackType = (regionId?: string, contextElement?: HTMLElement) => any;
    class RootElement {
    }
    interface GlobalAttributeInfo {
        handler: GlobalCallbackType;
        accessHandler: (regionId?: string) => boolean;
    }
    interface GlobalOutsideEventInfo {
        target: HTMLElement;
        handler: (event: Event) => void;
    }
    class Region {
        private id_;
        private rootElement_;
        private rootProxy_;
        private static components_;
        private static globals_;
        private static postProcessCallbacks_;
        private static outsideEventCallbacks_;
        private static globalOutsideEvents_;
        static enableOptimizedBinds: boolean;
        static directivePrfix: string;
        static directiveRegex: RegExp;
        static externalCallbacks: ExternalCallbacks;
        static keyMap: {
            Ctrl: string;
            Return: string;
            Esc: string;
            Space: string;
            Menu: string;
            Del: string;
            Ins: string;
            Plus: string;
            Minus: string;
            Star: string;
            Slash: string;
        };
        static booleanAttributes: string[];
        private componentKey_;
        private doneInit_;
        private elementScopes_;
        private lastElementId_;
        private state_;
        private changes_;
        private proxies_;
        private refs_;
        private observer_;
        private outsideEvents_;
        private localHandlers_;
        private nextTickCallbacks_;
        private tempCallbacks_;
        private scopeId_;
        private tempCallbacksId_;
        private enableOptimizedBinds_;
        constructor(id_: string, rootElement_: HTMLElement, rootProxy_: RootProxy);
        SetDoneInit(): void;
        GetDoneInit(): boolean;
        GenerateScopeId(): string;
        GetId(): string;
        GetComponentKey(): string;
        GetRootElement(): HTMLElement;
        GetElementWith(target: HTMLElement | true, callback: (resolvedTarget: HTMLElement) => boolean): HTMLElement;
        GetElementAncestor(target: HTMLElement | true, index: number): HTMLElement;
        GetElementScope(element: HTMLElement | string | true | RootElement): ElementScope;
        GetElement(element: HTMLElement | string): HTMLElement;
        GetState(): State;
        GetChanges(): Changes;
        GetRootProxy(): RootProxy;
        FindProxy(path: string): Proxy;
        AddProxy(proxy: Proxy): void;
        RemoveProxy(path: string): void;
        AddRef(key: string, element: HTMLElement): void;
        GetRefs(): Record<string, HTMLElement>;
        AddElement(element: HTMLElement, check?: boolean): ElementScope;
        RemoveElement(element: HTMLElement | string, preserve?: boolean): void;
        MarkElementAsRemoved(element: HTMLElement | string): void;
        ElementIsRemoved(element: HTMLElement | string): boolean;
        ElementIsContained(element: HTMLElement | string, checkDocument?: boolean): boolean;
        ElementExists(element: HTMLElement | string): boolean;
        AddOutsideEventCallback(element: HTMLElement | string, events: string | Array<string>, callback: (event: Event) => void): void;
        RemoveOutsideEventCallback(element: HTMLElement | string, events: string | Array<string>, callback: (event: Event) => void): void;
        AddNextTickCallback(callback: () => void): void;
        ExecuteNextTick(): void;
        AddLocal(element: HTMLElement | string, key: string, value: any): void;
        GetLocal(element: HTMLElement | string, key: string, bubble?: boolean): any;
        AddLocalHandler(element: HTMLElement, callback: (element: HTMLElement, prop: string, bubble: boolean) => any): void;
        RemoveLocalHandler(element: HTMLElement): void;
        SetObserver(observer: MutationObserver): void;
        GetObserver(): MutationObserver;
        ExpandEvent(event: string, element: HTMLElement | string | true): string;
        Call(target: (...args: any) => any, ...args: any): any;
        AddTemp(callback: () => any): string;
        CallTemp(key: string): any;
        SetOptimizedBindsState(enabled: boolean): void;
        OptimizedBindsIsEnabled(): boolean;
        static Get(id: string): Region;
        static GetCurrent(id: string): Region;
        static Infer(element: HTMLElement | string): Region;
        static AddComponent(region: Region, element: HTMLElement, key: string): boolean;
        static RemoveElementStatic(element: HTMLElement, preserve?: boolean): void;
        static Find(key: string, getNativeProxy: false): Region;
        static Find(key: string, getNativeProxy: true): any;
        static AddGlobal(key: string, callback: GlobalCallbackType, accessHandler?: (regionId?: string) => boolean): void;
        static RemoveGlobal(key: string): void;
        static GetGlobal(regionId: string, key: string): GlobalCallbackType;
        static GetGlobalValue(regionId: string, key: string, contextElement?: HTMLElement): any;
        static AddPostProcessCallback(callback: () => void): void;
        static ExecutePostProcessCallbacks(): void;
        static AddGlobalOutsideEventCallback(element: HTMLElement, events: string | Array<string>, callback: (event: Event) => void): void;
        static RemoveGlobalOutsideEventCallback(element: HTMLElement, events: string | Array<string>, callback: (event: Event) => void): void;
        static SetDirectivePrefix(value: string): void;
        static IsEqual(first: any, second: any): boolean;
        static DeepCopy(target: any): any;
        static GetElementKeyName(): string;
        static IsObject(target: any): boolean;
        static UnsubscribeAll(list: Array<ChangeRefInfo>): void;
    }
    interface Change {
        regionId: string;
        type: 'set' | 'delete';
        path: string;
        prop: string;
        origin: ChangeCallbackType;
    }
    interface BubbledChange {
        original: Change;
        path: string;
    }
    type ChangeCallbackType = (changes?: Array<Change | BubbledChange>) => void | boolean;
    interface ChangeBatchInfo {
        callback: ChangeCallbackType;
        changes: Array<Change | BubbledChange>;
    }
    interface SubscriberInfo {
        id: number;
        callback: ChangeCallbackType;
    }
    interface GetAccessInfo {
        regionId: string;
        path: string;
    }
    interface GetAccessCheckpoint {
        optimized: number;
        raw: number;
    }
    interface GetAccessStorage {
        optimized: Array<GetAccessInfo>;
        raw: Array<GetAccessInfo>;
        checkpoint: GetAccessCheckpoint;
    }
    interface GetAccessStorageInfo {
        storage: GetAccessStorage;
        lastAccessPath: string;
    }
    type GetAccessHookType = (regionId?: string, path?: string) => boolean;
    class Changes {
        private regionId_;
        private isScheduled_;
        private list_;
        private subscriberId_;
        private subscribers_;
        private getAccessStorages_;
        private getAccessHooks_;
        private origins_;
        constructor(regionId_: string);
        GetRegionId(): string;
        Schedule(): void;
        Add(item: Change | BubbledChange): void;
        Subscribe(path: string, callback: ChangeCallbackType): number;
        Unsubscribe(id: number): void;
        AddGetAccess(path: string): void;
        ReplaceOptimizedGetAccesses(): void;
        FlushRawGetAccesses(): void;
        AddGetAccessesCheckpoint(): void;
        DiscardGetAccessesCheckpoint(): void;
        PushGetAccessStorage(storage: GetAccessStorage): void;
        RetrieveGetAccessStorage(optimized: false): GetAccessStorage;
        RetrieveGetAccessStorage(optimized: true): Array<GetAccessInfo>;
        PopGetAccessStorage(optimized: false): GetAccessStorage;
        PopGetAccessStorage(optimized: true): Array<GetAccessInfo>;
        PushGetAccessHook(hook: GetAccessHookType): void;
        RetrieveGetAccessHook(): GetAccessHookType;
        PopGetAccessHook(): GetAccessHookType;
        PushOrigin(origin: ChangeCallbackType): void;
        GetOrigin(): ChangeCallbackType;
        PopOrigin(): ChangeCallbackType;
        static SetOrigin(change: Change | BubbledChange, origin: ChangeCallbackType): void;
        static GetOrigin(change: Change | BubbledChange): ChangeCallbackType;
        static AddBatch(batches: Array<ChangeBatchInfo>, change: Change | BubbledChange, callback: ChangeCallbackType): void;
    }
    class State {
        private regionId_;
        private elementContext_;
        private eventContext_;
        constructor(regionId_: string);
        PushElementContext(element: HTMLElement): void;
        PopElementContext(): HTMLElement;
        GetElementContext(): HTMLElement;
        PushEventContext(Value: Event): void;
        PopEventContext(): Event;
        GetEventContext(): Event;
        TrapGetAccess(callback: ChangeCallbackType, changeCallback: ChangeCallbackType | true, elementContext: HTMLElement | string, staticCallback?: () => void): Record<string, Array<number>>;
        ReportError(value: any, ref?: any): void;
        Warn(value: any, ref?: any): void;
        Log(value: any, ref?: any): void;
    }
    class Evaluator {
        private static cachedProxy_;
        static Evaluate(regionId: string, elementContext: HTMLElement | string, expression: string, useWindow?: boolean, ignoreRemoved?: boolean): any;
        static GetContextKey(): string;
        static GetProxy(regionId: string, proxy: object): object;
        static CreateProxy(proxy: object): {};
        static RemoveProxyCache(regionId: string): void;
    }
    interface Proxy {
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
    class RootProxy implements Proxy {
        private regionId_;
        private target_;
        private nativeProxy_;
        private proxies_;
        constructor(regionId_: string, target_: object);
        IsRoot(): boolean;
        GetRegionId(): string;
        GetTarget(): object;
        GetNativeProxy(): object;
        GetName(): string;
        GetPath(): string;
        GetParentPath(): string;
        AddChild(child: ChildProxy): void;
        RemoveChild(name: string): void;
        GetProxies(): Record<string, ChildProxy>;
        static Watch(regionId: string, elementContext: HTMLElement | string, expression: string, callback: (value: any) => boolean, skipFirst: boolean): void;
        static AddGlobalCallbacks(): void;
    }
    class ChildProxy implements Proxy {
        private regionId_;
        private parentPath_;
        private name_;
        private target_;
        private nativeProxy_;
        private proxies_;
        constructor(regionId_: string, parentPath_: string, name_: string, target_: object);
        IsRoot(): boolean;
        GetRegionId(): string;
        GetTarget(): object;
        GetNativeProxy(): object;
        GetName(): string;
        GetPath(): string;
        GetParentPath(): string;
        AddChild(child: ChildProxy): void;
        RemoveChild(name: string): void;
        GetProxies(): Record<string, ChildProxy>;
    }
    enum DirectiveHandlerReturn {
        Nil = 0,
        Handled = 1,
        Rejected = 2,
        QuitAll = 3
    }
    interface DirectiveArg {
        key: string;
        options: Array<string>;
    }
    interface Directive {
        original: string;
        expanded: string;
        parts: Array<string>;
        raw: string;
        key: string;
        arg: DirectiveArg;
        value: string;
    }
    type DirectiveHandlerType = (region: Region, element: HTMLElement, directive: Directive) => DirectiveHandlerReturn;
    class DirectiveHandlerManager {
        private static directiveHandlers_;
        private static bulkDirectiveHandlers_;
        static AddHandler(key: string, handler: DirectiveHandlerType): void;
        static RemoveHandler(key: string): void;
        static GetHandler(key: string): DirectiveHandlerType;
        static AddBulkHandler(handler: DirectiveHandlerType): void;
        static Handle(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
    }
    interface LiteAttr {
        name: string;
        value: string;
    }
    interface IfOrEachInfo {
        regionId: string;
        scopeKey: string;
        parent: HTMLElement;
        marker: number;
        attributes: Array<LiteAttr>;
    }
    interface EachCloneInfo {
        key: string | number;
        element: HTMLElement;
        animator: (show: boolean, beforeCallback?: (show?: boolean) => void, afterCallback?: (show?: boolean) => void) => void;
    }
    interface EachOptions {
        clones: Array<EachCloneInfo> | Record<string, EachCloneInfo>;
        items: Array<any> | Record<string, any> | number;
        itemsTarget: Array<any> | Record<string, any> | number;
        count: number;
        path: string;
        rangeValue: number;
    }
    interface DataOptions {
        $enableOptimizedBinds?: boolean;
        $locals?: Record<string, any>;
        $component?: string;
        $init?: (region?: Region) => void;
    }
    class CoreDirectiveHandlers {
        static PrepareAnimation: (region: Region, element: HTMLElement | ((step: number) => void), options: Array<string>) => ((show: boolean, beforeCallback?: (show?: boolean) => void, afterCallback?: (show?: boolean) => void, args?: any) => void);
        static Noop(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Data(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Locals(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Component(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Post(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Init(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Bind(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Static(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn;
        static Uninit(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Ref(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Attr(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Style(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Class(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static InternalAttr(region: Region, element: HTMLElement, directive: Directive, callback: (key: string, value: any) => void, validator?: (key: string) => boolean, acceptList?: boolean): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Text(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Html(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static TextOrHtml(region: Region, element: HTMLElement, directive: Directive, isHtml: boolean, callback?: () => boolean): DirectiveHandlerReturn;
        static On(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Model(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Show(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static If(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Each(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static InitIfOrEach(region: Region, element: HTMLElement, except: string): IfOrEachInfo;
        static InsertIfOrEach(region: Region, element: HTMLElement, info: IfOrEachInfo, callback?: () => void, offset?: number): void;
        static CreateProxy(getter: (prop: string) => any, contains: Array<string> | ((prop: string) => boolean), setter?: (target: object, prop: string | number | symbol, value: any) => boolean, target?: any): any;
        static Evaluate(region: Region, element: HTMLElement, expression: string, useWindow?: boolean, ...args: any): any;
        static EvaluateAlways(region: Region, element: HTMLElement, expression: string, useWindow?: boolean, ...args: any): any;
        static DoEvaluation(region: Region, element: HTMLElement, expression: string, useWindow: boolean, ignoreRemoved: boolean, ...args: any): any;
        static Call(regionId: string, callback: (...args: any) => any, ...args: any): any;
        static ExtractDuration(value: string, defaultValue: number): number;
        static ToString(value: any): string;
        static GetChildElementIndex(element: HTMLElement): number;
        static GetChildElementAt(parent: HTMLElement, index: number): HTMLElement;
        static InsertOrAppendChildElement(parent: HTMLElement, element: HTMLElement, index: number): void;
        static GetAnimator(region: Region, animate: boolean, element: HTMLElement | ((step: number) => void), options: Array<string>, always?: boolean): (show: boolean, beforeCallback?: (show?: boolean) => void, afterCallback?: (show?: boolean) => void, args?: any) => void;
        static AddAll(): void;
    }
    interface ProcessorOptions {
        checkTemplate?: boolean;
        checkDocument?: boolean;
    }
    class Processor {
        static All(region: Region, element: HTMLElement, options?: ProcessorOptions): void;
        static One(region: Region, element: HTMLElement, options?: ProcessorOptions): DirectiveHandlerReturn;
        static Pre(region: Region, element: HTMLElement): void;
        static Post(region: Region, element: HTMLElement): void;
        static PreOrPost(region: Region, element: HTMLElement, scopeKey: string, name: string): void;
        static DispatchDirective(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Check(element: HTMLElement, options: ProcessorOptions): boolean;
        static TraverseDirectives(element: HTMLElement, callback: (directive: Directive) => DirectiveHandlerReturn): DirectiveHandlerReturn;
        static GetDirective(attribute: Attr): Directive;
        static GetDirectiveWith(name: string, value: string): Directive;
        static GetCamelCaseDirectiveName(name: string, ucfirst?: boolean): string;
    }
    class Config {
        static SetDirectivePrefix(value: string): void;
        static SetExternalCallbacks(isEqual: (first: any, second: any) => boolean, deepCopy: (target: any) => any): void;
        static SetIsEqualExternalCallback(callback: (first: any, second: any) => boolean): void;
        static SetDeepCopyExternalCallback(callback: (target: any) => any): void;
        static AddKeyEventMap(key: string, target: string): void;
        static RemoveKeyEventMap(key: string): void;
        static AddBooleanAttribute(name: string): void;
        static RemoveBooleanAttribute(name: string): void;
        static SetOptimizedBindsState(enabled: boolean): void;
        static AddDirective(name: string, handler: DirectiveHandlerType): void;
        static RemoveDirective(name: string): void;
        static AddGlobalMagicProperty(name: string, value: GlobalCallbackType | any): void;
        static RemoveGlobalMagicProperty(name: string): void;
        static AddRegionHook(handler: (region: Region, added: boolean) => void): void;
        static RemoveRegionHook(handler: (region: Region, added: boolean) => void): void;
    }
    class Bootstrap {
        private static lastRegionId_;
        private static lastRegionSubId_;
        private static anchors_;
        static regionHooks: ((region: Region, added: boolean) => void)[];
        static Attach(anchors?: Array<string>, node?: HTMLElement): void;
        static Reattach(node?: HTMLElement): void;
        static Attach_(node?: HTMLElement): void;
    }
}
