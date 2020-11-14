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
    interface RouterInfo {
        currentPage: string;
        currentQuery: string;
        targetComponent: string;
        targetExit: string;
        pages: Record<string, RouterPageInfo>;
        url: string;
        mount: HTMLElement;
        middlewares: Record<string, (page?: string, query?: string) => boolean>;
    }
    interface RouterPageInfo {
        path: string;
        title: string;
        component: string;
        entry: string;
        exit: string;
        disabled: boolean;
        middlewares: Array<string>;
    }
    interface TypewriterInfo {
        list: Array<string>;
        delay: number;
        interval: number;
        iterations: number;
        showDelete: boolean;
        useRandom: boolean;
        showCursor: boolean;
    }
    interface CartItem {
        quantity: number;
        price: number;
        product: Record<string, any>;
    }
    interface CartHandlers {
        init?: () => void;
        load?: (items: Record<string, CartItem>) => void;
        update?: (sku: string, quantity: number, incremental: boolean, callback: (item: CartItem) => void) => void;
        updateLink?: string;
    }
    interface CartInfo {
        items: Record<string, CartItem>;
        itemProxies: Record<string, {}>;
        count: number;
        total: number;
    }
    interface DBOptions {
        drop: boolean;
        name: string;
        fields: Record<string, boolean>;
    }
    class ExtendedDirectiveHandlers {
        private static scopeId_;
        private static scopes_;
        static Watch(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static When(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Once(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Input(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static State(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static ContextState(region: Region, element: HTMLElement, lazy: boolean, delay: number, submit: boolean, info: StateDirectiveInfo): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static AttrChange(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static XHRLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static LazyLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Intersection(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Animate(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Typewriter(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Router(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Screen(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Cart(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static DB(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static GetIntersectionOptions(region: Region, element: HTMLElement, expression: string): any;
        static ObserveIntersection(region: Region, element: HTMLElement, options: IntersectionObserverInit, callback: (entry: IntersectionObserverEntry | false) => boolean): boolean;
        static FetchLoad(element: HTMLElement, url: string, append: boolean, onLoad: () => void): void;
        static AddScope(prefix: string, elementScope: ElementScope, callbacks: Array<string>): ExtendedDirectiveHandlerScope;
        static AddAll(): void;
    }
}
