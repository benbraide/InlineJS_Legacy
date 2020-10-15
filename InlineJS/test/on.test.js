import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-on directive', () => {
    it('should reflect modified data in event listener to attribute bindings', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <button x-on:click="foo = 'baz'"></button>
                <span :foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });

    it('should reflect modified nested data in event listener to attribute bindings', async () => {
        document.body.innerHTML = `
            <div x-data="{ nested: { foo: 'bar' }}">
                <button x-on:click="nested.foo = 'baz'"></button>
                <span :foo="nested.foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });

    it('should stop propagation with the .stop modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }" x-on:click="foo = 'bubbled'">
                <button x-on:click="foo = 'baz'"></button>
                <button x-on:click.stop="foo = 'baz'"></button>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar');
    
        userEvent.click(document.querySelectorAll('button')[0]);
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bubbled') });

        userEvent.click(document.querySelectorAll('button')[1]);
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
    });

    it('should prevent default with the .prevent modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{}">
                <input type="checkbox" x-on:click>
                <input type="checkbox" x-on:click.prevent>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('input')[0].checked).toEqual(false);
        expect(document.querySelectorAll('input')[1].checked).toEqual(false);
    
        userEvent.click(document.querySelectorAll('input')[0]);
    
        await waitFor(() => { expect(document.querySelectorAll('input')[0].checked).toEqual(true) });

        userEvent.click(document.querySelectorAll('input')[1]);
    
        await waitFor(() => { expect(document.querySelectorAll('input')[1].checked).toEqual(false) });
    });

    it('should only trigger when event target is element with the .self modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <div x-on:click.self="foo = 'baz'" id="selfTarget">
                    <button></button>
                </div>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar')
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });
    
        userEvent.click(document.querySelector('#selfTarget'));
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
    });

    it('should bind event on the window object with the .window modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <div x-on:click.window="foo = 'baz'"></div>
                <span :foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
    
        userEvent.click(document.body);
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });

    it('should bind event on the document object with the .document modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <div x-on:click.document="foo = 'baz'"></div>
                <span :foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
    
        userEvent.click(document.body);
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });

    it('should only trigger when target is not element or contained inside element with the .outside modifier', async () => {
        Object.defineProperties(window.HTMLElement.prototype, {
            offsetHeight: {
                get: function () { return this.classList.contains('hidden') ? 0 : 1 }
            },
            offsetWidth: {
                get: function () { return this.classList.contains('hidden') ? 0 : 1 }
            }
        });
    
        document.body.innerHTML = `
            <div id="outer">
                <div x-data="{ isOpen: true }">
                    <button x-on:click="isOpen = true"></button>
                    <ul .hidden="! isOpen" x-on:click.outside="isOpen = false">
                        <li>...</li>
                    </ul>
                </div>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('ul').classList.contains('hidden')).toEqual(false);
    
        userEvent.click(document.querySelector('li'));
    
        await waitFor(() => { expect(document.querySelector('ul').classList.contains('hidden')).toEqual(false) });
    
        userEvent.click(document.querySelector('ul'));
    
        await waitFor(() => { expect(document.querySelector('ul').classList.contains('hidden')).toEqual(false) });
    
        userEvent.click(document.querySelector('#outer'));
    
        await waitFor(() => { expect(document.querySelector('ul').classList.contains('hidden')).toEqual(true) });
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('ul').classList.contains('hidden')).toEqual(false) });
    });
    
    it('should trigger only once with the .once modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ count: 0 }">
                <button x-on:click.once="++count"></button>
                <span :foo="count"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('0');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('1') });
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('1') });
    });

    it('should handle keydown events with modifiers', async () => {
        document.body.innerHTML = `
            <div x-data="{ count: 0 }">
                <input type="text" x-on:keydown="count++" x-on:keydown.enter="count++" x-on:keydown.space="count++">
                <span x-text="count"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('0');
    
        userEvent.type(document.querySelector('input'), '{enter}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('2') });
    
        userEvent.type(document.querySelector('input'), ' ');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('4') });
    
        userEvent.type(document.querySelector('input'), '{space}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('6') });
    
        userEvent.type(document.querySelector('input'), '{esc}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('7') });
    });

    it('should handle keydown events with exclusive modifiers', async () => {
        document.body.innerHTML = `
            <div x-data="{ count: 0 }">
                <input type="text" x-on:keydown="count++" x-on:keydown.enter.space="count++">
                <span x-text="count"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('0');
    
        userEvent.type(document.querySelector('input'), '{enter}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('2') });
    
        userEvent.type(document.querySelector('input'), ' ');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('4') });
    
        userEvent.type(document.querySelector('input'), '{space}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('6') });
    
        userEvent.type(document.querySelector('input'), '{esc}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('7') });
    });

    it('should handle keydown events with combo modifiers', async () => {
        document.body.innerHTML = `
            <div x-data="{ count: 0 }">
                <input type="text" x-on:keydown.ctrl.enter="count++">
                <span x-text="count"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('0');
    
        userEvent.type(document.querySelector('input'), '{enter}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('0') });
    
        userEvent.type(document.querySelector('input'), '{ctrl}{enter}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('1') });
    });

    it('should only stop propagation for keydown with specified key and the .stop modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ count: 0 }">
                <article x-on:keydown="count++">
                    <input type="text" x-on:keydown.enter.stop>
                </article>
                <span x-text="count"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('0');
    
        userEvent.type(document.querySelector('input'), '{esc}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('1') });
    
        userEvent.type(document.querySelector('input'), '{enter}');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('1') });
    });

    it('should support short syntax', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <button @click="foo = 'baz'"></button>
                <span :foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });

    it('should support event with colon', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <div x-on:my:event.document="foo = 'baz'"></div>
                <span :foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
    
        document.dispatchEvent(new CustomEvent('my:event'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });

    it('should bind to the proper event with the .join modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <div x-on:my-event.join.document="foo = 'baz'"></div>
                <span :foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
    
        document.dispatchEvent(new CustomEvent('my.event'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });

    it('should bind to the proper event with the .camel modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <div x-on:my-event.camel.document="foo = 'baz'"></div>
                <span :foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
    
        document.dispatchEvent(new CustomEvent('myEvent'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });
});
