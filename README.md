
# InlineJS

InlineJS is component based spin-off to [Alpine.js]([https://github.com/alpinejs/alpine](https://github.com/alpinejs/alpine)).

Similar to `Alpine.js` it works without creating shadow DOMs.

## Install

 - Grab source or distribution versions from `GitHub`
 - Include script in your HTML file.
 - Initialize inside a `script` tag

##  Configurations
There are a few configurations that can be set before initialization.
- `InlineJS.Region.directivePrefix`. Specifies the prefix used for directives. Defaults to `x`
- `InlineJS.Region.directiveRegex`. Used to match directives on element attributes. Defaults to `/^(data-)?x-(.+)$/`
- `InlineJS.Region.SetDirectivePrefix(value: string)`. Use this change the directives prefix. Updates `InlineJS.Region.directiveRegex` with the new prefix.
- `InlineJS.Region.externalCallbacks.isEqual`. Used by some magic properties to test whether two arbitrary values are equal.
- `InlineJS.Region.externalCallbacks.deepCopy`. Used by some magic properties to perform a deep copy of an object.

You can use these configuration methods to update, add and remove configurations.

 - `InlineJS.Config.SetDirectivePrefix([prefix]):` Set the prefix used for directives.
 - `InlineJS.Config.SetExternalCallbacks([isEqual], [deepCopy]):` Set both external callbacks.
 - `InlineJS.Config.SetIsEqualExternalCallback([callback]):` Set the `isEqual` callback.
 - `InlineJS.Config.SetDeepCopyExternalCallback([callback]):` Set the `deepCopy` callback.
 - `InlineJS.Config.AddEventKeyMap([key], [target]):` Add a key-target event map entry.
 - `InlineJS.Config.RemoveEventKeyMap([key]):` Remove an existing event map entry.
 - `InlineJS.Config.AddBooleanAttribute([name]):` Add name to the list of boolean attributes.
 - `InlineJS.Config.RemoveBooleanAttribute([name]):` Remove a name from the boolean attribute list.
 - `InlineJS.Config.SetOptimizedBindsState([enabled]):` Enable or disable the optimized binds option.
 - `InlineJS.Config.AddDirective([name], [handler]):` Add a directive with an associated handler.
 - `InlineJS.Config.RemoveDirective([name]):` Remove a directive and its associated handler.
 - `InlineJS.Config.AddGlobalMagicProperty([name], [callback]):` Add a global magic property.
 - `InlineJS.Config.RemoveGlobalMagicProperty([name]):` Remove a global magic property.

## Initialization
```js
InlineJS.Bootstrap.Attach();
```
>`Attach` takes an array of attributes to attach to. Defaults to `[``data-${InlineJS.Region.directivePrfix}-data`, `${InlineJS.Region.directivePrfix}-data``]`
>>>>>>>>>
>**N/B** `$watch`, `$when`, and `$once` require `InlineJS.Region.externalCallbacks.isEqual` and `InlineJS.Region.externalCallbacks.deepCopy` to be initialized. Default behaviors are limited comparisons and limited deep copy. For example, you can initialize them with `undescore.js` utilities.

## Use

*Dropdown/Modal*
```html
<div x-data="{ open: false }">
    <button x-on:click="open = true">Open Dropdown</button>
    <ul x-show="open" x-on:click.outside="open = false">
        Dropdown Body
    </ul>
</div>
```

*Tabs*
```html
<div x-data="{ tab: 'foo' }">
    <button x-class:active="tab === 'foo'" x-on:click="tab = 'foo'">Foo</button>
    <button x-class:active="tab === 'bar'" x-on:click="tab = 'bar'">Bar</button>

    <div x-show="tab === 'foo'">Tab Foo</div>
    <div x-show="tab === 'bar'">Tab Bar</div>
</div>
```

You can even use it for non-trivial things:
*Pre-fetching a dropdown's HTML content on hover*
```html
<div x-data="{ open: false }">
    <button
        x-on:mouseenter.once="
            fetch('/dropdown-partial.html')
                .then(response => response.text())
                .then(html => { $refs.dropdown.innerHTML = html })
        "
        x-on:click="open = true"
    >Show Dropdown</button>

    <div x-ref="dropdown" x-show="open" x-on:click.outside="open = false">
        Loading Spinner...
    </div>
</div>
```

## Learn

There are 19 directives available to you:

| Directive | Description |
| --- | --- |
| [`x-data`](#x-data) | Declares a new component scope. |
| [`x-component`](#x-component) | Assigns a key to a component. |
| [`x-post`](#x-post) | Runs an expression after all directives on element --- and offspring directives --- have been executed. |
| [`x-init`](#x-init) | Runs an expression when an element is initialized. |
| [`x-uninit`](#x-uninit) | Runs an expression when an element is removed from the DOM. |
| [`x-ref`](#x-ref) | Stores a reference to the DOM element in the component using the specified key. |
| [`x-bind`](#x-bind) | Evaluates an expression and keeps track of changes. |
| [`x-attr`](#x-attr) | Sets the value of an attribute to the result of a JS expression. |
| [`x-style`](#x-style) | Similar to `x-attr`, but will update the `style` attribute. |
| [`x-class`](#x-class) | Set/Remove one or more classes based on the truth of the specified expression. |
| [`x-text`](#x-text) | Works similarly to `x-attr`, but will update the `innerText` of an element. |
| [`x-html`](#x-html) | Works similarly to `x-attr`, but will update the `innerHTML` of an element. |
| [`x-model`](#x-model) | Adds "two-way data binding" to an element. Keeps input element in sync with component data. |
| [`x-show`](#x-show) | Toggles `display: none;` on the element depending on expression (true or false). |
| [`x-if`](#x-if) | Remove an element completely from the DOM. |
| [`x-each`](#x-each) | Create new DOM nodes for each item in an array or associative map. |
| [`x-on`](#x-on) | Attaches an event listener to the element. Executes JS expression when emitted. |
| [`x-static`](#x-static) | Disables live updates inside specified directive. |
| [`x-cloak`](#x-cloak) | This attribute is removed when Alpine initializes. Useful for hiding pre-initialized DOM. |

And 22 global magic properties:

| Magic Properties | Description |
| --- | --- |
| [`$window`](#window) |  Retrieve the `window` object. |
| [`$document`](#document) |  Retrieve the `document` object. |
| [`$console`](#console) |  Retrieve the `console` object. |
| [`$alert`](#alert) |  Retrieve the `window.alert` function. |
| [`$event`](#event) | Retrieve the native browser "Event" object within an event listener.  |
| [`$expandEvent`](#expandEvent) |  Expand an event type to the appropriate type. |
| [`$dispatchEvent`](#dispatchEvent) |  Dispatch an event. |
| [`$refs`](#refs) |  Retrieve DOM elements marked with `x-ref` inside the component. |
| [`$self`](#self) |  Retrieve the DOM element that is currently the context. |
| [`$root`](#root) |  Retrieve the root component DOM node. |
| [`$parent`](#parent) |  Retrieve the parent of `$self`. |
| [`$getAncestor`](#getAncestor) |  Retrieve an ancestor of `$self`. |
| [`$componentKey`](#componentKey) |  Retrieve the key associated with the current component. |
| [`$component`](#component) |  Retrieve the component with specified key. |
| [`$locals`](#locals) | Retrieve an associative object local to `$self`. |
| [`$getLocals`](#getLocals) | Retrieve an associative object local to specified DOM element. |
| [`$nextTick`](#nexttick) | Execute a given expression **after** `InlineJS` has made its reactive DOM updates. |
| [`$post`](#post) | Execute a given expression **after** `InlineJS` has made its reactive DOM updates. |
| [`$use`](#use) | Includes changes in ancestors. |
| [`$watch`](#watch) | Will fire a provided callback when a component property you "watched" gets changed. |
| [`$when`](#when) | Similar to `$watch`, but will trigger `when` the expression evaluates to a truth value. |
| [`$once`](#once) | Similar to `$when`, but will trigger only `once`. |


### Directives

---

### `x-data`

**Example:** `<div x-data="{ foo: 'bar' }">...</div>`

**Structure:** `<div x-data="[object literal]|[Function]">...</div>`

`x-data` declares a new component scope. It tells the framework to initialize a new component with the following data object.

**Extract Component Logic**

You can extract data (and behavior) into reusable functions:

```html
<div x-data="dropdown">
    <button x-on:click="open">Open</button>

    <div x-show="isOpen()" x-on:click.outside="close">
        // Dropdown
    </div>
</div>

<script>
    function dropdown() {
        return {
            show: false,
            open() { this.show = true },
            close() { this.show = false },
            isOpen() { return this.show },
        }
    }
</script>
```

You can also mix-in multiple data objects using object destructuring:

```html
<div x-data="{...dropdown(), ...tabs()}">
```

---

### `x-component`
**Example:** `<div x-data x-component="my-component"></div>`

**Structure:** `<div x-data="..." x-component="[identifier]"></div>`

`x-component` assigns a key to a component.

---

### `x-post`
**Example:** `<div x-data x-post="$console.log('Every offspring initialized')"></div>`

**Structure:** `<div x-data="..." x-post="[expression]"></div>`

`x-post` runs an expression after all directives on element, and offspring directives, have been executed.

---

### `x-init`
**Example:** `<div x-data="{ foo: 'bar' }" x-init="foo = 'baz'"></div>`

**Structure:** `<div x-data="..." x-init="[expression]"></div>`

`x-init` runs an expression when an element is initialized. Changes are not tracked.

---

### `x-uninit`
**Example:** `<div x-data="{ foo: 'bar' }" x-uninit="$console.log('Element removed')"></div>`

**Structure:** `<div x-data="..." x-uninit="[expression]"></div>`

`x-uninit` runs an expression when an element is removed from the DOM.

---

### `x-ref`
**Example:** `<div x-data x-ref="myDiv"></div>`

**Structure:** `<div x-data="..." x-ref="[variable]"></div>`

`x-ref` stores a reference to the DOM element in the component using the specified key. The key is added to the `$refs` global magic property.

---

### `x-show`
**Example:** `<div x-show="open"></div>`

**Structure:** `<div x-show="[expression]"></div>`

`x-show` toggles the `display: none;` style on the element depending if the expression resolves to `true` or `false`.

---

### `x-attr`

> Note: You are free to use the shorter ":" syntax: `:type="..."`

**Example:** `<input x-attr:type="inputType">`

**Structure:** `<input x-attr:[attribute]="[expression]">`

`x-attr` sets the value of an attribute to the result of a JavaScript expression. The expression has access to all the keys of the component's data object, and will update every-time its data is updated.

> Note: attribute bindings ONLY update when their dependencies update. The framework is smart enough to observe data changes and detect which bindings care about them.

**`x-attr` for boolean attributes**

`x-attr` supports boolean attributes in the same way as value attributes, using a variable as the condition or any JavaScript expression that resolves to `true` or `false`.

For example:
```html
<!-- Given: -->
<button x-attr:disabled="myVar">Click me</button>

<!-- When myVar == true: -->
<button disabled="disabled">Click me</button>

<!-- When myVar == false: -->
<button>Click me</button>
```

This will add or remove the `disabled` attribute when `myVar` is true or false respectively.

Boolean attributes are supported as per the [HTML specification](https://html.spec.whatwg.org/multipage/indices.html#attributes-3:boolean-attribute), for example `disabled`, `readonly`, `required`, `checked`, `hidden`, `selected`, `open`, etc.

> Note: If you need a false state to show for your attribute, such as `aria-*`, chain `.toString()` to the value while binding to the attribute. For example: `:aria-expanded="isOpen.toString()"` would persist whether  `isOpen` was `true` or `false`.

---

### `x-on`

> Note: You are free to use the shorter "@" syntax: `@click="..."`

**Example:** `<button x-on:click="foo = 'bar'"></button>`

**Structure:** `<button x-on:[event]="[expression]"></button>`

`x-on` attaches an event listener to the element it's declared on. When that event is emitted, the JavaScript expression set as its value is executed.

If any data is modified in the expression, other element attributes "bound" to this data, will be updated.

> Note: You can also specify a JavaScript function name

**Example:** `<button x-on:click="myFunction"></button>`

This is equivalent to: `<button x-on:click="myFunction($event)"></button>`

**`keydown` modifiers**

**Example:** `<input type="text" x-on:keydown.esc="open = false">`

You can specify specific keys to listen for using keydown modifiers appended to the `x-on:keydown` directive. Note that the modifiers are kebab-cased versions of `Event.key` values.

Examples: `enter`, `escape`, `arrow-up`, `arrow-down`

> Note: You can also listen for system-modifier key combinations like: `x-on:keydown.ctrl.enter="foo"`
> Multiple keys can be combined for alternatives e.g. `x-on:keydown.enter.space`

**`.away` modifier**

**Example:** `<div x-on:click.away="showModal = false"></div>`

When the `.away` modifier is present, the event handler will only be executed when the event originates from a source other than itself, or its children.

This is useful for hiding dropdowns and modals when a user clicks away from them.

**`.prevent` modifier**
**Example:** `<input type="checkbox" x-on:click.prevent>`

Adding `.prevent` to an event listener will call `preventDefault` on the triggered event. In the above example, this means the checkbox wouldn't actually get checked when a user clicks on it.

**`.stop` modifier**
**Example:** `<div x-on:click="foo = 'bar'"><button x-on:click.stop></button></div>`

Adding `.stop` to an event listener will call `stopPropagation` on the triggered event. In the above example, this means the "click" event won't bubble from the button to the outer `<div>`. Or in other words, when a user clicks the button, `foo` won't be set to `'bar'`.

**`.self` modifier**
**Example:** `<div x-on:click.self="foo = 'bar'"><button></button></div>`

Adding `.self` to an event listener will only trigger the handler if the `$event.target` is the element itself. In the above example, this means the "click" event that bubbles from the button to the outer `<div>` will **not** run the handler.

**`.window` modifier**
**Example:** `<div x-on:resize.window="isOpen = window.outerWidth > 768 ? false : open"></div>`

Adding `.window` to an event listener will install the listener on the global window object instead of the DOM node on which it is declared. This is useful for when you want to modify component state when something changes with the window, like the resize event. In this example, when the window grows larger than 768 pixels wide, we will close the modal/dropdown, otherwise maintain the same state.

>Note: You can also use the `.document` modifier to attach listeners to `document` instead of `window`

**`.once` modifier**
**Example:** `<button x-on:mouseenter.once="fetchSomething()"></button>`

Adding the `.once` modifier to an event listener will ensure that the listener will only be handled once. This is useful for things you only want to do once, like fetching HTML partials and such.

**`.passive` modifier**
**Example:** `<button x-on:mousedown.passive="interactive = true"></button>`

Adding the `.passive` modifier to an event listener will make the listener a passive one, which means `preventDefault()` will not work on any events being processed, this can help, for example with scroll performance on touch devices.

**`.debounce` modifier**
**Example:** `<input x-on:input.debounce="fetchSomething()">`

The `debounce` modifier allows you to "debounce" an event handler. In other words, the event handler will NOT run until a certain amount of time has elapsed since the last event that fired. When the handler is ready to be called, the last handler call will execute.

The default debounce "wait" time is 250 milliseconds.

If you wish to customize this, you can specifiy a custom wait time like so:

```
<input x-on:input.debounce.750="fetchSomething()">
<input x-on:input.debounce.750ms="fetchSomething()">
```

---

### `x-model`
**Example:** `<input type="text" x-model="foo">`

**Structure:** `<input type="text" x-model="[data item]">`

`x-model` adds "two-way data binding" to an element. In other words, the value of the input element will be kept in sync with the value of the data item of the component.

> Note: `x-model` is smart enough to detect changes on text inputs, checkboxes, radio buttons, textareas, selects, and multiple selects. It should behave [how Vue would](https://vuejs.org/v2/guide/forms.html) in those scenarios.

**`.number` modifier**
**Example:** `<input x-model.number="age">`

The `number` modifier will convert the input's value to a number. If the value cannot be parsed as a valid number, the original value is returned.

**`.debounce` modifier**
**Example:** `<input x-model.debounce="search">`

The `debounce` modifier allows you to add a "debounce" to a value update. In other words, the event handler will NOT run until a certain amount of time has elapsed since the last event that fired. When the handler is ready to be called, the last handler call will execute.

The default debounce "wait" time is 250 milliseconds.

If you wish to customize this, you can specifiy a custom wait time like so:

```
<input x-model.debounce.750="search">
<input x-model.debounce.750ms="search">
```

---

### `x-text`
**Example:** `<span x-text="foo"></span>`

**Structure:** `<span x-text="[expression]"`

`x-text` works similarly to `x-attr`, except instead of updating the value of an attribute, it will update the `innerText` of an element.

---

### `x-html`
**Example:** `<span x-html="foo"></span>`

**Structure:** `<span x-html="[expression]"`

`x-html` works similarly to `x-attr`, except instead of updating the value of an attribute, it will update the `innerHTML` of an element.

> :warning: **Only use on trusted content and never on user-provided content.** :warning:
>
> Dynamically rendering HTML from third parties can easily lead to [XSS](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting) vulnerabilities.

---

### `x-if`
**Example:** `<div x-if="true">Some Element</div>`

**Structure:** `<div x-if="[expression]">Some Element</div>`

For cases where `x-show` isn't sufficient (`x-show` sets an element to `display: none` if it's false), `x-if` can be used to  actually remove an element completely from the DOM.

---

### `x-each`
**Example:**
```html
<div x-each="items" x-text="$each.value"></div>
```

`x-each` is available for cases when you want to create new DOM nodes for each item in an array. This should appear similar to `x-for` in `Alpine.js`, with one exception of not needing to exist on a `template` tag.

It exposes a `$each` local property with the following fields:

 - `count:` Retrieves the total count of the loop
 - `index:` Retrieves the current index
 - `value:` Retrieves the current value
 - `collection:` Retrieves the collection that is being iterated
 - `parent:` Retrieves the parent loop property, if any

It can iterate over arrays and key-value associative objects.

A name can be specified for `$each.value` using the following syntax:

```html
<div x-each="items as item" x-text="item"></div>
```

#### Nesting `x-each`s
You can nest `x-each` loops. For example:

```html
<div x-each="items as item">
    <div x-each="item.subItems as subItem" x-text="subItem"></div>
</div>
```

#### Iterating over a range

Iteration over integers are supported. Example:

```html
<span x-each="10 as i" x-text="i"></span>
```

> By default, the iteration range is from `0` to `value - 1`.

Negative values can be specified. Example:

```html
<span x-each="-10 as i" x-text="i"></span>
```

> By default, the iteration range is from `0` to `value + 1`.

**`.count` modifier**
```html
<span x-each.count="10 as i" x-text="i"></span>
```

The `count` modifier sets the first range value to `1`, or `-1` for negative value.

**`.reverse` modifier**
```html
<span x-each.reverse="10 as i" x-text="i"></span>
```

The `reverse` modifier reverses the range values.

---

### `x-transition`
**Example:**
```html
<div
    x-show="open"
    x-transition:enter="transition ease-out duration-300"
    x-transition:enter-start="opacity-0 transform scale-90"
    x-transition:enter-end="opacity-100 transform scale-100"
    x-transition:leave="transition ease-in duration-300"
    x-transition:leave-start="opacity-100 transform scale-100"
    x-transition:leave-end="opacity-0 transform scale-90"
>...</div>
```

```html
<template x-if="open">
    <div
        x-transition:enter="transition ease-out duration-300"
        x-transition:enter-start="opacity-0 transform scale-90"
        x-transition:enter-end="opacity-100 transform scale-100"
        x-transition:leave="transition ease-in duration-300"
        x-transition:leave-start="opacity-100 transform scale-100"
        x-transition:leave-end="opacity-0 transform scale-90"
    >...</div>
</template>
```

> The example above uses classes from [Tailwind CSS](https://tailwindcss.com)

Alpine offers 6 different transition directives for applying classes to various stages of an element's transition between "hidden" and "shown" states. These directives work both with `x-show` AND `x-if`.

These behave exactly like VueJs's transition directives, except they have different, more sensible names:

| Directive | Description |
| --- | --- |
| `:enter` | Applied during the entire entering phase. |
| `:enter-start` | Added before element is inserted, removed one frame after element is inserted. |
| `:enter-end` | Added one frame after element is inserted (at the same time `enter-start` is removed), removed when transition/animation finishes.
| `:leave` | Applied during the entire leaving phase. |
| `:leave-start` | Added immediately when a leaving transition is triggered, removed after one frame. |
| `:leave-end` | Added one frame after a leaving transition is triggered (at the same time `leave-start` is removed), removed when the transition/animation finishes.

---

### `x-spread`
**Example:**
```html
<div x-data="dropdown()">
    <button x-spread="trigger">Open Dropdown</button>

    <span x-spread="dialogue">Dropdown Contents</span>
</div>

<script>
    function dropdown() {
        return {
            open: false,
            trigger: {
                ['@click']() {
                    this.open = true
                },
            },
            dialogue: {
                ['x-show']() {
                    return this.open
                },
                ['@click.away']() {
                    this.open = false
                },
            }
        }
    }
</script>
```

`x-spread` allows you to extract an element's Alpine bindings into a reusable object.

The object keys are the directives (Can be any directive including modifiers), and the values are callbacks to be evaluated by Alpine.

> Note: There are a couple of caveats to x-spread:
> - When the directive being "spread" is `x-for`, you should return a normal expression string from the callback. For example: `['x-for']() { return 'item in items' }`.
> - `x-data` and `x-init` can't be used inside a "spread" object

---

### `x-cloak`
**Example:** `<div x-data="{}" x-cloak></div>`

`x-cloak` attributes are removed from elements when Alpine initializes. This is useful for hiding pre-initialized DOM. It's typical to add the following global style for this to work:

```html
<style>
    [x-cloak] { display: none; }
</style>
```

### Magic Properties

> With the exception of `$el`, magic properties are **not available within `x-data`** as the component isn't initialized yet.

---

### `$el`
**Example:**
```html
<div x-data>
    <button @click="$el.innerHTML = 'foo'">Replace me with "foo"</button>
</div>
```

`$el` is a magic property that can be used to retrieve the root component DOM node.

### `$refs`
**Example:**
```html
<span x-ref="foo"></span>

<button x-on:click="$refs.foo.innerText = 'bar'"></button>
```

`$refs` is a magic property that can be used to retrieve DOM elements marked with `x-ref` inside the component. This is useful when you need to manually manipulate DOM elements.

---

### `$event`
**Example:**
```html
<input x-on:input="alert($event.target.value)">
```

`$event` is a magic property that can be used within an event listener to retrieve the native browser "Event" object.

> Note: The $event property is only available in DOM expressions.

If you need to access $event inside of a JavaScript function you can pass it in directly:

`<button x-on:click="myFunction($event)"></button>`

---

### `$dispatch`
**Example:**
```html
<div @custom-event="console.log($event.detail.foo)">
    <button @click="$dispatch('custom-event', { foo: 'bar' })">
    <!-- When clicked, will console.log "bar" -->
</div>
```

**Note on Event Propagation**

Notice that, because of [event bubbling](https://en.wikipedia.org/wiki/Event_bubbling), when you need to capture events dispatched from nodes that are under the same nesting hierarchy, you'll need to use the [`.window`](https://github.com/alpinejs/alpine#x-on) modifier:

**Example:**

```html
<div x-data>
    <span @custom-event="console.log($event.detail.foo)"></span>
    <button @click="$dispatch('custom-event', { foo: 'bar' })">
<div>
```

> This won't work because when `custom-event` is dispatched, it'll propagate to its common ancestor, the `div`.

**Dispatching to Components**

You can also take advantage of the previous technique to make your components talk to each other:

**Example:**

```html
<div x-data @custom-event.window="console.log($event.detail)"></div>

<button x-data @click="$dispatch('custom-event', 'Hello World!')">
<!-- When clicked, will console.log "Hello World!". -->
```

`$dispatch` is a shortcut for creating a `CustomEvent` and dispatching it using `.dispatchEvent()` internally. There are lots of good use cases for passing data around and between components using custom events. [Read here](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events) for more information on the underlying `CustomEvent` system in browsers.

You will notice that any data passed as the second parameter to `$dispatch('some-event', { some: 'data' })`, becomes available through the new events "detail" property: `$event.detail.some`. Attaching custom event data to the `.detail` property is standard practice for `CustomEvent`s in browsers. [Read here](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail) for more info.

You can also use `$dispatch()` to trigger data updates for `x-model` bindings. For example:

```html
<div x-data="{ foo: 'bar' }">
    <span x-model="foo">
        <button @click="$dispatch('input', 'baz')">
        <!-- After the button is clicked, `x-model` will catch the bubbling "input" event, and update foo to "baz". -->
    </span>
</div>
```

> Note: The $dispatch property is only available in DOM expressions.

If you need to access $dispatch inside of a JavaScript function you can pass it in directly:

`<button x-on:click="myFunction($dispatch)"></button>`

---

### `$nextTick`
**Example:**
```html
<div x-data="{ fruit: 'apple' }">
    <button
        x-on:click="
            fruit = 'pear';
            $nextTick(() => { console.log($event.target.innerText) });
        "
        x-text="fruit"
    ></button>
</div>
```

`$nextTick` is a magic property that allows you to only execute a given expression AFTER Alpine has made its reactive DOM updates. This is useful for times you want to interact with the DOM state AFTER it's reflected any data updates you've made.

---

### `$watch`
**Example:**
```html
<div x-data="{ open: false }" x-init="$watch('open', value => console.log(value))">
    <button @click="open = ! open">Toggle Open</button>
</div>
```

You can "watch" a component property with the `$watch` magic method. In the above example, when the button is clicked and `open` is changed, the provided callback will fire and `console.log` the new value.

## Security
If you find a security vulnerability, please send an email to [calebporzio@gmail.com]()

Alpine relies on a custom implementation using the `Function` object to evaluate its directives. Despite being more secure then `eval()`, its use is prohibited in some environments, such as Google Chrome App, using restrictive Content Security Policy (CSP).

If you use Alpine in a website dealing with sensitive data and requiring [CSP](https://csp.withgoogle.com/docs/strict-csp.html), you need to include `unsafe-eval` in your policy. A robust policy correctly configured will help protecting your users when using personal or financial data.

Since a policy applies to all scripts in your page, it's important that other external libraries included in the website are carefully reviewed to ensure that they are trustworthy and they won't introduce any Cross Site Scripting vulnerability either using the `eval()` function or manipulating the DOM to inject malicious code in your page.

## V3 Roadmap
* Move from `x-ref` to `ref` for Vue parity?
* Add `Alpine.directive()`
* Add `Alpine.component('foo', {...})` (With magic `__init()` method)
* Dispatch Alpine events for "loaded", "transition-start", etc... ([#299](https://github.com/alpinejs/alpine/pull/299)) ?
* Remove "object" (and array) syntax from `x-bind:class="{ 'foo': true }"` ([#236](https://github.com/alpinejs/alpine/pull/236) to add support for object syntax for the `style` attribute)
* Improve `x-for` mutation reactivity ([#165](https://github.com/alpinejs/alpine/pull/165))
* Add "deep watching" support in V3 ([#294](https://github.com/alpinejs/alpine/pull/294))
* Add `$el` shortcut
* Change `@click.away` to `@click.outside`?

## License

Copyright © 2019-2020 Caleb Porzio and contributors

Licensed under the MIT license, see [LICENSE.md](LICENSE.md) for details.