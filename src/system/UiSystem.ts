import {ClosePageCompound} from "../compound/global/ClosePageCompound.ts";

export class UiSystem {
    public static CLOSE_PAGE: ClosePageCompound;

    public static init() {
        this.CLOSE_PAGE = new ClosePageCompound();

        Object.freeze(this);
    }
}