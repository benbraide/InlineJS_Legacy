declare namespace InlineJS {
    type AnimatorEaseType = (time: number, duration: number) => number;
    type AnimatorEaseTypeWithArgs = (time: number, duration: number, ...args: Array<number>) => number;
    interface StepEaseInfo {
        target: AnimatorEaseType;
        args: Array<number>;
    }
    class AnimationEasings {
        static linear(time: number, duration: number): number;
        static back(time: number, duration: number): number;
        static backIn(time: number, duration: number): number;
        static backOut(time: number, duration: number): number;
        static backInOut(time: number, duration: number): number;
        static bounce(time: number, duration: number): number;
        static bounceIn(time: number, duration: number): number;
        static bounceOut(time: number, duration: number): number;
        static bounceInOut(time: number, duration: number): number;
        static circle(time: number, duration: number): number;
        static circleIn(time: number, duration: number): number;
        static circleOut(time: number, duration: number): number;
        static circleInOut(time: number, duration: number): number;
        static cubic(time: number, duration: number): number;
        static cubicIn(time: number, duration: number): number;
        static cubicOut(time: number, duration: number): number;
        static cubicInOut(time: number, duration: number): number;
        static elastic(time: number, duration: number): number;
        static elasticIn(time: number, duration: number): number;
        static elasticOut(time: number, duration: number): number;
        static elasticInOut(time: number, duration: number): number;
        static exponential(time: number, duration: number): number;
        static exponentialIn(time: number, duration: number): number;
        static exponentialOut(time: number, duration: number): number;
        static exponentialInOut(time: number, duration: number): number;
        static quadratic(time: number, duration: number): number;
        static quadraticIn(time: number, duration: number): number;
        static quadraticOut(time: number, duration: number): number;
        static quadraticInOut(time: number, duration: number): number;
        static quart(time: number, duration: number): number;
        static quartIn(time: number, duration: number): number;
        static quartOut(time: number, duration: number): number;
        static quartInOut(time: number, duration: number): number;
        static quint(time: number, duration: number): number;
        static quintIn(time: number, duration: number): number;
        static quintOut(time: number, duration: number): number;
        static quintInOut(time: number, duration: number): number;
        static sine(time: number, duration: number): number;
        static sineIn(time: number, duration: number): number;
        static sineOut(time: number, duration: number): number;
        static sineInOut(time: number, duration: number): number;
        static bezier(time: number, duration: number, first: number, second: number, third: number, fourth: number): number;
    }
    interface Animator {
        init?: (options: Array<string>, nextOptionIndex: number, element?: HTMLElement) => number;
        handle?: (element: HTMLElement, show: boolean, duration: number, ease: AnimatorEaseType, args?: any) => boolean;
        step?: (isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType, args?: any) => void;
        before?: (isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
        after?: (isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
        isExclusive?: () => boolean;
        getPreferredEase?: (show?: boolean) => StepEaseInfo;
    }
    class NullAnimator implements Animator {
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType): void;
    }
    class OpacityAnimator implements Animator {
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType): void;
    }
    class WidthHeightAnimator implements Animator {
        private type_;
        private reversed_;
        constructor(type_: 'both' | 'width' | 'height', reversed_: boolean);
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType): void;
    }
    class ZoomAnimator implements Animator {
        private type_;
        private direction_;
        private scale_;
        private static preferredEase_;
        constructor(type_: 'both' | 'width' | 'height', direction_: 'in' | 'out', scale_?: number);
        init(options: Array<string>, nextOptionIndex: number): 1 | 0;
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType): void;
        getPreferredEase(show?: boolean): StepEaseInfo;
    }
    class RotationAnimator implements Animator {
        private type_;
        private direction_;
        private angle_;
        constructor(type_: 'x' | 'y' | 'z', direction_: 'clockwise' | 'counterclockwise', angle_?: number);
        init(options: Array<string>, nextOptionIndex: number): 1 | 0;
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType): void;
    }
    class SlideAnimator implements Animator {
        private direction_;
        private displacement_;
        private static preferredEase_;
        constructor(direction_: 'down' | 'left' | 'up' | 'right', displacement_?: number);
        init(options: Array<string>, nextOptionIndex: number): 1 | 0;
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType): void;
        getPreferredEase(show?: boolean): StepEaseInfo;
    }
    interface CounterAnimatorArg {
        value: any;
        callback: (result: any) => void;
    }
    class CounterAnimator implements Animator {
        private direction_;
        private offset_;
        private round_;
        private arg_;
        constructor(direction_: 'down' | 'up', offset_?: number, round_?: number);
        init(options: Array<string>, nextOptionIndex: number, element: HTMLElement): number;
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType, args?: any): void;
        private doStep_;
    }
    interface SceneAnimatorHandler {
        handle: (frame: number, isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
        getPreferredEase: (show?: boolean) => StepEaseInfo;
    }
    class SceneAnimator implements Animator {
        private handler_;
        constructor(handler_: SceneAnimatorHandler);
        step(isFirst: boolean, element: HTMLElement, show: boolean, ellapsed: number, duration: number, ease: AnimatorEaseType, args?: any): void;
        getPreferredEase(show?: boolean): StepEaseInfo;
        static setTransform(isFirst: boolean, element: HTMLElement, value: string): void;
    }
    interface GenericSceneAnimatorHandlerFrame {
        from: number;
        to: number;
    }
    interface GenericSceneAnimatorHandlerFrameInfo {
        frames: Array<GenericSceneAnimatorHandlerFrame> | GenericSceneAnimatorHandlerFrame;
        callback: (frame: number, inside: GenericSceneAnimatorHandlerFrame, isFirst?: boolean, element?: HTMLElement, show?: boolean) => void;
    }
    class GenericSceneAnimatorHandler implements SceneAnimatorHandler {
        private frames_;
        private wildcardFrame_;
        private preferredShowEase_;
        private preferredHideEase_;
        constructor(frames_: Array<GenericSceneAnimatorHandlerFrameInfo>, preferredShowEase?: AnimatorEaseType | StepEaseInfo, preferredHideEase?: AnimatorEaseType | StepEaseInfo);
        handle(frame: number, isFirst?: boolean, element?: HTMLElement, show?: boolean): void;
        getPreferredEase(show?: boolean): StepEaseInfo;
        static getFrameInside(frame: number, frames: Array<GenericSceneAnimatorHandlerFrame> | GenericSceneAnimatorHandlerFrame): GenericSceneAnimatorHandlerFrame;
        static advance(from: number, to: number, frame: number, insideFrom: number, insideTo: number): number;
    }
    class ShakeSceneAnimatorHandler extends GenericSceneAnimatorHandler {
        private type_;
        private action_;
        private conductor_;
        private multiplier_;
        private unit_;
        constructor(type_: 'x' | 'y' | 'z', action_: 'translate' | 'rotate');
    }
    class HeartbeatSceneAnimatorHandler extends GenericSceneAnimatorHandler {
        constructor();
    }
    class PulseSceneAnimatorHandler extends GenericSceneAnimatorHandler {
        constructor();
    }
    class TadaSceneAnimatorHandler extends GenericSceneAnimatorHandler {
        constructor();
    }
    class JelloSceneAnimatorHandler extends GenericSceneAnimatorHandler {
        constructor();
    }
    class RubberBandSceneAnimatorHandler extends GenericSceneAnimatorHandler {
        constructor();
    }
    class SwingSceneAnimatorHandler extends GenericSceneAnimatorHandler {
        constructor();
    }
    let Animators: {
        null: () => NullAnimator;
        opacity: () => OpacityAnimator;
        height: () => WidthHeightAnimator;
        heightReverse: () => WidthHeightAnimator;
        width: () => WidthHeightAnimator;
        widthReverse: () => WidthHeightAnimator;
        widthHeight: () => WidthHeightAnimator;
        widthHeightReverse: () => WidthHeightAnimator;
        zoom: () => ZoomAnimator;
        zoomHeight: () => ZoomAnimator;
        zoomWidth: () => ZoomAnimator;
        zoomIn: () => ZoomAnimator;
        zoomInHeight: () => ZoomAnimator;
        zoomInWidth: () => ZoomAnimator;
        zoomOut: () => ZoomAnimator;
        zoomOutHeight: () => ZoomAnimator;
        zoomOutWidth: () => ZoomAnimator;
        rotate: () => RotationAnimator;
        rotateX: () => RotationAnimator;
        rotateY: () => RotationAnimator;
        rotateZ: () => RotationAnimator;
        rotateReverse: () => RotationAnimator;
        rotateXReverse: () => RotationAnimator;
        rotateYReverse: () => RotationAnimator;
        rotateZReverse: () => RotationAnimator;
        slide: () => SlideAnimator;
        slideDown: () => SlideAnimator;
        slideLeft: () => SlideAnimator;
        slideUp: () => SlideAnimator;
        slideRight: () => SlideAnimator;
        counter: () => CounterAnimator;
        counterUp: () => CounterAnimator;
        counterDown: () => CounterAnimator;
        shake: () => SceneAnimator;
        shakeX: () => SceneAnimator;
        shakeY: () => SceneAnimator;
        shakeZ: () => SceneAnimator;
        vibrate: () => SceneAnimator;
        vibrateX: () => SceneAnimator;
        vibrateY: () => SceneAnimator;
        vibrateZ: () => SceneAnimator;
        heartbeat: () => SceneAnimator;
        heartBeat: () => SceneAnimator;
        pulse: () => SceneAnimator;
        tada: () => SceneAnimator;
        jello: () => SceneAnimator;
        rubberband: () => SceneAnimator;
        rubberBand: () => SceneAnimator;
        swing: () => SceneAnimator;
    };
    class AnimateDirectiveHandlers {
        static Animate(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static AnimateInner(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static BusyView(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn;
        static Typewriter(region: Region, element: HTMLElement, directive: Directive): DirectiveHandlerReturn.Nil | DirectiveHandlerReturn.Handled;
        static InitAnimation(element: HTMLElement, options: Array<string>, callback?: (key: string, index: number) => number): Record<string, Animator>;
        static PrepareAnimation(region: Region, element: HTMLElement, options: Array<string>): (show: boolean, beforeCallback?: (show?: boolean) => void, afterCallback?: (show?: boolean) => void, args?: any) => void;
        static AddAll(): void;
    }
}
