"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var InlineJS;
(function (InlineJS) {
    var OpacityAnimator = /** @class */ (function () {
        function OpacityAnimator() {
        }
        OpacityAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease) {
            if (element) {
                element.style.opacity = (show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration))).toString();
            }
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
            if (!element) {
                return;
            }
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
        function ZoomAnimator(type_, direction_, scale_) {
            if (scale_ === void 0) { scale_ = 1; }
            this.type_ = type_;
            this.direction_ = direction_;
            this.scale_ = scale_;
        }
        ZoomAnimator.prototype.init = function (options, nextOptionIndex) {
            var regex = /^[0-9]+$/;
            if (nextOptionIndex < options.length) {
                if (options[nextOptionIndex].match(regex)) {
                    this.scale_ = (parseInt(options[nextOptionIndex]) / 1000);
                    return 1;
                }
            }
            return 0;
        };
        ZoomAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease) {
            if (!element) {
                return;
            }
            var value = ease(ellapsed, duration);
            if ((show && this.direction_ === 'out') || (!show && this.direction_ === 'in')) {
                value = (1 - value);
            }
            if (this.scale_ != 1) {
                if (this.direction_ === 'out') {
                    var scale = (1 / this.scale_);
                    value = ((value * scale) + scale);
                }
                else { //Grow
                    value = ((value * (this.scale_ - 1)) + 1);
                }
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
            if (angle_ === void 0) { angle_ = 360; }
            this.type_ = type_;
            this.direction_ = direction_;
            this.angle_ = angle_;
        }
        RotationAnimator.prototype.init = function (options, nextOptionIndex) {
            var regex = /^[0-9]+$/;
            if (nextOptionIndex < options.length) {
                if (options[nextOptionIndex].match(regex)) {
                    this.angle_ = parseInt(options[nextOptionIndex]);
                    return 1;
                }
            }
            return 0;
        };
        RotationAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease) {
            if (!element) {
                return;
            }
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
        function SlideAnimator(direction_, displacement_) {
            if (displacement_ === void 0) { displacement_ = 9999; }
            this.direction_ = direction_;
            this.displacement_ = displacement_;
        }
        SlideAnimator.prototype.init = function (options, nextOptionIndex) {
            var regex = /^[0-9]+$/;
            if (nextOptionIndex < options.length) {
                if (options[nextOptionIndex].match(regex)) {
                    this.displacement_ = parseInt(options[nextOptionIndex]);
                    return 1;
                }
            }
            return 0;
        };
        SlideAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease) {
            if (!element) {
                return;
            }
            var value = (show ? (1 - ease(ellapsed, duration)) : ease(ellapsed, duration));
            value = (value * ((this.displacement_ <= 0) ? 9999 : this.displacement_));
            if (this.direction_ === 'down') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" translateY(" + value + "px)"));
            }
            else if (this.direction_ === 'left') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" translateX(" + -value + "px)"));
            }
            else if (this.direction_ === 'up') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" translateY(" + -value + "px)"));
            }
            else if (this.direction_ === 'right') {
                element.style.transform = ((isFirst ? '' : element.style.transform) + (" translateX(" + value + "px)"));
            }
        };
        return SlideAnimator;
    }());
    InlineJS.SlideAnimator = SlideAnimator;
    var CounterAnimator = /** @class */ (function () {
        function CounterAnimator(direction_, offset_, round_) {
            if (offset_ === void 0) { offset_ = 0; }
            if (round_ === void 0) { round_ = -1; }
            this.direction_ = direction_;
            this.offset_ = offset_;
            this.round_ = round_;
            this.arg_ = {
                value: 0,
                callback: null
            };
        }
        CounterAnimator.prototype.init = function (options, nextOptionIndex, element) {
            var regex = /^[0-9]+$/;
            var count = 0;
            if (nextOptionIndex < options.length) {
                if (options[nextOptionIndex].match(regex)) {
                    this.offset_ = parseInt(options[nextOptionIndex]);
                    ++nextOptionIndex;
                    ++count;
                }
                if (nextOptionIndex < options.length && options[nextOptionIndex] === 'round') {
                    this.round_ = 0;
                    ++nextOptionIndex;
                    ++count;
                    if (nextOptionIndex < options.length && options[nextOptionIndex].match(regex)) {
                        this.round_ = parseInt(options[nextOptionIndex]);
                        ++count;
                    }
                }
            }
            if (element) {
                this.arg_.value = parseFloat(element.textContent);
            }
            return count;
        };
        CounterAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease, args) {
            var value = (show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration)));
            if (this.direction_ === 'down') {
                value = (1 - value);
            }
            var result = this.doStep_(value, (args ? args.value : this.arg_.value));
            if (args && args.callback) {
                args.callback(result);
            }
            else if (element) {
                element.textContent = InlineJS.CoreDirectiveHandlers.ToString(result);
            }
        };
        CounterAnimator.prototype.doStep_ = function (value, content) {
            var _this = this;
            if (Array.isArray(content)) {
                return content.map(function (item) { return _this.doStep_(value, item); });
            }
            if (typeof content === 'function') {
                return content(value);
            }
            if (InlineJS.Region.IsObject(content)) {
                var converted_1 = {};
                Object.keys(content).forEach(function (key) {
                    converted_1[key] = _this.doStep_(value, content[key]);
                });
                return converted_1;
            }
            if (typeof content !== 'number') {
                content = InlineJS.CoreDirectiveHandlers.ToString(content);
                if (!content) {
                    return;
                }
                return content.substr(0, (value * content.length));
            }
            return ((value * (content - this.offset_)) + this.offset_).toFixed((0 <= this.round_) ? this.round_ : 0);
        };
        return CounterAnimator;
    }());
    InlineJS.CounterAnimator = CounterAnimator;
    var SceneAnimator = /** @class */ (function () {
        function SceneAnimator(handler_) {
            this.handler_ = handler_;
        }
        SceneAnimator.prototype.step = function (isFirst, element, show, ellapsed, duration, ease, args) {
            this.handler_.handle(((show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration))) * 100), isFirst, element, show);
        };
        SceneAnimator.prototype.getPreferredEase = function () {
            return this.handler_.getPreferredEase();
        };
        SceneAnimator.setTransform = function (isFirst, element, value) {
            element.style.transform = ((isFirst ? '' : element.style.transform + " ") + value);
        };
        return SceneAnimator;
    }());
    InlineJS.SceneAnimator = SceneAnimator;
    var GenericSceneAnimatorHandler = /** @class */ (function () {
        function GenericSceneAnimatorHandler(frames_, preferredEase_) {
            var _this = this;
            if (preferredEase_ === void 0) { preferredEase_ = null; }
            this.frames_ = frames_;
            this.preferredEase_ = preferredEase_;
            this.wildcardFrame_ = null;
            this.frames_.forEach(function (frame) {
                if (!Array.isArray(frame.frames) && frame.frames.from === frame.frames.to && frame.frames.from === null) {
                    _this.wildcardFrame_ = frame;
                }
            });
        }
        GenericSceneAnimatorHandler.prototype.handle = function (frame, isFirst, element, show) {
            var executed = false;
            this.frames_.forEach(function (frameInfo) {
                var inside = (GenericSceneAnimatorHandler.getFrameInside(frame, frameInfo.frames));
                if (inside) {
                    frameInfo.callback(frame, inside, isFirst, element, show);
                    executed = true;
                }
            });
            if (!executed && this.wildcardFrame_) {
                this.wildcardFrame_.callback(frame, this.wildcardFrame_.frames, isFirst, element, show);
            }
        };
        GenericSceneAnimatorHandler.prototype.getPreferredEase = function () {
            return this.preferredEase_;
        };
        GenericSceneAnimatorHandler.getFrameInside = function (frame, frames) {
            if (Array.isArray(frames)) {
                for (var i = 0; i < frames.length; ++i) {
                    if (frames[i].from !== null && frames[i].to != null && frames[i].from <= frame && frame < frames[i].to) {
                        return frames[i];
                    }
                }
                return null;
            }
            if (frames.from === null || frames.to === null) {
                return null;
            }
            return ((frames.from <= frame && frame < frames.to) ? frames : null);
        };
        return GenericSceneAnimatorHandler;
    }());
    InlineJS.GenericSceneAnimatorHandler = GenericSceneAnimatorHandler;
    var ShakeSceneAnimatorHandler = /** @class */ (function (_super) {
        __extends(ShakeSceneAnimatorHandler, _super);
        function ShakeSceneAnimatorHandler(type_, action_) {
            var _this = _super.call(this, [{
                    frames: [{ from: 1, to: 10 }, { from: 20, to: 30 }, { from: 40, to: 50 }, { from: 60, to: 70 }, { from: 80, to: 90 }],
                    callback: function (frame, inside, isFirst, element, show) {
                        SceneAnimator.setTransform(isFirst, element, _this.conductor_ + "(" + (1 - ((inside.to - frame) / 100)) * -_this.multiplier_ + _this.unit_ + ")");
                    }
                }, {
                    frames: [{ from: 10, to: 20 }, { from: 30, to: 40 }, { from: 50, to: 60 }, { from: 70, to: 80 }, { from: 90, to: 100 }],
                    callback: function (frame, inside, isFirst, element, show) {
                        SceneAnimator.setTransform(isFirst, element, _this.conductor_ + "(" + (1 - ((inside.to - frame) / 100)) * _this.multiplier_ + _this.unit_ + ")");
                    }
                }, {
                    frames: { from: null, to: null },
                    callback: function (frame, inside, isFirst, element, show) {
                        SceneAnimator.setTransform(isFirst, element, _this.conductor_ + "(0)");
                    }
                }]) || this;
            _this.type_ = type_;
            _this.action_ = action_;
            if (_this.action_ === 'translate') {
                _this.conductor_ = "translate" + _this.type_.toUpperCase();
                _this.multiplier_ = 10;
                _this.unit_ = 'px';
            }
            else {
                _this.conductor_ = "rotate" + _this.type_.toUpperCase();
                _this.multiplier_ = 4;
                _this.unit_ = 'deg';
            }
            return _this;
        }
        return ShakeSceneAnimatorHandler;
    }(GenericSceneAnimatorHandler));
    InlineJS.ShakeSceneAnimatorHandler = ShakeSceneAnimatorHandler;
    var HeartbeatSceneAnimatorHandler = /** @class */ (function (_super) {
        __extends(HeartbeatSceneAnimatorHandler, _super);
        function HeartbeatSceneAnimatorHandler() {
            return _super.call(this, [{
                    frames: [{ from: 1, to: 14 }, { from: 28, to: 42 }],
                    callback: function (frame, inside, isFirst, element, show) {
                        SceneAnimator.setTransform(isFirst, element, "scale(" + (1 - ((inside.to - frame) / 100)) * 1.3 + ")");
                    }
                }, {
                    frames: { from: null, to: null },
                    callback: function (frame, inside, isFirst, element, show) {
                        SceneAnimator.setTransform(isFirst, element, 'scale(1)');
                    }
                }]) || this;
        }
        return HeartbeatSceneAnimatorHandler;
    }(GenericSceneAnimatorHandler));
    InlineJS.HeartbeatSceneAnimatorHandler = HeartbeatSceneAnimatorHandler;
    var PulseSceneAnimatorHandler = /** @class */ (function (_super) {
        __extends(PulseSceneAnimatorHandler, _super);
        function PulseSceneAnimatorHandler() {
            return _super.call(this, [{
                    frames: { from: 1, to: 50 },
                    callback: function (frame, inside, isFirst, element, show) {
                        var value = (((1 - ((inside.to - frame) / 100)) * 0.15) + 1);
                        SceneAnimator.setTransform(isFirst, element, "scale3d(" + value + ", " + value + ", " + value + ")");
                    }
                }, {
                    frames: { from: 50, to: 100 },
                    callback: function (frame, inside, isFirst, element, show) {
                        var value = ((((inside.to - frame) / 100) * 0.15) + 1);
                        SceneAnimator.setTransform(isFirst, element, "scale3d(" + value + ", " + value + ", " + value + ")");
                    }
                }, {
                    frames: { from: null, to: null },
                    callback: function (frame, inside, isFirst, element, show) {
                        SceneAnimator.setTransform(isFirst, element, 'scale3d(1, 1, 1)');
                    }
                }], AnimationEasings.circleInOut) || this;
        }
        return PulseSceneAnimatorHandler;
    }(GenericSceneAnimatorHandler));
    InlineJS.PulseSceneAnimatorHandler = PulseSceneAnimatorHandler;
    InlineJS.Animators = {
        opacity: function () { return new OpacityAnimator(); },
        height: function () { return new WidthHeightAnimator('height', false); },
        heightReverse: function () { return new WidthHeightAnimator('height', true); },
        width: function () { return new WidthHeightAnimator('width', false); },
        widthReverse: function () { return new WidthHeightAnimator('width', true); },
        widthHeight: function () { return new WidthHeightAnimator('both', false); },
        widthHeightReverse: function () { return new WidthHeightAnimator('both', true); },
        zoom: function () { return new ZoomAnimator('both', 'in'); },
        zoomHeight: function () { return new ZoomAnimator('height', 'in'); },
        zoomWidth: function () { return new ZoomAnimator('width', 'in'); },
        zoomIn: function () { return new ZoomAnimator('both', 'in'); },
        zoomInHeight: function () { return new ZoomAnimator('height', 'in'); },
        zoomInWidth: function () { return new ZoomAnimator('width', 'in'); },
        zoomOut: function () { return new ZoomAnimator('both', 'out'); },
        zoomOutHeight: function () { return new ZoomAnimator('height', 'out'); },
        zoomOutWidth: function () { return new ZoomAnimator('width', 'out'); },
        rotate: function () { return new RotationAnimator('z', 'clockwise'); },
        rotateX: function () { return new RotationAnimator('x', 'clockwise'); },
        rotateY: function () { return new RotationAnimator('y', 'clockwise'); },
        rotateZ: function () { return new RotationAnimator('z', 'clockwise'); },
        rotateReverse: function () { return new RotationAnimator('z', 'counterclockwise'); },
        rotateXReverse: function () { return new RotationAnimator('x', 'counterclockwise'); },
        rotateYReverse: function () { return new RotationAnimator('y', 'counterclockwise'); },
        rotateZReverse: function () { return new RotationAnimator('z', 'counterclockwise'); },
        slide: function () { return new SlideAnimator('down'); },
        slideDown: function () { return new SlideAnimator('down'); },
        slideLeft: function () { return new SlideAnimator('left'); },
        slideUp: function () { return new SlideAnimator('up'); },
        slideRight: function () { return new SlideAnimator('right'); },
        counter: function () { return new CounterAnimator('up'); },
        counterUp: function () { return new CounterAnimator('up'); },
        counterDown: function () { return new CounterAnimator('down'); },
        shake: function () { return new SceneAnimator(new ShakeSceneAnimatorHandler('x', 'translate')); },
        shakeX: function () { return new SceneAnimator(new ShakeSceneAnimatorHandler('x', 'translate')); },
        shakeY: function () { return new SceneAnimator(new ShakeSceneAnimatorHandler('y', 'translate')); },
        shakeZ: function () { return new SceneAnimator(new ShakeSceneAnimatorHandler('z', 'translate')); },
        vibrate: function () { return new SceneAnimator(new ShakeSceneAnimatorHandler('z', 'rotate')); },
        vibrateX: function () { return new SceneAnimator(new ShakeSceneAnimatorHandler('x', 'rotate')); },
        vibrateY: function () { return new SceneAnimator(new ShakeSceneAnimatorHandler('y', 'rotate')); },
        vibrateZ: function () { return new SceneAnimator(new ShakeSceneAnimatorHandler('z', 'rotate')); },
        heartbeat: function () { return new SceneAnimator(new HeartbeatSceneAnimatorHandler()); },
        heartBeat: function () { return new SceneAnimator(new HeartbeatSceneAnimatorHandler()); },
        pulse: function () { return new SceneAnimator(new PulseSceneAnimatorHandler()); }
    };
    var AnimationEasings = /** @class */ (function () {
        function AnimationEasings() {
        }
        AnimationEasings.linear = function (time, duration) {
            return (time / duration);
        };
        AnimationEasings.back = function (time, duration) {
            return AnimationEasings.backOut(time, duration);
        };
        AnimationEasings.backIn = function (time, duration) {
            var fraction = (time / duration);
            return ((2.70158 * fraction * fraction * fraction) - (1.70158 * fraction * fraction));
        };
        AnimationEasings.backOut = function (time, duration) {
            var fraction = (1 - (time / duration));
            return (1 - (fraction * fraction * ((2.70158 * fraction) - 1.70158)));
        };
        AnimationEasings.backInOut = function (time, duration) {
            var fraction = (time / duration);
            var c1 = 1.70158;
            var c2 = c1 * 1.525;
            return ((fraction < 0.5) ? (Math.pow(2 * fraction, 2) * ((c2 + 1) * 2 * fraction - c2)) / 2 : (Math.pow(2 * fraction - 2, 2) * ((c2 + 1) * (fraction * 2 - 2) + c2) + 2) / 2);
        };
        AnimationEasings.bounce = function (time, duration) {
            return AnimationEasings.bounceOut(time, duration);
        };
        AnimationEasings.bounceIn = function (time, duration) {
            return (1 - AnimationEasings.bounceOut((1 - (time / duration)), 1));
        };
        AnimationEasings.bounceOut = function (time, duration) {
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
        AnimationEasings.bounceInOut = function (time, duration) {
            var fraction = (time / duration);
            return ((fraction < 0.5) ? ((1 - AnimationEasings.bounceOut((1 - (2 * fraction)), 1)) / 2) : ((1 + AnimationEasings.bounceOut(((2 * fraction) - 1), 1)) / 2));
        };
        AnimationEasings.circle = function (time, duration) {
            return AnimationEasings.circleOut(time, duration);
        };
        AnimationEasings.circleIn = function (time, duration) {
            var fraction = (time / duration);
            return (1 - Math.sqrt(1 - Math.pow(fraction, 2)));
        };
        AnimationEasings.circleOut = function (time, duration) {
            var fraction = (time / duration);
            return Math.sqrt(1 - Math.pow((fraction - 1), 2));
        };
        AnimationEasings.circleInOut = function (time, duration) {
            var fraction = (time / duration);
            return (fraction < 0.5) ? ((1 - Math.sqrt(1 - Math.pow((2 * fraction), 2))) / 2) : ((Math.sqrt(1 - Math.pow(((-2 * fraction) + 2), 2)) + 1) / 2);
        };
        AnimationEasings.cubic = function (time, duration) {
            return AnimationEasings.cubicOut(time, duration);
        };
        AnimationEasings.cubicIn = function (time, duration) {
            return Math.pow((time / duration), 3);
        };
        AnimationEasings.cubicOut = function (time, duration) {
            return (1 - Math.pow((1 - (time / duration)), 3));
        };
        AnimationEasings.cubicInOut = function (time, duration) {
            var fraction = (time / duration);
            return ((fraction < 0.5) ? (4 * Math.pow(fraction, 3)) : (1 - (Math.pow(((-2 * fraction) + 2), 3) / 2)));
        };
        AnimationEasings.elastic = function (time, duration) {
            return AnimationEasings.elasticOut(time, duration);
        };
        AnimationEasings.elasticIn = function (time, duration) {
            var fraction = (time / duration);
            var c4 = (2 * Math.PI) / 3;
            return ((fraction == 0) ? 0 : ((fraction == 1) ? 1 : -Math.pow(2, 10 * fraction - 10) * Math.sin((fraction * 10 - 10.75) * c4)));
        };
        AnimationEasings.elasticOut = function (time, duration) {
            var fraction = (time / duration);
            if (fraction == 0 || fraction == 1) {
                return fraction;
            }
            return (Math.pow(2, (-10 * fraction)) * Math.sin(((fraction * 10) - 0.75) * ((2 * Math.PI) / 3)) + 1);
        };
        AnimationEasings.elasticInOut = function (time, duration) {
            var fraction = (time / duration);
            if (fraction == 0 || fraction == 1) {
                return fraction;
            }
            var c5 = (2 * Math.PI) / 4.5;
            return ((fraction < 0.5) ? -(Math.pow(2, 20 * fraction - 10) * Math.sin((20 * fraction - 11.125) * c5)) / 2 : (Math.pow(2, -20 * fraction + 10) * Math.sin((20 * fraction - 11.125) * c5)) / 2 + 1);
        };
        AnimationEasings.exponential = function (time, duration) {
            return AnimationEasings.exponentialOut(time, duration);
        };
        AnimationEasings.exponentialIn = function (time, duration) {
            var fraction = (time / duration);
            return ((fraction == 0) ? 0 : Math.pow(2, ((10 * fraction) - 10)));
        };
        AnimationEasings.exponentialOut = function (time, duration) {
            var fraction = (time / duration);
            if (fraction == 1) {
                return fraction;
            }
            return (1 - Math.pow(2, (-10 * fraction)));
        };
        AnimationEasings.exponentialInOut = function (time, duration) {
            var fraction = (time / duration);
            if (fraction == 1) {
                return fraction;
            }
            return (1 - Math.pow(2, (-10 * fraction)));
        };
        AnimationEasings.quadratic = function (time, duration) {
            return AnimationEasings.quadraticOut(time, duration);
        };
        AnimationEasings.quadraticIn = function (time, duration) {
            return Math.pow((time / duration), 2);
        };
        AnimationEasings.quadraticOut = function (time, duration) {
            return (1 - Math.pow((1 - (time / duration)), 2));
        };
        AnimationEasings.quadraticInOut = function (time, duration) {
            var fraction = (time / duration);
            return ((fraction < 0.5) ? (2 * Math.pow(fraction, 2)) : (1 - (Math.pow(((-2 * fraction) + 2), 2) / 2)));
        };
        AnimationEasings.quart = function (time, duration) {
            return AnimationEasings.quartOut(time, duration);
        };
        AnimationEasings.quartIn = function (time, duration) {
            return Math.pow((1 - (time / duration)), 4);
        };
        AnimationEasings.quartOut = function (time, duration) {
            return (1 - Math.pow((1 - (time / duration)), 4));
        };
        AnimationEasings.quartInOut = function (time, duration) {
            var fraction = (time / duration);
            return ((fraction < 0.5) ? (8 * Math.pow(fraction, 4)) : (1 - (Math.pow(((-2 * fraction) + 2), 4) / 2)));
        };
        AnimationEasings.quint = function (time, duration) {
            return AnimationEasings.quintOut(time, duration);
        };
        AnimationEasings.quintIn = function (time, duration) {
            return Math.pow((1 - (time / duration)), 5);
        };
        AnimationEasings.quintOut = function (time, duration) {
            return (1 - Math.pow((1 - (time / duration)), 5));
        };
        AnimationEasings.quintInOut = function (time, duration) {
            var fraction = (time / duration);
            return ((fraction < 0.5) ? (16 * Math.pow(fraction, 5)) : (1 - (Math.pow(((-2 * fraction) + 2), 5) / 2)));
        };
        AnimationEasings.sine = function (time, duration) {
            return AnimationEasings.sineOut(time, duration);
        };
        AnimationEasings.sineIn = function (time, duration) {
            return (1 - Math.cos(((time / duration) * Math.PI) / 2));
        };
        AnimationEasings.sineOut = function (time, duration) {
            return Math.sin(((time / duration) * Math.PI) / 2);
        };
        AnimationEasings.sineInOut = function (time, duration) {
            return (-(Math.cos(Math.PI * (time / duration)) - 1) / 2);
        };
        AnimationEasings.bezier = function (time, duration, first, second, third, fourth) {
            if (duration <= time) {
                return 1;
            }
            first *= 0.001;
            third *= 0.001;
            second *= 0.001;
            fourth *= 0.001;
            var firstDiff = (3 * (second - first));
            var secondDiff = ((3 * (third - second)) - firstDiff);
            var thirdDiff = ((fourth - first) - firstDiff - secondDiff);
            var fraction = (time / duration);
            return ((firstDiff * Math.pow(fraction, 3)) + (secondDiff * Math.pow(fraction, 2)) + (thirdDiff * fraction));
        };
        return AnimationEasings;
    }());
    InlineJS.AnimationEasings = AnimationEasings;
    var AnimateDirectiveHandlers = /** @class */ (function () {
        function AnimateDirectiveHandlers() {
        }
        AnimateDirectiveHandlers.Animate = function (region, element, directive) {
            var animator = AnimateDirectiveHandlers.PrepareAnimation(region, element, directive.arg.options);
            if (!animator) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var regionId = region.GetId(), lastValue = null, showOnly = directive.arg.options.includes('show'), hideOnly = (!showOnly && directive.arg.options.includes('hide'));
            region.GetState().TrapGetAccess(function () {
                var value = !!InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(regionId), element, directive.value);
                if (lastValue !== value) {
                    lastValue = value;
                    if ((lastValue ? !hideOnly : !showOnly)) {
                        animator(lastValue);
                    }
                }
            }, true, element);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        AnimateDirectiveHandlers.AnimateInner = function (region, element, directive) {
            var animators = Array.from(element.children).map(function (child) { return AnimateDirectiveHandlers.PrepareAnimation(region, child, directive.arg.options); });
            if (animators.length == 0) {
                return InlineJS.DirectiveHandlerReturn.Nil;
            }
            var regionId = region.GetId(), isOnce = directive.arg.options.includes('once'), lastValue = null, nextIndex = 0, animateNext = function () {
                if (!lastValue) {
                    return;
                }
                if (animators.length <= nextIndex) {
                    nextIndex = 0;
                    if (isOnce) {
                        return;
                    }
                }
                var animator = animators[nextIndex], lastIndex = nextIndex;
                animator(true, null, function () {
                    animator(false);
                    animateNext();
                });
                ++nextIndex;
            };
            region.GetState().TrapGetAccess(function () {
                var value = !!InlineJS.CoreDirectiveHandlers.Evaluate(InlineJS.Region.Get(regionId), element, directive.value);
                if (lastValue !== value) {
                    lastValue = value;
                    if (lastValue) {
                        nextIndex = 0;
                        animateNext();
                    }
                }
            }, true, element);
            return InlineJS.DirectiveHandlerReturn.Handled;
        };
        AnimateDirectiveHandlers.BusyView = function (region, element, directive) {
            var container = document.createElement('div'), dots = [document.createElement('span'), document.createElement('span'), document.createElement('span')];
            container.classList.add('inlinejs-loader');
            container.setAttribute(InlineJS.Region.directivePrfix + "-data", '');
            container.setAttribute(InlineJS.Region.directivePrfix + "-cloak", 'hide');
            container.setAttribute(InlineJS.Region.directivePrfix + "-show:animate.zoom.faster", "" + directive.value);
            container.setAttribute(InlineJS.Region.directivePrfix + "-animate-inner.zoom.1500", "" + directive.value);
            dots.forEach(function (dot) {
                dot.classList.add('inlinejs-loader-dot');
                container.appendChild(dot);
            });
            element.style.position = 'relative';
            element.appendChild(container);
            container.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
            });
            InlineJS.Region.AddPostProcessCallback(function () {
                InlineJS.Bootstrap.Reattach(element);
            });
            var elementScope = region.AddElement(element, true);
            var scope = (elementScope ? InlineJS.ExtendedDirectiveHandlers.AddScope('busyView', elementScope, []) : null);
            if (scope) {
                elementScope.locals['$busyView'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                    if (prop === 'container') {
                        return container;
                    }
                    if (prop === 'dots') {
                        return dots;
                    }
                }, ['container', 'dots']);
            }
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
            var animators = {}, index = 0, skipCount = 0;
            options.forEach(function (key) {
                ++index;
                if (0 < skipCount) { //Skip
                    --skipCount;
                    return;
                }
                key = InlineJS.Processor.GetCamelCaseDirectiveName(key);
                if (key in InlineJS.Animators) {
                    var animator = ((typeof InlineJS.Animators[key] === 'function') ? InlineJS.Animators[key](element) : InlineJS.Animators[key]);
                    if (animator.isExclusive && animator.isExclusive()) {
                        animators = {};
                    }
                    animators[key] = animator;
                    if (animator.init) {
                        skipCount = animator.init(options, index, element);
                    }
                }
                else if (callback) {
                    skipCount = callback(key, index);
                }
            });
            return animators;
        };
        AnimateDirectiveHandlers.PrepareAnimation = function (region, element, options) {
            var duration = null, ease, easeArgs = [];
            var animators = AnimateDirectiveHandlers.InitAnimation(element, options, function (key, index) {
                var skipCount = 0;
                if (key in AnimationEasings) {
                    ease = AnimationEasings[key];
                    if (2 < ease.length) {
                        easeArgs = Array.from({ length: (ease.length - 2) }, function () { return parseInt(options[index + skipCount++]); });
                    }
                    return skipCount;
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
                return skipCount;
            });
            var keys = Object.keys(animators), usingDefaultEase = false;
            if (keys.length == 0) { //Default
                animators['opacity'] = ((typeof InlineJS.Animators.opacity === 'function') ? InlineJS.Animators.opacity(element) : InlineJS.Animators.opacity);
                keys.push('opacity');
            }
            duration = (duration || 300);
            if (!ease) {
                usingDefaultEase = true;
                ease = function (time, duration) {
                    return ((time < duration) ? (-1 * Math.cos(time / duration * (Math.PI / 2)) + 1) : 1);
                };
            }
            var checkpoint = 0, animating = false, elementScope = (element ? region.AddElement(element, true) : null);
            var scope = (elementScope ? InlineJS.ExtendedDirectiveHandlers.AddScope('animate', elementScope, []) : null), regionId = region.GetId();
            if (scope) {
                elementScope.locals['$animate'] = InlineJS.CoreDirectiveHandlers.CreateProxy(function (prop) {
                    if (prop === 'animating') {
                        InlineJS.Region.Get(regionId).GetChanges().AddGetAccess(scope.path + "." + prop);
                        return animating;
                    }
                }, ['animating']);
            }
            return function (show, beforeCallback, afterCallback, args) {
                if (scope && !animating) {
                    animating = true;
                    InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'animating', scope);
                }
                if (element) {
                    element.dispatchEvent(new CustomEvent('animation.entering', {
                        detail: { show: show }
                    }));
                }
                if (beforeCallback) {
                    beforeCallback(show);
                }
                var unhandledKeys = new Array();
                keys.forEach(function (key) {
                    var animator = animators[key];
                    if (!animator.handle || !animator.handle(element, show, duration, function (time, duration) {
                        if (usingDefaultEase && animator.getPreferredEase) {
                            return (animator.getPreferredEase() || ease).apply(void 0, __spreadArrays([time, duration], easeArgs));
                        }
                        return ease.apply(void 0, __spreadArrays([time, duration], easeArgs));
                    }, args)) {
                        unhandledKeys.push(key);
                    }
                });
                if (unhandledKeys.length == 0) { //All animations handled
                    if (scope && animating) {
                        animating = false;
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'animating', scope);
                    }
                    return;
                }
                var lastCheckpoint = ++checkpoint, startTimestamp = null, done = false;
                var end = function () {
                    var isFirst = true;
                    done = true;
                    unhandledKeys.forEach(function (key) {
                        var animator = animators[key];
                        animator.step(isFirst, element, show, duration, duration, function (time, duration) {
                            if (usingDefaultEase && animator.getPreferredEase) {
                                return (animator.getPreferredEase() || ease).apply(void 0, __spreadArrays([time, duration], easeArgs));
                            }
                            return ease.apply(void 0, __spreadArrays([time, duration], easeArgs));
                        }, args);
                        isFirst = false;
                    });
                    if (element) {
                        element.dispatchEvent(new CustomEvent('animation.leaving', {
                            detail: { show: show }
                        }));
                    }
                    if (afterCallback) {
                        afterCallback(show);
                    }
                    if (element) {
                        element.dispatchEvent(new CustomEvent('animation.leave', {
                            detail: { show: show }
                        }));
                    }
                    if (animating) {
                        animating = false;
                        InlineJS.ExtendedDirectiveHandlers.Alert(InlineJS.Region.Get(regionId), 'animating', scope);
                    }
                    isFirst = true;
                    unhandledKeys.forEach(function (key) {
                        if (animators[key].after) {
                            animators[key].after(isFirst, element, show);
                        }
                        isFirst = false;
                    });
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
                            var animator = animators[key];
                            animator.step(isFirst, element, show, ellapsed, duration, function (time, duration) {
                                if (usingDefaultEase && animator.getPreferredEase) {
                                    return (animator.getPreferredEase() || ease).apply(void 0, __spreadArrays([time, duration], easeArgs));
                                }
                                return ease.apply(void 0, __spreadArrays([time, duration], easeArgs));
                            }, args);
                            isFirst = false;
                        });
                        requestAnimationFrame(pass);
                    }
                    else { //End
                        end();
                    }
                };
                var isFirst = true;
                unhandledKeys.forEach(function (key) {
                    if (animators[key].before) {
                        animators[key].before(isFirst, element, show);
                    }
                    isFirst = false;
                });
                setTimeout(function () {
                    if (!done && lastCheckpoint == checkpoint) {
                        end();
                    }
                }, (duration + 100));
                requestAnimationFrame(pass);
                if (element) {
                    element.dispatchEvent(new CustomEvent('animation.enter', {
                        detail: { show: show }
                    }));
                }
            };
        };
        AnimateDirectiveHandlers.AddAll = function () {
            InlineJS.CoreDirectiveHandlers.PrepareAnimation = AnimateDirectiveHandlers.PrepareAnimation;
            InlineJS.DirectiveHandlerManager.AddHandler('animate', AnimateDirectiveHandlers.Animate);
            InlineJS.DirectiveHandlerManager.AddHandler('animateInner', AnimateDirectiveHandlers.AnimateInner);
            InlineJS.DirectiveHandlerManager.AddHandler('busyView', AnimateDirectiveHandlers.BusyView);
            InlineJS.DirectiveHandlerManager.AddHandler('typewriter', AnimateDirectiveHandlers.Typewriter);
            InlineJS.ExtendedDirectiveHandlers.BuildGlobal('animate');
            InlineJS.ExtendedDirectiveHandlers.BuildGlobal('busyView');
        };
        return AnimateDirectiveHandlers;
    }());
    InlineJS.AnimateDirectiveHandlers = AnimateDirectiveHandlers;
    (function () {
        AnimateDirectiveHandlers.AddAll();
    })();
})(InlineJS || (InlineJS = {}));
