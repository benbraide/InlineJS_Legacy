import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-class directive', () => {
    it('should remove class when attribute value is falsy', () => {
        document.body.innerHTML = `
            <div x-data="{ foo: false }">
                <span class="foo" x-class:foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeFalsy();
    });

    it('should add class when attribute value is falsy', () => {
        document.body.innerHTML = `
            <div x-data="{ foo: true }">
                <span x-class:foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
    });

    it('should be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: true }">
                <span x-class:foo="foo"></span>
                <button x-on:click="foo = false"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
        
        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').classList.contains('foo')).toBeFalsy() });
    });

    it('should accept a key-value map', () => {
        document.body.innerHTML = `
            <div x-data="{ map: { foo: true, zoo: false } }">
                <span x-class="map"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
        expect(document.querySelector('span').classList.contains('zoo')).toBeFalsy();
    });

    it('should have reactive key-value map', async () => {
        document.body.innerHTML = `
            <div x-data="{ map: { foo: true, zoo: false } }">
                <span x-class="map"></span>
                <button x-on:click="map.foo = !(map.zoo = true)"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
        expect(document.querySelector('span').classList.contains('zoo')).toBeFalsy();

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').classList.contains('foo')).toBeFalsy() });
        await waitFor(() => { expect(document.querySelector('span').classList.contains('zoo')).toBeTruthy() });
    });

    it('should accept the short form and be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: true }">
                <span .foo="foo"></span>
                <button x-on:click="foo = false"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
        
        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').classList.contains('foo')).toBeFalsy() });
    });

    it('should be merged by string syntax', async () => {
        document.body.innerHTML = `
            <div x-data="{ isOn: false }">
                <span class="foo" x-class.list="isOn ? 'bar': ''"></span>
                <button @click="isOn = ! isOn"></button>
            </div>
        `;
        
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
        expect(document.querySelector('span').classList.contains('bar')).toBeFalsy();
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => {
            expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
            expect(document.querySelector('span').classList.contains('bar')).toBeTruthy();
        });
    
        document.querySelector('button').click();
    
        await waitFor(() => {
            expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
            expect(document.querySelector('span').classList.contains('bar')).toBeFalsy();
        });
    });

    it('should be merged by array syntax', async () => {
        document.body.innerHTML = `
            <div x-data="{ isOn: false }">
                <span class="foo" x-class.list="isOn ? ['bar', 'baz']: ['bar']"></span>
                <button @click="isOn = ! isOn"></button>
            </div>
        `;
        
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
        expect(document.querySelector('span').classList.contains('bar')).toBeTruthy();
        expect(document.querySelector('span').classList.contains('baz')).toBeFalsy();
    
        document.querySelector('button').click();
    
        await waitFor(() => {
            expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
            expect(document.querySelector('span').classList.contains('bar')).toBeTruthy();
            expect(document.querySelector('span').classList.contains('baz')).toBeTruthy();
        });
    
        document.querySelector('button').click();
    
        await waitFor(() => {
            expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
            expect(document.querySelector('span').classList.contains('bar')).toBeTruthy();
            expect(document.querySelector('span').classList.contains('baz')).toBeFalsy();
        });
    });

    it('multiple classes are removed by object syntax', () => {
        document.body.innerHTML = `
            <div x-data="{ isOn: false }">
                <span class="foo bar" x-class="{ 'foo bar': isOn }"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeFalsy();
        expect(document.querySelector('span').classList.contains('bar')).toBeFalsy();
    });

    it('multiple classes are added by object syntax', () => {
        document.body.innerHTML = `
            <div x-data="{ isOn: true }">
                <span x-class="{ 'foo bar': isOn }"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
        expect(document.querySelector('span').classList.contains('bar')).toBeTruthy();
    });

    it('should be added by nested object syntax', () => {
        document.body.innerHTML = `
            <div x-data="{ nested: { isOn: true } }">
                <span x-class="{ 'foo': nested.isOn }"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
    });

    it('should be added by array syntax', () => {
        document.body.innerHTML = `
            <div x-data="{}">
                <span class="" x-class.list="['foo']"></span>
            </div>
        `;
        
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
    });

    it('should be synced by string syntax', () => {
        document.body.innerHTML = `
            <div x-data="{foo: 'bar baz'}">
                <span class="" x-class.list="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('bar')).toBeTruthy();
        expect(document.querySelector('span').classList.contains('baz')).toBeTruthy();
    });

    it('should ignore extra whitespace in object syntax', async () => {
        document.body.innerHTML = `
            <div x-data>
                <span x-class="{ '  foo  bar  ': true }"></span>
            </div>
        `;

        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
        expect(document.querySelector('span').classList.contains('bar')).toBeTruthy();
    });
    
    it('should ignore extra whitespace in string syntax', () => {
        document.body.innerHTML = `
            <div x-data>
                <span x-class.list="'  foo  bar  '"></span>
            </div>
        `;

        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').classList.contains('foo')).toBeTruthy();
        expect(document.querySelector('span').classList.contains('bar')).toBeTruthy();
    });
});
