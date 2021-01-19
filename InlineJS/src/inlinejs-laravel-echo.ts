namespace InlineJS{
    export class LaravelEchoDirectiveHandlers{
        private static connected_: boolean = null;
        private static connectionError_: any = null;
        private static statusHandlers_ = new Array<(status: boolean) => void>();
        
        private static channels_: Record<string, any> = {};
        public static echo: any = window['Echo'];

        public static TypingBind(region: Region, element: HTMLElement, directive: Directive){
            let state = region.GetLocal(element, '$state', true);
            if (!state){//Initialize state
                ExtendedDirectiveHandlers.ContextState(region, element, true, 500, false, null);
                state = region.GetLocal(element, '$state', false);
                if (!state){
                    return DirectiveHandlerReturn.Nil;
                }
            }

            let info = CoreDirectiveHandlers.Evaluate(region, element, directive.value), channelName: string;
            if (typeof info === 'string'){
                channelName = info;
            }
            else{
                channelName = info.channelName;
            }
            
            if (!channelName){
                return DirectiveHandlerReturn.Nil;
            }
            
            let channel = (Region.GetGlobalValue(region.GetId(), ((Region.IsObject(info) && info.isPresence) ? '$echoPresenceChannel' : '$echoPrivateChannel')) as (name: string) => any)(channelName);
            if (!channel){
                return DirectiveHandlerReturn.Nil;
            }
            
            region.GetState().TrapGetAccess(() => {
                channel.whisper('typing', {
                    state: state.isTyping
                });
            }, true, element);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static On(region: Region, element: HTMLElement, directive: Directive){
            const knownEvents = ['success', 'error', 'status'];
            if (!knownEvents.includes(directive.arg.key)){
                return DirectiveHandlerReturn.Nil;
            }

            let echo = Region.GetGlobalValue(region.GetId(), '$echo');
            if (!echo){
                return DirectiveHandlerReturn.Nil;
            }

            let regionId = region.GetId();
            (echo.status as (handler: (status: boolean) => void) => void)((status) => {
                if (directive.arg.key !== 'status' && status != (directive.arg.key === 'success')){
                    return;
                }
                
                let myRegion = Region.Get(regionId), e = new CustomEvent((status ? 'echo.success' : 'echo.error'), {
                    detail: {
                        status: status,
                        error: (status ? null : echo.error),
                    },
                });

                try{
                    if (myRegion){
                        myRegion.GetState().PushEventContext(e);
                    }

                    CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value, false, e);
                }
                finally{
                    if (myRegion){
                        myRegion.GetState().PopEventContext();
                    }
                }
            });
            
            return DirectiveHandlerReturn.Handled;
        }
        
        public static AddAll(){
            try{
                LaravelEchoDirectiveHandlers.echo.connector.pusher.connection.bind('connected', () => {
                    LaravelEchoDirectiveHandlers.connected_ = true;
                    LaravelEchoDirectiveHandlers.connectionError_ = null;
                    LaravelEchoDirectiveHandlers.statusHandlers_.splice(0).forEach(handler => handler(true));
                });
    
                LaravelEchoDirectiveHandlers.echo.connector.pusher.connection.bind('error', (error: any) => {
                    LaravelEchoDirectiveHandlers.connected_ = false;
                    LaravelEchoDirectiveHandlers.connectionError_ = error;
                    LaravelEchoDirectiveHandlers.statusHandlers_.splice(0).forEach(handler => handler(false));
                });
            }
            catch (err){
                LaravelEchoDirectiveHandlers.connected_ = true;
            }
            
            Region.AddGlobal('$echo', () => {
                if ('meta' in LaravelEchoDirectiveHandlers.channels_){
                    return LaravelEchoDirectiveHandlers.channels_['meta'];
                }

                LaravelEchoDirectiveHandlers.channels_['meta'] = CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === 'status'){
                        return (handler: (status: boolean) => void) => {
                            if (LaravelEchoDirectiveHandlers.connected_ === null){
                                LaravelEchoDirectiveHandlers.statusHandlers_.push(handler);
                            }
                            else{
                                handler(LaravelEchoDirectiveHandlers.connected_);
                            }
                        };
                    }

                    if (prop === 'connect'){
                        return () => {
                            try{
                                LaravelEchoDirectiveHandlers.echo.connector.pusher.connection.connect()
                            }
                            catch (err){}
                        };
                    }

                    if (prop === 'error'){
                        return LaravelEchoDirectiveHandlers.connectionError_;
                    }
                }, ['status', 'connect', 'error']);

                return LaravelEchoDirectiveHandlers.channels_['meta'];
            });
            
            let getChannel = (name: string, getQName: (name?: string) => string, creator: (name?: string) => any, callback?: (prop: string, channel: any) => any, props?: Array<string>, isNotification = false) => {
                let qname = getQName(name);
                if (qname in LaravelEchoDirectiveHandlers.channels_){
                    return LaravelEchoDirectiveHandlers.channels_[qname];
                }

                let channel = creator(name);
                if (!channel){
                    return null;
                }

                let succeeded: boolean = null, statusHandlers = new Array<(status: boolean) => void>();
                channel.listen('.pusher:subscription_succeeded', () => {
                    succeeded = true;
                    statusHandlers.splice(0).forEach(handler => handler(true));
                });

                channel.listen('.pusher:subscription_error', () => {
                    succeeded = false;
                    statusHandlers.splice(0).forEach(handler => handler(false));
                });
                
                LaravelEchoDirectiveHandlers.channels_[qname] = CoreDirectiveHandlers.CreateProxy((prop) => {
                    if (prop === 'channel'){
                        return channel;
                    }
                    
                    if (prop === 'status'){
                        return (handler: (status: boolean) => void) => {
                            if (succeeded === null){
                                statusHandlers.push(handler);
                            }
                            else{
                                handler(succeeded);
                            }
                        };
                    }

                    if (prop === 'listen'){
                        if (isNotification){
                            return (handler: (e: any) => void) => channel.notification(handler);    
                        }

                        return (event: string, handler: (e: any) => void) => channel.listen(event, handler);
                    }

                    if (prop === 'leave'){
                        return () => LaravelEchoDirectiveHandlers.echo.leave(name);
                    }

                    if (callback){
                        return callback(prop, channel);
                    }
                }, ['channel', 'listen', 'leave', ...(props || [])]);

                return LaravelEchoDirectiveHandlers.channels_[qname];
            };

            let privateProps = (prop: string, channel: any) => {
                if (prop === 'whisper'){
                    return (event: string, data: any) => {
                        if (typeof data === 'function'){
                            channel.listenForWhisper(event, data);
                        }
                        else{
                            channel.whisper(event, data);
                        }
                    };
                }
            };
            
            Region.AddGlobal('$echoPublicChannel', () => (name: string) => getChannel(name, () => `public.${name}`, () => LaravelEchoDirectiveHandlers.echo.channel(name)));
            Region.AddGlobal('$echoPrivateChannel', () => (name: string) => getChannel(name, () => `private.${name}`, () => LaravelEchoDirectiveHandlers.echo.private(name), privateProps, ['whisper', 'listenForWhisper']));

            Region.AddGlobal('$echoNotificationChannel', () => (idOrName: string | number) => getChannel(((typeof idOrName === 'number') ? `App.Models.User.${idOrName}` : idOrName),
                (name: string) => `notification.${name}`, (name: string) => LaravelEchoDirectiveHandlers.echo.private(name), null, null, true));

            Region.AddGlobal('$echoPresenceChannel', () => (name: string) => getChannel(name, () => `presence.${name}`, () => LaravelEchoDirectiveHandlers.echo.join(name), (prop: string, channel: any) => {
                if (prop === 'here'){
                    return (handler: (users: any) => void) => channel.here(handler);
                }

                if (prop === 'joining'){
                    return (handler: (user: any) => void) => channel.joining(handler);
                }

                if (prop === 'leaving'){
                    return (handler: (user: any) => void) => channel.leaving(handler);
                }
                
                return privateProps(prop, channel);
            }, ['whisper', 'listenForWhisper', 'here', 'joining', 'leaving']));
            
            DirectiveHandlerManager.AddHandler('echoTypingBind', LaravelEchoDirectiveHandlers.TypingBind);
            DirectiveHandlerManager.AddHandler('echoOn', LaravelEchoDirectiveHandlers.On);
        }
    }

    (function(){
        LaravelEchoDirectiveHandlers.AddAll();
    })();
}
