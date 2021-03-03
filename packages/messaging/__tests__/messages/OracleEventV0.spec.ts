import { expect } from "chai";
import { OracleEventV0 } from "../../lib/messages/OracleEventV0";
import { EnumEventDescriptorV0 } from "../../lib/messages/EnumEventDescriptorV0";

describe("OracleEventV0", () => {
  const oracleNonce = Buffer.from(
      "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b",
      "hex",
  )

  const eventId = Buffer.from(
      "64756d6d79",
      "hex",
  )

  describe("serialize", () => {
    it("serializes", () => {
      const instance = new OracleEventV0();

      instance.length = BigInt(64)
      instance.oracleNonces.push(oracleNonce)
      instance.eventMaturityEpoch = 0
      instance.eventDescriptor = EnumEventDescriptorV0.deserialize(
        Buffer.from(
          "fdd806" + // type enum_event_descriptor
          "10" + // length
          "0002" + // num_outcomes
          "06" + // outcome_1_len
          "64756d6d7931" + // outcome_1
          "06" + // outcome_2_len
          "64756d6d7932", // outcome_2
          "hex"
        )
      )
      instance.eventId = eventId

      expect(instance.serialize().toString("hex")).to.equal(
        "fdd822" + // type oracle_event
        "40" + // length
        "0001" + // nb_nonces
        "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
        "00000000" + // event_maturity_epoch
        "fdd806" + // type enum_event_descriptor
        "10" + // length
        "0002" + // num_outcomes
        "06" + // outcome_1_len
        "64756d6d7931" + // outcome_1
        "06" + // outcome_2_len
        "64756d6d7932" + // outcome_2
        "05" + // event_id_length
        "64756d6d79" // event_id
      ); // prettier-ignore
    });
  });

  describe("deserialize", () => {
    it("deserializes", () => {
      const buf = Buffer.from(
        "fdd822" + // type oracle_event
        "40" + // length
        "0001" + // nb_nonces
        "3cfba011378411b20a5ab773cb95daab93e9bcd1e4cce44986a7dda84e01841b" + // oracle_nonces
        "00000000" + // event_maturity_epoch
        "fdd806" + // type enum_event_descriptor
        "10" + // length
        "0002" + // num_outcomes
        "06" + // outcome_1_len
        "64756d6d7931" + // outcome_1
        "06" + // outcome_2_len
        "64756d6d7932" + // outcome_2
        "05" + // event_id_length
        "64756d6d79" // event_id
        , "hex"
      ); // prettier-ignore

      const instance = OracleEventV0.deserialize(buf);

      expect(instance.oracleNonces[0]).to.deep.equal(oracleNonce);
      expect(instance.eventMaturityEpoch).to.equal(0)
      expect(instance.eventDescriptor.serialize().toString('hex')).to.equal(
        "fdd806" + // type enum_event_descriptor
        "10" + // length
        "0002" + // num_outcomes
        "06" + // outcome_1_len
        "64756d6d7931" + // outcome_1
        "06" + // outcome_2_len
        "64756d6d7932" // outcome_2
      )
      expect(instance.eventId).to.deep.equal(eventId)
    });
  });
});
