import {PromisePool} from "../src/util/PromisePool.ts";
import {sleep} from "../src/util/util.ts";

async function main() {
    const pool = new PromisePool(1);
    pool.spawn(job, 1);
    pool.spawn(job, 2);
    pool.spawn(job, 3);
    pool.spawn(job, 4);

    console.log(pool.activeCount(), pool.taskCounts());
    const result = await pool.join();
    console.log('exist', result);
}

async function job(id: number) {
    console.log('start');
    await sleep(500);

    // if (id % 2 === 0) throw new Error(`Id: ${id}`);
    // else console.log('done', Date.now().toLocaleString());
    throw new Error(`Id: ${id}`);
}

main();