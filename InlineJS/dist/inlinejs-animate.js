"use strict";
var InlineJS;
(function (InlineJS) {
    var OpacityAnimator = /** @class */ (function () {
        function OpacityAnimator() {
        }
        OpacityAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease) {
            element.style.opacity = (show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration))).toString();
        };
        return OpacityAnimator;
    }());
    InlineJS.OpacityAnimator = OpacityAnimator;
    var WidthHeightAnimator = /** @class */ (function () {
        function WidthHeightAnimator(type_, reversed_) {
            this.type_ = type_;
            this.reversed_ = reversed_;
        }
        WidthHeightAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease) {
            var value = (show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration)));
            if (this.type_ === 'both') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" scale(" + value + ", " + value + ")"));
                element.style.transformOrigin = (this.reversed_ ? '100% 100%' : '0% 0%');
            }
            else if (this.type_ === 'width') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" scaleX(" + value + ")"));
                element.style.transformOrigin = (this.reversed_ ? '100% 0%' : '0% 0%');
            }
            else {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" scaleY(" + value + ")"));
                element.style.transformOrigin = (this.reversed_ ? '0% 100%' : '0% 0%');
            }
        };
        return WidthHeightAnimator;
    }());
    InlineJS.WidthHeightAnimator = WidthHeightAnimator;
    var ZoomAnimator = /** @class */ (function () {
        function ZoomAnimator(type_, direction_) {
            this.type_ = type_;
            this.direction_ = direction_;
        }
        ZoomAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease) {
            var value = ease(ellapsed, duration);
            if ((show && this.direction_ === 'out') || (!show && this.direction_ === 'in')) {
                value = (1 - value);
            }
            if (this.type_ === 'both') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" scale(" + value + ", " + value + ")"));
            }
            else if (this.type_ === 'width') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" scaleX(" + value + ")"));
            }
            else {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" scaleY(" + value + ")"));
            }
        };
        return ZoomAnimator;
    }());
    InlineJS.ZoomAnimator = ZoomAnimator;
    var RotationAnimator = /** @class */ (function () {
        function RotationAnimator(type_, direction_, angle_) {
            this.type_ = type_;
            this.direction_ = direction_;
            this.angle_ = angle_;
        }
        RotationAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease) {
            var value = ease(ellapsed, duration);
            if ((show && this.direction_ === 'counterclockwise') || (!show && this.direction_ === 'clockwise')) {
                value = (1 - value);
            }
            if (this.type_ === 'x') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" rotateX(" + (value * this.angle_) + "deg)"));
            }
            else if (this.type_ === 'y') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" rotateY(" + value * this.angle_ + "deg)"));
            }
            else {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" rotateZ(" + value * this.angle_ + "deg)"));
            }
        };
        return RotationAnimator;
    }());
    InlineJS.RotationAnimator = RotationAnimator;
    var SlideAnimator = /** @class */ (function () {
        function SlideAnimator(direction_) {
            this.direction_ = direction_;
        }
        SlideAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease) {
            var value = (show ? (1 - ease(ellapsed, duration)) : ease(ellapsed, duration));
            if (this.direction_ === 'down') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" translateY(" + (value * 9999) + "px)"));
            }
            else if (this.direction_ === 'left') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" translateX(" + -(value * 9999) + "px)"));
            }
            else if (this.direction_ === 'up') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" translateY(" + -(value * 9999) + "px)"));
            }
            else if (this.direction_ === 'right') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" translateX(" + (value * 9999) + "px)"));
            }
        };
        return SlideAnimator;
    }());
    InlineJS.SlideAnimator = SlideAnimator;
    InlineJS.Animators = {
        'opacity': new OpacityAnimator(),
        'height': new WidthHeightAnimator('height', false),
        'height-reverse': new WidthHeightAnimator('height', true),
        'width': new WidthHeightAnimator('width', false),
        'width-reverse': new WidthHeightAnimator('width', true),
        'width-height': new WidthHeightAnimator('both', false),
        'width-height-reverse': new WidthHeightAnimator('both', true),
        'zoom': new ZoomAnimator('both', 'in'),
        'zoom-height': new ZoomAnimator('height', 'in'),
        'zoom-width': new ZoomAnimator('width', 'in'),
        'zoom-in': new ZoomAnimator('both', 'in'),
        'zoom-in-height': new ZoomAnimator('height', 'in'),
        'zoom-in-width': new ZoomAnimator('width', 'in'),
        'zoom-out': new ZoomAnimator('both', 'out'),
        'zoom-out-height': new ZoomAnimator('height', 'out'),
        'zoom-out-width': new ZoomAnimator('width', 'out'),
        'rotate': new RotationAnimator('z', 'clockwise', 360),
        'rotate-x': new RotationAnimator('x', 'clockwise', 360),
        'rotate-y': new RotationAnimator('y', 'clockwise', 360),
        'rotate-z': new RotationAnimator('z', 'clockwise', 360),
        'rotate-reverse': new RotationAnimator('z', 'counterclockwise', 360),
        'rotate-x-reverse': new RotationAnimator('x', 'counterclockwise', 360),
        'rotate-y-reverse': new RotationAnimator('y', 'counterclockwise', 360),
        'rotate-z-reverse': new RotationAnimator('z', 'counterclockwise', 360),
        'slide': new SlideAnimator('down'),
        'slide-down': new SlideAnimator('down'),
        'slide-left': new SlideAnimator('left'),
        'slide-up': new SlideAnimator('up'),
        'slide-right': new SlideAnimator('right')
    };
    var AnimationEasings = /** @class */ (function () {
        function AnimationEasings() {
        }
        AnimationEasings.linear = function (time, duration) {
            return (time / duration);
        };
        AnimationEasings.back = function (time, duration) {
            var fraction = (1 - (time / duration));
            return (1 - (fraction * fraction * ((2.70158 * fraction) - 1.70158)));
        };
        AnimationEasings.bounce = function (time, duration) {
            var fraction = (time / duration);
            if (fraction < (1 / 2.75)) {
                return (7.5625 * fraction * fraction);
            }
            if (fraction < (2 / 2.75)) {
                fraction -= (1.5 / 2.75);
                return ((7.5625 * fraction * fraction) + 0.75);
            }
            if (fraction < (2.5 / 2.75)) {
                fraction -= (2.25 / 2.75);
                return ((7.5625 * fraction * fraction) + 0.9375);
            }
            fraction -= (2.625 / 2.75);
            return ((7.5625 * fraction * fraction) + 0.984375);
        };
        return AnimationEasings;
    }());
    InlineJS.AnimationEasings = AnimationEasings;
    var AnimateDirectiveHandlers = /** @class */ (function () {
        function AnimateDirectiveHandlers() {
        }
        AnimateDirectiveHandlers.Animate = function (region, element, directive) {
            var animator = AnimateDirectiveHandlers.PrepareAnimation(element, directive.arg.options);
            if (!animator) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var regionId = region.GetId(), lastValue = null;
            region.GetState().TrapGetAccess(function () {
                var value = !!InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(regionId), element, directive.value);
                if (lastValue !== value) {
                    lastValue = value;
                    animator(lastValue);
                }
            }, true, element);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        AnimateDirectiveHandlers.Typewriter = function (region, element, directive) {
            var data = InlineJS.CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (!data) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var info = {
                list: new Array(),
                delay: 100,
                interval: 250,
                iterations: -1,
                showDelete: false,
                useRandom: false,
                showCursor: false
            };
            if (typeof data === 'string') {
                info.list.push(data);
            }
            else if (Array.isArray(data)) {
                data.forEach(function (item) { return info.list.push(item); });
            }
            else {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var nextDuration = '', iterationsIsNext = false;
            directive.arg.options.forEach(function (option) {
                if (nextDuration) {
                    var duration_1 = InlineJS.CoreDirectiveHandlers.ExtractDuration(option, null);
                    if (duration_1 !== null) {
                        info[nextDuration] = duration_1;
                        nextDuration = '';
                        return;
                    }
                    nextDuration = '';
                }
                else if (iterationsIsNext) {
                    iterationsIsNext = false;
                    if (option === 'inf' || option === 'infinite') {
                        info.iterations = -1;
                    }
                    else {
                        info.iterations = (parseInt(option) || -1);
                    }
                    return;
                }
                if (option === 'delay' || option === 'interval') {
                    nextDuration = option;
                    info[nextDuration] = (info[nextDuration] || 250);
                }
                else if (option === 'iterations') {
                    iterationsIsNext = true;
                }
                else if (option === 'delete') {
                    info.showDelete = true;
                }
                else if (option === 'random') {
                    info.useRandom = true;
                }
                else if (option === 'cursor') {
                    info.showCursor = true;
                }
            });
            var lineIndex = -1, index = 0, line, isDeleting = false, span = document.createElement('span'), duration, startTimestamp = null, stopped = false;
            var pass = function (timestamp) {
                if (lineIndex == -1 || line.length <= index) {
                    index = 0;
                    if (isDeleting || lineIndex == -1 || !info.showDelete) {
                        lineIndex = (info.useRandom ? Math.floor(Math.random() * info.list.length) : ++lineIndex);
                        if (info.list.length <= lineIndex) { //Move to front of list
                            lineIndex = 0;
                        }
                        line = info.list[lineIndex];
                        isDeleting = false;
                    }
                    else {
                        isDeleting = true;
                    }
                    duration = info.interval;
                }
                if (startTimestamp === null) {
                    startTimestamp = timestamp;
                }
                if ((timestamp - startTimestamp) < duration) { //Duration not met
                    requestAnimationFrame(pass);
                    return;
                }
                startTimestamp = timestamp;
                if (isDeleting) {
                    ++index;
                    span.innerText = line.substr(0, (line.length - index));
                    duration = info.delay;
                }
                else { //Append
                    ++index;
                    span.innerText = line.substring(0, index);
                    duration = info.delay;
                }
                if (!stopped) {
                    requestAnimationFrame(pass);
                }
            };
            span.classList.add('typewriter-text');
            if (info.showCursor) {
                span.style.borderRight = '1px solid #333333';
            }
            element.appendChild(span);
            requestAnimationFrame(pass);
            region.AddElement(element).uninitCallbacks.push(function () {
                stopped = true;
            });
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        AnimateDirectiveHandlers.InitAnimation = function (element, options, callback) {
            var animators = {};
            options.forEach(function (key) {
                if (key in InlineJS.Animators) {
                    animators[key] = ((typeof InlineJS.Animators[key] === 'function') ? InlineJS.Animators[key](element) : InlineJS.Animators[key]);
                }
                else if (callback) {
                    callback(key);
                }
            });
            return animators;
        };
        AnimateDirectiveHandlers.PrepareAnimation = function (element, options) {
            var duration = null, ease;
            var animators = AnimateDirectiveHandlers.InitAnimation(element, options, function (key) {
                if (key in AnimationEasings) {
                    ease = AnimationEasings[key];
                    return;
                }
                switch (key) {
                    case 'slower':
                        duration = 1000;
                        break;
                    case 'slow':
                        duration = 750;
                        break;
                    case 'normal':
                        duration = 500;
                        break;
                    case 'fast':
                        duration = 300;
                        break;
                    case 'faster':
                        duration = 200;
                        break;
                    default:
                        duration = InlineJS.CoreDirectiveHandlers.ExtractDuration(key, null);
                        break;
                }
            });
            var keys = Object.keys(animators);
            if (keys.length == 0) { //Default
                animators['opacity'] = ((typeof InlineJS.Animators.opacity === 'function') ? InlineJS.Animators.opacity(element) : InlineJS.Animators.opacity);
                keys.push('opacity');
            }
            duration = (duration || 300);
            if (!ease) {
                ease = function (time, duration) {
                    return ((time < duration) ? (-1 * Math.cos(time / duration * (Math.PI / 2)) + 1) : 1);
                };
            }
            var checkpoint = 0;
            return function (show, beforeCallback, afterCallback) {
                element.dispatchEvent(new CustomEvent('animation.entering'));
                if (beforeCallback) {
                    beforeCallback(show);
                }
                var unhandledKeys = new Array();
                keys.forEach(function (key) {
                    if (!animators[key].handle || !animators[key].handle(element, show, duration)) {
                        unhandledKeys.push(key);
                    }
                });
                if (unhandledKeys.length == 0) { //All animations handled
                    return;
                }
                var lastCheckpoint = ++checkpoint, startTimestamp = null, done = false;
                var end = function () {
                    var isFirst = true;
                    done = true;
                    unhandledKeys.forEach(function (key) {
                        animators[key].step(isFirst, element, show, duration, duration, ease);
                        isFirst = false;
                    });
                    element.dispatchEvent(new CustomEvent('animation.leaving'));
                    if (afterCallback) {
                        afterCallback(show);
                    }
                    element.dispatchEvent(new CustomEvent('animation.leave'));
                };
                var pass = function (timestamp) {
                    if (startTimestamp === null) {
                        startTimestamp = timestamp;
                    }
                    if (done || lastCheckpoint != checkpoint) {
                        return;
                    }
                    var ellapsed = (timestamp - startTimestamp), isFirst = true;
                    if (ellapsed < duration) {
                        unhandledKeys.forEach(function (key) {
                            animators[key].step(isFirst, element, show, ellapsed, duration, ease);
                            isFirst = false;
                        });
                        requestAnimationFrame(pass);
                    }
                    else { //End
                        end();
                    }
                };
                setTimeout(function () {
                    if (!done && lastCheckpoint == checkpoint) {
                        end();
                    }
                }, (duration + 100));
                requestAnimationFrame(pass);
                element.dispatchEvent(new CustomEvent('animation.enter'));
            };
        };
        AnimateDirectiveHandlers.AddAll = function () {
            InlineJS.CoreDirectiveHandlers.PrepareAnimation = AnimateDirectiveHandlers.PrepareAnimation;
            InlineJS.DirectiveHandlerManager.AddHandler('animate', AnimateDirectiveHandlers.Animate);
            InlineJS.DirectiveHandlerManager.AddHandler('typewriter', AnimateDirectiveHandlers.Typewriter);
            [30, 45, 90, 180, 270, 315, 360].forEach(function (angle) {
                InlineJS.Animators["rotate-" + angle] = new RotationAnimator('z', 'clockwise', angle);
                InlineJS.Animators["rotate-x-" + angle] = new RotationAnimator('x', 'clockwise', angle);
                InlineJS.Animators["rotate-y-" + angle] = new RotationAnimator('y', 'clockwise', angle);
                InlineJS.Animators["rotate-z-" + angle] = new RotationAnimator('z', 'clockwise', angle);
                InlineJS.Animators["rotate-" + angle + "-reverse"] = new RotationAnimator('z', 'counterclockwise', angle);
                InlineJS.Animators["rotate-x-" + angle + "-reverse"] = new RotationAnimator('x', 'counterclockwise', angle);
                InlineJS.Animators["rotate-y-" + angle + "-reverse"] = new RotationAnimator('y', 'counterclockwise', angle);
                InlineJS.Animators["rotate-z-" + angle + "-reverse"] = new RotationAnimator('z', 'counterclockwise', angle);
            });
        };
        return AnimateDirectiveHandlers;
    }());
    InlineJS.AnimateDirectiveHandlers = AnimateDirectiveHandlers;
    (function () {
        AnimateDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
