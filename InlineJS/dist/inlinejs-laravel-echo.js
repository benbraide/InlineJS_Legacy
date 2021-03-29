"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var InlineJS;
(function (InlineJS) {
    var LaravelEchoDirectiveHandlers = /** @class */ (function () {
        function LaravelEchoDirectiveHandlers() {
        }
        LaravelEchoDirectiveHandlers.TypingBind = function (region, element, directive) {
            var state = region.GetLocal(element, '$state', true);
            if (!state) { //Initialize state
                InlineJS.ExtendedDirectiveHandlers.ContextState(region, element, true, 500, false, null);
                state = region.GetLocal(element, '$state', false);
                if (!state) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
            }
            var info = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), channelName;
            if (typeof info === 'string') {
                channelName = info;
            }
            else {
                channelName = info.channelName;
            }
            if (!channelName) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var channel = InlineJS.Region.GetGlobalValue(region.GetId(), ((InlineJS.Region.IsObject(info) && info.isPresence) ? '$echoPresenceChannel' : '$echoPrivateChannel'))(channelName);
            if (!channel) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            region.GetState().TrapGetAccess(function () {
                channel.whisper('typing', {
                    state: state.isTyping
                });
            }, true, element);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        LaravelEchoDirectiveHandlers.On = function (region, element, directive) {
            var knownEvents = ['success', 'error', 'status'];
            if (!knownEvents.includes(directive.arg.key)) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var echo = InlineJS.Region.GetGlobalValue(region.GetId(), '$echo');
            if (!echo) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var regionId = region.GetId();
            echo.status(function (status) {
                if (directive.arg.key !== 'status' && status != (directive.arg.key === 'success')) {
                    return;
                }
                var myRegion = InlineJS.Region.Get(regionId), e = new CustomEvent((status ? 'echo.success' : 'echo.error'), {
                    detail: {
                        status: status,
                        error: (status ? null : echo.error)
                    }
                });
                try {
                    if (myRegion) {
                        myRegion.GetState().PushEventContext(e);
                    }
                    InlineJS.CoreDirectiveHandlers.Evaluate(myRegion, element, directive.value, false, e);
                }
                finally {
                    if (myRegion) {
                        myRegion.GetState().PopEventContext();
                    }
                }
            });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        LaravelEchoDirectiveHandlers.Channel = function (region, element, directive) {
            var channel, channelName = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (!channelName && channelName !== 0) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            if (directive.arg.key === 'private') {
                channel = LaravelEchoDirectiveHandlers.GetPrivateChannel(channelName);
            }
            else if (directive.arg.key === 'presence') {
                channel = LaravelEchoDirectiveHandlers.GetPresenceChannel(channelName);
            }
            else if (directive.arg.key === 'notification') {
                channel = LaravelEchoDirectiveHandlers.GetNotificationChannel(channelName);
            }
            else {
                channel = LaravelEchoDirectiveHandlers.GetPublicChannel(channelName);
            }
            if (!channel) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var useWindow = directive.arg.options.includes('window'), event = directive.arg.options.includes('event');
            channel.listen("." + channelName + ".event", function (e) {
                (useWindow ? window : element).dispatchEvent(new CustomEvent(e.type, {
                    detail: e.data
                }));
                (useWindow ? window : element).dispatchEvent(new CustomEvent(channelName, {
                    detail: e
                }));
                if (event && !useWindow) {
                    element.dispatchEvent(new CustomEvent('event', {
                        detail: e
                    }));
                }
            });
            var elementScope = region.AddElement(element, true);
            elementScope.uninitCallbacks.push(function () {
                channel.leave();
            });
            elementScope.locals['$channel'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'object') {
                    return channel;
                }
                if (prop === 'name') {
                    return channelName;
                }
            }, ['object', 'name']);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        LaravelEchoDirectiveHandlers.Notifications = function (region, element, directive) {
            var regionId = region.GetId();
            if (InlineJS.Region.GetGlobal(regionId, '$notifications')) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var echo = InlineJS.Region.GetGlobalValue(regionId, '$echo');
            if (!echo) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var baseUrl = '/push/notification';
            var data = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value), idOrName = null, initItems = null;
            if (Array.isArray(data)) {
                initItems = data;
            }
            else if (InlineJS.Region.IsObject(data)) {
                if ('name' in data) {
                    idOrName = data.name;
                }
                else if ('id' in data) {
                    idOrName = data.id;
                }
                if ('items' in data) {
                    initItems = data.items;
                }
                if ('baseUrl' in data) {
                    baseUrl = data.baseUrl;
                }
            }
            else if (typeof data === 'string' || typeof data === 'number') {
                idOrName = data;
            }
            if (!idOrName) {
                var auth = InlineJS.Region.GetGlobalValue(null, '$auth');
                if (!auth) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                idOrName = auth.getField('id');
                if (!idOrName) {
                    return InlineJS.DirectiveHandlerReturn.Handled;
                }
            }
            if (baseUrl) { //Truncate '/'
                if (baseUrl.endsWith('/')) {
                    baseUrl = baseUrl.substr(0, (baseUrl.length - 1));
                }
            }
            var init = function (myItems, alert) {
                unreadCount = 0;
                items = (myItems || []).map(function (item) {
                    if (typeof item.data === 'string') {
                        item.data = JSON.parse(item.data);
                    }
                    if (item.id || item.id === 0) {
                        item.data.id = item.id;
                    }
                    if ('type' in item && !('type' in item.data)) {
                        item.data.type = item.type.toLowerCase().replace(/[\/\\]+/g, '.');
                    }
                    if (!item.data.read) {
                        ++unreadCount;
                    }
                    return item.data;
                });
                if (alert) {
                    InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                    if (unreadCount != 0) {
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'unreadCount', scope);
                    }
                }
            };
            var status = null, unreadCount = 0, hasNew = false, targets = {}, actionHandlers = {};
            var scope = InlineJS.ExtendedDirectiveHandlers.AddScope('notifications', region.AddElement(element, true), []), items = new Array(), connected = null;
            if (!initItems && baseUrl) { //Load items
                fetch(baseUrl + "/get", {
                    method: 'GET',
                    credentials: 'same-origin'
                }).then(InlineJS.ExtendedDirectiveHandlers.HandleJsonResponse).then(function (data) { return init(data.items, true); })["catch"](function (err) {
                    InlineJS.ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                });
            }
            else if (initItems) { //Initialize
                init(initItems, false);
            }
            var listen = function () {
                var channel = LaravelEchoDirectiveHandlers.GetNotificationChannel(idOrName);
                if (!channel) {
                    return;
                }
                channel.status(function (myStatus) {
                    if (myStatus !== status) {
                        status = myStatus;
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'status', scope);
                    }
                });
                channel.listen(function (e) {
                    if (!InlineJS.Region.IsObject(e)) {
                        return;
                    }
                    if ('target' in e && e.target in targets && targets[e.target](e)) {
                        return;
                    }
                    if (!('action' in e)) {
                        return;
                    }
                    if (e.action in actionHandlers && actionHandlers[e.action](e)) {
                        return;
                    }
                    if (e.action === 'add') {
                        if (e.id || e.id === 0) {
                            e.data.id = e.id;
                        }
                        if ('type' in e && !('type' in e.data)) {
                            e.data.type = e.type.toLowerCase().replace(/[\/\\]+/g, '.');
                        }
                        if (!e.data.read) {
                            ++unreadCount;
                            InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'unreadCount', scope);
                        }
                        items.unshift(e.data);
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), '1', scope.path + ".items.unshift", scope.path + ".items");
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                        hasNew = true;
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'hasNew', scope);
                        InlineJS.Region.GetGlobalValue(regionId, '$nextTick')(function () {
                            hasNew = false;
                            InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'hasNew', scope);
                        });
                        if (e.data.type) {
                            window.dispatchEvent(new CustomEvent("notification.add." + e.data.type, {
                                detail: e.data
                            }));
                        }
                        window.dispatchEvent(new CustomEvent('notification.add', {
                            detail: e.data
                        }));
                    }
                    else if (e.action === 'remove') {
                        var index = items.findIndex(function (item) { return (item.id === e.data.id); });
                        if (items.length <= index) {
                            return;
                        }
                        if (!items[index].read) {
                            --unreadCount;
                            InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'unreadCount', scope);
                        }
                        var item = items.splice(index, 1);
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), index + ".1.0", scope.path + ".items.splice", scope.path + ".items");
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                        if (item && item['type']) {
                            window.dispatchEvent(new CustomEvent("notification.remove." + item['type'], {
                                detail: item
                            }));
                        }
                        window.dispatchEvent(new CustomEvent('notification.remove', {
                            detail: item
                        }));
                    }
                    else if (e.action === 'clear') {
                        if (items.length == 0) {
                            return;
                        }
                        items = [];
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'items', scope);
                        if (unreadCount != 0) {
                            unreadCount = 0;
                            InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'unreadCount', scope);
                        }
                        window.dispatchEvent(new CustomEvent('notification.clear'));
                    }
                    else if (e.action === 'pin') {
                        var item = items.find(function (item) { return (item.id === e.data.id); });
                        if (item && (!!item.pinned) != (!!e.data.pinned)) {
                            item.pinned = !!e.data.pinned;
                            InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'pinned', scope.path + ".items." + e.data.id);
                            if (item['type']) {
                                window.dispatchEvent(new CustomEvent("notification.pin." + item['type'], {
                                    detail: item
                                }));
                            }
                            window.dispatchEvent(new CustomEvent('notification.pin', {
                                detail: item
                            }));
                        }
                    }
                    else if (e.action === 'markAsRead') {
                        var item = items.find(function (item) { return (item.id === e.data.id); });
                        if (item && item.read != (e.data.read !== false)) {
                            item.read = (e.data.read !== false);
                            unreadCount += ((e.data.read !== false) ? -1 : 1);
                            InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'unreadCount', scope);
                            if (item['type']) {
                                window.dispatchEvent(new CustomEvent("notification.read." + item['type'], {
                                    detail: item
                                }));
                            }
                            window.dispatchEvent(new CustomEvent('notification.read', {
                                detail: item
                            }));
                        }
                    }
                });
            };
            echo.status(function (outerStatus) {
                if (outerStatus !== connected) {
                    connected = outerStatus;
                    InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'connected', scope);
                }
                if (outerStatus) {
                    listen();
                }
            });
            var itemsProxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'length') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items." + prop);
                    return items.length;
                }
                if (prop === '__InlineJS_Target__') {
                    return items;
                }
                if (prop === '__InlineJS_Path__') {
                    return scope.path + ".items";
                }
                return items[prop];
            }, ['__InlineJS_Target__', '__InlineJS_Path__'], null, []);
            var proxy = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'items') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return itemsProxy;
                }
                if (prop === 'unreadCount') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return unreadCount;
                }
                if (prop === 'hasNew') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return hasNew;
                }
                if (prop === 'status') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return status;
                }
                if (prop === 'connected') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return connected;
                }
                if (prop === 'isPinned') {
                    return function (id) {
                        var item = items.find(function (item) { return (item.id === id); });
                        if (item) {
                            InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + ".items." + id + ".pinned");
                            return !!item.pinned;
                        }
                        return false;
                    };
                }
                if (prop === 'markAsRead' || prop === 'remove') {
                    var uri_1 = ((prop === 'markAsRead') ? 'read' : prop);
                    return function (id) {
                        if (baseUrl) { //Send request
                            fetch(baseUrl + "/" + uri_1 + "/" + id, {
                                method: 'GET',
                                credentials: 'same-origin'
                            }).then(InlineJS.ExtendedDirectiveHandlers.HandleJsonResponse)["catch"](function (err) {
                                InlineJS.ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                            });
                        }
                    };
                }
                if (prop === 'clear') {
                    return function () {
                        if (baseUrl) { //Send request
                            fetch(baseUrl + "/" + prop, {
                                method: 'GET',
                                credentials: 'same-origin'
                            }).then(InlineJS.ExtendedDirectiveHandlers.HandleJsonResponse)["catch"](function (err) {
                                InlineJS.ExtendedDirectiveHandlers.ReportServerError(regionId, err);
                            });
                        }
                    };
                }
                if (prop === 'addTargetHandler') {
                    return function (target, handler) {
                        targets[target] = handler;
                    };
                }
                if (prop === 'removeTargetHandler') {
                    return function (target, handler) {
                        if (!handler || targets[target] === handler) {
                            delete targets[target];
                        }
                    };
                }
                if (prop === 'addActiontHandler') {
                    return function (action, handler) {
                        actionHandlers[action] = handler;
                    };
                }
                if (prop === 'removeActionHandler') {
                    return function (action, handler) {
                        if (!handler || actionHandlers[action] === handler) {
                            delete actionHandlers[action];
                        }
                    };
                }
                if (prop === 'connect') {
                    return function () {
                        if (connected === false) {
                            connected = null;
                            InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'connected', scope);
                            echo.connect();
                        }
                    };
                }
                if (prop === 'listen') {
                    return function () {
                        if (connected && status === false) {
                            status = null;
                            InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'status', scope);
                            listen();
                        }
                    };
                }
                if (prop === 'compile') {
                    return function (data, intersectionOptions, index, asHelper, closeAction) {
                        if (index === void 0) { index = 0; }
                        if (asHelper === void 0) { asHelper = false; }
                        if (closeAction === void 0) { closeAction = ''; }
                        return LaravelEchoDirectiveHandlers.CompileNotification(data, intersectionOptions, index, asHelper, closeAction, items);
                    };
                }
            }, ['items', 'unreadCount', 'hasNew', 'status', 'connected', 'compile']);
            InlineJS.Region.AddGlobal('$notifications', function () { return proxy; });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        LaravelEchoDirectiveHandlers.CompileNotification = function (data, intersectionOptions, index, asHelper, closeAction, items) {
            if (index === void 0) { index = 0; }
            if (asHelper === void 0) { asHelper = false; }
            if (closeAction === void 0) { closeAction = ''; }
            if (items === void 0) { items = []; }
            var iconMap = {
                success: '<i class="material-icons-outlined text-8xl text-green-600 icon">check_circle</i>',
                warning: '<i class="material-icons-outlined text-8xl text-orange-600 icon">report</i>',
                error: '<i class="material-icons-outlined text-8xl text-red-600 icon">dangerous</i>',
                info: '<i class="material-icons-outlined text-8xl text-blue-600 icon">info</i>'
            };
            var colorMap = {
                success: 'bg-green-50',
                warning: 'bg-orange-50',
                error: 'bg-red-50',
                info: 'bg-blue-50',
                none: 'bg-white'
            };
            if ('html' in data) {
                return data.html;
            }
            var icon;
            if ('iconHtml' in data) {
                icon = data.iconHtml;
            }
            else {
                icon = iconMap[data.icon || 'info'];
            }
            var bgColor = (data.bgColor || colorMap[data.icon || 'none']), action = '';
            if (('action' in data) && typeof data.action === 'string') {
                action = InlineJS.Config.GetDirectiveName('on') + ":click=\"" + data.action + "\"";
            }
            var intersection = '', readOnVisible = (!('readOnVisible' in data) || data.readOnVisible);
            if (!asHelper && readOnVisible && typeof intersectionOptions === 'string') {
                intersection = InlineJS.Config.GetDirectiveName('intersection') + "=\"" + intersectionOptions + "\"";
            }
            else if (!asHelper && readOnVisible && typeof intersectionOptions === 'number') {
                intersection = InlineJS.Config.GetDirectiveName('intersection') + "=\"{ threshold: 0.9, root: $getAncestor(" + intersectionOptions + ") }\"";
            }
            if (intersection) {
                intersection += " " + InlineJS.Config.GetDirectiveName('on') + ":intersection-visible.join.once=\"$notifications.markAsRead('" + data.id + "')\"";
            }
            var extraClasses = (action ? 'cursor-pointer inlinejs-notification-item action' : 'inlinejs-notification-item'), closeIcon = '';
            if (asHelper) {
                closeIcon = "\n                    <div class=\"absolute top-2 right-4 flex justify-start items-center bg-transparent remove\">\n                        <i class=\"material-icons-outlined text-xl text-red-800 leading-none cursor-pointer\"\n                            " + InlineJS.Config.GetDirectiveName('on') + ":click.stop=\"" + (closeAction || '$scope.show = false') + "\">close</i>\n                    </div>\n                ";
            }
            else {
                closeIcon = "\n                    <div class=\"absolute top-2 right-4 flex justify-start items-center bg-transparent remove\">\n                        <i class=\"material-icons-outlined text-xl text-red-800 leading-none cursor-pointer\"\n                            " + InlineJS.Config.GetDirectiveName('on') + ":click.stop=\"$notifications.remove('" + data.id + "')\">close</i>\n                    </div>\n                ";
            }
            var borderClass = ((!asHelper && index != 0 && items.length > 1) ? 'border-t' : '');
            if ('bodyHtml' in data) {
                return "\n                    <div class=\"relative w-full flex justify-start items-start pl-2 py-1 " + borderClass + " " + bgColor + " " + extraClasses + "\" " + action + " " + intersection + ">\n                        " + icon + "\n                        " + data.bodyHtml + "\n                        " + closeIcon + "\n                    </div>\n                ";
            }
            var body;
            if (!('body' in data)) {
                var title = (data.titleHtml || "<h3 class=\"pr-4 text-lg font-bold title\">" + (data.title || 'Untitled') + "</h3>");
                var text = (data.textHtml || "<p class=\"mt-1 leading-tight text\">" + (data.text || 'Notification has no content.') + "</p>");
                body = "\n                    " + title + "\n                    " + text + "\n                ";
            }
            else {
                body = data.body;
            }
            var bodyHtml = '';
            if (asHelper) {
                bodyHtml = "\n                    <div class=\"flex flex-col justify-start items-start py-2 pl-2 pr-4 body\">\n                        " + body + "\n                        <span class=\"mt-1.5 text-xs timestamp\" x-timeago.caps=\"Date.now()\" x-text=\"$timeago.label\"></span>\n                    </div>\n                ";
            }
            else {
                bodyHtml = "\n                    <div class=\"flex flex-col justify-start items-start py-2 pl-2 pr-4 body\">\n                        " + body + "\n                        <span class=\"mt-1.5 text-xs timestamp\" x-timeago.caps=\"item.timestamp || Date.now()\" x-text=\"$timeago.label\"></span>\n                    </div>\n                ";
            }
            return "\n                <div class=\"relative w-full flex justify-start items-start pl-2 py-1 " + borderClass + " " + bgColor + " " + extraClasses + "\" " + action + " " + intersection + ">\n                    " + icon + "\n                    " + bodyHtml + "\n                    " + closeIcon + "\n                </div>\n            ";
        };
        LaravelEchoDirectiveHandlers.GetPublicChannel = function (name) {
            return LaravelEchoDirectiveHandlers.GetChannel(name, function () { return "public." + name; }, function () { return LaravelEchoDirectiveHandlers.echo.channel(name); });
        };
        LaravelEchoDirectiveHandlers.GetPrivateChannel = function (name) {
            return LaravelEchoDirectiveHandlers.GetChannel(name, function () { return "private." + name; }, function () { return LaravelEchoDirectiveHandlers.echo.private(name); }, LaravelEchoDirectiveHandlers.GetPrivateProps, ['whisper', 'listenForWhisper']);
        };
        LaravelEchoDirectiveHandlers.GetPresenceChannel = function (name) {
            return LaravelEchoDirectiveHandlers.GetChannel(name, function () { return "presence." + name; }, function () { return LaravelEchoDirectiveHandlers.echo.join(name); }, function (prop, channel) {
                if (prop === 'here') {
                    return function (handler) { return channel.here(handler); };
                }
                if (prop === 'joining') {
                    return function (handler) { return channel.joining(handler); };
                }
                if (prop === 'leaving') {
                    return function (handler) { return channel.leaving(handler); };
                }
                return LaravelEchoDirectiveHandlers.GetPrivateProps(prop, channel);
            }, ['whisper', 'listenForWhisper', 'here', 'joining', 'leaving']);
        };
        LaravelEchoDirectiveHandlers.GetNotificationChannel = function (idOrName) {
            var name = ((typeof idOrName === 'number') ? "App.Models.User." + idOrName : idOrName);
            return LaravelEchoDirectiveHandlers.GetChannel(name, function () { return "notification." + name; }, function () { return LaravelEchoDirectiveHandlers.echo.private(name); }, null, null, true);
        };
        LaravelEchoDirectiveHandlers.GetChannel = function (name, getQName, creator, callback, props, isNotification) {
            if (isNotification === void 0) { isNotification = false; }
            var qname = getQName(name);
            if (qname in LaravelEchoDirectiveHandlers.channels_) {
                return LaravelEchoDirectiveHandlers.channels_[qname];
            }
            var channel = creator(name);
            if (!channel) {
                return null;
            }
            var succeeded = null, statusHandlers = new Array();
            channel.listen('.pusher:subscription_succeeded', function () {
                succeeded = true;
                statusHandlers.splice(0).forEach(function (handler) { return handler(true); });
            });
            channel.listen('.pusher:subscription_error', function () {
                succeeded = false;
                statusHandlers.splice(0).forEach(function (handler) { return handler(false); });
            });
            LaravelEchoDirectiveHandlers.channels_[qname] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'name') {
                    return qname;
                }
                if (prop === 'channel') {
                    return channel;
                }
                if (prop === 'status') {
                    return function (handler) {
                        if (succeeded === null) {
                            statusHandlers.push(handler);
                        }
                        else {
                            handler(succeeded);
                        }
                    };
                }
                if (prop === 'listen') {
                    if (isNotification) {
                        return function (handler) { return channel.notification(handler); };
                    }
                    return function (event, handler) { return channel.listen(event, handler); };
                }
                if (prop === 'leave') {
                    return function () { return LaravelEchoDirectiveHandlers.echo.leave(name); };
                }
                if (callback) {
                    return callback(prop, channel);
                }
            }, __spreadArrays(['name', 'channel', 'listen', 'leave'], (props || [])));
            return LaravelEchoDirectiveHandlers.channels_[qname];
        };
        LaravelEchoDirectiveHandlers.GetPrivateProps = function (prop, channel) {
            if (prop === 'whisper') {
                return function (event, data) {
                    if (typeof data === 'function') {
                        channel.listenForWhisper(event, data);
                    }
                    else {
                        channel.whisper(event, data);
                    }
                };
            }
        };
        LaravelEchoDirectiveHandlers.AddAll = function () {
            try {
                LaravelEchoDirectiveHandlers.echo.connector.pusher.connection.bind('connected', function () {
                    LaravelEchoDirectiveHandlers.connected_ = true;
                    LaravelEchoDirectiveHandlers.connectionError_ = null;
                    LaravelEchoDirectiveHandlers.statusHandlers_.splice(0).forEach(function (handler) { return handler(true); });
                });
                LaravelEchoDirectiveHandlers.echo.connector.pusher.connection.bind('error', function (error) {
                    LaravelEchoDirectiveHandlers.connected_ = false;
                    LaravelEchoDirectiveHandlers.connectionError_ = error;
                    LaravelEchoDirectiveHandlers.statusHandlers_.splice(0).forEach(function (handler) { return handler(false); });
                });
            }
            catch (err) {
                LaravelEchoDirectiveHandlers.connected_ = true;
            }
            if (!InlineJS.Region.GetGlobal(null, '$echo')) {
                InlineJS.Region.AddGlobal('$echo', function () {
                    if ('meta' in LaravelEchoDirectiveHandlers.channels_) {
                        return LaravelEchoDirectiveHandlers.channels_['meta'];
                    }
                    LaravelEchoDirectiveHandlers.channels_['meta'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                        if (prop === 'status') {
                            return function (handler) {
                                if (LaravelEchoDirectiveHandlers.connected_ === null) {
                                    LaravelEchoDirectiveHandlers.statusHandlers_.push(handler);
                                }
                                else {
                                    handler(LaravelEchoDirectiveHandlers.connected_);
                                }
                            };
                        }
                        if (prop === 'connect') {
                            return function () {
                                try {
                                    LaravelEchoDirectiveHandlers.echo.connector.pusher.connection.connect();
                                }
                                catch (err) { }
                            };
                        }
                        if (prop === 'error') {
                            return LaravelEchoDirectiveHandlers.connectionError_;
                        }
                    }, ['status', 'connect', 'error']);
                    return LaravelEchoDirectiveHandlers.channels_['meta'];
                });
            }
            InlineJS.Region.AddGlobal('$compileNotification', function () { return LaravelEchoDirectiveHandlers.CompileNotification; });
            InlineJS.Region.AddGlobal('$echoPublicChannel', function () { return LaravelEchoDirectiveHandlers.GetPublicChannel; });
            InlineJS.Region.AddGlobal('$echoPrivateChannel', function () { return LaravelEchoDirectiveHandlers.GetPrivateChannel; });
            InlineJS.Region.AddGlobal('$echoPresenceChannel', function () { return LaravelEchoDirectiveHandlers.GetPresenceChannel; });
            InlineJS.Region.AddGlobal('$echoNotificationChannel', function () { return LaravelEchoDirectiveHandlers.GetNotificationChannel; });
            InlineJS.DirectiveHandlerManager.AddHandler('echoTypingBind', LaravelEchoDirectiveHandlers.TypingBind);
            InlineJS.DirectiveHandlerManager.AddHandler('echoOn', LaravelEchoDirectiveHandlers.On);
            InlineJS.DirectiveHandlerManager.AddHandler('channel', LaravelEchoDirectiveHandlers.Channel);
            InlineJS.DirectiveHandlerManager.AddHandler('notifications', LaravelEchoDirectiveHandlers.Notifications);
            InlineJS.ExtendedDirectiveHandlers.BuildGlobal('channel');
        };
        LaravelEchoDirectiveHandlers.connected_ = null;
        LaravelEchoDirectiveHandlers.connectionError_ = null;
        LaravelEchoDirectiveHandlers.statusHandlers_ = new Array();
        LaravelEchoDirectiveHandlers.channels_ = {};
        LaravelEchoDirectiveHandlers.echo = window['Echo'];
        return LaravelEchoDirectiveHandlers;
    }());
    InlineJS.LaravelEchoDirectiveHandlers = LaravelEchoDirectiveHandlers;
    (function () {
        LaravelEchoDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
