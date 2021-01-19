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
            var getChannel = function (name, getQName, creator, callback, props, isNotification) {
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
                }, __spreadArrays(['channel', 'listen', 'leave'], (props || [])));
                return LaravelEchoDirectiveHandlers.channels_[qname];
            };
            var privateProps = function (prop, channel) {
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
            InlineJS.Region.AddGlobal('$echoPublicChannel', function () { return function (name) { return getChannel(name, function () { return "public." + name; }, function () { return LaravelEchoDirectiveHandlers.echo.channel(name); }); }; });
            InlineJS.Region.AddGlobal('$echoPrivateChannel', function () { return function (name) { return getChannel(name, function () { return "private." + name; }, function () { return LaravelEchoDirectiveHandlers.echo.private(name); }, privateProps, ['whisper', 'listenForWhisper']); }; });
            InlineJS.Region.AddGlobal('$echoNotificationChannel', function () { return function (idOrName) { return getChannel(((typeof idOrName === 'number') ? "App.Models.User." + idOrName : idOrName), function (name) { return "notification." + name; }, function (name) { return LaravelEchoDirectiveHandlers.echo.private(name); }, null, null, true); }; });
            InlineJS.Region.AddGlobal('$echoPresenceChannel', function () { return function (name) { return getChannel(name, function () { return "presence." + name; }, function () { return LaravelEchoDirectiveHandlers.echo.join(name); }, function (prop, channel) {
                if (prop === 'here') {
                    return function (handler) { return channel.here(handler); };
                }
                if (prop === 'joining') {
                    return function (handler) { return channel.joining(handler); };
                }
                if (prop === 'leaving') {
                    return function (handler) { return channel.leaving(handler); };
                }
                return privateProps(prop, channel);
            }, ['whisper', 'listenForWhisper', 'here', 'joining', 'leaving']); }; });
            InlineJS.DirectiveHandlerManager.AddHandler('echoTypingBind', LaravelEchoDirectiveHandlers.TypingBind);
            InlineJS.DirectiveHandlerManager.AddHandler('echoOn', LaravelEchoDirectiveHandlers.On);
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
