import {
    Swap,
    OrderbookTrade,
    Pair,
    Block,
    Proxy,
  } from "../../../../generated/schema";
  import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
  import {
    extractData,
    extractBigInt,
    extractInt,
    extractBigIntFromFloat,
    stringBytesToI32,
    stringBytesToBigInt
  } from "../data";
  import {
    getToken,
    intToString,
    getOrCreateAccountTokenBalance,
    getProtocolAccount,
    getOrCreatePair,
    getAndUpdateTokenDailyData,
    getAndUpdateTokenWeeklyData,
    getAndUpdatePairDailyData,
    getAndUpdatePairWeeklyData,
    calculatePrice,
    compoundIdToSortableDecimal,
    getAndUpdateAccountTokenBalanceDailyData,
    getAndUpdateAccountTokenBalanceWeeklyData,
  } from "../index";
  import {
    BIGINT_ZERO,
    TRANSACTION_ORDERBOOK_TRADE_TYPENAME,
    BIGINT_ONE,
  } from "../../constants";

export function processBatchSpotTrade(
    id: String,
    data: String,
    block: Block,
    proxy: Proxy
): void{

}