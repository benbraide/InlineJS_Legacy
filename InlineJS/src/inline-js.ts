export namespace InlineJS{
    export class Stack<T>{
        private list_: Array<T> = new Array<T>();

        public Push(value: T): void{
            this.list_.push(value);
        }

        public Pop(): T{
            return this.list_.pop();
        }

        public Peek(): T{
            return ((this.list_.length == 0) ? null : this.list_[this.list_.length - 1]);
        }

        public IsEmpty(): boolean{
            return (this.list_.length == 0);
        }
    }
    
    export interface ElementScope{
        key: string;
        element: HTMLElement;
        locals: Map<string, any>;
        uninitCallbacks: Array<() => void>;
    }

    export interface ExternalCallbacks{
        isEqual: (first: any, second: any) => boolean;
        deepCopy: (target: any) => any;
    }

    export class RegionMap{
        public static entries = new Map<string, Region>();
    }
    
    export class Region{
        public static externalCallbacks: ExternalCallbacks;
        
        private elementScopes_: Map<string, ElementScope>;
        private lastElementId_: number;
        private state_ = new State();
        private changes_ = new Changes();
        private proxies_: Map<string, Proxy>;

        public constructor(private id_: string, private rootElement_: HTMLElement){}

        public GetId(){
            return this.id_;
        }

        public GetRootElement(){
            return this.rootElement_;
        }

        public GetElementAncestor(target: HTMLElement, index: number): HTMLElement{
            if (!target || target === this.rootElement_){
                return null;
            }

            let ancestor = target;
            for (; 0 < index && ancestor && ancestor !== this.rootElement_; --index){
                ancestor = ancestor.parentElement;
            }

            return ((0 < index) ? null : ancestor);
        }

        public GetElementScope(element: HTMLElement | string): ElementScope{
            let key: string;
            if (typeof element === 'string'){
                key = element;
            }
            else{//HTMLElement
                key = element.getAttribute(Region.GetElementKeyName());
            }

            return ((key && key in this.elementScopes_) ? this.elementScopes_[key] : null);
        }

        public GetElementLocals(element: HTMLElement | string, always: boolean = false){
            if (always && typeof element !== 'string'){
                return this.AddElement(element);
            }
            
            let scope = this.GetElementScope(element);
            return (scope ? scope.uninitCallbacks : null);
        }

        public GetState(){
            return this.state_;
        }

        public GetChanges(){
            return this.changes_;
        }

        public GetProxies(){
            return this.proxies_;
        }

        public FindProxy(name: string): Proxy{
            return ((name in this.proxies_) ? this.proxies_[name] : null);
        }

        public AddElement(element: HTMLElement, check: boolean = true): ElementScope{
            if (check){//Check for existing
                let scope = this.GetElementScope(element);
                if (scope){
                    return scope;
                }
            }

            let id: number;
            if (!this.lastElementId_){
                id = (this.lastElementId_ = 0);
            }
            else{
                id = ++this.lastElementId_;
            }

            let key = `${this.id_}.${id}`;
            this.elementScopes_[key] = {
                key: key,
                element: element,
                locals: new Map<string, any>(),
                uninitCallbacks: new Array<() => void>()
            };

            return this.elementScopes_[key];
        }
        
        public RemoveElement(element: HTMLElement | string): void{
            let scope = this.GetElementScope(element);
            if (scope){
                scope.uninitCallbacks.forEach((callback) => {
                    callback();
                });

                delete this.elementScopes_[scope.key];
            }
            
            if (element === this.rootElement_){//Remove from map
                delete RegionMap.entries[this.id_];
            }
        }

        public static Get(id: string): Region{
            return ((id in RegionMap.entries) ? RegionMap.entries[id] : null);
        }

        public static Find(elementId: string): Region{
            let element = document.getElementById(elementId);
            if (!element && !(element = document.querySelector(`[data-id="${elementId}"]`))){
                return null;//Target element not found
            }

            let key = element.getAttribute(Region.GetElementKeyName());
            return (key ? Region.Get(key.split('.')[0]) : null);
        }

        public static IsEqual(first: any, second: any): boolean{
            return (Region.externalCallbacks.isEqual ? Region.externalCallbacks.isEqual(first, second) : (first === second));
        }

        public static DeepCopy(target: any): any{
            return (Region.externalCallbacks.deepCopy ? Region.externalCallbacks.deepCopy(target) : target);
        }

        public static GetElementKeyName(){
            return '__inlinejs_key__';
        }
    }

    export class State{
        private elementContext_ = new Stack<HTMLElement>();
        private eventContext_ = new Stack<Event>();

        pu

        public PushElementContext(element: HTMLElement): void{
            this.elementContext_.Push(element);
        }

        public PopElementContext(): HTMLElement{
            return this.elementContext_.Pop();
        }

        public GetElementContext(): HTMLElement{
            return this.elementContext_.Peek();
        }

        public PushEventContext(Value: Event): void{
            this.eventContext_.Push(Value);
        }

        public PopEventContext(): Event{
            return this.eventContext_.Pop();
        }

        public GetEventContext(): Event{
            return this.eventContext_.Peek();
        }
    }

    export class Changes{}

    export class Proxy{}
}