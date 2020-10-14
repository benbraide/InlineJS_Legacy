import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-show directive', () => {
    it('should toggle display: none; with no other style attributes', async () => {
        document.body.innerHTML = `
            <div x-data="{ show: true }">
                <span x-show="show"></span>
                <button x-on:click="show = false"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('style')).toEqual(null);
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('style')).toEqual('display: none;') });
    });
    
    it('should toggle display: none; with other style attributes', async () => {
        document.body.innerHTML = `
            <div x-data="{ show: true }">
                <span x-show="show" style="color: blue;"></span>
                <button x-on:click="show = false"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('style')).toEqual('color: blue;');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('style')).toEqual('color: blue; display: none;') });
    });
});
