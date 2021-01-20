"use strict";
var InlineJS;
(function (InlineJS) {
    var TimeagoDirectiveHandlers = /** @class */ (function () {
        function TimeagoDirectiveHandlers() {
        }
        TimeagoDirectiveHandlers.Timeago = function (region, element, directive) {
            var date = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (typeof date === 'string' || typeof date === 'number') {
                date = new Date(date);
            }
            else if (!(date instanceof Date)) {
                if (!(element instanceof HTMLTimeElement)) {
                    return InlineJS.DirectiveHandlerReturn.Nil;
                }
                date = new Date(element.dateTime);
            }
            var regionId = region.GetId(), timeago = InlineJS.Region.GetGlobalValue(regionId, '$timeago');
            if (!timeago) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var elementScope = region.AddElement(element, true);
            var scope = (elementScope ? InlineJS.ExtendedDirectiveHandlers.AddScope('timeago', elementScope, []) : null);
            if (!scope) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var label = null;
            elementScope.locals['$timeago'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'label') {
                    InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                    return label;
                }
            }, ['label']);
            timeago.render(date, function (fromattedLabel) {
                label = fromattedLabel;
                InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'label', scope);
            }, directive.arg.options.includes('caps'));
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        TimeagoDirectiveHandlers.AddAll = function () {
            InlineJS.DirectiveHandlerManager.AddHandler('timeago', TimeagoDirectiveHandlers.Timeago);
            InlineJS.DirectiveHandlerManager.AddHandler('timeAgo', TimeagoDirectiveHandlers.Timeago);
            var formatter = function (date, withNextUpdate) {
                if (withNextUpdate === void 0) { withNextUpdate = false; }
                var now = Date.now(), then = date.getTime(), getLabel, diff;
                if (now < then) {
                    diff = (then - now);
                    getLabel = function (value) {
                        return ['', 0];
                    };
                }
                else { //Past
                    diff = (now - then);
                    getLabel = function (value) {
                        var seconds = Math.floor(value / 1000), years = Math.floor(seconds / (365 * 24 * 60 * 60));
                        if (years >= 1) {
                            return [years + " " + ((years == 1) ? 'year' : 'years') + " ago", null];
                        }
                        var months = Math.floor(seconds / (30 * 24 * 60 * 60));
                        if (months >= 1) {
                            return [months + " " + ((months == 1) ? 'month' : 'months') + " ago", null];
                        }
                        var weeks = Math.floor(seconds / (7 * 24 * 60 * 60));
                        if (weeks >= 1) {
                            return [weeks + " " + ((weeks == 1) ? 'week' : 'weeks') + " ago", null];
                        }
                        var days = Math.floor(seconds / (24 * 60 * 60));
                        if (days >= 1) {
                            return [days + " " + ((days == 1) ? 'day' : 'days') + " ago", (24 * 60 * 60 * 1000)];
                        }
                        var hours = Math.floor(seconds / (60 * 60));
                        if (hours >= 1) {
                            return [hours + " " + ((hours == 1) ? 'hour' : 'hours') + " ago", (60 * 60 * 1000)];
                        }
                        var minutes = Math.floor(seconds / 60);
                        if (minutes >= 1) {
                            return [minutes + " " + ((minutes == 1) ? 'minute' : 'minutes') + " ago", (60 * 1000)];
                        }
                        if (seconds >= 30) { //Check in 30 seconds
                            return ['30 seconds ago', ((60 - seconds) * 1000)];
                        }
                        if (seconds >= 15) { //Check in 15 seconds
                            return ['15 seconds ago', ((30 - seconds) * 1000)];
                        }
                        if (seconds >= 10) { //Check in 5 seconds
                            return ['10 seconds ago', ((15 - seconds) * 1000)];
                        }
                        if (seconds >= 5) { //Check in 5 seconds
                            return ['5 seconds ago', ((10 - seconds) * 1000)];
                        }
                        if (seconds >= 2) {
                            return ['few seconds ago', ((5 - seconds) * 1000)];
                        }
                        if (seconds >= 1) {
                            return ['1 second ago', 1000];
                        }
                        return ['just now', ((value < 1000) ? (1000 - value) : 1000)];
                    };
                }
                return (withNextUpdate ? getLabel(diff) : getLabel(diff)[0]);
            };
            var timeago = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                if (prop === 'format') {
                    return formatter;
                }
                if (prop === 'render') {
                    return function (date, handler, capitalize) {
                        if (capitalize === void 0) { capitalize = false; }
                        var formatted = formatter(date, true), label = formatted[0], onTimeout = function () {
                            formatted = formatter(date, true);
                            label = formatted[0];
                            setTimeout(onTimeout, formatted[1]);
                        };
                        handler(capitalize ? (label.substr(0, 1).toUpperCase() + label.substr(1)) : label);
                        label = null;
                        var pass = function () {
                            if (label) {
                                handler(capitalize ? (label.substr(0, 1).toUpperCase() + label.substr(1)) : label);
                                label = null;
                            }
                            requestAnimationFrame(pass);
                        };
                        setTimeout(onTimeout, formatted[1]);
                        requestAnimationFrame(pass);
                    };
                }
            }, ['format', 'render', 'error']);
            InlineJS.Region.AddGlobal('$timeago', function () {
                return timeago;
            });
            InlineJS.Region.AddGlobal('$timeAgo', function () {
                return timeago;
            });
        };
        return TimeagoDirectiveHandlers;
    }());
    InlineJS.TimeagoDirectiveHandlers = TimeagoDirectiveHandlers;
    (function () {
        TimeagoDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
