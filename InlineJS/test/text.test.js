import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-text directive', () => {
    it('should set text content on init', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });
    });

    it('should be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <button x-on:click="foo = 'baz'"></button>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
    });

    it('should work on SVG elements', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <svg>
                    <text x-text="foo"></text>
                </svg>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('text').textContent).toEqual('bar') });
    });

    it('should work on INPUT elements', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <input x-text="foo">
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('input').value).toEqual('bar') });
    });

    it('should treat checkbox INPUT elements as boolean entities', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: true }">
                <input type="checkbox" x-text="foo">
                <button x-on:click="foo = false"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('input').checked).toBeTruthy() });

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('input').checked).toBeFalsy() });
    });
});
