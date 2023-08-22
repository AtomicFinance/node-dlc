import { BitField } from '@node-lightning/core';
import { expect } from 'chai';

import { Address } from '../../lib/domain/Address';
import { NodeAnnouncementMessage } from '../../lib/messages/NodeAnnouncementMessage';

describe('NodeAnnouncementMessage', () => {
  describe('deserialize basic message', () => {
    const input = Buffer.from(
      'c8c205d3b12aacb824409ce8724609fe453fdcd33a498ecca170784985c4a6a2765657c4ef9e1170d3a5795ec86021c3a081c84a9f3a02e2ca66d17b683baacae08000005cddd5e5036b96e4713c5f84dcb8030592e1bd42a2d9a43d91fa2e535b9bfd05f2c5def9b9b6d43364656d6f312e6c6e646578706c6f7265722e636f6d0000000000000000000000000701265736a32611',
      'hex',
    );

    let result: NodeAnnouncementMessage;

    before(() => {
      result = NodeAnnouncementMessage.deserialize(input);
    });

    it('should be type 51394', () => {
      expect(result.type).to.equal(51394);
    });

    it('should have a 64-byte signature', () => {
      expect(result.signature).to.deep.equal(
        Buffer.from(
          '05d3b12aacb824409ce8724609fe453fdcd33a498ecca170784985c4a6a2765657c4ef9e1170d3a5795ec86021c3a081c84a9f3a02e2ca66d17b683baacae080',
          'hex',
        ),
      );
    });

    it('should have features', () => {
      expect(result.features.toNumber()).to.equal(0);
    });

    it('should have the correct timestamp', () => {
      expect(result.timestamp).to.equal(1558042085);
    });

    it('should have the 33-byte node_id', () => {
      expect(result.nodeId).to.deep.equal(
        Buffer.from(
          '036b96e4713c5f84dcb8030592e1bd42a2d9a43d91fa2e535b9bfd05f2c5def9b9',
          'hex',
        ),
      );
    });

    it('should have the 3-byte rgb_color', () => {
      expect(result.rgbColor).to.deep.equal(Buffer.from('b6d433', 'hex'));
    });

    it('should have the 32-byte alias', () => {
      expect(result.alias).to.deep.equal(
        Buffer.from(
          '64656d6f312e6c6e646578706c6f7265722e636f6d0000000000000000000000',
          'hex',
        ),
      );
    });

    it('should have valid addresses', () => {
      expect(result.addresses.length).to.equal(1);
      expect(result.addresses[0].type).to.equal(1);
      expect(result.addresses[0].host).to.equal('38.87.54.163');
      expect(result.addresses[0].port).to.equal(9745);
    });
  });

  describe('serialize basic message', () => {
    it('should serialize', () => {
      const instance = new NodeAnnouncementMessage();
      instance.nodeId = Buffer.from(
        '036b96e4713c5f84dcb8030592e1bd42a2d9a43d91fa2e535b9bfd05f2c5def9b9',
        'hex',
      );
      instance.signature = Buffer.from(
        '05d3b12aacb824409ce8724609fe453fdcd33a498ecca170784985c4a6a2765657c4ef9e1170d3a5795ec86021c3a081c84a9f3a02e2ca66d17b683baacae080',
        'hex',
      );
      instance.features = new BitField();
      instance.timestamp = 1558042085;
      instance.rgbColor = Buffer.from('b6d433', 'hex');
      instance.alias = Buffer.from(
        '64656d6f312e6c6e646578706c6f7265722e636f6d0000000000000000000000',
        'hex',
      );
      instance.addresses.push(new Address('38.87.54.163', 9745));

      const result = instance.serialize();

      expect(result).to.deep.equal(
        Buffer.from(
          'c8c205d3b12aacb824409ce8724609fe453fdcd33a498ecca170784985c4a6a2765657c4ef9e1170d3a5795ec86021c3a081c84a9f3a02e2ca66d17b683baacae08000005cddd5e5036b96e4713c5f84dcb8030592e1bd42a2d9a43d91fa2e535b9bfd05f2c5def9b9b6d43364656d6f312e6c6e646578706c6f7265722e636f6d0000000000000000000000000701265736a32611',
          'hex',
        ),
      );
    });
  });

  describe('verifySignatures', () => {
    it('should verify valid sigs', () => {
      const instance = NodeAnnouncementMessage.deserialize(
        Buffer.from(
          'c8c2' + // type
            '05d3b12aacb824409ce8724609fe453fdcd33a498ecca170784985c4a6a2765657c4ef9e1170d3a5795ec86021c3a081c84a9f3a02e2ca66d17b683baacae080' + // sig
            '0000' + // flen
            '5cddd5e5' + // timestamp
            '036b96e4713c5f84dcb8030592e1bd42a2d9a43d91fa2e535b9bfd05f2c5def9b9' + // nodeId
            'b6d433' + // rgbColor
            '64656d6f312e6c6e646578706c6f7265722e636f6d0000000000000000000000' + // alias
            '0007' + // addressBytes
            '01' + // address type = IpV4
            '265736a3' + // host bytes 38.87.54.163
            '2611', // port 9745
          'hex',
        ),
      );
      const result = NodeAnnouncementMessage.verifySignatures(instance);
      expect(result).to.be.true;
    });
  });
});
