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
        alert: (key: string) => void;
        resetCallbacks: Array<() => void>;
    }
    class ExtendedDirectiveHandlers {
        private static stateId_;
        private static attrChangeId_;
        private static xhrId_;
        private static intObserverId_;
        private static intersectionId_;
        static State(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static ContextState(region: Region, element: HTMLElement, lazy: boolean, delay: number, info: StateDirectiveInfo): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static AttrChange(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static XHRLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static LazyLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Intersection(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static GetIntersectionOptions(region: Region, element: HTMLElement, expression: string): any;
        static ObserveIntersection(region: Region, element: HTMLElement, options: IntersectionObserverInit, callback: (entry: IntersectionObserverEntry | false) => boolean): boolean;
        static FetchLoad(element: HTMLElement, url: string, append: boolean, onLoad: () => void): void;
        static AddAll(): void;
    }
}
