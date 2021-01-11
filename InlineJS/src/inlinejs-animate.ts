namespace InlineJS{
    export interface Animator{
        handle?: (element: HTMLElement, show: boolean, duration: number) => boolean;
        step?: (isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number) => void;
    }

    export class OpacityAnimator implements Animator{
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
            element.style.opacity = (show ? ease(ellapsed, duration) : (1 - ease(ellapsed, duration))).toString();
        }
    }

    export class WidthHeightAnimator implements Animator{
        public constructor(private type_: 'both' | 'width' | 'height', private reversed_: boolean){}

        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
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
        public constructor(private type_: 'both' | 'width' | 'height', private direction_: 'in' | 'out'){}

        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
            let value = ease(ellapsed, duration);
            if ((show && this.direction_ === 'out') || (!show && this.direction_ === 'in')){
                value = (1 - value);
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
        public constructor(private type_: 'x' | 'y' | 'z', private direction_: 'clockwise' | 'counterclockwise', private angle_: number){}

        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
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
        public constructor(private direction_: 'down' | 'left' | 'up' | 'right'){}
        
        public step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number){
            let value = (show ? (1 - ease(ellapsed, duration)) : ease(ellapsed, duration));

            if (this.direction_ === 'down'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` translateY(${(value * 9999)}px)`);
            }
            else if (this.direction_ === 'left'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` translateX(${-(value * 9999)}px)`);
            }
            else if (this.direction_ === 'up'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` translateY(${-(value * 9999)}px)`);
            }
            else if (this.direction_ === 'right'){
                element.style.transform = ((isFirst ? '' : element.style.transform) + ` translateX(${(value * 9999)}px)`);
            }
        }
    }

    export let Animators = {
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
        'slide-right': new SlideAnimator('right'),
    };

    export class AnimationEasings{
        public static linear(time: number, duration: number){
            return (time / duration);
        }

        public static back(time: number, duration: number){
            let fraction = (1 - (time / duration));
            return (1 - (fraction * fraction * ((2.70158 * fraction) - 1.70158)));
        }
        
        public static bounce(time: number, duration: number){
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
    }
    
    export class AnimateDirectiveHandlers{
        public static Animate(region: Region, element: HTMLElement, directive: Directive){
            let animator = AnimateDirectiveHandlers.PrepareAnimation(element, directive.arg.options);
            if (!animator){
                return DirectiveHandlerReturn.Nil;
            }

            let regionId = region.GetId(), lastValue = null;
            region.GetState().TrapGetAccess(() => {
                let value = !! CoreDirectiveHandlers.Evaluate(Region.Get(regionId), element, directive.value);
                if (lastValue !== value){
                    lastValue = value;
                    animator(lastValue);
                }
            }, true, element);

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

        public static InitAnimation(element: HTMLElement, options: Array<string>, callback?: (key: string) => void){
            let animators: Record<string, Animator> = {};
            options.forEach((key) => {
                if (key in Animators){
                    animators[key] = ((typeof Animators[key] === 'function') ? (Animators[key] as (element: HTMLElement) => Animator)(element) : Animators[key]);
                }
                else if (callback){
                    callback(key);
                }
            });

            return animators;
        }

        public static PrepareAnimation(element: HTMLElement, options: Array<string>){
            let duration: number = null, ease: (time: number, duration: number) => number;
            let animators = AnimateDirectiveHandlers.InitAnimation(element, options, (key) => {
                if (key in AnimationEasings){
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
                    duration = CoreDirectiveHandlers.ExtractDuration(key, null);
                    break;
                }
            });

            let keys = Object.keys(animators);
            if (keys.length == 0){//Default
                animators['opacity'] = ((typeof Animators.opacity === 'function') ? (Animators.opacity as (element: HTMLElement) => Animator)(element) : Animators.opacity);
                keys.push('opacity');
            }

            duration = (duration || 300);
            if (!ease){
                ease = (time: number, duration: number) => {
                    return ((time < duration) ? (-1 * Math.cos(time / duration * (Math.PI / 2)) + 1) : 1);
                };
            }

            let checkpoint = 0;
            return (show: boolean, beforeCallback?: (show?: boolean) => void, afterCallback?: (show?: boolean) => void) => {
                element.dispatchEvent(new CustomEvent('animation.entering'));
                if (beforeCallback){
                    beforeCallback(show);
                }
                
                let unhandledKeys = new Array<string>();
                keys.forEach((key) => {
                    if (!animators[key].handle || !animators[key].handle(element, show, duration)){
                        unhandledKeys.push(key);
                    }
                });
                
                if (unhandledKeys.length == 0){//All animations handled
                    return;
                }
                
                let lastCheckpoint = ++checkpoint, startTimestamp: DOMHighResTimeStamp = null, done = false;
                let end = () => {
                    let isFirst = true;
                    
                    done = true;
                    unhandledKeys.forEach((key) => {
                        animators[key].step(isFirst, element, show, duration, duration, ease);
                        isFirst = false;
                    });

                    element.dispatchEvent(new CustomEvent('animation.leaving'));
                    if (afterCallback){
                        afterCallback(show);
                    }

                    element.dispatchEvent(new CustomEvent('animation.leave'));
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
                            animators[key].step(isFirst, element, show, ellapsed, duration, ease);
                            isFirst = false;
                        });
                        requestAnimationFrame(pass);
                    }
                    else{//End
                        end();
                    }
                };

                setTimeout(() => {//Watcher
                    if (!done && lastCheckpoint == checkpoint){
                        end();
                    }
                }, (duration + 100));

                requestAnimationFrame(pass);
                element.dispatchEvent(new CustomEvent('animation.enter'));
            };
        }

        public static AddAll(){
            CoreDirectiveHandlers.PrepareAnimation = AnimateDirectiveHandlers.PrepareAnimation;

            DirectiveHandlerManager.AddHandler('animate', AnimateDirectiveHandlers.Animate);
            DirectiveHandlerManager.AddHandler('typewriter', AnimateDirectiveHandlers.Typewriter);

            [30, 45, 90, 180, 270, 315, 360].forEach((angle) => {
                Animators[`rotate-${angle}`] = new RotationAnimator('z', 'clockwise', angle);
                Animators[`rotate-x-${angle}`] = new RotationAnimator('x', 'clockwise', angle);
                Animators[`rotate-y-${angle}`] = new RotationAnimator('y', 'clockwise', angle);
                Animators[`rotate-z-${angle}`] = new RotationAnimator('z', 'clockwise', angle);

                Animators[`rotate-${angle}-reverse`] = new RotationAnimator('z', 'counterclockwise', angle);
                Animators[`rotate-x-${angle}-reverse`] = new RotationAnimator('x', 'counterclockwise', angle);
                Animators[`rotate-y-${angle}-reverse`] = new RotationAnimator('y', 'counterclockwise', angle);
                Animators[`rotate-z-${angle}-reverse`] = new RotationAnimator('z', 'counterclockwise', angle);
            });
        }
    }

    (function(){
        AnimateDirectiveHandlers.AddAll();
    })();
}