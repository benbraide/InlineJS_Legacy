declare namespace InlineJS {
    interface Animator {
        handle?: (element: HTMLElement, show: boolean, duration: number) => boolean;
        step?: (isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number) => void;
    }
    class OpacityAnimator implements Animator {
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number): void;
    }
    class WidthHeightAnimator implements Animator {
        private type_;
        private reversed_;
        constructor(type_: 'both' | 'width' | 'height', reversed_: boolean);
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number): void;
    }
    class ZoomAnimator implements Animator {
        private type_;
        private direction_;
        constructor(type_: 'both' | 'width' | 'height', direction_: 'in' | 'out');
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number): void;
    }
    class RotationAnimator implements Animator {
        private type_;
        private direction_;
        private angle_;
        constructor(type_: 'x' | 'y' | 'z', direction_: 'clockwise' | 'counterclockwise', angle_: number);
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number): void;
    }
    class SlideAnimator implements Animator {
        private direction_;
        constructor(direction_: 'down' | 'left' | 'up' | 'right');
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: (time: number, duration: number) => number): void;
    }
    let Animators: {
        opacity: OpacityAnimator;
        height: WidthHeightAnimator;
        'height-reverse': WidthHeightAnimator;
        width: WidthHeightAnimator;
        'width-reverse': WidthHeightAnimator;
        'width-height': WidthHeightAnimator;
        'width-height-reverse': WidthHeightAnimator;
        zoom: ZoomAnimator;
        'zoom-height': ZoomAnimator;
        'zoom-width': ZoomAnimator;
        'zoom-in': ZoomAnimator;
        'zoom-in-height': ZoomAnimator;
        'zoom-in-width': ZoomAnimator;
        'zoom-out': ZoomAnimator;
        'zoom-out-height': ZoomAnimator;
        'zoom-out-width': ZoomAnimator;
        rotate: RotationAnimator;
        'rotate-x': RotationAnimator;
        'rotate-y': RotationAnimator;
        'rotate-z': RotationAnimator;
        'rotate-reverse': RotationAnimator;
        'rotate-x-reverse': RotationAnimator;
        'rotate-y-reverse': RotationAnimator;
        'rotate-z-reverse': RotationAnimator;
        slide: SlideAnimator;
        'slide-down': SlideAnimator;
        'slide-left': SlideAnimator;
        'slide-up': SlideAnimator;
        'slide-right': SlideAnimator;
    };
    class AnimationEasings {
        static linear(time: number, duration: number): number;
        static back(time: number, duration: number): number;
        static bounce(time: number, duration: number): number;
    }
    class AnimateDirectiveHandlers {
        static Animate(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static Typewriter(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static InitAnimation(element: HTMLElement, options: Array<string>, callback?: (key: string) => void): Record<string, Animator>;
        static PrepareAnimation(element: HTMLElement, options: Array<string>): (show: boolean, beforeCallback?: (show?: boolean) => void, afterCallback?: (show?: boolean) => void) => void;
        static AddAll(): void;
    }
}
