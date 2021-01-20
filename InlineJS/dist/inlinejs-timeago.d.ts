declare namespace InlineJS {
    class TimeagoDirectiveHandlers {
        static Timeago(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static AddAll(): void;
    }
}
