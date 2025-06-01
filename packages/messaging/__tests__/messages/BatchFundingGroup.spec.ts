import { Value } from '@node-dlc/bitcoin';
import { BufferReader } from '@node-dlc/bufio';
import { expect } from 'chai';

import { BatchFundingGroup } from '../../lib';
import { deserializeTlv } from '../../lib/serialize/deserializeTlv';
import { getTlv } from '../../lib/serialize/getTlv';

describe('BatchFundingGroup TLV', () => {
  it('should serialize and deserialize without contract ids', () => {
    const batchFundingGroup = new BatchFundingGroup();

    const eventIds = ['event1', 'event2', 'event3'];

    batchFundingGroup.eventIds = eventIds;
    batchFundingGroup.allocatedCollateral = Value.fromBitcoin(0.5);

    const deserialized = BatchFundingGroup.deserialize(
      batchFundingGroup.serialize(),
    );

    expect(deserialized.eventIds).to.deep.equal(eventIds);
    expect(batchFundingGroup.serialize()).to.deep.equal(
      deserialized.serialize(),
    );
  });

  it('should serialize and deserialize with contract ids', () => {
    const batchFundingGroup = new BatchFundingGroup();

    const eventIds = ['event1', 'event2', 'event3'];

    batchFundingGroup.eventIds = eventIds;
    batchFundingGroup.allocatedCollateral = Value.fromBitcoin(0.5);
    batchFundingGroup.tempContractIds = [
      Buffer.from('tempContractId1'),
      Buffer.from('tempContractId2'),
      Buffer.from('tempContractId3'),
    ];
    batchFundingGroup.contractIds = [
      Buffer.from('contractId1'),
      Buffer.from('contractId2'),
      Buffer.from('contractId3'),
    ];

    const deserialized = BatchFundingGroup.deserialize(
      batchFundingGroup.serialize(),
    );

    expect(deserialized.eventIds).to.deep.equal(eventIds);
    expect(batchFundingGroup.serialize()).to.deep.equal(
      deserialized.serialize(),
    );
  });

  it('should serialize and deserialize with empty contract ids', () => {
    const batchFundingGroup = new BatchFundingGroup();

    const eventIds = ['event1', 'event2', 'event3'];

    batchFundingGroup.eventIds = eventIds;
    batchFundingGroup.allocatedCollateral = Value.fromBitcoin(0.5);
    batchFundingGroup.tempContractIds = [];
    batchFundingGroup.contractIds = [];

    const deserialized = BatchFundingGroup.deserialize(
      batchFundingGroup.serialize(),
    );

    expect(deserialized.eventIds).to.deep.equal(eventIds);
    expect(batchFundingGroup.serialize()).to.deep.equal(
      deserialized.serialize(),
    );
  });
});
