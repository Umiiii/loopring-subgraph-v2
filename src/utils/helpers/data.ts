import { Bytes, BigInt, log } from "@graphprotocol/graph-ts";
import { intToString } from "./index";

export function extractData(data: String, offset: i32, length: i32): String {
  let start = offset * 2;
  let end = start + length * 2;
  if (data.length < end) {
    log.warning("Index out of range. end {}, length {}", [
      intToString(end),
      intToString(data.length)
    ]);
    return data.slice(start);
  }
  return data.slice(start, end);
}

export function extractDataInBits(data: String, offset: i32, bitSize: i32, bitOffset: i32) : i32{
    // three parts:
    // 1. first part: [bitOffset, 8]
    // 2. second part: full bytes
    // 3. third part: [0, bitSize % 8]
    offset = offset + Math.floor(bitOffset / 8) as i32;
    bitOffset = bitOffset %8;
    var bitSizeTmp = bitSize as i32;
    let firstByte = I32.parseInt(extractData(data,offset, 1), 16).toString(2).padStart(8, "0");
    let firstPart = firstByte.slice(bitOffset, Math.min(8, bitOffset + bitSize) as i32);
    bitSizeTmp = bitSizeTmp - firstPart.length;
    offset += 1;
    var secondPart = "";
    var secondPartByteSize = Math.floor(bitSizeTmp / 8) as i32;
    if (secondPartByteSize > 0) {
      let byte = I32.parseInt(extractData(data,offset, secondPartByteSize as i32), 16).toString(2).padStart(secondPartByteSize * 8 as i32, "0");
      secondPart += byte;
      bitSizeTmp -= secondPartByteSize * 8 as i32;
    
      offset += secondPartByteSize as i32;
    }
    let thirdPart = "";
    if (bitSizeTmp > 0) {
      let lastByte = I32.parseInt(extractData(data,offset, 1), 16).toString(2).padStart(8, "0");
      thirdPart = lastByte.slice(0, bitSizeTmp);
    }
    let finalStr = firstPart + secondPart + thirdPart;
   //console.log(firstPart, secondPart, thirdPart, finalStr);

    return I32.parseInt(finalStr, 2);
}

export function extractInt(data: String, offset: i32, length: i32): i32 {
  // We reverse the by data since fromUnsignedBytes assumes little endian and the data is big endian.
  return BigInt.fromUnsignedBytes(
    Bytes.fromHexString(extractData(data, offset, length)).reverse() as Bytes
  ).toI32();
}

export function extractBigInt(data: String, offset: i32, length: i32): BigInt {
  return BigInt.fromUnsignedBytes(
    Bytes.fromHexString(extractData(data, offset, length)).reverse() as Bytes
  );
}

export function stringBytesToI32(data: String): i32 {
  return stringBytesToBigInt(data).toI32();
}

export function stringBytesToBigInt(data: String): BigInt {
  return BigInt.fromUnsignedBytes(Bytes.fromHexString(data).reverse() as Bytes);
}

export function fromFloat(f: number, numBitsExponent: i32, numBitsMantissa: i32, exponentBase: i32): BigInt {
  let fff = f as i32;

  let exponent = fff  >> numBitsMantissa;
  if (exponent < 0) {
    log.error("Exponent is negative: {}", [exponent.toString()]);
    return BigInt.fromI32(0);
  }
  let step1 = (1 << numBitsMantissa)as i32; 
  let step2 = (step1 - 1) as i32;
  let step3 = (fff & step2) as i32;
  let mantissa = BigInt.fromI32(step3);
  let expSide = BigInt.fromI32(exponentBase).pow(exponent as u8);
  let value = mantissa * expSide;
 // log.debug("step1 {}, step2 {}, step3 {}, fromFloat f: {}, numBitsExponent: {}, numBitsMantissa: {}, exponentBase: {}, exponentfff: {}, mantissa {}, expside {}, value {}", [step1.toString(), step2.toString(), step3.toString(), fff.toString(), numBitsExponent.toString(), numBitsMantissa.toString(), 
 //   exponentBase.toString(), exponent.toString(), mantissa.toString(), expSide.toString(), value.toString()]);
  return value;
}

export function extractSignedBigIntFromFloat(f: number,   
  numBitsExponent: i32,
  numBitsMantissa: i32,
  exponentBase: i32) :BigInt {
    const MAX_DELTA_AMOUNT = Math.pow(2, 30) as i32;
    const compare = MAX_DELTA_AMOUNT / 2;
    let fasi32 = f as i32;
    let minusResult = (MAX_DELTA_AMOUNT - fasi32) as i32;
    if (fasi32 >= compare ){
      let minusBigInt = BigInt.fromI32(-1);
      let cvt = minusResult;
      let result = fromFloat(cvt, numBitsExponent, numBitsMantissa, exponentBase);
      let finalresult = result * minusBigInt;
     // log.debug("fasi32 {} result {}, finalresult {}", [fasi32.toString(), result.toString(), finalresult.toString()]);
      return finalresult;
    } else {
      return fromFloat(fasi32, numBitsExponent, numBitsMantissa, exponentBase);
    
  }
}

export function extractBigIntFromFloat(
  data: String,
  offset: i32,
  length: i32,
  numBitsExponent: i32,
  numBitsMantissa: i32,
  exponentBase: i32
): BigInt {
  let f = extractInt(data, offset, length);
  let exponent = f >> numBitsMantissa;
  let mantissa = BigInt.fromI32(f & ((1 << numBitsMantissa) - 1));
  let expSide = BigInt.fromI32(exponentBase).pow(exponent as u8);
  let value = mantissa * expSide;
  return value;
}

export function getTxData(
  data: String,
  offset: i32,
  index: i32,
  blockSize: i32
): String {
  let size1 = 80;
  let size2 = 3;
  let txData1 = extractData(data, offset + index * size1, size1);
  let txData2 = extractData(
    data,
    offset + blockSize * size1 + index * size2,
    size2
  );
  let txData = txData1.concat(txData2);
  return txData;
}

// Float24Encoding = FloatEncoding(5, 19, 10)
// Float16Encoding = FloatEncoding(5, 11, 10)
// Float12Encoding = FloatEncoding(5,  7, 10)
