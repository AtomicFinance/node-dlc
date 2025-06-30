use anyhow::{Context, Result};
use clap::{Arg, Command};
use dlc_messages::{AcceptDlc, OfferDlc, SignDlc};
use dlc_messages::oracle_msgs::{OracleAnnouncement, OracleAttestation, OracleEvent, OracleInfo, EventDescriptor, EnumEventDescriptor, DigitDecompositionEventDescriptor};
use dlc_messages::contract_msgs::{ContractInfo, ContractDescriptor};
use dlc_messages::ser_impls::{write_as_tlv, read_as_tlv};
use lightning::util::ser::{Readable, Writeable};
use lightning::ln::wire::Type;
use lightning::io::Cursor;
use serde_json::Value;
use std::io::{self, Read};
use bitcoin::hashes::Hash;
use secp256k1_zkp::{rand::thread_rng, Message, SECP256K1, Keypair, XOnlyPublicKey, SecretKey};
use bitcoin::bip32::{ChildNumber, Xpriv};
use bitcoin::Network;
use secp256k1_zkp::rand::Fill;

fn main() -> Result<()> {
    let matches = Command::new("dlc-compat")
        .about("DLC compatibility testing CLI tool using rust-dlc")
        .version("0.1.0")
        .subcommand(
            Command::new("serialize")
                .about("Serialize JSON to hex using rust-dlc")
                .arg(
                    Arg::new("type")
                        .short('t')
                        .long("type")
                        .value_name("MESSAGE_TYPE")
                        .help("Message type: offer, accept, sign, oracle-announcement, oracle-attestation, contract-info, oracle-info, oracle-event")
                        .required(true),
                ),
        )
        .subcommand(
            Command::new("deserialize")
                .about("Deserialize hex to JSON using rust-dlc")
                .arg(
                    Arg::new("hex")
                        .long("hex")
                        .value_name("HEX_STRING")
                        .help("Hex string to deserialize")
                        .required(true),
                ),
        )
        .subcommand(
            Command::new("validate")
                .about("Validate JSON structure for message type")
                .arg(
                    Arg::new("type")
                        .short('t')
                        .long("type")
                        .value_name("MESSAGE_TYPE")
                        .help("Message type: offer, accept, sign, oracle-announcement, oracle-attestation, contract-info, oracle-info, oracle-event")
                        .required(true),
                ),
        )
        .subcommand(
            Command::new("create-oracle-announcement")
                .about("Create a new oracle announcement with cryptographically valid signatures")
                .arg(
                    Arg::new("event-type")
                        .short('e')
                        .long("event-type")
                        .value_name("EVENT_TYPE")
                        .help("Event type: enum or digit-decomposition")
                        .default_value("enum")
                        .required(false),
                )
                .arg(
                    Arg::new("event-id")
                        .short('i')
                        .long("event-id")
                        .value_name("EVENT_ID")
                        .help("Event identifier")
                        .default_value("test-event-001")
                        .required(false),
                )
                .arg(
                    Arg::new("maturity")
                        .short('m')
                        .long("maturity")
                        .value_name("MATURITY_EPOCH")
                        .help("Event maturity epoch timestamp")
                        .default_value("1640995200")
                        .required(false),
                ),
        )
        .subcommand(
            Command::new("create-oracle-attestation")
                .about("Create an oracle attestation for a given announcement")
                .arg(
                    Arg::new("announcement-hex")
                        .short('a')
                        .long("announcement-hex")
                        .value_name("HEX_STRING")
                        .help("Hex-encoded oracle announcement to attest to")
                        .required(true),
                )
                .arg(
                    Arg::new("outcome")
                        .short('o')
                        .long("outcome")
                        .value_name("OUTCOME")
                        .help("Outcome to attest to (e.g., 'win' for enum or '42' for digit decomposition)")
                        .required(true),
                ),
        )
        .get_matches();

    match matches.subcommand() {
        Some(("serialize", sub_matches)) => {
            let msg_type = sub_matches.get_one::<String>("type").unwrap();

            // Read JSON from stdin
            let mut input = String::new();
            io::stdin().read_to_string(&mut input)?;

            let json: Value = serde_json::from_str(&input)
                .context("Failed to parse input as JSON")?;

            serialize_message(msg_type, &json)
        }
        Some(("deserialize", sub_matches)) => {
            let hex_str = sub_matches.get_one::<String>("hex").unwrap();
            deserialize_hex(hex_str)
        }
        Some(("validate", sub_matches)) => {
            let msg_type = sub_matches.get_one::<String>("type").unwrap();

            // Read JSON from stdin
            let mut input = String::new();
            io::stdin().read_to_string(&mut input)?;

            let json: Value = serde_json::from_str(&input)
                .context("Failed to parse input as JSON")?;

            validate_message(msg_type, &json)
        }
        Some(("create-oracle-announcement", sub_matches)) => {
            let event_type = sub_matches.get_one::<String>("event-type").unwrap();
            let event_id = sub_matches.get_one::<String>("event-id").unwrap();
            let maturity_str = sub_matches.get_one::<String>("maturity").unwrap();
            let maturity: u32 = maturity_str.parse()
                .context("Failed to parse maturity as u32")?;

            create_oracle_announcement(event_type, event_id, maturity)
        }
        Some(("create-oracle-attestation", sub_matches)) => {
            let announcement_hex = sub_matches.get_one::<String>("announcement-hex").unwrap();
            let outcome = sub_matches.get_one::<String>("outcome").unwrap();

            create_oracle_attestation(announcement_hex, outcome)
        }
        _ => {
            eprintln!("No subcommand provided. Use --help for usage.");
            std::process::exit(1);
        }
    }
}

fn serialize_message(msg_type: &str, json: &Value) -> Result<()> {
    let result = match msg_type {
        "offer" => serialize_offer(json),
        "accept" => serialize_accept(json),
        "sign" => serialize_sign(json),
        "oracle-announcement" => serialize_oracle_announcement(json),
        "oracle-attestation" => serialize_oracle_attestation(json),
        "oracle-event" => serialize_oracle_event(json),
        "oracle-info" => serialize_oracle_info(json),
        "contract-info" => serialize_contract_info(json),
        "contract-descriptor" => serialize_contract_descriptor(json),
        _ => {
            return output_error(&format!("Unsupported message type: {}", msg_type));
        }
    };

    match result {
        Ok(hex) => output_success(&hex, &format!("Serialized {} message to hex", msg_type)),
        Err(e) => output_error(&format!("Failed to serialize {}: {}", msg_type, e)),
    }
}

fn serialize_offer(json: &Value) -> Result<String> {
    // Try to deserialize the JSON as an OfferDlc using serde
    let offer: OfferDlc = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as OfferDlc")?;

    // Manual approach: type prefix + message body (matching rust-dlc wire format)
    let mut bytes = Vec::new();
    offer.type_id().write(&mut bytes)
        .context("Failed to write message type")?;
    offer.write(&mut bytes)
        .context("Failed to serialize OfferDlc to bytes")?;

    Ok(hex::encode(bytes))
}

fn serialize_accept(json: &Value) -> Result<String> {
    let accept: AcceptDlc = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as AcceptDlc")?;

    let mut bytes = Vec::new();
    accept.type_id().write(&mut bytes)
        .context("Failed to write message type")?;
    accept.write(&mut bytes)
        .context("Failed to serialize AcceptDlc to bytes")?;

    Ok(hex::encode(bytes))
}

fn serialize_sign(json: &Value) -> Result<String> {
    let sign: SignDlc = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as SignDlc")?;

    let mut bytes = Vec::new();
    sign.type_id().write(&mut bytes)
        .context("Failed to write message type")?;
    sign.write(&mut bytes)
        .context("Failed to serialize SignDlc to bytes")?;

    Ok(hex::encode(bytes))
}

fn serialize_oracle_announcement(json: &Value) -> Result<String> {
    let announcement: OracleAnnouncement = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as OracleAnnouncement")?;

    let mut bytes = Vec::new();
    write_as_tlv(&announcement, &mut bytes)
        .context("Failed to serialize OracleAnnouncement as TLV")?;

    Ok(hex::encode(bytes))
}

fn serialize_oracle_attestation(json: &Value) -> Result<String> {
    let attestation: OracleAttestation = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as OracleAttestation")?;

    let mut bytes = Vec::new();
    write_as_tlv(&attestation, &mut bytes)
        .context("Failed to serialize OracleAttestation as TLV")?;

    Ok(hex::encode(bytes))
}

fn serialize_oracle_event(json: &Value) -> Result<String> {
    let event: OracleEvent = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as OracleEvent")?;

    // OracleEvent doesn't have a type_id, serialize just the body
    let mut bytes = Vec::new();
    event.write(&mut bytes)
        .context("Failed to serialize OracleEvent to bytes")?;

    Ok(hex::encode(bytes))
}

fn serialize_oracle_info(json: &Value) -> Result<String> {
    let info: OracleInfo = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as OracleInfo")?;

    // OracleInfo doesn't have a type_id, serialize just the body
    let mut bytes = Vec::new();
    info.write(&mut bytes)
        .context("Failed to serialize OracleInfo to bytes")?;

    Ok(hex::encode(bytes))
}

fn serialize_contract_info(json: &Value) -> Result<String> {
    let info: ContractInfo = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as ContractInfo")?;

    // ContractInfo doesn't have a type_id, serialize just the body
    let mut bytes = Vec::new();
    info.write(&mut bytes)
        .context("Failed to serialize ContractInfo to bytes")?;

    Ok(hex::encode(bytes))
}

fn serialize_contract_descriptor(json: &Value) -> Result<String> {
    let descriptor: ContractDescriptor = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as ContractDescriptor")?;

    // ContractDescriptor doesn't have a type_id, serialize just the body
    let mut bytes = Vec::new();
    descriptor.write(&mut bytes)
        .context("Failed to serialize ContractDescriptor to bytes")?;

    Ok(hex::encode(bytes))
}

fn deserialize_hex(hex_str: &str) -> Result<()> {
    let bytes = hex::decode(hex_str)
        .context("Failed to decode hex string")?;

    // Debug: show message type
    if bytes.len() >= 2 {
        let msg_type = u16::from_be_bytes([bytes[0], bytes[1]]);
        eprintln!("DEBUG: Message type detected: 0x{:04x} ({})", msg_type, msg_type);
        eprintln!("DEBUG: Hex length: {} bytes", bytes.len());
        eprintln!("DEBUG: First 20 bytes: {}", hex::encode(&bytes[..std::cmp::min(20, bytes.len())]));
    }

    // Try OracleAnnouncement TLV
    let mut cursor_clone = Cursor::new(&bytes);
    if let Ok(announcement) = read_as_tlv::<OracleAnnouncement, _>(&mut cursor_clone) {
        if let Ok(json) = serde_json::to_value(&announcement) {
            return output_success_with_data("oracle-announcement", &json, "Successfully deserialized OracleAnnouncement (TLV)");
        }
    }

    // Try OracleAttestation TLV
    let mut cursor_clone = Cursor::new(&bytes);
    if let Ok(attestation) = read_as_tlv::<OracleAttestation, _>(&mut cursor_clone) {
        if let Ok(json) = serde_json::to_value(&attestation) {
            return output_success_with_data("oracle-attestation", &json, "Successfully deserialized OracleAttestation (TLV)");
        }
    }

    if bytes.len() >= 2 {
        let msg_type = u16::from_be_bytes([bytes[0], bytes[1]]);

        // Skip message type prefix (2 bytes) - message.read() expects message body only
        let message_body = &bytes[2..];
        let mut cursor = Cursor::new(message_body);

        match msg_type {
            42778 => { // DlcOffer (0xa71a)
                match OfferDlc::read(&mut cursor) {
                    Ok(offer) => {
                        match serde_json::to_value(&offer) {
                            Ok(json) => return output_success_with_data("offer", &json, "Successfully deserialized OfferDlc"),
                            Err(e) => return output_error(&format!("Failed to convert OfferDlc to JSON: {}", e)),
                        }
                    }
                    Err(e) => {
                        eprintln!("DEBUG: Failed to parse as OfferDlc: {:?}", e);
                    }
                }
            }
            42780 => { // DlcAccept (0xa71c)
                match AcceptDlc::read(&mut cursor) {
                    Ok(accept) => {
                        match serde_json::to_value(&accept) {
                            Ok(json) => return output_success_with_data("accept", &json, "Successfully deserialized AcceptDlc"),
                            Err(e) => return output_error(&format!("Failed to convert AcceptDlc to JSON: {}", e)),
                        }
                    }
                    Err(e) => {
                        eprintln!("DEBUG: Failed to parse as AcceptDlc: {:?}", e);
                    }
                }
            }
            42782 => { // DlcSign (0xa71e)
                match SignDlc::read(&mut cursor) {
                    Ok(sign) => {
                        match serde_json::to_value(&sign) {
                            Ok(json) => return output_success_with_data("sign", &json, "Successfully deserialized SignDlc"),
                            Err(e) => return output_error(&format!("Failed to convert SignDlc to JSON: {}", e)),
                        }
                    }
                    Err(e) => {
                        eprintln!("DEBUG: Failed to parse as SignDlc: {:?}", e);
                    }
                }
            }
            55332 => { // OracleAnnouncement (0xd824)
                // Try TLV format first
                let mut full_cursor = Cursor::new(&bytes);
                match read_as_tlv::<OracleAnnouncement, _>(&mut full_cursor) {
                    Ok(announcement) => {
                        match serde_json::to_value(&announcement) {
                            Ok(json) => return output_success_with_data("oracle-announcement", &json, "Successfully deserialized OracleAnnouncement (TLV)"),
                            Err(e) => return output_error(&format!("Failed to convert OracleAnnouncement to JSON: {}", e)),
                        }
                    }
                    Err(_) => {
                        // Fallback to direct format
                        match OracleAnnouncement::read(&mut cursor) {
                            Ok(announcement) => {
                                match serde_json::to_value(&announcement) {
                                    Ok(json) => return output_success_with_data("oracle-announcement", &json, "Successfully deserialized OracleAnnouncement (direct)"),
                                    Err(e) => return output_error(&format!("Failed to convert OracleAnnouncement to JSON: {}", e)),
                                }
                            }
                            Err(e) => {
                                eprintln!("DEBUG: Failed to parse as OracleAnnouncement: {:?}", e);
                            }
                        }
                    }
                }
            }
            55400 => { // OracleAttestation (0xd868)
                // Try TLV format first
                let mut full_cursor = Cursor::new(&bytes);
                match read_as_tlv::<OracleAttestation, _>(&mut full_cursor) {
                    Ok(attestation) => {
                        match serde_json::to_value(&attestation) {
                            Ok(json) => return output_success_with_data("oracle-attestation", &json, "Successfully deserialized OracleAttestation (TLV)"),
                            Err(e) => return output_error(&format!("Failed to convert OracleAttestation to JSON: {}", e)),
                        }
                    }
                    Err(_) => {
                        // Fallback to direct format
                        match OracleAttestation::read(&mut cursor) {
                            Ok(attestation) => {
                                match serde_json::to_value(&attestation) {
                                    Ok(json) => return output_success_with_data("oracle-attestation", &json, "Successfully deserialized OracleAttestation (direct)"),
                                    Err(e) => return output_error(&format!("Failed to convert OracleAttestation to JSON: {}", e)),
                                }
                            }
                            Err(e) => {
                                eprintln!("DEBUG: Failed to parse as OracleAttestation: {:?}", e);
                            }
                        }
                    }
                }
            }
            _ => {
                eprintln!("DEBUG: Unknown message type: 0x{:04x} ({})", msg_type, msg_type);

                // Try parsing as types without message type prefix (for components like ContractInfo)
                let mut full_cursor = Cursor::new(&bytes);

                // Try ContractInfo
                if let Ok(contract_info) = ContractInfo::read(&mut full_cursor) {
                    if let Ok(json) = serde_json::to_value(&contract_info) {
                        return output_success_with_data("contract-info", &json, "Successfully deserialized ContractInfo");
                    }
                }

                // Try OracleInfo
                let mut full_cursor = Cursor::new(&bytes);
                if let Ok(oracle_info) = OracleInfo::read(&mut full_cursor) {
                    if let Ok(json) = serde_json::to_value(&oracle_info) {
                        return output_success_with_data("oracle-info", &json, "Successfully deserialized OracleInfo");
                    }
                }

                // Try OracleEvent
                let mut full_cursor = Cursor::new(&bytes);
                if let Ok(oracle_event) = OracleEvent::read(&mut full_cursor) {
                    if let Ok(json) = serde_json::to_value(&oracle_event) {
                        return output_success_with_data("oracle-event", &json, "Successfully deserialized OracleEvent");
                    }
                }
            }
        }
    } else {
        // For data without type prefix, try parsing as different component types
        let mut cursor = Cursor::new(&bytes);

        // Try ContractInfo
        if let Ok(contract_info) = ContractInfo::read(&mut cursor) {
            if let Ok(json) = serde_json::to_value(&contract_info) {
                return output_success_with_data("contract-info", &json, "Successfully deserialized ContractInfo");
            }
        }

        // Try OracleInfo
        let mut cursor = Cursor::new(&bytes);
        if let Ok(oracle_info) = OracleInfo::read(&mut cursor) {
            if let Ok(json) = serde_json::to_value(&oracle_info) {
                return output_success_with_data("oracle-info", &json, "Successfully deserialized OracleInfo");
            }
        }

        // Try OracleEvent
        let mut cursor = Cursor::new(&bytes);
        if let Ok(oracle_event) = OracleEvent::read(&mut cursor) {
            if let Ok(json) = serde_json::to_value(&oracle_event) {
                return output_success_with_data("oracle-event", &json, "Successfully deserialized OracleEvent");
            }
        }
    }

    output_error("Failed to deserialize as any known DLC message type")
}

fn validate_message(msg_type: &str, json: &Value) -> Result<()> {
    let result = match msg_type {
        "offer" => {
            serde_json::from_value::<OfferDlc>(json.clone())
                .map(|_| "Valid OfferDlc structure".to_string())
        }
        "accept" => {
            serde_json::from_value::<AcceptDlc>(json.clone())
                .map(|_| "Valid AcceptDlc structure".to_string())
        }
        "sign" => {
            serde_json::from_value::<SignDlc>(json.clone())
                .map(|_| "Valid SignDlc structure".to_string())
        }
        "oracle-announcement" => {
            serde_json::from_value::<OracleAnnouncement>(json.clone())
                .map(|_| "Valid OracleAnnouncement structure".to_string())
        }
        "oracle-attestation" => {
            serde_json::from_value::<OracleAttestation>(json.clone())
                .map(|_| "Valid OracleAttestation structure".to_string())
        }
        "oracle-event" => {
            serde_json::from_value::<OracleEvent>(json.clone())
                .map(|_| "Valid OracleEvent structure".to_string())
        }
        "oracle-info" => {
            serde_json::from_value::<OracleInfo>(json.clone())
                .map(|_| "Valid OracleInfo structure".to_string())
        }
        "contract-info" => {
            serde_json::from_value::<ContractInfo>(json.clone())
                .map(|_| "Valid ContractInfo structure".to_string())
        }
        "contract-descriptor" => {
            serde_json::from_value::<ContractDescriptor>(json.clone())
                .map(|_| "Valid ContractDescriptor structure".to_string())
        }
        _ => {
            return output_error(&format!("Unsupported message type: {}", msg_type));
        }
    };

    match result {
        Ok(msg) => output_success("valid", &msg),
        Err(e) => output_error(&format!("Invalid {} structure: {}", msg_type, e)),
    }
}

fn output_success(data: &str, message: &str) -> Result<()> {
    let output = serde_json::json!({
        "status": "success",
        "data": data,
        "message": message
    });

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn output_success_with_data(message_type: &str, data: &Value, message: &str) -> Result<()> {
    let output = serde_json::json!({
        "status": "success",
        "messageType": message_type,
        "data": data,
        "message": message
    });

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn output_error(message: &str) -> Result<()> {
    let output = serde_json::json!({
        "status": "error",
        "message": message
    });

    println!("{}", serde_json::to_string_pretty(&output)?);
    // Don't exit with error code, just output the error JSON
    Ok(())
}

fn create_nonce_keypair() -> Result<(SecretKey, XOnlyPublicKey)> {
    let mut nonce_seed = [0u8; 32];
    nonce_seed.try_fill(&mut thread_rng())
        .context("Failed to generate random nonce seed")?;
    
    let nonce_priv = Xpriv::new_master(Network::Bitcoin, &nonce_seed)
        .context("Failed to create master key")?
        .derive_priv(SECP256K1, &[ChildNumber::from_normal_idx(1).unwrap()])
        .context("Failed to derive private key")?
        .private_key;

    let nonce_xpub = nonce_priv.x_only_public_key(SECP256K1).0;

    Ok((nonce_priv, nonce_xpub))
}

fn create_oracle_announcement(event_type: &str, event_id: &str, maturity: u32) -> Result<()> {
    // Generate oracle keypair
    let oracle_keypair = Keypair::new(SECP256K1, &mut thread_rng());
    let oracle_pubkey = XOnlyPublicKey::from_keypair(&oracle_keypair).0;

    // Create event descriptor and nonces based on event type
    let (event_descriptor, oracle_nonces) = match event_type {
        "enum" => {
            let (_, nonce_pubkey) = create_nonce_keypair()?;
            let descriptor = EventDescriptor::EnumEvent(EnumEventDescriptor {
                outcomes: vec!["win".to_string(), "lose".to_string(), "draw".to_string()],
            });
            (descriptor, vec![nonce_pubkey])
        }
        "digit-decomposition" => {
            // Generate 8 nonces for 8-digit binary decomposition
            let mut nonces = Vec::new();
            for _ in 0..8 {
                let (_, nonce_pubkey) = create_nonce_keypair()?;
                nonces.push(nonce_pubkey);
            }
            let descriptor = EventDescriptor::DigitDecompositionEvent(DigitDecompositionEventDescriptor {
                base: 2,
                is_signed: false,
                unit: "BTCUSD".to_string(),
                precision: 0,
                nb_digits: 8,
            });
            (descriptor, nonces)
        }
        _ => {
            return output_error(&format!("Unsupported event type: {}", event_type));
        }
    };

    // Create oracle event
    let oracle_event = OracleEvent {
        oracle_nonces,
        event_maturity_epoch: maturity,
        event_descriptor,
        event_id: event_id.to_string(),
    };

    // Sign the oracle event
    let mut event_hex = Vec::new();
    oracle_event.write(&mut event_hex)
        .context("Failed to serialize oracle event")?;
    let hash = bitcoin::hashes::sha256::Hash::hash(&event_hex);
    let msg = Message::from_digest(hash.to_byte_array());
    let announcement_signature = SECP256K1.sign_schnorr(&msg, &oracle_keypair);

    // Create oracle announcement
    let announcement = OracleAnnouncement {
        announcement_signature,
        oracle_public_key: oracle_pubkey,
        oracle_event,
    };

    // Serialize to hex using TLV format
    let mut bytes = Vec::new();
    write_as_tlv(&announcement, &mut bytes)
        .context("Failed to serialize OracleAnnouncement as TLV")?;
    let hex = hex::encode(bytes);

    // Convert to JSON for display
    let json = serde_json::to_value(&announcement)
        .context("Failed to convert OracleAnnouncement to JSON")?;

    let output = serde_json::json!({
        "status": "success",
        "messageType": "oracle-announcement",
        "hex": hex,
        "data": json,
        "message": format!("Created {} oracle announcement", event_type)
    });

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn create_oracle_attestation(announcement_hex: &str, outcome: &str) -> Result<()> {
    // Decode the announcement hex
    let bytes = hex::decode(announcement_hex)
        .context("Failed to decode announcement hex string")?;

    if bytes.len() < 2 {
        return output_error("Invalid announcement hex: too short");
    }

    // Try to parse as TLV format first
    let announcement = match read_as_tlv::<OracleAnnouncement, _>(&mut Cursor::new(&bytes)) {
        Ok(announcement) => announcement,
        Err(_) => {
            // Fallback to direct format
            let msg_type = u16::from_be_bytes([bytes[0], bytes[1]]);
            if msg_type != 55332 { // OracleAnnouncement type
                return output_error(&format!("Invalid message type: expected 55332 (OracleAnnouncement), got {}", msg_type));
            }

            let message_body = &bytes[2..];
            let mut cursor = Cursor::new(message_body);
            OracleAnnouncement::read(&mut cursor)
                .map_err(|e| anyhow::anyhow!("Failed to parse OracleAnnouncement from hex: {:?}", e))?
        }
    };

    // Generate oracle keypair (in practice, this would be the same keypair used to create the announcement)
    let oracle_keypair = Keypair::new(SECP256K1, &mut thread_rng());

    // Create attestation based on event type
    let (signatures, outcomes) = match &announcement.oracle_event.event_descriptor {
        EventDescriptor::EnumEvent(enum_desc) => {
            // Verify the outcome is valid
            if !enum_desc.outcomes.contains(&outcome.to_string()) {
                return output_error(&format!("Invalid outcome '{}' for enum event. Valid outcomes: {:?}", outcome, enum_desc.outcomes));
            }

            // Generate nonce for signing
            let (nonce_secret, _) = create_nonce_keypair()?;
            
            // Sign the outcome
            let hash = bitcoin::hashes::sha256::Hash::hash(outcome.as_bytes());
            let msg = Message::from_digest(hash.to_byte_array());
            
            // Create a keypair from the nonce secret for signing
            let nonce_keypair = Keypair::from_secret_key(SECP256K1, &nonce_secret);
            let signature = SECP256K1.sign_schnorr(&msg, &nonce_keypair);

            (vec![signature], vec![outcome.to_string()])
        }
        EventDescriptor::DigitDecompositionEvent(digit_desc) => {
            // Parse the outcome as a number
            let outcome_num: u64 = outcome.parse()
                .context("Failed to parse outcome as number for digit decomposition event")?;

            // Convert to binary representation
            let mut binary_outcomes = Vec::new();
            let mut signatures = Vec::new();
            
            for i in 0..digit_desc.nb_digits {
                let bit = (outcome_num >> i) & 1;
                let bit_str = bit.to_string();
                binary_outcomes.push(bit_str.clone());

                // Generate nonce and sign each bit
                let (nonce_secret, _) = create_nonce_keypair()?;
                let hash = bitcoin::hashes::sha256::Hash::hash(bit_str.as_bytes());
                let msg = Message::from_digest(hash.to_byte_array());
                
                // Create a keypair from the nonce secret for signing
                let nonce_keypair = Keypair::from_secret_key(SECP256K1, &nonce_secret);
                let signature = SECP256K1.sign_schnorr(&msg, &nonce_keypair);
                signatures.push(signature);
            }

            (signatures, binary_outcomes)
        }
    };

    // Create oracle attestation
    let attestation = OracleAttestation {
        event_id: announcement.oracle_event.event_id.clone(),
        oracle_public_key: XOnlyPublicKey::from_keypair(&oracle_keypair).0,
        signatures,
        outcomes,
    };

    // Serialize to hex using TLV format
    let mut bytes = Vec::new();
    write_as_tlv(&attestation, &mut bytes)
        .context("Failed to serialize OracleAttestation as TLV")?;
    let hex = hex::encode(bytes);

    // Convert to JSON for display
    let json = serde_json::to_value(&attestation)
        .context("Failed to convert OracleAttestation to JSON")?;

    let output = serde_json::json!({
        "status": "success",
        "messageType": "oracle-attestation",
        "hex": hex,
        "data": json,
        "message": format!("Created oracle attestation for outcome '{}'", outcome)
    });

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}
