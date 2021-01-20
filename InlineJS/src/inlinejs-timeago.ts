namespace InlineJS{
    export class TimeagoDirectiveHandlers{
        public static Timeago(region: Region, element: HTMLElement, directive: Directive){
            let date = CoreDirectiveHandlers.Evaluate(region, element, directive.value);
            if (typeof date === 'string' || typeof date === 'number'){
                date = new Date(date);
            }
            else if (!(date instanceof Date)){
                if (!(element instanceof HTMLTimeElement)){
                    return DirectiveHandlerReturn.Nil;
                }

                date = new Date(element.dateTime);
            }

            let regionId = region.GetId(), timeago = Region.GetGlobalValue(regionId, '$timeago');
            if (!timeago){
                return DirectiveHandlerReturn.Nil;
            }

            let elementScope = region.AddElement(element, true);
            let scope = (elementScope ? ExtendedDirectiveHandlers.AddScope('timeago', elementScope, []) : null);

            if (!scope){
                return DirectiveHandlerReturn.Nil;
            }

            let label: string = null;
            elementScope.locals['$timeago'] = CoreDirectiveHandlers.CreateProxy((prop) =>{
                if (prop === 'label'){
                    Region.Get(regionId).GetChanges().AddGetAccess(`${scope.path}.${prop}`);
                    return label;
                }
            }, ['label']);

            timeago.render(date, (fromattedLabel: string) => {
                label = fromattedLabel;
                ExtendedDirectiveHandlers.Alert(Region.Get(regionId), 'label', scope);
            }, directive.arg.options.includes('caps'));

            return DirectiveHandlerReturn.Handled;
        }

        public static AddAll(){
            DirectiveHandlerManager.AddHandler('timeago', TimeagoDirectiveHandlers.Timeago);
            DirectiveHandlerManager.AddHandler('timeAgo', TimeagoDirectiveHandlers.Timeago);

            let formatter = (date: Date, withNextUpdate = false) => {
                let now = Date.now(), then = date.getTime(), getLabel: (value: number) => [string, number], diff: number;
                if (now < then){
                    diff = (then - now);
                    getLabel = (value) => {
                        return ['', 0];
                    };
                }
                else{//Past
                    diff = (now - then);
                    getLabel = (value) => {
                        let seconds = Math.floor(value / 1000), years = Math.floor(seconds / (365 * 24 * 60 * 60));
                        if (years >= 1){
                            return [`${years} ${(years == 1) ? 'year' : 'years'} ago`, null];
                        }

                        let months = Math.floor(seconds / (30 * 24 * 60 * 60));
                        if (months >= 1){
                            return [`${months} ${(months == 1) ? 'month' : 'months'} ago`, null];
                        }

                        let weeks = Math.floor(seconds / (7 * 24 * 60 * 60));
                        if (weeks >= 1){
                            return [`${weeks} ${(weeks == 1) ? 'week' : 'weeks'} ago`, null];
                        }

                        let days = Math.floor(seconds / (24 * 60 * 60));
                        if (days >= 1){
                            return [`${days} ${(days == 1) ? 'day' : 'days'} ago`, (24 * 60 * 60 * 1000)];
                        }

                        let hours = Math.floor(seconds / (60 * 60));
                        if (hours >= 1){
                            return [`${hours} ${(hours == 1) ? 'hour' : 'hours'} ago`, (60 * 60 * 1000)];
                        }

                        let minutes = Math.floor(seconds / 60);
                        if (minutes >= 1){
                            return [`${minutes} ${(minutes == 1) ? 'minute' : 'minutes'} ago`, (60 * 1000)];
                        }

                        if (seconds >= 30){//Check in 30 seconds
                            return ['30 seconds ago', ((60 - seconds) * 1000)];
                        }
                        
                        if (seconds >= 15){//Check in 15 seconds
                            return ['15 seconds ago', ((30 - seconds) * 1000)];
                        }
                        
                        if (seconds >= 10){//Check in 5 seconds
                            return ['10 seconds ago', ((15 - seconds) * 1000)];
                        }
                        
                        if (seconds >= 5){//Check in 5 seconds
                            return ['5 seconds ago', ((10 - seconds) * 1000)];
                        }
                        
                        if (seconds >= 2){
                            return ['few seconds ago', ((5 - seconds) * 1000)];
                        }

                        if (seconds >= 1){
                            return ['1 second ago', 1000];
                        }

                        return ['just now', ((value < 1000) ? (1000 - value) : 1000)];
                    };
                }

                return (withNextUpdate ? getLabel(diff) : getLabel(diff)[0]);
            };
            
            let timeago = CoreDirectiveHandlers.CreateProxy((prop) => {
                if (prop === 'format'){
                    return formatter;
                }

                if (prop === 'render'){
                    return (date: Date, handler: (label: string) => void, capitalize = false) => {
                        let formatted: [string, number] = (formatter(date, true) as [string, number]), label = formatted[0], onTimeout = () => {
                            formatted = (formatter(date, true) as [string, number]);
                            label = formatted[0];
                            setTimeout(onTimeout, formatted[1]);
                        };

                        handler(capitalize ? (label.substr(0, 1).toUpperCase() + label.substr(1)) : label);
                        label = null;
                        
                        let pass = () => {//Tie updates to animation cycles
                            if (label){
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
            
            Region.AddGlobal('$timeago', () => {
                return timeago;
            });
            
            Region.AddGlobal('$timeAgo', () => {
                return timeago;
            });
        }
    }

    (function(){
        TimeagoDirectiveHandlers.AddAll();
    })();
}