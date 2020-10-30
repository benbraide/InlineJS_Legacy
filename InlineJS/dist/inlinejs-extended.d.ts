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
        callbacks: Map<string, Array<(value?: any) => boolean>>;
    }
    class ExtendedDirectiveHandlers {
        private static scopeId_;
        private static scopes_;
        static Watch(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static When(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Once(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static State(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static ContextState(region: Region, element: HTMLElement, lazy: boolean, delay: number, info: StateDirectiveInfo): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static AttrChange(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static XHRLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static LazyLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Intersection(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Animate(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static GetIntersectionOptions(region: Region, element: HTMLElement, expression: string): any;
        static ObserveIntersection(region: Region, element: HTMLElement, options: IntersectionObserverInit, callback: (entry: IntersectionObserverEntry | false) => boolean): boolean;
        static FetchLoad(element: HTMLElement, url: string, append: boolean, onLoad: () => void): void;
        static AddScope(prefix: string, elementScope: ElementScope, callbacks: Array<string>): ExtendedDirectiveHandlerScope;
        static AddAll(): void;
    }
}
