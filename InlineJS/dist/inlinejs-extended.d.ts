declare namespace InlineJS {
    interface StateDirectiveInfo {
        isDirty: boolean;
        isTyping: boolean;
        isValid: boolean;
    }
    interface StateDirectiveCount {
        isDirty: number;
        isTyping: number;
        isValid: number;
    }
    class ExtendedDirectiveHandlers {
        private static stateId_;
        private static attrChangeId_;
        private static xhrId_;
        private static intObserverId_;
        private static intersectionId_;
        static State(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static AttrChange(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static XHRLoad(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Intersection(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static ObserveIntersection(region: Region, element: HTMLElement, options: IntersectionObserverInit, callback: (entry: IntersectionObserverEntry | false) => boolean): boolean;
        static FetchLoad(element: HTMLElement, url: string, append: boolean, onLoad: () => void): void;
        static AddAll(): void;
    }
}
