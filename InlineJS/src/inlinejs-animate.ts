namespace InlineJS{
    export type AnimatorEaseType = (time: number, duration: number) => number;
    export type AnimatorEaseTypeWithArgs = (time: number, duration: number, ...args: Array<number>) => number;
    
    export interface StepEaseInfo{
        target: AnimatorEaseType;
        args: Array<number>;
    }
    
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
    
    export interface Animator{
        init?: (options: Array<string>, nextOptionIndex: number, element?: HTMLElement) => number;
        handle?: (element: HTMLElement, show: boolean, duration: number, ease: AnimatorEaseType, args?: any) => boolean;
        step?: (isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType, args?: any) => void;
        before?: (isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
        after?: (isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
        isExclusive?: () => boolean;
        getPreferredEase?: (show?: boolean) => StepEaseInfo;
    }

    export class NullAnimator implements Animator{
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType){}
    }

    export class OpacityAnimator implements Animator{
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType){
            if (element){
                element.style.opacity = (show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration))).toString();
            }
        }
    }

    export class WidthHeightAnimator implements Animator{
        public constructor(private type_: 'both' | 'width' | 'height', private reversed_: boolean){}

        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType){
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
        private static preferredEase_: StepEaseInfo = {
            target: AnimationEasings.back,
            args: [],
        };
        
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
        
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType){
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

        public getPreferredEase(show?: boolean){
            return (show ? ZoomAnimator.preferredEase_ : null);
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
        
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType){
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
        private static preferredEase_: StepEaseInfo = {
            target: AnimationEasings.back,
            args: [],
        };
        
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
        
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType){
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

        public getPreferredEase(show?: boolean){
            return (show ? SlideAnimator.preferredEase_ : null);
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
        
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType, args?: any){
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
        getPreferredEase: (show?: boolean) => StepEaseInfo;
    }
    
    export class SceneAnimator implements Animator{
        public constructor(private handler_: SceneAnimatorHandler){}

        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType, args?: any){
            this.handler_.handle(((show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration))) * 100), isFirst, element, show);
        }

        public getPreferredEase(show?: boolean){
            return this.handler_.getPreferredEase(show);
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
        private preferredShowEase_: StepEaseInfo = null;
        private preferredHideEase_: StepEaseInfo = null;
        
        public constructor(private frames_: Array<GenericSceneAnimatorHandlerFrameInfo>, preferredShowEase: AnimatorEaseType | StepEaseInfo = null, preferredHideEase: AnimatorEaseType | StepEaseInfo = null){
            if (typeof preferredShowEase === 'function'){
                this.preferredShowEase_ = {
                    target: preferredShowEase,
                    args: [],
                };
            }
            else{
                this.preferredShowEase_ = preferredShowEase;
            }

            if (typeof preferredHideEase === 'function'){
                this.preferredHideEase_ = {
                    target: preferredHideEase,
                    args: [],
                };
            }
            else{
                this.preferredHideEase_ = preferredHideEase;
            }
            
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

        public getPreferredEase(show?: boolean){
            return (show ? this.preferredShowEase_ : this.preferredHideEase_);
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

        public static advance(from: number, to: number, frame: number, insideFrom: number, insideTo: number){
            let frameWidth = (insideTo - insideFrom), progress = ((frame - insideFrom) / frameWidth), displacement = (to - from);
            return ((displacement * progress) + from);
        }
    }

    export class ShakeSceneAnimatorHandler extends GenericSceneAnimatorHandler{
        private conductor_: string;
        private multiplier_: number;
        private unit_: string;
        
        public constructor(private type_: 'x' | 'y' | 'z', private action_: 'translate' | 'rotate'){
            super([{
                frames: { from: 0, to: 10 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `${this.conductor_}(${-GenericSceneAnimatorHandler.advance(0, this.multiplier_, frame, inside.from, inside.to)}${this.unit_})`);
                },
            }, {
                frames: [{ from: 20, to: 30 }, { from: 40, to: 50 }, { from: 60, to: 70 }, { from: 80, to: 90 }],
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `${this.conductor_}(${GenericSceneAnimatorHandler.advance(this.multiplier_, -this.multiplier_, frame, inside.from, inside.to)}${this.unit_})`);
                },
            }, {
                frames: [{ from: 10, to: 20 }, { from: 30, to: 40 }, { from: 50, to: 60 }, { from: 70, to: 80 }],
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `${this.conductor_}(${GenericSceneAnimatorHandler.advance(-this.multiplier_, this.multiplier_, frame, inside.from, inside.to)}${this.unit_})`);
                },
            }, {
                frames: { from: 90, to: 100 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `${this.conductor_}(${GenericSceneAnimatorHandler.advance(-this.multiplier_, 0, frame, inside.from, inside.to)}${this.unit_})`);
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
                frames: [{ from: 0, to: 14 }, { from: 28, to: 42 }],
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `scale(${GenericSceneAnimatorHandler.advance(1, 1.3, frame, inside.from, inside.to)})`);
                },
            }, {
                frames: [{ from: 14, to: 28 }, { from: 42, to: 70 }],
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `scale(${GenericSceneAnimatorHandler.advance(1.3, 1, frame, inside.from, inside.to)})`);
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
                frames: { from: 0, to: 50},
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(1, 1.08, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${value}, ${value}, ${value})`);
                },
            }, {
                frames: { from: 50, to: 100 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(1.08, 1, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${value}, ${value}, ${value})`);
                },
            }, {
                frames: { from: null, to: null },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, 'scale3d(1, 1, 1)');
                },
            }]);
        }
    }

    export class TadaSceneAnimatorHandler extends GenericSceneAnimatorHandler{
        public constructor(){
            super([{
                frames: { from: 0, to: 10 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let scaleValue = GenericSceneAnimatorHandler.advance(1, 0.9, frame, inside.from, inside.to);
                    let rotateValue = GenericSceneAnimatorHandler.advance(0, -3, frame, inside.from, inside.to);
                    let rotateTranslateValue = GenericSceneAnimatorHandler.advance(0, 1, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${scaleValue}, ${scaleValue}, ${scaleValue}) rotate3d(0, 0, ${rotateTranslateValue}, ${rotateValue}deg)`);
                },
            }, {
                frames: { from: 10, to: 20 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {},
            }, {
                frames: { from: 20, to: 30 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let scaleValue = GenericSceneAnimatorHandler.advance(0.9, 1.1, frame, inside.from, inside.to);
                    let rotateValue = GenericSceneAnimatorHandler.advance(-3, 3, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${scaleValue}, ${scaleValue}, ${scaleValue}) rotate3d(0, 0, 1, ${rotateValue}deg)`);
                },
            }, {
                frames: [{ from: 40, to: 50 }, { from: 60, to: 70 }, { from: 80, to: 90 }],
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let rotateValue = GenericSceneAnimatorHandler.advance(-3, 3, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, ${rotateValue}deg)`);
                },
            }, {
                frames: [{ from: 50, to: 60 }, { from: 70, to: 80 }],
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let rotateValue = GenericSceneAnimatorHandler.advance(3, -3, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, ${rotateValue}deg)`);
                },
            }, {
                frames: { from: 90, to: 100 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let scaleValue = GenericSceneAnimatorHandler.advance(1.1, 1, frame, inside.from, inside.to);
                    let rotateValue = GenericSceneAnimatorHandler.advance(3, 0, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${scaleValue}, ${scaleValue}, ${scaleValue}) rotate3d(0, 0, 1, ${rotateValue}deg)`);
                },
            }, {
                frames: { from: null, to: null },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, 'scale3d(1, 1, 1)');
                },
            }]);
        }
    }

    export class JelloSceneAnimatorHandler extends GenericSceneAnimatorHandler{
        public constructor(){
            super([{
                frames: { from: 11.1, to: 22.2 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(0, -12.5, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `skewX(${value}deg) skewY(${value}deg)`);
                },
            }, {
                frames: { from: 22.2, to: 33.3 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(-12.5, 6.25, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `skewX(${value}deg) skewY(${value}deg)`);
                },
            }, {
                frames: { from: 33.3, to: 44.4 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(6.25, -3.125, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `skewX(${value}deg) skewY(${value}deg)`);
                },
            }, {
                frames: { from: 44.4, to: 55.5 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(-3.125, 1.5625, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `skewX(${value}deg) skewY(${value}deg)`);
                },
            }, {
                frames: { from: 55.5, to: 66.6 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(1.5625, -0.78125, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `skewX(${value}deg) skewY(${value}deg)`);
                },
            }, {
                frames: { from: 66.6, to: 77.7 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(-0.78125, 0.390625, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `skewX(${value}deg) skewY(${value}deg)`);
                },
            }, {
                frames: { from: 77.7, to: 88.8 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(0.390625, -0.1953125, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `skewX(${value}deg) skewY(${value}deg)`);
                },
            }, {
                frames: { from: 88.8, to: 100 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let value = GenericSceneAnimatorHandler.advance(-0.1953125, 0, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `skewX(${value}deg) skewY(${value}deg)`);
                },
            }, {
                frames: { from: null, to: null },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, 'translate3d(0, 0, 0)');
                },
            }]);
        }
    }

    export class RubberBandSceneAnimatorHandler extends GenericSceneAnimatorHandler{
        public constructor(){
            super([{
                frames: { from: 0, to: 30 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let xValue = GenericSceneAnimatorHandler.advance(1, 1.25, frame, inside.from, inside.to);
                    let yValue = GenericSceneAnimatorHandler.advance(1, 0.75, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${xValue}, ${yValue}, 1)`);
                },
            }, {
                frames: { from: 30, to: 40 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let xValue = GenericSceneAnimatorHandler.advance(1.25, 0.75, frame, inside.from, inside.to);
                    let yValue = GenericSceneAnimatorHandler.advance(0.75, 1.25, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${xValue}, ${yValue}, 1)`);
                },
            }, {
                frames: { from: 40, to: 50 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let xValue = GenericSceneAnimatorHandler.advance(0.75, 1.15, frame, inside.from, inside.to);
                    let yValue = GenericSceneAnimatorHandler.advance(1.25, 0.85, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${xValue}, ${yValue}, 1)`);
                },
            }, {
                frames: { from: 50, to: 65 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let xValue = GenericSceneAnimatorHandler.advance(1.15, 0.95, frame, inside.from, inside.to);
                    let yValue = GenericSceneAnimatorHandler.advance(0.85, 1.05, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${xValue}, ${yValue}, 1)`);
                },
            }, {
                frames: { from: 65, to: 75 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let xValue = GenericSceneAnimatorHandler.advance(0.95, 1.05, frame, inside.from, inside.to);
                    let yValue = GenericSceneAnimatorHandler.advance(1.05, 0.95, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${xValue}, ${yValue}, 1)`);
                },
            }, {
                frames: { from: 75, to: 100 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    let xValue = GenericSceneAnimatorHandler.advance(1.05, 1, frame, inside.from, inside.to);
                    let yValue = GenericSceneAnimatorHandler.advance(0.95, 1, frame, inside.from, inside.to);
                    SceneAnimator.setTransform(isFirst, element, `scale3d(${xValue}, ${yValue}, 1)`);
                },
            }, {
                frames: { from: null, to: null },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, 'scale3d(1, 1, 1)');
                },
            }]);
        }
    }

    export class SwingSceneAnimatorHandler extends GenericSceneAnimatorHandler{
        public constructor(){
            super([{
                frames: { from: 0, to: 20 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `rotate3d(0, 0, 1, ${GenericSceneAnimatorHandler.advance(0, 15, frame, inside.from, inside.to)}deg)`);
                },
            }, {
                frames: { from: 20, to: 40 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `rotate3d(0, 0, 1, ${GenericSceneAnimatorHandler.advance(15, -10, frame, inside.from, inside.to)}deg)`);
                },
            }, {
                frames: { from: 40, to: 60 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `rotate3d(0, 0, 1, ${GenericSceneAnimatorHandler.advance(-10, 5, frame, inside.from, inside.to)}deg)`);
                },
            }, {
                frames: { from: 60, to: 80 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `rotate3d(0, 0, 1, ${GenericSceneAnimatorHandler.advance(5, -5, frame, inside.from, inside.to)}deg)`);
                },
            }, {
                frames: { from: 80, to: 100 },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, `rotate3d(0, 0, 1, ${GenericSceneAnimatorHandler.advance(-5, 0, frame, inside.from, inside.to)}deg)`);
                },
            }, {
                frames: { from: null, to: null },
                callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => {
                    SceneAnimator.setTransform(isFirst, element, 'rotate3d(0, 1, 1, 0deg)');
                },
            }]);
        }
    }

    export let Animators = {
        null: () => new NullAnimator(),
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
        tada: () => new SceneAnimator(new TadaSceneAnimatorHandler()),
        jello: () => new SceneAnimator(new JelloSceneAnimatorHandler()),
        rubberband: () => new SceneAnimator(new RubberBandSceneAnimatorHandler()),
        rubberBand: () => new SceneAnimator(new RubberBandSceneAnimatorHandler()),
        swing: () => new SceneAnimator(new SwingSceneAnimatorHandler()),
    };

    export interface TypewriterInfo{
        list: Array<string>;
        delay: number;
        interval: number;
        iterations: number;
        showDelete: boolean;
        useRandom: boolean;
        showCursor: boolean;
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
                    animator(lastValue, null, null, undefined, (lastValue ? hideOnly : showOnly));
                }
            }, true, element);

            return DirectiveHandlerReturn.Handled;
        }

        public static AnimateInner(region: Region, element: HTMLElement, directive: Directive){
            let animators = Array.from(element.children).map(child => AnimateDirectiveHandlers.PrepareAnimation(region, (child as HTMLElement), directive.arg.options));
            if (animators.length == 0){
                return DirectiveHandlerReturn.Nil;
            }

            let regionId = region.GetId(), isOnce = directive.arg.options.includes('once'), concurrent = directive.arg.options.includes('concurrent'), lastValue = null, nextIndex = 0, animateNext = () => {
                if (!lastValue){
                    return;
                }
                
                if (animators.length <= nextIndex){
                    nextIndex = 0;
                    if (isOnce){
                        return;
                    }
                }

                if (concurrent){
                    animators.forEach((animator) => {
                        animator(true, null, () => {
                            animator(false, null, () => {
                                if (animators.length <= ++nextIndex){
                                    animateNext();
                                }
                            });
                        });
                    });
                }
                else{
                    let animator = animators[nextIndex];
                    animator(true, null, () => {
                        animator(false);
                        animateNext();
                    });

                    ++nextIndex;
                }
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
            container.setAttribute(`${Region.directivePrfix}-show:animate.zoom.default-ease.faster`, `${directive.value}`);
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
            let scope = (elementScope ? ExtendedDirectiveHandlers.AddScope('busyView', elementScope, []) : null);

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

        public static InitAnimation(element: HTMLElement | ((step: number) => void), options: Array<string>, callback?: (key: string, index: number) => number){
            let animators: Record<string, Animator> = {}, index = 0, skipCount = 0;
            options.forEach((key) => {
                ++index;
                if (0 < skipCount){//Skip
                    --skipCount;
                    return;
                }
                
                key = Processor.GetCamelCaseDirectiveName(key);
                if (typeof element !== 'function' && key in Animators){
                    let animator: Animator = ((typeof Animators[key] === 'function') ? (Animators[key] as (element: HTMLElement) => Animator)(element) : Animators[key]);
                    if (animator.isExclusive && animator.isExclusive()){
                        animators = {};
                    }
                    
                    animators[key] = animator;
                    if (animator.init){
                        skipCount = animator.init(options, index, element);
                    }
                }
                else if (callback && !(key in Animators)){
                    skipCount = callback(key, index);
                }
            });

            return animators;
        }

        public static PrepareAnimation(region: Region, element: HTMLElement | ((step: number) => void), options: Array<string>){
            let duration: number = null, showEase: StepEaseInfo = null, hideEase: StepEaseInfo = null, defaultEase: StepEaseInfo = {
                target: (time: number, duration: number) => {
                    return ((time < duration) ? (-1 * Math.cos((time / duration) * (Math.PI / 2)) + 1) : 1);
                },
                args: [],
            };

            let animators = AnimateDirectiveHandlers.InitAnimation(element, options, (key, index) => {
                let skipCount = 0;
                if (key in AnimationEasings){
                    if (!showEase){
                        showEase = {
                            target: AnimationEasings[key],
                            args: [],
                        };

                        if (2 < showEase.target.length){
                            showEase.args = Array.from({length: (showEase.target.length - 2)}, () => parseInt(options[index + skipCount++]));
                        }
                    }
                    else if (!hideEase){
                        hideEase = {
                            target: AnimationEasings[key],
                            args: [],
                        };

                        if (2 < hideEase.target.length){
                            hideEase.args = Array.from({length: (hideEase.target.length - 2)}, () => parseInt(options[index + skipCount++]));
                        }
                    }

                    return skipCount;
                }

                if (key === 'defaultEase'){
                    if (!showEase){
                        showEase = defaultEase;
                    }
                    else if (!hideEase){
                        hideEase = defaultEase;
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

            let keys = Object.keys(animators);
            if (typeof element !== 'function' && keys.length == 0){//Default
                animators['opacity'] = ((typeof Animators.opacity === 'function') ? (Animators.opacity as (element: HTMLElement) => Animator)(element) : Animators.opacity);
                keys.push('opacity');
            }

            duration = (duration || 300);
            let getEase = (animator: Animator, show: boolean): StepEaseInfo => {
                if (show){
                    if (animator){
                        return (showEase || (animator.getPreferredEase ? animator.getPreferredEase(true) : null) || defaultEase);
                    }

                    return (showEase || defaultEase);
                }

                if (animator){
                    return (hideEase || (animator.getPreferredEase ? animator.getPreferredEase(false) : null) || showEase || defaultEase);
                }

                return (hideEase || showEase || defaultEase);
            };

            let checkpoint = 0, animating = false, elementScope = ((typeof element !== 'function' && element) ? region.AddElement(element, true) : null);
            let scope = (elementScope ? ExtendedDirectiveHandlers.AddScope('animate', elementScope, []) : null), regionId = region.GetId();

            let stop = (gracefully = false) => {
                ++checkpoint;
                if (gracefully && onGracefulStop){
                    onGracefulStop(true);
                }

                if (scope && animating){
                    animating = false;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                }
            };
            
            if (scope){
                elementScope.locals['$animate'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                    if (prop === 'animating' || prop === 'active'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.active`);
                        return animating;
                    }

                    if (prop === 'showing'){
                        Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.showing`);
                        return showing;
                    }

                    if (prop === 'stop'){
                        return stop;
                    }
                }, ['animating', 'active', 'showing', 'stop']);
            }
            
            let isInfinite = options.includes('infinite'), onGracefulStop: (stopped?: boolean) => void = null, showing: boolean = null;
            let animator = (show: boolean, beforeCallback?: (show?: boolean) => void, afterCallback?: (show?: boolean) => void, args?: any, skip = false) => {
                if (scope && show !== showing){
                    showing = show;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'showing', scope);
                }

                if (isInfinite && !show){
                    stop(true);
                    return;
                }
                
                if (scope && !animating){
                    animating = true;
                    ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                }
                
                if (typeof element !== 'function' && element){
                    element.dispatchEvent(new CustomEvent('animation.entering', {
                        detail: { show: show },
                    }));
                }
                
                if (beforeCallback){
                    beforeCallback(show);
                }
                
                let unhandledKeys = new Array<string>();
                if (typeof element !== 'function'){
                    keys.forEach((key) => {
                        let animator = animators[key];
                        if (!animator.handle || !animator.handle(element, show, duration, (time: number, duration: number) => {
                            let ease = getEase(animator, show);
                            return (ease.target as AnimatorEaseTypeWithArgs)(time, duration, ...ease.args);
                        }, args)){
                            unhandledKeys.push(key);
                        }
                    });
                }
                
                if (typeof element !== 'function' && unhandledKeys.length == 0){//All animations handled
                    if (scope && animating){
                        animating = false;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                    }

                    if (isInfinite){
                        setTimeout(() => {
                            animator(show, beforeCallback, afterCallback, args);
                        }, 0);
                    }

                    return;
                }

                let lastCheckpoint = ++checkpoint, startTimestamp: DOMHighResTimeStamp = null, done = false;
                let end = (stopped = false) => {
                    let isFirst = true;
                    
                    done = true;
                    if (typeof element !== 'function'){
                        unhandledKeys.forEach((key) => {
                            let animator = animators[key];
                            animator.step(isFirst, element, show, duration, duration, (time: number, duration: number) => {
                                let ease = getEase(animator, show);
                                return (ease.target as AnimatorEaseTypeWithArgs)(time, duration, ...ease.args);
                            }, args);
                            isFirst = false;
                        });
                    }
                    else{
                        let ease = getEase(null, show);
                        element((ease.target as AnimatorEaseTypeWithArgs)(duration, duration, ...ease.args));
                    }

                    if (typeof element !== 'function' && element){
                        element.dispatchEvent(new CustomEvent('animation.leaving', {
                            detail: { show: show },
                        }));
                    }
                    
                    if (afterCallback){
                        afterCallback(show);
                    }

                    if (typeof element !== 'function' && element){
                        element.dispatchEvent(new CustomEvent('animation.leave', {
                            detail: { show: show },
                        }));
                    }
                    
                    if (scope && animating){
                        animating = false;
                        ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'active', scope);
                    }

                    if (typeof element !== 'function'){
                        isFirst = true;
                        unhandledKeys.forEach((key) => {
                            if (animators[key].after){
                                animators[key].after(isFirst, element, show);
                            }
                            isFirst = false;
                        });
                    }

                    if (!stopped && isInfinite){
                        setTimeout(() => {
                            animator(show, beforeCallback, afterCallback, args);
                        }, 0);
                    }
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
                        if (typeof element !== 'function'){
                            unhandledKeys.forEach(key => {
                                let animator = animators[key];
                                animator.step(isFirst, element, show, ellapsed, duration, (time: number, duration: number) => {
                                    let ease = getEase(animator, show);
                                    return (ease.target as AnimatorEaseTypeWithArgs)(time, duration, ...ease.args);
                                }, args);
                                isFirst = false;
                            });
                        }
                        else{
                            let ease = getEase(null, show);
                            element((ease.target as AnimatorEaseTypeWithArgs)(ellapsed, duration, ...ease.args));
                        }
                        
                        requestAnimationFrame(pass);
                    }
                    else{//End
                        end();
                    }
                };

                onGracefulStop = end;
                if (typeof element !== 'function'){
                    let isFirst = true;
                    unhandledKeys.forEach((key) => {
                        if (animators[key].before){
                            animators[key].before(isFirst, element, show);
                        }
                        isFirst = false;
                    });
                }

                if (typeof element !== 'function' && element){
                    element.dispatchEvent(new CustomEvent('animation.enter', {
                        detail: { show: show },
                    }));
                }
                
                if (!skip){
                    setTimeout(() => {//Watcher
                        if (!done && lastCheckpoint == checkpoint){
                            end();
                        }
                    }, (duration + 100));
    
                    requestAnimationFrame(pass);
                }
                else{
                    end();
                }
            };

            return animator;
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