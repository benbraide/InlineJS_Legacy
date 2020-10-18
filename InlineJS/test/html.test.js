import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-html directive', () => {
    it('should set html content on init', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span x-html="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('span').innerHTML).toEqual('bar') });
    });

    it('should be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <button x-on:click="foo = 'baz'"></button>
                <span x-html="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelector('span').innerHTML).toEqual('bar') });
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').innerHTML).toEqual('baz') });
    });
});
