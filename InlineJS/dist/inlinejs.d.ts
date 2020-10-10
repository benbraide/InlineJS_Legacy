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
    interface ElementScope {
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
    interface ExternalCallbacks {
        isEqual: (first: any, second: any) => boolean;
        deepCopy: (target: any) => any;
    }
    class RegionMap {
        static entries: Map<string, Region>;
        static scopeRegionIds: Stack<string>;
    }
    type GlobalCallbackType = (regionId?: string, contextElement?: HTMLElement) => any;
    class RootElement {
    }
    class Region {
        private id_;
        private rootElement_;
        private rootProxy_;
        private static components_;
        private static globals_;
        private static postProcessCallbacks_;
        static directivePrfix: string;
        static directiveRegex: RegExp;
        static externalCallbacks: ExternalCallbacks;
        static keyMap: {
            meta: string;
            alt: string;
            ctrl: string;
            shift: string;
            enter: string;
            esc: string;
            tab: string;
            space: string;
            menu: string;
            backspace: string;
            del: string;
            ins: string;
            home: string;
            end: string;
            plus: string;
            minus: string;
            star: string;
            slash: string;
            'page-up': string;
            'page-down': string;
            'arrow-left': string;
            'arrow-up': string;
            'arrow-right': string;
            'arrow-down': string;
        };
        private componentKey_;
        private doneInit_;
        private elementScopes_;
        private lastElementId_;
        private state_;
        private changes_;
        private proxies_;
        private observer_;
        private outsideEvents_;
        private nextTickCallbacks_;
        private tempCallbacks_;
        private tempCallbacksId_;
        constructor(id_: string, rootElement_: HTMLElement, rootProxy_: RootProxy);
        SetDoneInit(): void;
        GetDoneInit(): boolean;
        GetId(): string;
        GetRootElement(): HTMLElement;
        GetElementAncestor(target: HTMLElement | true, index: number): HTMLElement;
        GetElementScope(element: HTMLElement | string | true | RootElement): ElementScope;
        GetElement(element: HTMLElement | string): HTMLElement;
        GetState(): State;
        GetChanges(): Changes;
        GeRootProxy(): RootProxy;
        FindProxy(path: string): Proxy;
        AddProxy(proxy: Proxy): void;
        RemoveProxy(path: string): void;
        AddElement(element: HTMLElement, check?: boolean): ElementScope;
        RemoveElement(element: HTMLElement | string): void;
        AddOutsideEventCallback(element: HTMLElement | string, event: string, callback: (event: Event) => void): void;
        RemoveOutsideEventCallback(element: HTMLElement | string, event: string, callback: (event: Event) => void): void;
        AddNextTickCallback(callback: () => void): void;
        ExecuteNextTick(): void;
        AddLocal(element: HTMLElement | string, key: string, value: any): void;
        GetLocal(element: HTMLElement | string, key: string, bubble?: boolean): any;
        SetObserver(observer: MutationObserver): void;
        GetObserver(): MutationObserver;
        ExpandEvent(event: string, element: HTMLElement | string | true): string;
        Call(target: (...args: any) => any, ...args: any): any;
        AddTemp(callback: () => any): string;
        CallTemp(key: string): any;
        static Get(id: string): Region;
        static GetCurrent(id: string): Region;
        static Infer(element: HTMLElement | string): Region;
        static AddComponent(region: Region, element: HTMLElement, key: string): boolean;
        static Find(key: string, getNativeProxy: false): Region;
        static Find(key: string, getNativeProxy: true): any;
        static AddGlobal(key: string, callback: GlobalCallbackType): void;
        static GetGlobal(key: string): GlobalCallbackType;
        static AddPostProcessCallback(callback: () => void): void;
        static ExecutePostProcessCallbacks(): void;
        static SetDirectivePrefix(value: string): void;
        static IsEqual(first: any, second: any): boolean;
        static DeepCopy(target: any): any;
        static GetElementKeyName(): string;
        static IsObject(target: any): boolean;
    }
    interface Change {
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
    interface GetAccessStorage {
        optimized: Array<GetAccessInfo>;
        raw: Array<GetAccessInfo>;
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
        Schedule(): void;
        Add(item: Change | BubbledChange): void;
        Subscribe(path: string, callback: ChangeCallbackType): number;
        Unsubscribe(id: number): void;
        AddGetAccess(path: string): void;
        ReplaceOptimizedGetAccesses(): void;
        PushGetAccessStorage(storage: GetAccessStorage): void;
        GetGetAccessStorage(optimized: false): GetAccessStorage;
        GetGetAccessStorage(optimized: true): Array<GetAccessInfo>;
        PopGetAccessStorage(optimized: false): GetAccessStorage;
        PopGetAccessStorage(optimized: true): Array<GetAccessInfo>;
        PushGetAccessHook(hook: GetAccessHookType): void;
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
        TrapGetAccess(callback: ChangeCallbackType, changeCallback: ChangeCallbackType | true): Map<string, Array<number>>;
        ReportError(value: any, ref?: any): void;
        Warn(value: any, ref?: any): void;
        Log(value: any, ref?: any): void;
    }
    class Evaluator {
        static Evaluate(regionId: string, elementContext: HTMLElement | string, expression: string, useWindow?: boolean): any;
        static GetContextKey(): string;
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
        GetProxies: () => Map<string, ChildProxy>;
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
        GetProxies(): Map<string, ChildProxy>;
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
        GetProxies(): Map<string, ChildProxy>;
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
        static GetHandler(key: string): DirectiveHandlerType;
        static AddBulkHandler(handler: DirectiveHandlerType): void;
        static Handle(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
    }
    interface IfOrEachInfo {
        regionId: string;
        marker: HTMLElement;
        directives: Array<Directive>;
        attributes: Array<string>;
    }
    interface EachOptions {
        isArray: boolean;
        list: Array<HTMLElement> | Map<string, HTMLElement>;
        target: Array<any> | Map<string, any>;
        count: number;
        path: string;
    }
    class CoreDirectiveHandlers {
        static Noop(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Data(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Component(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Post(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Init(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Bind(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Static(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn;
        static Uninit(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Ref(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Attr(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Style(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Class(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Text(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Html(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static TextOrHtml(region: Region, element: HTMLElement, directive: Directive, isHtml: boolean, callback?: () => boolean): DirectiveHandlerReturn;
        static On(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Input(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static LazyInput(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Model(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static InternalInput(region: Region, element: HTMLElement, directive: Directive, preEvaluate: boolean, lazy?: boolean, callback?: () => boolean): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Show(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static If(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Handled | DirectiveHandlerReturn.QuitAll;
        static Each(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static InitIfOrEach(region: Region, element: HTMLElement): IfOrEachInfo;
        static InsertIfOrEach(region: Region, element: HTMLElement, info: IfOrEachInfo, callback?: () => void): void;
        static CreateProxy(getter: (prop: string) => any, contains: Array<string> | ((prop: string) => boolean)): {};
        static Evaluate(region: Region, element: HTMLElement, expression: string, useWindow?: boolean): any;
        static Assign(region: Region, element: HTMLElement, target: string, value: string, callback: () => any): void;
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
        static GetCamelCaseDirectiveName(name: string): string;
    }
    class Bootstrap {
        private static lastRegionId_;
        static Attach(anchors?: Array<string>): void;
    }
}
