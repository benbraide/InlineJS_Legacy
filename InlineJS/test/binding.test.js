import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('data binding', () => {
    it('should be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span x-text="foo"></span>
                <button x-on:click="foo = 'baz'"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar');

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
    });

    it('should be optimized by default', async () => {
        document.body.innerHTML = `
            <div x-data="{ nested: {foo: 'bar'} }">
                <span x-text="nested.foo"></span>
                <span x-text="nested"></span>
                <button x-on:click="nested.foo = 'baz'"></button>
                <button x-on:click="nested = {foo: 'unoptimized'}"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('{"foo":"bar"}');

        userEvent.click(document.querySelectorAll('button')[0]);

        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('baz') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('{"foo":"baz"}') });

        userEvent.click(document.querySelectorAll('button')[1]);

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('{"foo":"unoptimized"}') });
    });

    it('should obey global optimized setting', async () => {
        document.body.innerHTML = `
            <div x-data="{ nested: {foo: 'bar'} }">
                <span x-text="nested.foo"></span>
                <span x-text="nested"></span>
                <button x-on:click="nested.foo = 'baz'"></button>
                <button x-on:click="nested = {foo: 'unoptimized'}"></button>
            </div>
        `;
    
        InlineJS.Config.SetOptimizedBindsState(false);
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('{"foo":"bar"}');

        userEvent.click(document.querySelectorAll('button')[0]);

        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('baz') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('{"foo":"baz"}') });

        userEvent.click(document.querySelectorAll('button')[1]);

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('unoptimized') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('{"foo":"unoptimized"}') });

        InlineJS.Config.SetOptimizedBindsState(true);
    });

    it('should obey per region optimized setting', async () => {
        document.body.innerHTML = `
            <div x-data="{ nested: {foo: 'bar'}, $enableOptimizedBinds: false }">
                <span x-text="nested.foo"></span>
                <span x-text="nested"></span>
                <button x-on:click="nested.foo = 'baz'"></button>
                <button x-on:click="nested = {foo: 'unoptimized'}"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('{"foo":"bar"}');

        userEvent.click(document.querySelectorAll('button')[0]);

        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('baz') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('{"foo":"baz"}') });

        userEvent.click(document.querySelectorAll('button')[1]);

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('unoptimized') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('{"foo":"unoptimized"}') });
    });

    it('should obey \'$use\' global magic property', async () => {
        document.body.innerHTML = `
            <div x-data="{ nested: {foo: 'bar'} }">
                <span x-text="nested.foo"></span>
                <span x-text="$use(nested.foo)"></span>
                <button x-on:click="nested = {foo: 'unoptimized'}"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('bar');

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelectorAll('span')[0].textContent).toEqual('bar') });
        await waitFor(() => { expect(document.querySelectorAll('span')[1].textContent).toEqual('unoptimized') });
    });
});
