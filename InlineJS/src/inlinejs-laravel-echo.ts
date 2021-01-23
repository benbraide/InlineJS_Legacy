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

        public static Notifications(region: Region, element: HTMLElement, directive: Directive){
            let regionId = region.GetId();
            if (Region.GetGlobal(regionId, '$notifications')){
                return DirectiveHandlerReturn.Nil;
            }

            let echo = Region.GetGlobalValue(regionId, '$echo');
            if (!echo){
                return DirectiveHandlerReturn.Nil;
            }

            let channelCreator = Region.GetGlobalValue(regionId, '$echoNotificationChannel');
            if (!channelCreator){
                return DirectiveHandlerReturn.Nil;
            }

            let data = CoreDirectiveHandlers.Evaluate(region, element, directive.value), idOrName: number | string = null, initItems: Array<any> = null;
            if (Array.isArray(data)){
                initItems = data;
            }
            else if (Region.IsObject(data)){
                if ('name' in data){
                    idOrName = (data.name as string);
                }
                else if ('id' in data){
                    idOrName = (data.id as number);
                }

                if ('items' in data){
                    initItems = (data.items as Array<any>);
                }
            }
            else if (typeof data === 'string' || typeof data === 'number'){
                idOrName = data;
            }

            if (!idOrName){
                let auth = Region.GetGlobalValue(null, '$auth');
                if (!auth){
                    return DirectiveHandlerReturn.Nil;
                }

                idOrName = auth.getField('id');
                if (!idOrName){
                    return DirectiveHandlerReturn.Handled;
                }
            }

            let status: boolean = null, unreadCount = 0, hasNew = false, targets: Record<string, (e: any) => boolean> = {}, actionHandlers: Record<string, (e: any) => boolean> = {};
            let scope = ExtendedDirectiveHandlers.AddScope('notifications', region.AddElement(element, true), []), items = new Array<any>(), connected: boolean = null;
            
            (initItems || []).forEach((item) => {
                if (typeof item.data === 'string'){
                    item.data = JSON.parse(item.data);
                }
                
                if (item.id || item.id === 0){
                    item.data.id = item.id;
                }

                items.push(item.data);
                if (!item.data.read){
                    ++unreadCount;
                }
            });

            let listen = () => {
                let channel = channelCreator(idOrName);
                if (!channel){
                    return;
                }

                channel.status((myStatus: boolean) => {
                    if (myStatus !== status){
                        status = myStatus;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'status', scope);
                    }
                });

                channel.listen((e: any) => {
                    if (!Region.IsObject(e)){
                        return;
                    }

                    if ('target' in e && e.target in targets && targets[e.target](e)){
                        return;
                    }

                    if (!('action' in e)){
                        return;
                    }

                    if (e.action in actionHandlers && actionHandlers[e.action](e)){
                        return;
                    }

                    if (e.action === 'add'){
                        if (e.id || e.id === 0){
                            e.data.id = e.id;
                        }

                        if (!e.data.read){
                            ++unreadCount;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'unreadCount', scope);
                        }

                        items.unshift(e.data);
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), '1', `${scope.path}.items.unshift`, `${scope.path}.items`);
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);
                        
                        hasNew = true;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'hasNew', scope);

                        InlineJS.Region.GetGlobalValue(regionId, '$nextTick')(() => {
                            hasNew = false;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'hasNew', scope);
                        });
                    }
                    else if (e.action === 'remove'){
                        let index = items.findIndex(item => (item.id === e.data.id));
                        if (items.length <= index){
                            return;
                        }

                        if (!items[index].read){
                            --unreadCount;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'unreadCount', scope);
                        }

                        items.splice(index, 1);
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `${index}.1.0`, `${scope.path}.items.splice`, `${scope.path}.items`);
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);
                    }
                    else if (e.action === 'clear'){
                        items = [];
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                        if (unreadCount != 0){
                            unreadCount = 0;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'unreadCount', scope);
                        }
                    }
                    else if (e.action === 'pin'){
                        let item = items.find(item => (item.id === e.data.id));
                        if (item && (!! item.pinned) != (!! e.data.pinned)){
                            item.pinned = !! e.data.pinned;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'pinned', `${scope.path}.items.${e.data.id}`);
                        }
                    }
                    else if (e.action === 'markAsRead'){
                        let item = items.find(item => (item.id === e.data.id));
                        if (item && item.read != (e.data.read !== false)){
                            item.read = (e.data.read !== false);
                            unreadCount += ((e.data.read !== false) ? -1 : 1);
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'unreadCount', scope);
                        }
                    }
                });
            };
            
            (echo.status as (handler: (status: boolean) => void) => void)((outerStatus) => {
                if (outerStatus !== connected){
                    connected = outerStatus;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'connected', scope);
                }

                if (outerStatus){
                    listen();
                }
            });

            let itemsProxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'length'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items.${prop}`);
                    return items.length;
                }

                if (prop === '__InlineJS_Target__'){
                    return items;
                }

                if (prop === '__InlineJS_Path__'){
                    return `${scope.path}.items`;
                }

                return items[prop];
            }, ['__InlineJS_Target__', '__InlineJS_Path__'], null, []);

            let proxy = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'items'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return itemsProxy;
                }

                if (prop === 'unreadCount'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return unreadCount;
                }

                if (prop === 'hasNew'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return hasNew;
                }

                if (prop === 'status'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return status;
                }

                if (prop === 'connected'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return connected;
                }

                if (prop === 'isPinned'){
                    return (id: string) => {
                        let item = items.find(item => (item.id === id));
                        if (item){
                            Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.items.${id}.pinned`);
                            return !! item.pinned;
                        }

                        return false;
                    };
                }

                if (prop === 'addTargetHandler'){
                    return (target: string, handler: (e: any) => boolean) => {
                        targets[target] = handler;
                    }
                }

                if (prop === 'removeTargetHandler'){
                    return (target: string, handler?: (e: any) => boolean) => {
                        if (!handler || targets[target] === handler){
                            delete targets[target];
                        }
                    }
                }

                if (prop === 'addActiontHandler'){
                    return (action: string, handler: (e: any) => boolean) => {
                        actionHandlers[action] = handler;
                    }
                }

                if (prop === 'removeActionHandler'){
                    return (action: string, handler?: (e: any) => boolean) => {
                        if (!handler || actionHandlers[action] === handler){
                            delete actionHandlers[action];
                        }
                    }
                }

                if (prop === 'connect'){
                    return () => {
                        if (connected === false){
                            connected = null;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'connected', scope);
                            echo.connect();
                        }
                    }
                }

                if (prop === 'listen'){
                    return () => {
                        if (connected && status === false){
                            status = null;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'status', scope);
                            listen();
                        }
                    }
                }
            }, ['items', 'unreadCount', 'hasNew', 'status', 'connected']);

            Region.AddGlobal('$notifications', () => proxy);
            
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
                                LaravelEchoDirectiveHandlers.echo.connector.pusher.connection.connect();
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
            DirectiveHandlerManager.AddHandler('notifications', LaravelEchoDirectiveHandlers.Notifications);
        }
    }

    (function(){
        LaravelEchoDirectiveHandlers.AddAll();
    })();
}
