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
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar');
        
        userEvent.clear(document.querySelector('input'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('') });
        
        userEvent.type(document.querySelector('input'), 'baz');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('baz') });
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

    it('should not reflect data changed elsewhere with the .out modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: '' }">
                <input value="bar" x-model.out="foo"></input>
                <button x-on:click="foo = 'baz'"></button>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('bar');
        expect(document.querySelector('span').textContent).toEqual('bar');
        
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('bar');
            expect(document.querySelector('span').textContent).toEqual('baz');
        });

        userEvent.clear(document.querySelector('input'));

        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('') });
        
        userEvent.type(document.querySelector('input'), 'out text');
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('out text') });
    });

    it('should not update value when updated via input event with the .in modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <input x-model.in="foo"></input>
                <button x-on:click="foo = 'baz'"></button>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('span').textContent).toEqual('bar');
        expect(document.querySelector('span').textContent).toEqual('bar');

        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('baz');
            expect(document.querySelector('span').textContent).toEqual('baz');
        });
        
        userEvent.clear(document.querySelector('input'));

        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('');
            expect(document.querySelector('span').textContent).toEqual('baz');
        });
        
        userEvent.type(document.querySelector('input'), 'out text');
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('out text');
            expect(document.querySelector('span').textContent).toEqual('baz');
        });
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

    it('should bind checkbox value to array with the .array modifier', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: ['bar'] }">
                <input type="checkbox" x-model.array="foo" value="bar"></input>
                <input type="checkbox" x-model.array="foo" value="baz"></input>
                <span :bar="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('input')[0].checked).toEqual(true);
        expect(document.querySelectorAll('input')[1].checked).toEqual(false);
        expect(document.querySelector('span').getAttribute('bar')).toEqual("bar");
    
        fireEvent.change(document.querySelectorAll('input')['1'], { target: { checked: true } });
    
        await waitFor(() => {
            expect(document.querySelectorAll('input')[0].checked).toEqual(true);
            expect(document.querySelectorAll('input')[1].checked).toEqual(true);
            expect(document.querySelector('span').getAttribute('bar')).toEqual("bar,baz");
        });
    });

    it('should support the .number modifier when binding checkbox value to array', async () => {
        document.body.innerHTML = `
            <div x-data="{ selected: [2] }">
                <input type="checkbox" value="1" x-model.array.number="selected" />
                <input type="checkbox" value="2" x-model.array.number="selected" />
                <input type="checkbox" value="3" x-model.array.number="selected" />
                <span :bar="$window.JSON.stringify(selected)"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('input[type=checkbox]')[0].checked).toEqual(false);
        expect(document.querySelectorAll('input[type=checkbox]')[1].checked).toEqual(true);
        expect(document.querySelectorAll('input[type=checkbox]')[2].checked).toEqual(false);
        expect(document.querySelector('span').getAttribute('bar')).toEqual("[2]");
    
        fireEvent.change(document.querySelectorAll('input[type=checkbox]')[2], { target: { checked: true } });
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('bar')).toEqual("[2,3]") });
    
        fireEvent.change(document.querySelectorAll('input[type=checkbox]')[0], { target: { checked: true } });
    
        await waitFor(() => { expect(document.querySelector('span').getAttribute('bar')).toEqual("[2,3,1]") });
    
        fireEvent.change(document.querySelectorAll('input[type=checkbox]')[0], { target: { checked: false } });
        fireEvent.change(document.querySelectorAll('input[type=checkbox]')[1], { target: { checked: false } });

        await waitFor(() => { expect(document.querySelector('span').getAttribute('bar')).toEqual("[3]") });
    });

    it('should bind radio value', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <input type="radio" x-model="foo" value="bar"></input>
                <input type="radio" x-model="foo" value="baz"></input>
                <span :bar="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('input')[0].checked).toEqual(true);
        expect(document.querySelectorAll('input')[1].checked).toEqual(false);
        expect(document.querySelector('span').getAttribute('bar')).toEqual('bar');
    
        fireEvent.change(document.querySelectorAll('input')[1], { target: { checked: true } });
    
        await waitFor(() => {
            expect(document.querySelectorAll('input')[0].checked).toEqual(false);
            expect(document.querySelectorAll('input')[1].checked).toEqual(true);
            expect(document.querySelector('span').getAttribute('bar')).toEqual('baz');
        });
    });

    it('should bind select dropdown', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: 'bar' }">
                <select x-model="foo">
                    <option disabled value="">Please select one</option>
                    <option>bar</option>
                    <option>baz</option>
                </select>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('option')[0].selected).toEqual(false);
        expect(document.querySelectorAll('option')[1].selected).toEqual(true);
        expect(document.querySelectorAll('option')[2].selected).toEqual(false);
        expect(document.querySelector('span').textContent).toEqual('bar');
    
        fireEvent.change(document.querySelector('select'), { target: { value: 'baz' } });
    
        await waitFor(() => {
            expect(document.querySelectorAll('option')[0].selected).toEqual(false);
            expect(document.querySelectorAll('option')[1].selected).toEqual(false);
            expect(document.querySelectorAll('option')[2].selected).toEqual(true);
            expect(document.querySelector('span').textContent).toEqual('baz');
        });
    });

    it('should bind multiple select dropdown', async () => {
        document.body.innerHTML = `
            <div x-data="{ foo: ['bar'] }">
                <select x-model="foo" multiple>
                    <option disabled value="">Please select one</option>
                    <option value="bar">bar</option>
                    <option value="baz">baz</option>
                </select>
                <span x-text="foo"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('option')[0].selected).toEqual(false);
        expect(document.querySelectorAll('option')[1].selected).toEqual(true);
        expect(document.querySelectorAll('option')[2].selected).toEqual(false);
        expect(document.querySelector('span').textContent).toEqual('bar');

        userEvent.selectOptions(document.querySelector('select'), ['bar', 'baz']);
    
        await waitFor(() => {
            expect(document.querySelectorAll('option')[0].selected).toEqual(false);
            expect(document.querySelectorAll('option')[1].selected).toEqual(true);
            expect(document.querySelectorAll('option')[2].selected).toEqual(true);
            expect(document.querySelector('span').textContent).toEqual('bar,baz');
        });
    });

    it('should bind nested keys', async () => {
        document.body.innerHTML = `
            <div x-data="{ some: { nested: { key: 'foo' } } }">
                <input type="text" x-model="some.nested.key">
                <span x-text="some.nested.key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('foo');
        expect(document.querySelector('span').textContent).toEqual('foo');
    
        fireEvent.input(document.querySelector('input'), { target: { value: 'bar' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('bar');
            expect(document.querySelector('span').textContent).toEqual('bar');
        });
    });

    it('should convert undefined nested model key to empty string by default', async () => {
        document.body.innerHTML = `
            <div x-data="{ some: { nested: {} } }">
                <input type="text" x-model="some.nested.key">
                <span x-text="some.nested.key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('');
        expect(document.querySelector('span').textContent).toEqual('');
    
        fireEvent.input(document.querySelector('input'), { target: { value: 'bar' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('bar');
            expect(document.querySelector('span').textContent).toEqual('bar');
        });
    });

    it('should bind color input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '#ff0000' }">
                <input type="color" x-model="key">
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('#ff0000');
        expect(document.querySelector('span').textContent).toEqual('#ff0000');
    
        fireEvent.input(document.querySelector('input'), { target: { value: '#00ff00' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('#00ff00');
            expect(document.querySelector('span').textContent).toEqual('#00ff00');
        });
    });

    it('should bind button input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: 'foo' }">
                <input type="button" x-model="key">
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('foo');
        expect(document.querySelector('span').textContent).toEqual('foo');
    
        fireEvent.input(document.querySelector('input'), { target: { value: 'bar' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('bar');
            expect(document.querySelector('span').textContent).toEqual('bar');
        });
    });

    it('should bind date input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '2020-07-10' }">
                <input type="date" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('2020-07-10');
        expect(document.querySelector('span').textContent).toEqual('2020-07-10');
    
        fireEvent.input(document.querySelector('input'), { target: { value: '2021-01-01' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('2021-01-01');
            expect(document.querySelector('span').textContent).toEqual('2021-01-01');
        });
    });

    it('should bind datetime-local input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '2020-01-01T20:00' }">
                <input type="datetime-local" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('2020-01-01T20:00');
        expect(document.querySelector('span').textContent).toEqual('2020-01-01T20:00');
    
        fireEvent.input(document.querySelector('input'), { target: { value: '2021-02-02T20:00' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('2021-02-02T20:00');
            expect(document.querySelector('span').textContent).toEqual('2021-02-02T20:00');
        });
    });

    it('should bind email input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: 'anon.legion@scope.ns' }">
                <input type="email" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('anon.legion@scope.ns');
        expect(document.querySelector('span').textContent).toEqual('anon.legion@scope.ns');
    
        fireEvent.input(document.querySelector('input'), { target: { value: 'user.last@some.sp' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('user.last@some.sp');
            expect(document.querySelector('span').textContent).toEqual('user.last@some.sp');
        });
    });

    it('should bind month input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '2020-04' }">
                <input type="month" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('2020-04');
        expect(document.querySelector('span').textContent).toEqual('2020-04');
    
        fireEvent.input(document.querySelector('input'), { target: { value: '2021-05' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('2021-05');
            expect(document.querySelector('span').textContent).toEqual('2021-05');
        });
    });

    it('should bind number input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '11' }">
                <input type="number" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('11');
        expect(document.querySelector('span').textContent).toEqual('11');
    
        fireEvent.input(document.querySelector('input'), { target: { value: '2021' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('2021');
            expect(document.querySelector('span').textContent).toEqual('2021');
        });
    });

    it('should bind password input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: 'SecretKey' }">
                <input type="password" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('SecretKey');
        expect(document.querySelector('span').textContent).toEqual('SecretKey');
    
        fireEvent.input(document.querySelector('input'), { target: { value: 'NewSecretKey' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('NewSecretKey');
            expect(document.querySelector('span').textContent).toEqual('NewSecretKey');
        });
    });

    it('should bind range input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '10' }">
                <input type="range" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('10');
        expect(document.querySelector('span').textContent).toEqual('10');
    
        fireEvent.input(document.querySelector('input'), { target: { value: '20' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('20');
            expect(document.querySelector('span').textContent).toEqual('20');
        });
    });

    it('should bind search input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '' }">
                <input type="search" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('');
        expect(document.querySelector('span').textContent).toEqual('');
    
        fireEvent.input(document.querySelector('input'), { target: { value: 'term' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('term');
            expect(document.querySelector('span').textContent).toEqual('term');
        });
    });

    it('should bind tel input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '+12345678901' }">
                <input type="tel " x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('+12345678901');
        expect(document.querySelector('span').textContent).toEqual('+12345678901');
    
        fireEvent.input(document.querySelector('input'), { target: { value: '+1239874560' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('+1239874560');
            expect(document.querySelector('span').textContent).toEqual('+1239874560');
        });
    });

    it('should bind time input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '22:00' }">
                <input type="time" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('22:00');
        expect(document.querySelector('span').textContent).toEqual('22:00');
    
        fireEvent.input(document.querySelector('input'), { target: { value: '23:00' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('23:00');
            expect(document.querySelector('span').textContent).toEqual('23:00');
        });
    });

    it('should bind week input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: '2020-W20' }">
                <input type="week" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('2020-W20');
        expect(document.querySelector('span').textContent).toEqual('2020-W20');
    
        fireEvent.input(document.querySelector('input'), { target: { value: '2020-W30' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('2020-W30');
            expect(document.querySelector('span').textContent).toEqual('2020-W30');
        });
    });

    it('should bind url input', async () => {
        document.body.innerHTML = `
            <div x-data="{ key: 'https://example.com' }">
                <input type="url" x-model="key" />
                <span x-text="key"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelector('input').value).toEqual('https://example.com');
        expect(document.querySelector('span').textContent).toEqual('https://example.com');
    
        fireEvent.input(document.querySelector('input'), { target: { value: 'https://whatismyip.com' } });
    
        await waitFor(() => {
            expect(document.querySelector('input').value).toEqual('https://whatismyip.com');
            expect(document.querySelector('span').textContent).toEqual('https://whatismyip.com');
        });
    });
});
