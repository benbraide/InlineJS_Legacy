declare namespace InlineJS {
    interface StateDirectiveValue {
        isDirty: boolean;
        isTyping: boolean;
        isValid: boolean;
    }
    interface StateDirectiveCount {
        isDirty: number;
        isTyping: number;
        isValid: number;
    }
    interface StateDirectiveInfo {
        value: StateDirectiveValue;
        count: StateDirectiveCount;
        activeCount: number;
        doneInit: boolean;
        setValue: (key: string, value: boolean) => void;
        alert: (key: string) => void;
        resetCallbacks: Array<() => void>;
    }
    interface ExtendedDirectiveHandlerScope {
        id: string;
        path: string;
        callbacks: Record<string, Array<(value?: any) => boolean>>;
    }
    interface RouterOptions {
        urlPrefix?: string;
        titlePrefix?: string;
        titleSuffix?: string;
    }
    interface RouterInfo {
        currentPage: string;
        currentQuery: string;
        pages: Array<RouterPageInfo>;
        url: string;
        targetUrl: string;
        mount: (url: string) => void;
        mountElement: HTMLElement;
        middlewares: Record<string, (page?: string, query?: string) => boolean>;
        active: boolean;
        progress: number;
    }
    interface RouterPageInfo {
        pattern: string | RegExp;
        name: string;
        path: string;
        title: string;
        component: string;
        entry: string;
        exit: string;
        disabled: boolean;
        middlewares: Array<string>;
        uid: number;
    }
    interface AnimatorRange {
        from: number;
        to: number;
    }
    interface CartItem {
        quantity: number;
        price: number;
        product: Record<string, any>;
    }
    interface CartHandlers {
        init?: () => void;
        load?: () => void;
        update?: (sku: string, quantity: number, incremental: boolean, callback: (item: CartItem) => void) => void;
        loadLink?: string;
        updateLink?: string;
        productLink?: string;
        db?: any;
    }
    interface CartInfo {
        items: Array<CartItem>;
        proxies: Array<any>;
        count: number;
        total: number;
    }
    interface DBOptions {
        drop: boolean;
        name: string;
        fields: Record<string, boolean>;
    }
    interface ReporterInfo {
        report: (info: any) => boolean;
        reportServerError: (err: any) => boolean;
        confirm: (info: string | Record<string, any>, confirmed: string | (() => void), canceled?: string | (() => void)) => void;
        prompt: (info: string | Record<string, any>, callback: (response: string | Array<string>) => void) => void;
    }
    interface FormInfo {
        action?: string;
        method?: string;
        errorBag?: Record<string, Array<string>>;
        callback?: (data: any, err?: any) => boolean;
        confirmInfo?: string | Record<string, any>;
    }
    interface Point {
        x: number;
        y: number;
    }
    class ExtendedDirectiveHandlers {
        private static scopeId_;
        private static scopes_;
        static Watch(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static When(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Once(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Mouse(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Input(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static State(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static ContextState(region: Region, element: HTMLElement, lazy: boolean, delay: number, submit: boolean, info: StateDirectiveInfo): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static AttrChange(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static JSONLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static XHRLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static LazyLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Intersection(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Busy(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static ActiveGroup(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Router(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Page(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Screen(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Cart(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static DB(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Auth(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Geolocation(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Reporter(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Overlay(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Form(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static BindForm(region: Region, element: HTMLFormElement, info: FormInfo, directiveOptions: Array<string>, onSubmit?: (after: () => void, info?: FormInfo) => void): DirectiveHandlerReturn;
        static FormSubmit(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Modal(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Counter(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static GetIntersectionOptions(region: Region, element: HTMLElement, expression: string): any;
        static ObserveIntersection(region: Region, element: HTMLElement, options: IntersectionObserverInit, callback: (entry: IntersectionObserverEntry | false) => boolean): boolean;
        static FetchLoad(element: HTMLElement, url: string, append: boolean, onLoad: (unloaded?: boolean) => void, onError: (err: any) => void, onProgress?: (e: ProgressEvent<XMLHttpRequestEventTarget>) => void): void;
        static HandleJsonResponse(response: Response): Promise<any>;
        static HandleTextResponse(response: Response): Promise<string>;
        static Alert(region: Region, prop: string, prefix: ExtendedDirectiveHandlerScope | string, target?: string): void;
        static Report(regionId: string, info: any): boolean;
        static ReportServerError(regionId: string, err: any): boolean;
        static AddScope(prefix: string, elementScope: ElementScope, callbacks: Array<string>): ExtendedDirectiveHandlerScope;
        static BuildGlobal(name: string): void;
        static AddAll(): void;
    }
}
