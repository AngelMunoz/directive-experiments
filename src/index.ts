import haunted, { useState, BaseScheduler, GenericRenderer } from 'haunted';
import { html, noChange, render, TemplateResult } from 'lit-html';
import { directive, ChildPart, PartInfo, Part, DirectiveParameters, PartType } from 'lit-html/directive';
import { AsyncDirective } from 'lit-html/async-directive';

// use lit 2.0 render function rather than lit 1.0
const { component } = haunted({ render });

const includes = Array.prototype.includes;

function virtual(renderer: GenericRenderer) {
    const partToScheduler: WeakMap<VirtualComponent, Scheduler> = new WeakMap();
    const schedulerToPart: WeakMap<Scheduler, VirtualComponent> = new WeakMap();

    function teardownOnRemove(cont: BaseScheduler<GenericRenderer, VirtualComponent>, part: ChildPart, node = part.startNode): void {
        let frag = node.parentNode!;
        let mo = new MutationObserver(mutations => {
            for (let mutation of mutations) {
                if (includes.call(mutation.removedNodes, node)) {
                    mo.disconnect();

                    if (node.parentNode instanceof ShadowRoot) {
                        teardownOnRemove(cont, part);
                    } else {
                        cont.teardown();
                    }
                    break;
                } else if (includes.call(mutation.addedNodes, node.nextSibling)) {
                    mo.disconnect();
                    teardownOnRemove(cont, part, node.nextSibling || undefined);
                    break;
                }
            }
        });
        mo.observe(frag, { childList: true });
    }

    class Scheduler extends BaseScheduler<GenericRenderer, VirtualComponent> {
        args!: unknown[];

        constructor(renderer: GenericRenderer, part: VirtualComponent) {
            super(renderer, part);
            this.state.virtual = true;
        }

        render(): TemplateResult {
            return this.state.run(() => this.renderer.apply(this.host, this.args));
        }

        commit(result: TemplateResult): void {
            this.host.setValue(result);
        }

        teardown(): void {
            super.teardown();
            let part = schedulerToPart.get(this);
            partToScheduler.delete(part!);
        }
    }
    class VirtualComponent extends AsyncDirective {
        constructor(partInfo: PartInfo) {
            super(partInfo);
            if (partInfo.type !== PartType.CHILD) {
                throw new Error('The `virtual` directive must be used in a child element');
            }
        }
        update(part: Part, ...args: DirectiveParameters<this>[]) {
            // something weird is going on here
            // each time the parent updates it kills the virtual component
            // so when we try to get the scheduler we get undefined and 
            // register a new one killing the old result
            let cont = partToScheduler.get(this);
            if (!cont) {
                cont = new Scheduler(renderer, this);
                partToScheduler.set(this, cont);
                schedulerToPart.set(cont, this);
                teardownOnRemove(cont, part as ChildPart);
            }
            cont.args = args;
            cont.update();
        }
        render(...props: unknown[]) {
            // the render should be handled by update
            // because the scheduler should take care of the state updates
            return noChange;
        }

    }
    return directive(VirtualComponent);
}


const virtuallyRenderable = virtual(function lol(name, age, externalCount) {
    const [state, setState] = useState(0);
    return html`
        <h1>${name} - ${age}</h1>
        <p>Internal state: ${state} - externalState: ${externalCount}</p>
        <button @click=${() => setState(state + 1)}>+</button>
        <button @click=${() => setState(0)}>0</button>
        <button @click=${() => setState(state - 1)}>-</button>
    `;
});

function App() {
    const [state, setState] = useState(0);
    return html`
        <div>
            Normal Content
            <p>${state}</p>
            <button @click=${() => setState(state + 1)}>+</button>
            <button @click=${() => setState(0)}>0</button>
            <button @click=${() => setState(state - 1)}>-</button>
        </div>
        <p>
            It's cool, but sometimes the parent unmounts the virtual component.
            At least it seems to work. but we need to make sure that the virtual component
            doesn't get removed from the DOM.
        </p>
        <br>
        <div>
            <h1>Virtual Content</h1>
            ${virtuallyRenderable("frank", 20, state)}
        </div>
    `;
}

customElements.define('flap-app', component(App));