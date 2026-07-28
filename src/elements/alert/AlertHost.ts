// @ts-nocheck TODO
export class AlertHost extends HTMLElement {
    public static MAX_VISIBLE = 5;

    public constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot!.appendChild(template.content.cloneNode(true));
    }

    public connectedCallback() {
        if (!document.querySelector('alert-host')) {
            document.body.appendChild(this);
        }
    }
}

customElements.define('alert-host', AlertHost);