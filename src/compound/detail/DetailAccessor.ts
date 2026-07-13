import {DetailContext} from "../../context/DetailContext.ts";

export class DetailAccessor {
    private readonly context: DetailContext;

    public constructor(context: DetailContext) {
        this.context = context;
    }

    public displayed() {
        return this.context.displayed();
    }
}