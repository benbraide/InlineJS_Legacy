import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

describe('lifecycle behavior', () => {
    it('should execute x-init expression on element initialization', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span x-text="foo" x-init="foo = 'bar'"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar');
    });

    it('should execute x-post expression after all other directives and offspring directives are evaluated', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }" x-post="foo = 'post'">
                <span x-text="foo" x-init="foo = 'bar'"></span>
            </div>
        `;

        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('post') });
    });

    it('should execute x-post expression after offspring x-post directives are evaluated', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }" x-post="foo = 'post'">
                <span x-text="foo" x-post="foo = 'bar'"></span>
            </div>
        `;

        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('post') });
    });
    
    it('should execute x-uninit expression on element removal', async () => {
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
                <span x-uninit="foo = 'baz'"></span>
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

    it('should bind elements added to the DOM after initial attachment', async () => {
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
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');

        let tmpl = document.createElement('template');
        tmpl.innerHTML = `
            <span x-init="foo = 'baz'"></span>
            <button @click="foo = 'clicked'"></button>
        `;

        let newEls = Array.from(tmpl.content.children).map(child => child.cloneNode(true));
        newEls.forEach(el => document.body.firstElementChild.appendChild(el));
        
        runObservers.forEach(cb => cb([
            {
                target: document.body.firstElementChild,
                type: 'childList',
                addedNodes: newEls,
                removedNodes: [],
            }
        ]));
        
        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('baz') });

        userEvent.click(document.querySelector('button'));
        
        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('clicked') });
    });
});
