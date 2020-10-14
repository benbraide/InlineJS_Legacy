import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-attr directive', () => {
    it('should set corresponding value on initialization', () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span x-attr:foo="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
    });

    it('should be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span x-attr:foo="foo"></span>
                <button x-on:click="foo = 'baz'"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
        
        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });

    it('should accept a key-value map', () => {
        document.body.innerHTML = `
            <div x-data="{ map: { foo: 'bar', zoo: 'tiger' } }">
                <span x-attr="map"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
        expect(document.querySelector('span').getAttribute('zoo')).toEqual('tiger');
    });

    it('should have reactive key-value map', async () => {
        document.body.innerHTML = `
            <div x-data="{ map: { foo: 'bar', zoo: 'tiger' } }">
                <span x-attr="map"></span>
                <button x-on:click="map.zoo = 'leopard'"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
        expect(document.querySelector('span').getAttribute('zoo')).toEqual('tiger');

        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('bar') });
        await waitFor(() => { expect(document.querySelector('span').getAttribute('zoo')).toEqual('leopard') });
    });

    it('should accept the short form and be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <span :foo="foo"></span>
                <button x-on:click="foo = 'baz'"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').getAttribute('foo')).toEqual('bar');
        
        userEvent.click(document.querySelector('button'));

        await waitFor(() => { expect(document.querySelector('span').getAttribute('foo')).toEqual('baz') });
    });

    it('should remove non-boolean attributes with null/undefined/false values', () => {
        document.body.innerHTML = `
            <div x-data="{}">
                <a href="#hello" x-attr:href="null"></a>
                <a href="#hello" x-attr:href="false"></a>
                <a href="#hello" x-attr:href="undefined"></a>
                <span visible="true" x-attr:visible="null"></span>
                <span visible="true" x-attr:visible="false"></span>
                <span visible="true" x-attr:visible="undefined"></span>
            </div>
        `;
        
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('a')[0].getAttribute('href')).toBeNull();
        expect(document.querySelectorAll('a')[1].getAttribute('href')).toBeNull();
        expect(document.querySelectorAll('a')[2].getAttribute('href')).toBeNull();
        expect(document.querySelectorAll('span')[0].getAttribute('visible')).toBeNull();
        expect(document.querySelectorAll('span')[1].getAttribute('visible')).toBeNull();
        expect(document.querySelectorAll('span')[2].getAttribute('visible')).toBeNull();
    });

    it('should not remove non-boolean attributes with null/undefined/false values', () => {
        document.body.innerHTML = `
            <div x-data="{}">
                <a href="#hello" x-attr:href="''"></a>
            </div>
        `;

        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('a')[0].getAttribute('href')).toEqual('');
    });

    it('should set boolean attributes with truthy values to their attribute name', () => {
        document.body.innerHTML = `
            <div x-data="{ isSet: true }">
                <input x-attr:disabled="isSet"></input>
                <input x-attr:checked="isSet"></input>
                <input x-attr:required="isSet"></input>
                <input x-attr:readonly="isSet"></input>
                <details x-attr:open="isSet"></details>
                <select x-attr:multiple="isSet"></select>
                <option x-attr:selected="isSet"></option>
                <textarea x-attr:autofocus="isSet"></textarea>
                <dl x-attr:itemscope="isSet"></dl>
                <form x-attr:novalidate="isSet"></form>
                <iframe
                    x-attr:allowfullscreen="isSet"
                    x-attr:allowpaymentrequest="isSet"
                ></iframe>
                <button x-attr:formnovalidate="isSet"></button>
                <audio
                    x-attr:autoplay="isSet"
                    x-attr:controls="isSet"
                    x-attr:loop="isSet"
                    x-attr:muted="isSet"
                ></audio>
                <video x-attr:playsinline="isSet"></video>
                <track x-attr:default="isSet" />
                <img x-attr:ismap="isSet" />
                <ol x-attr:reversed="isSet"></ol>
                <script
                    x-attr:async="isSet"
                    x-attr:defer="isSet"
                    x-attr:nomodule="isSet"
                ></script>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('input')[0].disabled).toBeTruthy();
        expect(document.querySelectorAll('input')[1].checked).toBeTruthy();
        expect(document.querySelectorAll('input')[2].required).toBeTruthy();
        expect(document.querySelectorAll('input')[3].readOnly).toBeTruthy();
        expect(document.querySelectorAll('details')[0].open).toBeTruthy();
        expect(document.querySelectorAll('option')[0].selected).toBeTruthy();
        expect(document.querySelectorAll('select')[0].multiple).toBeTruthy();
        expect(document.querySelectorAll('textarea')[0].autofocus).toBeTruthy();
        expect(document.querySelectorAll('dl')[0].attributes.itemscope).toBeTruthy();
        expect(document.querySelectorAll('form')[0].attributes.novalidate).toBeTruthy();
        expect(document.querySelectorAll('iframe')[0].attributes.allowfullscreen).toBeTruthy();
        expect(document.querySelectorAll('iframe')[0].attributes.allowpaymentrequest).toBeTruthy();
        expect(document.querySelectorAll('button')[0].attributes.formnovalidate).toBeTruthy();
        expect(document.querySelectorAll('audio')[0].attributes.autoplay).toBeTruthy();
        expect(document.querySelectorAll('audio')[0].attributes.controls).toBeTruthy();
        expect(document.querySelectorAll('audio')[0].attributes.loop).toBeTruthy();
        expect(document.querySelectorAll('audio')[0].attributes.muted).toBeTruthy();
        expect(document.querySelectorAll('video')[0].attributes.playsinline).toBeTruthy();
        expect(document.querySelectorAll('track')[0].attributes.default).toBeTruthy();
        expect(document.querySelectorAll('img')[0].attributes.ismap).toBeTruthy();
        expect(document.querySelectorAll('ol')[0].attributes.reversed).toBeTruthy();
        expect(document.querySelectorAll('script')[0].attributes.async).toBeTruthy();
        expect(document.querySelectorAll('script')[0].attributes.defer).toBeTruthy();
        expect(document.querySelectorAll('script')[0].attributes.nomodule).toBeTruthy();
    });

    it('should remove boolean attributes with falsy values', () => {
        document.body.innerHTML = `
            <div x-data="{ isSet: false }">
                <input x-attr:disabled="isSet"></input>
                <input x-attr:checked="isSet"></input>
                <input x-attr:required="isSet"></input>
                <input x-attr:readonly="isSet"></input>
                <input x-attr:hidden="isSet"></input>
                <details x-attr:open="isSet"></details>
                <select x-attr:multiple="isSet"></select>
                <option x-attr:selected="isSet"></option>
                <textarea x-attr:autofocus="isSet"></textarea>
                <dl x-attr:itemscope="isSet"></dl>
                <form x-attr:novalidate="isSet"></form>
                <iframe
                    x-attr:allowfullscreen="isSet"
                    x-attr:allowpaymentrequest="isSet"
                ></iframe>
                <button x-attr:formnovalidate="isSet"></button>
                <audio
                    x-attr:autoplay="isSet"
                    x-attr:controls="isSet"
                    x-attr:loop="isSet"
                    x-attr:muted="isSet"
                ></audio>
                <video x-attr:playsinline="isSet"></video>
                <track x-attr:default="isSet" />
                <img x-attr:ismap="isSet" />
                <ol x-attr:reversed="isSet"></ol>
                <script
                    x-attr:async="isSet"
                    x-attr:defer="isSet"
                    x-attr:nomodule="isSet"
                ></script>
            </div>
        `;

        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('input')[0].getAttribute('disabled')).toBeNull();
        expect(document.querySelectorAll('input')[1].getAttribute('checked')).toBeNull();
        expect(document.querySelectorAll('input')[2].getAttribute('required')).toBeNull();
        expect(document.querySelectorAll('input')[3].getAttribute('readOnly')).toBeNull();
        expect(document.querySelectorAll('input')[4].getAttribute('hidden')).toBeNull();
        expect(document.querySelectorAll('details')[0].getAttribute('open')).toBeNull();
        expect(document.querySelectorAll('option')[0].getAttribute('selected')).toBeNull();
        expect(document.querySelectorAll('select')[0].getAttribute('multiple')).toBeNull();
        expect(document.querySelectorAll('textarea')[0].getAttribute('autofocus')).toBeNull();
        expect(document.querySelectorAll('dl')[0].getAttribute('itemscope')).toBeNull();
        expect(document.querySelectorAll('form')[0].getAttribute('novalidate')).toBeNull();
        expect(document.querySelectorAll('iframe')[0].getAttribute('allowfullscreen')).toBeNull();
        expect(document.querySelectorAll('iframe')[0].getAttribute('allowpaymentrequest')).toBeNull();
        expect(document.querySelectorAll('button')[0].getAttribute('formnovalidate')).toBeNull();
        expect(document.querySelectorAll('audio')[0].getAttribute('autoplay')).toBeNull();
        expect(document.querySelectorAll('audio')[0].getAttribute('controls')).toBeNull();
        expect(document.querySelectorAll('audio')[0].getAttribute('loop')).toBeNull();
        expect(document.querySelectorAll('audio')[0].getAttribute('muted')).toBeNull();
        expect(document.querySelectorAll('video')[0].getAttribute('playsinline')).toBeNull();
        expect(document.querySelectorAll('track')[0].getAttribute('default')).toBeNull();
        expect(document.querySelectorAll('img')[0].getAttribute('ismap')).toBeNull();
        expect(document.querySelectorAll('ol')[0].getAttribute('reversed')).toBeNull();
        expect(document.querySelectorAll('script')[0].getAttribute('async')).toBeNull();
        expect(document.querySelectorAll('script')[0].getAttribute('defer')).toBeNull();
        expect(document.querySelectorAll('script')[0].getAttribute('nomodule')).toBeNull();
    });

    it('.camel modifier correctly sets name of attribute', () => {
        document.body.innerHTML = `
            <div x-data>
                <svg x-attr:view-box.camel="'0 0 42 42'"></svg>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('svg').getAttribute('viewBox')).toEqual('0 0 42 42');
    });

    it('names can contain numbers', () => {
        document.body.innerHTML = `
            <svg x-data>
                <line x1="1" y1="2" :x2="3" x-attr:y2="4" />
            </svg>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('line').getAttribute('x2')).toEqual('3');
        expect(document.querySelector('line').getAttribute('y2')).toEqual('4');
    });

    it('non-string and non-boolean attributes are cast to string when bound to checkbox', () => {
        document.body.innerHTML = `
            <div x-data="{ number: 100, zero: 0, bool: true, nullProp: null }">
                <input type="checkbox" id="number" :value="number">
                <input type="checkbox" id="zero" :value="zero">
                <input type="checkbox" id="boolean" :value="bool">
                <input type="checkbox" id="null" :value="nullProp">
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('#number').value).toEqual('100');
        expect(document.querySelector('#zero').value).toEqual('0');
        expect(document.querySelector('#boolean').value).toEqual('true');
        expect(document.querySelector('#null').value).toEqual('on');
    });
});
