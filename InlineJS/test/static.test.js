import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

describe('x-static directive', () => {
    it('should disable reactivity', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <button x-on:click="foo = 'baz'"></button>
                <span x-text="foo"></span>
                <span x-static:text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('bar');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('baz');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('bar');
        });
    });

    it('cannot be used on the x-data directive', async () => {
        document.body.innerHTML = `
            <div x-static:data="{ foo: 'bar' }">
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('');
    });

    it('can be used on the x-component directive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }" x-static:component="static">
                <span x-text="\`\${$componentKey}.\${foo}\`"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('static.bar');
    });

    it('can be used on the x-post directive', async () => {
        window._post = '';

        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }" x-static:post="$window._post = 'baz'">
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar');
        expect(window._post).toEqual('baz');
    });

    it('can be used on the x-init directive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }" x-static:init="foo = 'baz'">
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('baz');
    });

    it('can be used on the x-uninit directive', async () => {
        const runObservers = [];

        global.MutationObserver = class {
            constructor(callback) {
                runObservers.push(callback)
            }

            observe() {}
        };
        
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span x-text="foo"></span>
                <span x-static:uninit="foo = 'baz'"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');

        let span = document.querySelectorAll('span')[1];
        span.parentElement.removeChild(span);
        
        runObservers.forEach(cb => cb([
            {
                target: document.body.firstElementChild,
                type: 'childList',
                addedNodes: [],
                removedNodes: [ span ],
            }
        ]));
        
        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('baz') });
    });

    it('can be used on the x-ref directive', async () => {
        document.body.innerHTML = `
            <div x-data x-static:ref="root">
                <span x-text="$refs.root.nodeName"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('DIV');
    });
});
