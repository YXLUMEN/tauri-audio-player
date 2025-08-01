export interface IBaseFetch extends RequestInit {
    ignore_err?: Array<number>, // baseFetch 不会创建警示框
}