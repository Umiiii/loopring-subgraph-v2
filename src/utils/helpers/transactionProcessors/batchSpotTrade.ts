import {
    BatchSpotTrade,
    Pair,
    Block,
    Proxy,
  } from "../../../../generated/schema";
  import { BigInt, Address, Bytes , log} from "@graphprotocol/graph-ts";
  import {
    extractData,
    extractBigInt,
    extractDataInBits,
    extractInt,
    extractSignedBigIntFromFloat,
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

export function selectToken(tokenAID: i32, tokenBID: i32, bindTokenID: i32, tokenType: i32): [i32, i32] {
  if (tokenType == 0) {
    return [tokenAID, tokenBID];
  }
  if (tokenType == 1) {
    return [tokenAID, bindTokenID];
  }
  if (tokenType == 2) {
    return [tokenBID, bindTokenID];
  }
  return [0, 0]; 
}
  
export function processBatchSpotTrade(
    id: String,
    data: String,
    block: Block,
    proxy: Proxy
): void{
    proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
    block.transactionCount = block.transactionCount + BIGINT_ONE;
  
    let transaction = new BatchSpotTrade(id);
    transaction.internalID = compoundIdToSortableDecimal(id);
    transaction.data = data;
    transaction.block = block.id;
    var offset = 0 as i32;
    const firstBytes = I64.parseInt(extractData(data,offset, 1),16);
    const txType = (firstBytes & 0b11100000 ) >> 5;
    if (txType !== 5) {
        log.error("BatchSpotTrade, txType Error {}", [txType.toString()]);
      return;
    }
    const bindToken = firstBytes & 0b00011111;
    offset += 1;

    const firstToken =  extractInt(data,offset, 4);
    offset += 4;
    const secondToken = extractInt(data,offset, 4);
    offset += 4;
    log.debug("BatchSpotTrade, bindToken {} firstToken {}, secondToken {}", [bindToken.toString(), firstToken.toString(), secondToken.toString()]);
    transaction.tokenAID = firstToken;
    transaction.tokenBID = secondToken;
    transaction.bindTokenID = bindToken as i32;

    let tokenA = getToken((intToString(firstToken))) as Token;
    let tokenB = getToken((intToString(secondToken))) as Token;
    let bindTokenObj = getToken((intToString(bindToken))) as Token;

    transaction.tokenA = tokenA.id;
    transaction.tokenB = tokenB.id;
    transaction.bindToken = bindTokenObj.id;
    
    // - User1TokenType: 2bits  用户B-F的三个token选择情况。tokenType=0：选择币种1,2；tokenType=1：选择币种1,3；tokenType=2：选择2,3
    // - User2TokenType: 2bits
    // - User3TokenType: 2bits
    // - User4TokenType: 2bits
    // - User5TokenType: 2bits
    var bitOffset = 0 as i32;
    const user1TokenType_test = extractDataInBits(data,offset, 2, bitOffset);
    bitOffset += 2;
    const user2TokenType_test = extractDataInBits(data,offset, 2, bitOffset);
    bitOffset += 2;
    const user3TokenType_test = extractDataInBits(data,offset, 2, bitOffset);
    bitOffset += 2;
    const user4TokenType_test = extractDataInBits(data,offset, 2, bitOffset);
    bitOffset += 2;
    //offset += 1;
    const user5TokenType_test = extractDataInBits(data,offset, 2, bitOffset);
    bitOffset += 2;
   
    //log.debug("BatchSpotTrade, user1TokenType {}, user2TokenType {}, user3TokenType {}, user4TokenType {}, user5TokenType {}", [user1TokenType_test.toString(), user2TokenType_test.toString(), user3TokenType_test.toString(), user4TokenType_test.toString(), user5TokenType_test.toString()]);
    var user1TokenTypeSelection = selectToken(firstToken, secondToken, bindToken as i32, user1TokenType_test);
    var user2TokenTypeSelection = selectToken(firstToken, secondToken, bindToken as i32, user2TokenType_test);
    var user3TokenTypeSelection = selectToken(firstToken, secondToken, bindToken as i32, user3TokenType_test);
    var user4TokenTypeSelection = selectToken(firstToken, secondToken, bindToken as i32, user4TokenType_test);
    var user5TokenTypeSelection = selectToken(firstToken, secondToken, bindToken as i32, user5TokenType_test);
    transaction.accountBFirstTokenID = user1TokenTypeSelection[0];
    transaction.accountBSecondTokenID = user1TokenTypeSelection[1];
    transaction.accountCFirstTokenID = user2TokenTypeSelection[0];
    transaction.accountCSecondTokenID = user2TokenTypeSelection[1];
    transaction.accountDFirstTokenID = user3TokenTypeSelection[0];
    transaction.accountDSecondTokenID = user3TokenTypeSelection[1];
    transaction.accountEFirstTokenID = user4TokenTypeSelection[0];
    transaction.accountESecondTokenID = user4TokenTypeSelection[1];
    transaction.accountFFirstTokenID = user5TokenTypeSelection[0];
    transaction.accountFSecondTokenID = user5TokenTypeSelection[1];

    
    //for (let i = 0; i < 5; i++) {
    // let userAccountId = extractDataInBits(data,offset, 32, bitOffset);
    // bitOffset += 32;
    // let userFirstTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    // bitOffset += 30;
    // let userSecondTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    // bitOffset += 30;
    // let realNumber1 = extractSignedBigIntFromFloat(userFirstTokenAmountExchange, 5, 24, 10);
    // let realNumber2 = extractSignedBigIntFromFloat(userSecondTokenAmountExchange, 5, 24, 10);
    // log.debug("BatchSpotTrade, userAccountId {} userFirstTokenAmountExchange {} userSecondTokenAmountExchange {}, real1 {}, real2 {} typeof real1 {} typeof real2 {}", 
    // [userAccountId.toString(), userFirstTokenAmountExchange.toString(), userSecondTokenAmountExchange.toString(),
    //     realNumber1.toString(), realNumber2.toString(), typeof realNumber1, typeof realNumber2]);
    //   console.log("BatchSpotTrade, userAccountId", userAccountId);
    //   console.log("BatchSpotTrade, userFirstTokenAmountExchange", userFirstTokenAmountExchange, realNumber1.toString());
    //   console.log("BatchSpotTrade, userSecondTokenAmountExchange", userSecondTokenAmountExchange, realNumber2.toString());
    //}
    let userBAccountId = extractDataInBits(data,offset, 32, bitOffset);
    bitOffset += 32;
    let userBFirstTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let userBSecondTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let realNumber1B = extractSignedBigIntFromFloat(userBFirstTokenAmountExchange, 5, 24, 10);
    let realNumber2B = extractSignedBigIntFromFloat(userBSecondTokenAmountExchange, 5, 24, 10);
    transaction.accountIDB = userBAccountId;
    transaction.accountBFirstTokenAmountExchange = realNumber1B;
    transaction.accountBSecondTokenAmountExchange = realNumber2B;

    let userCAccountId = extractDataInBits(data,offset, 32, bitOffset);
    bitOffset += 32;
    let userCFirstTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let userCSecondTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let realNumber1C = extractSignedBigIntFromFloat(userCFirstTokenAmountExchange, 5, 24, 10);
    let realNumber2C = extractSignedBigIntFromFloat(userCSecondTokenAmountExchange, 5, 24, 10);
    transaction.accountIDC = userCAccountId;
    transaction.accountCFirstTokenAmountExchange = realNumber1C;
    transaction.accountCSecondTokenAmountExchange = realNumber2C;

    let userDAccountId = extractDataInBits(data,offset, 32, bitOffset);
    bitOffset += 32;
    let userDFirstTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let userDSecondTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let realNumber1D = extractSignedBigIntFromFloat(userDFirstTokenAmountExchange, 5, 24, 10);
    let realNumber2D = extractSignedBigIntFromFloat(userDSecondTokenAmountExchange, 5, 24, 10);
    transaction.accountIDD = userDAccountId;
    transaction.accountDFirstTokenAmountExchange = realNumber1D;
    transaction.accountDSecondTokenAmountExchange = realNumber2D;

    let userEAccountId = extractDataInBits(data,offset, 32, bitOffset);
    bitOffset += 32;
    let userEFirstTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let userESecondTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let realNumber1E = extractSignedBigIntFromFloat(userEFirstTokenAmountExchange, 5, 24, 10);
    let realNumber2E = extractSignedBigIntFromFloat(userESecondTokenAmountExchange, 5, 24, 10);
    transaction.accountIDE = userEAccountId;
    transaction.accountEFirstTokenAmountExchange = realNumber1E;
    transaction.accountESecondTokenAmountExchange = realNumber2E;

    let userFAccountId = extractDataInBits(data,offset, 32, bitOffset);
    bitOffset += 32;
    let userFFirstTokenAmountFxchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let userFSecondTokenAmountFxchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let realNumber1F = extractSignedBigIntFromFloat(userFFirstTokenAmountFxchange, 5, 24, 10);
    let realNumber2F = extractSignedBigIntFromFloat(userFSecondTokenAmountFxchange, 5, 24, 10);
    transaction.accountIDF = userFAccountId;
    transaction.accountFFirstTokenAmountExchange = realNumber1F;
    transaction.accountFSecondTokenAmountExchange = realNumber2F;


    let user0AccountID = extractDataInBits(data,offset, 32, bitOffset);
    bitOffset += 32;
    let user0FirstTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let user0SecondTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;
    let user0ThirdTokenAmountExchange = extractDataInBits(data,offset, 30, bitOffset);
    bitOffset += 30;

    transaction.accountIDA = user0AccountID;
    transaction.accountAFirstTokenAmountExchange = extractSignedBigIntFromFloat(user0FirstTokenAmountExchange, 5, 24, 10);
    transaction.accountASecondTokenAmountExchange = extractSignedBigIntFromFloat(user0SecondTokenAmountExchange, 5, 24, 10);
    transaction.accountAThirdTokenAmountExchange = extractSignedBigIntFromFloat(user0ThirdTokenAmountExchange, 5, 24, 10);
    
    transaction.save();

}