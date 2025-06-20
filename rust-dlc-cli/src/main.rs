use anyhow::{Context, Result};
use clap::{Arg, Command};
use dlc_messages::{AcceptDlc, OfferDlc, SignDlc};
use dlc_messages::oracle_msgs::{OracleAnnouncement, OracleAttestation, OracleEvent, OracleInfo};
use dlc_messages::contract_msgs::{ContractInfo, ContractDescriptor};
use lightning::util::ser::{Readable, Writeable};
use lightning::ln::wire::Type;
use lightning::io::Cursor;
use serde_json::Value;
use std::io::{self, Read};

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
    announcement.type_id().write(&mut bytes)
        .context("Failed to write message type")?;
    announcement.write(&mut bytes)
        .context("Failed to serialize OracleAnnouncement to bytes")?;

    Ok(hex::encode(bytes))
}

fn serialize_oracle_attestation(json: &Value) -> Result<String> {
    let attestation: OracleAttestation = serde_json::from_value(json.clone())
        .context("Failed to parse JSON as OracleAttestation")?;

    let mut bytes = Vec::new();
    attestation.type_id().write(&mut bytes)
        .context("Failed to write message type")?;
    attestation.write(&mut bytes)
        .context("Failed to serialize OracleAttestation to bytes")?;

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
                match OracleAnnouncement::read(&mut cursor) {
                    Ok(announcement) => {
                        match serde_json::to_value(&announcement) {
                            Ok(json) => return output_success_with_data("oracle-announcement", &json, "Successfully deserialized OracleAnnouncement"),
                            Err(e) => return output_error(&format!("Failed to convert OracleAnnouncement to JSON: {}", e)),
                        }
                    }
                    Err(e) => {
                        eprintln!("DEBUG: Failed to parse as OracleAnnouncement: {:?}", e);
                    }
                }
            }
            55400 => { // OracleAttestation (0xd868)
                match OracleAttestation::read(&mut cursor) {
                    Ok(attestation) => {
                        match serde_json::to_value(&attestation) {
                            Ok(json) => return output_success_with_data("oracle-attestation", &json, "Successfully deserialized OracleAttestation"),
                            Err(e) => return output_error(&format!("Failed to convert OracleAttestation to JSON: {}", e)),
                        }
                    }
                    Err(e) => {
                        eprintln!("DEBUG: Failed to parse as OracleAttestation: {:?}", e);
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
