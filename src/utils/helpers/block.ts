import { Block } from "../../../generated/schema";
import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { DEFAULT_DECIMALS } from "../../utils/decimals";
import {
  BIGINT_ZERO,
  BIGINT_ONE,
  BIGDECIMAL_ZERO,
  ZERO_ADDRESS
} from "../../utils/constants";
import { extractData, extractInt } from "./data";
import { intToString, compoundId } from "./index";
import { processTransactionData } from "./transaction";
import { getProxy } from './upgradabilityProxy'

export function getOrCreateBlock(internalID: BigInt): Block {
  let id = internalID.toString()
  let block = Block.load(id);

  if (block == null) {
    block = new Block(id);
    block.internalID = internalID
    block.transactionCount = BIGINT_ZERO
  }

  return block as Block;
}

export function processBlockData(block: Block): Block {
  let proxy = getProxy()

  let data = block.data.slice(2); // Remove the 0x beginning of the hex string
  let offset = 0;

  // General data
  offset += 20 + 32 + 32 + 4;
  block.protocolFeeTakerBips = extractInt(data, offset, 1);
  offset += 1;
  block.protocolFeeMakerBips = extractInt(data, offset, 1);
  offset += 1;
  block.numConditionalTransactions = extractInt(data, offset, 4);
  offset += 4;
  block.operatorAccountID = extractInt(data, offset, 4);
  offset += 4;
  block.operatorAccount = intToString(block.operatorAccountID)

  for (let i = 0; i < block.blockSize; i++) {
    let size1 = 29;
    let size2 = 39;
    let txData1 = extractData(data, offset + i * size1, size1);
    let txData2 = extractData(
      data,
      offset + block.blockSize * size1 + i * size2,
      size2
    );
    let txData = txData1.concat(txData2);

    let txId = compoundId(block.id, intToString(i));
    let txValid = processTransactionData(txId, txData, block);
    if (txValid) {
      proxy.transactionCount = proxy.transactionCount + BIGINT_ONE
      block.transactionCount = block.transactionCount + BIGINT_ONE
    }
  }

  proxy.save()

  return block as Block;
}
