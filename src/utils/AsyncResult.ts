import {Result} from "./Result";

export class AsyncResult<T, E> {
    private readonly promise: Promise<Result<T, E>>;

    private constructor(promise: Promise<Result<T, E>>) {
        this.promise = promise;
    }

    public static from<T, E>(promise: Promise<Result<T, E>>): AsyncResult<T, E> {
        return new AsyncResult(promise);
    }

    public static of<T, E>(result: Result<T, E>): AsyncResult<T, E> {
        return new AsyncResult(Promise.resolve(result));
    }

    public static ok<T, E>(value: T): AsyncResult<T, E> {
        return AsyncResult.of(Result.ok(value));
    }

    public static err<T, E>(error: E): AsyncResult<T, E> {
        return AsyncResult.of(Result.err(error));
    }

    public map<U>(fn: (value: T) => Promise<U>): AsyncResult<U, E> {
        const nextPromise = this.promise.then(result =>
            result.asyncMap(fn)
        );
        return AsyncResult.from(nextPromise);
    }

    public mapErr<F>(fn: (error: E) => Promise<F>): AsyncResult<T, F> {
        const nextPromise = this.promise.then(result =>
            result.asyncMapErr(fn)
        );
        return AsyncResult.from(nextPromise);
    }

    public andThen<U>(fn: (value: T) => Promise<Result<U, E>>): AsyncResult<U, E> {
        const nextPromise = this.promise.then(result =>
            result.asyncAndThen(fn)
        );
        return AsyncResult.from(nextPromise);
    }

    public unwrap(): Promise<Result<T, E>> {
        return this.promise;
    }

    public async match<U>(
        okFn: (value: T) => U | Promise<U>,
        errFn: (error: E) => U | Promise<U>
    ): Promise<U> {
        const result = await this.promise;
        if (result.isOk()) {
            return okFn(result.unwrap());
        } else {
            return errFn(result.unwrapErr());
        }
    }
}