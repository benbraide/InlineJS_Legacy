declare namespace InlineJS {
    class LaravelEchoDirectiveHandlers {
        private static connected_;
        private static connectionError_;
        private static statusHandlers_;
        private static channels_;
        static echo: any;
        static TypingBind(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static On(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static AddAll(): void;
    }
}
