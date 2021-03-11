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

        public static Channel(region: Region, element: HTMLElement, directive: Directive){
            let channel: any, channelName = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (!channelName && channelName !== 0){
                return DirectiveHandlerReturn.Nil;
            }

            if (directive.arg.key === 'private'){
                channel = LaravelEchoDirectiveHandlers.GetPrivateChannel(channelName);
            }
            else if (directive.arg.key === 'presence'){
                channel = LaravelEchoDirectiveHandlers.GetPresenceChannel(channelName);
            }
            else if (directive.arg.key === 'notification'){
                channel = LaravelEchoDirectiveHandlers.GetNotificationChannel(channelName);
            }
            else{
                channel = LaravelEchoDirectiveHandlers.GetPublicChannel(channelName);
            }

            if (!channel){
                return DirectiveHandlerReturn.Nil;
            }

            let useWindow = directive.arg.options.includes('window'), event = directive.arg.options.includes('event');
            channel.listen(`.${channelName}.event`, (e: any) => {
                (useWindow ? window : element).dispatchEvent(new CustomEvent(e.type, {
                    detail: e.data,
                }));

                (useWindow ? window : element).dispatchEvent(new CustomEvent(channelName, {
                    detail: e,
                }));

                if (event && !useWindow){
                    element.dispatchEvent(new CustomEvent('event', {
                        detail: e,
                    }));
                }
            });

            let elementScope = region.AddElement(element, true);
            elementScope.uninitCallbacks.push(() => {
                channel.leave();
            });

            elementScope.locals['$channel'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop === 'object'){
                    return channel;
                }
                
                if (prop === 'name'){
                    return channelName;
                }
            }, ['object', 'name']);
            
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

            let baseUrl = '/push/notification';
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

                if ('baseUrl' in data){
                    baseUrl = data.baseUrl;
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

            if (baseUrl){//Truncate '/'
                if (baseUrl.endsWith('/')){
                    baseUrl = baseUrl.substr(0, (baseUrl.length - 1));
                }
            }

            let init = (myItems: Array<any>, alert: boolean) => {
                unreadCount = 0;
                items = (myItems || []).map((item) => {
                    if (typeof item.data === 'string'){
                        item.data = JSON.parse(item.data);
                    }
                    
                    if (item.id || item.id === 0){
                        item.data.id = item.id;
                    }

                    if ('type' in item && !('type' in item.data)){
                        item.data.type = (item.type as string).toLowerCase().replace(/[\/\\]+/g, '.');
                    }
    
                    if (!item.data.read){
                        ++unreadCount;
                    }

                    return item.data;
                });

                if (alert){
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);
                    if (unreadCount != 0){
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'unreadCount', scope);
                    }
                }
            };

            let status: boolean = null, unreadCount = 0, hasNew = false, targets: Record<string, (e: any) => boolean> = {}, actionHandlers: Record<string, (e: any) => boolean> = {};
            let scope = ExtendedDirectiveHandlers.AddScope('notifications', region.AddElement(element, true), []), items = new Array<any>(), connected: boolean = null;
            
            if (!initItems && baseUrl){//Load items
                fetch(`${baseUrl}/get`, {
                    method: 'GET',
                    credentials: 'same-origin',
                }).then(ExtendedDirectiveHandlers.HandleJsonResponse).then(data => init(data.items, true)).catch((err) => {
                    ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                });
            }
            else if (initItems){//Initialize
                init(initItems, false);
            }
            
            let listen = () => {
                let channel = LaravelEchoDirectiveHandlers.GetNotificationChannel(idOrName);
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

                        if ('type' in e && !('type' in e.data)){
                            e.data.type = (e.type as string).toLowerCase().replace(/[\/\\]+/g, '.');
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

                        if (e.data.type){
                            window.dispatchEvent(new CustomEvent(`notification.add.${e.data.type}`, {
                                detail: e.data,
                            }));
                        }
                        
                        window.dispatchEvent(new CustomEvent('notification.add', {
                            detail: e.data,
                        }));
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

                        let item = items.splice(index, 1);
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), `${index}.1.0`, `${scope.path}.items.splice`, `${scope.path}.items`);
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                        if (item && item['type']){
                            window.dispatchEvent(new CustomEvent(`notification.remove.${item['type']}`, {
                                detail: item,
                            }));
                        }
                        
                        window.dispatchEvent(new CustomEvent('notification.remove', {
                            detail: item,
                        }));
                    }
                    else if (e.action === 'clear'){
                        if (items.length == 0){
                            return;
                        }
                        
                        items = [];
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'items', scope);

                        if (unreadCount != 0){
                            unreadCount = 0;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'unreadCount', scope);
                        }

                        window.dispatchEvent(new CustomEvent('notification.clear'));
                    }
                    else if (e.action === 'pin'){
                        let item = items.find(item => (item.id === e.data.id));
                        if (item && (!! item.pinned) != (!! e.data.pinned)){
                            item.pinned = !! e.data.pinned;
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'pinned', `${scope.path}.items.${e.data.id}`);

                            if (item['type']){
                                window.dispatchEvent(new CustomEvent(`notification.pin.${item['type']}`, {
                                    detail: item,
                                }));
                            }
                            
                            window.dispatchEvent(new CustomEvent('notification.pin', {
                                detail: item,
                            }));
                        }
                    }
                    else if (e.action === 'markAsRead'){
                        let item = items.find(item => (item.id === e.data.id));
                        if (item && item.read != (e.data.read !== false)){
                            item.read = (e.data.read !== false);
                            unreadCount += ((e.data.read !== false) ? -1 : 1);
                            ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'unreadCount', scope);

                            if (item['type']){
                                window.dispatchEvent(new CustomEvent(`notification.read.${item['type']}`, {
                                    detail: item,
                                }));
                            }
                            
                            window.dispatchEvent(new CustomEvent('notification.read', {
                                detail: item,
                            }));
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

                if (prop === 'markAsRead' || prop === 'remove'){
                    let uri = ((prop === 'markAsRead') ? 'read' : prop);
                    return (id: string) => {
                        if (baseUrl){//Send request
                            fetch(`${baseUrl}/${uri}/${id}`, {
                                method: 'GET',
                                credentials: 'same-origin',
                            }).then(ExtendedDirectiveHandlers.HandleJsonResponse).catch((err) => {
                                ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                            });
                        }
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

                if (prop === 'compile'){
                    return (data: Record<string, any>, intersectionOptions: string | number, index = 0, asHelper = false, closeAction = '') => {
                        return LaravelEchoDirectiveHandlers.CompileNotification(data, intersectionOptions, index, asHelper, closeAction, items);
                    };
                }
            }, ['items', 'unreadCount', 'hasNew', 'status', 'connected', 'compile']);

            Region.AddGlobal('$notifications', () => proxy);
            
            return DirectiveHandlerReturn.Handled;
        }

        public static CompileNotification(data: Record<string, any>, intersectionOptions: string | number, index = 0, asHelper = false, closeAction = '', items = []){
            const iconMap = {
                success: '<i class="material-icons-outlined text-8xl text-green-600 icon">check_circle</i>',
                warning: '<i class="material-icons-outlined text-8xl text-orange-600 icon">report</i>',
                error: '<i class="material-icons-outlined text-8xl text-red-600 icon">dangerous</i>',
                info: '<i class="material-icons-outlined text-8xl text-blue-600 icon">info</i>',
            };
            
            const colorMap = {
                success: 'bg-green-50',
                warning: 'bg-orange-50',
                error: 'bg-red-50',
                info: 'bg-blue-50',
                none: 'bg-white',
            };

            if ('html' in data){
                return data.html;
            }

            let icon: string;
            if ('iconHtml' in data){
                icon = data.iconHtml;
            }
            else{
                icon = iconMap[data.icon || 'info'];
            }

            let bgColor = (data.bgColor || colorMap[data.icon || 'none']), action = '';
            if (('action' in data) && typeof data.action === 'string'){
                action = `${Config.GetDirectiveName('on')}:click="${data.action}"`;
            }

            let intersection = '', readOnVisible = (!('readOnVisible' in data) || data.readOnVisible);
            if (!asHelper && readOnVisible && typeof intersectionOptions === 'string'){
                intersection = `${Config.GetDirectiveName('intersection')}="${intersectionOptions}"`;
            }
            else if (!asHelper && readOnVisible && typeof intersectionOptions === 'number'){
                intersection = `${Config.GetDirectiveName('intersection')}="{ threshold: 0.9, root: $getAncestor(${intersectionOptions}) }"`;
            }

            if (intersection){
                intersection += ` ${Config.GetDirectiveName('on')}:intersection-visible.join.once="$notifications.markAsRead('${data.id}')"`;
            }

            let extraClasses = (action ? 'cursor-pointer inlinejs-notification-item action' : 'inlinejs-notification-item'), closeIcon = '';
            if (asHelper){
                closeIcon = `
                    <div class="absolute top-2 right-4 flex justify-start items-center bg-transparent remove">
                        <i class="material-icons-outlined text-xl text-red-800 leading-none cursor-pointer"
                            ${Config.GetDirectiveName('on')}:click.stop="${closeAction || '$scope.show = false'}">close</i>
                    </div>
                `;
            }
            else{
                closeIcon = `
                    <div class="absolute top-2 right-4 flex justify-start items-center bg-transparent remove">
                        <i class="material-icons-outlined text-xl text-red-800 leading-none cursor-pointer"
                            ${Config.GetDirectiveName('on')}:click.stop="$notifications.remove('${data.id}')">delete</i>
                    </div>
                `;
            }
            
            let borderClass = ((!asHelper && index != 0 && items.length > 1) ? 'border-t' : '');
            if ('bodyHtml' in data){
                return `
                    <div class="relative w-full flex justify-start items-start py-1 ${borderClass} ${bgColor} ${extraClasses}" ${action} ${intersection}>
                        ${icon}
                        ${data.bodyHtml}
                        ${closeIcon}
                    </div>
                `;
            }

            let body: string;
            if (!('body' in data)){
                let title = (data.titleHtml || `<h3 class="pr-4 text-lg font-bold title">${data.title || 'Untitled'}</h3>`);
                let text = (data.textHtml || `<p class="mt-1 leading-tight text">${data.text || 'Notification has no content.'}</p>`);
                
                body = `
                    ${title}
                    ${text}
                `;
            }
            else{
                body = data.body;
            }

            let bodyHtml = '';
            if (asHelper){
                bodyHtml = `
                    <div class="flex flex-col justify-start items-start py-2 pl-2 pr-4 body">
                        ${body}
                        <span class="mt-1.5 text-xs timestamp" x-timeago.caps="Date.now()" x-text="$timeago.label"></span>
                    </div>
                `;
            }
            else{
                bodyHtml = `
                    <div class="flex flex-col justify-start items-start py-2 pl-2 pr-4 body">
                        ${body}
                        <span class="mt-1.5 text-xs timestamp" x-timeago.caps="item.timestamp || Date.now()" x-text="$timeago.label"></span>
                    </div>
                `;
            }

            return `
                <div class="relative w-full flex justify-start items-start py-1 ${borderClass} ${bgColor} ${extraClasses}" ${action} ${intersection}>
                    ${icon}
                    ${bodyHtml}
                    ${closeIcon}
                </div>
            `;
        }

        public static GetPublicChannel(name: string){
            return LaravelEchoDirectiveHandlers.GetChannel(name, () => `public.${name}`, () => LaravelEchoDirectiveHandlers.echo.channel(name));
        }

        public static GetPrivateChannel(name: string){
            return LaravelEchoDirectiveHandlers.GetChannel(name, () => `private.${name}`, () => LaravelEchoDirectiveHandlers.echo.private(name),
                LaravelEchoDirectiveHandlers.GetPrivateProps, ['whisper', 'listenForWhisper']);
        }

        public static GetPresenceChannel(name: string){
            return LaravelEchoDirectiveHandlers.GetChannel(name, () => `presence.${name}`, () => LaravelEchoDirectiveHandlers.echo.join(name), (prop: string, channel: any) => {
                if (prop === 'here'){
                    return (handler: (users: any) => void) => channel.here(handler);
                }

                if (prop === 'joining'){
                    return (handler: (user: any) => void) => channel.joining(handler);
                }

                if (prop === 'leaving'){
                    return (handler: (user: any) => void) => channel.leaving(handler);
                }
                
                return LaravelEchoDirectiveHandlers.GetPrivateProps(prop, channel);
            }, ['whisper', 'listenForWhisper', 'here', 'joining', 'leaving']);
        }

        public static GetNotificationChannel(idOrName: string | number){
            let name = ((typeof idOrName === 'number') ? `App.Models.User.${idOrName}` : idOrName);
            return LaravelEchoDirectiveHandlers.GetChannel(name, () => `notification.${name}`, () => LaravelEchoDirectiveHandlers.echo.private(name), null, null, true);
        }

        public static GetChannel(name: string, getQName: (name?: string) => string, creator: (name?: string) => any, callback?: (prop: string, channel: any) => any, props?: Array<string>, isNotification = false){
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
                if (prop === 'name'){
                    return qname;
                }
                
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
            }, ['name', 'channel', 'listen', 'leave', ...(props || [])]);

            return LaravelEchoDirectiveHandlers.channels_[qname];
        }

        public static GetPrivateProps(prop: string, channel: any){
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
            
            if (!Region.GetGlobal(null, '$echo')){
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
            }
            
            Region.AddGlobal('$compileNotification', () => LaravelEchoDirectiveHandlers.CompileNotification);
            Region.AddGlobal('$echoPublicChannel', () => LaravelEchoDirectiveHandlers.GetPublicChannel);
            Region.AddGlobal('$echoPrivateChannel', () => LaravelEchoDirectiveHandlers.GetPrivateChannel);
            Region.AddGlobal('$echoPresenceChannel', () => LaravelEchoDirectiveHandlers.GetPresenceChannel);
            Region.AddGlobal('$echoNotificationChannel', () => LaravelEchoDirectiveHandlers.GetNotificationChannel);
            
            DirectiveHandlerManager.AddHandler('echoTypingBind', LaravelEchoDirectiveHandlers.TypingBind);
            DirectiveHandlerManager.AddHandler('echoOn', LaravelEchoDirectiveHandlers.On);
            DirectiveHandlerManager.AddHandler('channel', LaravelEchoDirectiveHandlers.Channel);
            DirectiveHandlerManager.AddHandler('notifications', LaravelEchoDirectiveHandlers.Notifications);

            ExtendedDirectiveHandlers.BuildGlobal('channel');
        }
    }

    (function(){
        LaravelEchoDirectiveHandlers.AddAll();
    })();
}
