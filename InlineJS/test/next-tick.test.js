import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('$nextTick global magic property', () => {
    it('should execute attached callback', async () => {
        document.body.innerHTML = `
            <div x-data="{foo: 'bar', onClick: function(){ this.foo = 'baz'; this.$nextTick(() => {this.$refs.span.textContent = 'bob'}) } }">
                <span x-ref="span" x-text="foo"></span>
                <button x-on:click="onClick()"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => expect(document.querySelector('span').textContent).toEqual('bob'));
    });

    it('should wait for x-for to finish rendering', async () => {
        document.body.innerHTML = `
            <div x-data="{list: ['one', 'two'], check: 2, onClick: function(){ this.list = ['one', 'two', 'three']; this.$nextTick(() => {this.check = document.querySelectorAll('span').length}) }}">
                <span x-each="list" x-text="$each.value"></span>
                <p x-text="check"></p>
                <button x-on:click="onClick()"></button>
            </div>
        `;
    
        InlineJS.Region.enableOptimizedBinds = false;
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('p').textContent).toEqual('2');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('p').textContent).toEqual('3') });
    });
});
