import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('$watch global magic property', () => {
    it('should be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar', bob: 'lob' }" x-init="$watch('foo', value => { bob = value })">
                <h1 x-text="foo"></h1>
                <h2 x-text="bob"></h2>
                <button x-on:click="foo = 'baz'"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('h1').textContent).toEqual('bar');
        expect(document.querySelector('h2').textContent).toEqual('lob');

        userEvent.click(document.querySelector('button'));

        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('baz');
            expect(document.querySelector('h2').textContent).toEqual('baz');
        });
    });

    it('should support nested properties', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: { bar: 'baz', bob: 'lob' } }" x-init="$watch('foo.bar', value => { foo.bob = value })">
                <h1 x-text="foo.bar"></h1>
                <h2 x-text="foo.bob"></h2>
                <button x-on:click="foo.bar = 'law'"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('h1').textContent).toEqual('baz');
        expect(document.querySelector('h2').textContent).toEqual('lob');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('law');
            expect(document.querySelector('h2').textContent).toEqual('law');
        });
    });

    it('should be reactive with arrays', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: ['one'], bob: 'lob' }" x-init="$watch('foo', value => { bob = value })">
                <h1 x-text="foo"></h1>
                <h2 x-text="bob"></h2>
                <button id="push" x-on:click="foo.push('two')"></button>
                <button id="pop" x-on:click="foo.pop()"></button>
                <button id="unshift" x-on:click="foo.unshift('zero')"></button>
                <button id="shift" x-on:click="foo.shift()"></button>
                <button id="assign" x-on:click="foo = [2,1,3]"></button>
                <button id="sort" x-on:click="foo.sort()"></button>
                <button id="reverse" x-on:click="foo.reverse()"></button>
            </div>
        `;
    
        InlineJS.Region.enableOptimizedBinds = false;
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('h1').textContent).toEqual('one');
        expect(document.querySelector('h2').textContent).toEqual('lob');
        
        userEvent.click(document.querySelector('#push'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('one,two')
            expect(document.querySelector('h2').textContent).toEqual('one,two');
        });
    
        userEvent.click(document.querySelector('#pop'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('one')
            expect(document.querySelector('h2').textContent).toEqual('one');
        });
    
        userEvent.click(document.querySelector('#unshift'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('zero,one')
            expect(document.querySelector('h2').textContent).toEqual('zero,one');
        });
    
        userEvent.click(document.querySelector('#shift'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('one')
            expect(document.querySelector('h2').textContent).toEqual('one');
        });
    
        userEvent.click(document.querySelector('#assign'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('2,1,3');
            expect(document.querySelector('h2').textContent).toEqual('2,1,3');
        });
    
        userEvent.click(document.querySelector('#sort'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('1,2,3');
            expect(document.querySelector('h2').textContent).toEqual('1,2,3');
        });
    
        userEvent.click(document.querySelector('#reverse'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('3,2,1');
            expect(document.querySelector('h2').textContent).toEqual('3,2,1');
        });
    });

    it('should support nested arrays', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: {baz: ['one']}, bob: 'lob' }" x-init="$watch('foo.baz', value => { bob = value })">
                <h1 x-text="foo.baz"></h1>
                <h2 x-text="bob"></h2>
                <button id="push" x-on:click="foo.baz.push('two')"></button>
            </div>
        `;
    
        InlineJS.Region.enableOptimizedBinds = false;
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('h1').textContent).toEqual('one');
        expect(document.querySelector('h2').textContent).toEqual('lob');
    
        userEvent.click(document.querySelector('#push'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('one,two');
            expect(document.querySelector('h2').textContent).toEqual('one,two');
        });
    });

    it('should support magic properties', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar', bob: 'car' }" x-component="test" x-init="$watch('$component(\\'test\\').foo', value => bob = value)">
                <span x-text="bob"></span>
                <button x-on:click="$component('test').foo = 'far'"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('car');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('far') });
    });
});
