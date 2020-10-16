import { InlineJS } from '../src/inlinejs'

import { waitFor, fireEvent } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-model directive', () => {
    it('should have value binding when initialized', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <input x-model="foo"></input>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('bar');
    });

    it('should update value when updated via input event', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <input x-model="foo"></input>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('bar');
        
        userEvent.clear(document.querySelector('input'));

        await waitFor(() => { expect(document.querySelector('input').value).toEqual('') });
        
        userEvent.type(document.querySelector('input'), 'baz');
    
        await waitFor(() => { expect(document.querySelector('input').value).toEqual('baz') });
    });

    it('should reflect data changed elsewhere', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <input x-model="foo"></input>
                <button x-on:click="foo = 'baz'"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('bar');
        
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('input').value).toEqual('baz') });
    });

    it('should cast value to number if .number modifier is present', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: null }">
                <input type="number" x-model.number="foo"></input>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        fireEvent.input(document.querySelector('input'), { target: { value: '123' } });
        
        await waitFor(() => { expect(InlineJS.RegionMap.entries[`rgn_${Object.keys(InlineJS.RegionMap.entries).length - 1}`].rootProxy_.nativeProxy_['foo']).toEqual(123) });
    });

    it('should cast to null if empty, original value if casting fails, numeric value if casting passes', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 0, bar: '' }">
                <input type="number" x-model.number="foo"></input>
                <input x-model.number="bar"></input>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        fireEvent.input(document.querySelectorAll('input')[0], { target: { value: '' } });
    
        await waitFor(() => { expect(InlineJS.RegionMap.entries[`rgn_${Object.keys(InlineJS.RegionMap.entries).length - 1}`].rootProxy_.nativeProxy_['foo']).toEqual(null) });
    
        fireEvent.input(document.querySelectorAll('input')[0], { target: { value: '-' } });
    
        await waitFor(() => { expect(InlineJS.RegionMap.entries[`rgn_${Object.keys(InlineJS.RegionMap.entries).length - 1}`].rootProxy_.nativeProxy_['foo']).toEqual(null) });
        
        fireEvent.input(document.querySelectorAll('input')[0], { target: { value: '-123' } });
    
        await waitFor(() => { expect(InlineJS.RegionMap.entries[`rgn_${Object.keys(InlineJS.RegionMap.entries).length - 1}`].rootProxy_.nativeProxy_['foo']).toEqual(-123) });
    
        fireEvent.input(document.querySelectorAll('input')[1], { target: { value: '' } });
    
        await waitFor(() => { expect(InlineJS.RegionMap.entries[`rgn_${Object.keys(InlineJS.RegionMap.entries).length - 1}`].rootProxy_.nativeProxy_['bar']).toEqual(null) });
        
        fireEvent.input(document.querySelectorAll('input')[1], { target: { value: '-' } });
    
        await waitFor(() => { expect(InlineJS.RegionMap.entries[`rgn_${Object.keys(InlineJS.RegionMap.entries).length - 1}`].rootProxy_.nativeProxy_['bar']).toEqual('-') });
    
        fireEvent.input(document.querySelectorAll('input')[1], { target: { value: '-123' } });
    
        await waitFor(() => { expect(InlineJS.RegionMap.entries[`rgn_${Object.keys(InlineJS.RegionMap.entries).length - 1}`].rootProxy_.nativeProxy_['bar']).toEqual(-123) });
    });

    it('should trim value if .trim modifier is present', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: '' }">
                <input x-model.trim="foo"></input>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        fireEvent.input(document.querySelector('input'), { target: { value: 'bar   ' } });
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });
    });

    it('should update value when updated via changed event when .lazy modifier is present', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <input x-model.lazy="foo"></input>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();

        fireEvent.input(document.querySelector('input'), { target: { value: 'baz' } });
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });
    
        fireEvent.change(document.querySelector('input'), { target: { value: 'baz' } });
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
    });

    it('should bind checkbox value', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: true }">
                <input type="checkbox" x-model="foo"></input>
                <span :bar="$window.JSON.stringify(foo)"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').checked).toEqual(true);
        expect(document.querySelector('span').getAttribute('bar')).toEqual('true');

        fireEvent.change(document.querySelector('input'), { target: { checked: false } });
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('bar')).toEqual('false') });
    });
});
