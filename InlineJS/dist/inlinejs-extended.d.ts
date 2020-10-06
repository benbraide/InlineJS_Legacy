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
        static State(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static AddAll(): void;
    }
}
