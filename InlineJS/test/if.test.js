import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-if directive', () => {
    it('should be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ show: false }">
                <button x-on:click="show = ! show"></button>
                <p x-if="show"></p>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('p')).toBeFalsy();
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('p')).toBeTruthy() });
    });

    it('should contain reactive elements', async () => {
        document.body.innerHTML = `
            <div x-data="{ show: false, foo: 'bar' }">
                <h1 x-on:click="show = ! show"></h1>
                <h2 x-if="show" @click="foo = 'baz'"></h2>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('h2')).toBeFalsy();
        expect(document.querySelector('span').textContent).toEqual('bar');
    
        userEvent.click(document.querySelector('h1'));
    
        await waitFor(() => { expect(document.querySelector('h2')).toBeTruthy() });
    
        userEvent.click(document.querySelector('h2'));
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
    });

    it('should work inside a loop', () => {
        document.body.innerHTML = `
            <div x-data="{ foos: [{bar: 'baz'}, {bar: 'bop'}]}">
                <div x-each="foos">
                    <div x-if="$each.value.bar === 'baz'">
                        <span x-text="$each.value.bar"></span>
                    </div>
                </div>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span').length).toEqual(1);
        expect(document.querySelector('span').textContent).toEqual('baz');
    });

    it('should attach event listeners once', async () => {
        document.body.innerHTML = `
            <div x-data="{ count: 0 }">
                <span x-text="count"></span>
                <button x-if="true" @click="count += 1">Click me</button>
            </div>
        `;
        
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('0');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('1') });
    });
});
