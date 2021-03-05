declare namespace InlineJS {
    class LaravelEchoDirectiveHandlers {
        private static connected_;
        private static connectionError_;
        private static statusHandlers_;
        private static channels_;
        static echo: any;
        static TypingBind(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static On(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Channel(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Notifications(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static GetPublicChannel(name: string): any;
        static GetPrivateChannel(name: string): any;
        static GetPresenceChannel(name: string): any;
        static GetNotificationChannel(idOrName: string | number): any;
        static GetChannel(name: string, getQName: (name?: string) => string, creator: (name?: string) => any, callback?: (prop: string, channel: any) => any, props?: Array<string>, isNotification?: boolean): any;
        static GetPrivateProps(prop: string, channel: any): (event: string, data: any) => void;
        static AddAll(): void;
    }
}
