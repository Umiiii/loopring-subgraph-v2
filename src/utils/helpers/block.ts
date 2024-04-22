import { Token, Exchange, Block, Proxy } from "../../../generated/schema";
import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { ERC20 } from "../../../generated/OwnedUpgradabilityProxy/ERC20";
import { DEFAULT_DECIMALS } from "../../utils/decimals";
import {
  BIGINT_ZERO,
  BIGINT_ONE,
  BIGDECIMAL_ZERO,
  ZERO_ADDRESS,
  TRANSACTION_NOOP,
  TRANSACTION_DEPOSIT,
  TRANSACTION_SPOT_TRADE,
  TRANSACTION_TRANSFER,
  TRANSACTION_WITHDRAWAL,
  TRANSACTION_ACCOUNT_UPDATE,
  TRANSACTION_APPKEY_UPDATE,
  TRANSACTION_ORDER_CANCEL,
  TRANSACTION_BATCH_SPOT_TRADE,
} from "../../utils/constants";
import { extractBigInt, extractData, extractInt, getTxData } from "./data";
import { intToString, compoundId } from "./index";
import { getProxy } from "./upgradabilityProxy";
import {
  processDeposit,
  processSpotTrade,
  processTransfer,
  processWithdrawal,
  processAccountUpdate,
  processSignatureVerification,
} from "./transactionProcessors";


export function processBlockData(block: Block, proxy: Proxy): Block {
  let data = block.data.slice(2); // Remove the 0x beginning of the hex string
  let offset = 0;

  // General data
  block.exchange = extractData(data, offset, 20);
  offset += 20;

  offset += 32 + 32 +  32 + 32; 
  // bytes32 merkleRootBefore;
  // bytes32 merkleRootAfter;
  // bytes32 merkleAssetRootBefore;
  // bytes32 merkleAssetRootAfter;

  let timestampStr = extractData(data, offset, 4);
  block.timestamp = extractBigInt(data, offset, 4);
  offset += 4;
  log.debug("block timestamp: {}, timestampStr{}", [block.timestamp.toString(), timestampStr]);

  let protocolFeeStr = extractData(data, offset, 2);
  block.protocolFeeBips = extractInt(data, offset, 2);
  offset += 2;
  log.debug("block protocolFeeBips: {}, protocolFeeStr{}", [block.protocolFeeBips.toString(), protocolFeeStr]);

  let numConditionalTransactionsStr = extractData(data, offset, 4);
  block.numConditionalTransactions = extractInt(data, offset, 4);
  offset += 4;
  log.debug("block numConditionalTransactions: {}, numConditionalTransactionsStr{}", [block.numConditionalTransactions.toString(), numConditionalTransactionsStr]);

  let operatorAccountIDStr = extractData(data, offset, 4);
  block.operatorAccountID = extractInt(data, offset, 4);
  offset += 4;

  log.debug("block operatorAccountID: {}, operatorAccountIDStr{}", [block.operatorAccountID.toString(), operatorAccountIDStr]);
  let size = extractData(data, offset, 8);
  log.debug("block size: {}", [size]);

  block.depositSize = extractInt(data, offset, 2);
  offset += 2;
  block.accountUpdateSize = extractInt(data, offset, 2);
  offset += 2;
  block.withdrawSize = extractInt(data, offset, 2);
  offset += 2;

  block.operatorAccount = intToString(block.operatorAccountID);

  log.debug("block {} data size {}, protocolFeeBips: {}, numConditionalTransactions: {}, operatorAccountID: {}, depositSize: {}, accountUpdateSize: {}, withdrawalSize: {}",
   [block.height.toString(), block.blockSize.toString(), block.protocolFeeBips.toString(),
    block.numConditionalTransactions.toString(), block.operatorAccountID.toString(),
    block.depositSize.toString(), block.accountUpdateSize.toString(), block.withdrawSize.toString()])
  log.info("block.operatorAccount: {}", [block.operatorAccount])
  // if (block.numConditionalTransactions != 0) {
  //     let offset = block.numConditionalTransactions - block.depositSize - block.accountUpdateSize;
  //     block.accountUpdateSize = block.accountUpdateSize + offset;
  //     log.info("fix accountUpdateSize: {}, offset {}", [block.accountUpdateSize.toString(), offset.toString()]);
  // }
  for (let i = 0; i < block.blockSize; i++) {
    const txData = getTxData(data, offset, i, block.blockSize);

    let txId = compoundId(block.id, intToString(i));

    let txType = TRANSACTION_NOOP;
    if (i < block.depositSize) {
      txType = TRANSACTION_DEPOSIT;
    } else if (i < block.depositSize + block.accountUpdateSize) {
      txType = TRANSACTION_ACCOUNT_UPDATE;
    } else if (i < block.blockSize - block.withdrawSize) {
      let dataInString = txData.toString();
      let txTypeString = dataInString.slice(0, 2);
      txType = txTypeString
      log.info("txTypeString: {}, data", [txType.toString(), dataInString]);
    } else {
      txType = TRANSACTION_WITHDRAWAL;
    }
    
    log.info("i: {}, txType: {} height: {}, block data depositSize: {}, accountUpdateSize: {}, withdrawalSize: {}, txData {}", [i.toString(), txType, block.height.toString(),
       block.depositSize.toString(), block.accountUpdateSize.toString(), block.withdrawSize.toString(), txData.toString()]);

    if (txType == TRANSACTION_NOOP) {
      // Do nothing
    } else if (txType == TRANSACTION_DEPOSIT) {
      processDeposit(txId, txData, block, proxy);
    }
    
    else if (txType == TRANSACTION_WITHDRAWAL) {
      processWithdrawal(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_TRANSFER) {
      processTransfer(txId, txData, block, proxy);
    }
    //  else if (txType == TRANSACTION_SPOT_TRADE) {
    //   processSpotTrade(txId, txData, block, proxy);
    
    else if (txType == TRANSACTION_ACCOUNT_UPDATE) {
      processAccountUpdate(txId, txData, block, proxy);
    } else if (txType == TRANSACTION_ORDER_CANCEL) {
    }
    // } else if (txType == TRANSACTION_BATCH_SPOT_TRADE) {
    // } else if (txType == TRANSACTION_APPKEY_UPDATE) {

    // }
    
  }
  return block as Block;
}
