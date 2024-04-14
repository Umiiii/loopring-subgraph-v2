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
import { extractData, extractInt, getTxData } from "./data";
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
  offset += 20 + 32 + 32 +  32 + 32 + 4;
  block.protocolFeeTakerBips = extractInt(data, offset, 1);
  offset += 1;
  block.protocolFeeMakerBips = extractInt(data, offset, 1);
  offset += 1;
  block.numConditionalTransactions = extractInt(data, offset, 4);
  offset += 4;
  block.operatorAccountID = extractInt(data, offset, 4);
  offset += 4;
  block.operatorAccount = intToString(block.operatorAccountID);

  log.info("block.operatorAccount: {}", [block.operatorAccount])
  for (let i = 0; i < block.blockSize; i++) {
    let txData = getTxData(data, offset, i, block.blockSize);

    let txId = compoundId(block.id, intToString(i));

    let txType = txData.slice(0, 2);
    log.info("txType: {}", [txType])
    log.info("height: {}", [block.height.toString()])
    if (txType == TRANSACTION_NOOP) {
      // Do nothing
    } else if (txType == TRANSACTION_DEPOSIT) {
      processDeposit(txId, txData, block, proxy);
    }
    
    // else if (txType == TRANSACTION_WITHDRAWAL) {
    //   processWithdrawal(txId, txData, block, proxy);
    // } else if (txType == TRANSACTION_TRANSFER) {
    //   processTransfer(txId, txData, block, proxy);
    // } else if (txType == TRANSACTION_SPOT_TRADE) {
    //   processSpotTrade(txId, txData, block, proxy);
    // } else if (txType == TRANSACTION_ACCOUNT_UPDATE) {
    //   processAccountUpdate(txId, txData, block, proxy);
    // } else if (txType == TRANSACTION_ORDER_CANCEL) {
  
    // } else if (txType == TRANSACTION_BATCH_SPOT_TRADE) {
    // } else if (txType == TRANSACTION_APPKEY_UPDATE) {

    // }
    
  }
  return block as Block;
}
