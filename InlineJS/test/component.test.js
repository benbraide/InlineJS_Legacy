import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('component behavior', () => {
    it('can be initialized with the x-component directive', () => {
        document.body.innerHTML = `
            <div x-data x-component="inlinejs">
                <span x-text="$componentKey"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('inlinejs');
    });

    it('can be initialized with the $component key during data initialization', () => {
        document.body.innerHTML = `
            <div x-data="{ $component: 'inlinejs-2' }">
                <span x-text="$componentKey"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('inlinejs-2');
    });

    it('can retrieve the current component via the $componentKey global magic property', () => {
        document.body.innerHTML = `
            <div x-data="{ $component: 'inlinejs-3' }">
                <span x-text="$componentKey"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('inlinejs-3');
    });

    it('can retrieve another component via the $component global magic property', () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }" x-component="data"></div>
            <div x-data>
                <span x-text="$component('data').foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar');
    });

    it('should ensure data retrieved from other components are reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }" x-component="data2">
                <span x-text="foo"></span>
                <button x-on:click="foo='changed in data2'"></button>
            </div>
            <div x-data="{ foo: 'baz' }">
                <span x-text="foo"></span>
                <span x-text="$component('data2').foo"></span>
                <button x-on:click="foo='unnamed changed'"></button>
                <button x-on:click="$component('data2').foo='changed in unnamed'"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('baz');
        expect(document.querySelectorAll('span')[2].textContent).toEqual('bar');

        userEvent.click(document.querySelectorAll('button')[0]);

        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('changed in data2');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('baz');
            expect(document.querySelectorAll('span')[2].textContent).toEqual('changed in data2');
        });

        userEvent.click(document.querySelectorAll('button')[1]);

        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('changed in data2');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('unnamed changed');
            expect(document.querySelectorAll('span')[2].textContent).toEqual('changed in data2');
        });

        userEvent.click(document.querySelectorAll('button')[2]);

        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('changed in unnamed');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('unnamed changed');
            expect(document.querySelectorAll('span')[2].textContent).toEqual('changed in unnamed');
        });
    });

    it('should obey per region optimized setting when accessing data from other components', async () => {
        document.body.innerHTML = `
            <div x-data="{ nested: {foo: 'bar'} }" x-component="data3">
                <span x-text="nested.foo"></span>
                <button x-on:click="nested = {foo: 'unoptimized'}"></button>
            </div>
            <div x-data="{ $enableOptimizedBinds: false }">
                <span x-text="$component('data3').nested.foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('bar');

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('bar') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('unoptimized') });
    });

    it('should obey \'$use\' global magic property when accessing data from other components', async () => {
        document.body.innerHTML = `
            <div x-data="{ nested: {foo: 'bar'} }" x-component="data4">
                <span x-text="nested.foo"></span>
                <button x-on:click="nested = {foo: 'unoptimized'}"></button>
            </div>
            <div x-data>
                <span x-text="$use($component('data4').nested.foo)"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('bar');

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('bar') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('unoptimized') });
    });

    it('optimized setting in other components should not affect current component', async () => {
        document.body.innerHTML = `
            <div x-data="{ $enableOptimizedBinds: false, nested: {foo: 'bar'} }" x-component="data5">
                <span x-text="nested.foo"></span>
                <button x-on:click="nested = {foo: 'unoptimized'}"></button>
            </div>
            <div x-data>
                <span x-text="$component('data5').nested.foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('bar');

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('unoptimized') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('bar') });
    });
});
