import { InlineJS } from '../src/inlinejs'

import { waitFor } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'

let expect = require('expect');

global.MutationObserver = class {
    observe() {}
};

describe('x-each directive', () => {
    it('should work on arrays', () => {
        document.body.innerHTML = `
            <div x-data>
                <p x-each="['foo', 'bar']" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(2);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.foo.2');
        expect(document.querySelectorAll('p')[1].textContent).toEqual('1.bar.2');
    });

    it('should support the \'as <name>\' syntax on arrays', () => {
        document.body.innerHTML = `
            <div x-data>
                <p x-each="['foo', 'bar'] as item" x-text="\`\${$each.index}.\${$each.value}.\${item}.\${$each.count}\`"></p>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(2);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.foo.foo.2');
        expect(document.querySelectorAll('p')[1].textContent).toEqual('1.bar.bar.2');
    });

    it('should work on key-value pairs', () => {
        document.body.innerHTML = `
            <div x-data>
                <p x-each="{ name: 'John Doe', age: 36, gender: 'MALE' }" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(3);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('name.John Doe.3');
        expect(document.querySelectorAll('p')[1].textContent).toEqual('age.36.3');
        expect(document.querySelectorAll('p')[2].textContent).toEqual('gender.MALE.3');
    });

    it('should support the \'as <name>\' syntax on key-value pairs', () => {
        document.body.innerHTML = `
            <div x-data>
                <p x-each="{ name: 'John Doe', age: 36, gender: 'MALE' } as item" x-text="\`\${$each.index}.\${$each.value}.\${item}.\${$each.count}\`"></p>
            </div>
        `;
        
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(3);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('name.John Doe.John Doe.3');
        expect(document.querySelectorAll('p')[1].textContent).toEqual('age.36.36.3');
        expect(document.querySelectorAll('p')[2].textContent).toEqual('gender.MALE.MALE.3');
    });

    it('should work on positive integer ranges', () => {
        document.body.innerHTML = `
            <div x-data>
                <p x-each="3" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(3);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.0.3');
        expect(document.querySelectorAll('p')[1].textContent).toEqual('1.1.3');
        expect(document.querySelectorAll('p')[2].textContent).toEqual('2.2.3');
    });

    it('should work on positive integer ranges with count modifier', () => {
        document.body.innerHTML = `
            <div x-data>
                <p x-each.count="3" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(3);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.1.3');
        expect(document.querySelectorAll('p')[1].textContent).toEqual('1.2.3');
        expect(document.querySelectorAll('p')[2].textContent).toEqual('2.3.3');
    });

    it('should work on positive integer ranges with reverse modifier', () => {
        document.body.innerHTML = `
            <div x-data>
                <p x-each.reverse="3" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(3);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.2.3');
        expect(document.querySelectorAll('p')[1].textContent).toEqual('1.1.3');
        expect(document.querySelectorAll('p')[2].textContent).toEqual('2.0.3');
    });

    it('should work on negative integer ranges', () => {
        document.body.innerHTML = `
            <div x-data>
                <p x-each="-3" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(3);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.0.3');
        expect(document.querySelectorAll('p')[1].textContent).toEqual('1.-1.3');
        expect(document.querySelectorAll('p')[2].textContent).toEqual('2.-2.3');
    });

    it('should support the \'as <name>\' syntax on integer ranges', () => {
        document.body.innerHTML = `
            <div x-data>
                <p x-each.count="3 as num" x-text="\`\${$each.index}.\${$each.value}.\${num}.\${$each.count}\`"></p>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(3);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.1.1.3');
        expect(document.querySelectorAll('p')[1].textContent).toEqual('1.2.2.3');
        expect(document.querySelectorAll('p')[2].textContent).toEqual('2.3.3.3');
    });
    
    it('should be reactive when array is replaced', async () => {
        document.body.innerHTML = `
            <div x-data="{ list: ['foo'] }">
                <p x-each="list" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
                <button x-on:click="list = ['foo', 'bar']"></button>
            </div>
        `;
    
        InlineJS.Region.enableOptimizedBinds = false;
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(1);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.foo.1');
        
        userEvent.click(document.querySelector('button'));
        
        await waitFor(() => {
            expect(document.querySelectorAll('p').length).toEqual(2);
            expect(document.querySelectorAll('p')[0].textContent).toEqual('0.foo.2');
            expect(document.querySelectorAll('p')[1].textContent).toEqual('1.bar.2');
        });
    });

    it('should be reactive when array is manipulated', async () => {
        document.body.innerHTML = `
            <div x-data="{ list: ['foo'] }">
                <p x-each="list" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
                <button x-on:click="list.push('bar')"></button>
                <button x-on:click="list.unshift('first')"></button>
                <button x-on:click="list.splice(1, 1)"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(1);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.foo.1');
        
        userEvent.click(document.querySelectorAll('button')[0]);
        
        await waitFor(() => {
            expect(document.querySelectorAll('p').length).toEqual(2);
            expect(document.querySelectorAll('p')[0].textContent).toEqual('0.foo.2');
            expect(document.querySelectorAll('p')[1].textContent).toEqual('1.bar.2');
        });

        userEvent.click(document.querySelectorAll('button')[1]);
        
        await waitFor(() => {
            expect(document.querySelectorAll('p').length).toEqual(3);
            expect(document.querySelectorAll('p')[0].textContent).toEqual('0.first.3');
            expect(document.querySelectorAll('p')[1].textContent).toEqual('1.foo.3');
            expect(document.querySelectorAll('p')[2].textContent).toEqual('2.bar.3');
        });

        userEvent.click(document.querySelectorAll('button')[2]);
        
        await waitFor(() => {
            expect(document.querySelectorAll('p').length).toEqual(2);
            expect(document.querySelectorAll('p')[0].textContent).toEqual('0.first.2');
            expect(document.querySelectorAll('p')[1].textContent).toEqual('1.bar.2');
        });
    });

    it('should support the \'as <name>\' syntax and be reactive', async () => {
        document.body.innerHTML = `
            <div x-data="{ list: ['foo'] }">
                <p x-each="list as item" x-text="\`\${$each.index}.\${$each.value}.\${item}.\${$each.count}\`"></p>
                <button x-on:click="list = ['foo', 'bar']"></button>
            </div>
        `;
    
        InlineJS.Region.enableOptimizedBinds = false;
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(1);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.foo.foo.1');
        
        userEvent.click(document.querySelector('button'));
        
        await waitFor(() => {
            expect(document.querySelectorAll('p').length).toEqual(2);
            expect(document.querySelectorAll('p')[0].textContent).toEqual('0.foo.foo.2');
            expect(document.querySelectorAll('p')[1].textContent).toEqual('1.bar.bar.2');
        });
    });
    
    it('should remove all elements when array is empty', async () => {
        document.body.innerHTML = `
            <div x-data="{ list: ['foo'] }">
                <p x-each="list" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
                <button x-on:click="list = []"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(1);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('0.foo.1');
        
        userEvent.click(document.querySelector('button'));
        
        await waitFor(() => { expect(document.querySelectorAll('p').length).toEqual(0) });
    });

    it('should remove all elements when object is empty', async () => {
        document.body.innerHTML = `
            <div x-data="{ list: {key: 'value'} }">
                <p x-each="list" x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></p>
                <button x-on:click="list = {}"></button>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('p').length).toEqual(1);
        expect(document.querySelectorAll('p')[0].textContent).toEqual('key.value.1');
        
        userEvent.click(document.querySelector('button'));
        
        await waitFor(() => { expect(document.querySelectorAll('p').length).toEqual(0) });
    });

    it('should contain reactive elements', async () => {
        document.body.innerHTML = `
            <div x-data="{ items: ['first'], foo: 'bar' }">
                <button x-on:click="foo = 'baz'"></button>
                <span x-each="items">
                    <h1 x-text="\`\${$each.index}.\${$each.value}.\${$each.count}\`"></h1>
                    <h2 x-text="foo"></h2>
                </span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span').length).toEqual(1);
        expect(document.querySelector('h1').textContent).toEqual('0.first.1');
        expect(document.querySelector('h2').textContent).toEqual('bar');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => {
            expect(document.querySelector('h1').textContent).toEqual('0.first.1');
            expect(document.querySelector('h2').textContent).toEqual('baz');
        });
    });

    it('can be used in conjunction with x-each', async () => {
        document.body.innerHTML = `
            <div x-data="{ items: ['foo', 'bar'], show: false }">
                <button @click="show = ! show"></button>
                <span x-if="show" x-each="items" x-text="$each.value"></span>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span').length).toEqual(0);
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(2) });
    
        userEvent.click(document.querySelector('button'));
        
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(0) });

        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(2) });
    
        userEvent.click(document.querySelector('button'));
        
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(0) });

        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(2) });
    
        userEvent.click(document.querySelector('button'));
        
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(0) });
    });

    it('should give listeners fresh iteration data even though they are only registered initially', async () => {
        document.body.innerHTML = `
            <div x-data="{ items: ['foo'], output: '' }">
                <button x-on:click="items = ['bar']"></button>
                <span x-each="items" x-text="$each.value" x-on:click="output = $each.value"></span>
                <h1 x-text="output"></h1>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        expect(document.querySelectorAll('span').length).toEqual(1);
    
        userEvent.click(document.querySelector('span'));
    
        await waitFor(() => { expect(document.querySelector('h1').textContent).toEqual('foo') });
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelector('span').textContent).toEqual('bar') });
    
        userEvent.click(document.querySelector('span'));
    
        await waitFor(() => { expect(document.querySelector('h1').textContent).toEqual('bar') });
    });

    it('can be nested', async () => {
        document.body.innerHTML = `
            <div x-data="{ foos: [ { bars: ['bob', 'lob'] } ] }">
                <button x-on:click="foos = [ {bars: ['bob', 'lob']}, {bars: ['law']} ]"></button>
                <h1 x-each="foos">
                    <span x-each="$each.value.bars" x-text="$each.value"></span>
                </h1>
            </div>
        `;
    
        InlineJS.Region.enableOptimizedBinds = false;
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelectorAll('h1').length).toEqual(1) });
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(2) });
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bob');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('lob');
    
        userEvent.click(document.querySelector('button'));
    
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(3) });
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('bob');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('lob');
        expect(document.querySelectorAll('span')[2].textContent).toEqual('law');
    });

    it('should be able to access parent data when nested', async () => {
        document.body.innerHTML = `
            <div x-data="{ foos: [ {name: 'foo', bars: ['bob', 'lob']}, {name: 'baz', bars: ['bab', 'lab']} ] }">
                <h1 x-each="foos">
                    <span x-each="$each.value.bars" x-text="$each.parent.value.name+': '+$each.value"></span>
                </h1>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelectorAll('h1').length).toEqual(2) });
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(4) });
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob');
        expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab');
        expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab');
    });

    it('should support the \'as <name>\' syntax and be able to access parent data when nested', async () => {
        document.body.innerHTML = `
            <div x-data="{ foos: [ {name: 'foo', bars: ['bob', 'lob']}, {name: 'baz', bars: ['bab', 'lab']} ] }">
                <h1 x-each="foos as foo">
                    <span x-each="foo.bars as bar" x-text="foo.name+': '+bar"></span>
                </h1>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelectorAll('h1').length).toEqual(2) });
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(4) });
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob');
        expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab');
        expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab');
    });
    
    it('should be able to handle nested event listeners', async () => {
        document._alerts = [];
    
        document.body.innerHTML = `
            <div x-data="{ foos: [
                {name: 'foo', bars: [{name: 'bob', count: 0}, {name: 'lob', count: 0}]},
                {name: 'baz', bars: [{name: 'bab', count: 0}, {name: 'lab', count: 0}]}
            ], fnText: function(foo, bar) { return foo.name+': '+bar.name+' = '+bar.count; }, onClick: function(foo, bar){ bar.count += 1; document._alerts.push(this.fnText(foo, bar)) } }">
                <h1 x-each="foos">
                    <span x-each="$each.value.bars" x-text="fnText($each.parent.value, $each.value)" x-on:click="onClick($each.parent.value, $each.value)" ></span>
                </h1>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelectorAll('h1').length).toEqual(2) });
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(4) });
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob = 0');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob = 0');
        expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab = 0');
        expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab = 0');
    
        expect(document._alerts.length).toEqual(0);
    
        userEvent.click(document.querySelectorAll('span')[0]);
    
        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob = 1');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob = 0');
            expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab = 0');
            expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab = 0');
    
            expect(document._alerts.length).toEqual(1);
            expect(document._alerts[0]).toEqual('foo: bob = 1');
        });
    
        userEvent.click(document.querySelectorAll('span')[2]);
    
        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob = 1');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob = 0');
            expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab = 1');
            expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab = 0');
    
            expect(document._alerts.length).toEqual(2)
            expect(document._alerts[0]).toEqual('foo: bob = 1')
            expect(document._alerts[1]).toEqual('baz: bab = 1')
        });
    
        userEvent.click(document.querySelectorAll('span')[0]);
    
        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob = 2');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob = 0');
            expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab = 1');
            expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab = 0');
    
            expect(document._alerts.length).toEqual(3);
            expect(document._alerts[0]).toEqual('foo: bob = 1');
            expect(document._alerts[1]).toEqual('baz: bab = 1');
            expect(document._alerts[2]).toEqual('foo: bob = 2');
        });
    });

    it('should support the \'as <name>\' syntax and be able to handle nested event listeners', async () => {
        document._alerts = [];
    
        document.body.innerHTML = `
            <div x-data="{ foos: [
                {name: 'foo', bars: [{name: 'bob', count: 0}, {name: 'lob', count: 0}]},
                {name: 'baz', bars: [{name: 'bab', count: 0}, {name: 'lab', count: 0}]}
            ], fnText: function(foo, bar) { return foo.name+': '+bar.name+' = '+bar.count; }, onClick: function(foo, bar){ bar.count += 1; document._alerts.push(this.fnText(foo, bar)) } }">
                <h1 x-each="foos as foo">
                    <span x-each="foo.bars as bar" x-text="fnText(foo, bar)" x-on:click="onClick(foo, bar)" ></span>
                </h1>
            </div>
        `;
    
        InlineJS.Bootstrap.Attach();
    
        await waitFor(() => { expect(document.querySelectorAll('h1').length).toEqual(2) });
        await waitFor(() => { expect(document.querySelectorAll('span').length).toEqual(4) });
    
        expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob = 0');
        expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob = 0');
        expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab = 0');
        expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab = 0');
    
        expect(document._alerts.length).toEqual(0);
    
        userEvent.click(document.querySelectorAll('span')[0]);
    
        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob = 1');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob = 0');
            expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab = 0');
            expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab = 0');
    
            expect(document._alerts.length).toEqual(1);
            expect(document._alerts[0]).toEqual('foo: bob = 1');
        });
    
        userEvent.click(document.querySelectorAll('span')[2]);
    
        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob = 1');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob = 0');
            expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab = 1');
            expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab = 0');
    
            expect(document._alerts.length).toEqual(2)
            expect(document._alerts[0]).toEqual('foo: bob = 1')
            expect(document._alerts[1]).toEqual('baz: bab = 1')
        });
    
        userEvent.click(document.querySelectorAll('span')[0]);
    
        await waitFor(() => {
            expect(document.querySelectorAll('span')[0].textContent).toEqual('foo: bob = 2');
            expect(document.querySelectorAll('span')[1].textContent).toEqual('foo: lob = 0');
            expect(document.querySelectorAll('span')[2].textContent).toEqual('baz: bab = 1');
            expect(document.querySelectorAll('span')[3].textContent).toEqual('baz: lab = 0');
    
            expect(document._alerts.length).toEqual(3);
            expect(document._alerts[0]).toEqual('foo: bob = 1');
            expect(document._alerts[1]).toEqual('baz: bab = 1');
            expect(document._alerts[2]).toEqual('foo: bob = 2');
        });
    });
});
