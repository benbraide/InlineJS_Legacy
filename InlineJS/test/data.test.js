import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-data directive', () => {
    it('should be reactive when manipulated on component object', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span x-text="foo"></span>
            </div>
        `;

        InlineJS.Bootstrap.Attach();

        expect(document.querySelector('span').textContent).toEqual('bar');

        InlineJS.RegionMap.entries[`rgn__0_${Object.keys(InlineJS.RegionMap.entries).length - 1}`].rootProxy_.nativeProxy_['foo'] = 'baz';

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
    });

    it('should have an optional attribute value', () => {
        document.body.innerHTML = `
            <div x-data>
                <span x-text="'foo'"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('foo');
    });

    it('can use this', () => {
        document.body.innerHTML = `
            <div x-data="{ text: this.dataset.text }" data-text="test">
              <span x-text="text"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('test');
    });

    it('should contain reactive functions', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar', getFoo() {return this.foo}}">
                <span x-text="getFoo()"></span>
                <button x-on:click="foo = 'baz'"></button>
            </div>
        `;
        
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
    });

    it('can be nested as scopes', () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
              <span x-text="foo"></span>
              <div x-data="{ foo: 'baz', other: 'value' }">
                <span x-text="foo"></span>
                <span x-text="$scope.foo"></span>
                <span x-text="$scope.other"></span>
                <span x-text="$scope.parent.foo"></span>
              </div>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[2].textContent).toEqual('baz');
        expect(document.querySelectorAll('span')[3].textContent).toEqual('value');
        expect(document.querySelectorAll('span')[4].textContent).toEqual('bar');
    });

    it('should contain reactive scopes', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span x-text="foo"></span>
                <div x-data="{ foo: 'baz' }">
                    <span x-text="foo"></span>
                    <span x-text="$scope.foo"></span>
                    <button x-on:click="$scope.foo = 'changed'"></button>
                </div>
            </div>
        `;

        InlineJS.Bootstrap.Attach();

        expect(document.querySelectorAll('span')[0].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('bar');
        expect(document.querySelectorAll('span')[2].textContent).toEqual('baz');

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelectorAll('span')[2].textContent).toEqual('changed') });
    });

    it('Proxies are not nested and duplicated when manipulating an array', async () => {
        document.body.innerHTML = `
            <div x-data="{ list: [ {name: 'foo'}, {name: 'bar'} ] }">
                <span x-text="$use(list[0].name)"></span>
                <button x-on:click="list.sort((a, b) => (a.name > b.name) ? 1 : -1)"></button>
                <h1 x-on:click="list.sort((a, b) => (a.name < b.name) ? 1 : -1)"></h1>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('foo') });

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });

        userEvent.click(document.querySelector('h1'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('foo') });

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });

        userEvent.click(document.querySelector('h1'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('foo') });

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });

        userEvent.click(document.querySelector('h1'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('foo') });

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });

        userEvent.click(document.querySelector('h1'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('foo') });

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });

        userEvent.click(document.querySelector('h1'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('foo') });

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });

        userEvent.click(document.querySelector('h1'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('foo') });

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });
    });

    it('should refresh one time per update whatever the number of mutations in the update', async () => {
        window.refreshCount = 0;
    
        document.body.innerHTML = `
            <div x-data="{ items: ['foo', 'bar'], qux: 'quux', test() {this.items; this.qux; return ++this.$window.refreshCount} }">
                <span x-text="test()"></span>
                <button x-on:click="(() => { items.push('baz'); qux = 'corge'; })()"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(window.refreshCount).toEqual(1);
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(window.refreshCount).toEqual(2) });
    });
});
