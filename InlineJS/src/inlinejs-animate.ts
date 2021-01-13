namespace InlineJS{
    export interface Animator{
        init?: (options: Array<string>, nextOptionIndex: number, element?: HTMLElement) => number;
        handle?: (element: HTMLElement, show: boolean, duration: number, ease: (time: number, duration: number) => number, args?: any) => boolean;
        step?: (isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number, args?: any) => void;
        before?: (isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
        after?: (isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
        isExclusive?: () => boolean;
        getPreferredEase?: () => (time: number, duration: number) => number;
    }

    export class OpacityAnimator implements Animator{
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
            if (element){
                element.style.opacity = (show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration))).toString();
            }
        }
    }

    export class WidthHeightAnimator implements Animator{
        public constructor(private type_: 'both' | 'width' | 'height', private reversed_: boolean){}

        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
            if (!element){
                return;
            }
            
            let value = (show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration)));
            if (this.type_ === 'both'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` scale(${value}, ${value})`);
                element.style.transformOrigin = (this.reversed_ ? '100% 100%' : '0% 0%');
            }
            else if (this.type_ === 'width'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` scaleX(${value})`);
                element.style.transformOrigin = (this.reversed_ ? '100% 0%' : '0% 0%');
            }
            else{
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` scaleY(${value})`);
                element.style.transformOrigin = (this.reversed_ ? '0% 100%' : '0% 0%');
            }
        }
    }

    export class ZoomAnimator implements Animator{
        public constructor(private type_: 'both' | 'width' | 'height', private direction_: 'in' | 'out', private scale_ = 1){}

        public init(options: Array<string>, nextOptionIndex: number){
            const regex = /^[0-9]+$/;

            if (nextOptionIndex < options.length){
                if (options[nextOptionIndex].match(regex)){
                    this.scale_ = (parseInt(options[nextOptionIndex]) / 1000);
                    return 1;
                }
            }

            return 0;
        }
        
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
            if (!element){
                return;
            }
            
            let value = ease(ellapsed, duration);
            if ((show && this.direction_ === 'out') || (!show && this.direction_ === 'in')){
                value = (1 - value);
            }

            if (this.scale_ != 1){
                if (this.direction_ === 'out'){
                    let scale = (1 / this.scale_);
                    value = ((value * scale) + scale);
                }
                else{//Grow
                    value = ((value * (this.scale_ - 1)) + 1);
                }
            }

            if (this.type_ === 'both'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` scale(${value}, ${value})`);
            }
            else if (this.type_ === 'width'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` scaleX(${value})`);
            }
            else{
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` scaleY(${value})`);
            }
        }
    }

    export class RotationAnimator implements Animator{
        public constructor(private type_: 'x' | 'y' | 'z', private direction_: 'clockwise' | 'counterclockwise', private angle_: number = 360){}

        public init(options: Array<string>, nextOptionIndex: number){
            const regex = /^[0-9]+$/;

            if (nextOptionIndex < options.length){
                if (options[nextOptionIndex].match(regex)){
                    this.angle_ = parseInt(options[nextOptionIndex]);
                    return 1;
                }
            }

            return 0;
        }
        
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
            if (!element){
                return;
            }
            
            let value = ease(ellapsed, duration);
            if ((show && this.direction_ === 'counterclockwise') || (!show && this.direction_ === 'clockwise')){
                value = (1 - value);
            }

            if (this.type_ === 'x'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` rotateX(${(value * this.angle_)}deg)`);
            }
            else if (this.type_ === 'y'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` rotateY(${value * this.angle_}deg)`);
            }
            else{
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` rotateZ(${value * this.angle_}deg)`);
            }
        }
    }

    export class SlideAnimator implements Animator{
        public constructor(private direction_: 'down' | 'left' | 'up' | 'right', private displacement_ = 9999){}
        
        public init(options: Array<string>, nextOptionIndex: number){
            const regex = /^[0-9]+$/;

            if (nextOptionIndex < options.length){
                if (options[nextOptionIndex].match(regex)){
                    this.displacement_ = parseInt(options[nextOptionIndex]);
                    return 1;
                }
            }

            return 0;
        }
        
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
            if (!element){
                return;
            }
            
            let value = (show ? (1 - ease(ellapsed, duration)) : ease(ellapsed, duration));

            value = (value * ((this.displacement_ <= 0) ? 9999 : this.displacement_));
            if (this.direction_ === 'down'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` translateY(${value}px)`);
            }
            else if (this.direction_ === 'left'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` translateX(${-value}px)`);
            }
            else if (this.direction_ === 'up'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` translateY(${-value}px)`);
            }
            else if (this.direction_ === 'right'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` translateX(${value}px)`);
            }
        }
    }

    export interface CounterAnimatorArg{
        value: any;
        callback: (result: any) => void;
    }
    
    export class CounterAnimator implements Animator{
        private arg_: CounterAnimatorArg = {
            value: 0,
            callback: null,
        };
        
        public constructor(private direction_: 'down' | 'up', private offset_ = 0, private round_ = -1){}
        
        public init(options: Array<string>, nextOptionIndex: number, element: HTMLElement){
            const regex = /^[0-9]+$/;

            let count = 0;
            if (nextOptionIndex < options.length){
                if (options[nextOptionIndex].match(regex)){
                    this.offset_ = parseInt(options[nextOptionIndex]);
                    ++nextOptionIndex;
                    ++count;
                }


                if (nextOptionIndex < options.length && options[nextOptionIndex] === 'round'){
                    this.round_ = 0;

                    ++nextOptionIndex;
                    ++count;

                    if (nextOptionIndex < options.length && options[nextOptionIndex].match(regex)){
                        this.round_ = parseInt(options[nextOptionIndex]);
                        ++count;
                    }
                }
            }

            if (element){
                this.arg_.value = parseFloat(element.textContent);
            }
            
            return count;
        }
        
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number, args?: any){
            let value = (show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration)));
            if (this.direction_ === 'down'){
                value = (1 - value);
            }

            let result = this.doStep_(value, (args ? (args as CounterAnimatorArg).value : this.arg_.value));
            if (args && (args as CounterAnimatorArg).callback){
                (args as CounterAnimatorArg).callback(result);
            }
            else if (element){
                element.textContent = CoreDirectiveHandlers.ToString(result);
            }
        }

        private doStep_(value: number, content: any){
            if (Array.isArray(content)){
                return content.map(item => this.doStep_(value, item));
            }

            if (typeof content === 'function'){
                return (content as (value: number) => any)(value);
            }
            
            if (Region.IsObject(content)){
                let converted = {};
                Object.keys(content).forEach((key) => {
                    converted[key] = this.doStep_(value, content[key]);
                });

                return converted;
            }
            
            if (typeof content !== 'number'){
                content = CoreDirectiveHandlers.ToString(content);
                if (!content){
                    return;
                }

                return (content as string).substr(0, (value * (content as string).length));
            }
            
            return ((value * (content - this.offset_)) + this.offset_).toFixed((0 <= this.round_) ? this.round_ : 0);
        }
    }

    export interface SceneAnimatorHandler{
        handle: (frame: number, isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
        getPreferredEase: () => (time: number, duration: number) => number;
    }
    
    export class SceneAnimator implements Animator{
        public constructor(private handler_: SceneAnimatorHandler){}

        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number, args?: any){
            this.handler_.handle(((show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration))) * 100), isFirst, element, show);
        }

        public getPreferredEase(){
            return this.handler_.getPreferredEase();
        }

        public static setTransform(isFirst: boolean, element: HTMLElement, value: string){
            element.style.transform = ((isFirst ? '' : `${element.style.transform} `) + value);
        }
    }

    export interface GenericSceneAnimatorHandlerFrame{
        from: number;
        to: number;
    }
    
    export interface GenericSceneAnimatorHandlerFrameInfo{
        frames: Array<GenericSceneAnimatorHandlerFrame> | GenericSceneAnimatorHandlerFrame;
        callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
    }
    
    export class GenericSceneAnimatorHandler implements SceneAnimatorHandler{
        private wildcardFrame_: GenericSceneAnimatorHandlerFrameInfo = null;
        
        public constructor(private frames_: Array<GenericSceneAnimatorHandlerFrameInfo>, private preferredEase_: (time: number, duration: number) => number = null){
            this.frames_.forEach((frame) => {
                if (!Array.isArray(frame.frames) && frame.frames.from === frame.frames.to && frame.frames.from === null){
                    this.wildcardFrame_ = frame;
                }
            });
        }
        
        public handle(frame: number, isFirst?: boolean, element?: HTMLElement, show?: boolean){
            let executed = false;
            this.frames_.forEach((frameInfo) => {
                let inside = (GenericSceneAnimatorHandler.getFrameInside(frame, frameInfo.frames));
                if (inside){
                    frameInfo.callback(frame, inside, isFirst, element, show);
                    executed = true;
                }
            });

            if (!executed && this.wildcardFrame_){
                this.wildcardFrame_.callback(frame, (this.wildcardFrame_.frames as GenericSceneAnimatorHandlerFrame), isFirst, element, show);
            }
        }

        public getPreferredEase(){
            return this.preferredEase_;
        }

        public static getFrameInside(frame: number, frames: Array<GenericSceneAnimatorHandlerFrame> | GenericSceneAnimatorHandlerFrame){
            if (Array.isArray(frames)){
                for (let i = 0; i < frames.length; ++i){
                    if (frames[i].from !== null && frames[i].to != null && frames[i].from <= frame && frame < frames[i].to){
                        return frames[i];
                    }
                }

                return null;
            }

            if ((frames as GenericSceneAnimatorHandlerFrame).from === null || (frames as GenericSceneAnimatorHandlerFrame).to === null){
                return null;
            }

            return (((frames as GenericSceneAnimatorHandlerFrame).from <= frame && frame < (frames as GenericSceneAnimatorHandlerFrame).to) ? (frames as GenericSceneAnimatorHandlerFrame) : null);
        }
    }

    export class ShakeSceneAnimatorHandler extends GenericSceneAnimatorHandler{
        private conductor_: string;
        private multiplier_: number;
        private unit_: string;
        
        public constructor(private type_: 'x' | 'y' | 'z', private action_: 'translate' | 'rotate'){
            super([{
                frames: [{ from: 1, to: 10 }, { from: 20, to: 30 }, { from: 40, to: 50 }, { from: 60, to: 70 }, { from: 80, to: 90 }],
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `${this.conductor_}(${(1 - ((inside.to - frame) / 100)) * -this.multiplier_}${this.unit_})`);
                },
            }, {
                frames: [{ from: 10, to: 20 }, { from: 30, to: 40 }, { from: 50, to: 60 }, { from: 70, to: 80 }, { from: 90, to: 100 }],
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `${this.conductor_}(${(1 - ((inside.to - frame) / 100)) * this.multiplier_}${this.unit_})`);
                },
            }, {
                frames: { from: null, to: null },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `${this.conductor_}(0)`);
                },
            }]);

            if (this.action_ === 'translate'){
                this.conductor_ = `translate${this.type_.toUpperCase()}`;
                this.multiplier_ = 10;
                this.unit_ = 'px';
            }
            else{
                this.conductor_ = `rotate${this.type_.toUpperCase()}`;
                this.multiplier_ = 4;
                this.unit_ = 'deg';
            }
        }
    }

    export class HeartbeatSceneAnimatorHandler extends GenericSceneAnimatorHandler{
        public constructor(){
            super([{
                frames: [{ from: 1, to: 14 }, { from: 28, to: 42 }],
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `scale(${(1 - ((inside.to - frame) / 100)) * 1.3})`);
                },
            }, {
                frames: { from: null, to: null },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, 'scale(1)');
                },
            }]);
        }
    }

    export class PulseSceneAnimatorHandler extends GenericSceneAnimatorHandler{
        public constructor(){
            super([{
                frames: { from: 1, to: 50 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = (((1 - ((inside.to - frame) / 100)) * 0.15) + 1);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${value}, ${value}, ${value})`);
                },
            }, {
                frames: { from: 50, to: 100 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = ((((inside.to - frame) / 100) * 0.15) + 1);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${value}, ${value}, ${value})`);
                },
            }, {
                frames: { from: null, to: null },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, 'scale3d(1, 1, 1)');
                },
            }], AnimationEasings.circleInOut);
        }
    }

    export let Animators = {
        opacity: () => new OpacityAnimator(),
        height: () => new WidthHeightAnimator('height', false),
        heightReverse: () => new WidthHeightAnimator('height', true),
        width: () => new WidthHeightAnimator('width', false),
        widthReverse: () => new WidthHeightAnimator('width', true),
        widthHeight: () => new WidthHeightAnimator('both', false),
        widthHeightReverse: () => new WidthHeightAnimator('both', true),
        zoom: () => new ZoomAnimator('both', 'in'),
        zoomHeight: () => new ZoomAnimator('height', 'in'),
        zoomWidth: () => new ZoomAnimator('width', 'in'),
        zoomIn: () => new ZoomAnimator('both', 'in'),
        zoomInHeight: () => new ZoomAnimator('height', 'in'),
        zoomInWidth: () => new ZoomAnimator('width', 'in'),
        zoomOut: () => new ZoomAnimator('both', 'out'),
        zoomOutHeight: () => new ZoomAnimator('height', 'out'),
        zoomOutWidth: () => new ZoomAnimator('width', 'out'),
        rotate: () => new RotationAnimator('z', 'clockwise'),
        rotateX: () => new RotationAnimator('x', 'clockwise'),
        rotateY: () => new RotationAnimator('y', 'clockwise'),
        rotateZ: () => new RotationAnimator('z', 'clockwise'),
        rotateReverse: () => new RotationAnimator('z', 'counterclockwise'),
        rotateXReverse: () => new RotationAnimator('x', 'counterclockwise'),
        rotateYReverse: () => new RotationAnimator('y', 'counterclockwise'),
        rotateZReverse: () => new RotationAnimator('z', 'counterclockwise'),
        slide: () => new SlideAnimator('down'),
        slideDown: () => new SlideAnimator('down'),
        slideLeft: () => new SlideAnimator('left'),
        slideUp: () => new SlideAnimator('up'),
        slideRight: () => new SlideAnimator('right'),
        counter: () => new CounterAnimator('up'),
        counterUp: () => new CounterAnimator('up'),
        counterDown: () => new CounterAnimator('down'),
        shake: () => new SceneAnimator(new ShakeSceneAnimatorHandler('x', 'translate')),
        shakeX: () => new SceneAnimator(new ShakeSceneAnimatorHandler('x', 'translate')),
        shakeY: () => new SceneAnimator(new ShakeSceneAnimatorHandler('y', 'translate')),
        shakeZ: () => new SceneAnimator(new ShakeSceneAnimatorHandler('z', 'translate')),
        vibrate: () => new SceneAnimator(new ShakeSceneAnimatorHandler('z', 'rotate')),
        vibrateX: () => new SceneAnimator(new ShakeSceneAnimatorHandler('x', 'rotate')),
        vibrateY: () => new SceneAnimator(new ShakeSceneAnimatorHandler('y', 'rotate')),
        vibrateZ: () => new SceneAnimator(new ShakeSceneAnimatorHandler('z', 'rotate')),
        heartbeat: () => new SceneAnimator(new HeartbeatSceneAnimatorHandler()),
        heartBeat: () => new SceneAnimator(new HeartbeatSceneAnimatorHandler()),
        pulse: () => new SceneAnimator(new PulseSceneAnimatorHandler()),
    };

    export class AnimationEasings{
        public static linear(time: number, duration: number){
            return (time / duration);
        }

        public static back(time: number, duration: number){
            return AnimationEasings.backOut(time, duration);
        }
        
        public static backIn(time: number, duration: number){
            let fraction = (time / duration);
            return ((2.70158 * fraction * fraction * fraction) - (1.70158 * fraction * fraction));
        }
        
        public static backOut(time: number, duration: number){
            let fraction = (1 - (time / duration));
            return (1 - (fraction * fraction * ((2.70158 * fraction) - 1.70158)));
        }
        
        public static backInOut(time: number, duration: number){
            let fraction = (time / duration);
            
            const c1 = 1.70158;
            const c2 = c1 * 1.525;

            return ((fraction < 0.5) ? (Math.pow(2 * fraction, 2) * ((c2 + 1) * 2 * fraction - c2)) / 2 : (Math.pow(2 * fraction - 2, 2) * ((c2 + 1) * (fraction * 2 - 2) + c2) + 2) / 2);
        }
        
        public static bounce(time: number, duration: number){
            return AnimationEasings.bounceOut(time, duration);
        }
        
        public static bounceIn(time: number, duration: number){
            return (1 - AnimationEasings.bounceOut((1 - (time / duration)), 1));
        }
        
        public static bounceOut(time: number, duration: number){
            let fraction = (time / duration);
            if (fraction < (1 / 2.75)){
                return (7.5625 * fraction * fraction);
            }

			if (fraction < (2 / 2.75)){
				fraction -= (1.5 / 2.75);
				return ((7.5625 * fraction * fraction) + 0.75);
			}

			if (fraction < (2.5 / 2.75)){
				fraction -= (2.25 / 2.75);
				return ((7.5625 * fraction * fraction) + 0.9375);
			}
            
            fraction -= (2.625 / 2.75);
			return ((7.5625 * fraction * fraction) + 0.984375);
        }
        
        public static bounceInOut(time: number, duration: number){
            let fraction = (time / duration);
            return ((fraction < 0.5) ? ((1 - AnimationEasings.bounceOut((1 - (2 * fraction)), 1)) / 2) : ((1 + AnimationEasings.bounceOut(((2 * fraction) - 1), 1)) / 2));
        }

        public static circle(time: number, duration: number){
            return AnimationEasings.circleOut(time, duration);
        }

        public static circleIn(time: number, duration: number){
            let fraction = (time / duration);
            return (1 - Math.sqrt(1 - Math.pow(fraction, 2)));
        }

        public static circleOut(time: number, duration: number){
            let fraction = (time / duration);
            return Math.sqrt(1 - Math.pow((fraction - 1), 2));
        }

        public static circleInOut(time: number, duration: number){
            let fraction = (time / duration);
            return (fraction < 0.5) ? ((1 - Math.sqrt(1 - Math.pow((2 * fraction), 2))) / 2) : ((Math.sqrt(1 - Math.pow(((-2 * fraction) + 2), 2)) + 1) / 2);
        }

        public static cubic(time: number, duration: number){
            return AnimationEasings.cubicOut(time, duration);
        }

        public static cubicIn(time: number, duration: number){
            return Math.pow((time / duration), 3);
        }

        public static cubicOut(time: number, duration: number){
            return (1 - Math.pow((1 - (time / duration)), 3));
        }

        public static cubicInOut(time: number, duration: number){
            let fraction = (time / duration);
            return ((fraction < 0.5) ? (4 * Math.pow(fraction, 3)) : (1 - (Math.pow(((-2 * fraction) + 2), 3) / 2)));
        }

        public static elastic(time: number, duration: number){
            return AnimationEasings.elasticOut(time, duration);
        }

        public static elasticIn(time: number, duration: number){
            let fraction = (time / duration);
            const c4 = (2 * Math.PI) / 3;

            return ((fraction == 0) ? 0 : ((fraction == 1) ? 1 : -Math.pow(2, 10 * fraction - 10) * Math.sin((fraction * 10 - 10.75) * c4)));
        }

        public static elasticOut(time: number, duration: number){
            let fraction = (time / duration);
            if (fraction == 0 || fraction == 1){
                return fraction;
            }

            return (Math.pow(2, (-10 * fraction)) * Math.sin(((fraction * 10) - 0.75) * ((2 * Math.PI) / 3)) + 1);
        }

        public static elasticInOut(time: number, duration: number){
            let fraction = (time / duration);
            if (fraction == 0 || fraction == 1){
                return fraction;
            }
            
            const c5 = (2 * Math.PI) / 4.5;
            return ((fraction < 0.5) ? -(Math.pow(2, 20 * fraction - 10) * Math.sin((20 * fraction - 11.125) * c5)) / 2 : (Math.pow(2, -20 * fraction + 10) * Math.sin((20 * fraction - 11.125) * c5)) / 2 + 1);
        }

        public static exponential(time: number, duration: number){
            return AnimationEasings.exponentialOut(time, duration);
        }

        public static exponentialIn(time: number, duration: number){
            let fraction = (time / duration);
            return ((fraction == 0) ? 0 : Math.pow(2, ((10 * fraction) - 10)));
        }

        public static exponentialOut(time: number, duration: number){
            let fraction = (time / duration);
            if (fraction == 1){
                return fraction;
            }

            return (1 - Math.pow(2, (-10 * fraction)));
        }

        public static exponentialInOut(time: number, duration: number){
            let fraction = (time / duration);
            if (fraction == 1){
                return fraction;
            }

            return (1 - Math.pow(2, (-10 * fraction)));
        }

        public static quadratic(time: number, duration: number){
            return AnimationEasings.quadraticOut(time, duration);
        }

        public static quadraticIn(time: number, duration: number){
            return Math.pow((time / duration), 2);
        }

        public static quadraticOut(time: number, duration: number){
            return (1 - Math.pow((1 - (time / duration)), 2));
        }

        public static quadraticInOut(time: number, duration: number){
            let fraction = (time / duration);
            return ((fraction < 0.5) ? (2 * Math.pow(fraction, 2)) : (1 - (Math.pow(((-2 * fraction) + 2), 2) / 2)));
        }

        public static quart(time: number, duration: number){
            return AnimationEasings.quartOut(time, duration);
        }

        public static quartIn(time: number, duration: number){
            return Math.pow((1 - (time / duration)), 4);
        }

        public static quartOut(time: number, duration: number){
            return (1 - Math.pow((1 - (time / duration)), 4));
        }

        public static quartInOut(time: number, duration: number){
            let fraction = (time / duration);
            return ((fraction < 0.5) ? (8 * Math.pow(fraction, 4)) : (1 - (Math.pow(((-2 * fraction) + 2), 4) / 2)));
        }

        public static quint(time: number, duration: number){
            return AnimationEasings.quintOut(time, duration);
        }

        public static quintIn(time: number, duration: number){
            return Math.pow((1 - (time / duration)), 5);
        }

        public static quintOut(time: number, duration: number){
            return (1 - Math.pow((1 - (time / duration)), 5));
        }

        public static quintInOut(time: number, duration: number){
            let fraction = (time / duration);
            return ((fraction < 0.5) ? (16 * Math.pow(fraction, 5)) : (1 - (Math.pow(((-2 * fraction) + 2), 5) / 2)));
        }

        public static sine(time: number, duration: number){
            return AnimationEasings.sineOut(time, duration);
        }

        public static sineIn(time: number, duration: number){
            return (1 - Math.cos(((time / duration) * Math.PI) / 2));
        }

        public static sineOut(time: number, duration: number){
            return Math.sin(((time / duration) * Math.PI) / 2);
        }

        public static sineInOut(time: number, duration: number){
            return (-(Math.cos(Math.PI * (time / duration)) - 1) / 2);
        }

        public static bezier(time: number, duration: number, first: number, second: number, third: number, fourth: number){
            if (duration <= time){
                return 1;
            }
            
            first *= 0.001;
            third *= 0.001;
            second *= 0.001;
            fourth *= 0.001;
            
            let firstDiff = (3 * (second - first));
            let secondDiff = ((3 * (third - second)) - firstDiff);
            let thirdDiff = ((fourth - first) - firstDiff - secondDiff);
            let fraction = (time / duration);

            return ((firstDiff * Math.pow(fraction, 3)) + (secondDiff * Math.pow(fraction, 2)) + (thirdDiff * fraction));
        }
    }
    
    export class AnimateDirectiveHandlers{
        public static Animate(region: Region, element: HTMLElement, directive: Directive){
            let animator = AnimateDirectiveHandlers.PrepareAnimation(region, element, directive.arg.options);
            if (!animator){
                return DirectiveHandlerReturn.Nil;
            }

            let regionId = region.GetId(), lastValue = null, showOnly = directive.arg.options.includes('show'), hideOnly = (!showOnly && directive.arg.options.includes('hide'));
            region.GetState().TrapGetAccess(() => {
                let value = !! CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                if (lastValue !== value){
                    lastValue = value;
                    if ((lastValue ? !hideOnly : !showOnly)){
                        animator(lastValue);
                    }
                }
            }, true, element);

            return DirectiveHandlerReturn.Handled;
        }

        public static AnimateInner(region: Region, element: HTMLElement, directive: Directive){
            let animators = Array.from(element.children).map(child => AnimateDirectiveHandlers.PrepareAnimation(region, (child as HTMLElement), directive.arg.options));
            if (animators.length == 0){
                return DirectiveHandlerReturn.Nil;
            }

            let regionId = region.GetId(), isOnce = directive.arg.options.includes('once'), lastValue = null, nextIndex = 0, animateNext = () => {
                if (!lastValue){
                    return;
                }
                
                if (animators.length <= nextIndex){
                    nextIndex = 0;
                    if (isOnce){
                        return;
                    }
                }

                let animator = animators[nextIndex], lastIndex = nextIndex;
                animator(true, null, () => {
                    animator(false);
                    animateNext();
                });

                ++nextIndex;
            };
            
            region.GetState().TrapGetAccess(() => {
                let value = !! CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                if (lastValue !== value){
                    lastValue = value;
                    if (lastValue){
                        nextIndex = 0;
                        animateNext();
                    }
                }
            }, true, element);

            return DirectiveHandlerReturn.Handled;
        }

        public static BusyView(region: Region, element: HTMLElement, directive: Directive){
            let container = document.createElement('div'), dots = [document.createElement('span'), document.createElement('span'), document.createElement('span')];
            
            container.classList.add('inlinejs-loader');
            container.setAttribute(`${Region.directivePrfix}-data`, '');
            container.setAttribute(`${Region.directivePrfix}-cloak`, 'hide');
            container.setAttribute(`${Region.directivePrfix}-show:animate.zoom.faster`, `${directive.value}`);
            container.setAttribute(`${Region.directivePrfix}-animate-inner.zoom.1500`, `${directive.value}`);
            
            dots.forEach((dot) => {
                dot.classList.add('inlinejs-loader-dot');
                container.appendChild(dot);
            });

            element.style.position = 'relative';
            element.appendChild(container);

            container.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });

            Region.AddPostProcessCallback(() => {
                Bootstrap.Reattach(element);
            });

            let elementScope = region.AddElement(element, true);
            let scope = (elementScope ? ExtendedDirectiveHandlers.AddScope('busyView', elementScope, []) : null)

            if (scope){
                elementScope.locals['$busyView'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                    if (prop === 'container'){
                        return container;
                    }

                    if (prop === 'dots'){
                        return dots;
                    }
                }, ['container', 'dots']);
            }

            return DirectiveHandlerReturn.Handled;
        }
        
        public static Typewriter(region: Region, element: HTMLElement, directive: Directive){
            let data = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (!data){
                return DirectiveHandlerReturn.Nil;
            }

            let info: TypewriterInfo = {
                list: new Array<string>(),
                delay: 100,
                interval: 250,
                iterations: -1,
                showDelete: false,
                useRandom: false,
                showCursor: false
            };
            
            if (typeof data === 'string'){
                info.list.push(data);
            }
            else if (Array.isArray(data)){
                data.forEach(item => info.list.push(item));
            }
            else{
                return DirectiveHandlerReturn.Nil;
            }

            let nextDuration = '', iterationsIsNext = false;
            directive.arg.options.forEach((option) => {//Parse options
                if (nextDuration){
                    let duration = CoreDirectiveHandlers.ExtractDuration(option, null);
                    if (duration !== null){
                        info[nextDuration] = duration;
                        nextDuration = '';
                        return;
                    }

                    nextDuration = '';
                }
                else if (iterationsIsNext){
                    iterationsIsNext = false;
                    if (option === 'inf' || option === 'infinite'){
                        info.iterations = -1;
                    }
                    else{
                        info.iterations = (parseInt(option) || -1);
                    }

                    return;
                }
                
                if (option === 'delay' || option === 'interval'){
                    nextDuration = option;
                    info[nextDuration] = (info[nextDuration] || 250);
                }
                else if (option === 'iterations'){
                    iterationsIsNext = true;
                }
                else if (option === 'delete'){
                    info.showDelete = true;
                }
                else if (option === 'random'){
                    info.useRandom = true;
                }
                else if (option === 'cursor'){
                    info.showCursor = true;
                }
            });
            
            let lineIndex = -1, index = 0, line: string, isDeleting = false, span = document.createElement('span'), duration: number, startTimestamp: DOMHighResTimeStamp = null, stopped = false;
            let pass = (timestamp: DOMHighResTimeStamp) => {
                if (lineIndex == -1 || line.length <= index){
                    index = 0;
                    if (isDeleting || lineIndex == -1 || !info.showDelete){
                        lineIndex = (info.useRandom ? Math.floor(Math.random() * info.list.length) : ++lineIndex);
                        if (info.list.length <= lineIndex){//Move to front of list
                            lineIndex = 0;
                        }

                        line = info.list[lineIndex];
                        isDeleting = false;
                    }
                    else{
                        isDeleting = true;
                    }

                    duration = info.interval;
                }
                
                if (startTimestamp === null){
                    startTimestamp = timestamp;
                }

                if ((timestamp - startTimestamp) < duration){//Duration not met
                    requestAnimationFrame(pass);
                    return;
                }
                
                startTimestamp = timestamp;
                if (isDeleting){
                    ++index;
                    span.innerText = line.substr(0, (line.length - index));
                    duration = info.delay;
                }
                else{//Append
                    ++index;
                    span.innerText = line.substring(0, index);
                    duration = info.delay;
                }

                if (!stopped){
                    requestAnimationFrame(pass);
                }
            };

            span.classList.add('typewriter-text');
            if (info.showCursor){
                span.style.borderRight = '1px solid #333333';
            }
            
            element.appendChild(span);
            requestAnimationFrame(pass);

            region.AddElement(element).uninitCallbacks.push(() => {
                stopped = true;
            });
            
            return DirectiveHandlerReturn.Handled;
        }

        public static InitAnimation(element: HTMLElement, options: Array<string>, callback?: (key: string, index: number) => number){
            let animators: Record<string, Animator> = {}, index = 0, skipCount = 0;
            options.forEach((key) => {
                ++index;
                if (0 < skipCount){//Skip
                    --skipCount;
                    return;
                }
                
                key = Processor.GetCamelCaseDirectiveName(key);
                if (key in Animators){
                    let animator: Animator = ((typeof Animators[key] === 'function') ? (Animators[key] as (element: HTMLElement) => Animator)(element) : Animators[key]);
                    if (animator.isExclusive && animator.isExclusive()){
                        animators = {};
                    }
                    
                    animators[key] = animator;
                    if (animator.init){
                        skipCount = animator.init(options, index, element);
                    }
                }
                else if (callback){
                    skipCount = callback(key, index);
                }
            });

            return animators;
        }

        public static PrepareAnimation(region: Region, element: HTMLElement, options: Array<string>){
            let duration: number = null, ease: (time: number, duration: number, ...args: Array<number>) => number, easeArgs: Array<number> = [];
            let animators = AnimateDirectiveHandlers.InitAnimation(element, options, (key, index) => {
                let skipCount = 0;
                if (key in AnimationEasings){
                    ease = AnimationEasings[key];
                    if (2 < ease.length){
                        easeArgs = Array.from({length: (ease.length - 2)}, () => parseInt(options[index + skipCount++]));
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
                    duration = CoreDirectiveHandlers.ExtractDuration(key, null);
                    break;
                }

                return skipCount;
            });

            let keys = Object.keys(animators), usingDefaultEase = false;
            if (keys.length == 0){//Default
                animators['opacity'] = ((typeof Animators.opacity === 'function') ? (Animators.opacity as (element: HTMLElement) => Animator)(element) : Animators.opacity);
                keys.push('opacity');
            }

            duration = (duration || 300);
            if (!ease){
                usingDefaultEase = true;
                ease = (time: number, duration: number) => {
                    return ((time < duration) ? (-1 * Math.cos(time / duration * (Math.PI / 2)) + 1) : 1);
                };
            }

            let checkpoint = 0, animating = false, elementScope = (element ? region.AddElement(element, true) : null);
            let scope = (elementScope ? ExtendedDirectiveHandlers.AddScope('animate', elementScope, []) : null), regionId = region.GetId();

            if (scope){
                elementScope.locals['$animate'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                    if (prop === 'animating'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                        return animating;
                    }
                }, ['animating']);
            }
            
            return (show: boolean, beforeCallback?: (show?: boolean) => void, afterCallback?: (show?: boolean) => void, args?: any) => {
                if (scope && !animating){
                    animating = true;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'animating', scope);
                }
                
                if (element){
                    element.dispatchEvent(new CustomEvent('animation.entering', {
                        detail: { show: show },
                    }));
                }
                
                if (beforeCallback){
                    beforeCallback(show);
                }
                
                let unhandledKeys = new Array<string>();
                keys.forEach((key) => {
                    let animator = animators[key];
                    if (!animator.handle || !animator.handle(element, show, duration, (time: number, duration: number) => {
                        if (usingDefaultEase && animator.getPreferredEase){
                            return (animator.getPreferredEase() || ease)(time, duration, ...easeArgs);
                        }
                        return ease(time, duration, ...easeArgs);
                    }, args)){
                        unhandledKeys.push(key);
                    }
                });
                
                if (unhandledKeys.length == 0){//All animations handled
                    if (scope && animating){
                        animating = false;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'animating', scope);
                    }

                    return;
                }
                
                let lastCheckpoint = ++checkpoint, startTimestamp: DOMHighResTimeStamp = null, done = false;
                let end = () => {
                    let isFirst = true;
                    
                    done = true;
                    unhandledKeys.forEach((key) => {
                        let animator = animators[key];
                        animator.step(isFirst, element, show, duration, duration, (time: number, duration: number) => {
                            if (usingDefaultEase && animator.getPreferredEase){
                                return (animator.getPreferredEase() || ease)(time, duration, ...easeArgs);
                            }
                            return ease(time, duration, ...easeArgs);
                        }, args);
                        isFirst = false;
                    });

                    if (element){
                        element.dispatchEvent(new CustomEvent('animation.leaving', {
                            detail: { show: show },
                        }));
                    }
                    
                    if (afterCallback){
                        afterCallback(show);
                    }

                    if (element){
                        element.dispatchEvent(new CustomEvent('animation.leave', {
                            detail: { show: show },
                        }));
                    }
                    
                    if (animating){
                        animating = false;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'animating', scope);
                    }

                    isFirst = true;
                    unhandledKeys.forEach((key) => {
                        if (animators[key].after){
                            animators[key].after(isFirst, element, show);
                        }
                        isFirst = false;
                    });
                };
                
                let pass = (timestamp: DOMHighResTimeStamp) => {
                    if (startTimestamp === null){
                        startTimestamp = timestamp;
                    }
    
                    if (done || lastCheckpoint != checkpoint){
                        return;
                    }

                    let ellapsed = (timestamp - startTimestamp), isFirst = true;
                    if (ellapsed < duration){
                        unhandledKeys.forEach(key => {
                            let animator = animators[key];
                            animator.step(isFirst, element, show, ellapsed, duration, (time: number, duration: number) => {
                                if (usingDefaultEase && animator.getPreferredEase){
                                    return (animator.getPreferredEase() || ease)(time, duration, ...easeArgs);
                                }
                                return ease(time, duration, ...easeArgs);
                            }, args);
                            isFirst = false;
                        });
                        requestAnimationFrame(pass);
                    }
                    else{//End
                        end();
                    }
                };

                let isFirst = true;
                unhandledKeys.forEach((key) => {
                    if (animators[key].before){
                        animators[key].before(isFirst, element, show);
                    }
                    isFirst = false;
                });

                setTimeout(() => {//Watcher
                    if (!done && lastCheckpoint == checkpoint){
                        end();
                    }
                }, (duration + 100));

                requestAnimationFrame(pass);
                if (element){
                    element.dispatchEvent(new CustomEvent('animation.enter', {
                        detail: { show: show },
                    }));
                }
            };
        }

        public static AddAll(){
            CoreDirectiveHandlers.PrepareAnimation = AnimateDirectiveHandlers.PrepareAnimation;

            DirectiveHandlerManager.AddHandler('animate', AnimateDirectiveHandlers.Animate);
            DirectiveHandlerManager.AddHandler('animateInner', AnimateDirectiveHandlers.AnimateInner);
            DirectiveHandlerManager.AddHandler('busyView', AnimateDirectiveHandlers.BusyView);
            DirectiveHandlerManager.AddHandler('typewriter', AnimateDirectiveHandlers.Typewriter);

            ExtendedDirectiveHandlers.BuildGlobal('animate');
            ExtendedDirectiveHandlers.BuildGlobal('busyView');
        }
    }

    (function(){
        AnimateDirectiveHandlers.AddAll();
    })();
}