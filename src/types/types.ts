import type {BaseCompound} from "../compound/BaseCompound.ts";

export type Constructor<T = any> = new (...args: any[]) => T;

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export type Return<T, R> = (val: T) => R;

export type Consumer<T> = (val: T) => void;

export type BiConsumer<T, U> = (val1: T, val2: U) => void;

export type AsyncConsumer<T> = (val: T) => Promise<void>;

export type UnaryOperator<T> = (val: T) => T;

export type Supplier<T> = () => T;

export type Predicate<T> = (val: T) => boolean;

export type CompoundSupplier = (name: string, pageName: string, context: HTMLElement) => BaseCompound;

export type Pair<K, V> = {
    key: K;
    value: V;
};